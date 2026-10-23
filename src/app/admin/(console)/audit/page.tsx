import { AdminHeading, Pager } from "@/components/admin/shell";
import { requireAdmin } from "@/lib/auth/session";
import { date } from "@/lib/admin/data";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ db }, s] = await Promise.all([requireAdmin(), searchParams]);
  const page = Math.min(10000, Math.max(1, Math.trunc(Number(s.page)) || 1));
  const r = await db
    .from("admin_audit_log")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range((page - 1) * 25, page * 25 - 1);
  if (r.error) throw r.error;
  return (
    <>
      <AdminHeading
        title="سجل الإدارة"
        description="سجل غير قابل للتعديل من المتصفح لقرارات الإدارة والتهيئة الأولية."
      />
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>الوقت</th>
                <th>العملية</th>
                <th>الإداري</th>
                <th>السجل المستهدف</th>
                <th>التفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {r.data?.map((v) => (
                <tr key={v.id}>
                  <td>
                    {date(v.created_at)}
                    <br />
                    {new Date(v.created_at).toLocaleTimeString("ar-EG", {
                      timeZone: "Africa/Cairo",
                    })}
                  </td>
                  <td>
                    <bdi>{v.action}</bdi>
                  </td>
                  <td>
                    <bdi className="small">{v.actor_id || "حساب محذوف"}</bdi>
                  </td>
                  <td>
                    <bdi className="small">{v.target_id || "—"}</bdi>
                  </td>
                  <td>
                    <pre className="audit-details" dir="ltr">
                      {JSON.stringify(v.details, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!r.data?.length && (
          <p className="empty">لسه مفيش قرارات إدارية مسجلة.</p>
        )}
        <Pager page={page} total={r.count || 0} path="/admin/audit" />
      </section>
    </>
  );
}
