import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse, getResources, type Resource } from "@/lib/data";
import { materialAccess } from "@/lib/material-access";
import { ResourceRow, Empty } from "@/components/content";
import { areaLabels, type MaterialArea } from "@/lib/placement";
export async function CourseArea({
  slug,
  area,
  page = 1,
}: {
  slug: string;
  area: Exclude<MaterialArea, "lecture">;
  page?: number;
}) {
  const c = await getCourse(slug);
  if (!c) notFound();
  const path = `/courses/${slug}`;
  const [resources, access] = await Promise.all([
    getResources({ courseId: c.id, area, page }),
    materialAccess(c.id),
  ]);
  const groups: { title: string; rows: Resource[] }[] =
    area === "revision"
      ? [
          {
            title: "ملخصات وشروحات شاملة",
            rows: resources.filter(
              (r) => !["past_exam", "sheets", "question_bank"].includes(r.type),
            ),
          },
          {
            title: "بنوك أسئلة وشيتات",
            rows: resources.filter((r) =>
              ["sheets", "question_bank"].includes(r.type),
            ),
          },
          {
            title: "امتحانات سابقة",
            rows: resources.filter((r) => r.type === "past_exam"),
          },
        ]
      : [{ title: areaLabels[area], rows: resources }];
  return (
    <>
      <Link className="breadcrumb" href={path}>
        <bdi>{c.title_ar || c.title}</bdi> / المحتوى
      </Link>
      <div className="section-head">
        <h1>{areaLabels[area]}</h1>
        {access.can_submit && (
          <Link
            className="button secondary"
            href={`${path}/submit?area=${area}`}
          >
            ضيف مصدر
          </Link>
        )}
      </div>
      <p className="muted">
        {area === "general"
          ? "مراجع وملفات بتغطي المادة كلها."
          : area === "revision"
            ? "كل اللي يساعدك تراجع وتستعد للامتحان في مكان واحد."
            : "محتوى السكاشن واللابات، منفصل عن المحاضرات."}
      </p>
      {resources.length ? (
        groups
          .filter((g) => g.rows.length)
          .map((g) => (
            <section key={g.title}>
              {area === "revision" && <h2>{g.title}</h2>}
              <div className="resource-list">
                {g.rows.map((r) => (
                  <ResourceRow key={r.id} resource={r} slug={slug} />
                ))}
              </div>
            </section>
          ))
      ) : (
        <Empty title="لسه مفيش مصادر هنا" />
      )}
      {area === "revision" && (
        <Link className="text-link" href={path}>
          تدريب محاضرة بعينها؟ اختارها من المحاضرات
        </Link>
      )}
      <nav className="pagination" aria-label="صفحات المصادر">
        {page > 1 && (
          <Link href={`${path}/${area}?page=${page - 1}`}>السابق</Link>
        )}
        {resources.length === 20 && (
          <Link href={`${path}/${area}?page=${page + 1}`}>التالي</Link>
        )}
      </nav>
    </>
  );
}
