import Link from "next/link";
import { reviewLabels } from "@/lib/community";
import { redirect } from "next/navigation";
import { currentUser, createClient } from "@/lib/supabase/server";
export const metadata = {
  title: "مجموعات أسئلتي",
  robots: { index: false, follow: false },
};
export default async function MyQuizzes() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/my-quizzes");
  const db = await createClient();
  const result = await db
    .from("resources")
    .select("id,title,status,course_id,review_state")
    .eq("author_id", user.id)
    .eq("source_kind", "quiz")
    .order("updated_at", { ascending: false })
    .limit(100);
  if (result.error) throw result.error;
  const courseIds = [...new Set(result.data.map((q) => q.course_id))];
  const courses = courseIds.length
    ? await db
        .from("courses")
        .select("id,slug,title,title_ar")
        .in("id", courseIds)
    : { data: [], error: null };
  if (courses.error) throw courses.error;
  const rows = result.data.flatMap((q) => {
    const course = courses.data?.find((c) => c.id === q.course_id);
    return course ? [{ ...q, courses: course }] : [];
  });
  return (
    <div>
      <Link className="text-link" href="/my-contributions">
        تابع إضافاتك وملاحظات المراجعة
      </Link>
      <div className="section-head">
        <div>
          <h1>مجموعات أسئلتي</h1>
          <p className="muted">
            المسودات خاصة بيك. جرّبها وراجعها قبل ما تشاركها.
          </p>
        </div>
        <Link className="button secondary" href="/courses">
          اختار مادة واعمل أسئلة
        </Link>
      </div>
      <div className="resource-list">
        {rows.map((q) => (
          <article className="panel" key={q.id}>
            <span
              className={`type-chip ${q.status === "published" ? "mint" : "lavender"}`}
            >
              {q.status === "published"
                ? "منشورة"
                : q.status === "pending"
                  ? reviewLabels[q.review_state]
                  : "مخفية بالمراجعة"}
            </span>
            <h2 dir="auto">{q.title}</h2>
            <p className="muted">
              <bdi>{q.courses.title_ar || q.courses.title}</bdi>
            </p>
            <div className="actions">
              <Link
                className="button secondary"
                href={`/courses/${q.courses.slug}/resources/${q.id}/quiz/edit`}
              >
                {q.status === "pending" ? "كمّل وجرّب" : "راجع الأسئلة"}
              </Link>
              {q.status === "published" && (
                <Link
                  className="text-link"
                  href={`/courses/${q.courses.slug}/resources/${q.id}`}
                >
                  افتح المجموعة
                </Link>
              )}
            </div>
          </article>
        ))}
        {!rows.length && (
          <section className="panel">
            <h2>أول مجموعة تبدأ بسؤال</h2>
            <p>
              افتح أي مادة، اختار «اعمل أسئلة خاصة»، واكتب أسئلتك أو استورد بنك
              أسئلة.
            </p>
          </section>
        )}
      </div>
    </div>
  );
}
