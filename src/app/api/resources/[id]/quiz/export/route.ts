import { createClient } from "@/lib/supabase/server";
import { idSchema } from "@/lib/validation";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!idSchema.safeParse(id).success)
    return new Response("المجموعة مش متاحة", { status: 404 });
  const { data, error } = await (
    await createClient()
  ).rpc("export_quiz", { p_resource: id });
  if (error || !data) return new Response("المجموعة مش متاحة", { status: 404 });
  return new Response(JSON.stringify(data, null, 1), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="elzatona-quiz-${id}.json"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
