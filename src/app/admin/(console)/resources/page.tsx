import Link from "next/link";
import { AdminHeading, Pager } from "@/components/admin/shell";
import { Confirmation } from "@/components/admin/confirmation";
import { ActionForm, Submit } from "@/components/forms";
import { date } from "@/lib/admin/data";
import { manageResource } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { appPath } from "@/lib/paths";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const [{ db }, s] = await Promise.all([requireAdmin(), searchParams]);
  const status = ["published", "hidden", "pending"].includes(s.status || "")
    ? s.status
    : undefined;
  const page = Math.min(10000, Math.max(1, Math.trunc(Number(s.page)) || 1));
  let query = db
    .from("resources")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 25, page * 25 - 1);
  if (status)
    query = query.eq("status", status as "published" | "hidden" | "pending");
  const r = await query;
  if (r.error) throw r.error;
  const ids = [...new Set(r.data?.map((v) => v.course_id) || [])];
  const courses = ids.length
    ? await db.from("courses").select("id,slug,title_ar").in("id", ids)
    : { data: [], error: null };
  if (courses.error) throw courses.error;
  return (
    <>
      <AdminHeading
        title="المصادر"
        description="راجع المحتوى والعنوان قبل النشر أو الإخفاء. ملفات PDF المعلّقة لا تُنشر قبل فحصها."
      />
      <form className="admin-filter">
        <label className="field">
          الحالة
          <select name="status" defaultValue={status || ""}>
            <option value="">كل المصادر</option>
            <option value="published">منشور</option>
            <option value="pending">معلّق</option>
            <option value="hidden">مخفي</option>
          </select>
        </label>
        <button className="button secondary">طبّق</button>
      </form>
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>المصدر</th>
                <th>المادة</th>
                <th>النوع والحالة</th>
                <th>التاريخ</th>
                <th>إدارة</th>
              </tr>
            </thead>
            <tbody>
              {r.data?.map((v) => {
                const course = courses.data?.find((c) => c.id === v.course_id);
                return (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.title}</strong>
                      <p className="muted small">{v.description}</p>
                      <a
                        className="text-link"
                        href={appPath(`/api/admin/resources/${v.id}/open`)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        راجع المصدر
                      </a>
                    </td>
                    <td>
                      {course?.title_ar}
                      {v.status === "published" && course && (
                        <Link
                          className="text-link"
                          href={`/courses/${course.slug}/resources/${v.id}`}
                        >
                          صفحة المصدر
                        </Link>
                      )}
                    </td>
                    <td>
                      <bdi>{v.source_kind}</bdi>
                      <br />
                      {v.status === "published"
                        ? "منشور"
                        : v.status === "hidden"
                          ? "مخفي"
                          : "معلّق"}
                    </td>
                    <td>{date(v.created_at)}</td>
                    <td>
                      <Confirmation
                        label="تعديل / مراجعة"
                        title="قرار بخصوص المصدر"
                      >
                        <ActionForm action={manageResource.bind(null, v.id)}>
                          <label className="field">
                            العنوان
                            <input
                              name="title"
                              required
                              minLength={4}
                              maxLength={160}
                              defaultValue={v.title}
                            />
                          </label>
                          <label className="field">
                            القرار
                            <select
                              name="status"
                              defaultValue={
                                v.status === "published"
                                  ? "published"
                                  : "hidden"
                              }
                            >
                              <option
                                value="published"
                                disabled={
                                  v.source_kind === "pdf" && !v.file_verified_at
                                }
                              >
                                نشر
                              </option>
                              <option value="hidden">إخفاء من المنصة</option>
                            </select>
                          </label>
                          <label className="field">
                            السبب
                            <textarea
                              name="reason"
                              required
                              minLength={4}
                              maxLength={1000}
                            />
                          </label>
                          <label className="check">
                            <input type="checkbox" name="confirm" required />
                            راجعت المحتوى وبأكد القرار
                          </label>
                          <Submit>احفظ القرار</Submit>
                        </ActionForm>
                      </Confirmation>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!r.data?.length && <p className="empty">مفيش مصادر بالحالة دي.</p>}
        <Pager
          page={page}
          total={r.count || 0}
          path="/admin/resources"
          query={`status=${status || ""}`}
        />
      </section>
    </>
  );
}
