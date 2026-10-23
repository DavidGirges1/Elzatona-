import Link from "next/link";
import { currentUser } from "@/lib/supabase/server";
import { afterStudentLogin } from "@/lib/auth/session";
import { cookies } from "next/headers";
import { MailCheck, ArrowLeft, Inbox, ShieldCheck } from "lucide-react";
import { AuthFrame } from "@/components/auth/frame";
import { pendingEmailCookie } from "@/lib/auth/pending-verification";
import { emailSchema } from "@/lib/auth/validation";
export const metadata = { title: "أكد بريدك الإلكتروني" };
export default async function VerifyEmail() {
  if (await currentUser()) await afterStudentLogin("/dashboard");
  const pending = emailSchema.safeParse(
    (await cookies()).get(pendingEmailCookie)?.value,
  );
  return (
    <AuthFrame>
      <section className="auth-card verification-card">
        <div className="verification-icon" aria-hidden="true">
          <MailCheck size={38} strokeWidth={1.6} />
          <span>
            <ShieldCheck size={17} />
          </span>
        </div>
        <p className="eyebrow">فاضل خطوة ونبدأ</p>
        <h1>
          بصّة على بريدك،
          <br />
          ونكمّل سوا.
        </h1>
        <p className="muted">
          افتح رسالة تأكيد الحساب واضغط على اللينك اللي فيها. بعدها هنكمّل
          اختيار جامعتك وكليتك وسنتك.
        </p>
        {pending.success && (
          <div className="verification-address">
            <span>البريد اللي سجلت بيه</span>
            <bdi dir="ltr">{pending.data}</bdi>
          </div>
        )}
        <div className="verification-help">
          <Inbox size={20} />
          <div>
            <h2>الرسالة لسه مش ظاهرة؟</h2>
            <p>
              استنى دقايق بسيطة، وراجع الرسائل غير المرغوب فيها{" "}
              <bdi dir="ltr">Spam</bdi>. واتأكد إنك كتبت بريدك صح.
            </p>
          </div>
        </div>
        <Link className="button primary auth-submit" href="/login">
          أكدت بريدي · تسجيل الدخول <ArrowLeft size={18} />
        </Link>
        <Link href="/signup" className="text-link">
          كتبت البريد غلط؟ ارجع للتسجيل
        </Link>
        <p className="verification-footnote muted">
          تأكيد البريد بيحافظ على أمان حسابك. تقدر تتصفح المصادر العامة لحد ما
          تكمّل.
        </p>
      </section>
    </AuthFrame>
  );
}
