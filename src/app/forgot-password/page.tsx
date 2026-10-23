import Link from "next/link";
import { AuthFrame } from "@/components/auth/frame";
import { RecoveryForm } from "@/components/auth/forms";
export const metadata = { title: "استعادة كلمة المرور" };
export default function Page() {
  return (
    <AuthFrame>
      <section className="auth-card">
        <p className="eyebrow">ولا يهمك</p>
        <h1>نرجّعك لحسابك.</h1>
        <p className="muted">اكتب البريد اللي سجّلت بيه، وهنبعتلك لينك آمن.</p>
        <RecoveryForm />
        <Link className="text-link" href="/login">
          ارجع لتسجيل الدخول
        </Link>
      </section>
    </AuthFrame>
  );
}
