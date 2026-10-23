import Link from "next/link";
import { House, Search, Bookmark, UserRound, ArrowUpLeft } from "lucide-react";
import { ar } from "@/i18n/ar-EG";
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell">
      <a href="#content" className="skip">
        انتقل للمحتوى
      </a>
      <aside className="rail">
        <Link href="/" className="brand-symbol" aria-label={ar.brand}>
          ز
        </Link>
        <nav aria-label="التنقل الرئيسي">
          <Link href="/">
            <House />
            <span>{ar.home}</span>
          </Link>
          <Link href="/courses">
            <Search />
            <span>اكتشف</span>
          </Link>
          <Link href="/saved">
            <Bookmark />
            <span>{ar.saved}</span>
          </Link>
        </nav>
        <Link href="/profile" className="account">
          <UserRound />
          <span>حسابي</span>
        </Link>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <Link href="/" className="wordmark">
            {ar.brand}
          </Link>
          <span className="top-caption">من الطلبة، للطلبة</span>
          <nav className="mobile-links" aria-label="التنقل السريع">
            <Link href="/courses" aria-label="اكتشف المواد">
              <Search size={20} />
            </Link>
            <Link href="/saved" aria-label="المحفوظات">
              <Bookmark size={20} />
            </Link>
          </nav>
          <Link className="account-link" href="/profile">
            <UserRound size={19} />
            <span>حسابي</span>
          </Link>
        </header>
        <main id="content">{children}</main>
        <footer>
          <span>الزتونة · المعرفة بتكمل بالمشاركة</span>
          <Link href="/guidelines">
            المشاركة والخصوصية <ArrowUpLeft size={14} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
