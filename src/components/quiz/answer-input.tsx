"use client";
import { contentDirection, booleanAnswer } from "@/lib/quiz/direction";
import type { Answer, PublicQuestion } from "@/lib/quiz/schema";
export function AnswerInput({
  question: q,
  value,
  onChange,
  disabled = false,
}: {
  question: PublicQuestion;
  value: Answer | undefined;
  onChange: (answer: Answer) => void;
  disabled?: boolean;
}) {
  if (q.type === "written")
    return (
      <label className="field quiz-written">
        إجابتك
        <textarea
          aria-label="إجابتك"
          value={typeof value === "string" ? value : ""}
          maxLength={3000}
          rows={5}
          dir={contentDirection(
            typeof value === "string" ? value : "",
            contentDirection(q.prompt),
          )}
          placeholder={
            contentDirection(q.prompt) === "ltr"
              ? "Write your answer…"
              : "اكتب إجابتك…"
          }
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
        />
        <span className="muted small">
          {q.grading === "self"
            ? "هتقارن إجابتك بالإجابة النموذجية وتقيّمها بنفسك."
            : "اكتب الإجابة القصيرة. التصحيح بيقارنها بالبدائل اللي صاحب المجموعة حددها."}
        </span>
      </label>
    );
  const options =
    q.type === "true_false"
      ? [
          { id: "true", text: booleanAnswer(true, q.prompt) },
          { id: "false", text: booleanAnswer(false, q.prompt) },
        ]
      : q.options || [];
  return (
    <fieldset className="quiz-options" disabled={disabled}>
      <legend className="sr-only">
        {q.multiple ? "اختر كل الإجابات الصحيحة" : "اختر إجابة واحدة"}
      </legend>
      {options.map((option, i) => {
        const selected =
          q.type === "true_false"
            ? value === (option.id === "true")
            : Array.isArray(value) && value.includes(option.id);
        return (
          <label
            className={`quiz-option ${selected ? "selected" : ""}`}
            key={option.id}
            dir={contentDirection(option.text, contentDirection(q.prompt))}
          >
            <input
              type={q.multiple ? "checkbox" : "radio"}
              name={`answer-${q.id}`}
              checked={selected}
              onChange={() => {
                if (q.type === "true_false") onChange(option.id === "true");
                else if (q.multiple) {
                  const old = Array.isArray(value) ? value : [];
                  onChange(
                    selected
                      ? old.filter((id) => id !== option.id)
                      : [...old, option.id],
                  );
                } else onChange([option.id]);
              }}
            />
            <span className="quiz-option-letter" aria-hidden="true" dir="ltr">
              {q.type === "true_false"
                ? i
                  ? "×"
                  : "✓"
                : String.fromCharCode(65 + i)}
            </span>
            <span
              className="quiz-text"
              dir={contentDirection(option.text, contentDirection(q.prompt))}
            >
              {option.text}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
