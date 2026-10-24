import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse, getLectures } from "@/lib/data";
import { materialAccess } from "@/lib/material-access";
import { saveLecture, removeLecture } from "@/lib/community-actions";
import { ActionForm, Submit } from "@/components/forms";
import { lectureLabel } from "@/lib/placement";
export const metadata = {
  title: "تنظيم المحاضرات",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const c = await getCourse(slug);
  if (!c || !(await materialAccess(c.id)).can_organize) notFound();
  const lectures = await getLectures(c.id);
  return (
    <div className="form-page">
      <Link className="breadcrumb" href={`/courses/${slug}`}>
        <bdi>{c.title_ar || c.title}</bdi>
      </Link>
      <h1>تنظيم المحاضرات</h1>
      <p className="muted">
        رقم واضح، وعنوان اختياري. تقدر تسيب أرقام بين المحاضرات وتغيّر الترتيب
        من غير ما اللينكات تتغير.
      </p>
      <section className="panel">
        <h2>ضيف محاضرة</h2>
        <ActionForm action={saveLecture.bind(null, c.id, slug, null)}>
          <label className="field">
            رقم المحاضرة
            <input
              name="number"
              type="number"
              min={1}
              max={999}
              required
              defaultValue={(lectures.at(-1)?.number || 0) + 1}
            />
          </label>
          <label className="field">
            عنوان اختياري
            <input name="title" maxLength={120} dir="auto" />
          </label>
          <Submit>ضيف المحاضرة</Submit>
        </ActionForm>
      </section>
      {lectures.map((l) => (
        <details className="panel" key={l.id}>
          <summary className="text-link">{lectureLabel(l)}</summary>
          <ActionForm action={saveLecture.bind(null, c.id, slug, l.id)}>
            <label className="field">
              رقم المحاضرة
              <input
                name="number"
                type="number"
                min={1}
                max={999}
                required
                defaultValue={l.number}
              />
            </label>
            <label className="field">
              عنوان اختياري
              <input
                name="title"
                maxLength={120}
                dir="auto"
                defaultValue={l.title}
              />
            </label>
            <Submit variant="outline">احفظ</Submit>
          </ActionForm>
          <details>
            <summary className="text-link">حذف محاضرة فاضية</summary>
            <ActionForm action={removeLecture.bind(null, l.id, slug)}>
              <label className="check">
                <input name="confirm" type="checkbox" required />
                أكد الحذف. المصادر لازم تتنقل الأول؛ النقاشات هتفضل موجودة.
              </label>
              <Submit variant="outline">احذف المحاضرة</Submit>
            </ActionForm>
          </details>
        </details>
      ))}
    </div>
  );
}
