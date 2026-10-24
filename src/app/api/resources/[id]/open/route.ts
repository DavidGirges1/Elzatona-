import { NextRequest, NextResponse } from "next/server";
import { publishedPdfUrl, pdfEnabled } from "@/lib/supabase/files";
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
  } else if (r.source_kind === "quiz") {
    const mode =
      _request.nextUrl.searchParams.get("mode") === "exam"
        ? "exam"
        : "practice";
    destination = new URL(
      `/courses/${r.course_slug}/resources/${id}/quiz?mode=${mode}`,
      _request.url,
    ).href;
  } else {
    if (!pdfEnabled())
      return new NextResponse("فتح الملفات مش متاح حاليًا", { status: 503 });
    const signed = await publishedPdfUrl(db, id);
    if (!signed)
      return new NextResponse("تعذر فتح الملف. جرّب تاني.", { status: 503 });
    destination = signed;
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
