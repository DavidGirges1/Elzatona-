import Link from "next/link";
import { AuthFrame } from "@/components/auth/frame";
import { RecoveryForm } from "@/components/auth/forms";
import { currentUser } from "@/lib/supabase/server";
export const metadata = { title: "كلمة مرور جديدة" };
export default async function Page() {
  return (
    <AuthFrame>
      <section className="auth-card">
        <h1>كلمة مرور جديدة.</h1>
        {(await currentUser()) ? (
          <>
            <p className="muted">
              اختار كلمة قوية ومختلفة. هنطلب منك تدخل بيها من جديد.
            </p>
            <RecoveryForm reset />
          </>
        ) : (
          <>
            <p className="notice">
              افتح لينك الاستعادة اللي وصلك في بريدك الأول. لو انتهى، اطلب واحد
              جديد.
            </p>
            <Link className="button primary" href="/forgot-password">
              اطلب لينك استعادة
            </Link>
          </>
        )}
      </section>
    </AuthFrame>
  );
}
