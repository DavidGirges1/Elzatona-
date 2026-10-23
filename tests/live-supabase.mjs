import assert from "node:assert/strict";
import { fixtures, client, minimalPdf } from "./support/live.mjs";
const f = await fixtures();
const [a, b, m] = f.people;
const guest = client();
let passed = 0;
async function check(name, fn) {
  await fn();
  passed++;
  console.log(`PASS ${name}`);
}
await check("Guest reads published exact resource", async () => {
  const r = await guest
    .from("resource_cards")
    .select("*")
    .eq("id", f.resource)
    .single();
  assert.ifError(r.error);
  assert.equal(r.data.course_id, f.course);
});
await check("Real Auth login and verified identity", async () => {
  const r = await a.db.auth.getUser();
  assert.ifError(r.error);
  assert.equal(r.data.user.id, a.id);
});
await check("Follow persists and is private", async () => {
  assert.ifError(
    (await a.db.rpc("follow_course", { p_course: f.course })).error,
  );
  assert.equal((await a.db.from("user_courses").select("*")).data.length, 1);
  assert.equal((await b.db.from("user_courses").select("*")).data.length, 0);
});
await check("Another student sees submitted resource", async () => {
  const r = await b.db
    .from("resource_cards")
    .select("*")
    .eq("id", f.resource)
    .single();
  assert.ifError(r.error);
  assert.equal(r.data.author_id, a.id);
});
await check("Forbidden edit and protected status mutation fail", async () => {
  assert.ok(
    (
      await b.db.rpc("edit_resource", {
        p_resource: f.resource,
        p_title: "Unauthorized edit",
        p_description: "",
        p_topic: null,
      })
    ).error,
  );
  assert.ok(
    (
      await a.db
        .from("resources")
        .update({ status: "hidden" })
        .eq("id", f.resource)
    ).error,
  );
});
await check("Vote toggles and totals persist", async () => {
  assert.ifError(
    (await b.db.rpc("set_vote", { p_resource: f.resource, p_value: 1 })).error,
  );
  assert.equal(
    (
      await guest
        .from("resource_cards")
        .select("score")
        .eq("id", f.resource)
        .single()
    ).data.score,
    1,
  );
  assert.ifError(
    (await b.db.rpc("set_vote", { p_resource: f.resource, p_value: 1 })).error,
  );
});
await check("Save is private", async () => {
  assert.ifError(
    (await b.db.rpc("toggle_save", { p_resource: f.resource })).error,
  );
  assert.equal((await b.db.from("resource_saves").select("*")).data.length, 1);
  assert.equal((await a.db.from("resource_saves").select("*")).data.length, 0);
});
let discussion;
await check("Question and reply survive readback", async () => {
  const r = await a.db.rpc("ask_question", {
    p_course: f.course,
    p_resource: f.resource,
    p_title: "سؤال تجريبي عن Trees",
    p_body: "إزاي أرتب البيانات في المثال ده؟",
  });
  assert.ifError(r.error);
  discussion = r.data;
  assert.ifError(
    (
      await b.db.rpc("reply_question", {
        p_discussion: discussion,
        p_body: "ده رد تجريبي محفوظ في قاعدة البيانات.",
      })
    ).error,
  );
  assert.equal(
    (
      await guest
        .from("discussion_replies")
        .select("*")
        .eq("discussion_id", discussion)
    ).data.length,
    1,
  );
});
let pdf, path;
await check("Pending PDF invisible to guest", async () => {
  const r = await a.db.rpc("prepare_pdf", {
    p_course: f.course,
    p_topic: f.topic,
    p_title: "ملف PDF لاختبار التخزين",
    p_description: "ملف اختبار أنشأه فريق التطوير",
    p_type: "notes",
    p_rights: true,
    p_ai: false,
  });
  assert.ifError(r.error);
  pdf = r.data;
  path = `${a.id}/${pdf}.pdf`;
  assert.equal(
    (await guest.from("resources").select("id").eq("id", pdf)).data.length,
    0,
  );
  assert.ok((await a.db.rpc("finalize_pdf", { p_resource: pdf })).error);
});
await check("Other student cannot upload to author path", async () => {
  assert.ok(
    (
      await b.db.storage.from("course-pdfs").upload(path, minimalPdf(), {
        contentType: "application/pdf",
        upsert: false,
      })
    ).error,
  );
});
await check("Real PDF upload, finalize and readback", async () => {
  assert.ifError(
    (
      await a.db.storage.from("course-pdfs").upload(path, minimalPdf(), {
        contentType: "application/pdf",
        upsert: false,
      })
    ).error,
  );
  assert.ok((await a.db.rpc("finalize_pdf", { p_resource: pdf })).error);
  assert.ok(
    (
      await a.db.rpc("finalize_pdf_checked", {
        p_resource: pdf,
        p_author: a.id,
      })
    ).error,
  );
  assert.ifError(
    (
      await f.admin.rpc("finalize_pdf_checked", {
        p_resource: pdf,
        p_author: a.id,
      })
    ).error,
  );
  assert.equal(
    (await guest.from("resource_cards").select("id").eq("id", pdf)).data.length,
    1,
  );
});
await check(
  "Overwrite, arbitrary listing and unauthorized finalization denied",
  async () => {
    assert.ok((await b.db.rpc("finalize_pdf", { p_resource: pdf })).error);
    assert.ok(
      (
        await a.db.storage.from("course-pdfs").upload(path, minimalPdf(), {
          contentType: "application/pdf",
          upsert: true,
        })
      ).error,
    );
    const list = await guest.storage.from("course-pdfs").list();
    assert.ok(list.error || list.data.length === 0);
  },
);
await check("Oversize upload rejected by actual Storage", async () => {
  const r = await a.db.rpc("prepare_pdf", {
    p_course: f.course,
    p_topic: null,
    p_title: "ملف كبير لاختبار الرفض",
    p_description: "",
    p_type: "notes",
    p_rights: true,
    p_ai: false,
  });
  assert.ifError(r.error);
  const bytes = Buffer.alloc(3145729);
  minimalPdf().copy(bytes);
  assert.ok(
    (
      await a.db.storage
        .from("course-pdfs")
        .upload(`${a.id}/${r.data}.pdf`, bytes, {
          contentType: "application/pdf",
        })
    ).error,
  );
});
await check("Report private, moderator reviews and hides", async () => {
  assert.ifError(
    (
      await b.db.rpc("report_content", {
        p_kind: "resource",
        p_target: f.resource,
        p_reason: "inaccurate",
        p_details: "بلاغ اختبار لصلاحيات المراجعة",
      })
    ).error,
  );
  assert.equal((await a.db.from("reports").select("*")).data.length, 0);
  const reports = await m.db
    .from("reports")
    .select("*")
    .eq("resource_id", f.resource);
  assert.ifError(reports.error);
  assert.equal(reports.data.length, 1);
  assert.ok(
    (
      await b.db.rpc("moderate_report", {
        p_report: reports.data[0].id,
        p_action: "hide",
        p_reason: "رفض تعديل من طالب",
      })
    ).error,
  );
  assert.ifError(
    (
      await m.db.rpc("moderate_report", {
        p_report: reports.data[0].id,
        p_action: "hide",
        p_reason: "إخفاء تجريبي لمراجعة الصلاحيات",
      })
    ).error,
  );
  assert.equal(
    (await guest.from("resource_cards").select("id").eq("id", f.resource)).data
      .length,
    0,
  );
});
console.log(
  `${passed} live Supabase integration checks passed. Fixtures retained in the isolated test project; OAuth browser flow remains separate.`,
);
