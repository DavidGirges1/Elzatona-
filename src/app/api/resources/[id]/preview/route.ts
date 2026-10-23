import { youtubeVideo } from "@/lib/material-preview";
import { NextResponse } from "next/server";
import { getResource } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { pdfEnabled, publishedPdfUrl } from "@/lib/supabase/files";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resource = await getResource(id);
  // getResource only returns published resources in active courses/universities.
  if (!resource || resource.source_kind !== "pdf")
    return new NextResponse("الملف مش متاح", { status: 404 });
  if (!pdfEnabled())
    return new NextResponse("المعاينة مش متاحة حاليًا", { status: 503 });
  const db = await createClient();
  const signed = await publishedPdfUrl(db, id);
  if (!signed) return new NextResponse("تعذر فتح الملف", { status: 503 });
  try {
    // Only the verified signed private-bucket URL is fetched, never a submitted external URL.
    const response = await fetch(signed, {
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(20000),
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("application/pdf")
    )
      return new NextResponse("تعذر تحميل المعاينة", { status: 503 });
    await db.rpc("record_open", { p_resource: id });
    return new NextResponse(response.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch {
    return new NextResponse("تعذر تحميل المعاينة. جرّب تاني.", { status: 503 });
  }
}

// Record the explicit watch action, never a preloaded or merely viewed card.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const resource = await getResource(id);
  if (
    !resource ||
    resource.source_kind !== "external" ||
    !youtubeVideo(resource.external_url)
  )
    return new NextResponse(null, {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  const db = await createClient();
  await db.rpc("record_open", { p_resource: id });
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
