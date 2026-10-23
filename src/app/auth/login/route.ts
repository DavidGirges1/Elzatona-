import { appPath } from "@/lib/paths";
import { NextRequest, NextResponse } from "next/server";
import { createClient, configured } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
import { googleEnabled } from "@/lib/supabase/providers";
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!configured())
    return NextResponse.redirect(new URL(appPath("/login"), origin));
  if (!(await googleEnabled()))
    return NextResponse.redirect(
      new URL(
        appPath(`/login?error=provider&next=${encodeURIComponent(next)}`),
        origin,
      ),
    );
  const db = await createClient();
  const { data, error } = await db.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}${appPath("/auth/callback")}?next=${encodeURIComponent(next)}`,
    },
  });
  if (error || !data.url)
    return NextResponse.redirect(
      new URL(
        appPath(`/login?error=oauth&next=${encodeURIComponent(next)}`),
        origin,
      ),
    );
  return NextResponse.redirect(data.url);
}
