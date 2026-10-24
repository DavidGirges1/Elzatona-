import { it, expect } from "vitest";
import {
  importHandler,
  digest,
  type ImportConfig,
  type ImportRecord,
} from "../scripts/material-import/handler";
const bytes = new TextEncoder().encode("%PDF-test fixture");
const id = "e3bdf4be-8625-4e3b-99b8-0d92995f39d6",
  owner = "bc2d2a74-d571-4cf6-b489-ffcb9362abf1";
async function fixture(
  overrides: Partial<ImportRecord> = {},
  ready = true,
  upload = true,
) {
  const cfg: ImportConfig = {
    ownerId: owner,
    capabilityHash: await digest(new TextEncoder().encode("test-capability")),
    expiresAt: 2000,
    files: {
      [id]: {
        sha256: await digest(bytes),
        size: bytes.length,
        courseId: "course",
        topicId: null,
      },
    },
  };
  let finalized = 0,
    uploaded = 0;
  const row: ImportRecord = {
    id,
    author_id: owner,
    course_id: "course",
    topic_id: null,
    source_kind: "pdf",
    storage_path: `${owner}/${id}.pdf`,
    status: "pending",
    review_state: "draft",
    file_verified_at: null,
    course_active: true,
    ...overrides,
  };
  const handler = importHandler(
    cfg,
    {
      readyOwner: async () => ready,
      resource: async () => row,
      upload: async () => {
        uploaded++;
        return upload;
      },
      download: async () => bytes,
      finalize: async () => {
        finalized++;
        row.status = "published";
        row.review_state = "approved";
        row.file_verified_at = "verified";
        return true;
      },
    },
    () => 1000,
  );
  const request = (token = "test-capability", body = bytes, rid = id) =>
    new Request(`https://example.org/import?id=${rid}`, {
      method: "PUT",
      headers: {
        "x-import-capability": token,
        "content-type": "application/pdf",
        "content-length": String(body.length),
      },
      body: body as Uint8Array<ArrayBuffer>,
    });
  return {
    handler,
    request,
    cfg,
    counts: () => ({ finalized, uploaded }),
    row,
  };
}
it("imports only matching PDF bytes then publishes through verified finalization", async () => {
  const f = await fixture();
  expect((await f.handler(f.request())).status).toBe(200);
  expect(f.counts()).toEqual({ uploaded: 1, finalized: 1 });
});
it("rejects missing or incorrect capabilities before mutations", async () => {
  const f = await fixture();
  expect((await f.handler(f.request("wrong"))).status).toBe(401);
  expect(f.counts().uploaded).toBe(0);
});
it("rejects expired capabilities", async () => {
  const f = await fixture();
  f.cfg.expiresAt = 500;
  expect((await f.handler(f.request())).status).toBe(410);
});
it("rejects files outside the exact batch", async () => {
  const f = await fixture();
  expect(
    (await f.handler(f.request("test-capability", bytes, "other"))).status,
  ).toBe(404);
});
it("rejects altered bytes even with an otherwise correct capability", async () => {
  const f = await fixture();
  const bad = bytes.slice();
  bad[6]++;
  expect((await f.handler(f.request("test-capability", bad))).status).toBe(422);
  expect(f.counts().finalized).toBe(0);
});
it("rejects an administrator revoked before import", async () => {
  const f = await fixture({}, false);
  expect((await f.handler(f.request())).status).toBe(403);
});
it.each([
  { course_id: "other" },
  { topic_id: "other" },
  { author_id: "other" },
  { storage_path: "other/file.pdf" },
  { course_active: false },
])("rejects a resource outside the exact scope %j", async (change) => {
  const f = await fixture(change);
  expect((await f.handler(f.request())).status).toBe(403);
});
it("resumes a byte-identical uploaded draft without overwriting", async () => {
  const f = await fixture({}, true, false);
  expect((await f.handler(f.request())).status).toBe(200);
  expect(f.counts().finalized).toBe(1);
});
it("does not rewrite an already published resource", async () => {
  const f = await fixture({
    status: "published",
    review_state: "approved",
    file_verified_at: "verified",
  });
  expect((await f.handler(f.request())).status).toBe(200);
  expect(f.counts()).toEqual({ uploaded: 0, finalized: 0 });
});
it("rejects submitted files to preserve review immutability", async () => {
  const f = await fixture({ review_state: "submitted" });
  expect((await f.handler(f.request())).status).toBe(409);
});
