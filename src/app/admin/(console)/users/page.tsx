import Link from "next/link";
import { AdminHeading, Pager } from "@/components/admin/shell";
import { Confirmation } from "@/components/admin/confirmation";
import { ActionForm, Submit } from "@/components/forms";
import { catalog, usersSchema, date } from "@/lib/admin/data";
import { changeAccount } from "@/lib/admin/actions";
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
