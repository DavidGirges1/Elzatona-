import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";
import { quizDraftSchema, type PublicQuiz } from "./schema";
export const readQuiz = cache(
  async (id: string): Promise<PublicQuiz | null> => {
    if (!idSchema.safeParse(id).success) return null;
    const db = await createClient();
    const { data, error } = await db.rpc("read_quiz", { p_resource: id });
    if (error) throw error;
    return data as PublicQuiz | null;
  },
);
export async function privateQuiz(id: string) {
  if (!idSchema.safeParse(id).success) return null;
  const db = await createClient();
  const [resource, quiz] = await Promise.all([
    db
      .from("resources")
      .select("*")
      .eq("id", id)
      .eq("source_kind", "quiz")
      .maybeSingle(),
    db
      .from("quiz_sets")
      .select("document,revision")
      .eq("resource_id", id)
      .maybeSingle(),
  ]);
  if (resource.error) throw resource.error;
  if (quiz.error) throw quiz.error;
  if (!resource.data || !quiz.data) return null;
  const document = quizDraftSchema.parse({
    ...(quiz.data.document as object),
    title: resource.data.title,
    description: resource.data.description || "",
  });
  return { resource: resource.data, document, revision: quiz.data.revision };
}
