import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
if (
  process.env.TEST_ALLOW_WRITES !== "1" ||
  !process.env.TEST_AUTH_ACCOUNTS_FILE ||
  !process.env.TEST_HOSTED_STATE_FILE
)
  throw Error("Explicit isolated QA fixtures and TEST_ALLOW_WRITES=1 required");
const people = JSON.parse(
    readFileSync(process.env.TEST_AUTH_ACCOUNTS_FILE, "utf8"),
  ),
  state = JSON.parse(readFileSync(process.env.TEST_HOSTED_STATE_FILE, "utf8"));
const client = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
const b = client(),
  m = client();
function ok(r) {
  if (r.error) throw r.error;
  return r.data;
}
for (const [db, p] of [
  [b, people[1]],
  [m, people[2]],
])
  ok(
    await db.auth.signInWithPassword({ email: p.email, password: p.password }),
  );
const f = ok(
  await m.from("faculties").select("*").eq("id", state.faculty).single(),
);
const years = ok(
  await m
    .from("academic_years")
    .select("year")
    .eq("university_id", state.university)
    .eq("faculty_id", state.faculty),
).map((v) => v.year);
const save = (active) =>
  m.rpc("admin_save_faculty", {
    p_id: f.id,
    p_university: state.university,
    p_slug: f.slug,
    p_name: f.name,
    p_name_ar: f.name_ar,
    p_years: years,
    p_active: active,
  });
const id = ok(
  await b.rpc("prepare_pdf", {
    p_course: state.course,
    p_topic: null,
    p_title: "اختبار صلاحية أكاديمية لملف مؤقت",
    p_description: "اختبار أمني مؤقت",
    p_type: "notes",
    p_rights: true,
    p_ai: false,
  }),
);
const path = ok(
  await b.from("resources").select("storage_path").eq("id", id).single(),
).storage_path;
ok(
  await b.storage
    .from("course-pdfs")
    .upload(path, new Blob(["%PDF-1.4\n%%EOF"], { type: "application/pdf" }), {
      contentType: "application/pdf",
    }),
);
try {
  ok(await save(false));
  const denied = await b.functions.invoke("resource-files", {
    body: { action: "finalize", resource_id: id },
  });
  assert.ok(denied.error);
  console.log(
    "PASS pending PDF publication denied after academic option disabled",
  );
} finally {
  ok(await save(true));
}
ok(
  await b.functions.invoke("resource-files", {
    body: { action: "finalize", resource_id: id },
  }),
);
console.log("PASS pending PDF publishes after academic eligibility restored");
const guest = client();
assert.equal(
  ok(await guest.from("resources").select("id").eq("id", id).single()).id,
  id,
);
console.log("PASS guest sees verified PDF after reactivation");
await b.auth.signOut({ scope: "local" });
await m.auth.signOut({ scope: "local" });
