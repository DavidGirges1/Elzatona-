import { AdminHeading } from "@/components/admin/shell";
import { GrowthChart } from "@/components/admin/chart";
import { overview, date } from "@/lib/admin/data";
import { Users, BookOpen, Files, Activity, Eye, UserCheck } from "lucide-react";
export const metadata = { title: "نظرة عامة · الإدارة" };
const events: Record<string, string> = {
  resource_opened: "فتح مصدر",
  resource_submitted: "إضافة مصدر",
  course_followed: "اختيار مادة",
  resource_voted: "تقييم مصدر",
  resource_saved: "حفظ مصدر",
  question_posted: "سؤال جديد",
  reply_posted: "رد جديد",
  report_submitted: "بلاغ جديد",
};
export default async function Page() {
  const d = await overview();
  return (
    <>
      <AdminHeading
        title="صورة أوضح، لقرارات أحسن."
        description="تابع نمو مجتمعك ومحتواه، من غير أرقام تقديرية."
      />
      <div className="metric-grid">
        {[
          [Users, "الطلبة المسجلين", d.students],
          [UserCheck, "نشطين النهارده", d.dau],
          [Activity, "نشطين آخر ٣٠ يوم", d.mau],
          [Eye, "زيارات مسجلة", d.page_views],
          [BookOpen, "المواد", d.courses],
          [Files, "المصادر", d.resources],
        ].map(([Icon, label, value], i) => {
          const I = Icon as typeof Users;
          return (
            <article className="metric-card" key={i}>
              <span>
                <I size={20} />
                {String(label)}
              </span>
              <strong>
                {new Intl.NumberFormat("ar-EG").format(Number(value))}
              </strong>
            </article>
          );
        })}
      </div>
      <GrowthChart data={d.growth} />
      <p className="muted small">
        النشاط اليومي والشهري بيحسب حسابات دخلت صفحات المنصة، مش كل زائر مجهول.{" "}
        {d.tracking_since
          ? `تتبع الزيارات بدأ ${date(d.tracking_since)}.`
          : "تتبع الزيارات لسه ما سجلش أول زيارة."}{" "}
        يشمل زيارات التجربة الداخلية والزيارات الآلية؛ صفحة Coming Soon مش ضمن
        التتبع.
      </p>
      <div className="admin-two-col">
        <section className="panel">
          <h2>الطلبة حسب الجامعة</h2>
          {d.universities.map((u) => (
            <div className="stat-row" key={u.id}>
              <span>{u.name || "جامعة بدون اسم عربي"}</span>
              <strong>{u.students}</strong>
            </div>
          ))}
        </section>
        <section className="panel">
          <h2>الكليات والسنين</h2>
          {d.faculties.length ? (
            d.faculties.map((f, i) => (
              <div className="stat-row" key={i}>
                <span>
                  {f.name} · {f.year ? `سنة ${f.year}` : "لسه بيكمل بياناته"}
                </span>
                <strong>{f.students}</strong>
              </div>
            ))
          ) : (
            <p className="muted">التوزيع هيظهر لما الطلبة يكملوا بياناتهم.</p>
          )}
        </section>
      </div>
      <section className="panel">
        <h2>آخر تفاعلات المنصة</h2>
        {d.activity.length ? (
          d.activity.map((a, i) => (
            <div className="stat-row" key={i}>
              <span>{events[a.event] || a.event}</span>
              <time dateTime={a.created_at}>{date(a.created_at)}</time>
            </div>
          ))
        ) : (
          <p className="muted">لسه مفيش تفاعلات مسجلة.</p>
        )}
      </section>
    </>
  );
}
