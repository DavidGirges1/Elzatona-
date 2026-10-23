import Link from "next/link";
import { AdminHeading, Pager, SavedNotice } from "@/components/admin/shell";
import { AcademicFields } from "@/components/admin/academic-fields";
import { ActionForm, Submit } from "@/components/forms";
import { catalog } from "@/lib/admin/data";
import { saveCourse } from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    page?: string;
    updated?: string;
    q?: string;
  }>;
}) {
  const [c, { db }, s] = await Promise.all([
    catalog(),
    requireAdmin(),
    searchParams,
  ]);
  const page = Math.min(10000, Math.max(1, Math.trunc(Number(s.page)) || 1));
  const q = (s.q || "").slice(0, 100);
  let query = db
    .from("courses")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id")
    .range((page - 1) * 25, page * 25 - 1);
  if (q) query = query.ilike("title_ar", `%${q.replace(/[%_]/g, "")}%`);
  const r = await query;
  if (r.error) throw r.error;
  const edit = idSchema.safeParse(s.edit);
  const detail = edit.success
    ? await db.from("courses").select("*").eq("id", edit.data).maybeSingle()
    : null;
  if (detail?.error) throw detail.error;
  const item = detail?.data;
  return (
    <>
      <AdminHeading
        title="المواد"
        description="كل مادة مرتبطة بجامعة وكلية وسنة فعلية. المواد القديمة محفوظة لحد ما تحدد سياقها الصحيح."
      />
      <SavedNotice value={s.updated} />
      <form className="admin-filter" role="search">
        <label className="field">
          ابحث باسم المادة
          <input name="q" defaultValue={q} maxLength={100} />
        </label>
        <button className="button secondary">ابحث</button>
      </form>
      <div className="admin-editor-grid">
        <section className="panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>الجامعة والكلية</th>
                  <th>السنة / الترم</th>
                  <th>الحالة</th>
                  <th>إدارة</th>
                </tr>
              </thead>
              <tbody>
                {r.data?.map((v) => (
                  <tr key={v.id}>
                    <td>
                      <strong>{v.title_ar || v.title}</strong>
                      <br />
                      <bdi>{v.code}</bdi>
                    </td>
                    <td>
                      {
                        c.universities.find((u) => u.id === v.university_id)
                          ?.name_ar
                      }
                      <br />
                      <span className="muted">
                        {c.faculties.find((f) => f.id === v.faculty_id)
                          ?.name_ar || "محتاج تحديد الكلية"}
                      </span>
                    </td>
                    <td>
                      {v.year_level || "—"} / {v.semester || "—"}
                    </td>
                    <td>{v.is_active ? "متاحة" : "متوقفة"}</td>
                    <td>
                      <Link
                        href={`/admin/courses?edit=${v.id}`}
                        className="text-link"
                      >
                        تعديل
                      </Link>
                      <Link href={`/courses/${v.slug}`} className="text-link">
                        فتح
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!r.data?.length && <p className="empty">لسه مفيش مواد بالبحث ده.</p>}
          <Pager
            page={page}
            total={r.count || 0}
            path="/admin/courses"
            query={`q=${encodeURIComponent(q)}`}
          />
        </section>
        <section className="panel" key={item?.id || "new"}>
          <h2>{item ? "تعديل المادة" : "إضافة مادة"}</h2>
          <ActionForm action={saveCourse}>
            <input type="hidden" name="id" value={item?.id || ""} />
            <AcademicFields {...c} defaults={item || {}} />
            <label className="field">
              الترم
              <select name="semester" defaultValue={item?.semester || ""}>
                <option value="">غير محدد</option>
                <option value="1">الأول</option>
                <option value="2">التاني</option>
                <option value="3">الصيفي</option>
              </select>
            </label>
            {[
              ["title_ar", "اسم المادة بالعربي"],
              ["title", "اسم المادة بالإنجليزي"],
              ["code", "كود المادة"],
              ["slug", "لينك المادة المختصر"],
            ].map(([name, label]) => (
              <label className="field" key={name}>
                {label}
                <input
                  name={name}
                  required
                  maxLength={name === "code" ? 40 : name === "slug" ? 80 : 160}
                  dir={name === "title_ar" ? "auto" : "ltr"}
                  defaultValue={String(
                    item?.[name as "title_ar" | "title" | "code" | "slug"] ||
                      "",
                  )}
                />
              </label>
            ))}
            <label className="field">
              وصف المادة
              <textarea
                name="description"
                maxLength={2000}
                defaultValue={item?.description || ""}
              />
            </label>
            <label className="check">
              <input
                type="checkbox"
                name="active"
                defaultChecked={item?.is_active ?? true}
              />
              المادة متاحة
            </label>
            <Submit>احفظ المادة</Submit>
            <Link className="text-link" href="/admin/courses">
              إضافة مادة جديدة
            </Link>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
