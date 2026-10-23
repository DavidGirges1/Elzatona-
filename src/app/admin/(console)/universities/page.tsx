import Link from "next/link";
import { AdminHeading, SavedNotice } from "@/components/admin/shell";
import { ActionForm, Submit } from "@/components/forms";
import { catalog, overview } from "@/lib/admin/data";
import { saveUniversity } from "@/lib/admin/actions";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; updated?: string }>;
}) {
  const [c, d, s] = await Promise.all([catalog(), overview(), searchParams]);
  const item = c.universities.find((u) => u.id === s.edit);
  return (
    <>
      <AdminHeading
        title="الجامعات"
        description="الجامعات المفعلة في التسجيل بتظهر تلقائيًا للطلبة."
      />
      <SavedNotice value={s.updated} />
      <div className="admin-editor-grid">
        <section className="panel">
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>الجامعة</th>
                  <th>الطلبة</th>
                  <th>التسجيل</th>
                  <th>إدارة</th>
                </tr>
              </thead>
              <tbody>
                {c.universities.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name_ar || u.name}</strong>
                      <small dir="ltr">{u.name}</small>
                    </td>
                    <td>
                      {d.universities.find((x) => x.id === u.id)?.students || 0}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${u.is_active && u.onboarding_enabled ? "active" : ""}`}
                      >
                        {u.is_active && u.onboarding_enabled
                          ? "متاحة"
                          : "غير متاحة"}
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/admin/universities?edit=${u.id}`}
                        className="text-link"
                      >
                        تعديل
                      </Link>{" "}
                      ·{" "}
                      <Link
                        href={`/admin/faculties?university=${u.id}`}
                        className="text-link"
                      >
                        الكليات
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="panel" key={item?.id || "new"}>
          <h2>{item ? "تعديل الجامعة" : "جامعة جديدة"}</h2>
          <ActionForm action={saveUniversity}>
            <input type="hidden" name="id" value={item?.id || ""} />
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
              اللينك المختصر
              <input
                name="slug"
                required
                pattern="[a-z0-9-]+"
                maxLength={80}
                defaultValue={item?.slug || ""}
                dir="ltr"
                placeholder="university-name"
              />
            </label>
            <label className="field">
              تفاصيل الجامعة
              <textarea
                name="description"
                maxLength={2000}
                defaultValue={item?.description || ""}
              />
            </label>
            <label className="check">
              <input
                name="active"
                type="checkbox"
                defaultChecked={item?.is_active ?? true}
              />
              الجامعة مفعلة
            </label>
            <label className="check">
              <input
                name="onboarding"
                type="checkbox"
                defaultChecked={item?.onboarding_enabled ?? true}
              />
              تظهر في تسجيل الطلبة
            </label>
            <Submit>احفظ الجامعة</Submit>
            {item && (
              <Link className="text-link" href="/admin/universities">
                إضافة جامعة جديدة
              </Link>
            )}
          </ActionForm>
        </section>
      </div>
    </>
  );
}
