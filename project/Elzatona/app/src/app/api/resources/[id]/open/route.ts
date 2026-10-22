import { NextRequest, NextResponse } from "next/server";
import { createClient as serviceClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getResource } from "@/lib/data";
import { normalizeUrl } from "@/lib/validation";
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const r = await getResource(id);
  if (!r) return new NextResponse("المصدر مش متاح", { status: 404 });
  const db = await createClient();
  let destination: string;
  if (r.source_kind === "external") {
    try {
      destination = normalizeUrl(r.external_url || "");
    } catch {
      return new NextResponse("اللينك غير صالح", { status: 400 });
    }
  } else {
    if (!process.env.SUPABASE_SECRET_KEY)
      return new NextResponse("فتح الملفات مش متاح حاليًا", { status: 503 });
    const admin = serviceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    // Check visibility again immediately before signing. No user-supplied storage path is accepted.
    const { data: record } = await admin
      .from("resources")
      .select("storage_path,status")
      .eq("id", id)
      .eq("status", "published")
      .single();
    if (!record?.storage_path)
      return new NextResponse("المصدر مش متاح", { status: 404 });
    const { data, error } = await admin.storage
      .from("course-pdfs")
      .createSignedUrl(record.storage_path, 60, { download: true });
    if (error || !data)
      return new NextResponse("تعذر فتح الملف. جرّب تاني.", { status: 503 });
    destination = data.signedUrl;
  }
  await db.rpc("record_open", { p_resource: id });
  return NextResponse.redirect(destination, {
    status: 302,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
