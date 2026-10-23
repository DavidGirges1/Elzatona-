"use server";
import { redirect } from "next/navigation";
import { currentUser, createClient } from "@/lib/supabase/server";
import { idSchema, safeNext } from "@/lib/validation";
import { usernameSchema } from "./validation";
import type { ActionState } from "@/components/forms";
async function client() {
  if (!(await currentUser())) redirect("/login?next=/onboarding");
  return createClient();
}
export async function chooseUsername(
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = usernameSchema.safeParse(form.get("username"));
  if (!p.success) return { error: p.error.issues[0].message };
  const db = await client();
  const { error } = await db.rpc("claim_username", { p_username: p.data });
  if (error) return { error: "اسم المستخدم مش متاح. اختار اسم تاني." };
  redirect(
    `/onboarding?next=${encodeURIComponent(safeNext(form.get("next")))}`,
  );
}
export async function chooseAcademicStep(
  step: "university" | "faculty" | "year",
  _state: ActionState,
  form: FormData,
): Promise<ActionState> {
  const university = idSchema.safeParse(form.get("university_id"));
  const faculty =
    step !== "university" ? idSchema.safeParse(form.get("faculty_id")) : null;
  const year = step === "year" ? Number(form.get("academic_year")) : null;
  if (
    !university.success ||
    (faculty && !faculty.success) ||
    (step === "year" &&
      (!Number.isInteger(year) || !year || year < 1 || year > 12))
  )
    return { error: "اختار بياناتك الدراسية من الاختيارات المتاحة." };
  const db = await client();
  const { error } = await db.rpc("set_academic_context", {
    p_university: university.data,
    p_faculty: faculty?.success ? faculty.data : null,
    p_year: year,
  });
  if (error)
    return { error: "الاختيار مش متاح حاليًا. حدّث الصفحة واختار من جديد." };
  const next = safeNext(form.get("next"));
  redirect(
    `/onboarding?${step === "year" ? "done=1&" : ""}next=${encodeURIComponent(next === "/" ? "/dashboard" : next)}`,
  );
}
