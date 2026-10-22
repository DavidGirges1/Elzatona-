import { notFound } from "next/navigation";
import { createClient, configured } from "@/lib/supabase/server";
import { getResources } from "@/lib/data";
import { ResourceRow, Empty } from "@/components/content";
import { idSchema } from "@/lib/validation";
export default async function PublicProfile({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!configured() || !idSchema.safeParse(id).success) notFound();
  const db = await createClient();
  const { data: p, error } = await db
    .from("profiles")
    .select("display_name")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!p) notFound();
  const { data: rows } = await db
    .from("resources")
    .select("id")
    .eq("author_id", id)
    .eq("status", "published")
    .limit(100);
  const resources = await getResources({ ids: rows?.map((x) => x.id) || [] });
  return (
    <>
      <p className="eyebrow">من مجتمع الزتونة</p>
      <h1>
        <bdi>{p.display_name}</bdi>
      </h1>
      <div className="section-head">
        <h2>المشاركات المنشورة</h2>
      </div>
      {resources.length ? (
        <div className="resource-list">
          {resources.map((r) => (
            <ResourceRow key={r.id} resource={r} slug={r.course_slug} />
          ))}
        </div>
      ) : (
        <Empty title="لسه مفيش مشاركات منشورة" />
      )}
    </>
  );
}
