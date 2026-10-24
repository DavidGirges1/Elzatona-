import { NextResponse } from "next/server";
import { currentUser, createClient } from "@/lib/supabase/server";
import { idSchema, normalizeUrl } from "@/lib/validation";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user)
    return NextResponse.json({ error: "sign_in_required" }, { status: 401 });
  const db = await createClient();
  const allowed = await db.rpc("is_admin");
  if (allowed.error || !allowed.data)
    return NextResponse.json({ error: "not_authorized" }, { status: 403 });
  const { id } = await params;
  if (!idSchema.safeParse(id).success)
    return new NextResponse("المصدر مش متاح", { status: 404 });
  const r = await db
    .from("resources")
    .select("source_kind,external_url,course_id")
    .eq("id", id)
    .maybeSingle();
  if (r.error || !r.data)
    return new NextResponse("المصدر مش متاح", { status: 404 });
  let destination: string;
  if (r.data.source_kind === "external") {
    try {
      destination = normalizeUrl(r.data.external_url || "");
    } catch {
      return new NextResponse("لينك غير صالح", { status: 400 });
    }
  } else if (r.data.source_kind === "quiz") {
    const course = await db
      .from("courses")
      .select("slug")
      .eq("id", r.data.course_id)
      .single();
    if (!course.data)
      return new NextResponse("المادة مش متاحة", { status: 404 });
    destination = new URL(
      `/courses/${course.data.slug}/resources/${id}/quiz/edit`,
      _request.url,
    ).href;
  } else {
    const f = await db.functions.invoke(
      process.env.SUPABASE_STORAGE_FUNCTION || "resource-files",
      { body: { action: "review", resource_id: id } },
    );
    if (f.error || typeof f.data?.url !== "string")
      return new NextResponse(
        "الملف مش متاح للمراجعة. ممكن الرفع لسه ماكملش.",
        { status: 503 },
      );
    const url = new URL(f.data.url);
    if (
      url.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin ||
      !url.pathname.startsWith("/storage/v1/object/sign/course-pdfs/")
    )
      return new NextResponse("الملف مش متاح", { status: 503 });
    destination = url.href;
  }
  return NextResponse.redirect(destination, {
    status: 302,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex",
    },
  });
}
