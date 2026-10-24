import { z } from "zod";
export function safeNext(value: unknown): string {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.length > 2048
  )
    return "/";
  let decoded = value;
  for (let i = 0; i < 4; i++) {
    if (decoded.startsWith("//") || /[\\\\\u0000-\u0020]/.test(decoded))
      return "/";
    try {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    } catch {
      return "/";
    }
  }
  try {
    if (
      new URL(value, "https://elzatona.invalid").origin !==
      "https://elzatona.invalid"
    )
      return "/";
  } catch {
    return "/";
  }
  return value;
}
export function normalizeUrl(input: string): string {
  const u = new URL(input);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443")
  )
    throw new Error("unsafe URL");
  const h = u.hostname.toLowerCase();
  if (
    !h.includes(".") ||
    h.endsWith(".local") ||
    h.endsWith(".localhost") ||
    h.endsWith(".internal") ||
    h.includes(":") ||
    /^\d+\.\d+\.\d+\.\d+$/.test(h)
  )
    throw new Error("unsafe host");
  for (const key of [...u.searchParams.keys()])
    if (key.startsWith("utm_") || ["fbclid", "gclid"].includes(key))
      u.searchParams.delete(key);
  u.hash = "";
  return u.toString();
}
export const resourceTypes = [
  "notes",
  "slides",
  "sections",
  "past_exam",
  "video",
  "question_bank",
  "sheets",
  "reference",
  "other",
] as const;
export type ResourceType = (typeof resourceTypes)[number];
export const studyResourceTypes = [
  "video",
  "slides",
  "sections",
  "notes",
  "reference",
  "other",
] as const;
export const solveResourceTypes = [
  "question_bank",
  "sheets",
  "past_exam",
] as const;
export function resourceTypesForPurpose(
  purpose?: string,
): readonly ResourceType[] {
  return purpose === "study"
    ? studyResourceTypes
    : purpose === "solve"
      ? solveResourceTypes
      : resourceTypes;
}
// PostgreSQL UUID columns also accept IDs without RFC version/variant bits.
export const idSchema = z.guid();
export const resourceSchema = z.object({
  course_id: idSchema,
  title: z.string().trim().min(4, "اكتب عنوان من ٤ حروف على الأقل").max(160),
  description: z.string().trim().max(2000),
  type: z.enum(resourceTypes),
  external_url: z.string().transform((s, ctx) => {
    try {
      return normalizeUrl(s);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "اللينك مش صالح. جرّب لينك عام بيبدأ بـ https://",
      });
      return z.NEVER;
    }
  }),
  rights_confirmed: z.literal("on", { error: "أكد إن عندك حق مشاركة المصدر" }),
  is_ai_assisted: z.string().optional(),
});
export const questionSchema = z.object({
  title: z.string().trim().min(4).max(160),
  body: z.string().trim().min(8).max(5000),
});
