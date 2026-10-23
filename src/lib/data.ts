import "server-only";
import { cache } from "react";
import { studentContext } from "@/lib/auth/session";
import { createClient, configured, currentUser } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { matchesCourse } from "@/lib/course-catalog";
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
export async function getCourses(query = "", allUniversities = false) {
  if (!configured()) return [];
  const db = await createClient();
  let queryBuilder = db
    .from("courses")
    .select("*")
    .eq("is_active", true)
    .order("year_level")
    .order("code")
    .limit(1000);
  if (!allUniversities && (await currentUser())) {
    const context = await studentContext();
    if (!context?.ready) return [];
    queryBuilder = queryBuilder
      .eq("university_id", context.university_id!)
      .eq("faculty_id", context.faculty_id!);
  }
  const { data, error } = await queryBuilder;
  if (error) throw error;
  return (data || []).filter((c) => matchesCourse(c, query));
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
export async function getFollowedCourses() {
  const ids = await getFollowedIds();
  if (!ids.length) return [];
  const db = await createClient();
  const { data, error } = await db
    .from("courses")
    .select("*")
    .in("id", ids)
    .eq("is_active", true)
    .order("title");
  if (error) throw error;
  return data || [];
}
export async function getCourseRequirements(ids: string[]) {
  if (!configured() || !ids.length) return [];
  const db = await createClient();
  const { data, error } = await db
    .from("course_requirements")
    .select("*")
    .in("course_id", ids);
  if (error) throw error;
  return data || [];
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
  courseIds?: string[];
  q?: string;
  type?: string;
  topic?: string;
  sort?: string;
  page?: number;
  ids?: string[];
};
export async function getResources({
  courseId,
  courseIds,
  q,
  type,
  topic,
  sort,
  page = 1,
  ids,
}: ResourceFilters = {}) {
  if (!configured() || ids?.length === 0 || courseIds?.length === 0) return [];
  const db = await createClient();
  let query = db.from("resource_cards").select("*").eq("status", "published");
  if (courseId) query = query.eq("course_id", courseId);
  if (courseIds) query = query.in("course_id", courseIds);
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
