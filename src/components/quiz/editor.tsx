"use client";
import { PlacementFields } from "@/components/placement-fields";
import type { Placement, LectureOption } from "@/lib/placement";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, Download } from "lucide-react";
import { contentDirection } from "@/lib/quiz/direction";
import { z } from "zod";
import { saveQuizDocument, type QuizSaveState } from "@/lib/quiz/actions";
import {
  importQuiz,
  quizPublishSchema,
  quizIssues,
  publicQuiz,
  type QuizDocument,
  type QuizQuestion,
  MAX_QUIZ_BYTES,
} from "@/lib/quiz/schema";
import { conversionPrompt } from "@/lib/quiz/example";
import dynamic from "next/dynamic";
import { downloadQuiz } from "./download";
const QuizPlayer = dynamic(() => import("./player").then((m) => m.QuizPlayer), {
  loading: () => <p role="status">جاري تجهيز المعاينة…</p>,
});
const newQuestion = (type: QuizQuestion["type"]): QuizQuestion => {
  const base = {
    id: `q_${crypto.randomUUID().slice(0, 8)}`,
    prompt: "",
    explanation: "",
    points: 1,
    source: "",
  };
  return type === "mcq"
    ? {
        ...base,
        type,
        options: [
          { id: "a", text: "" },
          { id: "b", text: "" },
        ],
        correctOptionIds: null,
      }
    : type === "true_false"
      ? { ...base, type, answer: null }
      : {
          ...base,
          type,
          grading: "self",
          modelAnswer: "",
          acceptedAnswers: [],
        };
};
export function QuizEditor({
  courseId,
  slug,
  lectures,
  placement,
  initialPlacement,
  canPublish,
  canSubmit = true,
  initial,
  resourceId = "",
  published: initiallyPublished = false,
  submitted: initiallySubmitted = false,
  readOnly = false,
  onDirtyChange,
}: {
  courseId: string;
  slug: string;
  lectures: LectureOption[];
  placement?: Placement;
  initialPlacement?: Partial<Placement>;
  canPublish: boolean;
  canSubmit?: boolean;
  initial?: QuizDocument;
  resourceId?: string;
  published?: boolean;
  submitted?: boolean;
  readOnly?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [published, setPublished] = useState(initiallyPublished);
  const [submitted, setSubmitted] = useState(initiallySubmitted);
  const [doc, setDoc] = useState<QuizDocument>(
    initial || {
      format: "elzatona.quiz",
      version: 1,
      title: "",
      description: "",
      language: "mixed",
      aiAssisted: false,
      questions: [
        {
          id: "q1",
          type: "mcq",
          prompt: "",
          explanation: "",
          points: 1,
          source: "",
          options: [
            { id: "a", text: "" },
            { id: "b", text: "" },
          ],
          correctOptionIds: null,
        },
      ],
    },
  );
  const [index, setIndex] = useState(0),
    [id, setId] = useState(resourceId),
    [location, setLocation] = useState<Partial<Placement>>(
      initialPlacement || {},
    ),
    [rights, setRights] = useState(false);
  const [state, setState] = useState<QuizSaveState>({}),
    [json, setJson] = useState(""),
    [notice, setNotice] = useState(""),
    [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState<QuizDocument | null>(null),
    [previewMode, setPreviewMode] = useState<"practice" | "exam">("practice");
  const [pending, startTransition] = useTransition();
  const replaceDialog = useRef<HTMLDialogElement>(null),
    deleteDialog = useRef<HTMLDialogElement>(null),
    pendingImport = useRef<QuizDocument | null>(null);
  const q = doc.questions[index];
  const documentDirection = doc.language === "ar" ? "rtl" : "ltr";
  const questionDirection = contentDirection(q.prompt, documentDirection);
  const path = `/courses/${slug}`;
  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function update(next: QuizDocument) {
    setDoc(next);
    setDirty(true);
    setState({});
    setNotice("");
  }
  function updateQuestion(next: QuizQuestion) {
    update({
      ...doc,
      questions: doc.questions.map((old, n) => (n === index ? next : old)),
    });
  }
  function importText(text: string) {
    try {
      pendingImport.current = importQuiz(text);
      replaceDialog.current?.showModal();
    } catch (e) {
      setState(
        e instanceof z.ZodError
          ? { error: "راجع تنسيق الملف.", issues: quizIssues(e) }
          : { error: e instanceof Error ? e.message : "الملف مش صالح." },
      );
    }
  }
  const normalizedDoc = () => ({
    ...doc,
    questions: doc.questions.map((q) =>
      q.type === "written"
        ? {
            ...q,
            acceptedAnswers: q.acceptedAnswers
              .map((a) => a.trim())
              .filter(Boolean),
          }
        : q,
    ),
  });
  function showPreview() {
    const parsed = quizPublishSchema.safeParse(normalizedDoc());
    if (!parsed.success) {
      setState({
        error: "كمّل الأسئلة وإجاباتها عشان تقدر تجرّب المجموعة.",
        issues: quizIssues(parsed.error),
      });
      return;
    }
    setPreview(parsed.data);
  }
  function save(intent: "draft" | "publish") {
    setState({});
    startTransition(async () => {
      try {
        const data = new FormData();
        data.set("document", JSON.stringify(normalizedDoc()));
        data.set("resource", id);
        const selectedPlacement = placement || location;
        data.set("area", selectedPlacement.area || "");
        for (const lecture of selectedPlacement.lectures || [])
          data.append("lectures", lecture);
        data.set("intent", intent);
        if (rights) data.set("rights", "on");
        const result = await saveQuizDocument(courseId, slug, {}, data);
        setState(result);
        if (result.id) {
          setId(result.id);
          setSubmitted(!!result.submitted);
          if (result.published) setPublished(true);
          setDirty(false);
          setNotice(
            result.published
              ? "اتنشرت المجموعة. تقدر تشارك لينكها دلوقتي."
              : result.submitted
                ? "اتبعتت المجموعة للمراجعة. هتظهر لدفعتك بعد الموافقة."
                : "اتحفظت نسخة خاصة في مجموعات أسئلتي.",
          );
        }
      } catch {
        setState({
          error: "الاتصال انقطع. الأسئلة لسه في الصفحة؛ جرّب الحفظ تاني.",
        });
      }
    });
  }
  if (preview)
    return (
      <div>
        <div className="quiz-preview-banner">
          <span>معاينة خاصة · مش منشورة</span>
          <button
            type="button"
            className="button secondary"
            onClick={() => setPreview(null)}
          >
            ارجع للتعديل
          </button>
        </div>
        <QuizPlayer
          quiz={publicQuiz(preview)}
          localDocument={preview}
          mode={previewMode}
          coursePath={`${path}/submit`}
        />
      </div>
    );
  return (
    <div className="quiz-editor">
      <div className="section-head">
        <div>
          <h2>{readOnly ? "مراجعة مجموعة الأسئلة" : "ابني مجموعة أسئلتك"}</h2>
          <p className="muted">
            ابدأ بسؤال واحد، أو استورد بنك أسئلة بصيغة الزتونة.
          </p>
        </div>
        <Link className="text-link" href="/my-quizzes">
          مجموعات أسئلتي
        </Link>
      </div>
      {submitted && !published && (
        <p className="notice">
          المجموعة منتظرة المراجعة. تقدر تعدّل وتعيد الإرسال؛ حفظ نسخة خاصة
          هيسحبها من المراجعة.
        </p>
      )}
      {published && (
        <p className="notice">
          المجموعة منشورة. أي تعديل محفوظ هيحدّث النسخة اللي بيشوفها الطلاب؛
          المحاولات المفتوحة هتحتاج تبدأ من النسخة الجديدة.
        </p>
      )}
      <fieldset disabled={readOnly || pending} className="quiz-editor-fields">
        <section className="panel">
          <label className="field">
            اسم المجموعة
            <input
              value={doc.title}
              maxLength={160}
              dir={contentDirection(doc.title, documentDirection)}
              onChange={(e) => update({ ...doc, title: e.target.value })}
              placeholder="مثال: مراجعة أول محاضرتين"
            />
          </label>
          <label className="field">
            وصف اختياري
            <textarea
              value={doc.description}
              maxLength={2000}
              dir={contentDirection(doc.description, documentDirection)}
              onChange={(e) => update({ ...doc, description: e.target.value })}
            />
          </label>
          <div className="filters">
            {!placement && (
              <PlacementFields
                lectures={lectures}
                slug={slug}
                initial={initialPlacement}
                quiz
                onChange={(p) => {
                  setLocation(p);
                  setDirty(true);
                }}
              />
            )}
            <label className="field">
              لغة الأسئلة
              <select
                value={doc.language}
                onChange={(e) =>
                  update({
                    ...doc,
                    language: e.target.value as QuizDocument["language"],
                  })
                }
              >
                <option value="mixed">عربي وإنجليزي</option>
                <option value="ar">عربي</option>
                <option value="en">إنجليزي</option>
              </select>
            </label>
          </div>
          <label className="check">
            <input
              type="checkbox"
              checked={doc.aiAssisted}
              onChange={(e) => update({ ...doc, aiAssisted: e.target.checked })}
            />
            اتعملت بمساعدة AI، وراجعت المحتوى
          </label>
        </section>
        <details className="panel quiz-import">
          <summary className="text-link">
            عندك بنك أسئلة جاهز؟ استورد JSON
          </summary>
          <p>
            انسخ تعليمات التحويل لأداة تختارها، وارفع بنك الأسئلة هناك. راجع
            الناتج هنا قبل مشاركته.
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(conversionPrompt);
                setNotice("اتنسخت تعليمات التحويل.");
              } catch {
                setNotice("افتح دليل الصيغة وانسخ التعليمات يدويًا.");
              }
            }}
          >
            انسخ تعليمات التحويل
          </button>{" "}
          <Link className="text-link" href="/quiz-format" target="_blank">
            دليل الصيغة ومثال
          </Link>
          <label className="field">
            ملف JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > MAX_QUIZ_BYTES)
                  setState({ error: "حجم الملف أكبر من ٢٥٦ كيلوبايت." });
                else importText(await file.text());
                e.target.value = "";
              }}
            />
          </label>
          <label className="field">
            أو الصق JSON
            <textarea
              dir="ltr"
              value={json}
              aria-label="أو الصق JSON"
              maxLength={MAX_QUIZ_BYTES}
              onChange={(e) => setJson(e.target.value)}
              placeholder={'{"format":"elzatona.quiz",…}'}
            />
          </label>
          <button
            type="button"
            className="button secondary"
            disabled={!json.trim()}
            onClick={() => importText(json)}
          >
            راجع واستورد
          </button>
          <p className="muted small">
            الاستيراد بيستبدل الأسئلة الحالية. الإجابات الناقصة مسموحة في
            المسودة فقط.
          </p>
        </details>
        <div className="quiz-editor-layout">
          <nav className="panel quiz-editor-map" aria-label="أسئلة المجموعة">
            {doc.questions.map((question, n) => (
              <button
                type="button"
                key={question.id}
                className="quiz-editor-question-link"
                aria-current={n === index ? "step" : undefined}
                onClick={() => setIndex(n)}
              >
                <span>{new Intl.NumberFormat("ar-EG").format(n + 1)}</span>
                <bdi>{question.prompt || "سؤال جديد"}</bdi>
              </button>
            ))}
            <button
              type="button"
              className="button secondary"
              disabled={doc.questions.length >= 100}
              onClick={() => {
                update({
                  ...doc,
                  questions: [...doc.questions, newQuestion("mcq")],
                });
                setIndex(doc.questions.length);
              }}
            >
              <Plus size={18} />
              ضيف سؤال
            </button>
          </nav>
          <section className="panel quiz-question-editor">
            <div className="section-head">
              <h3>سؤال {new Intl.NumberFormat("ar-EG").format(index + 1)}</h3>
              <div className="actions">
                <button
                  type="button"
                  className="button ghost"
                  aria-label="حرّك السؤال للأعلى"
                  disabled={index === 0}
                  onClick={() => {
                    const list = [...doc.questions];
                    [list[index - 1], list[index]] = [
                      list[index],
                      list[index - 1],
                    ];
                    update({ ...doc, questions: list });
                    setIndex(index - 1);
                  }}
                >
                  <ArrowUp size={18} />
                </button>
                <button
                  type="button"
                  className="button ghost"
                  aria-label="حرّك السؤال للأسفل"
                  disabled={index === doc.questions.length - 1}
                  onClick={() => {
                    const list = [...doc.questions];
                    [list[index + 1], list[index]] = [
                      list[index],
                      list[index + 1],
                    ];
                    update({ ...doc, questions: list });
                    setIndex(index + 1);
                  }}
                >
                  <ArrowDown size={18} />
                </button>
                <button
                  type="button"
                  className="button ghost"
                  aria-label="احذف السؤال"
                  disabled={doc.questions.length === 1}
                  onClick={() => deleteDialog.current?.showModal()}
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <label className="field">
              نوع السؤال
              <select
                value={q.type}
                onChange={(e) => {
                  const next = newQuestion(
                    e.target.value as QuizQuestion["type"],
                  );
                  updateQuestion({
                    ...next,
                    id: q.id,
                    prompt: q.prompt,
                    explanation: q.explanation,
                    points: q.points,
                    source: q.source,
                  });
                }}
              >
                <option value="mcq">اختيار من متعدد</option>
                <option value="true_false">صح أو غلط</option>
                <option value="written">كتابي</option>
              </select>
            </label>
            <label className="field">
              نص السؤال
              <textarea
                value={q.prompt}
                aria-label="نص السؤال"
                maxLength={3000}
                dir={questionDirection}
                onChange={(e) =>
                  updateQuestion({ ...q, prompt: e.target.value })
                }
              />
            </label>
            {q.type === "mcq" && (
              <div className="quiz-edit-options">
                <p className="muted small">
                  علّم على الإجابة الصحيحة. ممكن تختار أكتر من إجابة.
                </p>
                {q.options.map((o, n) => (
                  <div
                    className="quiz-edit-option"
                    key={o.id}
                    dir={contentDirection(o.text, questionDirection)}
                  >
                    <input
                      type="checkbox"
                      aria-label={`الإجابة ${n + 1} صحيحة`}
                      checked={q.correctOptionIds?.includes(o.id) || false}
                      onChange={(e) =>
                        updateQuestion({
                          ...q,
                          correctOptionIds: e.target.checked
                            ? [...(q.correctOptionIds || []), o.id]
                            : (q.correctOptionIds || []).filter(
                                (id) => id !== o.id,
                              ),
                        })
                      }
                    />
                    <label className="field">
                      <span className="sr-only">اختيار {n + 1}</span>
                      <input
                        value={o.text}
                        maxLength={500}
                        dir={contentDirection(o.text, questionDirection)}
                        placeholder={`اختيار ${n + 1}`}
                        onChange={(e) =>
                          updateQuestion({
                            ...q,
                            options: q.options.map((old) =>
                              old.id === o.id
                                ? { ...old, text: e.target.value }
                                : old,
                            ),
                          })
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="button ghost"
                      aria-label={`احذف اختيار ${n + 1}`}
                      disabled={q.options.length <= 2}
                      onClick={() =>
                        updateQuestion({
                          ...q,
                          options: q.options.filter((old) => old.id !== o.id),
                          correctOptionIds: (q.correctOptionIds || []).filter(
                            (id) => id !== o.id,
                          ),
                        })
                      }
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-link"
                  disabled={q.options.length >= 8}
                  onClick={() =>
                    updateQuestion({
                      ...q,
                      options: [
                        ...q.options,
                        {
                          id: `o_${crypto.randomUUID().slice(0, 8)}`,
                          text: "",
                        },
                      ],
                    })
                  }
                >
                  ضيف اختيار
                </button>
              </div>
            )}
            {q.type === "true_false" && (
              <label className="field">
                الإجابة الصحيحة
                <select
                  value={q.answer === null ? "" : String(q.answer)}
                  onChange={(e) =>
                    updateQuestion({
                      ...q,
                      answer:
                        e.target.value === ""
                          ? null
                          : e.target.value === "true",
                    })
                  }
                >
                  <option value="">لسه محتاجة مراجعة</option>
                  <option value="true">صح</option>
                  <option value="false">غلط</option>
                </select>
              </label>
            )}
            {q.type === "written" && (
              <>
                <label className="field">
                  طريقة التصحيح
                  <select
                    value={q.grading}
                    onChange={(e) =>
                      updateQuestion({
                        ...q,
                        grading: e.target.value as "self" | "exact",
                      })
                    }
                  >
                    <option value="self">تقييم ذاتي بالمقارنة مع نموذج</option>
                    <option value="exact">مطابقة إجابة قصيرة</option>
                  </select>
                </label>
                <label className="field">
                  الإجابة النموذجية
                  <textarea
                    value={q.modelAnswer}
                    aria-label="الإجابة النموذجية"
                    maxLength={3000}
                    dir={contentDirection(q.modelAnswer, questionDirection)}
                    onChange={(e) =>
                      updateQuestion({ ...q, modelAnswer: e.target.value })
                    }
                  />
                </label>
                {q.grading === "exact" && (
                  <label className="field">
                    الإجابات المقبولة · كل إجابة في سطر
                    <textarea
                      value={q.acceptedAnswers.join("\n")}
                      dir={contentDirection(
                        q.acceptedAnswers.join("\n"),
                        questionDirection,
                      )}
                      maxLength={10000}
                      onChange={(e) =>
                        updateQuestion({
                          ...q,
                          acceptedAnswers: e.target.value.split("\n"),
                        })
                      }
                    />
                    <span className="muted small">
                      مطابقة النص بعد تجاهل حجم الحروف والمسافات الزائدة. مفيش
                      تصحيح بالذكاء الاصطناعي.
                    </span>
                  </label>
                )}
              </>
            )}
            <details>
              <summary className="text-link">
                تفسير ودرجات ومصدر اختياري
              </summary>
              <label className="field">
                تفسير الإجابة
                <textarea
                  value={q.explanation}
                  maxLength={2000}
                  dir={contentDirection(q.explanation, questionDirection)}
                  onChange={(e) =>
                    updateQuestion({ ...q, explanation: e.target.value })
                  }
                />
              </label>
              <label className="field">
                الدرجة
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={q.points}
                  onChange={(e) =>
                    updateQuestion({
                      ...q,
                      points: Math.max(
                        1,
                        Math.min(10, Number(e.target.value) || 1),
                      ),
                    })
                  }
                />
              </label>
              <label className="field">
                نسبة للمصدر
                <input
                  value={q.source}
                  maxLength={500}
                  dir={contentDirection(q.source, questionDirection)}
                  onChange={(e) =>
                    updateQuestion({ ...q, source: e.target.value })
                  }
                />
              </label>
            </details>
          </section>
        </div>
      </fieldset>
      {(state.error || state.issues) && (
        <div className="form-error" role="alert">
          <p>{state.error}</p>
          {state.issues?.map((issue, n) => (
            <button
              key={n}
              type="button"
              className="text-link quiz-issue"
              onClick={() => {
                if (issue.index !== null) setIndex(issue.index);
              }}
            >
              {issue.message}
            </button>
          ))}
        </div>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
          {state.id && (
            <Link
              className="text-link"
              href={
                state.published
                  ? `${path}/resources/${state.id}`
                  : state.submitted
                    ? "/my-contributions"
                    : "/my-quizzes"
              }
            >
              {" "}
              {state.submitted ? "تابع حالة المراجعة" : "افتح المجموعة"}
            </Link>
          )}
        </p>
      )}
      <section className="panel quiz-save">
        <div className="actions">
          <label className="field">
            معاينة
            <select
              value={previewMode}
              onChange={(e) =>
                setPreviewMode(e.target.value as "practice" | "exam")
              }
            >
              <option value="practice">تدرّب</option>
              <option value="exam">اختبر نفسك</option>
            </select>
          </label>
          <button
            type="button"
            className="button secondary"
            onClick={showPreview}
          >
            <Eye size={18} />
            جرّب الأسئلة
          </button>
          <button
            type="button"
            className="button ghost"
            onClick={() => downloadQuiz(normalizedDoc())}
          >
            <Download size={18} />
            نزّل JSON
          </button>
        </div>
        {!readOnly && (
          <>
            {canSubmit && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={rights}
                  onChange={(e) => setRights(e.target.checked)}
                />
                عندي حق مشاركة الأسئلة وراجعت الإجابات، ومفيهاش بيانات خاصة.
              </label>
            )}
            <div className="actions">
              {!published && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={pending}
                  onClick={() => {
                    if (
                      submitted &&
                      !window.confirm(
                        "هتسحب المجموعة من المراجعة وتحفظها كنسخة خاصة. تكمل؟",
                      )
                    )
                      return;
                    save("draft");
                  }}
                >
                  {pending
                    ? "جاري الحفظ…"
                    : submitted
                      ? "اسحب لنسخة خاصة"
                      : "احفظ نسخة خاصة"}
                </button>
              )}
              {canSubmit && (
                <button
                  type="button"
                  className="button primary"
                  disabled={pending || !rights}
                  onClick={() => save("publish")}
                >
                  {published
                    ? "حدّث المجموعة المنشورة"
                    : canPublish
                      ? "انشر لدفعتك"
                      : "ابعت للمراجعة"}
                </button>
              )}
              <span className="muted small">
                {dirty ? "فيه تعديلات لسه ماتحفظتش" : ""}
              </span>
            </div>
            {!canPublish && (
              <p className="muted small">
                تقدر تحتفظ بنسخة خاصة أو تبعت المجموعة للمراجعة. هتظهر للطلبة
                بعد الموافقة.
              </p>
            )}
          </>
        )}
      </section>
      <dialog ref={replaceDialog} className="confirm-dialog">
        <h2>تستبدل الأسئلة الحالية؟</h2>
        <p>
          الملف هيحل محل عنوان وأسئلة المجموعة في المحرّر. النشر أو النسخة
          المحفوظة مش هيتغيروا قبل ما تحفظ.
        </p>
        <button
          type="button"
          className="button primary"
          onClick={() => {
            if (pendingImport.current) {
              update(pendingImport.current);
              setIndex(0);
              setJson("");
              setNotice("اتستوردت الأسئلة. راجع الإجابات قبل النشر.");
            }
            replaceDialog.current?.close();
          }}
        >
          استبدل واستورد
        </button>
        <button
          type="button"
          className="button ghost"
          onClick={() => replaceDialog.current?.close()}
        >
          إلغاء
        </button>
      </dialog>
      <dialog ref={deleteDialog} className="confirm-dialog">
        <h2>تحذف السؤال ده؟</h2>
        <p>هتحتاج تحفظ عشان الحذف يتسجّل.</p>
        <button
          type="button"
          className="button primary"
          onClick={() => {
            update({
              ...doc,
              questions: doc.questions.filter((_, n) => n !== index),
            });
            setIndex(Math.max(0, index - 1));
            deleteDialog.current?.close();
          }}
        >
          احذف السؤال
        </button>
        <button
          type="button"
          className="button ghost"
          onClick={() => deleteDialog.current?.close()}
        >
          إلغاء
        </button>
      </dialog>
    </div>
  );
}
