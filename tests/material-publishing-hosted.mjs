// Explicit temporary QA accounts only; never a production administrator credential.
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
if (
  process.env.TEST_ALLOW_WRITES !== "1" ||
  !process.env.TEST_PUBLISHING_ACCOUNTS ||
  !process.env.TEST_PUBLISHING_STATE
)
  throw Error(
    "Explicit temporary QA accounts/state and TEST_ALLOW_WRITES=1 required",
  );
const people = JSON.parse(
  readFileSync(process.env.TEST_PUBLISHING_ACCOUNTS, "utf8"),
);
if (
  people.length !== 3 ||
  people.some((p) => !p.email.startsWith("ez-publishing-"))
)
  throw Error("Non-QA accounts refused");
const fresh = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
const ok = (r) => {
  if (r.error) throw Error(r.error.message);
  return r.data;
};
const guest = fresh();
for (const p of people) {
  p.db = fresh();
  ok(
    await p.db.auth.signInWithPassword({
      email: p.email,
      password: p.password,
    }),
  );
}
const [p, o, m] = people;
const course = ok(
  await guest.from("courses").select("*").eq("slug", "capital-ai-310").single(),
);
for (const a of [p, o])
  ok(
    await a.db.rpc("set_academic_context", {
      p_university: course.university_id,
      p_faculty: course.faculty_id,
      p_year: 3,
    }),
  );
const state = {
  slug: course.slug,
  course: course.id,
  people: people.map((p) => ({
    id: p.id,
    username: p.username,
    position: p.position,
  })),
  run: p.username,
};
const save = () =>
  writeFileSync(process.env.TEST_PUBLISHING_STATE, JSON.stringify(state), {
    mode: 0o600,
  });
save();
const base = {
  p_course: course.id,
  p_topic: null,
  p_rights: true,
  p_ai: false,
  p_description:
    "Temporary publishing-permission QA, removed after verification.",
};
const submit = (db, title) =>
  db.rpc("submit_resource", {
    ...base,
    p_title: title,
    p_type: "reference",
    p_url: `https://example.org/${encodeURIComponent(title)}`,
  });
const grant = (person, publish = false, organize = false) =>
  m.db.rpc("admin_set_material_permissions", {
    p_user: person.id,
    p_publish: publish,
    p_organize: organize,
    p_reason: "Temporary QA permission decision",
    p_confirm: true,
  });
