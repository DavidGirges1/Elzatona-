"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { currentUser, createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";
import {
  importQuiz,
  quizIssues,
  quizPublishSchema,
  submittedAnswersSchema,
  type Feedback,
} from "./schema";
export type QuizSaveState = {
  error?: string;
  issues?: { index: number | null; message: string }[];
  id?: string;
  published?: boolean;
  submitted?: boolean;
};
export async function saveQuizDocument(
  courseId: string,
  slug: string,
  _state: QuizSaveState,
  form: FormData,
): Promise<QuizSaveState> {
  const user = await currentUser();
  if (!user) return { error: "سجّل دخولك عشان تحفظ مجموعتك." };
  const fields = z
    .object({
      document: z.string(),
      resource: z.union([idSchema, z.literal("")]),
      topic: z.union([idSchema, z.literal("")]),
      intent: z.enum(["draft", "publish"]),
    })
    .safeParse(Object.fromEntries(form));
  if (!fields.success || !idSchema.safeParse(courseId).success)
    return { error: "راجع بيانات المجموعة." };
  const { document: text, resource, topic, intent } = fields.data;
  let doc;
  try {
    doc = importQuiz(text);
    if (intent === "publish") doc = quizPublishSchema.parse(doc);
  } catch (e) {
    return e instanceof z.ZodError
      ? { error: "راجع الأسئلة المحدّدة قبل الحفظ.", issues: quizIssues(e) }
      : { error: e instanceof Error ? e.message : "الملف مش صالح." };
  }
  const db = await createClient();
  const course = await db
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("slug", slug)
    .single();
  if (course.error) return { error: "المادة مش متاحة." };
  const r = await db.rpc("save_quiz", {
    p_course: courseId,
    p_topic: topic || null,
    p_document: JSON.parse(JSON.stringify(doc)),
    p_resource: resource || null,
    p_publish: intent === "publish",
    p_rights: form.get("rights") === "on",
  });
  if (r.error)
    return {
      error:
        r.error.code === "42501"
          ? "راجع حالة حسابك وصلاحية تعديل المجموعة. تقدر ترجع لإضافاتي."
          : "الحفظ ماكملش. راجع حقوق المشاركة، الموضوع والأسئلة، أو جرّب تاني بعد شوية.",
    };
  revalidatePath("/", "layout");
  const saved = await db
    .from("resources")
    .select("status,review_state")
    .eq("id", r.data)
    .single();
  if (saved.error)
    return { error: "الحفظ تم، لكن حالة المجموعة مش متاحة. راجع إضافاتي." };
  return {
    id: r.data,
    published: saved.data.status === "published",
    submitted: saved.data.review_state === "submitted",
  };
}
export async function checkQuizAnswers(
  id: string,
  revision: number,
  input: unknown,
): Promise<{ feedback?: Feedback[]; error?: string; stale?: boolean }> {
  const parsed = submittedAnswersSchema.safeParse(input);
  if (
    !parsed.success ||
    !idSchema.safeParse(id).success ||
    !Number.isInteger(revision) ||
    revision < 1 ||
    new TextEncoder().encode(JSON.stringify(input)).length > 350000
  )
    return { error: "الإجابات مش صالحة. راجع اختياراتك." };
  const db = await createClient();
  const result = await db.rpc("grade_quiz", {
    p_resource: id,
    p_revision: revision,
    p_answers: parsed.data,
  });
  if (result.error)
    return result.error.code === "40001"
      ? {
          error:
            "المجموعة اتحدّثت أثناء الحل. افتح النسخة الجديدة وابدأ محاولة جديدة.",
          stale: true,
        }
      : {
          error:
            "التصحيح ماكملش. إجاباتك لسه موجودة؛ جرّب تاني أو تأكد إن المصدر لسه متاح.",
        };
  return { feedback: result.data as Feedback[] };
}
