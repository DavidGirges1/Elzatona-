import { redirect } from "next/navigation";
import { currentUser, createClient } from "@/lib/supabase/server";
import { getResources } from "@/lib/data";
import { ResourceRow, Empty } from "@/components/content";
export default async function Saved() {
  const user = await currentUser();
  if (!user) redirect("/login?next=/saved&intent=save");
  const db = await createClient();
  const { data, error } = await db
    .from("resource_saves")
    .select("resource_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  const resources = await getResources({
    ids: (data || []).map((x) => x.resource_id),
  });
  return (
    <>
      <h1>محفوظاتك</h1>
      <p className="muted">مصادر حبيّت ترجع لها. محفوظاتك ظاهرة ليك بس.</p>
      {resources.length ? (
        <div className="resource-list">
          {resources.map((r) => (
            <ResourceRow key={r.id} resource={r} slug={r.course_slug} />
          ))}
        </div>
      ) : (
        <Empty title="لسه مفيش مصادر محفوظة">
          <p>افتح أي مصدر واضغط احفظ عشان ترجعلُه بسهولة.</p>
        </Empty>
      )}
    </>
  );
}
