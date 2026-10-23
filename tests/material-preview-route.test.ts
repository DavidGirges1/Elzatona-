import { beforeEach, expect, it, vi } from "vitest";
const services = vi.hoisted(() => ({
  resource: vi.fn(),
  sign: vi.fn(),
  enabled: vi.fn(),
  rpc: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock("@/lib/data", () => ({ getResource: services.resource }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ rpc: services.rpc }),
}));
vi.mock("@/lib/supabase/files", () => ({
  pdfEnabled: services.enabled,
  publishedPdfUrl: services.sign,
}));
import { GET, POST } from "../src/app/api/resources/[id]/preview/route";
const request = () =>
  GET(new Request("https://elzatona.tech/api/resources/test/preview"), {
    params: Promise.resolve({ id: "test" }),
  });
beforeEach(() => {
  vi.resetAllMocks();
  services.resource.mockResolvedValue({ source_kind: "pdf" });
  services.enabled.mockReturnValue(true);
  services.sign.mockResolvedValue(
    "https://project.supabase.co/storage/v1/object/sign/course-pdfs/test?token=test",
  );
  services.fetch.mockResolvedValue(
    new Response("%PDF-1.7\n", {
      headers: { "Content-Type": "application/pdf" },
    }),
  );
  vi.stubGlobal("fetch", services.fetch);
});
it("rejects hidden, pending or missing resource before signing", async () => {
  services.resource.mockResolvedValue(null);
  expect((await request()).status).toBe(404);
  expect(services.sign).not.toHaveBeenCalled();
});
it("never proxies external submitted links", async () => {
  services.resource.mockResolvedValue({
    source_kind: "external",
    external_url: "https://localhost/",
  });
  expect((await request()).status).toBe(404);
  expect(services.fetch).not.toHaveBeenCalled();
});
it("handles missing storage setup and signing failure", async () => {
  services.enabled.mockReturnValue(false);
  expect((await request()).status).toBe(503);
  services.enabled.mockReturnValue(true);
  services.sign.mockResolvedValue(null);
  expect((await request()).status).toBe(503);
});
it("streams published PDF anonymously without exposing signed URL and disables caching", async () => {
  const r = await request();
  expect(r.status).toBe(200);
  expect(await r.text()).toMatch(/^%PDF-/);
  expect(r.headers.get("Cache-Control")).toBe("private, no-store");
  expect(r.headers.get("Content-Disposition")).toBe("inline");
  expect(r.headers.get("Location")).toBeNull();
  expect(services.rpc).toHaveBeenCalledWith("record_open", {
    p_resource: "test",
  });
  expect(services.fetch.mock.calls[0][1]).toMatchObject({
    redirect: "error",
    cache: "no-store",
  });
});
it("does not stream an upstream error or non-PDF response", async () => {
  services.fetch.mockResolvedValue(
    new Response("<html>error</html>", {
      headers: { "Content-Type": "text/html" },
    }),
  );
  expect((await request()).status).toBe(503);
  expect(services.rpc).not.toHaveBeenCalled();
});
it("handles upstream network failures without leaking errors", async () => {
  services.fetch.mockRejectedValue(new Error("secret storage detail"));
  const r = await request();
  expect(r.status).toBe(503);
  expect(await r.text()).not.toContain("secret");
});

it("watch event accepts only an existing published YouTube resource", async () => {
  const params = { params: Promise.resolve({ id: "test" }) };
  services.resource.mockResolvedValue({
    source_kind: "external",
    external_url: "https://youtu.be/sO6VGgBHppo",
  });
  expect(
    (
      await POST(
        new Request("https://elzatona.tech", { method: "POST" }),
        params,
      )
    ).status,
  ).toBe(204);
  expect(services.rpc).toHaveBeenCalledWith("record_open", {
    p_resource: "test",
  });
  services.rpc.mockClear();
  services.resource.mockResolvedValue({
    source_kind: "external",
    external_url: "https://example.com",
  });
  expect(
    (
      await POST(
        new Request("https://elzatona.tech", { method: "POST" }),
        params,
      )
    ).status,
  ).toBe(404);
  expect(services.rpc).not.toHaveBeenCalled();
});
