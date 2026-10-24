import { z } from "zod";
export const MAX_QUIZ_BYTES = 262144;
const reservedIds = new Set([
  ...Object.getOwnPropertyNames(Object.prototype),
  "prototype",
]);
const key = z
  .string()
  .regex(
    /^[A-Za-z0-9_-]{1,64}$/,
    "المعرّف لازم يكون حروف إنجليزي أو أرقام أو شرطة",
  )
  .refine(
    (id) => !reservedIds.has(id),
    "المعرّف محجوز؛ استخدم معرّف زي q1 أو option1",
  );
const base = {
  id: key,
  prompt: z.string().max(3000),
  explanation: z.string().max(2000).default(""),
  points: z.number().int().min(1).max(10).default(1),
  source: z.string().max(500).default(""),
};
const mcq = z.strictObject({
  ...base,
  type: z.literal("mcq"),
  options: z
    .array(z.strictObject({ id: key, text: z.string().max(500) }))
    .min(2)
    .max(8),
  correctOptionIds: z.array(key).max(8).nullable(),
});
const tf = z.strictObject({
  ...base,
  type: z.literal("true_false"),
  answer: z.boolean().nullable(),
});
const written = z.strictObject({
  ...base,
  type: z.literal("written"),
  grading: z.enum(["exact", "self"]).default("self"),
  modelAnswer: z.string().max(3000),
  acceptedAnswers: z
    .array(z.string().trim().min(1).max(500))
    .max(20)
    .default([]),
});
export const questionSchema = z.discriminatedUnion("type", [mcq, tf, written]);
export type QuizQuestion = z.infer<typeof questionSchema>;
export const quizDraftSchema = z
  .strictObject({
    format: z.literal("elzatona.quiz"),
    version: z.literal(1),
    title: z.string().trim().min(4).max(160),
    description: z.string().max(2000).default(""),
    language: z.enum(["ar", "en", "mixed"]).default("mixed"),
    aiAssisted: z.boolean().default(false),
    questions: z
      .array(questionSchema)
      .min(1, "ضيف سؤال واحد على الأقل")
      .max(100, "الحد الأقصى ١٠٠ سؤال"),
  })
  .superRefine((doc, ctx) => {
    if (
      new TextEncoder().encode(JSON.stringify(doc, null, 1)).length >
      MAX_QUIZ_BYTES
    )
      ctx.addIssue({
        code: "custom",
        message: "المجموعة أكبر من ٢٥٦ كيلوبايت",
      });
    const ids = new Set<string>();
    doc.questions.forEach((q, i) => {
      if (ids.has(q.id))
        ctx.addIssue({
          code: "custom",
          path: ["questions", i, "id"],
          message: "معرّف السؤال مكرر",
        });
      ids.add(q.id);
      if (q.type === "mcq") {
        const optionIds = new Set(q.options.map((o) => o.id));
        if (optionIds.size !== q.options.length)
          ctx.addIssue({
            code: "custom",
            path: ["questions", i, "options"],
            message: "معرّفات الاختيارات مكررة",
          });
        if (
          q.correctOptionIds &&
          (new Set(q.correctOptionIds).size !== q.correctOptionIds.length ||
            q.correctOptionIds.some((id) => !optionIds.has(id)))
        )
          ctx.addIssue({
            code: "custom",
            path: ["questions", i, "correctOptionIds"],
            message: "الإجابة الصحيحة لازم تشير لاختيار موجود، من غير تكرار",
          });
      }
    });
  });
