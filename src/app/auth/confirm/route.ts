import { NextRequest, NextResponse } from "next/server";
import { createClient, configured } from "@/lib/supabase/server";
import { appPath } from "@/lib/paths";
export async function GET(request: NextRequest) {
  const token_hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  if (
    configured() &&
    token_hash &&
    ["email", "signup", "recovery"].includes(type || "")
  ) {
    const { error } = await (
      await createClient()
    ).auth.verifyOtp({
      token_hash,
      type: type as "email" | "signup" | "recovery",
    });
    if (!error)
      return NextResponse.redirect(
        new URL(
          appPath(type === "recovery" ? "/reset-password" : "/onboarding"),
          origin,
        ),
      );
  }
  return NextResponse.redirect(
    new URL(appPath("/login?error=confirmation"), origin),
  );
}
