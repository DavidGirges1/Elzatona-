import Link from "next/link";
import { BrandName } from "@/components/brand";
import { ArrowRight, ShieldCheck } from "lucide-react";
export function AuthFrame({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  return (
    <div className="auth-page">
      <header className="auth-header">
        <Link className="wordmark" href="/">
          <BrandName />
        </Link>
        <Link href="/" className="text-link">
          <ArrowRight size={16} />
          {admin ? "الصفحة الرئيسية" : "ارجع للتصفح"}
        </Link>
      </header>
      <main className="auth-content">{children}</main>
      <footer className="auth-footer">
        <ShieldCheck size={16} />
        {admin
          ? "وصول إداري محمي بالصلاحيات"
          : "حسابك آمن. بريدك الإلكتروني مش بيظهر للطلبة."}
        <Link href="/guidelines">الخصوصية والمشاركة</Link>
      </footer>
    </div>
  );
}
