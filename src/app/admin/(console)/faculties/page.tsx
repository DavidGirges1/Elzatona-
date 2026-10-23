import Link from "next/link";
import { AdminHeading, SavedNotice } from "@/components/admin/shell";
import { ActionForm, Submit } from "@/components/forms";
import { catalog, overview } from "@/lib/admin/data";
import { saveFaculty } from "@/lib/admin/actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    edit?: string;
    university?: string;
    updated?: string;
  }>;
}) {
  const [c, d, s] = await Promise.all([catalog(), overview(), searchParams]);
  const item = c.faculties.find((f) => f.id === s.edit);
  const relation = c.relations.find(
    (r) => r.faculty_id === item?.id && r.university_id === s.university,
  );
  return (
    <>
      <AdminHeading
        title="الكليات والسنين"
        description="قائمة كليات مشتركة، وعلاقة مستقلة وسنين قابلة للتخصيص لكل جامعة."
      />
      <SavedNotice value={s.updated} />
      <div className="admin-editor-grid">
        <section className="panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>الكلية</th>
                  <th>الجامعة</th>
                  <th>السنين</th>
                  <th>الطلبة</th>
                  <th>الحالة</th>
                  <th>إدارة</th>
                </tr>
              </thead>
              <tbody>
                {c.relations
                  .filter(
                    (r) => !s.university || r.university_id === s.university,
                  )
                  .map((r) => (
                    <tr key={`${r.university_id}:${r.faculty_id}`}>
                      <td>
                        {
                          c.faculties.find((f) => f.id === r.faculty_id)
                            ?.name_ar
                        }
                      </td>
                      <td>
                        {
                          c.universities.find((u) => u.id === r.university_id)
                            ?.name_ar
                        }
                      </td>
                      <td>
                        {c.years
                          .filter(
                            (y) =>
                              y.university_id === r.university_id &&
                              y.faculty_id === r.faculty_id,
                          )
                          .map((y) => y.year)
                          .join("، ")}
                      </td>
                      <td>
                        {d.faculties
                          .filter(
                            (v) =>
                              v.university_id === r.university_id &&
                              v.faculty_id === r.faculty_id,
                          )
                          .reduce((n, v) => n + v.students, 0)}
                      </td>
                      <td>{r.is_active ? "مفعلة" : "متوقفة"}</td>
                      <td>
                        <Link
                          className="text-link"
                          href={`/admin/faculties?edit=${r.faculty_id}&university=${r.university_id}`}
                        >
                          تعديل
                        </Link>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="muted small">
            تعداد الطلبة حسب الكلية والسنة:{" "}
            {d.faculties.reduce((n, v) => n + v.students, 0)} طالب اختار كليته.
          </p>
        </section>
        <section className="panel" key={`${item?.id}:${s.university}`}>
          <h2>{item ? "تعديل كلية الجامعة" : "إضافة كلية لجامعة"}</h2>
          <ActionForm action={saveFaculty}>
            <label className="field">
              الجامعة
              <select
                name="university_id"
                required
                defaultValue={s.university || ""}
              >
                <option value="">اختار الجامعة</option>
                {c.universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name_ar || u.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              كلية موجودة أو جديدة
              <select name="id" defaultValue={item?.id || ""}>
                <option value="">كلية جديدة</option>
                {c.faculties.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name_ar}
                  </option>
                ))}
              </select>
            </label>
            <p className="muted small">
              عند ربط كلية موجودة، اكتب نفس اسمها وكودها. تعديل الاسم بيطبّق على
              كل الجامعات المرتبطة.
            </p>
            <label className="field">
              الاسم بالعربي
              <input
                name="name_ar"
                required
                minLength={2}
                maxLength={120}
                defaultValue={item?.name_ar || ""}
              />
            </label>
            <label className="field">
              الاسم بالإنجليزي
              <input
                name="name"
                required
                minLength={2}
                maxLength={120}
                defaultValue={item?.name || ""}
                dir="ltr"
              />
            </label>
            <label className="field">
              الكود المختصر
              <input
                name="slug"
                required
                pattern="[a-z0-9-]+"
                maxLength={80}
                defaultValue={item?.slug || ""}
                dir="ltr"
              />
            </label>
            <label className="field">
              السنين المتاحة
              <input
                name="years"
                required
                dir="ltr"
                defaultValue={
                  relation
                    ? c.years
                        .filter(
                          (y) =>
                            y.university_id === relation.university_id &&
                            y.faculty_id === relation.faculty_id,
                        )
                        .map((y) => y.year)
                        .join(",")
                    : "1,2,3,4"
                }
                placeholder="1,2,3,4,5"
              />
              <span className="muted small">
                من ١ لـ١٢؛ الفصل بينهم بفواصل. لا يمكن حذف سنة مرتبطة بطلبة أو
                مواد.
              </span>
            </label>
            <label className="check">
              <input
                name="active"
                type="checkbox"
                defaultChecked={relation?.is_active ?? true}
              />
              الكلية متاحة في الجامعة دي
            </label>
            <Submit>احفظ الكلية والسنين</Submit>
            <Link className="text-link" href="/admin/faculties">
              إضافة ارتباط جديد
            </Link>
          </ActionForm>
        </section>
      </div>
    </>
  );
}
