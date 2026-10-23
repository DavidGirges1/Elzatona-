import Link from "next/link";
import { AuthFrame } from "@/components/auth/frame";
import { LoginForm, GoogleOption } from "@/components/auth/forms";
import { googleEnabled } from "@/lib/supabase/providers";
import { currentUser } from "@/lib/supabase/server";
import { afterStudentLogin } from "@/lib/auth/session";
import { safeNext } from "@/lib/validation";
export const metadata = { title: "تسجيل الدخول" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; changed?: string }>;
}) {
  const s = await searchParams;
  const next = safeNext(s.next || "/dashboard");
  if (await currentUser()) await afterStudentLogin(next);
  return (
    <AuthFrame>
      <section className="auth-card">
        <p className="eyebrow">رجعت، ونورت الزتونة</p>
        <h1>أهلًا بيك من تاني.</h1>
        <p className="muted">موادك ومصادرك، مستنيينك.</p>
        {s.error && (
          <p className="form-error" role="alert">
            لينك الدخول ماكملش أو انتهت صلاحيته. جرّب تسجيل الدخول.
          </p>
        )}
        {s.changed && (
          <p className="notice" role="status">
            كلمة المرور اتغيرت. سجّل دخولك بالكلمة الجديدة.
          </p>
        )}
        <LoginForm next={next} />
        <GoogleOption available={await googleEnabled()} next={next} />
        <p className="auth-switch">
          لسه جديد؟{" "}
          <Link href="/signup" className="text-link">
            اعمل حسابك
          </Link>
        </p>
      </section>
    </AuthFrame>
  );
}
