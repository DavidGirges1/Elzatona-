import { it, expect, vi } from "vitest";
import {
  fileHandler,
  type FileServices,
  type PdfRecord,
} from "../supabase/functions/resource-files/handler";
const id = "90000000-0000-4000-8000-000000000001";
function setup(overrides: Partial<PdfRecord> = {}) {
  const record: PdfRecord = {
    id,
    author_id: "student-a",
    source_kind: "pdf",
    status: "pending",
    storage_path: `student-a/${id}.pdf`,
    course_active: true,
    ...overrides,
  };
  const services = {
    authenticate: vi.fn().mockResolvedValue({ id: "student-a" }),
    resource: vi.fn().mockResolvedValue(record),
    download: vi.fn().mockResolvedValue(new Blob(["%PDF-1.4\nQA"])),
    finalize: vi.fn().mockResolvedValue(true),
    sign: vi
      .fn()
      .mockResolvedValue(
        "https://project.supabase.co/storage/v1/object/sign/course-pdfs/qa.pdf?token=short-lived",
      ),
  };
  const handle = fileHandler(services as FileServices);
  const request = (
    action = "finalize",
    token: string | null = "real-user-jwt",
    extra: Record<string, unknown> = {},
  ) =>
    handle(
      new Request("https://function.invalid", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action, resource_id: id, ...extra }),
      }),
    );
  return { services, handle, request };
}
it("finalization requires login", async () => {
  const x = setup();
  expect((await x.request("finalize", null)).status).toBe(401);
  expect(x.services.resource).not.toHaveBeenCalled();
});
it("expired or invalid JWT rejected", async () => {
  const x = setup();
  x.services.authenticate.mockResolvedValue(null);
  expect((await x.request()).status).toBe(401);
});
it("other student cannot publish author file", async () => {
  const x = setup();
  x.services.authenticate.mockResolvedValue({ id: "student-b" });
  expect((await x.request()).status).toBe(403);
  expect(x.services.download).not.toHaveBeenCalled();
});
it("hidden file never gets signed URL", async () => {
  const x = setup({ status: "hidden" });
  expect((await x.request("open", null)).status).toBe(404);
  expect(x.services.sign).not.toHaveBeenCalled();
});
it("pending file not anonymously readable", async () => {
  const x = setup();
  expect((await x.request("open", null)).status).toBe(404);
});
it("inactive course cannot sign or publish", async () => {
  const x = setup({ course_active: false });
  expect((await x.request()).status).toBe(404);
  expect((await x.request("open", null)).status).toBe(404);
});
it("published PDF opens anonymously with 60 second expiry", async () => {
  const x = setup({ status: "published" });
  const r = await x.request("open", null);
  expect(r.status).toBe(200);
  expect(await r.json()).toMatchObject({ expires_in: 60 });
  expect(x.services.authenticate).not.toHaveBeenCalled();
});
it("missing file cannot publish", async () => {
  const x = setup();
  x.services.download.mockResolvedValue(null);
  expect((await x.request()).status).toBe(422);
  expect(x.services.finalize).not.toHaveBeenCalled();
});
it("MIME spoofed non-PDF rejected by actual bytes", async () => {
  const x = setup();
  x.services.download.mockResolvedValue(
    new Blob(["<html>not a PDF</html>"], { type: "application/pdf" }),
  );
  expect((await x.request()).status).toBe(422);
});
it("oversized PDF rejected before publication", async () => {
  const x = setup();
  x.services.download.mockResolvedValue(
    new Blob(["%PDF-", new Uint8Array(3145728)]),
  );
  expect((await x.request()).status).toBe(422);
});
it("valid own PDF finalized without trusting client author", async () => {
  const x = setup();
  expect(
    (
      await x.request("finalize", "real-user-jwt", {
        author_id: "student-b",
        storage_path: "someone/other.pdf",
      })
    ).status,
  ).toBe(200);
  expect(x.services.finalize).toHaveBeenCalledWith(id, "student-a");
  expect(x.services.download).toHaveBeenCalledWith(`student-a/${id}.pdf`);
});
it("external resources cannot be treated as uploads", async () => {
  const x = setup({ source_kind: "external" });
  expect((await x.request()).status).toBe(404);
});
it("repeated publication does not bypass pending state", async () => {
  const x = setup({ status: "published" });
  expect((await x.request()).status).toBe(403);
});
it("bad ID and action rejected", async () => {
  const x = setup();
  expect((await x.request("erase-all")).status).toBe(400);
  expect((await x.request("open", null, { resource_id: "bad" })).status).toBe(
    400,
  );
});
it("read method denied", async () => {
  const x = setup();
  expect((await x.handle(new Request("https://function.invalid"))).status).toBe(
    405,
  );
});
it("malformed JSON handled without leaked error details", async () => {
  const x = setup();
  const r = await x.handle(
    new Request("https://function.invalid", {
      method: "POST",
      body: "not json",
    }),
  );
  expect(r.status).toBe(400);
  expect(await r.json()).toEqual({ error: "invalid_request" });
});
it("signing failure is recoverable and uncached", async () => {
  const x = setup({ status: "published" });
  x.services.sign.mockResolvedValue(null);
  const r = await x.request("open", null);
  expect(r.status).toBe(503);
  expect(r.headers.get("Cache-Control")).toBe("no-store");
});
it("failed publication never reports success", async () => {
  const x = setup();
  x.services.finalize.mockResolvedValue(false);
  expect((await x.request()).status).toBe(409);
});
it("anonymous admin-review request rejected before record lookup", async () => {
  const x = setup({ status: "hidden" });
  expect((await x.request("review", null)).status).toBe(401);
  expect(x.services.sign).not.toHaveBeenCalled();
});
it("student cannot use admin-review action", async () => {
  const x = setup({ status: "hidden" });
  expect((await x.request("review")).status).toBe(403);
  expect(x.services.resource).not.toHaveBeenCalled();
});
it("verified administrator may review hidden PDF without republishing it", async () => {
  const x = setup({ status: "hidden", course_active: false });
  const handle = fileHandler({
    ...x.services,
    isAdmin: vi.fn().mockResolvedValue(true),
  });
  const r = await handle(
    new Request("https://function.invalid", {
      method: "POST",
      headers: { authorization: "Bearer valid-admin" },
      body: JSON.stringify({ action: "review", resource_id: id }),
    }),
  );
  expect(r.status).toBe(200);
  expect(x.services.sign).toHaveBeenCalled();
  expect(x.services.finalize).not.toHaveBeenCalled();
});
