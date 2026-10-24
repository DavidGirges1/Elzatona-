import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { privateQuiz } from "@/lib/quiz/data";
import { currentUser, createClient } from "@/lib/supabase/server";
import { materialAccess } from "@/lib/material-access";
import { getTopics } from "@/lib/data";
import { QuizEditor } from "@/components/quiz/editor";
export const metadata = {
  title: "تعديل مجموعة أسئلة",
  robots: { index: false, follow: false },
};
export default async function EditQuiz({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const user = await currentUser();
  if (!user)
    redirect(
      `/login?next=${encodeURIComponent(`/courses/${slug}/resources/${id}/quiz/edit`)}`,
    );
  const quiz = await privateQuiz(id);
  if (!quiz) notFound();
  const db = await createClient();
  const [course, admin, access] = await Promise.all([
    db
      .from("courses")
      .select("slug,is_active")
      .eq("id", quiz.resource.course_id)
      .maybeSingle(),
    db.rpc("is_admin"),
    materialAccess(),
  ]);
  if (
    course.data?.slug !== slug ||
    (!admin.data && quiz.resource.author_id !== user.id)
  )
    notFound();
  const published = quiz.resource.status === "published";
  const readOnly =
    quiz.resource.status === "hidden" ||
    !course.data.is_active ||
    (published && !access.can_publish);
  const topics = await getTopics(quiz.resource.course_id);
  return (
    <div>
      <Link
        className="breadcrumb"
        href={published ? `/courses/${slug}/resources/${id}` : "/my-quizzes"}
      >
        ارجع للمجموعة
      </Link>
      {readOnly && (
        <p className="notice">
          عرض للمراجعة فقط. المجموعة مش متاحة للتعديل حاليًا.
        </p>
      )}
      <QuizEditor
        courseId={quiz.resource.course_id}
        slug={slug}
        topics={topics}
        initial={quiz.document}
        resourceId={id}
        topicId={quiz.resource.topic_id || ""}
        published={published}
        readOnly={readOnly}
        canPublish={access.can_publish}
      />
    </div>
  );
}
