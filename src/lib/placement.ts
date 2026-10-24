import { z } from "zod";
import { idSchema, type ResourceType } from "./validation";
export const materialAreas = [
  "lecture",
  "general",
  "revision",
  "sections",
] as const;
export type MaterialArea = (typeof materialAreas)[number];
export type Placement = { area: MaterialArea; lectures: string[] };
export type LectureOption = { id: string; number: number; title: string };
export const areaLabels: Record<MaterialArea, string> = {
  lecture: "محاضرة",
  general: "ملفات المادة",
  revision: "المراجعة والامتحانات",
  sections: "السكاشن واللابات",
};
export function lectureLabel(l: Pick<LectureOption, "number" | "title">) {
  return `المحاضرة ${new Intl.NumberFormat("ar-EG").format(l.number)}${l.title ? ` · ${l.title}` : ""}`;
}
export const placementSchema = z
  .object({
    area: z.enum(materialAreas, { error: "اختار مكان المصدر الأول." }),
    lectures: z.array(idSchema).max(100),
  })
  .superRefine((p, ctx) => {
    if (
      (p.area === "lecture") !== p.lectures.length > 0 ||
      new Set(p.lectures).size !== p.lectures.length
    )
      ctx.addIssue({
        code: "custom",
        message: "اختار محاضرة واحدة على الأقل، أو مكان عام مناسب للمصدر.",
      });
  });
export function placementFromForm(form: FormData) {
  return placementSchema.safeParse({
    area: form.get("area"),
    lectures: form.getAll("lectures"),
  });
}
export function typesForArea(area: string): ResourceType[] {
  if (area === "sections") return ["sections"];
  const study: ResourceType[] = [
    "video",
    "slides",
    "notes",
    "reference",
    "other",
  ];
  if (area === "general") return study;
  return [
    ...study,
    "sheets",
    "question_bank",
    ...(area === "revision" ? ["past_exam" as const] : []),
  ];
}
export function placementPath(slug: string, area: string, lecture?: string) {
  return `/courses/${slug}/${area === "lecture" && lecture ? `lectures/${lecture}` : area === "lecture" ? "" : area}`;
}
