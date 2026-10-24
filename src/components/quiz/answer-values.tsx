import { contentDirection } from "@/lib/quiz/direction";
/** Content stays in its own bidi paragraph, outside Arabic UI labels. */
export function AnswerValues({ values }: { values: string[] }) {
  return (
    <div className="quiz-answer-values">
      {values.map((value, index) => (
        <p key={index} className="quiz-text" dir={contentDirection(value)}>
          {value}
        </p>
      ))}
    </div>
  );
}
