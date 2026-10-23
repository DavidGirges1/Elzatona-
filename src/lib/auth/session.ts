import "server-only";
import { cache } from "react";
import { z } from "zod";
import { redirect } from "next/navigation";
import { createClient, currentUser } from "@/lib/supabase/server";
import { safeNext } from "@/lib/validation";
const contextSchema = z.object({
  university_id: z.string().nullable(),
  faculty_id: z.string().nullable(),
  academic_year: z.number().nullable(),
  completed_at: z.string().nullable(),
  university: z.string().nullable(),
  faculty: z.string().nullable(),
  ready: z.boolean(),
  active: z.boolean(),
  username: z.string(),
  username_claimed: z.boolean(),
  full_name: z.string(),
});
export type StudentContext = z.infer<typeof contextSchema>;
export const studentContext = cache(
  async (): Promise<StudentContext | null> => {
    const db = await createClient();
    const { data, error } = await db.rpc("student_context");
    if (error) throw error;
    const parsed = contextSchema.safeParse(data);
    return parsed.success ? parsed.data : null;
  },
);
export async function requireStudent(next = "/dashboard") {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  const context = await studentContext();
  if (!context?.active) redirect("/suspended");
  if (!context.ready)
    redirect(`/onboarding?next=${encodeURIComponent(safeNext(next))}`);
  return { user, context, db: await createClient() };
}
export async function requireAdmin() {
  const user = await currentUser();
  if (!user) redirect("/admin/login");
  const db = await createClient();
  const { data, error } = await db.rpc("is_admin");
  if (error || !data) redirect("/admin/login?error=access");
  return { user, db };
}
export async function afterStudentLogin(next: unknown) {
  const path = safeNext(next);
  const context = await studentContext();
  if (!context?.active) redirect("/suspended");
  if (!context.ready)
    redirect(
      `/onboarding?next=${encodeURIComponent(path === "/" ? "/dashboard" : path)}`,
    );
  redirect(path === "/" ? "/dashboard" : path);
}
