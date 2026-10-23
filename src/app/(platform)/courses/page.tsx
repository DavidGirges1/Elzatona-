import { getCourses, getResources } from "@/lib/data";
import {
  CourseTile,
  SearchBar,
  Empty,
  ResourceRow,
} from "@/components/content";
export const metadata = { title: "اكتشف المواد" };
export default async function Courses({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const [courses, resources] = await Promise.all([
    getCourses(q),
    q ? getResources({ q }) : Promise.resolve([]),
  ]);
  return (
    <>
      <p className="eyebrow">ابدأ من مادتك</p>
      <h1>اكتشف المواد</h1>
      <p className="muted">
        اختار المادة، وهتلاقي مصادرها مترتبة حسب المحاضرة والموضوع.
      </p>
      <SearchBar value={q} />
      <div className="section-head">
        <h2>{q ? "المواد المطابقة" : "المواد المتاحة"}</h2>
      </div>
      {courses.length ? (
        <div className="course-grid">
          {courses.map((c) => (
            <CourseTile key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <Empty title={q ? "مفيش مواد بالاسم ده" : "لسه مفيش مواد متاحة"}>
          <p>جرّب اسم المادة بالعربي أو بالإنجليزي.</p>
        </Empty>
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
