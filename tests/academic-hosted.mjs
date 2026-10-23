// Explicit opt-in QA fixture accounts provisioned by the project owner/MCP.
// Never supply production users here; this writes temporary QA content.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
const file = process.env.TEST_AUTH_ACCOUNTS_FILE;
if (!file || process.env.TEST_ALLOW_WRITES !== "1")
  throw Error("Provide temporary account file and TEST_ALLOW_WRITES=1");
const people = JSON.parse(readFileSync(file, "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
  key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client = () =>
  createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
const [a, b, m] = people.map((p) => ({ ...p, db: client() }));
const guest = client();
let passed = 0;
async function check(name, fn) {
  await fn();
  console.log("PASS " + name);
  passed++;
}
function ok(r) {
  if (r.error) throw Error(r.error.message);
  return r.data;
}
for (const p of [a, b, m])
  await check("Supabase password session " + p.position, async () => {
    ok(
      await p.db.auth.signInWithPassword({
        email: p.email,
        password: p.password,
      }),
    );
    assert.equal(ok(await p.db.auth.getUser()).user.id, p.id);
  });
const U = ok(
    await guest
      .from("universities")
      .select("id")
      .eq("slug", "capital-university")
      .single(),
  ).id,
  V = ok(
    await guest
      .from("universities")
      .select("id")
      .eq("slug", "beni-suef-university")
      .single(),
  ).id,
  F = ok(
    await guest
      .from("faculties")
      .select("id")
      .eq("slug", "engineering")
      .single(),
  ).id,
  G = ok(
    await guest.from("faculties").select("id").eq("slug", "computers").single(),
  ).id;
await check("incomplete onboarding blocks community mutation", async () =>
  assert.ok(
    (await a.db.rpc("follow_course", { p_course: randomUUID() })).error,
  ),
);
await check("persist university-only selection", async () => {
  ok(await a.db.rpc("set_academic_context", { p_university: U }));
  assert.equal(ok(await a.db.rpc("student_context")).ready, false);
});
await check("invalid engineering year denied", async () =>
  assert.ok(
    (
      await a.db.rpc("set_academic_context", {
        p_university: U,
        p_faculty: F,
        p_year: 6,
      })
    ).error,
  ),
);
await check("B completes real academic context", async () => {
  ok(
    await b.db.rpc("set_academic_context", {
      p_university: U,
      p_faculty: F,
      p_year: 2,
    }),
  );
  assert.equal(ok(await b.db.rpc("student_context")).ready, true);
});
await check("student denied admin users and provisioning", async () => {
  assert.ok((await b.db.rpc("admin_users")).error);
  assert.ok(
    (
      await b.db.rpc("provision_admin", {
        p_email: b.email,
        p_username: "forged",
      })
    ).error,
  );
});
await check(
  "managed admin username/password authenticates through real Auth",
  async () => {
    const r = ok(
      await guest.functions.invoke("admin-session", {
        body: { username: m.username, password: m.password },
      }),
    );
    const c = client();
    ok(await c.auth.setSession(r.session));
    assert.equal(ok(await c.rpc("is_admin")), true);
    await c.auth.signOut({ scope: "local" });
  },
);
await check("wrong admin password and student username denied", async () => {
  assert.ok(
    (
      await guest.functions.invoke("admin-session", {
        body: { username: m.username, password: "invalid-password" },
      })
    ).error,
  );
  assert.ok(
    (
      await guest.functions.invoke("admin-session", {
        body: { username: b.username, password: b.password },
      })
    ).error,
  );
});
const suffix = m.username.split("_")[1];
let course;
await check("admin creates real context-matched QA course", async () => {
  course = ok(
    await m.db.rpc("admin_save_course", {
      p_id:
        ok(
          await guest
            .from("courses")
            .select("id")
            .eq("slug", `qa-academic-${suffix}`)
            .maybeSingle(),
        )?.id || null,
      p_university: U,
      p_faculty: F,
      p_year: 2,
      p_semester: 1,
      p_slug: `qa-academic-${suffix}`,
      p_code: "QA-ENG2",
      p_title: "QA Academic Course",
      p_title_ar: "مادة اختبار مؤقت · هندسة",
      p_description: "بيانات اختبار مؤقتة وليست منهجًا فعليًا",
      p_active: true,
    }),
  );
});
await check(
  "query filters at database level exclude unrelated courses",
  async () => {
    const matched = ok(
      await b.db
        .from("courses")
        .select("id")
        .eq("university_id", U)
        .eq("faculty_id", F)
        .eq("year_level", 2),
    );
    assert.ok(matched.some((c) => c.id === course));
    const other = ok(
      await b.db
        .from("courses")
        .select("id")
        .eq("university_id", V)
        .eq("faculty_id", G)
        .eq("year_level", 1),
    );
    assert.equal(other.length, 0);
  },
);
let resource, pdf;
await check(
  "onboarded student contributes and guest reads published resource",
  async () => {
    resource = ok(
      await b.db.rpc("submit_resource", {
        p_course: course,
        p_topic: null,
        p_title: "مصدر ربط أكاديمي مؤقت",
        p_description: "محتوى اختبار مؤقت",
        p_type: "notes",
        p_url: `https://example.org/elzatona-qa-${suffix}`,
        p_rights: true,
        p_ai: false,
      }),
    );
    assert.equal(
      ok(await guest.from("resources").select("id").eq("id", resource).single())
        .id,
      resource,
    );
  },
);
await check("student cannot use admin PDF review", async () =>
  assert.ok(
    (
      await b.db.functions.invoke("resource-files", {
        body: { action: "review", resource_id: resource },
      })
    ).error,
  ),
);
await check(
  "real PDF upload, byte verification and public signed download",
  async () => {
    pdf = ok(
      await b.db.rpc("prepare_pdf", {
        p_course: course,
        p_topic: null,
        p_title: "ملف اختبار أكاديمي مؤقت",
        p_description: "اختبار ملف",
        p_type: "notes",
        p_rights: true,
        p_ai: false,
      }),
    );
    const r = ok(
      await b.db
        .from("resources")
        .select("storage_path")
        .eq("id", pdf)
        .single(),
    );
    const bytes = new TextEncoder().encode(
      "%PDF-1.4\n1 0 obj<</Type /Catalog>>endobj\n%%EOF",
    );
    ok(
      await b.db.storage
        .from("course-pdfs")
        .upload(
          r.storage_path,
          new Blob([bytes], { type: "application/pdf" }),
          { contentType: "application/pdf", upsert: false },
        ),
    );
    ok(
      await b.db.functions.invoke("resource-files", {
        body: { action: "finalize", resource_id: pdf },
      }),
    );
    const signed = ok(
      await guest.functions.invoke("resource-files", {
        body: { action: "open", resource_id: pdf },
      }),
    );
    const response = await fetch(signed.url);
    assert.equal(response.status, 200);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  },
);
await check(
  "admin hides, guest denied, admin retains secure PDF review",
  async () => {
    ok(
      await m.db.rpc("admin_manage_resource", {
        p_resource: pdf,
        p_title: "ملف اختبار أكاديمي مؤقت",
        p_status: "hidden",
        p_reason: "اختبار مراجعة الملف",
        p_confirm: true,
      }),
    );
    assert.ok(
      (
        await guest.functions.invoke("resource-files", {
          body: { action: "open", resource_id: pdf },
        })
      ).error,
    );
    const review = ok(
      await m.db.functions.invoke("resource-files", {
        body: { action: "review", resource_id: pdf },
      }),
    );
    assert.equal((await fetch(review.url)).status, 200);
  },
);
await check(
  "suspension denies already-authenticated mutation; reactivation works",
  async () => {
    ok(
      await m.db.rpc("admin_set_account_status", {
        p_user: b.id,
        p_status: "suspended",
        p_reason: "اختبار إيقاف الحساب",
        p_confirm: true,
      }),
    );
    assert.ok((await b.db.rpc("follow_course", { p_course: course })).error);
    ok(
      await m.db.rpc("admin_set_account_status", {
        p_user: b.id,
        p_status: "active",
        p_reason: "إعادة التفعيل بعد الاختبار",
        p_confirm: true,
      }),
    );
    ok(await b.db.rpc("follow_course", { p_course: course }));
  },
);
await check(
  "admin overview returns real metrics with incomplete faculty year",
  async () => {
    ok(
      await a.db.rpc("set_academic_context", { p_university: U, p_faculty: F }),
    );
    const d = ok(await m.db.rpc("admin_overview"));
    assert.ok(d.students >= 3);
    assert.equal(d.growth.length, 30);
  },
);
const state = {
  university: U,
  otherUniversity: V,
  faculty: F,
  otherFaculty: G,
  course,
  slug: `qa-academic-${suffix}`,
  resource,
  pdf,
};
writeFileSync(
  process.env.TEST_HOSTED_STATE_FILE || "/tmp/elzatona-new-qa-state.json",
  JSON.stringify(state),
  { mode: 0o600 },
);
for (const p of [a, b, m]) await p.db.auth.signOut();
console.log(
  `${passed} hosted integration checks passed. Temporary QA data retained for browser tests; must clean up afterwards.`,
);
