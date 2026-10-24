"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { ar } from "@/i18n/ar-EG";
import {
  typesForArea,
  type Placement,
  type LectureOption,
} from "@/lib/placement";
import { PlacementFields } from "@/components/placement-fields";
import { ActionForm, Submit } from "@/components/forms";
import { submitResource } from "@/lib/actions";
import { MaterialLocked } from "@/components/material-locked";
const QuizEditor = dynamic(() => import("./editor").then((m) => m.QuizEditor), {
  loading: () => <p role="status">جاري تجهيز محرّر الأسئلة…</p>,
});
export function MaterialComposer({
  courseId,
  slug,
  lectures,
  canPublish,
  canSubmit,
  pdfEnabled,
  initialPlacement,
}: {
  courseId: string;
  slug: string;
  lectures: LectureOption[];
  canPublish: boolean;
  canSubmit: boolean;
  pdfEnabled: boolean;
  initialPlacement?: Partial<Placement>;
}) {
  const [placement, setPlacement] = useState<Placement | null>(
    initialPlacement?.area
      ? {
          area: initialPlacement.area,
          lectures: initialPlacement.lectures || [],
        }
      : null,
  );
  const [purpose, setPurpose] = useState("");
  const [type, setType] = useState("video");
  const [format, setFormat] = useState("");
  const [dirty, setDirty] = useState(false);
  const available = typesForArea(placement?.area || "");
  const validPlacement =
    placement &&
    (placement.area !== "lecture" || placement.lectures.length > 0);
  const materialType = placement?.area === "sections" ? "sections" : type;
  function reset() {
    setFormat("");
    setPurpose("");
    setType("video");
  }
  if (!canSubmit) return <MaterialLocked slug={slug} />;
  return (
    <div className="material-composer">
      <PlacementFields
        lectures={lectures}
        slug={slug}
        initial={initialPlacement}
        onChange={(p) => {
          if (
            !typesForArea(p.area).includes(
              materialType as (typeof available)[number],
            )
          ) {
            if (
              format &&
              !window.confirm(
                "نوع المصدر مش مناسب للمكان الجديد. تغيّر النوع وتبدأ من جديد؟",
              )
            )
              return false;
            reset();
            setDirty(false);
          }
          setPlacement(p);
        }}
      />
      {!validPlacement && format && (
        <p className="notice" role="status">
          اختار محاضرة عشان تحفظ المصدر.
        </p>
      )}
      {placement && (validPlacement || !!format) && (
        <>
          {!format ? (
            <>
              {placement.area !== "sections" && (
                <fieldset className="material-choice">
                  <legend>المصدر ده هيساعد في إيه؟</legend>
                  <div className="purpose-tabs">
                    <button
                      className="button secondary"
                      type="button"
                      aria-pressed={purpose === "study"}
                      onClick={() => {
                        setPurpose("study");
                        setType("video");
                      }}
                    >
                      مذاكرة
                    </button>
                    {placement.area !== "general" && (
                      <button
                        className="button secondary"
                        type="button"
                        aria-pressed={purpose === "solve"}
                        onClick={() => {
                          setPurpose("solve");
                          setType("sheets");
                        }}
                      >
                        حل
                      </button>
                    )}
                  </div>
                </fieldset>
              )}
              {(purpose || placement.area === "sections") && (
                <fieldset className="material-choice">
                  <legend>هتشارك إيه؟</legend>
                  {placement.area !== "sections" && (
                    <label className="field">
                      نوع المصدر
                      <select
                        value={type}
                        onChange={(e) => setType(e.target.value)}
                      >
                        {available
                          .filter((t) =>
                            purpose === "solve"
                              ? [
                                  "sheets",
                                  "question_bank",
                                  "past_exam",
                                ].includes(t)
                              : ![
                                  "sheets",
                                  "question_bank",
                                  "past_exam",
                                ].includes(t),
                          )
                          .map((t) => (
                            <option value={t} key={t}>
                              {ar.types[t]}
                            </option>
                          ))}
                      </select>
                    </label>
                  )}
                  <div className="purpose-tabs">
                    <button
                      type="button"
                      className="button secondary"
                      onClick={() => setFormat("link")}
                    >
                      لينك
                    </button>
                    {pdfEnabled && materialType !== "video" && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setFormat("pdf")}
                      >
                        ملف PDF
                      </button>
                    )}
                    {type === "question_bank" && (
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setFormat("quiz")}
                      >
                        مجموعة تفاعلية
                      </button>
                    )}
                  </div>
                </fieldset>
              )}
            </>
          ) : (
            <div className="material-selection-summary">
              <strong>
                {ar.types[materialType as keyof typeof ar.types]} ·{" "}
                {format === "pdf"
                  ? "PDF"
                  : format === "quiz"
                    ? "مجموعة تفاعلية"
                    : "لينك"}
              </strong>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  if (
                    dirty &&
                    !window.confirm("فيه أسئلة ماتحفظتش. تغيّر النوع؟")
                  )
                    return;
                  setFormat("");
                  setDirty(false);
                }}
              >
                غيّر نوع المصدر
              </button>
            </div>
          )}
          {format === "quiz" && (
            <QuizEditor
              courseId={courseId}
              slug={slug}
              lectures={lectures}
              placement={placement}
              canPublish={canPublish}
              canSubmit={canSubmit}
              onDirtyChange={setDirty}
            />
          )}
          {(format === "link" || format === "pdf") && (
            <ActionForm
              key={`${materialType}-${format}`}
              action={submitResource.bind(null, slug)}
              className="panel"
            >
              <input type="hidden" name="course_id" value={courseId} />
              <input type="hidden" name="type" value={materialType} />
              <input type="hidden" name="area" value={placement.area} />
              {placement.lectures.map((id) => (
                <input type="hidden" name="lectures" value={id} key={id} />
              ))}
              <label className="field">
                عنوان المصدر
                <input
                  name="title"
                  required
                  minLength={4}
                  maxLength={160}
                  dir="auto"
                  placeholder="عنوان واضح يسهّل الوصول للمصدر"
                />
              </label>
              {format === "link" ? (
                <label className="field">
                  لينك المصدر
                  <input
                    name="external_url"
                    type="url"
                    required
                    dir="ltr"
                    placeholder="https://…"
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
          )}
        </>
      )}
    </div>
  );
}
