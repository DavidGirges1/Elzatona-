"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/session";
import { idSchema } from "@/lib/validation";
import type { ActionState } from "@/components/forms";
const id = z.union([idSchema, z.literal("")]).transform((v) => v || null);
const name = z.string().trim().min(2).max(120);
const slug = z
  .string()
  .trim()
  .regex(/^[a-z0-9-]{2,80}$/);
const bool = (v: unknown) => v === "on";
function error(
  message = "راجع البيانات والارتباطات الدراسية. الحفظ ماكملش.",
): ActionState {
  return { error: message };
}
function databaseError(code?: string) {
  return error(
    code === "23505"
      ? "الكود أو اللينك ده مستخدم بالفعل. اختار قيمة مختلفة."
      : code === "23503"
        ? "السنة أو العلاقة دي مرتبطة بطلبة أو مواد. احتفظ بيها أو انقل الارتباطات الأول."
        : code === "42501"
          ? "العملية غير مسموحة للحساب ده."
          : "البيانات غير صالحة أو الاختيار الدراسي غير متاح.",
  );
}
export async function saveUniversity(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      id,
      slug,
      name,
      name_ar: name,
      description: z.string().max(2000),
      active: z.literal("on").optional(),
      onboarding: z.literal("on").optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success)
    return error("اكتب أسماء صحيحة ولينك بحروف إنجليزي صغيرة وأرقام وشرطات.");
  const v = p.data;
  const r = await db.rpc("admin_save_university", {
    p_id: v.id,
    p_slug: v.slug,
    p_name: v.name,
    p_name_ar: v.name_ar,
    p_description: v.description,
    p_active: bool(v.active),
    p_onboarding: bool(v.onboarding),
  });
  if (r.error) return databaseError(r.error.code);
  revalidatePath("/admin", "layout");
  redirect("/admin/universities?updated=1");
}
export async function saveFaculty(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin();
  const raw = Object.fromEntries(form);
  const years = [
    ...new Set(
      String(raw.years || "")
        .split(/[,،\s]+/)
        .filter(Boolean)
        .map(Number),
    ),
  ];
  const p = z
    .object({
      id,
      university_id: idSchema,
      slug,
      name,
      name_ar: name,
      years: z.array(z.number().int().min(1).max(12)).min(1).max(12),
      active: z.literal("on").optional(),
    })
    .safeParse({ ...raw, years });
  if (!p.success)
    return error("راجع الجامعة والاسم. السنين أرقام من ١ لـ١٢، بينها فواصل.");
  const v = p.data;
  const r = await db.rpc("admin_save_faculty", {
    p_id: v.id,
    p_university: v.university_id,
    p_slug: v.slug,
    p_name: v.name,
    p_name_ar: v.name_ar,
    p_years: v.years,
    p_active: bool(v.active),
  });
  if (r.error) return databaseError(r.error.code);
  revalidatePath("/admin", "layout");
  redirect("/admin/faculties?updated=1");
}
export async function saveCourse(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      id,
      university_id: idSchema,
      faculty_id: idSchema,
      academic_year: z.coerce.number().int().min(1).max(12),
      semester: z
        .union([z.literal(""), z.coerce.number().int().min(1).max(3)])
        .transform((v) => (v === "" ? null : v)),
      slug,
      code: z.string().trim().min(1).max(40),
      title: z.string().trim().min(2).max(160),
      title_ar: z.string().trim().min(2).max(160),
      description: z.string().max(2000),
      active: z.literal("on").optional(),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success)
    return error("راجع بيانات المادة والجامعة والكلية والسنة المتاحة.");
  const v = p.data;
  const r = await db.rpc("admin_save_course", {
    p_id: v.id,
    p_university: v.university_id,
    p_faculty: v.faculty_id,
    p_year: v.academic_year,
    p_semester: v.semester,
    p_slug: v.slug,
    p_code: v.code,
    p_title: v.title,
    p_title_ar: v.title_ar,
    p_description: v.description,
    p_active: bool(v.active),
  });
  if (r.error) return databaseError(r.error.code);
  revalidatePath("/admin", "layout");
  redirect("/admin/courses?updated=1");
}
export async function changeAccount(
  user: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      status: z.enum(["active", "suspended"]),
      reason: z.string().trim().min(4).max(1000),
      confirm: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!idSchema.safeParse(user).success || !p.success)
    return error("اكتب سبب القرار وأكد العملية.");
  const r = await db.rpc("admin_set_account_status", {
    p_user: user,
    p_status: p.data.status,
    p_reason: p.data.reason,
    p_confirm: true,
  });
  if (r.error)
    return error(
      "العملية مش مسموحة. لا يمكن إيقاف حساب إداري أو حسابك الحالي.",
    );
  revalidatePath("/admin", "layout");
  return { success: "اتحفظ القرار." };
}
export async function manageResource(
  resource: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin();
  const p = z
    .object({
      title: z.string().trim().min(4).max(160),
      status: z.enum(["published", "hidden"]),
      reason: z.string().trim().min(4).max(1000),
      confirm: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!idSchema.safeParse(resource).success || !p.success)
    return error("راجع العنوان وسبب القرار وتأكيد العملية.");
  const r = await db.rpc("admin_manage_resource", {
    p_resource: resource,
    p_title: p.data.title,
    p_status: p.data.status,
    p_reason: p.data.reason,
    p_confirm: true,
  });
  if (r.error)
    return error(
      "الحفظ ماكملش. PDF لازم يعدّي فحص الملف، ومجموعة الأسئلة لازم تكون مكتملة بإجاباتها وحقوق مشاركتها قبل النشر.",
    );
  revalidatePath("/", "layout");
  return { success: "اتحفظ القرار." };
}

export async function changeMaterialPermissions(
  user: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({
      publish: z.literal("on").optional(),
      organize: z.literal("on").optional(),
      reason: z.string().trim().min(4).max(1000),
      confirm: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!idSchema.safeParse(user).success || !parsed.success)
    return error("اكتب سبب القرار وأكد تغيير الصلاحيات.");
  const r = await db.rpc("admin_set_material_permissions", {
    p_user: user,
    p_publish: bool(parsed.data.publish),
    p_organize: bool(parsed.data.organize),
    p_reason: parsed.data.reason,
    p_confirm: true,
  });
  if (r.error) return databaseError(r.error.code);
  revalidatePath("/", "layout");
  return { success: "اتحفظت صلاحيات المصادر." };
}
export async function changePublishingMode(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await requireAdmin();
  const parsed = z
    .object({
      mode: z.enum(["open", "restricted"]),
      reason: z.string().trim().min(4).max(1000),
      confirm: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success) return error("اختار وضع النشر واكتب السبب وأكد القرار.");
  const r = await db.rpc("admin_set_publishing_mode", {
    p_open: parsed.data.mode === "open",
    p_reason: parsed.data.reason,
    p_confirm: true,
  });
  if (r.error) return databaseError(r.error.code);
  revalidatePath("/", "layout");
  return { success: "اتحفظ وضع النشر." };
}
