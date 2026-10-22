import { NextRequest, NextResponse } from "next/server";
import { createClient, configured } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  if (code && configured()) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }
  return NextResponse.redirect(
    new URL(`/login?error=callback&next=${encodeURIComponent(next)}`, origin),
  );
}
