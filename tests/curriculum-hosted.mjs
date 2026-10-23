// Uses only temporary accounts supplied explicitly by the operator. No service key.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { minimalPdf } from "./support/live.mjs";
if (
  process.env.TEST_ALLOW_WRITES !== "1" ||
  !process.env.TEST_AUTH_ACCOUNTS_FILE ||
  !process.env.TEST_CURRICULUM_STATE_FILE
)
  throw Error(
    "Explicit temporary QA accounts, state file and TEST_ALLOW_WRITES=1 required",
  );
const catalog = JSON.parse(
  readFileSync("data/curriculum/capital-computing-2021.json", "utf8"),
);
const people = JSON.parse(
  readFileSync(process.env.TEST_AUTH_ACCOUNTS_FILE, "utf8"),
);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
if (
  people.length !== 3 ||
  people.some((p) => !p.email.startsWith("ez-curriculum-"))
)
  throw Error("Only temporary curriculum QA accounts are supported");
const [a, b, o] = people.map((p) => ({ ...p, db: client() })),
  guest = client();
let passed = 0;
const ok = (r) => {
  if (r.error) throw Error(r.error.message);
  return r.data;
};
async function check(name, fn) {
  await fn();
  console.log("PASS " + name);
  passed++;
}
const courses = ok(
  await guest
    .from("courses")
    .select("*")
    .eq("curriculum_source", "capital-computing-2021"),
);
const mappings = ok(
  await guest
    .from("course_requirements")
    .select("*")
    .in(
      "course_id",
      courses.map((c) => c.id),
    ),
);
const course = (code) => {
  const c = courses.find((c) => c.code === code);
  assert.ok(c, "missing " + code);
  return c;
};
await check(
  "public API exposes all 122 courses and all 160 requirement mappings",
  async () => {
    assert.equal(courses.length, 122);
    assert.equal(mappings.length, 160);
  },
);
await check(
  "every live title, code, study level, credit and requirement matches supplied curriculum",
  async () => {
    for (const expected of catalog.courses) {
      const c = course(expected.code);
      assert.equal(c.title_ar, expected.title_ar);
      assert.equal(c.title_en, expected.title_en);
      assert.equal(c.year_level, expected.year);
      assert.equal(c.credit_hours, expected.credit_hours);
      assert.equal(c.semester, null);
      assert.equal(c.code_ar, expected.code_ar);
      assert.deepEqual(
        mappings
          .filter((r) => r.course_id === c.id)
          .map((r) => [r.scope, r.kind, r.source_page])
          .sort(),
        expected.requirements.map((r) => [r.scope, r.kind, r.page]).sort(),
      );
    }
  },
);
for (const p of [a, b, o])
  await check("real Auth session for temporary " + p.position, async () => {
    ok(
      await p.db.auth.signInWithPassword({
        email: p.email,
        password: p.password,
      }),
    );
    assert.equal(ok(await p.db.auth.getUser()).user.id, p.id);
  });
const first = course("CS 111"),
  third = course("CS 316"),
  fourth = course("CS 419");
const university = first.university_id,
  faculty = first.faculty_id;
await check(
  "guest and incomplete student cannot add course groups",
  async () => {
    assert.ok(
      (await guest.rpc("add_courses", { p_courses: [first.id] })).error,
    );
    assert.ok((await o.db.rpc("add_courses", { p_courses: [first.id] })).error);
  },
);
await check("students set real university/faculty/year context", async () => {
  for (const [p, year] of [
    [a, 3],
    [b, 2],
  ])
    ok(
      await p.db.rpc("set_academic_context", {
        p_university: university,
        p_faculty: faculty,
        p_year: year,
      }),
    );
  assert.equal(ok(await a.db.rpc("student_context")).academic_year, 3);
});
for (const person of [a, b])
  for (const row of ok(
    await person.db.from("user_courses").select("course_id"),
  ))
    ok(await person.db.rpc("follow_course", { p_course: row.course_id }));
await check(
  "cross-year bulk add is additive and replay does not toggle any follow",
  async () => {
    assert.equal(
      ok(
        await a.db.rpc("add_courses", {
          p_courses: [first.id, third.id, fourth.id, first.id],
        }),
      ),
      3,
    );
    assert.equal(
      ok(
        await a.db.rpc("add_courses", {
          p_courses: [first.id, third.id, fourth.id],
        }),
      ),
      0,
    );
    assert.equal(ok(await a.db.from("user_courses").select("*")).length, 3);
  },
);
await check(
  "other students cannot see, forge or delete the first student course list",
  async () => {
    assert.equal(
      ok(await b.db.from("user_courses").select("*").eq("user_id", a.id))
        .length,
      0,
    );
    assert.ok(
      (
        await b.db
          .from("user_courses")
          .insert({ user_id: a.id, course_id: first.id })
      ).error,
    );
    await b.db.from("user_courses").delete().eq("user_id", a.id);
    assert.equal(ok(await a.db.from("user_courses").select("*")).length, 3);
  },
);
await check(
  "mixed valid/invalid bulk input fails without partial writes",
  async () => {
    assert.ok(
      (await b.db.rpc("add_courses", { p_courses: [first.id, randomUUID()] }))
        .error,
    );
    assert.equal(ok(await b.db.from("user_courses").select("*")).length, 0);
  },
);
await check(
  "editing academic year preserves explicitly followed course groups",
  async () => {
    ok(
      await a.db.rpc("set_academic_context", {
        p_university: university,
        p_faculty: faculty,
        p_year: 4,
      }),
    );
    assert.equal(ok(await a.db.from("user_courses").select("*")).length, 3);
    ok(
      await a.db.rpc("set_academic_context", {
        p_university: university,
        p_faculty: faculty,
        p_year: 3,
      }),
    );
  },
);
await check(
  "ordinary student cannot alter curriculum classification",
  async () => {
    assert.ok(
      (
        await b.db
          .from("course_requirements")
          .update({ kind: "elective" })
          .eq("course_id", first.id)
      ).error,
    );
  },
);
const run = randomUUID().slice(0, 8),
  state = { university, faculty, first, third, fourth, run };
