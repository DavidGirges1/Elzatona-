import type { MaterialArea } from "@/lib/placement";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { privateQuiz } from "@/lib/quiz/data";
import { currentUser, createClient } from "@/lib/supabase/server";
import { materialAccess } from "@/lib/material-access";
import { getLectures, getResourceLectures } from "@/lib/data";
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
  const [course, access] = await Promise.all([
    db
      .from("courses")
      .select("slug,is_active")
      .eq("id", quiz.resource.course_id)
      .maybeSingle(),
    materialAccess(quiz.resource.course_id),
  ]);
  if (course.data?.slug !== slug || quiz.resource.author_id !== user.id)
    notFound();
  const published = quiz.resource.status === "published";
  const readOnly =
    quiz.resource.status === "hidden" ||
    !course.data.is_active ||
    (published && !access.can_publish);
  const lectures = await getLectures(quiz.resource.course_id);
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
        lectures={lectures}
        initial={quiz.document}
        resourceId={id}
        initialPlacement={{
          area: quiz.resource.area as MaterialArea,
          lectures: (await getResourceLectures(id)).map((a) => a.lecture_id),
        }}
        published={published}
        submitted={quiz.resource.review_state === "submitted"}
        readOnly={readOnly}
        canPublish={access.can_publish}
        canSubmit={access.can_submit}
      />
    </div>
  );
}
