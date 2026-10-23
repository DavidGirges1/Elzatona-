import "server-only";
import { cache } from "react";
import { studentContext } from "@/lib/auth/session";
import { createClient, configured, currentUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { resourceTypes } from "@/lib/validation";
export type Course = Database["public"]["Tables"]["courses"]["Row"];
export type Resource = Omit<
  Database["public"]["Views"]["resource_cards"]["Row"],
  "type"
> & { type: (typeof resourceTypes)[number] };
export const getCourse = cache(async (slug: string) => {
  if (!configured()) return null;
  const db = await createClient();
  const { data, error } = await db
    .from("courses")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw error;
  return data;
});
export async function getCourses(query = "") {
  if (!configured()) return [];
  const db = await createClient();
  let queryBuilder = db
    .from("courses")
    .select("*")
    .eq("is_active", true)
    .order("title")
    .limit(100);
  if (await currentUser()) {
    const context = await studentContext();
    if (!context?.ready) return [];
    queryBuilder = queryBuilder
      .eq("university_id", context.university_id!)
      .eq("faculty_id", context.faculty_id!)
      .eq("year_level", context.academic_year!);
  }
  const { data, error } = await queryBuilder;
  if (error) throw error;
  const q = query.toLocaleLowerCase();
  return (data || []).filter((c) =>
    [c.title, c.title_ar, c.title_en, c.code, c.department_ar].some((v) =>
      v?.toLocaleLowerCase().includes(q),
    ),
  );
}
export async function getFollowedIds() {
  const user = await currentUser();
  if (!user) return [];
  const db = await createClient();
  const { data, error } = await db
    .from("user_courses")
    .select("course_id")
    .eq("user_id", user.id);
  if (error) throw error;
  return (data || []).map((x) => x.course_id);
}
export async function getTopics(courseId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("topics")
    .select("*")
    .eq("course_id", courseId)
    .order("sort_order");
  if (error) throw error;
  return data || [];
}
export type ResourceFilters = {
  courseId?: string;
  q?: string;
  type?: string;
  topic?: string;
  sort?: string;
  page?: number;
  ids?: string[];
};
export async function getResources({
  courseId,
  q,
  type,
  topic,
  sort,
  page = 1,
  ids,
}: ResourceFilters = {}) {
  if (!configured() || ids?.length === 0) return [];
  const db = await createClient();
  let query = db.from("resource_cards").select("*").eq("status", "published");
  if (courseId) query = query.eq("course_id", courseId);
  if (ids) query = query.in("id", ids);
  if (type && resourceTypes.includes(type as Resource["type"]))
    query = query.eq("type", type);
  if (topic && /^[0-9a-f-]{36}$/.test(topic))
    query = query.eq("topic_id", topic);
  if (q) {
    const term = q.slice(0, 100).replace(/[%,()._*\\]/g, " ");
    query = query.or(
      `title.ilike.%${term}%,description.ilike.%${term}%,topic_title.ilike.%${term}%`,
    );
  }
  if (sort === "helpful") query = query.order("score", { ascending: false });
  const offset = (Math.max(1, Math.min(page, 1000)) - 1) * 20;
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .order("id")
    .range(offset, offset + 19);
  if (error) throw error;
  return (data || []) as Resource[];
}
export const getResource = cache(async (id: string) => {
  if (!configured() || !/^[0-9a-f-]{36}$/.test(id)) return null;
  const db = await createClient();
  const { data, error } = await db
    .from("resource_cards")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  return data as Resource | null;
});
export async function getHighlights(courseId: string) {
  const db = await createClient();
  const { data, error } = await db
    .from("course_highlights")
    .select("*")
    .eq("course_id", courseId)
    .order("position");
  if (error) throw error;
  const resources = await getResources({
    ids: (data || []).map((h) => h.resource_id),
  });
  return (data || []).flatMap((h) => {
    const r = resources.find((r) => r.id === h.resource_id);
    return r ? [r] : [];
  });
}
export async function getDiscussions(courseId: string, resourceId?: string) {
  const db = await createClient();
  let query = db
    .from("discussions")
    .select("*")
    .eq("course_id", courseId)
    .eq("status", "published");
  if (resourceId) query = query.eq("resource_id", resourceId);
  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) throw error;
  return data || [];
}
