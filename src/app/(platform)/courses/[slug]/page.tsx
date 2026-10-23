import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, ArrowRight } from "lucide-react";
import {
  getCourse,
  getTopics,
  getResources,
  getHighlights,
  getDiscussions,
  getFollowedIds,
} from "@/lib/data";
import { currentUser } from "@/lib/supabase/server";
import { follow } from "@/lib/actions";
import { ar } from "@/i18n/ar-EG";
import { ActionForm, Submit } from "@/components/forms";
import { SearchBar, ResourceRow, Empty } from "@/components/content";
import { resourceTypes } from "@/lib/validation";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await getCourse(slug);
  return { title: c?.title_ar || c?.title || "المادة" };
}
export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{
    q?: string;
    type?: string;
    topic?: string;
    sort?: string;
    page?: string;
    tab?: string;
  }>;
}) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();
  const s = await searchParams;
  const path = `/courses/${slug}`;
  const page = Math.max(1, Math.min(Math.trunc(Number(s.page)) || 1, 1000));
  const [topics, resources, highlights, discussions, ids, user] =
    await Promise.all([
      getTopics(course.id),
      getResources({ courseId: course.id, ...s, page }),
      getHighlights(course.id),
      getDiscussions(course.id),
      getFollowedIds(),
      currentUser(),
    ]);
  const pagination = (n: number) => {
    const q = new URLSearchParams();
    for (const [key, value] of Object.entries(s))
      if (value && key !== "page") q.set(key, value);
    q.set("page", String(n));
    return `${path}?${q}`;
  };
  return (
    <>
      <Link href="/courses" className="breadcrumb">
        <ArrowRight size={16} /> كل المواد
      </Link>
      <section className="course-hero">
        <p className="eyebrow">
          <bdi>{course.department_ar || course.department}</bdi>
        </p>
        <h1>
          <bdi>{course.title_ar || course.title}</bdi>
        </h1>
        <p>
          <bdi>{course.title_en || course.code}</bdi>
        </p>
        <p className="course-choice-meta">
          <bdi dir="ltr">{course.code}</bdi>
          {course.year_level && (
            <span>
              المستوى {new Intl.NumberFormat("ar-EG").format(course.year_level)}
            </span>
          )}
          {course.credit_hours && (
            <span>
              {new Intl.NumberFormat("ar-EG").format(course.credit_hours)} ساعات
              معتمدة
            </span>
          )}
        </p>
        {course.description && <p>{course.description}</p>}
        <div className="actions">
          {user ? (
            <ActionForm action={follow.bind(null, course.id, path)}>
              <Submit>
                {ids.includes(course.id) ? "ضمن موادي · إزالة" : "ضيف لموادي"}
              </Submit>
            </ActionForm>
          ) : (
            <Link
              className="button secondary"
              href={`/login?next=${encodeURIComponent(path)}&intent=follow`}
            >
              ضيف لموادي
            </Link>
          )}
          <Link className="button secondary" href={`${path}/submit`}>
            <Plus size={18} />
            {ar.add}
          </Link>
        </div>
      </section>
      <nav className="tabs" aria-label="أقسام المادة">
        <Link
          href={path}
          aria-current={s.tab !== "discussions" ? "page" : undefined}
        >
          المصادر
        </Link>
        <Link
          href={`${path}?tab=discussions`}
          aria-current={s.tab === "discussions" ? "page" : undefined}
        >
          المناقشات
        </Link>
      </nav>
      {s.tab === "discussions" ? (
        <>
          <div className="section-head">
            <h2>اسأل دفعتك</h2>
            <Link href={`${path}/ask`}>
              اسأل سؤال <Plus size={18} />
            </Link>
          </div>
          {discussions.length ? (
            <div className="resource-list">
              {discussions.map((d) => (
                <Link
                  className="panel"
                  key={d.id}
                  href={`${path}/discussions/${d.id}`}
                >
                  <h3>
                    <bdi>{d.title}</bdi>
                  </h3>
                  <p className="muted description">{d.body.slice(0, 180)}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="مفيش أسئلة هنا لسه — اسأل أول سؤال" />
          )}
        </>
      ) : (
        <>
          {highlights.length > 0 && !s.q && !s.type && !s.topic && (
            <section className="highlight">
              <span className="sticker">زتونة المادة</span>
              <h2>مصادر مختارة من مجتمع المادة</h2>
              <div className="resource-list">
                {highlights.map((r) => (
                  <ResourceRow key={r.id} resource={r} slug={slug} />
                ))}
              </div>
            </section>
          )}
          <SearchBar action={path} value={s.q} placeholder="دور جوّه المادة…">
            <div className="filters">
              <label>
                المحاضرات والموضوعات
                <select name="topic" defaultValue={s.topic || ""}>
                  <option value="">كل الموضوعات</option>
                  {topics.map((t) => (
                    <option value={t.id} key={t.id}>
                      {t.title_ar || t.title}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                نوع المصدر
                <select name="type" defaultValue={s.type || ""}>
                  <option value="">كل الأنواع</option>
                  {resourceTypes.map((t) => (
                    <option value={t} key={t}>
                      {ar.types[t]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                الترتيب
                <select name="sort" defaultValue={s.sort || "latest"}>
                  <option value="latest">الأحدث</option>
                  <option value="helpful">الأفيد · حسب صافي الأصوات</option>
                </select>
              </label>
            </div>
            <button className="button secondary" style={{ marginTop: 12 }}>
              اعرض النتائج
            </button>
          </SearchBar>
          <div className="section-head">
            <h2>مصادر المادة</h2>
            {(s.q || s.type || s.topic) && (
              <Link href={path}>امسح الفلاتر</Link>
            )}
          </div>
          {resources.length ? (
            <div className="resource-list">
              {resources.map((r) => (
                <ResourceRow resource={r} slug={slug} key={r.id} />
              ))}
            </div>
          ) : (
            <Empty>
              <Link className="text-link" href={`${path}/submit`}>
                ضيف أول مصدر
              </Link>
            </Empty>
          )}
          <nav className="pagination" aria-label="صفحات المصادر">
            {page > 1 && (
              <Link className="button secondary" href={pagination(page - 1)}>
                السابق
              </Link>
            )}
            {resources.length === 20 && (
              <Link className="button secondary" href={pagination(page + 1)}>
                التالي
              </Link>
            )}
          </nav>
        </>
      )}
    </>
  );
}
