import Link from "next/link";
import { configured, currentUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
import { redirect } from "next/navigation";
export const metadata = { title: "دخول" };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; intent?: string; error?: string }>;
}) {
  const s = await searchParams;
  const next = safeNext(s.next);
  if (await currentUser()) redirect(next);
  const reasons: Record<string, string> = {
    save: "سجّل دخولك عشان تحفظ المصدر",
    vote: "سجّل دخولك عشان تصوّت",
    follow: "سجّل دخولك عشان تختار موادك",
  };
  return (
    <section className="panel login-card">
      <p className="eyebrow">أهلًا بيك في الزتونة</p>
      <h1>{reasons[s.intent || ""] || "سجّل دخولك وشارك دفعتك"}</h1>
      <p className="muted">
        مصادر المواد مفتوحة للجميع. الدخول مطلوب للمشاركة والحفظ، وبعده هترجع
        لنفس الصفحة.
      </p>
      {s.error && (
        <p className="form-error">الدخول ماكملش. جرّب تاني أو ارجع للمادة.</p>
      )}
      {configured() ? (
        <a
          className="button primary"
          href={`/auth/login?next=${encodeURIComponent(next)}`}
        >
          كمّل بحساب Google
        </a>
      ) : (
        <p className="notice">
          تسجيل الدخول لسه مش متاح. تقدر تتصفح أي مصادر منشورة من غير حساب.
        </p>
      )}
      <p style={{ marginTop: 20 }}>
        <Link href={next} className="text-link">
          ارجع للتصفح
        </Link>
      </p>
      <p className="muted">
        اسمك هيظهر مع مشاركاتك. بريدك الإلكتروني مش بيظهر للطلبة.
      </p>
    </section>
  );
}
