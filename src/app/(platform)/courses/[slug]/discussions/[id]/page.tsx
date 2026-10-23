import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse } from "@/lib/data";
import { createClient, currentUser } from "@/lib/supabase/server";
import { reply } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
import { idSchema } from "@/lib/validation";
export default async function Discussion({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const c = await getCourse(slug);
  if (!c || !idSchema.safeParse(id).success) notFound();
  const db = await createClient();
  const { data: d, error } = await db
    .from("discussions")
    .select("*")
    .eq("id", id)
    .eq("course_id", c.id)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw error;
  if (!d) notFound();
  const { data: replies, error: re } = await db
    .from("discussion_replies")
    .select("*")
    .eq("discussion_id", id)
    .eq("status", "published")
    .order("created_at")
    .limit(100);
  if (re) throw re;
  const user = await currentUser();
  const path = `/courses/${slug}/discussions/${id}`;
  return (
    <div className="detail">
      <Link className="breadcrumb" href={`/courses/${slug}?tab=discussions`}>
        {c.title_ar || c.title} / المناقشات
      </Link>
      <article className="panel">
        <h1>
          <bdi>{d.title}</bdi>
        </h1>
        <p className="description" dir="auto">
          {d.body}
        </p>
        <Link className="text-link" href={`/u/${d.author_id}`}>
          صاحب السؤال
        </Link>
        {d.resource_id && (
          <Link
            className="button ghost"
            href={`/courses/${slug}/resources/${d.resource_id}`}
          >
            المصدر المرتبط
          </Link>
        )}
        <Link className="text-link" href={`${path}/report`}>
          بلّغ عن مشكلة
        </Link>
      </article>
      <div className="section-head">
        <h2>ردود الدفعة</h2>
      </div>
      {replies?.map((r) => (
        <article className="panel" style={{ marginBottom: 12 }} key={r.id}>
          <p className="description" dir="auto">
            {r.body}
          </p>
          <Link className="text-link" href={`/u/${r.author_id}`}>
            صاحب الرد
          </Link>
          <Link className="button ghost" href={`${path}/report?reply=${r.id}`}>
            بلّغ عن الرد
          </Link>
        </article>
      ))}
      {!replies?.length && (
        <p className="muted">لسه مفيش ردود. عندك إجابة تساعد؟</p>
      )}
      {user ? (
        <ActionForm action={reply.bind(null, id, path)} className="panel">
          <label className="field">
            رد على السؤال
            <textarea
              name="body"
              required
              minLength={2}
              maxLength={3000}
              dir="auto"
            />
          </label>
          <Submit>ضيف ردك</Submit>
        </ActionForm>
      ) : (
        <Link
          className="button primary"
          href={`/login?next=${encodeURIComponent(path)}`}
        >
          سجّل دخولك عشان ترد
        </Link>
      )}
    </div>
  );
}
