import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  filterAndRankCourses,
  matchesCourse,
  parseProgram,
  requirementLabel,
  type Requirement,
} from "@/lib/course-catalog";
import type { Course } from "@/lib/data";
import catalog from "../data/curriculum/capital-computing-2021.json";
const courses = catalog.courses.map(
  (c) =>
    ({
      id: c.code,
      title: c.title_ar,
      title_ar: c.title_ar,
      title_en: c.title_en,
      code: c.code,
      code_ar: c.code_ar,
      year_level: c.year,
      department_ar: "",
      department: "",
    }) as Course,
);
const requirements = catalog.courses.flatMap((c) =>
  c.requirements.map((r) => ({
    course_id: c.code,
    scope: r.scope,
    kind: r.kind,
    source_page: r.page,
  })),
) as Requirement[];
const options = { studentYear: 3 };
describe("Capital curriculum provenance and recommendation rules", () => {
  it("retains the original PDF byte hash and exactly 122 distinct course codes", () => {
    expect(
      createHash("sha256")
        .update(readFileSync(catalog.source.file))
        .digest("hex"),
    ).toBe(catalog.source.sha256);
    expect(courses).toHaveLength(122);
    expect(new Set(courses.map((c) => c.code)).size).toBe(122);
    expect(requirements).toHaveLength(160);
  });
  it("follows article 18 level codes rather than inventing semesters", () => {
    for (const c of courses)
      expect(c.year_level).toBe(Number(c.code.split(" ")[1][0]));
    expect(
      [1, 2, 3, 4].map(
        (year) => courses.filter((c) => c.year_level === year).length,
      ),
    ).toEqual([13, 15, 40, 54]);
  });
  it("preserves each source table's row count and required credit totals", () => {
    const counts = [10, 9, 12, 8, 12, 10, 6, 12, 12, 7, 12, 10, 9, 12, 10, 9];
    for (let page = 14; page <= 29; page++)
      expect(requirements.filter((r) => r.source_page === page)).toHaveLength(
        counts[page - 14],
      );
    for (const [scope, total] of [
      ["general", 6],
      ["faculty", 63],
      ["cs", 39],
      ["it", 39],
      ["is", 39],
      ["ai", 39],
    ] as const) {
      expect(
        catalog.courses
          .filter((c) =>
            c.requirements.some(
              (r) => r.scope === scope && r.kind === "required",
            ),
          )
          .reduce((n, c) => n + c.credit_hours, 0),
      ).toBe(total);
    }
  });
  it("prioritizes year three but retains every other year", () => {
    const result = filterAndRankCourses(courses, requirements, options);
    expect(result).toHaveLength(122);
    expect(result.slice(0, 40).every((c) => c.year_level === 3)).toBe(true);
    expect(result.slice(40).some((c) => c.year_level === 1)).toBe(true);
  });
  it("lets a third-year student find a first-year course with a compact code", () => {
    expect(
      filterAndRankCourses(courses, requirements, {
        ...options,
        q: "cs111",
      }).map((c) => c.code),
    ).toEqual(["CS 111"]);
    expect(
      filterAndRankCourses(courses, requirements, { ...options, year: 1 }),
    ).toHaveLength(13);
  });
  it("searches Arabic letter variants, Arabic codes, English and Arabic titles", () => {
    const c = courses.find((c) => c.code === "AI 310")!;
    for (const q of [
      "الذكاء الاصطناعي",
      "الذّكاء الإِصطناعي",
      "Artificial Intelligence",
      "AI310",
      "ذك310",
    ])
      expect(matchesCourse(c, q)).toBe(true);
  });
  it("includes shared requirements in a department filter without duplicating hubs", () => {
    const result = filterAndRankCourses(courses, requirements, {
      ...options,
      program: "cs",
    });
    expect(result).toHaveLength(67);
    expect(result.filter((c) => c.code === "AI 310")).toHaveLength(1);
    expect(result.some((c) => c.code === "IT 498")).toBe(false);
    expect(result.some((c) => c.code === "HU 111")).toBe(true);
  });
  it("labels the same course differently for different departments", () => {
    const rows = requirements.filter((r) => r.course_id === "IT 441");
    expect(requirementLabel(rows, "cs")).toBe("علوم الحاسب · اختياري");
    expect(requirementLabel(rows, "ai")).toBe("الذكاء الاصطناعي · إجباري");
    expect(requirementLabel(rows)).toBe("متطلب تخصص · حسب التخصص");
  });
  it("rejects unrecognized program filters and returns an honest empty match", () => {
    expect(parseProgram("admin")).toBeUndefined();
    expect(parseProgram(["cs"])).toBeUndefined();
    expect(
      filterAndRankCourses(courses, requirements, { q: "no-such-course" }),
    ).toEqual([]);
  });
});