await check(
  "third-year student publishes a resource to a first-year hub",
  async () => {
    state.resource = ok(
      await a.db.rpc("submit_resource", {
        p_course: first.id,
        p_topic: null,
        p_title: "مصدر اختبار منهج مؤقت " + run,
        p_description: "Temporary QA resource, removed after verification.",
        p_type: "reference",
        p_url: "https://example.org/curriculum-qa/" + run,
        p_rights: true,
        p_ai: false,
      }),
    );
  },
);
await check(
  "guest and another student can read the newly published resource",
  async () => {
    for (const db of [guest, b.db])
      assert.equal(
        ok(await db.from("resource_cards").select("*").eq("id", state.resource))
          .length,
        1,
      );
  },
);
await check("another student votes and saves across years", async () => {
  ok(await b.db.rpc("set_vote", { p_resource: state.resource, p_value: 1 }));
  ok(await b.db.rpc("toggle_save", { p_resource: state.resource }));
  assert.equal(
    ok(
      await guest
        .from("resource_cards")
        .select("score")
        .eq("id", state.resource)
        .single(),
    ).score,
    1,
  );
});
await check(
  "cross-year question and reply remain ordinary community interactions",
  async () => {
    state.question = ok(
      await b.db.rpc("ask_question", {
        p_course: first.id,
        p_resource: state.resource,
        p_title: "سؤال اختبار المنهج " + run,
        p_body: "هل المناقشة متاحة للطلبة من سنين مختلفة؟",
      }),
    );
    ok(
      await a.db.rpc("reply_question", {
        p_discussion: state.question,
        p_body: "نعم، مجموعة المادة متاحة للنقاش من السنين المختلفة.",
      }),
    );
  },
);
await check(
  "another student cannot edit or reassign the contribution",
  async () => {
    assert.ok(
      (
        await b.db.rpc("edit_resource", {
          p_resource: state.resource,
          p_title: "عنوان غير مسموح بتغييره",
          p_description: "bad",
          p_topic: null,
        })
      ).error,
    );
    assert.ok(
      (
        await b.db
          .from("resources")
          .update({ author_id: b.id, status: "hidden" })
          .eq("id", state.resource)
      ).error,
    );
  },
);
await check(
  "cross-year PDF starts pending and is not guest-readable",
  async () => {
    state.pdf = ok(
      await a.db.rpc("prepare_pdf", {
        p_course: first.id,
        p_topic: null,
        p_title: "PDF اختبار منهج مؤقت " + run,
        p_description: "Temporary QA file",
        p_type: "notes",
        p_rights: true,
        p_ai: false,
      }),
    );
    state.storagePath = ok(
      await a.db
        .from("resources")
        .select("storage_path")
        .eq("id", state.pdf)
        .single(),
    ).storage_path;
    assert.equal(
      ok(await guest.from("resources").select("id").eq("id", state.pdf)).length,
      0,
    );
  },
);
await check("another student cannot upload to the PDF owner path", async () => {
  assert.ok(
    (
      await b.db.storage
        .from("course-pdfs")
        .upload(state.storagePath, minimalPdf(), {
          contentType: "application/pdf",
        })
    ).error,
  );
});
await check(
  "real PDF upload, checked publication and guest signed download succeed",
  async () => {
    ok(
      await a.db.storage
        .from("course-pdfs")
        .upload(state.storagePath, minimalPdf(), {
          contentType: "application/pdf",
          upsert: false,
        }),
    );
    const finalized = ok(
      await a.db.functions.invoke("resource-files", {
        body: { action: "finalize", resource_id: state.pdf },
      }),
    );
    assert.equal(finalized.published, true);
    const link = ok(
      await guest.functions.invoke("resource-files", {
        body: { action: "open", resource_id: state.pdf },
      }),
    );
    const response = await fetch(link.url);
    assert.equal(response.status, 200);
    assert.ok((await response.text()).startsWith("%PDF-"));
  },
);
writeFileSync(process.env.TEST_CURRICULUM_STATE_FILE, JSON.stringify(state), {
  mode: 0o600,
});
console.log(
  `RESULT: ${passed} hosted Supabase checks passed; only temporary QA records created. Cleanup required after browser tests.`,
);
