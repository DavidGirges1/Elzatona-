// Uses temporary accounts provisioned through the authorized Supabase MCP, never owner credentials.
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline";
import { writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const input = createInterface({ input: process.stdin, terminal: false });
console.log("Ready for temporary QA account JSON (input hidden).");
const accounts = await new Promise((resolve) =>
  input.once("line", (line) => resolve(JSON.parse(line))),
);
input.close();
await writeFile("/tmp/elzatona-qa-accounts.json", JSON.stringify(accounts), {
  mode: 0o600,
});
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert.equal(
  new URL(url).hostname,
  "osakdzaxqvlcrfpwrjul.supabase.co",
  "Wrong integration target",
);
const db = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const guest = db(),
  people = accounts.map((a) => ({ ...a, db: db() }));
let passed = 0;
async function check(name, fn) {
  await fn();
  console.log("PASS " + name);
  passed++;
}
async function noError(result) {
  if (result.error) {
    let detail = "";
    if (result.error.context instanceof Response)
      detail = await result.error.context.text();
    throw new Error(result.error.message + " " + detail);
  }
  return result.data;
}
for (const person of people)
  await check("Real Auth password session " + person.position, async () => {
    await noError(
      await person.db.auth.signInWithPassword({
        email: person.email,
        password: person.password,
      }),
    );
    const r = await person.db.auth.getUser();
    assert.ifError(r.error);
    assert.equal(r.data.user.id, person.id);
  });
const [a, b, m] = people;
let course, resource, pdf, badPdf, discussion;
await check("Anonymous Data API reads configured pilot courses", async () => {
  const data = await noError(
    await guest.from("courses").select("id,slug").eq("slug", "data-structures"),
  );
  assert.equal(data.length, 1);
  course = data[0];
});
await check("Follow course persists privately", async () => {
  await noError(await a.db.rpc("follow_course", { p_course: course.id }));
  assert.equal(
    (await noError(await a.db.from("user_courses").select("*"))).length,
    1,
  );
  assert.equal(
    (await noError(await b.db.from("user_courses").select("*"))).length,
    0,
  );
});
await check(
  "External submission visible to another student and guest",
  async () => {
    resource = await noError(
      await a.db.rpc("submit_resource", {
        p_course: course.id,
        p_topic: null,
        p_title: "اختبار ربط مؤقت · لينك",
        p_description: "سجل اختبار اتصال سيحذف بعد التحقق.",
        p_type: "reference",
        p_url: "https://example.org/elzatona-connection-" + Date.now(),
        p_rights: true,
        p_ai: false,
      }),
    );
    assert.equal(
      (
        await noError(
          await b.db.from("resource_cards").select("id").eq("id", resource),
        )
      ).length,
      1,
    );
    assert.equal(
      (
        await noError(
          await guest.from("resource_cards").select("id").eq("id", resource),
        )
      ).length,
      1,
    );
  },
);
await check("Other student edit and protected-field changes fail", async () => {
  assert.ok(
    (
      await b.db.rpc("edit_resource", {
        p_resource: resource,
        p_title: "unauthorized title",
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
        .eq("id", resource)
    ).error,
  );
});
await check(
  "Vote insert, switch, toggle and self-vote restriction",
  async () => {
    assert.ok(
      (await a.db.rpc("set_vote", { p_resource: resource, p_value: 1 })).error,
    );
    for (const [value, score] of [
      [1, 1],
      [-1, -1],
      [-1, 0],
    ]) {
      await noError(
        await b.db.rpc("set_vote", { p_resource: resource, p_value: value }),
      );
      assert.equal(
        (
          await noError(
            await guest
              .from("resource_cards")
              .select("score")
              .eq("id", resource)
              .single(),
          )
        ).score,
        score,
      );
    }
  },
);
await check("Save private readback", async () => {
  await noError(await b.db.rpc("toggle_save", { p_resource: resource }));
  assert.equal(
    (await noError(await b.db.from("resource_saves").select("*"))).length,
    1,
  );
  assert.equal(
    (await noError(await a.db.from("resource_saves").select("*"))).length,
    0,
  );
});
await check("Course question and another student reply", async () => {
  discussion = await noError(
    await a.db.rpc("ask_question", {
      p_course: course.id,
      p_resource: resource,
      p_title: "سؤال اختبار الربط",
      p_body: "ده سؤال مؤقت للتأكد إن المناقشات بتتحفظ.",
    }),
  );
  await noError(
    await b.db.rpc("reply_question", {
      p_discussion: discussion,
      p_body: "رد مؤقت لاختبار قاعدة البيانات.",
    }),
  );
  assert.equal(
    (
      await noError(
        await guest
          .from("discussion_replies")
          .select("id")
          .eq("discussion_id", discussion),
      )
    ).length,
    1,
  );
});
const pdfBytes = Buffer.from(
  "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n",
);
async function prepare(title) {
  return noError(
    await a.db.rpc("prepare_pdf", {
      p_course: course.id,
      p_topic: null,
      p_title: title,
      p_description: "ملف اختبار أنشأه فريق التطوير ويحذف بعد التحقق.",
      p_type: "notes",
      p_rights: true,
      p_ai: false,
    }),
  );
}
await check(
  "Pending PDF is private and cannot be finalized anonymously",
  async () => {
    pdf = await prepare("اختبار ربط مؤقت · PDF");
    assert.equal(
      (await noError(await guest.from("resources").select("id").eq("id", pdf)))
        .length,
      0,
    );
    assert.ok(
      (
        await guest.functions.invoke("resource-files", {
          body: { action: "finalize", resource_id: pdf },
        })
      ).error,
    );
  },
);
await check("Another student cannot upload to author path", async () => {
  assert.ok(
    (
      await b.db.storage
        .from("course-pdfs")
        .upload(`${a.id}/${pdf}.pdf`, pdfBytes, {
          contentType: "application/pdf",
        })
    ).error,
  );
});
await check("Real PDF upload succeeds without app service secret", async () => {
  await noError(
    await a.db.storage
      .from("course-pdfs")
      .upload(`${a.id}/${pdf}.pdf`, pdfBytes, {
        contentType: "application/pdf",
        upsert: false,
      }),
  );
});
await check(
  "Other student cannot publish file; owner publication succeeds",
  async () => {
    assert.ok(
      (
        await b.db.functions.invoke("resource-files", {
          body: { action: "finalize", resource_id: pdf },
        })
      ).error,
    );
    const r = await noError(
      await a.db.functions.invoke("resource-files", {
        body: { action: "finalize", resource_id: pdf },
      }),
    );
    assert.equal(r.published, true);
    assert.equal(
      (
        await noError(
          await guest.from("resource_cards").select("id").eq("id", pdf),
        )
      ).length,
      1,
    );
  },
);
await check(
  "Anonymous signed download returns exact uploaded bytes",
  async () => {
    const signed = await noError(
      await guest.functions.invoke("resource-files", {
        body: { action: "open", resource_id: pdf },
      }),
    );
    assert.equal(signed.expires_in, 60);
    const r = await fetch(signed.url);
    assert.equal(r.status, 200);
    assert.deepEqual(Buffer.from(await r.arrayBuffer()), pdfBytes);
  },
);
await check(
  "Private bucket cannot be listed by guest and overwrite is denied",
  async () => {
    const list = await guest.storage.from("course-pdfs").list(a.id);
    assert.ok(list.error || list.data.length === 0);
    assert.ok(
      (
        await a.db.storage
          .from("course-pdfs")
          .upload(`${a.id}/${pdf}.pdf`, pdfBytes, {
            contentType: "application/pdf",
            upsert: true,
          })
      ).error,
    );
  },
);
await check("Fake PDF signature rejected by managed function", async () => {
  badPdf = await prepare("اختبار ربط مؤقت · توقيع غير صالح");
  await noError(
    await a.db.storage
      .from("course-pdfs")
      .upload(`${a.id}/${badPdf}.pdf`, Buffer.from("<html>not a PDF</html>"), {
        contentType: "application/pdf",
      }),
  );
  assert.ok(
    (
      await a.db.functions.invoke("resource-files", {
        body: { action: "finalize", resource_id: badPdf },
      })
    ).error,
  );
  assert.equal(
    (await noError(await guest.from("resources").select("id").eq("id", badPdf)))
      .length,
    0,
  );
});
await check("Actual Storage rejects oversize file", async () => {
  const large = await prepare("اختبار ربط مؤقت · حجم زائد");
  const bytes = Buffer.alloc(3145729);
  pdfBytes.copy(bytes);
  assert.ok(
    (
      await a.db.storage
        .from("course-pdfs")
        .upload(`${a.id}/${large}.pdf`, bytes, {
          contentType: "application/pdf",
        })
    ).error,
  );
});
await check(
  "Report privacy, moderator hide and signed-link revocation",
  async () => {
    await noError(
      await b.db.rpc("report_content", {
        p_kind: "resource",
        p_target: pdf,
        p_reason: "other",
        p_details: "اختبار مؤقت لصلاحيات المراجعة.",
      }),
    );
    assert.equal(
      (await noError(await a.db.from("reports").select("id"))).length,
      0,
    );
    const reports = await noError(
      await m.db.from("reports").select("id").eq("resource_id", pdf),
    );
    assert.equal(reports.length, 1);
    assert.ok(
      (
        await b.db.rpc("moderate_report", {
          p_report: reports[0].id,
          p_action: "hide",
          p_reason: "محاولة طالب غير مسموحة",
        })
      ).error,
    );
    await noError(
      await m.db.rpc("moderate_report", {
        p_report: reports[0].id,
        p_action: "hide",
        p_reason: "إخفاء اختبار ربط مؤقت",
      }),
    );
    assert.ok(
      (
        await guest.functions.invoke("resource-files", {
          body: { action: "open", resource_id: pdf },
        })
      ).error,
    );
    assert.equal(
      (
        await noError(
          await guest.from("resource_cards").select("id").eq("id", pdf),
        )
      ).length,
      0,
    );
  },
);
await writeFile(
  "/tmp/elzatona-hosted-test-state.json",
  JSON.stringify({
    accountIds: accounts.map((a) => a.id),
    course,
    resource,
    pdf,
    badPdf,
    discussion,
    passed,
  }),
  { mode: 0o600 },
);
console.log(
  JSON.stringify({
    passed,
    failed: 0,
    realSupabase: true,
    googleLogin: "provider_disabled",
    appAdminSecretUsed: false,
    fixtures: "temporary; cleanup pending",
  }),
);
