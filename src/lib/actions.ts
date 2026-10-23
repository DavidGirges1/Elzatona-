"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient, currentUser, configured } from "@/lib/supabase/server";
import { finalizePdf, pdfEnabled } from "@/lib/supabase/files";
import {
  resourceSchema,
  questionSchema,
  idSchema,
  safeNext,
} from "@/lib/validation";
import type { ActionState } from "@/components/forms";
async function actor(next: string) {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return { user, db: await createClient() };
}
function failure(
  message = "الحفظ ماكملش. ممكن تكون وصلت لحد المشاركات أو المحتوى مش متاح. جرّب تاني بعد شوية.",
): ActionState {
  return { error: message };
}
export async function follow(
  courseId: string,
  next: string,
  _state: ActionState,
  _form: FormData,
): Promise<ActionState> {
  if (!idSchema.safeParse(courseId).success) return failure();
  const { db } = await actor(next);
  const { error } = await db.rpc("follow_course", { p_course: courseId });
  if (error) return failure();
  revalidatePath("/", "layout");
  return {};
}
export async function vote(
  resourceId: string,
  value: number,
  next: string,
  _state: ActionState,
  _form: FormData,
): Promise<ActionState> {
  if (!idSchema.safeParse(resourceId).success || ![1, -1].includes(value))
    return failure();
  const { db } = await actor(next);
  const { error } = await db.rpc("set_vote", {
    p_resource: resourceId,
    p_value: value,
  });
  if (error)
    return failure(
      "مش ممكن تصوّت على المصدر ده. تأكد إنه متاح وإنه مش من إضافتك.",
    );
  revalidatePath("/", "layout");
  return {};
}
export async function save(
  resourceId: string,
  next: string,
  _state: ActionState,
  _form: FormData,
): Promise<ActionState> {
  if (!idSchema.safeParse(resourceId).success) return failure();
  const { db } = await actor(next);
  const { error } = await db.rpc("toggle_save", { p_resource: resourceId });
  if (error) return failure();
  revalidatePath("/", "layout");
  return {};
}
export async function submitResource(
  slug: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db, user } = await actor(`/courses/${slug}/submit`);
  const raw = Object.fromEntries(form);
  const file = form.get("file");
  const isPdf = file instanceof File && file.size > 0;
  const parsed = resourceSchema.safeParse({
    ...raw,
    external_url: isPdf ? "https://example.org/upload" : raw.external_url,
  });
  if (!parsed.success) return failure(parsed.error.issues[0].message);
  const p = parsed.data;
  const { data: course } = await db
    .from("courses")
    .select("id")
    .eq("slug", slug)
    .eq("id", p.course_id)
    .single();
  if (!course) return failure("المادة دي مش متاحة.");
  let id: string;
  if (isPdf) {
    if (!pdfEnabled())
      return failure("رفع الملفات مش متاح دلوقتي. شارك لينك للمصدر بدل الملف.");
    if (
      file.size > 3 * 1024 * 1024 ||
      file.type !== "application/pdf" ||
      new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-"
    )
      return failure("اختار ملف PDF صالح، حجمه أقل من ٣ ميجابايت.");
    const { data, error } = await db.rpc("prepare_pdf", {
      p_course: p.course_id,
      p_topic: p.topic_id,
      p_title: p.title,
      p_description: p.description,
      p_type: p.type,
      p_rights: true,
      p_ai: p.is_ai_assisted === "on",
    });
    if (error || !data) return failure();
    id = data;
    const { error: uploadError } = await db.storage
      .from("course-pdfs")
      .upload(`${user.id}/${id}.pdf`, file, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (uploadError)
      return failure(
        "رفع الملف ماكملش. بياناته محفوظة في حسابك كمصدر معلّق؛ تقدر تعيد رفعه من هناك.",
      );
    const published = await finalizePdf(db, id, user.id);
    if (!published)
      return failure("الملف لسه معلّق. افتح حسابك لإعادة المحاولة.");
  } else {
    const { data, error } = await db.rpc("submit_resource", {
      p_course: p.course_id,
      p_topic: p.topic_id,
      p_title: p.title,
      p_description: p.description,
      p_type: p.type,
      p_url: p.external_url,
      p_rights: true,
      p_ai: p.is_ai_assisted === "on",
    });
    if (error || !data) return failure();
    id = data;
  }
  revalidatePath(`/courses/${slug}`);
  redirect(`/courses/${slug}/resources/${id}`);
}
export async function editResource(
  id: string,
  slug: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await actor(`/courses/${slug}/resources/${id}/edit`);
  const title = z.string().trim().min(4).max(160).safeParse(form.get("title"));
  const description = z.string().max(2000).safeParse(form.get("description"));
  const topic = z
    .union([idSchema, z.literal("")])
    .safeParse(form.get("topic_id"));
  if (
    !idSchema.safeParse(id).success ||
    !title.success ||
    !description.success ||
    !topic.success
  )
    return failure("راجع العنوان والوصف والموضوع.");
  const { error } = await db.rpc("edit_resource", {
    p_resource: id,
    p_title: title.data,
    p_description: description.data,
    p_topic: topic.data || null,
  });
  if (error) return failure();
  revalidatePath("/", "layout");
  redirect(`/courses/${slug}/resources/${id}`);
}
export async function ask(
  slug: string,
  courseId: string,
  resourceId: string | null,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await actor(`/courses/${slug}/ask`);
  const p = questionSchema.safeParse(Object.fromEntries(form));
  if (
    !p.success ||
    !idSchema.safeParse(courseId).success ||
    (resourceId && !idSchema.safeParse(resourceId).success)
  )
    return failure("اكتب عنوان واضح وسؤال من ٨ حروف على الأقل.");
  const { data, error } = await db.rpc("ask_question", {
    p_course: courseId,
    p_resource: resourceId,
    p_title: p.data.title,
    p_body: p.data.body,
  });
  if (error || !data) return failure();
  revalidatePath(`/courses/${slug}`);
  redirect(`/courses/${slug}/discussions/${data}`);
}
export async function reply(
  id: string,
  path: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await actor(path);
  const body = z.string().trim().min(2).max(3000).safeParse(form.get("body"));
  if (!body.success || !idSchema.safeParse(id).success)
    return failure("اكتب رد من حرفين لحد ٣٠٠٠ حرف.");
  const { error } = await db.rpc("reply_question", {
    p_discussion: id,
    p_body: body.data,
  });
  if (error) return failure();
  revalidatePath(path);
  return {};
}
export async function report(
  kind: string,
  id: string,
  path: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await actor(path);
  const reason = z
    .enum(["spam", "inaccurate", "copyright", "abusive", "other"])
    .safeParse(form.get("reason"));
  const details = z.string().max(2000).safeParse(form.get("details"));
  if (
    !reason.success ||
    !details.success ||
    !["resource", "discussion", "reply"].includes(kind) ||
    !idSchema.safeParse(id).success
  )
    return failure("راجع سبب البلاغ.");
  const { error } = await db.rpc("report_content", {
    p_kind: kind,
    p_target: id,
    p_reason: reason.data,
    p_details: details.data,
  });
  if (error) return failure();
  redirect(`${safeNext(path)}?reported=1`);
}
export async function moderate(
  id: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await actor("/admin/reports");
  const p = z
    .object({
      action: z.enum(["hide", "dismiss"]),
      reason: z.string().trim().min(4).max(1000),
      confirm: z.literal("on"),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success || !idSchema.safeParse(id).success)
    return failure("اكتب سبب القرار وأكد المراجعة.");
  const { error } = await db.rpc("moderate_report", {
    p_report: id,
    p_action: p.data.action,
    p_reason: p.data.reason,
  });
  if (error) return failure();
  revalidatePath("/", "layout");
  return {};
}
export async function highlight(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await actor("/admin/highlights");
  const p = z
    .object({
      course: idSchema,
      resource: z.union([idSchema, z.literal("")]),
      position: z.coerce.number().int().min(1).max(3),
      note: z.string().max(300),
    })
    .safeParse(Object.fromEntries(form));
  if (!p.success) return failure("راجع المادة والمصدر والترتيب.");
  const { error } = await db.rpc("set_highlight", {
    p_course: p.data.course,
    p_resource: p.data.resource || null,
    p_position: p.data.position,
    p_note: p.data.note,
  });
  if (error)
    return failure(
      "المصدر لازم يكون منشور ومن نفس المادة، ومش مختار في ترتيب تاني.",
    );
  revalidatePath("/", "layout");
  redirect("/admin/highlights?updated=1");
}
export async function updateProfile(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db } = await actor("/profile");
  const name = z.string().trim().min(2).max(80).safeParse(form.get("name"));
  if (!name.success) return failure("اكتب اسم من حرفين لحد ٨٠ حرف.");
  const { error } = await db.rpc("update_profile", { p_name: name.data });
  if (error) return failure();
  revalidatePath("/profile");
  redirect("/profile?updated=1");
}
export async function signOut() {
  if (configured()) {
    const db = await createClient();
    await db.auth.signOut();
  }
  redirect("/");
}
export async function retryPdf(
  id: string,
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { db, user } = await actor("/profile");
  if (!idSchema.safeParse(id).success) return failure();
  const { data: r } = await db
    .from("resources")
    .select("*")
    .eq("id", id)
    .eq("author_id", user.id)
    .eq("status", "pending")
    .single();
  if (!r || !r.storage_path) return failure();
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (
      file.size > 3145728 ||
      file.type !== "application/pdf" ||
      new TextDecoder().decode(await file.slice(0, 5).arrayBuffer()) !== "%PDF-"
    )
      return failure("اختار PDF صالح أصغر من ٣ ميجابايت.");
    await db.storage.from("course-pdfs").remove([r.storage_path]);
    const { error } = await db.storage
      .from("course-pdfs")
      .upload(r.storage_path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
    if (error) return failure("رفع الملف ماكملش. جرّب تاني.");
  }
  const stored = await db.storage.from("course-pdfs").download(r.storage_path);
  if (
    stored.error ||
    !stored.data ||
    new TextDecoder().decode(await stored.data.slice(0, 5).arrayBuffer()) !==
      "%PDF-"
  )
    return failure("الملف المخزن مش PDF صالح. ارفع ملف سليم وجرّب تاني.");
  const published = await finalizePdf(db, id, user.id);
  if (!published)
    return failure("الملف مش موجود أو غير صالح. اختاره وجرّب تاني.");
  revalidatePath("/", "layout");
  return {};
}
