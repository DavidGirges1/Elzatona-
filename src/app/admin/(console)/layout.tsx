import { requireAdmin } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/shell";
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
