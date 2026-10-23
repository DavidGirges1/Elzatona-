import { Shell } from "@/components/layout/shell";
import { currentUser, createClient } from "@/lib/supabase/server";
import { studentContext } from "@/lib/auth/session";
import { redirect } from "next/navigation";
export default async function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (user) {
    const context = await studentContext();
    if (!context?.active) redirect("/suspended");
    const { data: admin } = await (await createClient()).rpc("is_admin");
    if (!context.ready && !admin) redirect("/onboarding");
  }
  return <Shell>{children}</Shell>;
}
