"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, currentUser } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
import { communityRoles } from "./community";
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
  const r = await (
    await createClient()
  ).rpc("review_material", {
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
          : "القرار مااتحفظش. اتأكد إن الإضافة لسه منتظرة المراجعة وإن المادة ضمن مسؤوليتك. المراجعة الذاتية مش مسموحة لمسؤول المواد.",
    };
  revalidatePath("/", "layout");
  redirect(`/review?decision=${p.data.decision}`);
}
export async function organizeTopic(
  id: string,
  slug: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      title: z.string().trim().min(2).max(120),
      order: z.coerce.number().int().min(0).max(10000),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success || !idSchema.safeParse(id).success)
    return { error: "راجع اسم الموضوع وترتيبه." };
  const r = await (
    await createClient()
  ).rpc("organize_topic", {
    p_topic: id,
    p_title: p.data.title,
    p_order: p.data.order,
  });
  if (r.error)
    return {
      error: "التعديل ماكملش. اتأكد إن المادة ضمن مسؤوليتك والاسم مش مكرر.",
    };
  revalidatePath(`/courses/${slug}`);
  return { success: "اتحفظ اسم الموضوع وترتيبه." };
}
