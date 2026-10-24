"use client";
import { contentDirection, booleanAnswer } from "@/lib/quiz/direction";
import { AnswerValues } from "./answer-values";
import { Check, X, PenLine } from "lucide-react";
import type { Feedback, PublicQuestion } from "@/lib/quiz/schema";
export function QuizFeedback({
  result,
  question,
  selfMark,
  onSelfMark,
}: {
  result: Feedback;
  question: PublicQuestion;
  selfMark?: boolean;
  onSelfMark?: (value: boolean) => void;
}) {
  const status = result.status;
  const correct =
    status === "correct" || (status === "self" && selfMark === true);
  return (
    <div
      className={`quiz-feedback ${correct ? "correct" : status === "self" && selfMark === undefined ? "self" : "incorrect"}`}
      role="status"
    >
      <strong>
        {status === "self" ? (
          <PenLine size={20} />
        ) : correct ? (
          <Check size={20} />
        ) : (
          <X size={20} />
        )}
        {status === "self"
          ? "قارن بإجابتك"
          : correct
            ? "إجابة صحيحة"
            : status === "unanswered"
              ? "السؤال متجاوبش"
              : "محتاج تراجع الإجابة"}
      </strong>
      {result.correctOptionIds && (
        <>
          <p className="small muted">الإجابة الصحيحة</p>
          <AnswerValues
            values={(question.options || [])
              .filter((o) => result.correctOptionIds!.includes(o.id))
              .map((o) => o.text)}
          />
        </>
      )}
      {result.answer !== undefined && (
        <>
          <p className="small muted">الإجابة الصحيحة</p>
          <AnswerValues
            values={[booleanAnswer(result.answer, question.prompt)]}
          />
        </>
      )}
      {result.modelAnswer && (
        <>
          <h3>الإجابة النموذجية</h3>
          <p className="quiz-text" dir={contentDirection(result.modelAnswer)}>
            {result.modelAnswer}
          </p>
        </>
      )}
      {result.explanation && (
        <p className="quiz-text" dir={contentDirection(result.explanation)}>
          {result.explanation}
        </p>
      )}
      {status === "self" && onSelfMark && (
        <div
          className="quiz-self-check"
          role="group"
          aria-label="تقييم إجابتك الكتابية"
        >
          <button
            type="button"
            className="button secondary"
            aria-pressed={selfMark === true}
            onClick={() => onSelfMark(true)}
          >
            <Check size={18} />
            إجابتي صحيحة
          </button>
          <button
            type="button"
            className="button secondary"
            aria-pressed={selfMark === false}
            onClick={() => onSelfMark(false)}
          >
            أحتاج أراجع
          </button>
          <span className="small">تقييم ذاتي، ضمن نتيجتك هنا.</span>
        </div>
      )}
    </div>
  );
}
