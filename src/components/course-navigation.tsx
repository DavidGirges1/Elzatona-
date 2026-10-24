import Link from "next/link";
export function CourseNavigation({
  slug,
  active = "content",
}: {
  slug: string;
  active?: "content" | "discussions";
}) {
  const path = `/courses/${slug}`;
  return (
    <nav className="tabs" aria-label="أقسام المادة">
      <Link
        href={path}
        aria-current={active === "content" ? "page" : undefined}
      >
        المحتوى
      </Link>
      <Link
        href={`${path}?tab=discussions`}
        aria-current={active === "discussions" ? "page" : undefined}
      >
        النقاشات
      </Link>
    </nav>
  );
}
