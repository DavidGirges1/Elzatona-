import { notFound, redirect } from "next/navigation";
import { getCourse } from "@/lib/data";
import { createClient, currentUser } from "@/lib/supabase/server";
import { report } from "@/lib/actions";
import { idSchema } from "@/lib/validation";
import { ActionForm, Submit } from "@/components/forms";
export default async function ReportDiscussion({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ reply?: string }>;
}) {
  const { slug, id } = await params;
  const { reply: replyId } = await searchParams;
  const c = await getCourse(slug);
  if (!c || !idSchema.safeParse(id).success) notFound();
  const db = await createClient();
  const { data: d } = await db
    .from("discussions")
    .select("id,title")
    .eq("id", id)
    .eq("course_id", c.id)
    .eq("status", "published")
    .maybeSingle();
  if (!d) notFound();
  if (replyId) {
    if (!idSchema.safeParse(replyId).success) notFound();
    const { data: r } = await db
      .from("discussion_replies")
      .select("id")
      .eq("id", replyId)
      .eq("discussion_id", id)
      .eq("status", "published")
      .maybeSingle();
    if (!r) notFound();
  }
  const path = `/courses/${slug}/discussions/${id}`;
  if (!(await currentUser()))
    redirect(
      `/login?next=${encodeURIComponent(path + "/report" + (replyId ? "?reply=" + replyId : ""))}`,
    );
  return (
    <div className="form-page">
      <h1>بلّغ عن مشكلة</h1>
      <p>{d.title}</p>
      <ActionForm
        className="panel"
        action={report.bind(
          null,
          replyId ? "reply" : "discussion",
          replyId || id,
          path,
        )}
      >
        <label className="field">
          السبب
          <select name="reason">
            <option value="inaccurate">معلومة غير دقيقة</option>
            <option value="abusive">إساءة</option>
            <option value="spam">محتوى مزعج</option>
            <option value="copyright">حقوق نشر</option>
            <option value="other">سبب تاني</option>
          </select>
        </label>
        <label className="field">
          تفاصيل
          <textarea name="details" maxLength={2000} />
        </label>
        <Submit>ابعت البلاغ</Submit>
      </ActionForm>
    </div>
  );
}
