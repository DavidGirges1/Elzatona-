import Link from "next/link";
import { BrandName } from "@/components/brand";
import {
  LayoutDashboard,
  Building2,
  GraduationCap,
  Users,
  BookOpen,
  Files,
  Flag,
  History,
  LogOut,
  ArrowUpLeft,
  Star,
} from "lucide-react";
import { signOut } from "@/lib/actions";
const links = [
  ["/admin", "نظرة عامة", LayoutDashboard],
  ["/admin/universities", "الجامعات", Building2],
  ["/admin/faculties", "الكليات والسنين", GraduationCap],
  ["/admin/users", "الطلبة", Users],
  ["/admin/courses", "المواد", BookOpen],
  ["/admin/resources", "المصادر", Files],
  ["/admin/reports", "البلاغات", Flag],
  ["/admin/highlights", "اختيارات المواد", Star],
  ["/admin/audit", "سجل الإدارة", History],
] as const;
export function AdminShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <Link href="/admin" className="wordmark">
          <BrandName />
        </Link>
        <span className="admin-tag">مساحة الإدارة</span>
        <nav aria-label="إدارة المنصة">
          {links.map(([href, label, Icon]) => (
            <Link href={href} key={href}>
              <Icon size={19} />
              {label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <Link href="/" className="text-link">
            <ArrowUpLeft size={18} />
            افتح المنصة
          </Link>
          <form action={signOut}>
            <button className="button ghost">
              <LogOut size={17} />
              خروج
            </button>
          </form>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <span>
            <span className="status-dot" />
            بيانات فعلية من المنصة
          </span>
          <b>لوحة التحكم</b>
        </header>
        <main id="content" className="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}
export function AdminHeading({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="admin-heading">
      <div>
        <p className="eyebrow">إدارة الزتونة</p>
        <h1>{title}</h1>
        {description && <p className="muted">{description}</p>}
      </div>
      {children}
    </header>
  );
}
export function SavedNotice({ value }: { value?: string }) {
  return value ? (
    <p className="notice" role="status">
      اتحفظت التغييرات.
    </p>
  ) : null;
}
export function Pager({
  page,
  total,
  path,
  query = "",
}: {
  page: number;
  total: number;
  path: string;
  query?: string;
}) {
  return (
    <nav className="pagination" aria-label="صفحات النتائج">
      {page > 1 && (
        <Link
          className="button secondary"
          href={`${path}?${query}&page=${page - 1}`}
        >
          السابق
        </Link>
      )}
      <span>
        صفحة {page} · {total} نتيجة
      </span>
      {page * 25 < total && (
        <Link
          className="button secondary"
          href={`${path}?${query}&page=${page + 1}`}
        >
          التالي
        </Link>
      )}
    </nav>
  );
}
