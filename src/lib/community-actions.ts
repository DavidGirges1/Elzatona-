"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, currentUser } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
import { communityRoles } from "./community";
import { placementFromForm } from "@/lib/placement";
import type { ActionState } from "@/components/forms";
export async function assignCommunityRole(
  id: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin();
  let courses: unknown;
  try {
    courses = JSON.parse(String(form.get("courses") || "[]"));
  } catch {
    return { error: "راجع المواد المحددة." };
  }
  const result = z
    .object({
      role: z.enum(communityRoles),
      courses: z.array(idSchema).max(250),
      reason: z.string().trim().min(4).max(1000),
      confirm: z.literal("on"),
    })
    .safeParse({ ...Object.fromEntries(form), courses });
  if (!result.success || !idSchema.safeParse(id).success)
    return { error: "راجع الدور والمواد والسبب وتأكيد القرار." };
  const p = result.data;
  if (p.role === "class_leader" && !p.courses.length)
    return { error: "اختار مادة واحدة على الأقل لمسؤول المواد." };
  const r = await db.rpc("admin_assign_community_role", {
    p_user: id,
    p_role: p.role,
    p_courses: p.role === "class_leader" ? p.courses : [],
    p_reason: p.reason,
    p_confirm: true,
  });
  if (r.error)
    return {
      error: r.error.message.includes("last active admin")
        ? "لازم يفضل مدير نشط واحد على الأقل. عيّن مدير تاني قبل إزالة صلاحيتك."
        : "التغيير ماكملش. اتأكد إن الحساب نشط، بريده متفعّل وبياناته مكتملة، وراجع المواد.",
    };
  revalidatePath("/", "layout");
  return { success: "اتحفظ الدور والمواد. الصلاحيات بتتطبق على الطلب التالي." };
}
export async function reviewMaterial(
  id: string,
  version: number,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!(await currentUser()))
    return { error: "سجّل دخولك عشان تراجع الإضافة." };
  const p = z
    .object({
      decision: z.enum(["approved", "rejected"]),
      reason: z.string().trim().min(4).max(1000),
      confirm: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (
    !p.success ||
    !idSchema.safeParse(id).success ||
    !Number.isInteger(version)
  )
    return { error: "اكتب سبب القرار وأكّد إنك راجعت المصدر." };
  const placement = placementFromForm(form);
  if (!placement.success) return { error: placement.error.issues[0].message };
  const r = await (
    await createClient()
  ).rpc("review_placed_material", {
    p_area: placement.data.area,
    p_lectures: placement.data.lectures,
    p_resource: id,
    p_version: version,
    p_decision: p.data.decision,
    p_reason: p.data.reason,
  });
  if (r.error)
    return {
      error:
        r.error.code === "40001"
          ? "صاحب الإضافة عدّلها أثناء المراجعة. حدّث الصفحة وراجع النسخة الجديدة."
          : "القرار مااتحفظش. اتأكد إن الإضافة لسه منتظرة المراجعة وإن المادة ضمن مسؤوليتك.",
    };
  revalidatePath("/", "layout");
  redirect(`/review?decision=${p.data.decision}`);
}
export async function saveLecture(
  courseId: string,
  slug: string,
  id: string | null,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({
      number: z.coerce.number().int().min(1).max(999),
      title: z.string().trim().max(120),
    })
    .safeParse(Object.fromEntries(form));
  if (
    !parsed.success ||
    !idSchema.safeParse(courseId).success ||
    (id && !idSchema.safeParse(id).success)
  )
    return { error: "راجع رقم المحاضرة وعنوانها." };
  const db = await createClient();
  const r = await db.rpc("save_lecture", {
    p_course: courseId,
    p_id: id,
    p_number: parsed.data.number,
    p_title: parsed.data.title,
  });
  if (r.error)
    return {
      error:
        "الحفظ ماكملش. راجع صلاحيتك ورقم المحاضرة؛ ممكن يكون مستخدم بالفعل.",
    };
  revalidatePath(`/courses/${slug}`, "layout");
  return { success: "اتحفظت المحاضرة." };
}
export async function removeLecture(
  id: string,
  slug: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  if (!idSchema.safeParse(id).success || form.get("confirm") !== "on")
    return { error: "أكد حذف المحاضرة الفاضية." };
  const r = await (await createClient()).rpc("delete_lecture", { p_id: id });
  if (r.error)
    return {
      error: "انقل المصادر لمحاضرة تانية أو مكان عام قبل الحذف، وراجع صلاحيتك.",
    };
  revalidatePath(`/courses/${slug}`, "layout");
  return { success: "اتحذفت المحاضرة." };
}
export async function chooseLectureMain(
  lectureId: string,
  slug: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const resource = z
    .union([idSchema, z.literal("")])
    .safeParse(form.get("resource"));
  if (!idSchema.safeParse(lectureId).success || !resource.success)
    return { error: "اختار مصدر مذاكرة منشور." };
  const r = await (
    await createClient()
  ).rpc("set_lecture_main", {
    p_lecture: lectureId,
    p_resource: resource.data || null,
  });
  if (r.error)
    return {
      error:
        "المصدر لازم يكون مذاكرة منشورة لنفس المحاضرة، وتكون مسؤول عن المادة.",
    };
  revalidatePath(`/courses/${slug}`, "layout");
  return { success: "اتحفظ اختيار البداية." };
}