export type QuizDocument = z.infer<typeof quizDraftSchema>;
export const quizPublishSchema = quizDraftSchema.superRefine((doc, ctx) => {
  doc.questions.forEach((q, i) => {
    const issue = (field: string, message: string) =>
      ctx.addIssue({ code: "custom", path: ["questions", i, field], message });
    if (!q.prompt.trim()) issue("prompt", "اكتب نص السؤال");
    if (q.type === "mcq") {
      if (q.options.some((o) => !o.text.trim()))
        issue("options", "اكتب نص كل الاختيارات");
      if (!q.correctOptionIds?.length)
        issue("correctOptionIds", "حدّد الإجابة الصحيحة قبل النشر");
    } else if (q.type === "true_false" && q.answer === null)
      issue("answer", "حدّد صح ولا غلط قبل النشر");
    else if (q.type === "written") {
      if (!q.modelAnswer.trim()) issue("modelAnswer", "اكتب إجابة نموذجية");
      if (q.grading === "exact" && !q.acceptedAnswers.length)
        issue(
          "acceptedAnswers",
          "ضيف إجابة مقبولة واحدة على الأقل للتصحيح التلقائي",
        );
    }
  });
});
export function importQuiz(text: string) {
  if (new TextEncoder().encode(text).length > MAX_QUIZ_BYTES)
    throw Error("الملف أكبر من ٢٥٦ كيلوبايت");
  let value: unknown;
  try {
    value = JSON.parse(
      text
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, ""),
    );
  } catch {
    throw Error(
      "صيغة JSON مش سليمة. راجع الأقواس والفواصل أو استخدم ملف المثال.",
    );
  }
  return quizDraftSchema.parse(value);
}
export function quizIssues(error: z.ZodError) {
  return error.issues.slice(0, 8).map((issue) => {
    const index =
      issue.path[0] === "questions" && typeof issue.path[1] === "number"
        ? issue.path[1]
        : null;
    return {
      index,
      message: `${index === null ? "المجموعة" : `السؤال ${index + 1}`} · ${issue.message}`,
    };
  });
}
export type PublicQuestion = Pick<
  QuizQuestion,
  "id" | "type" | "prompt" | "points" | "source"
> & {
  options?: { id: string; text: string }[];
  multiple?: boolean;
  grading?: "exact" | "self";
};
export type PublicQuiz = {
  resourceId: string;
  revision: number;
  title: string;
  description: string;
  questions: PublicQuestion[];
};
export type Answer = string | string[] | boolean | null;
export type Answers = Record<string, Answer>;
export type Feedback = {
  id: string;
  type: QuizQuestion["type"];
  status: "correct" | "incorrect" | "unanswered" | "self";
  points: number;
  explanation: string;
  correctOptionIds?: string[];
  answer?: boolean;
  modelAnswer?: string;
  acceptedAnswers?: string[];
};
export const submittedAnswersSchema = z
  .array(
    z.strictObject({
      id: key,
      answer: z.union([
        z.string().max(3000),
        z.array(key).max(8),
        z.boolean(),
        z.null(),
      ]),
    }),
  )
  .min(1)
  .max(100)
  .refine((a) => new Set(a.map((q) => q.id)).size === a.length, "السؤال مكرر");
export const hasAnswer = (a: Answer | undefined) =>
  a !== null &&
  a !== undefined &&
  (Array.isArray(a)
    ? a.length > 0
    : typeof a === "string"
      ? a.trim().length > 0
      : true);
export function publicQuiz(
  doc: QuizDocument,
  resourceId = "local",
  revision = 1,
): PublicQuiz {
  return {
    resourceId,
    revision,
    title: doc.title,
    description: doc.description,
    questions: doc.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      points: q.points,
      source: q.source,
      ...(q.type === "mcq"
        ? {
            options: q.options,
            multiple: (q.correctOptionIds?.length || 0) > 1,
          }
        : q.type === "written"
          ? { grading: q.grading }
          : {}),
    })),
  };
}
// Author preview only; public attempts are evaluated by the database.
export function previewGrade(
  doc: QuizDocument,
  submitted: { id: string; answer: Answer }[],
): Feedback[] {
  return submitted.map((a) => {
    const q = doc.questions.find((q) => q.id === a.id)!;
    const result: Feedback = {
      id: q.id,
      type: q.type,
      status: "unanswered",
      points: q.points,
      explanation: q.explanation,
    };
    if (q.type === "mcq") {
      result.correctOptionIds = q.correctOptionIds || [];
      if (hasAnswer(a.answer))
        result.status =
          Array.isArray(a.answer) &&
          [...a.answer].sort().join("|") ===
            [...(q.correctOptionIds || [])].sort().join("|")
            ? "correct"
            : "incorrect";
    } else if (q.type === "true_false") {
      result.answer = q.answer!;
      if (hasAnswer(a.answer))
        result.status = a.answer === q.answer ? "correct" : "incorrect";
    } else {
      result.modelAnswer = q.modelAnswer;
      result.acceptedAnswers = q.acceptedAnswers;
      if (hasAnswer(a.answer))
        result.status =
          q.grading === "self"
            ? "self"
            : q.acceptedAnswers.some(
                  (v) =>
                    v.trim().toLowerCase().replace(/\s+/g, " ") ===
                    String(a.answer).trim().toLowerCase().replace(/\s+/g, " "),
                )
              ? "correct"
              : "incorrect";
    }
    return result;
  });
}
