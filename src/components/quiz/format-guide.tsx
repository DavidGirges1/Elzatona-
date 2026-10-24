"use client";
import { useState } from "react";
import { exampleQuiz, conversionPrompt } from "@/lib/quiz/example";
import { downloadQuiz } from "./download";
export function QuizFormatGuide() {
  const [notice, setNotice] = useState("");
  return (
    <>
      <div className="actions">
        <button
          type="button"
          className="button primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(conversionPrompt);
              setNotice(
                "اتنسخت التعليمات. ضيف بنك الأسئلة في الأداة اللي اخترتها.",
              );
            } catch {
              setNotice(
                "النسخ التلقائي مش متاح؛ انسخ التعليمات من المربع تحت.",
              );
            }
          }}
        >
          انسخ تعليمات التحويل
        </button>
        <button
          type="button"
          className="button secondary"
          onClick={() => downloadQuiz(exampleQuiz)}
        >
          نزّل مثال JSON
        </button>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <label className="field">
        تعليمات التحويل
        <textarea
          readOnly
          value={conversionPrompt}
          className="quiz-format-prompt"
          dir="auto"
          onFocus={(e) => e.currentTarget.select()}
        />
      </label>
      <details className="panel">
        <summary className="text-link">شوف مثال الصيغة</summary>
        <p className="muted">مثال توضيحي فقط، مش بنك أسئلة للمادة.</p>
        <pre dir="ltr" className="quiz-json-example">
          {JSON.stringify(exampleQuiz, null, 2)}
        </pre>
      </details>
    </>
  );
}
