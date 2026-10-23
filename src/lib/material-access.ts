import "server-only";
import { cache } from "react";
import { z } from "zod";
import { configured, createClient } from "@/lib/supabase/server";
const accessSchema = z.object({
  open_to_all: z.boolean(),
  can_publish: z.boolean(),
  can_organize: z.boolean(),
});
export const materialAccess = cache(async () => {
  if (!configured())
    return { open_to_all: false, can_publish: false, can_organize: false };
  const db = await createClient();
  const { data, error } = await db.rpc("material_access");
  if (error) throw error;
  return accessSchema.parse(data);
});
export const publishingLockedMessage =
  "إضافة المصادر متاحة حاليًا للحسابات المصرّح لها من الإدارة.";
