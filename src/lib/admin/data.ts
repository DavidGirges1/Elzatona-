import "server-only";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
export const overviewSchema = z.object({
  students: z.number(),
  courses: z.number(),
  resources: z.number(),
  page_views: z.number(),
  dau: z.number(),
  mau: z.number(),
  tracking_since: z.string().nullable(),
  growth: z.array(
    z.object({ day: z.string(), registrations: z.number(), views: z.number() }),
  ),
  universities: z.array(
    z.object({
      id: z.string(),
      name: z.string().nullable(),
      students: z.number(),
    }),
  ),
  faculties: z.array(
    z.object({
      name: z.string(),
      university_id: z.string(),
      faculty_id: z.string(),
      university: z.string().nullable(),
      year: z.number().nullable(),
      students: z.number(),
    }),
  ),
  activity: z.array(
    z.object({
      event: z.string(),
      created_at: z.string(),
      course_id: z.string().nullable(),
      resource_id: z.string().nullable(),
    }),
  ),
});
export type Overview = z.infer<typeof overviewSchema>;
export async function overview() {
  const { db } = await requireAdmin();
  const r = await db.rpc("admin_overview");
  if (r.error) throw r.error;
  return overviewSchema.parse(r.data);
}
export async function catalog() {
  const { db } = await requireAdmin();
  const results = await Promise.all([
    db.from("universities").select("*").order("name_ar"),
    db.from("faculties").select("*").order("name_ar"),
    db.from("university_faculties").select("*"),
    db.from("academic_years").select("*").order("year"),
  ]);
  for (const r of results) if (r.error) throw r.error;
  return {
    universities: results[0].data || [],
    faculties: results[1].data || [],
    relations: results[2].data || [],
    years: results[3].data || [],
  };
}
const userSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  created_at: z.string(),
  status: z.enum(["active", "suspended"]),
  university_id: z.string().nullable(),
  faculty_id: z.string().nullable(),
  academic_year: z.number().nullable(),
  university: z.string().nullable(),
  faculty: z.string().nullable(),
});
export const usersSchema = z.object({
  total: z.number(),
  page: z.number(),
  users: z.array(userSchema),
});
export const date = (value: string) =>
  new Intl.DateTimeFormat("ar-EG", {
    dateStyle: "medium",
    timeZone: "Africa/Cairo",
  }).format(new Date(value));
