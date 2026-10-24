"use client";
import { useState } from "react";
import { ar } from "@/i18n/ar-EG";
import type { ResourceType } from "@/lib/validation";
import {
  BookOpen,
  PencilLine,
  FileText,
  Link2,
  ListChecks,
} from "lucide-react";
import dynamic from "next/dynamic";
const QuizEditor = dynamic(() => import("./editor").then((m) => m.QuizEditor), {
  loading: () => <p role="status">جاري تجهيز محرّر الأسئلة…</p>,
});
import { ActionForm, Submit } from "@/components/forms";
import { submitResource } from "@/lib/actions";
import { MaterialLocked } from "@/components/material-locked";
export function MaterialComposer({
  courseId,
  slug,
  topics,
  canPublish,
  canSubmit,
  pdfEnabled,
  purpose: initialPurpose,
}: {
  courseId: string;
  slug: string;
  topics: { id: string; title: string; title_ar?: string | null }[];
  canPublish: boolean;
  canSubmit: boolean;
  pdfEnabled: boolean;
  purpose?: string;
}) {
  const [purpose, setPurpose] = useState(
    initialPurpose === "solve"
      ? "solve"
      : initialPurpose === "study"
        ? "study"
        : "",
  );
  const [format, setFormat] = useState("");
  const [studyType, setStudyType] = useState<ResourceType>("video");
  const [solveType, setSolveType] = useState<"question_bank" | "sheets">(
    "question_bank",
  );
  const materialType = purpose === "solve" ? solveType : studyType;
  const [dirty, setDirty] = useState(false);
  return (
    <div className="material-composer">
      {format ? (
        <div className="material-selection-summary">
          <div>
            <span className="type-chip sky">
              {purpose === "study" ? "مذاكرة" : "حل"}
            </span>{" "}
            <strong>
              {format === "quiz"
                ? "مجموعة أسئلة تفاعلية"
                : `${ar.types[materialType]} · ${format === "pdf" ? "ملف PDF" : "لينك مصدر"}`}
            </strong>
          </div>
          <button
            type="button"
            className="text-link"
            onClick={() => {
              if (
                dirty &&
                !window.confirm(
                  "فيه أسئلة لسه ماتحفظتش. تغيّر النوع وتفقد التعديلات؟",
                )
              )
                return;
              setFormat("");
              setDirty(false);
            }}
          >
            غيّر نوع المصدر
          </button>
        </div>
      ) : (
        <>
          <fieldset className="material-choice">
            <legend>١. المصدر ده هيساعد في إيه؟</legend>
            <div className="material-choice-grid">
              {[
                {
                  id: "study",
                  title: "مذاكرة",
                  text: "شرح تفهم منه وتراجع عليه",
                  icon: BookOpen,
                },
                {
                  id: "solve",
                  title: "حل",
                  text: "أسئلة تتدرّب وتختبر نفسك بيها",
                  icon: PencilLine,
                },
              ].map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="material-choice-card"
                  aria-pressed={purpose === item.id}
                  onClick={() => {
                    setPurpose(item.id);
                    setFormat("");
                  }}
                >
                  <item.icon size={26} />
                  <strong>{item.title}</strong>
                  <span>{item.text}</span>
                </button>
              ))}
            </div>
          </fieldset>
          {purpose && (
            <fieldset className="material-choice">
              <legend>
                ٢. {purpose === "study" ? "هتشارك إيه؟" : "الأسئلة موجودة فين؟"}
              </legend>
              {purpose === "study" ? (
                <>
                  <div className="purpose-tabs">
                    {(
                      [
                        ["video", "فيديو"],
                        ["slides", "سلايدز"],
                        ["sections", "سكاشن"],
                        ["notes", "نوتس"],
                        ["reference", "مرجع"],
                        ["other", "حاجة تانية"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        type="button"
                        className="button secondary"
                        key={value}
                        aria-pressed={studyType === value}
                        onClick={() => {
                          setStudyType(value);
                          if (value === "video") setFormat("link");
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {studyType === "sections" && (
                    <p className="muted small">
                      شرح وتطبيقات السكاشن واللابات.
                    </p>
                  )}
                  <div className="purpose-tabs">
                    <button
                      type="button"
                      className="button secondary"
                      aria-pressed={format === "link"}
                      onClick={() => setFormat("link")}
                    >
                      <Link2 size={18} />
                      لينك
                    </button>
                    {pdfEnabled && studyType !== "video" && (
                      <button
                        type="button"
                        className="button secondary"
                        aria-pressed={format === "pdf"}
                        onClick={() => setFormat("pdf")}
                      >
                        <FileText size={18} />
                        ملف PDF
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="purpose-tabs" aria-label="نوع الأسئلة">
                    {(
                      [
                        ["question_bank", "بنوك أسئلة"],
                        ["sheets", "شيتات"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        type="button"
                        className="button secondary"
                        key={value}
                        aria-pressed={solveType === value}
                        onClick={() => {
                          setSolveType(value);
                          setFormat("");
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  {solveType === "sheets" && (
                    <p className="muted small">
                      شيتات وتمارين المادة اللي بيجهزها الدكتور.
                    </p>
                  )}
                  <div className="material-choice-grid formats">
                    {[
                      ...(solveType === "question_bank"
                        ? [
                            {
                              id: "quiz",
                              label: "مجموعة تفاعلية",
                              text: "اكتب أسئلتك أو استورد JSON",
                              icon: ListChecks,
                            },
                          ]
                        : []),
                      ...(pdfEnabled
                        ? [
                            {
                              id: "pdf",
                              label:
                                solveType === "sheets"
                                  ? "شيت PDF"
                                  : "بنك أسئلة PDF",
                              text: "ملف يتعرض جوّه المنصة",
                              icon: FileText,
                            },
                          ]
                        : []),
                      {
                        id: "link",
                        label:
                          solveType === "sheets"
                            ? "لينك شيت"
                            : "بنك أسئلة من موقع",
                        text: "شارك لينك أسئلة مفيدة",
                        icon: Link2,
                      },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className="material-choice-card"
                        aria-pressed={format === item.id}
                        onClick={() => setFormat(item.id)}
                      >
                        <item.icon size={22} />
                        <strong>{item.label}</strong>
                        <span>{item.text}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </fieldset>
          )}
        </>
      )}
      {purpose && format === "quiz" && (
        <QuizEditor
          courseId={courseId}
          slug={slug}
          topics={topics}
          canPublish={canPublish}
          canSubmit={canSubmit}
          onDirtyChange={setDirty}
        />
      )}
      {purpose &&
        (format === "link" || format === "pdf") &&
        (canSubmit ? (
          <ActionForm
            key={`${purpose}-${format}`}
            action={submitResource.bind(null, slug)}
            className="panel"
          >
            <input type="hidden" name="course_id" value={courseId} />
            <input type="hidden" name="type" value={materialType} />
            <label className="field">
              عنوان المصدر
              <input
                name="title"
                minLength={4}
                maxLength={160}
                required
                dir="auto"
                placeholder={
                  purpose === "solve"
                    ? "مثال: أسئلة الفصل الأول"
                    : "مثال: شرح Binary Trees بالرسومات"
                }
              />
            </label>
            {format === "link" ? (
              <label className="field">
                لينك المصدر
                <input
                  name="external_url"
                  type="url"
                  dir="ltr"
                  placeholder="https://…"
                  required
                />
              </label>
            ) : (
              <label className="field">
                ملف PDF
                <input
                  name="file"
                  type="file"
                  accept="application/pdf,.pdf"
                  required
                />
                <span className="muted small">
                  PDF فقط، لحد ٣ ميجابايت، ومسموح بمشاركته.
                </span>
              </label>
            )}
            <label className="field">
              المحاضرة أو الموضوع
              <select name="topic_id">
                <option value="">المادة كلها</option>
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title_ar || t.title}
                  </option>
                ))}
              </select>
            </label>
            <details>
              <summary className="text-link">وصف وتفاصيل اختيارية</summary>
              <label className="field">
                وصف قصير
                <textarea name="description" maxLength={2000} dir="auto" />
              </label>
              <label className="check">
                <input type="checkbox" name="is_ai_assisted" />
                المحتوى معمول بمساعدة AI
              </label>
            </details>
            <label className="check">
              <input type="checkbox" name="rights_confirmed" required />
              عندي حق مشاركة المصدر، ومفيهوش بيانات خاصة.
            </label>
            <Submit>{canPublish ? "ضيف المصدر" : "ابعت للمراجعة"}</Submit>
          </ActionForm>
        ) : (
          <MaterialLocked slug={slug} />
        ))}
    </div>
  );
}
