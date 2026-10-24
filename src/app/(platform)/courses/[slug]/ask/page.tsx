import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getCourse, getResource, getLectures } from "@/lib/data";
import { currentUser } from "@/lib/supabase/server";
import { ask } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
export default async function Ask({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ resource?: string; lecture?: string }>;
}) {
  const { slug } = await params;
  const { resource, lecture } = await searchParams;
  const c = await getCourse(slug);
  if (!c) notFound();
  const r = resource ? await getResource(resource) : null;
  if (resource && (!r || r.course_id !== c.id)) notFound();
  const l = lecture
    ? (await getLectures(c.id)).find((l) => l.id === lecture)
    : null;
  if (lecture && !l) notFound();
  const path = `/courses/${slug}/ask${resource ? "?resource=" + resource : lecture ? "?lecture=" + lecture : ""}`;
  if (!(await currentUser()))
    redirect(`/login?next=${encodeURIComponent(path)}`);
  return (
    <div className="form-page">
      <Link className="breadcrumb" href={`/courses/${slug}?tab=discussions`}>
        {c.title_ar || c.title} / المناقشات
      </Link>
      <h1>اسأل دفعتك</h1>
      {l && (
        <p className="muted">
          عن المحاضرة {l.number} · <bdi>{l.title}</bdi>
        </p>
      )}
      {r && (
        <p className="muted">
          عن المصدر: <bdi>{r.title}</bdi>
        </p>
      )}
      <ActionForm
        action={ask.bind(null, slug, c.id, resource || null)}
        className="panel"
      >
        {l && <input type="hidden" name="lecture_id" value={l.id} />}
        <label className="field">
          سؤالك في سطر
          <input
            name="title"
            required
            minLength={4}
            maxLength={160}
            dir="auto"
          />
        </label>
        <label className="field">
          وضح اللي محتاج تفهمه
          <textarea
            name="body"
            required
            minLength={8}
            maxLength={5000}
            dir="auto"
          />
        </label>
        <Submit>انشر السؤال</Submit>
      </ActionForm>
    </div>
  );
}
