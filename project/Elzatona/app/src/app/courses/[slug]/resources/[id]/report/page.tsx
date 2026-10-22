import { notFound, redirect } from "next/navigation";
import { getResource } from "@/lib/data";
import { currentUser } from "@/lib/supabase/server";
import { report } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
export default async function Report({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const r = await getResource(id);
  if (!r || r.course_slug !== slug) notFound();
  const path = `/courses/${slug}/resources/${id}`;
  if (!(await currentUser()))
    redirect(`/login?next=${encodeURIComponent(path + "/report")}`);
  return (
    <div className="form-page">
      <h1>بلّغ عن مشكلة</h1>
      <p>
        <bdi>{r.title}</bdi>
      </p>
      <ActionForm
        className="panel"
        action={report.bind(null, "resource", id, path)}
      >
        <label className="field">
          سبب البلاغ
          <select name="reason">
            <option value="inaccurate">معلومة غير دقيقة أو لينك مش شغال</option>
            <option value="copyright">حقوق نشر</option>
            <option value="spam">محتوى مزعج</option>
            <option value="abusive">إساءة</option>
            <option value="other">سبب تاني</option>
          </select>
        </label>
        <label className="field">
          تفاصيل تساعدنا نراجع
          <textarea name="details" maxLength={2000} />
        </label>
        <Submit>ابعت البلاغ</Submit>
      </ActionForm>
    </div>
  );
}
