import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronLeft, Search } from "lucide-react";
import {
  getCourse,
  getLectures,
  getResources,
  getDiscussions,
  getFollowedIds,
} from "@/lib/data";
import { currentUser } from "@/lib/supabase/server";
import { materialAccess } from "@/lib/material-access";
import { follow } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
import { ResourceRow, Empty, SearchBar } from "@/components/content";
import { CourseNavigation } from "@/components/course-navigation";
import { lectureLabel } from "@/lib/placement";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const c = await getCourse((await params).slug);
  return { title: c?.title_ar || c?.title || "المادة" };
}
export default async function CoursePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; tab?: string; page?: string }>;
}) {
  const { slug } = await params;
  const c = await getCourse(slug);
  if (!c) notFound();
  const s = await searchParams;
  const path = `/courses/${slug}`;
  const page = Math.max(1, Math.min(1000, Math.trunc(Number(s.page)) || 1));
  const [lectures, access, user, ids] = await Promise.all([
    getLectures(c.id),
    materialAccess(c.id),
    currentUser(),
    getFollowedIds(),
  ]);
  const discussions = s.tab === "discussions" ? await getDiscussions(c.id) : [];
  const resources = s.q
    ? await getResources({ courseId: c.id, q: s.q, page })
    : [];
  return (
    <>
      <Link href="/courses" className="breadcrumb">
        <ArrowRight size={16} />
        كل المواد
      </Link>
      <header className="course-heading">
        <div>
          <h1>
            <bdi>{c.title_ar || c.title}</bdi>
          </h1>
          <p className="muted">
            <bdi dir="ltr">{c.code}</bdi>
            {c.title_en && (
              <>
                {" "}
                · <bdi>{c.title_en}</bdi>
              </>
            )}
          </p>
        </div>
        <div className="course-heading-actions">
          {user ? (
            <ActionForm action={follow.bind(null, c.id, path)}>
              <Submit variant="outline">
                {ids.includes(c.id) ? "ضمن موادي · إزالة" : "ضيف لموادي"}
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
          <details className="course-more">
            <summary className="button secondary">المزيد</summary>
            <div className="course-more-menu">
              <Link href={`${path}/sections`}>السكاشن واللابات</Link>
              {access.can_submit && (
                <Link href={`${path}/submit`}>ضيف مصدر</Link>
              )}
              {access.can_organize && (
                <Link href={`${path}/organize`}>تنظيم المحاضرات</Link>
              )}
              {access.can_review && (
                <Link href={`/review?course=${c.id}`}>راجع الإضافات</Link>
              )}
            </div>
          </details>
        </div>
      </header>
      <CourseNavigation
        slug={slug}
        active={s.tab === "discussions" ? "discussions" : "content"}
      />
      {s.tab === "discussions" ? (
        <>
          <div className="section-head">
            <h2>اسأل دفعتك</h2>
            <Link href={`${path}/ask`}>اسأل سؤال</Link>
          </div>
          <p className="muted">
            اسأل أو شارك فكرة عن المادة، مش لازم تختار محاضرة.
          </p>
          {discussions.length ? (
            <div className="resource-list">
              {discussions.map((d) => (
                <Link
                  className="panel"
                  key={d.id}
                  href={`${path}/discussions/${d.id}`}
                >
                  <h3 dir="auto">{d.title}</h3>
                  <p className="muted description" dir="auto">
                    {d.body.slice(0, 180)}
                  </p>
                  {d.lecture_id && (
                    <span className="small">
                      {lectureLabel(
                        lectures.find((l) => l.id === d.lecture_id) || {
                          number: 0,
                          title: "",
                        },
                      )}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <Empty title="مفيش أسئلة هنا لسه — اسأل أول سؤال" />
          )}
        </>
      ) : (
        <>
          <div className="course-shortcuts">
            <Link href={`${path}/general`}>
              ملفات المادة <ChevronLeft size={18} />
            </Link>
            <Link href={`${path}/revision`}>
              المراجعة والامتحانات <ChevronLeft size={18} />
            </Link>
          </div>
          <details className="course-search" open={s.q ? true : undefined}>
            <summary className="text-link">
              <Search size={18} />
              دور داخل المادة
            </summary>
            <SearchBar
              action={path}
              value={s.q}
              placeholder="عنوان ملف، شرح، أو اسم محاضرة…"
            />
          </details>
          {s.q ? (
            <>
              <div className="section-head">
                <h2>نتائج البحث</h2>
                <Link href={path}>ارجع للمحاضرات</Link>
              </div>
              {resources.length ? (
                <div className="resource-list">
                  {resources.map((r) => (
                    <ResourceRow key={r.id} resource={r} slug={slug} />
                  ))}
                </div>
              ) : (
                <Empty title="مفيش نتائج بالاسم ده. جرّب كلمة تانية." />
              )}
              <nav className="pagination" aria-label="صفحات البحث">
                {page > 1 && (
                  <Link
                    href={`${path}?q=${encodeURIComponent(s.q)}&page=${page - 1}`}
                  >
                    السابق
                  </Link>
                )}
                {resources.length === 20 && (
                  <Link
                    href={`${path}?q=${encodeURIComponent(s.q)}&page=${page + 1}`}
                  >
                    التالي
                  </Link>
                )}
              </nav>
            </>
          ) : (
            <section aria-label="محاضرات المادة">
              <div className="section-head">
                <h2>المحاضرات</h2>
                {access.can_organize && (
                  <Link href={`${path}/organize`}>تنظيم</Link>
                )}
              </div>
              {lectures.length ? (
                <ol className="lecture-list">
                  {lectures.map((l) => (
                    <li key={l.id}>
                      <Link
                        className="lecture-row"
                        href={`${path}/lectures/${l.id}`}
                      >
                        <span className="lecture-number">
                          {new Intl.NumberFormat("ar-EG").format(l.number)}
                        </span>
                        <div>
                          <strong>
                            المحاضرة{" "}
                            {new Intl.NumberFormat("ar-EG").format(l.number)}
                          </strong>
                          {l.title && <span dir="auto">{l.title}</span>}
                        </div>
                        <ChevronLeft size={20} />
                      </Link>
                    </li>
                  ))}
                </ol>
              ) : (
                <Empty title="المحاضرات لسه بتتجهّز">
                  {access.can_organize ? (
                    <Link className="text-link" href={`${path}/organize`}>
                      ضيف أول محاضرة
                    </Link>
                  ) : (
                    <Link className="text-link" href={`${path}/ask`}>
                      اطلب إضافة محاضرة
                    </Link>
                  )}
                </Empty>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
