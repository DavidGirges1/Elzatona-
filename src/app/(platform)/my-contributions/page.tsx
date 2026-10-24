import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";
import { reviewLabels } from "@/lib/community";
import { ActionForm, Submit } from "@/components/forms";
import { retryPdf } from "@/lib/actions";
export const metadata = {
  title: "إضافاتي",
  robots: { index: false, follow: false },
};
export default async function MyContributions({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; submitted?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/my-contributions");
  const db = await createClient();
  const s = await searchParams;
  const page = Math.min(1000, Math.max(1, Math.trunc(Number(s.page)) || 1));
  const [resources, reviewScope] = await Promise.all([
    db
      .from("resources")
      .select("*")
      .eq("author_id", user.id)
      .order("updated_at", { ascending: false })
      .order("id")
      .range((page - 1) * 20, page * 20),
    db.rpc("review_scope"),
  ]);
  if (reviewScope.error) throw reviewScope.error;
  const reviewCourses = reviewScope.data as string[];
  if (resources.error) throw resources.error;
  const rows = resources.data.slice(0, 20);
  const ids = rows.map((r) => r.id);
  const courseIds = [...new Set(rows.map((r) => r.course_id))];
  const [courses, reviews] = await Promise.all([
    courseIds.length
      ? db.from("courses").select("id,slug,title,title_ar").in("id", courseIds)
      : { data: [], error: null },
    ids.length
      ? db.from("latest_resource_reviews").select("*").in("resource_id", ids)
      : { data: [], error: null },
  ]);
  if (courses.error) throw courses.error;
  if (reviews.error) throw reviews.error;
  return (
    <div>
      <div className="section-head">
        <div>
          <h1>إضافاتي</h1>
          <p className="muted">
            تابع حالة المصادر والملاحظات، وعدّل الإضافة وأعد إرسالها لو محتاجة
            مراجعة.
          </p>
        </div>
        <Link className="button secondary" href="/courses">
          ضيف مصدر لمادة
        </Link>
      </div>
      {s.submitted && (
        <p className="notice" role="status">
          الإضافة اتحفظت. حالتها موضّحة تحت؛ المصادر المنتظرة للمراجعة لسه مش
          ظاهرة للطلبة.
        </p>
      )}
      <div className="resource-list">
        {rows.map((r) => {
          const c = courses.data?.find((c) => c.id === r.course_id);
          const review = reviews.data?.find((v) => v.resource_id === r.id);
          return (
            <article className="panel" key={r.id}>
              <span
                className={`type-chip ${r.status === "published" ? "mint" : r.review_state === "rejected" ? "peach" : "sunshine"}`}
              >
                {r.status === "hidden"
                  ? "مخفي بالمراجعة"
                  : reviewLabels[r.review_state]}
              </span>
              <h2 dir="auto">{r.title}</h2>
              <p className="muted">
                <bdi>{c?.title_ar || c?.title}</bdi>
              </p>
              {review && (
                <div className="review-note">
                  <strong>
                    {review.submission_version === r.submission_version
                      ? "ملاحظات المراجعة"
                      : "ملاحظات المراجعة السابقة"}
                  </strong>
                  <p dir="auto">{review.reason}</p>
                </div>
              )}
              <div className="actions">
                {r.status === "published" && c && (
                  <Link
                    className="button secondary"
                    href={`/courses/${c.slug}/resources/${r.id}`}
                  >
                    افتح المصدر
                  </Link>
                )}
                {r.status === "pending" && c && (
                  <>
                    {r.review_state === "submitted" &&
                      reviewCourses.includes(r.course_id) && (
                        <Link className="button" href={`/review/${r.id}`}>
                          راجع الإضافة
                        </Link>
                      )}
                    {r.source_kind === "quiz" ? (
                      <Link
                        className="button secondary"
                        href={`/courses/${c.slug}/resources/${r.id}/quiz/edit`}
                      >
                        راجع الأسئلة وعدّلها
                      </Link>
                    ) : r.source_kind === "external" || r.file_verified_at ? (
                      <Link
                        className="button secondary"
                        href={`/courses/${c.slug}/resources/${r.id}/edit`}
                      >
                        عدّل وأعد الإرسال
                      </Link>
                    ) : null}
                    {(r.source_kind === "external" ||
                      (r.source_kind === "pdf" && r.file_verified_at)) && (
                      <a
                        className="text-link"
                        href={`/api/review/resources/${r.id}/open`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        افتح نسختك
                      </a>
                    )}
                  </>
                )}
              </div>
              {r.status === "pending" &&
                r.source_kind === "pdf" &&
                r.review_state === "draft" && (
                  <ActionForm action={retryPdf.bind(null, r.id)}>
                    <label className="field">
                      أكمل رفع PDF
                      <input
                        type="file"
                        name="file"
                        accept="application/pdf,.pdf"
                      />
                    </label>
                    <Submit>أكمل الرفع والفحص</Submit>
                  </ActionForm>
                )}
              {r.source_kind === "pdf" &&
                r.review_state === "rejected" &&
                c && (
                  <p className="muted small">
                    لو محتاج تستبدل الملف نفسه،{" "}
                    <Link
                      className="text-link"
                      href={`/courses/${c.slug}/submit`}
                    >
                      ضيف نسخة جديدة
                    </Link>
                    . النسخة اللي اتراجعت ثابتة.
                  </p>
                )}
            </article>
          );
        })}
        {!rows.length && (
          <section className="panel">
            <h2>لسه مفيش إضافات</h2>
            <p>افتح مادة وشارك أول مصدر مفيد.</p>
          </section>
        )}
      </div>
      <nav className="pagination" aria-label="صفحات إضافاتي">
        {page > 1 && (
          <Link
            className="button secondary"
            href={`/my-contributions?page=${page - 1}`}
          >
            السابق
          </Link>
        )}
        {resources.data.length > 20 && (
          <Link
            className="button secondary"
            href={`/my-contributions?page=${page + 1}`}
          >
            التالي
          </Link>
        )}
      </nav>
    </div>
  );
}