let count = 0;
async function check(name, fn) {
  await fn();
  count++;
  console.log("PASS " + name);
}
await check(
  "default launch mode is closed for real existing-style student accounts",
  async () => {
    assert.deepEqual(ok(await p.db.rpc("material_access")), {
      open_to_all: false,
      can_publish: false,
      can_organize: false,
    });
  },
);
await check(
  "unapproved student cannot publish a link or prepare a PDF",
  async () => {
    assert.ok((await submit(p.db, "Forbidden QA material")).error);
    assert.ok(
      (
        await p.db.rpc("prepare_pdf", {
          ...base,
          p_title: "Forbidden PDF",
          p_type: "notes",
        })
      ).error,
    );
  },
);
await check(
  "student cannot self-approve, write grant tables or open global publishing",
  async () => {
    assert.ok(
      (
        await p.db.rpc("admin_set_material_permissions", {
          p_user: p.id,
          p_publish: true,
          p_organize: true,
          p_reason: "Self approval attack",
          p_confirm: true,
        })
      ).error,
    );
    assert.ok(
      (
        await p.db
          .from("material_permissions")
          .insert({ user_id: p.id, can_publish: true })
      ).error,
    );
    assert.ok(
      (
        await p.db.rpc("admin_set_publishing_mode", {
          p_open: true,
          p_reason: "Unauthorized opening",
          p_confirm: true,
        })
      ).error,
    );
  },
);
await check(
  "admin approval enables publication without granting administration",
  async () => {
    ok(await grant(p, true));
    assert.equal(ok(await p.db.rpc("material_access")).can_publish, true);
    state.resource = ok(
      await submit(p.db, "QA approved publisher " + state.run),
    );
    state.adminResource = ok(
      await submit(m.db, "QA administrator material " + state.run),
    );
    save();
    assert.ok((await p.db.rpc("admin_users")).error);
  },
);
await check(
  "guest sees actual approved material; unapproved student can vote/save/follow/discuss",
  async () => {
    assert.ok(
      ok(
        await guest
          .from("resource_cards")
          .select("id")
          .eq("id", state.resource)
          .single(),
      ),
    );
    ok(await o.db.rpc("set_vote", { p_resource: state.resource, p_value: 1 }));
    ok(await o.db.rpc("toggle_save", { p_resource: state.resource }));
    ok(await o.db.rpc("follow_course", { p_course: course.id }));
    state.question = ok(
      await o.db.rpc("ask_question", {
        p_course: course.id,
        p_resource: state.resource,
        p_title: "QA unrestricted community question",
        p_body:
          "A temporary QA question verifying community interactions remain available.",
      }),
    );
    save();
  },
);
await check(
  "publisher may edit own material but cannot organize another author",
  async () => {
    ok(
      await p.db.rpc("edit_resource", {
        p_resource: state.resource,
        p_title: "QA publisher edited " + state.run,
        p_description: "Own permitted edit",
        p_topic: null,
      }),
    );
    assert.ok(
      (
        await p.db.rpc("edit_resource", {
          p_resource: state.adminResource,
          p_title: "Cross author denied",
          p_description: "",
          p_topic: null,
        })
      ).error,
    );
  },
);
for (const key of ["pdf", "pendingPdf"]) {
  state[key] = ok(
    await p.db.rpc("prepare_pdf", {
      ...base,
      p_title: `QA permissions ${key} ${state.run}`,
      p_type: "notes",
    }),
  );
  save();
}
const pdfPath = ok(
  await p.db
    .from("resources")
    .select("storage_path")
    .eq("id", state.pdf)
    .single(),
).storage_path;
const pendingPath = ok(
  await p.db
    .from("resources")
    .select("storage_path")
    .eq("id", state.pendingPdf)
    .single(),
).storage_path;
// A minimal real one-page document with no redistributed course content.
const stream = "BT /F1 18 Tf 40 450 Td (Elzatona permission QA) Tj ET";
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 400 500] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
];
let pdf = "%PDF-1.4\n";
const offsets = [];
for (let i = 0; i < objects.length; i++) {
  offsets.push(Buffer.byteLength(pdf));
  pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
}
const xref = Buffer.byteLength(pdf);
pdf +=
  `xref\n0 6\n0000000000 65535 f \n` +
  offsets.map((n) => String(n).padStart(10, "0") + " 00000 n \n").join("") +
  `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
await check(
  "approved student uploads real PDF; pending metadata remains private",
  async () => {
    ok(
      await p.db.storage.from("course-pdfs").upload(pdfPath, Buffer.from(pdf), {
        contentType: "application/pdf",
        upsert: false,
      }),
    );
    assert.equal(
      ok(await guest.from("resources").select("id").eq("id", state.pdf)).length,
      0,
    );
  },
);
await check(
  "revocation blocks new upload, finalization, link publication and own edits",
  async () => {
    ok(await grant(p));
    assert.ok(
      (
        await p.db.storage
          .from("course-pdfs")
          .upload(pendingPath, Buffer.from(pdf), {
            contentType: "application/pdf",
          })
      ).error,
    );
    assert.ok(
      (
        await p.db.functions.invoke("resource-files", {
          body: { action: "finalize", resource_id: state.pdf },
        })
      ).error,
    );
    assert.ok((await submit(p.db, "Revoked QA publication")).error);
    assert.ok(
      (
        await p.db.rpc("edit_resource", {
          p_resource: state.resource,
          p_title: "Revoked edit",
          p_description: "",
          p_topic: null,
        })
      ).error,
    );
  },
);
await check(
  "reapproved PDF passes managed byte checks and opens for a guest",
  async () => {
    ok(await grant(p, true));
    assert.equal(
      ok(
        await p.db.functions.invoke("resource-files", {
          body: { action: "finalize", resource_id: state.pdf },
        }),
      ).published,
      true,
    );
    const signed = ok(
      await guest.functions.invoke("resource-files", {
        body: { action: "open", resource_id: state.pdf },
      }),
    );
    const r = await fetch(signed.url);
    assert.equal(r.status, 200);
    assert.ok(
      Buffer.from(await r.arrayBuffer())
        .subarray(0, 5)
        .equals(Buffer.from("%PDF-")),
    );
  },
);
await check(
  "organization-only student creates topic and reclassifies published material",
  async () => {
    ok(await grant(o, false, true));
    state.topic = ok(
      await o.db.rpc("add_material_topic", {
        p_course: course.id,
        p_title: "QA organizer topic " + state.run,
      }),
    );
    save();
    ok(
      await o.db.rpc("edit_resource", {
        p_resource: state.resource,
        p_title: "QA organized " + state.run,
        p_description: "Organized through checked RPC",
        p_topic: state.topic,
      }),
    );
    const r = ok(
      await guest
        .from("resources")
        .select("author_id,topic_id,status")
        .eq("id", state.resource)
        .single(),
    );
    assert.deepEqual(r, {
      author_id: p.id,
      topic_id: state.topic,
      status: "published",
    });
    assert.ok((await submit(o.db, "Organizer must not publish")).error);
  },
);
await check(
  "organizer cannot change status/ownership or access admin console RPCs",
  async () => {
    assert.ok(
      (
        await o.db
          .from("resources")
          .update({ status: "hidden", author_id: o.id })
          .eq("id", state.resource)
      ).error,
    );
    assert.ok((await o.db.rpc("admin_users")).error);
    assert.equal(ok(await o.db.rpc("is_admin")), false);
  },
);
await check(
  "revoked organizer immediately loses edit/topic access; leave QA students locked",
  async () => {
    ok(await grant(o));
    ok(await grant(p));
    assert.ok(
      (
        await o.db.rpc("edit_resource", {
          p_resource: state.resource,
          p_title: "Revoked organizer edit",
          p_description: "",
          p_topic: null,
        })
      ).error,
    );
    assert.ok(
      (
        await o.db.rpc("add_material_topic", {
          p_course: course.id,
          p_title: "Revoked topic",
        })
      ).error,
    );
    assert.equal(ok(await guest.rpc("material_access")).open_to_all, false);
  },
);
console.log(
  `RESULT ${count}/${count} hosted permission checks passed; QA fixtures retained only for browser verification.`,
);
