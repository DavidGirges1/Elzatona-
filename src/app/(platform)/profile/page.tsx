import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser, createClient } from "@/lib/supabase/server";
import { getResources } from "@/lib/data";
import { ResourceRow } from "@/components/content";
import { ActionForm, Submit } from "@/components/forms";
import { updateProfile, signOut, retryPdf } from "@/lib/actions";
export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ updated?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login?next=/profile");
  const db = await createClient();
  const [p, pending, s] = await Promise.all([
    db.from("profiles").select("*").eq("id", user.id).single(),
    db
      .from("resources")
      .select("*")
      .eq("author_id", user.id)
      .eq("status", "pending")
      .eq("source_kind", "pdf"),
    searchParams,
  ]);
  const { data: own } = await db
    .from("resources")
    .select("id")
    .eq("author_id", user.id)
    .eq("status", "published");
  const resources = await getResources({ ids: own?.map((x) => x.id) || [] });
  return (
    <div className="form-page">
      <h1>حسابك</h1>
      {s.updated && (
        <p className="notice" role="status">
          اتحفظ الاسم.
        </p>
      )}
      <ActionForm className="panel" action={updateProfile}>
        <label className="field">
          الاسم اللي يظهر مع مشاركاتك
          <input
            name="name"
            defaultValue={p.data?.display_name || ""}
            minLength={2}
            maxLength={80}
            required
            dir="auto"
          />
        </label>
        <Submit>احفظ الاسم</Submit>
      </ActionForm>
      <section className="panel">
        <h2>بياناتك الدراسية</h2>
        <p className="muted">جامعتك وكليتك وسنتك بتحدد المواد اللي بتظهرلك.</p>
        <Link className="button secondary" href="/onboarding?edit=1">
          تعديل الجامعة والكلية والسنة
        </Link>
      </section>
      <div className="actions">
        <Link className="button secondary" href="/my-quizzes">
          مجموعات أسئلتي
        </Link>
        <Link className="button secondary" href={`/u/${user.id}`}>
          صفحتك العامة
        </Link>
        <form action={signOut}>
          <button className="button ghost">تسجيل الخروج</button>
        </form>
      </div>
      {pending.data?.map((r) => (
        <section className="panel" key={r.id}>
          <h2>
            <bdi>{r.title}</bdi>
          </h2>
          <p className="muted">PDF معلّق · لسه مش ظاهر للطلبة</p>
          <ActionForm action={retryPdf.bind(null, r.id)}>
            <label className="field">
              إعادة رفع الملف عند الحاجة
              <input type="file" name="file" accept="application/pdf,.pdf" />
            </label>
            <Submit>أعد المحاولة وانشر</Submit>
          </ActionForm>
        </section>
      ))}
      <div className="section-head">
        <h2>مشاركاتك</h2>
      </div>
      <div className="resource-list">
        {resources.map((r) => (
          <ResourceRow key={r.id} resource={r} slug={r.course_slug} />
        ))}
      </div>
    </div>
  );
}
