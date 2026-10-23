import { notFound, redirect } from "next/navigation";
import { getResource, getTopics } from "@/lib/data";
import { currentUser } from "@/lib/supabase/server";
import { editResource } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
export default async function Edit({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const r = await getResource(id);
  if (!r || r.course_slug !== slug) notFound();
  const user = await currentUser();
  if (!user)
    redirect(
      `/login?next=${encodeURIComponent(`/courses/${slug}/resources/${id}/edit`)}`,
    );
  if (r.author_id !== user.id) notFound();
  const topics = await getTopics(r.course_id);
  return (
    <div className="form-page">
      <h1>تعديل المصدر</h1>
      <ActionForm className="panel" action={editResource.bind(null, id, slug)}>
        <label className="field">
          العنوان
          <input
            name="title"
            defaultValue={r.title}
            minLength={4}
            maxLength={160}
            required
            dir="auto"
          />
        </label>
        <label className="field">
          الوصف
          <textarea
            name="description"
            defaultValue={r.description || ""}
            maxLength={2000}
            dir="auto"
          />
        </label>
        <label className="field">
          الموضوع
          <select name="topic_id" defaultValue={r.topic_id || ""}>
            <option value="">المادة كلها</option>
            {topics.map((t) => (
              <option value={t.id} key={t.id}>
                {t.title_ar || t.title}
              </option>
            ))}
          </select>
        </label>
        <Submit>احفظ التعديل</Submit>
      </ActionForm>
    </div>
  );
}
