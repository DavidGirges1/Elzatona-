import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/frame";
import { LoginForm } from "@/components/auth/forms";
import { currentUser, createClient } from "@/lib/supabase/server";
import { ShieldCheck } from "lucide-react";
export const metadata = { title: "دخول الإدارة" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) {
    const { data } = await (await createClient()).rpc("is_admin");
    if (data) redirect("/admin");
  }
  const s = await searchParams;
  return (
    <AuthFrame admin>
      <section className="auth-card admin-login-card">
        <ShieldCheck size={32} />
        <p className="eyebrow">وصول مخصص لفريق الإدارة</p>
        <h1>إدارة الزتونة.</h1>
        <p className="muted">ادخل باسم المستخدم الإداري وكلمة المرور.</p>
        {s.error && (
          <p className="form-error" role="alert">
            الحساب غير مخوّل للوصول إلى الإدارة.
          </p>
        )}
        <LoginForm admin />
      </section>
    </AuthFrame>
  );
}
