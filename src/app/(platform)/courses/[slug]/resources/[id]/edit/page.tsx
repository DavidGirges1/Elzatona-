import { materialAccess } from "@/lib/material-access";
import { MaterialLocked } from "@/components/material-locked";
import { notFound, redirect } from "next/navigation";
import { getCourse, getTopics } from "@/lib/data";
import { currentUser, createClient } from "@/lib/supabase/server";
import { editResource } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
export default async function Edit({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const db = await createClient();
  const row = await db.from("resources").select("*").eq("id", id).maybeSingle();
  const r = row.data;
  const course = await getCourse(slug);
  if (
    !r ||
    !course ||
    r.course_id !== course.id ||
    r.status === "hidden" ||
    (r.source_kind === "quiz" && r.status === "pending")
  )
    notFound();
  const user = await currentUser();
  if (!user)
    redirect(
      `/login?next=${encodeURIComponent(`/courses/${slug}/resources/${id}/edit`)}`,
    );
  const access = await materialAccess(r.course_id);
  const admin = await db.rpc("is_admin");
  if (
    r.status === "pending"
      ? !(r.author_id === user.id || admin.data)
      : !access.can_organize && !(r.author_id === user.id && access.can_publish)
  )
    return <MaterialLocked slug={slug} edit />;
  const topics = await getTopics(r.course_id);
  return (
    <div className="form-page">
      <h1>تعديل المصدر</h1>
      {r.status === "pending" && (
        <p className="notice">
          التعديل هيتبعت للمراجعة من جديد. النسخة المعدّلة مش هتظهر للطلبة قبل
          الموافقة.
        </p>
      )}
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
        {r.status === "pending" && r.source_kind === "external" && (
          <label className="field">
            لينك المصدر
            <input
              name="external_url"
              type="url"
              required
              defaultValue={r.external_url || ""}
              dir="ltr"
            />
          </label>
        )}
        <Submit>
          {r.status === "pending" ? "احفظ وأعد للمراجعة" : "احفظ التعديل"}
        </Submit>
      </ActionForm>
    </div>
  );
}
