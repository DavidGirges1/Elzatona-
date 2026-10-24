import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
const plan = JSON.parse(readFileSync(process.env.MATERIAL_IMPORT_PLAN, "utf8"));
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const guest = createClient(
  url,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const { data: rows, error } = await guest
  .from("resources")
  .select("*")
  .in(
    "id",
    plan.files.map((f) => f.id),
  );
assert.equal(error, null);
assert.equal(rows.length, 64);
let count = 0;
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < plan.files.length) {
    const f = plan.files[cursor++],
      r = rows.find((x) => x.id === f.id);
    for (const [k, v] of Object.entries({
      course_id: f.course_id,
      topic_id: f.topic_id,
      title: f.title,
      type: f.type,
      author_id: plan.owner_id,
      status: "published",
      review_state: "approved",
      source_kind: "pdf",
      rights_confirmed: true,
    }))
      assert.equal(r[k], v, k + " " + f.id);
    assert.ok(r.file_verified_at);
    const signed = await guest.functions.invoke("resource-files", {
      body: { action: "open", resource_id: f.id },
    });
    assert.equal(signed.error, null);
    const destination = new URL(signed.data.url);
    assert.equal(destination.origin, new URL(url).origin);
    assert.ok(
      destination.pathname.startsWith("/storage/v1/object/sign/course-pdfs/"),
    );
    const response = await fetch(destination);
    assert.equal(response.status, 200);
    const bytes = Buffer.from(await response.arrayBuffer());
    assert.equal(bytes.length, f.size);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), f.sha256);
    results.push({
      id: f.id,
      metadata: "passed",
      guest_download: "passed",
      sha256: f.sha256,
      size: bytes.length,
    });
    count++;
    if (count % 8 === 0)
      console.log(
        "Verified guest metadata and exact Storage bytes",
        count,
        "/64",
      );
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
const first = plan.files[0];
const privateAttempt = await fetch(
  url + "/storage/v1/object/public/course-pdfs/" + first.storage_path,
);
assert.notEqual(privateAttempt.status, 200);
writeFileSync(
  process.env.MATERIAL_IMPORT_VERIFY_OUTPUT,
  JSON.stringify(
    {
      files_verified: count,
      private_bucket_public_download_denied: true,
      results,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  "64/64 guest-visible resources matched metadata and byte-for-byte SHA-256; unsigned public bucket access denied.",
);
