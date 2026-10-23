import { AuthFrame } from "@/components/auth/frame";
import { signOut } from "@/lib/actions";
export const metadata = { title: "الحساب متوقف" };
export default function Page() {
  return (
    <AuthFrame>
      <section className="auth-card">
        <h1>الحساب متوقف مؤقتًا.</h1>
        <p className="muted">
          مشاركات الحساب متوقفة بقرار من الإدارة. راجع القائمين على تجربة
          الزتونة للمساعدة.
        </p>
        <form action={signOut}>
          <button className="button primary">تسجيل الخروج</button>
        </form>
      </section>
    </AuthFrame>
  );
}
