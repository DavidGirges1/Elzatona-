import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { storageAdmin } from "./admin";
export const pdfEnabled = () =>
  Boolean(
    process.env.SUPABASE_STORAGE_FUNCTION || process.env.SUPABASE_SECRET_KEY,
  );
export async function finalizePdf(
  db: SupabaseClient<Database>,
  id: string,
  author: string,
) {
  if (process.env.SUPABASE_STORAGE_FUNCTION) {
    const { data, error } = await db.functions.invoke(
      process.env.SUPABASE_STORAGE_FUNCTION,
      { body: { action: "finalize", resource_id: id } },
    );
    return !error && (data?.complete === true || data?.published === true);
  }
  const { error } = await storageAdmin().rpc("finalize_pdf_checked", {
    p_resource: id,
    p_author: author,
  });
  return !error;
}
export async function publishedPdfUrl(
  db: SupabaseClient<Database>,
  id: string,
) {
  if (process.env.SUPABASE_STORAGE_FUNCTION) {
    const { data, error } = await db.functions.invoke(
      process.env.SUPABASE_STORAGE_FUNCTION,
      { body: { action: "open", resource_id: id } },
    );
    if (error || typeof data?.url !== "string") return null;
    const url = new URL(data.url);
    if (
      url.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin ||
      !url.pathname.startsWith("/storage/v1/object/sign/course-pdfs/")
    )
      return null;
    return url.href;
  }
  const admin = storageAdmin();
  const { data: r } = await admin
    .from("resources")
    .select("storage_path")
    .eq("id", id)
    .eq("status", "published")
    .single();
  if (!r?.storage_path) return null;
  const { data, error } = await admin.storage
    .from("course-pdfs")
    .createSignedUrl(r.storage_path, 60, { download: true });
  return error ? null : data?.signedUrl || null;
}
