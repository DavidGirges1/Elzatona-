import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";
import { materialAccess } from "@/lib/material-access";
import { idSchema } from "@/lib/validation";
export const metadata = {
  title: "مراجعة الإضافات",
  robots: { index: false, follow: false },
};
export default async function ReviewQueue({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; page?: string; decision?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/review");
  const access = await materialAccess();
  if (!access.can_review) redirect("/dashboard");
  const db = await createClient();
  const [s, scope, admin] = await Promise.all([
    searchParams,
    db.rpc("review_scope"),
    db.rpc("is_admin"),
  ]);
  if (scope.error) throw scope.error;
  const ids = scope.data as string[];
  const selected = idSchema.safeParse(s.course);
  const course =
    selected.success && ids.includes(selected.data) ? selected.data : null;
  const page = Math.min(1000, Math.max(1, Math.trunc(Number(s.page)) || 1));
  const courses = ids.length
    ? await db
        .from("courses")
        .select("id,slug,title,title_ar,code")
        .in("id", ids)
        .order("code")
    : { data: [], error: null };
  if (courses.error) throw courses.error;
  let query = db
    .from("resources")
    .select("*")
    .eq("status", "pending")
    .eq("review_state", "submitted");
  if (!admin.data) query = query.neq("author_id", user.id);
  const result = ids.length
    ? await query
        .in("course_id", course ? [course] : ids)
        .order("submitted_at")
        .order("id")
        .range((page - 1) * 20, page * 20)
    : { data: [], error: null };
  if (result.error) throw result.error;
  const rows = (result.data || []).slice(0, 20);
  return (
    <div>
      <h1>مراجعة الإضافات</h1>
      {(s.decision === "approved" || s.decision === "rejected") && (
        <p className="notice" role="status">
          {s.decision === "approved"
            ? "اتقبل المصدر وبقى ظاهر للطلبة."
            : "اترجع المصدر لصاحبه مع ملاحظات التعديل."}
        </p>
      )}
      <p className="muted">
        راجع المصدر نفسه، وضوح العنوان، مناسبته للمادة وحقوق مشاركته. الإضافة مش
        بتظهر للطلبة قبل الموافقة.
      </p>
      <form className="filters">
        <label className="field">
          المادة
          <select name="course" defaultValue={course || ""}>
            <option value="">كل المواد المتاحة للمراجعة</option>
            {courses.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.title_ar || c.title}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary">اعرض الإضافات</button>
      </form>
      <div className="resource-list">
        {rows.map((r) => (
          <Link
            className="panel review-queue-row"
            key={r.id}
            href={`/review/${r.id}`}
          >
            <span className="type-chip sunshine">منتظر المراجعة</span>
            <h2 dir="auto">{r.title}</h2>
            <p className="muted">
              <bdi>
                {courses.data?.find((c) => c.id === r.course_id)?.title_ar}
              </bdi>{" "}
              ·{" "}
              {r.source_kind === "quiz"
                ? "أسئلة تفاعلية"
                : r.source_kind === "pdf"
                  ? "PDF"
                  : "لينك"}
            </p>
            <span className="text-link">افتح وراجع المصدر ←</span>
          </Link>
        ))}
        {!rows.length && (
          <section className="panel">
            <h2>مفيش إضافات منتظرة هنا</h2>
            <p className="muted">
              الإضافات الجديدة هتظهر أول ما تتبعت للمراجعة. إضافاتك بتتابعها من
              «إضافاتي».
            </p>
          </section>
        )}
      </div>
      <nav className="pagination" aria-label="صفحات المراجعة">
        {page > 1 && (
          <Link
            className="button secondary"
            href={`/review?page=${page - 1}${course ? "&course=" + course : ""}`}
          >
            السابق
          </Link>
        )}
        {(result.data?.length || 0) > 20 && (
          <Link
            className="button secondary"
            href={`/review?page=${page + 1}${course ? "&course=" + course : ""}`}
          >
            التالي
          </Link>
        )}
      </nav>
    </div>
  );
}
