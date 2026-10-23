import Link from "next/link";
import { pdfEnabled } from "@/lib/supabase/files";
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@/lib/supabase/server";
import { getCourse, getTopics } from "@/lib/data";
import { submitResource } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
import { resourceTypes } from "@/lib/validation";
import { ar } from "@/i18n/ar-EG";
export const metadata = { title: "ضيف مصدر" };
export default async function SubmitPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!(await currentUser()))
    redirect(`/login?next=${encodeURIComponent(`/courses/${slug}/submit`)}`);
  const c = await getCourse(slug);
  if (!c) notFound();
  const topics = await getTopics(c.id);
  return (
    <div className="form-page">
      <Link className="breadcrumb" href={`/courses/${slug}`}>
        <bdi>{c.title_ar || c.title}</bdi> / ضيف مصدر
      </Link>
      <h1>ضيف مصدر يفيد دفعتك</h1>
      <p className="muted">لينك مفيد أو ملف من شغلك، وخليه سهل يتلاقى.</p>
      <ActionForm action={submitResource.bind(null, slug)} className="panel">
        <input type="hidden" name="course_id" value={c.id} />
        <label className="field">
          عنوان المصدر
          <input
            name="title"
            minLength={4}
            maxLength={160}
            required
            placeholder="مثال: شرح Binary Trees بالرسومات"
            dir="auto"
          />
        </label>
        <label className="field">
          لينك المصدر
          <input
            name="external_url"
            type="url"
            dir="ltr"
            placeholder="https://…"
          />
          <span className="muted">
            لينك عام بيبدأ بـ <bdi dir="ltr">https://</bdi>، من غير ما ترفع
            الملف من جديد.
          </span>
        </label>
        {pdfEnabled() && (
          <label className="field">
            أو ملف PDF مسموح بمشاركته
            <input name="file" type="file" accept="application/pdf,.pdf" />
            <span className="muted">
              PDF فقط، لحد ٣ ميجابايت. اختيار ملف هيستخدمه بدل اللينك.
            </span>
          </label>
        )}
        <div className="filters">
          <label className="field">
            نوع المصدر
            <select name="type" required>
              {resourceTypes.map((t) => (
                <option value={t} key={t}>
                  {ar.types[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            المحاضرة أو الموضوع
            <select name="topic_id">
              <option value="">المادة كلها</option>
              {topics.map((t) => (
                <option value={t.id} key={t.id}>
                  {t.title_ar || t.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <details>
          <summary className="text-link">وصف وتفاصيل اختيارية</summary>
          <label className="field">
            وصف قصير
            <textarea name="description" maxLength={2000} dir="auto" />
          </label>
          <label className="check">
            <input type="checkbox" name="is_ai_assisted" />
            المحتوى معمول بمساعدة AI
          </label>
        </details>
        <input type="hidden" name="description" value="" disabled />
        <label className="check">
          <input type="checkbox" name="rights_confirmed" required />
          عندي حق مشاركة المصدر، ومفيهوش بيانات خاصة.
        </label>
        <Submit>ضيف المصدر</Submit>
      </ActionForm>
    </div>
  );
}
