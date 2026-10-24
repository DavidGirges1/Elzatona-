import "server-only";
import { cache } from "react";
import { z } from "zod";
import { configured, createClient } from "@/lib/supabase/server";
const accessSchema = z.object({
  open_to_all: z.boolean(),
  can_submit: z.boolean(),
  can_publish: z.boolean(),
  can_organize: z.boolean(),
  can_review: z.boolean(),
});
export const materialAccess = cache(async (courseId?: string) => {
  if (!configured())
    return {
      open_to_all: false,
      can_submit: false,
      can_publish: false,
      can_organize: false,
      can_review: false,
    };
  const { data, error } = await (
    await createClient()
  ).rpc("material_access", courseId ? { p_course: courseId } : {});
  if (error) throw error;
  return accessSchema.parse(data);
});
export const publishingLockedMessage =
  "كمّل حسابك وفعّل بريدك عشان تقدر تبعت مصادر للمراجعة.";
