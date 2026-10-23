import Link from "next/link";
import { AuthFrame } from "@/components/auth/frame";
import { SignupForm, GoogleOption } from "@/components/auth/forms";
import { googleEnabled } from "@/lib/supabase/providers";
import { currentUser } from "@/lib/supabase/server";
import { afterStudentLogin } from "@/lib/auth/session";
export const metadata = { title: "حساب جديد" };
export default async function Page() {
  if (await currentUser()) await afterStudentLogin("/dashboard");
  return (
    <AuthFrame>
      <section className="auth-card">
        <p className="eyebrow">من الطلبة، للطلبة</p>
        <h1>مكانك وسط دفعتك.</h1>
        <p className="muted">اعمل حسابك، وبعدها اختار جامعتك وكليتك.</p>
        <SignupForm />
        <GoogleOption available={await googleEnabled()} next="/onboarding" />
        <p className="auth-switch">
          عندك حساب؟{" "}
          <Link className="text-link" href="/login">
            سجّل دخولك
          </Link>
        </p>
      </section>
    </AuthFrame>
  );
}
