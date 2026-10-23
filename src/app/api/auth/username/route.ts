import { NextRequest, NextResponse } from "next/server";
import { configured, createClient } from "@/lib/supabase/server";
import { usernameSchema } from "@/lib/auth/validation";
export async function GET(request: NextRequest) {
  const username = usernameSchema.safeParse(
    request.nextUrl.searchParams.get("username"),
  );
  if (!configured() || !username.success)
    return NextResponse.json(
      { available: false },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  const { data, error } = await (
    await createClient()
  ).rpc("username_available", { p_username: username.data });
  return NextResponse.json(
    { available: !error && data === true },
    { status: error ? 503 : 200, headers: { "Cache-Control": "no-store" } },
  );
}
