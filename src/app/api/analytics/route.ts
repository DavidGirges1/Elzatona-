import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, configured } from "@/lib/supabase/server";
const schema = z.object({
  id: z.uuid(),
  visitor: z.uuid(),
  page: z.enum([
    "landing",
    "dashboard",
    "courses",
    "course",
    "resource",
    "contribute",
    "onboarding",
    "profile",
    "other",
  ]),
});
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.NEXT_PUBLIC_APP_URL || request.url)
    .origin;
  if (
    !origin ||
    origin !== expected ||
    Number(request.headers.get("content-length") || 0) > 1024
  )
    return new NextResponse(null, { status: 403 });
  try {
    const text = await request.text();
    if (text.length > 1024) return new NextResponse(null, { status: 413 });
    const input = schema.safeParse(JSON.parse(text));
    if (!input.success || !configured())
      return new NextResponse(null, { status: 400 });
    const { error } = await (
      await createClient()
    ).rpc("track_page_view", {
      p_id: input.data.id,
      p_visitor: input.data.visitor,
      p_page: input.data.page,
    });
    return new NextResponse(null, {
      status: error ? 503 : 204,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return new NextResponse(null, { status: 400 });
  }
}
