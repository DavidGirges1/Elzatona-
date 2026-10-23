import Link from "next/link";
import { materialAccess } from "@/lib/material-access";
import { appPath } from "@/lib/paths";
import { MaterialPreview } from "@/components/material-preview";
import { ResourceVote } from "@/components/resource-vote";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getResource, getResources, getDiscussions } from "@/lib/data";
import { createClient, currentUser } from "@/lib/supabase/server";
import { save } from "@/lib/actions";
import { ActionForm, Submit, Share } from "@/components/forms";
import { ResourceRow, TypeBadge } from "@/components/content";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id, slug } = await params;
  const r = await getResource(id);
  if (!r || r.course_slug !== slug) return { title: "المصدر مش موجود" };
  return {
    title: r.title,
    description: r.description?.slice(0, 160) || r.course_title,
    openGraph: {
      title: r.title,
      description: r.course_title,
      url: appPath(`/courses/${slug}/resources/${id}`),
      locale: "ar_EG",
    },
  };
}
export default async function ResourcePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<{ reported?: string }>;
}) {
  const { slug, id } = await params;
  const r = await getResource(id);
  if (!r || r.course_slug !== slug) notFound();
  const path = `/courses/${slug}/resources/${id}`;
  const [user, related, discussions, s] = await Promise.all([
    currentUser(),
    getResources({ courseId: r.course_id, topic: r.topic_id || undefined }),
    getDiscussions(r.course_id, id),
    searchParams,
  ]);
  const access = await materialAccess();
  let saved = false,
    myVote = 0;
  if (user) {
    const db = await createClient();
    const [a, b] = await Promise.all([
      db
        .from("resource_saves")
        .select("resource_id")
        .eq("resource_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
      db
        .from("resource_votes")
        .select("value")
        .eq("resource_id", id)
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    saved = Boolean(a.data);
    myVote = b.data?.value || 0;
  }
  return (
    <div className="detail">
      <Link className="breadcrumb" href={`/courses/${slug}`}>
        <ArrowRight size={16} />
        <bdi>{r.course_title}</bdi>
        {r.topic_title && (
          <>
            {" "}
            / <bdi>{r.topic_title}</bdi>
          </>
        )}
      </Link>
      {s.reported && (
        <p className="notice" role="status">
          وصل البلاغ للمراجعة. شكرًا إنك بتساعدنا.
        </p>
      )}
      <article className="panel resource-detail-panel">
        <TypeBadge type={r.type} />
        <h1>
          <bdi>{r.title}</bdi>
        </h1>
        <p className="muted">
          مشاركة{" "}
          <Link className="text-link" href={`/u/${r.author_id}`}>
            <bdi>{r.author_name}</bdi>
          </Link>{" "}
          ·{" "}
          {new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(
            new Date(r.created_at),
          )}
        </p>
        {r.description && <p className="description">{r.description}</p>}
        {r.is_ai_assisted && <p className="notice">المحتوى معمول بمساعدة AI</p>}
        <MaterialPreview
          id={id}
          title={r.title}
          kind={r.source_kind}
          url={r.external_url}
        />
        <div className="resource-feedback">
          <ResourceVote
            id={id}
            path={path}
            score={r.score}
            value={myVote}
            signedIn={Boolean(user)}
            own={user?.id === r.author_id}
          />
          {user ? (
            <ActionForm action={save.bind(null, id, path)}>
              <Submit variant="outline">
                {saved ? "محفوظ · إزالة" : "احفظ"}
              </Submit>
            </ActionForm>
          ) : (
            <Link
              className="button secondary"
              href={`/login?next=${encodeURIComponent(path)}&intent=save`}
            >
              احفظ
            </Link>
          )}
          <details className="resource-share">
            <summary className="button secondary">شارك</summary>
            <div className="share-options">
              <Share title={r.title} />
            </div>
          </details>
          <a
            className="text-link resource-question-link"
            href="#resource-questions"
          >
            اسأل عن المصدر
          </a>
        </div>
        <div className="section-head">
          <Link className="text-link" href={`${path}/report`}>
            بلّغ عن مشكلة
          </Link>
          {user &&
            (access.can_organize ||
              (user.id === r.author_id && access.can_publish)) && (
              <Link className="text-link" href={`${path}/edit`}>
                تعديل المصدر
              </Link>
            )}
        </div>
      </article>
      <section>
        <div className="section-head">
          <h2>مصادر تانية {r.topic_id ? "لنفس الموضوع" : "للمادة"}</h2>
        </div>
        <div className="resource-list">
          {related
            .filter((x) => x.id !== id)
            .slice(0, 3)
            .map((x) => (
              <ResourceRow resource={x} slug={slug} key={x.id} />
            ))}
        </div>
        <Link className="text-link" href={`/courses/${slug}`}>
          شوف باقي مصادر المادة
        </Link>
      </section>
      <section id="resource-questions">
        <div className="section-head">
          <h2>أسئلة عن المصدر ده</h2>
          <Link href={`/courses/${slug}/ask?resource=${id}`}>اسأل دفعتك</Link>
        </div>
        {discussions.length ? (
          discussions.map((d) => (
            <Link
              className="panel"
              style={{ display: "block", marginBottom: 12 }}
              key={d.id}
              href={`/courses/${slug}/discussions/${d.id}`}
            >
              <bdi>{d.title}</bdi>
            </Link>
          ))
        ) : (
          <p className="muted">لسه مفيش أسئلة عن المصدر ده.</p>
        )}
      </section>
    </div>
  );
}
