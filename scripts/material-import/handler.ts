/** Operator-only, expiring, exact-file import capability; never a general upload API. */
export type Entry = {
  sha256: string;
  size: number;
  courseId: string;
  topicId: string | null;
};
export type ImportConfig = {
  ownerId: string;
  capabilityHash: string;
  expiresAt: number;
  files: Record<string, Entry>;
};
export type ImportRecord = {
  id: string;
  author_id: string;
  course_id: string;
  topic_id: string | null;
  source_kind: string;
  storage_path: string | null;
  status: string;
  review_state: string;
  file_verified_at: string | null;
  course_active: boolean;
};
export type ImportServices = {
  readyOwner(): Promise<boolean>;
  resource(id: string): Promise<ImportRecord | null>;
  upload(path: string, bytes: Uint8Array): Promise<boolean>;
  download(path: string): Promise<Uint8Array | null>;
  finalize(id: string): Promise<boolean>;
};
export async function digest(bytes: BufferSource) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("");
}
const reply = (status: number, body: Record<string, unknown>) =>
  Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
export function importHandler(
  config: ImportConfig,
  services: ImportServices,
  now = Date.now,
) {
  return async (request: Request) => {
    try {
      if (request.method !== "PUT") return reply(405, { error: "method" });
      if (now() >= config.expiresAt) return reply(410, { error: "expired" });
      const token = request.headers.get("x-import-capability") || "";
      if (
        !token ||
        token.length > 256 ||
        (await digest(new TextEncoder().encode(token))) !==
          config.capabilityHash
      )
        return reply(401, { error: "unauthorized" });
      const id = new URL(request.url).searchParams.get("id") || "";
      const entry = Object.hasOwn(config.files, id) ? config.files[id] : null;
      if (!entry) return reply(404, { error: "not_in_batch" });
      if (
        request.headers.get("content-type")?.split(";")[0] !==
          "application/pdf" ||
        Number(request.headers.get("content-length")) !== entry.size ||
        entry.size > 3145728
      )
        return reply(422, { error: "file_metadata" });
      const bytes = new Uint8Array(await request.arrayBuffer());
      if (
        bytes.length !== entry.size ||
        new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-" ||
        (await digest(bytes)) !== entry.sha256
      )
        return reply(422, { error: "file_bytes" });
      if (!(await services.readyOwner()))
        return reply(403, { error: "owner_not_ready" });
      const path = `${config.ownerId}/${id}.pdf`,
        resource = await services.resource(id);
      if (
        !resource ||
        resource.author_id !== config.ownerId ||
        resource.course_id !== entry.courseId ||
        resource.topic_id !== entry.topicId ||
        resource.source_kind !== "pdf" ||
        resource.storage_path !== path ||
        !resource.course_active
      )
        return reply(403, { error: "resource_scope" });
      if (
        resource.status === "published" &&
        resource.review_state === "approved" &&
        resource.file_verified_at
      )
        return reply(200, { complete: true, id, alreadyImported: true });
      if (
        resource.status !== "pending" ||
        resource.review_state !== "draft" ||
        resource.file_verified_at
      )
        return reply(409, { error: "resource_state" });
      if (!(await services.upload(path, bytes))) {
        const existing = await services.download(path);
        if (
          !existing ||
          existing.length !== entry.size ||
          (await digest(existing as Uint8Array<ArrayBuffer>)) !== entry.sha256
        )
          return reply(409, { error: "upload_conflict" });
      }
      if (!(await services.finalize(id)))
        return reply(409, { error: "finalization_failed" });
      const updated = await services.resource(id);
      if (
        updated?.status !== "published" ||
        updated.review_state !== "approved" ||
        !updated.file_verified_at
      )
        return reply(409, { error: "not_published" });
      return reply(200, { complete: true, id, alreadyImported: false });
    } catch {
      return reply(503, { error: "import_unavailable" });
    }
  };
}
