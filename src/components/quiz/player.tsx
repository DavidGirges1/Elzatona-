"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Flag,
  Grid2X2,
  RotateCcw,
  Check,
} from "lucide-react";
import { z } from "zod";
import { checkQuizAnswers } from "@/lib/quiz/actions";
import {
  hasAnswer,
  previewGrade,
  type PublicQuiz,
  type QuizDocument,
  type Answers,
  type Feedback,
} from "@/lib/quiz/schema";
import { AnswerValues } from "./answer-values";
import { contentDirection, answerText } from "@/lib/quiz/direction";
import { AnswerInput } from "./answer-input";
import { QuizFeedback } from "./feedback";
const number = (v: number) => new Intl.NumberFormat("ar-EG").format(v);
const draftSchema = z.object({
  at: z.number(),
  index: z.number().int().min(0),
  answers: z.record(
    z.string(),
    z.union([
      z.string().max(3000),
      z.array(z.string().max(64)).max(8),
      z.boolean(),
      z.null(),
    ]),
  ),
  flags: z.array(z.string()).max(100),
});
type Draft = z.infer<typeof draftSchema>;
export function QuizPlayer({
  quiz,
  mode,
  coursePath,
  localDocument,
}: {
  quiz: PublicQuiz;
  mode: "practice" | "exam";
  coursePath: string;
  localDocument?: QuizDocument;
}) {
  const [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<Answers>({}),
    [flags, setFlags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<Record<string, Feedback>>({}),
    [selfMarks, setSelfMarks] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false),
    [error, setError] = useState(""),
    [stale, setStale] = useState(false);
  const [resume, setResume] = useState<Draft | null>(null),
    [loaded, setLoaded] = useState(false),
    [filter, setFilter] = useState("all");
  const [pending, startTransition] = useTransition();
  const heading = useRef<HTMLHeadingElement>(null),
    map = useRef<HTMLDetailsElement>(null),
    confirm = useRef<HTMLDialogElement>(null);
  const latestDraft = useRef<string | null>(null);
  const storageKey = `elzatona.quiz.${quiz.resourceId}.${quiz.revision}.${mode}`;
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      try {
        const raw = !localDocument && sessionStorage.getItem(storageKey);
        const parsed =
          raw && raw.length < 350000
            ? draftSchema.safeParse(JSON.parse(raw))
            : null;
        if (
          parsed &&
          parsed.success &&
          Date.now() - parsed.data.at < 86400000 &&
          parsed.data.index < quiz.questions.length
        ) {
          const ids = new Set(quiz.questions.map((q) => q.id));
          if (Object.keys(parsed.data.answers).every((id) => ids.has(id)))
            setResume(parsed.data);
        }
      } catch {
        /* Storage may be unavailable; solving still works. */
      }
      setLoaded(true);
    });
    return () => {
      active = false;
    };
  }, [storageKey, quiz.questions, localDocument]);
  useEffect(() => {
    if (!loaded || resume || localDocument) return;
    latestDraft.current = finished
      ? null
      : JSON.stringify({ at: Date.now(), index, answers, flags });
    const timer = window.setTimeout(() => {
      try {
        if (latestDraft.current)
          sessionStorage.setItem(storageKey, latestDraft.current);
        else sessionStorage.removeItem(storageKey);
      } catch {
        /* Keep the in-memory attempt usable. */
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [
    loaded,
    resume,
    index,
    answers,
    flags,
    finished,
    storageKey,
    localDocument,
  ]);
  useEffect(() => {
    if (localDocument) return;
    const save = () => {
      try {
        if (latestDraft.current)
          sessionStorage.setItem(storageKey, latestDraft.current);
      } catch {
        /* Best effort recovery only. */
      }
    };
    window.addEventListener("pagehide", save);
    return () => {
      save();
      window.removeEventListener("pagehide", save);
    };
  }, [storageKey, localDocument]);
  const answered = quiz.questions.filter((q) =>
    hasAnswer(answers[q.id]),
  ).length;
  const current = quiz.questions[index];
  function navigate(n: number) {
    setIndex(n);
    setError("");
    if (map.current) map.current.open = false;
    window.requestAnimationFrame(() => {
      heading.current?.focus({ preventScroll: true });
      heading.current?.scrollIntoView({ block: "start" });
    });
  }
  function grade(all = false) {
    setError("");
    startTransition(async () => {
      try {
        const selected = (all ? quiz.questions : [current]).map((q) => ({
          id: q.id,
          answer: answers[q.id] ?? null,
        }));
        const r: { feedback?: Feedback[]; error?: string; stale?: boolean } =
          localDocument
            ? { feedback: previewGrade(localDocument, selected) }
            : await checkQuizAnswers(quiz.resourceId, quiz.revision, selected);
        if (r.error) {
          setError(r.error);
          if ("stale" in r && r.stale) setStale(true);
          return;
        }
        const items = Object.fromEntries(
          (r.feedback || []).map((item) => [item.id, item]),
        );
        setFeedback((old) => ({ ...old, ...items }));
        if (all) {
          setFinished(true);
          confirm.current?.close();
          window.scrollTo({ top: 0 });
        }
      } catch {
        setError("الاتصال انقطع. إجاباتك لسه موجودة؛ جرّب التصحيح تاني.");
      }
    });
  }
  function restart() {
    setFinished(false);
    setIndex(0);
    setAnswers({});
    setFeedback({});
    setSelfMarks({});
    setFlags([]);
    setError("");
    setStale(false);
    setFilter("all");
  }
  const setSelf = (id: string, value: boolean) =>
    setSelfMarks((old) => ({ ...old, [id]: value }));
  if (!loaded)
    return (
      <div className="panel" role="status">
        جاري تجهيز الأسئلة…
      </div>
    );
  if (resume)
    return (
      <section className="panel quiz-resume">
        <span className="type-chip sky">محاولتك لسه موجودة</span>
        <h1 dir={contentDirection(quiz.title)}>{quiz.title}</h1>
        <p>فيه إجابات محفوظة من نفس الجلسة. تحب تستكمل؟</p>
        <div className="actions">
          <button
            className="button primary"
            onClick={() => {
              setAnswers(resume.answers);
              setIndex(resume.index);
              setFlags(resume.flags);
              setResume(null);
            }}
          >
            استكمل الحل
          </button>
          <button
            className="button secondary"
            onClick={() => {
              setResume(null);
              restart();
            }}
          >
            ابدأ من جديد
          </button>
        </div>
      </section>
    );
  const errors = error && (
    <p className="form-error" role="alert">
      {error}
      {stale && (
        <a
          className="button secondary"
          href={
            typeof location !== "undefined"
              ? location.pathname + location.search
              : ""
          }
        >
          افتح النسخة الجديدة
        </a>
      )}
    </p>
  );
  if (finished) {
    const pendingSelf = quiz.questions.filter(
      (q) => feedback[q.id]?.status === "self" && selfMarks[q.id] === undefined,
    ).length;
    const earned = quiz.questions.reduce(
      (sum, q) =>
        sum +
        (feedback[q.id]?.status === "correct" ||
        (feedback[q.id]?.status === "self" && selfMarks[q.id] === true)
          ? q.points
          : 0),
      0,
    );
    const total = quiz.questions.reduce((sum, q) => sum + q.points, 0);
    const incorrect = (id: string) =>
      ["incorrect", "unanswered"].includes(feedback[id]?.status) ||
      (feedback[id]?.status === "self" && selfMarks[id] === false);
    const visible = quiz.questions.filter(
      (q) =>
        filter === "all" ||
        (filter === "wrong"
          ? incorrect(q.id)
          : feedback[q.id]?.status === "self"),
    );
    return (
      <div className="quiz-player quiz-results">
        {!localDocument && (
          <Link className="breadcrumb" href={coursePath}>
            <ArrowRight size={16} />
            ارجع للمصدر
          </Link>
        )}
        <section className="panel quiz-result-summary">
          <span className="type-chip mint">
            <Check size={16} />
            خلصت المحاولة
          </span>
          <h1>
            {pendingSelf ? "باقي تقييم الإجابات الكتابية" : "دي نتيجة محاولتك"}
          </h1>
          <p className="quiz-result-score">
            {number(earned)}{" "}
            <span>
              من {number(total)} درجة
              {pendingSelf ? " · لسه فيه تقييم ذاتي" : ""}
            </span>
          </p>
          {pendingSelf > 0 && (
            <p>
              {number(pendingSelf)} إجابة كتابية محتاجة تقارنها بالنموذج
              وتقيّمها. النتيجة النهائية هتكتمل بعدها.
            </p>
          )}
          <div className="actions">
            <button
              type="button"
              className="button secondary"
              onClick={restart}
            >
              <RotateCcw size={18} />
              حلّها تاني
            </button>
            {!localDocument && (
              <Link className="text-link" href={coursePath}>
                شارك أو اسأل عن المجموعة
              </Link>
            )}
          </div>
        </section>
        <div
          className="quiz-review-tabs"
          role="group"
          aria-label="فلترة مراجعة الإجابات"
        >
          {[
            ["all", "كل الأسئلة"],
            ["wrong", "المحتاج مراجعة"],
            ["self", "التقييم الذاتي"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className="button secondary"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {!visible.length && <p className="panel">مفيش أسئلة في الاختيار ده.</p>}
        {visible.map((q) => (
          <section className="panel quiz-review-question" key={q.id}>
            <h2 className="quiz-text" dir={contentDirection(q.prompt)}>
              {q.prompt}
            </h2>
            <p className="muted small">إجابتك</p>
            <AnswerValues values={answerText(q, answers[q.id])} />
            <QuizFeedback
              question={q}
              result={feedback[q.id]}
              selfMark={selfMarks[q.id]}
              onSelfMark={(value) => setSelf(q.id, value)}
            />
          </section>
        ))}
      </div>
    );
  }
  return (
    <div className="quiz-player">
      {!localDocument && (
        <Link className="breadcrumb" href={coursePath}>
          <ArrowRight size={16} />
          ارجع للمصدر
        </Link>
      )}
      <header className="quiz-top">
        <div>
          <span
            className={`type-chip ${mode === "practice" ? "mint" : "sunshine"}`}
          >
            {localDocument ? "معاينة خاصة · " : ""}
            {mode === "practice" ? "تدرّب" : "اختبر نفسك"}
          </span>
          <h1 dir={contentDirection(quiz.title)}>{quiz.title}</h1>
        </div>
        <details ref={map} className="quiz-map">
          <summary className="button secondary">
            <Grid2X2 size={18} />
            خريطة الأسئلة
          </summary>
          <div className="quiz-map-grid">
            {quiz.questions.map((q, n) => (
              <button
                type="button"
                key={q.id}
                className={`quiz-map-number ${hasAnswer(answers[q.id]) ? "answered" : ""} ${flags.includes(q.id) ? "flagged" : ""}`}
                aria-label={`السؤال ${n + 1}${hasAnswer(answers[q.id]) ? "، له إجابة" : "، بدون إجابة"}${flags.includes(q.id) ? "، للمراجعة" : ""}`}
                aria-current={n === index ? "step" : undefined}
                onClick={() => navigate(n)}
              >
                {number(n + 1)}
              </button>
            ))}
          </div>
        </details>
      </header>
      <div className="quiz-progress">
        <progress
          max={quiz.questions.length}
          value={answered}
          aria-label="عدد الأسئلة المجاوبة"
        />
        <span>
          جاوبت {number(answered)} من {number(quiz.questions.length)}
        </span>
      </div>
      <section className="panel quiz-question">
        <div className="section-head">
          <span className="muted">
            سؤال {number(index + 1)} من {number(quiz.questions.length)} ·{" "}
            {number(current.points)} درجة
          </span>
          <button
            type="button"
            className="quiz-flag"
            aria-pressed={flags.includes(current.id)}
            onClick={() =>
              setFlags((old) =>
                old.includes(current.id)
                  ? old.filter((id) => id !== current.id)
                  : [...old, current.id],
              )
            }
          >
            <Flag size={18} />
            {flags.includes(current.id) ? "متعلّم للمراجعة" : "علّم للمراجعة"}
          </button>
        </div>
        <h2
          ref={heading}
          tabIndex={-1}
          dir={contentDirection(current.prompt)}
          className="quiz-text quiz-prompt"
        >
          {current.prompt}
        </h2>
        {current.multiple && (
          <p className="muted small">اختار كل الإجابات الصحيحة.</p>
        )}
        <AnswerInput
          question={current}
          value={answers[current.id]}
          disabled={pending || (mode === "practice" && !!feedback[current.id])}
          onChange={(value) =>
            setAnswers((old) => ({ ...old, [current.id]: value }))
          }
        />
        {current.source && (
          <p className="muted small" dir={contentDirection(current.source)}>
            {current.source}
          </p>
        )}
        {mode === "practice" && feedback[current.id] && (
          <QuizFeedback
            result={feedback[current.id]}
            question={current}
            selfMark={selfMarks[current.id]}
            onSelfMark={(value) => setSelf(current.id, value)}
          />
        )}
        {errors}
      </section>
      <div className="quiz-controls">
        <button
          type="button"
          className="button secondary"
          disabled={index === 0 || pending}
          onClick={() => navigate(index - 1)}
        >
          <ArrowRight size={18} />
          السابق
        </button>
        {mode === "practice" && !feedback[current.id] ? (
          <button
            type="button"
            className="button primary"
            disabled={!hasAnswer(answers[current.id]) || pending || stale}
            onClick={() => grade()}
          >
            {pending ? "جاري التصحيح…" : "صحّح إجابتي"}
            <Check size={18} />
          </button>
        ) : (
          <button
            type="button"
            className="button primary"
            disabled={pending || stale}
            onClick={() =>
              index < quiz.questions.length - 1
                ? navigate(index + 1)
                : confirm.current?.showModal()
            }
          >
            {index < quiz.questions.length - 1
              ? "التالي"
              : mode === "exam"
                ? "راجع وسلّم"
                : "اعرض النتيجة"}
            <ArrowLeft size={18} />
          </button>
        )}
      </div>
      <div className="quiz-quiet-actions">
        {mode === "practice" &&
          (feedback[current.id] ? (
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setSelfMarks((old) => {
                  const next = { ...old };
                  delete next[current.id];
                  return next;
                });
                setFeedback((old) => {
                  const next = { ...old };
                  delete next[current.id];
                  return next;
                });
              }}
            >
              عدّل الإجابة وجرّب تاني
            </button>
          ) : (
            <button
              type="button"
              className="text-link"
              onClick={() =>
                index < quiz.questions.length - 1
                  ? navigate(index + 1)
                  : confirm.current?.showModal()
              }
            >
              عدّي السؤال دلوقتي
            </button>
          ))}
        <span className="muted small">
          {mode === "exam"
            ? "التصحيح بعد تسليم كل الإجابات"
            : "التصحيح بعد كل سؤال"}{" "}
          · الحفظ للجلسة الحالية
        </span>
      </div>
      <dialog className="confirm-dialog" ref={confirm}>
        <h2>{mode === "exam" ? "جاهز تسلّم؟" : "اعرض مراجعة المحاولة؟"}</h2>
        <p>
          جاوبت {number(answered)} من {number(quiz.questions.length)} سؤال.
          {answered < quiz.questions.length &&
            ` فيه ${number(quiz.questions.length - answered)} سؤال من غير إجابة.`}
        </p>
        {error && <p className="form-error">{error}</p>}
        <button
          type="button"
          className="button primary"
          disabled={pending || stale}
          onClick={() => grade(true)}
        >
          {pending ? "جاري التصحيح…" : "سلّم وشوف النتيجة"}
        </button>
        <button
          type="button"
          className="button ghost"
          disabled={pending}
          onClick={() => confirm.current?.close()}
        >
          ارجع للحل
        </button>
      </dialog>
    </div>
  );
}
