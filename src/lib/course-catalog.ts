import type { Course } from "@/lib/data";
import type { Database } from "@/lib/supabase/database.types";
export type Requirement =
  Database["public"]["Tables"]["course_requirements"]["Row"];
export const programs = {
  cs: "علوم الحاسب",
  it: "تكنولوجيا المعلومات",
  is: "نظم المعلومات",
  ai: "الذكاء الاصطناعي",
} as const;
export type Program = keyof typeof programs;
export const scopes = {
  general: "متطلب عام",
  faculty: "متطلب كلية",
  ...programs,
};
export function parseProgram(value: unknown): Program | undefined {
  return typeof value === "string" && Object.hasOwn(programs, value)
    ? (value as Program)
    : undefined;
}
export function normalizeCourseSearch(value: string) {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/\s+/g, "")
    .slice(0, 100);
}
export function matchesCourse(course: Course, query: string) {
  const q = normalizeCourseSearch(query);
  return [
    course.title,
    course.title_ar,
    course.title_en,
    course.code,
    course.code_ar,
    course.department_ar,
  ].some((value) => value && normalizeCourseSearch(value).includes(q));
}
export function filterAndRankCourses(
  courses: Course[],
  requirements: Requirement[],
  options: {
    q?: string;
    year?: number;
    studentYear?: number | null;
    program?: Program;
  },
) {
  const byCourse = new Map<string, Requirement[]>();
  for (const row of requirements)
    byCourse.set(row.course_id, [...(byCourse.get(row.course_id) || []), row]);
  const relevant = (id: string) =>
    (byCourse.get(id) || []).filter(
      (r) =>
        !options.program ||
        r.scope === options.program ||
        r.scope === "general" ||
        r.scope === "faculty",
    );
  const rank = (c: Course) => {
    const reqs = relevant(c.id);
    return [
      options.studentYear && c.year_level === options.studentYear ? 0 : 1,
      options.studentYear
        ? Math.abs((c.year_level || 99) - options.studentYear)
        : c.year_level || 99,
      c.year_level || 99,
      reqs.some((r) => r.kind === "required") ? 0 : 1,
    ];
  };
  return courses
    .filter(
      (c) =>
        (!options.year || c.year_level === options.year) &&
        (!options.program || relevant(c.id).length > 0) &&
        matchesCourse(c, options.q || ""),
    )
    .sort((a, b) => {
      const left = rank(a),
        right = rank(b);
      for (let i = 0; i < left.length; i++)
        if (left[i] !== right[i]) return left[i] - right[i];
      return (
        a.code.localeCompare(b.code, "en", { numeric: true }) ||
        a.id.localeCompare(b.id)
      );
    });
}
export function requirementLabel(rows: Requirement[], program?: Program) {
  const relevant = rows.filter(
    (r) =>
      !program ||
      r.scope === program ||
      r.scope === "general" ||
      r.scope === "faculty",
  );
  if (!relevant.length) return "";
  const common = relevant.find(
    (r) => r.scope === "general" || r.scope === "faculty",
  );
  const kind = relevant.every((r) => r.kind === relevant[0].kind)
    ? relevant[0].kind === "required"
      ? "إجباري"
      : "اختياري"
    : "حسب التخصص";
  return `${common ? scopes[common.scope as keyof typeof scopes] : program ? programs[program] : "متطلب تخصص"} · ${kind}`;
}
