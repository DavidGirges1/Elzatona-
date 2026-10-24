import { notFound } from "next/navigation";
import { getResource } from "@/lib/data";
import { readQuiz } from "@/lib/quiz/data";
import { QuizPlayer } from "@/components/quiz/player";
export const metadata = {
  title: "حل مجموعة أسئلة",
  robots: { index: false, follow: true },
};
export default async function PlayPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { slug, id } = await params;
  const resource = await getResource(id);
  if (
    !resource ||
    resource.course_slug !== slug ||
    resource.source_kind !== "quiz"
  )
    notFound();
  const quiz = await readQuiz(id);
  if (!quiz) notFound();
  const { mode } = await searchParams;
  return (
    <QuizPlayer
      key={`${id}.${quiz.revision}.${mode}`}
      quiz={quiz}
      mode={mode === "exam" ? "exam" : "practice"}
      coursePath={`/courses/${slug}/resources/${id}`}
    />
  );
}
