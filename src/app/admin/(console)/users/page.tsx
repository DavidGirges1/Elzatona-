import Link from "next/link";
import { AdminHeading, Pager } from "@/components/admin/shell";
import { Confirmation } from "@/components/admin/confirmation";
import { ActionForm, Submit } from "@/components/forms";
import { catalog, usersSchema, date } from "@/lib/admin/data";
import {
  changeAccount,
  changeMaterialPermissions,
  changePublishingMode,
} from "@/lib/admin/actions";
import { requireAdmin } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    university?: string;
    faculty?: string;
    year?: string;
    page?: string;
  }>;
}) {
  const [c, { db }, s] = await Promise.all([
    catalog(),
    requireAdmin(),
    searchParams,
  ]);
  const q = (s.q || "").slice(0, 100);
  const page = Math.min(10000, Math.max(1, Math.trunc(Number(s.page)) || 1));
  const university = idSchema.safeParse(s.university);
  const faculty = idSchema.safeParse(s.faculty);
  const year = Number(s.year);
  const r = await db.rpc("admin_users", {
    p_query: q,
    p_university: university.success ? university.data : null,
    p_faculty: faculty.success ? faculty.data : null,
    p_year: year >= 1 && year <= 12 ? year : null,
    p_page: page,
  });
  if (r.error) throw r.error;
  const d = usersSchema.parse(r.data);
  const [settings, permissions] = await Promise.all([
    db.from("material_publishing_settings").select("open_to_all").single(),
    db
      .from("material_permissions")
      .select("user_id,can_publish,can_organize")
      .in(
        "user_id",
        d.users.map((u) => u.id),
      ),
  ]);
  if (settings.error) throw settings.error;
  if (permissions.error) throw permissions.error;
  const grants = new Map((permissions.data || []).map((p) => [p.user_id, p]));
  const open = settings.data.open_to_all;
  const query = new URLSearchParams({
    q,
    university: s.university || "",
    faculty: s.faculty || "",
    year: s.year || "",
  }).toString();
  return (
    <>
      <AdminHeading
        title="الطلبة"
        description="بيانات الحسابات دي خاصة بالإدارة. الإيقاف يمنع التفاعل حتى لو جلسة الطالب لسه مفتوحة."
      />
      <section className="panel publishing-policy">
        <div>
          <h2>نشر المصادر</h2>
          <p className="muted">
            {open
              ? "النشر متاح لكل طالب مكتمل الحساب. تنظيم مصادر الآخرين يظل بصلاحية منفصلة."
              : "النشر مقفول للطلبة، باستثناء الحسابات اللي تختارها. حسابات الإدارة تقدر تنشر."}
          </p>
        </div>
        <span className={`type-chip ${open ? "mint" : "sunshine"}`}>
          {open ? "مفتوح للجميع" : "للمصرّح لهم فقط"}
        </span>
        <Confirmation
          label={open ? "قفل النشر العام" : "فتح النشر للجميع"}
          title={open ? "الرجوع للنشر المقيّد" : "فتح نشر المصادر لكل الطلبة"}
        >
          <ActionForm action={changePublishingMode}>
            <input
              type="hidden"
              name="mode"
              value={open ? "restricted" : "open"}
            />
            <p>
              {open
                ? "الحسابات المختارة هتحتفظ بصلاحياتها، وباقي الطلبة مش هيقدروا يضيفوا مصادر."
                : "كل طالب نشط ومكتمل الحساب هيقدر يضيف لينكات وPDF ويعدّل إضافاته. صلاحية تنظيم مصادر الآخرين مش هتتفتح تلقائيًا."}
            </p>
            <label className="field">
              سبب القرار
              <textarea name="reason" required minLength={4} maxLength={1000} />
            </label>
            <label className="check">
              <input name="confirm" type="checkbox" required />
              راجعت تأثير القرار وبأكد التغيير
            </label>
            <Submit>تأكيد وضع النشر</Submit>
          </ActionForm>
        </Confirmation>
      </section>
      <form className="admin-filter" role="search">
        <label className="field">
          الاسم، المستخدم، أو البريد
          <input name="q" defaultValue={q} maxLength={100} />
        </label>
        <label className="field">
          الجامعة
          <select name="university" defaultValue={s.university || ""}>
            <option value="">كل الجامعات</option>
            {c.universities.map((u) => (
              <option value={u.id} key={u.id}>
                {u.name_ar}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          الكلية
          <select name="faculty" defaultValue={s.faculty || ""}>
            <option value="">كل الكليات</option>
            {c.faculties.map((f) => (
              <option value={f.id} key={f.id}>
                {f.name_ar}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          السنة
          <select name="year" defaultValue={s.year || ""}>
            <option value="">كل السنين</option>
            {[...new Set(c.years.map((y) => y.year))].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary">طبّق</button>
      </form>
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>الطالب</th>
                <th>البريد</th>
                <th>الدراسة</th>
                <th>التسجيل</th>
                <th>الحالة</th>
                <th>صلاحيات المصادر</th>
                <th>إدارة الحساب</th>
              </tr>
            </thead>
            <tbody>
              {d.users.map((u) => (
                <tr key={u.id}>
                  <td>
                    <Link className="text-link" href={`/u/${u.id}`}>
                      {u.full_name}
                    </Link>
                    <br />
                    <bdi>@{u.username}</bdi>
                  </td>
                  <td>
                    <bdi>{u.email}</bdi>
                  </td>
                  <td>
                    {u.university || "لسه مختارش جامعة"}
                    <br />
                    {u.faculty}
                    <br />
                    {u.academic_year ? `السنة ${u.academic_year}` : ""}
                  </td>
                  <td>{date(u.created_at)}</td>
                  <td>
                    <span
                      className={`type-chip ${u.status === "active" ? "mint" : "peach"}`}
                    >
                      {u.status === "active" ? "نشط" : "موقوف"}
                    </span>
                  </td>
                  <td>
                    <div className="material-permission-labels">
                      {grants.get(u.id)?.can_publish && (
                        <span className="type-chip sky">ناشر</span>
                      )}
                      {grants.get(u.id)?.can_organize && (
                        <span className="type-chip lavender">منظّم</span>
                      )}
                      {!grants.get(u.id)?.can_publish &&
                        !grants.get(u.id)?.can_organize && (
                          <span className="muted">
                            {open ? "نشر عام · إضافاته فقط" : "بدون صلاحيات"}
                          </span>
                        )}
                    </div>
                    <Confirmation
                      label="صلاحيات المصادر"
                      title={`صلاحيات المصادر · ${u.full_name}`}
                    >
                      <ActionForm
                        action={changeMaterialPermissions.bind(null, u.id)}
                      >
                        <label className="check">
                          <input
                            type="checkbox"
                            name="publish"
                            defaultChecked={
                              grants.get(u.id)?.can_publish || false
                            }
                          />
                          نشر لينكات وملفات PDF وتعديل إضافاته
                        </label>
                        <label className="check">
                          <input
                            type="checkbox"
                            name="organize"
                            defaultChecked={
                              grants.get(u.id)?.can_organize || false
                            }
                          />
                          تنظيم المصادر المنشورة، بما فيها إضافات الطلبة الآخرين
                        </label>
                        <p className="muted">
                          التنظيم يتيح تعديل العنوان والوصف والموضوع فقط، ولا
                          يمنح صلاحيات إدارة أو حذف أو إخفاء. لإلغاء التصريح،
                          شيل العلامتين.{" "}
                          {open &&
                            "النشر العام مفتوح حاليًا؛ إزالة تصريح الناشر لا تمنع النشر إلا بعد قفل النشر العام."}
                        </p>
                        <label className="field">
                          سبب تغيير الصلاحيات
                          <textarea
                            name="reason"
                            required
                            minLength={4}
                            maxLength={1000}
                          />
                        </label>
                        <label className="check">
                          <input name="confirm" type="checkbox" required />
                          راجعت الصلاحيات وبأكد القرار
                        </label>
                        <Submit>احفظ الصلاحيات</Submit>
                      </ActionForm>
                    </Confirmation>
                  </td>
                  <td>
                    <Confirmation
                      label={
                        u.status === "active" ? "إيقاف الحساب" : "إعادة التفعيل"
                      }
                      title={`${u.status === "active" ? "إيقاف" : "تفعيل"} حساب ${u.full_name}`}
                    >
                      <ActionForm action={changeAccount.bind(null, u.id)}>
                        <input
                          name="status"
                          type="hidden"
                          value={u.status === "active" ? "suspended" : "active"}
                        />
                        <label className="field">
                          سبب القرار
                          <textarea
                            name="reason"
                            required
                            minLength={4}
                            maxLength={1000}
                          />
                        </label>
                        <label className="check">
                          <input type="checkbox" name="confirm" required />
                          راجعت الحساب وبأكد القرار
                        </label>
                        <Submit>تأكيد القرار</Submit>
                      </ActionForm>
                    </Confirmation>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!d.users.length && (
          <p className="empty">مفيش طلبة مطابقين للاختيارات دي.</p>
        )}
        <Pager page={page} total={d.total} path="/admin/users" query={query} />
      </section>
    </>
  );
}
