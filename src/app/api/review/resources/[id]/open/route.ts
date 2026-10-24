import { NextResponse } from "next/server";
import { createClient, currentUser } from "@/lib/supabase/server";
import { idSchema, normalizeUrl } from "@/lib/validation";
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await currentUser();
  if (!user) return new NextResponse("سجّل دخولك", { status: 401 });
  const { id } = await params;
  if (!idSchema.safeParse(id).success)
    return new NextResponse("غير متاح", { status: 404 });
  const db = await createClient();
  const active = await db.rpc("account_active");
  if (active.error || !active.data)
    return new NextResponse("غير متاح", { status: 403 });
  const [permission, resource] = await Promise.all([
    db.rpc("can_review_material", { p_resource: id }),
    db
      .from("resources")
      .select("author_id,status,source_kind,external_url,file_verified_at")
      .eq("id", id)
      .maybeSingle(),
  ]);
  if (
    resource.error ||
    !resource.data ||
    (!permission.data &&
      !(
        resource.data.author_id === user.id &&
        resource.data.status === "pending"
      ))
  )
    return new NextResponse("غير متاح", { status: 403 });
  const r = resource.data;
  let destination: string;
  if (r.source_kind === "external") {
    try {
      destination = normalizeUrl(r.external_url || "");
    } catch {
      return new NextResponse("لينك غير صالح", { status: 400 });
    }
  } else if (r.source_kind === "pdf" && r.file_verified_at) {
    const f = await db.functions.invoke(
      process.env.SUPABASE_STORAGE_FUNCTION || "resource-files",
      { body: { action: "review", resource_id: id } },
    );
    if (f.error || typeof f.data?.url !== "string")
      return new NextResponse("الملف مش متاح. جرّب تاني.", { status: 503 });
    const url = new URL(f.data.url);
    if (
      url.origin !== new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).origin ||
      !url.pathname.startsWith("/storage/v1/object/sign/course-pdfs/")
    )
      return new NextResponse("غير متاح", { status: 503 });
    destination = url.href;
  } else return new NextResponse("غير متاح", { status: 404 });
  return NextResponse.redirect(new URL(destination, request.url), {
    status: 302,
    headers: {
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Robots-Tag": "noindex",
    },
  });
}
