import { NextRequest, NextResponse } from "next/server";
import { createClient, configured } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!configured()) return NextResponse.redirect(new URL("/login", origin));
  const db = await createClient();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url)
    return NextResponse.redirect(
      new URL(`/login?error=oauth&next=${encodeURIComponent(next)}`, origin),
    );
  return NextResponse.redirect(data.url);
}
