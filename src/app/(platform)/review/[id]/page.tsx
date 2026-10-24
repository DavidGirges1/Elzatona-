import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";
import { ActionForm, Submit } from "@/components/forms";
import { reviewMaterial } from "@/lib/community-actions";
import { privateQuiz } from "@/lib/quiz/data";
import { publicQuiz } from "@/lib/quiz/schema";
import { QuizPlayer } from "@/components/quiz/player";
export const metadata = {
  title: "راجع إضافة",
  robots: { index: false, follow: false },
};
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success) notFound();
  if (!(await currentUser())) redirect(`/login?next=/review/${id}`);
  const db = await createClient();
  const permission = await db.rpc("can_review_material", { p_resource: id });
  if (permission.error || !permission.data) notFound();
  const r = await db.from("resources").select("*").eq("id", id).single();
  if (!r.data) notFound();
  const resource = r.data;
  const [course, author, quiz] = await Promise.all([
    db
      .from("courses")
      .select("slug,title,title_ar")
      .eq("id", resource.course_id)
      .single(),
    db
      .from("profiles")
      .select("display_name")
      .eq("id", resource.author_id)
      .single(),
    resource.source_kind === "quiz" ? privateQuiz(id) : null,
  ]);
  if (!course.data) notFound();
  return (
    <div className="detail">
      <Link className="breadcrumb" href="/review">
        ارجع لقائمة المراجعة
      </Link>
      <article className="panel">
        <span className="type-chip sunshine">منتظر المراجعة</span>
        <h1 dir="auto">{resource.title}</h1>
        <p className="muted">
          <bdi>{course.data.title_ar || course.data.title}</bdi> · مشاركة{" "}
          <bdi>{author.data?.display_name}</bdi>
        </p>
        {resource.description && (
          <p className="description" dir="auto">
            {resource.description}
          </p>
        )}
        {resource.is_ai_assisted && (
          <p className="notice">محتوى بمساعدة AI؛ راجع الدقة والمصادر.</p>
        )}
        {resource.source_kind !== "quiz" && (
          <a
            className="button secondary"
            href={`/api/review/resources/${id}/open`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {resource.source_kind === "pdf"
              ? "افتح PDF للمراجعة"
              : "افتح لينك المصدر"}
          </a>
        )}
      </article>
      {quiz && (
        <details className="panel">
          <summary className="text-link">جرّب الأسئلة وراجع الإجابات</summary>
          <QuizPlayer
            quiz={publicQuiz(quiz.document, id, quiz.revision)}
            localDocument={quiz.document}
            mode="practice"
            coursePath="/review"
          />
        </details>
      )}
      <section className="panel">
        <h2>قرار المراجعة</h2>
        <p className="muted">
          الموافقة هتخلي المصدر ظاهر للطلبة. لو محتاج تعديل، اكتب المطلوب بوضوح؛
          السبب هيظهر لصاحب الإضافة.
        </p>
        <ActionForm
          action={reviewMaterial.bind(null, id, resource.submission_version)}
        >
          <label className="field">
            القرار
            <select name="decision" defaultValue="rejected">
              <option value="rejected">ارجعها للتعديل</option>
              <option value="approved">اقبل وانشر</option>
            </select>
          </label>
          <label className="field">
            سبب القرار أو ملاحظات لصاحب الإضافة
            <textarea
              name="reason"
              minLength={4}
              maxLength={1000}
              required
              dir="auto"
            />
          </label>
          <label className="check">
            <input name="confirm" type="checkbox" required />
            فتحت المصدر وراجعت النسخة دي وبأكد القرار
          </label>
          <Submit>احفظ قرار المراجعة</Submit>
        </ActionForm>
      </section>
    </div>
  );
}
