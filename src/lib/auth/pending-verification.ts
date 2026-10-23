import "server-only";
import { cookies } from "next/headers";
import { appPath } from "@/lib/paths";
export const pendingEmailCookie = "ez-pending-email";
export async function rememberPendingEmail(email: string) {
  const store = await cookies();
  store.set(pendingEmailCookie, email, {
    httpOnly: true,
    secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://") === true,
    sameSite: "lax",
    path: appPath("/"),
    maxAge: 3600,
  });
}
