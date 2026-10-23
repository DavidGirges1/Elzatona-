import Link from "next/link";
import {
  getCourses,
  getCourseRequirements,
  getFollowedIds,
  getResources,
} from "@/lib/data";
import { currentUser } from "@/lib/supabase/server";
import { studentContext } from "@/lib/auth/session";
import {
  filterAndRankCourses,
  parseProgram,
  programs,
} from "@/lib/course-catalog";
import {
  CourseTile,
  SearchBar,
  Empty,
  ResourceRow,
} from "@/components/content";
import { CoursePicker } from "@/components/course-picker";
export const metadata = { title: "اكتشف المواد" };
export default async function Courses({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    year?: string;
    program?: string;
    page?: string;
  }>;
}) {
  const s = await searchParams;
  const q = typeof s.q === "string" ? s.q.slice(0, 100) : "";
  const program = parseProgram(s.program);
  const year = /^([1-9]|1[0-2])$/.test(s.year || "")
    ? Number(s.year)
    : undefined;
  const user = await currentUser();
  const [all, context, ids, resources] = await Promise.all([
    getCourses(),
    user ? studentContext() : null,
    getFollowedIds(),
    q ? getResources({ q }) : [],
  ]);
  const requirements = await getCourseRequirements(all.map((c) => c.id));
  const courses = filterAndRankCourses(all, requirements, {
    q,
    year,
    program,
    studentYear: context?.academic_year,
  });
  const pages = Math.max(1, Math.ceil(courses.length / 20));
  const page = Math.min(pages, Math.max(1, Math.trunc(Number(s.page)) || 1));
  const shown = courses.slice((page - 1) * 20, page * 20);
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (year) query.set("year", String(year));
  if (program) query.set("program", program);
  const pageUrl = (n: number) => {
    const p = new URLSearchParams(query);
    p.set("page", String(n));
    return `/courses?${p}`;
  };
  const years = [
    ...new Set(all.flatMap((c) => (c.year_level ? [c.year_level] : []))),
  ].sort((a, b) => a - b);
  const availablePrograms = Object.entries(programs).filter(([key]) =>
    requirements.some((r) => r.scope === key),
  );
  return (
    <>
      <p className="eyebrow">ابدأ من مادتك</p>
      <h1>اكتشف المواد</h1>
      <p className="muted">
        {context?.ready
          ? `${context.university} · ${context.faculty} · المستوى ${new Intl.NumberFormat("ar-EG").format(context.academic_year!)}`
          : "اختار المادة، وهتلاقي مصادرها مترتبة حسب المحاضرة والموضوع."}
      </p>
      {context?.ready && (
        <p className="catalog-explainer">
          مواد سنتك بتظهر الأول. تقدر تضيف مواد من أي سنة، وتحدد كذا مادة
          وتضيفهم مع بعض.
        </p>
      )}
      <SearchBar
        value={q}
        placeholder="دوّر باسم المادة أو كودها، بالعربي أو بالإنجليزي"
      >
        <details className="catalog-filters" open={Boolean(year || program)}>
          <summary>
            السنة والتخصص{year || program ? " · فلتر مفعّل" : ""}
          </summary>
          <div className="filters">
            <label>
              السنة الدراسية
              <select name="year" defaultValue={year || ""}>
                <option value="">
                  كل السنين{context?.ready ? " · سنتك الأول" : ""}
                </option>
                {years.map((y) => (
                  <option key={y} value={y}>
                    المستوى {new Intl.NumberFormat("ar-EG").format(y)}
                  </option>
                ))}
              </select>
            </label>
            {availablePrograms.length > 0 && (
              <label>
                التخصص (اختياري)
                <select name="program" defaultValue={program || ""}>
                  <option value="">كل التخصصات</option>
                  {availablePrograms.map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button type="submit" className="button secondary">
              اعرض المواد
            </button>
          </div>
        </details>
      </SearchBar>
      <div className="section-head">
        <h2>{q ? "المواد المطابقة" : "المواد المتاحة"}</h2>
        <span className="muted">
          {new Intl.NumberFormat("ar-EG").format(courses.length)} مادة
        </span>
      </div>
      {shown.length ? (
        user && context?.ready ? (
          <CoursePicker
            key={pageUrl(page)}
            courses={shown}
            requirements={requirements.filter((r) =>
              shown.some((c) => c.id === r.course_id),
            )}
            followedIds={ids}
            next={pageUrl(page)}
            program={program}
            studentYear={context.academic_year}
          />
        ) : (
          <div className="course-grid">
            {shown.map((c) => (
              <CourseTile key={c.id} course={c} />
            ))}
          </div>
        )
      ) : (
        <Empty
          title={
            q || year || program
              ? "مفيش مواد مطابقة للاختيارات دي"
              : "لسه مفيش مواد متاحة"
          }
        >
          <p>جرّب كود المادة، أو غيّر السنة والتخصص.</p>
          <Link
            href={user && !context?.ready ? "/onboarding" : "/courses"}
            className="text-link"
          >
            {user && !context?.ready
              ? "كمّل بياناتك الدراسية"
              : "اعرض كل المواد"}
          </Link>
        </Empty>
      )}
      {pages > 1 && (
        <nav className="actions catalog-pagination" aria-label="صفحات المواد">
          {page > 1 && (
            <Link className="button secondary" href={pageUrl(page - 1)}>
              الصفحة السابقة
            </Link>
          )}
          <span className="muted">
            صفحة {new Intl.NumberFormat("ar-EG").format(page)} من{" "}
            {new Intl.NumberFormat("ar-EG").format(pages)}
          </span>
          {page < pages && (
            <Link className="button secondary" href={pageUrl(page + 1)}>
              الصفحة التالية
            </Link>
          )}
        </nav>
      )}
      {q && (
        <>
          <div className="section-head">
            <h2>المصادر المطابقة</h2>
          </div>
          {resources.length ? (
            <div className="resource-list">
              {resources.map((r) => (
                <ResourceRow key={r.id} resource={r} slug={r.course_slug} />
              ))}
            </div>
          ) : (
            <Empty title="مفيش مصادر مطابقة للبحث" />
          )}
        </>
      )}
    </>
  );
}
