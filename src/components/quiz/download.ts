import type { QuizDocument } from "@/lib/quiz/schema";
export function downloadQuiz(document: QuizDocument) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(document, null, 2)], { type: "application/json" }),
  );
  const a = window.document.createElement("a");
  a.href = url;
  a.download = "elzatona-quiz.json";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
