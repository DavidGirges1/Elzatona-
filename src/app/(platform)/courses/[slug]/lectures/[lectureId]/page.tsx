import Link from "next/link";
import { notFound } from "next/navigation";
import { getCourse, getLectures, getResources, getResource } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { materialAccess } from "@/lib/material-access";
import { ResourceRow, Empty } from "@/components/content";
import { ActionForm, Submit } from "@/components/forms";
import { chooseLectureMain } from "@/lib/community-actions";
export const metadata = { title: "المحاضرة" };
export default async function LecturePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; lectureId: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { slug, lectureId } = await params;
  const c = await getCourse(slug);
  if (!c) notFound();
  const lectures = await getLectures(c.id);
  const l = lectures.find((l) => l.id === lectureId);
  if (!l) notFound();
  const page = Math.max(
    1,
    Math.min(1000, Math.trunc(Number((await searchParams).page)) || 1),
  );
  const path = `/courses/${slug}`;
  const here = `${path}/lectures/${l.id}`;
  const [study, practice, access, mainResult] = await Promise.all([
    getResources({ courseId: c.id, lecture: l.id, purpose: "study", page }),
    getResources({ courseId: c.id, lecture: l.id, purpose: "solve", page }),
    materialAccess(c.id),
    (await createClient())
      .from("resource_lectures")
      .select("resource_id")
      .eq("lecture_id", l.id)
      .eq("is_main", true)
      .maybeSingle(),
  ]);
  if (mainResult.error) throw mainResult.error;
  const main = mainResult.data
    ? await getResource(mainResult.data.resource_id)
    : null;
  const extra = study.filter((r) => r.id !== main?.id);
  const i = lectures.findIndex((x) => x.id === l.id);
  return (
    <div className="lecture-detail">
      <Link className="breadcrumb" href={path}>
        <bdi>{c.title_ar || c.title}</bdi> / المحاضرات
      </Link>
      <header className="section-head">
        <h1>
          المحاضرة {new Intl.NumberFormat("ar-EG").format(l.number)}
          {l.title && (
            <>
              {" "}
              · <bdi>{l.title}</bdi>
            </>
          )}
        </h1>
        {access.can_submit && (
          <Link
            className="button secondary"
            href={`${path}/submit?lecture=${l.id}`}
          >
            ضيف مصدر
          </Link>
        )}
      </header>
      <section>
        <div className="section-head">
          <h2>المذاكرة</h2>
          <Link href={`${path}/ask?lecture=${l.id}`}>اسأل عن المحاضرة</Link>
        </div>
        {main && page === 1 && (
          <div className="lecture-start">
            <span className="sticker">ابدأ هنا</span>
            <ResourceRow resource={main} slug={slug} showContext={false} />
          </div>
        )}
        {!main && page === 1 && extra.length > 0 && (
          <p className="muted small">مصادر المذاكرة المتاحة للمحاضرة.</p>
        )}
        {extra.length ? (
          <>
            <div className="resource-list">
              {extra.slice(0, main ? 0 : 3).map((r) => (
                <ResourceRow
                  key={r.id}
                  resource={r}
                  slug={slug}
                  showContext={false}
                />
              ))}
            </div>
            {(main || extra.length > 3) && (
              <details
                className="lecture-alternatives"
                open={page > 1 ? true : undefined}
              >
                <summary className="text-link">
                  {main ? "شروحات إضافية" : "اعرض الباقي"}
                </summary>
                <div className="resource-list">
                  {extra.slice(main ? 0 : 3).map((r) => (
                    <ResourceRow
                      key={r.id}
                      resource={r}
                      slug={slug}
                      showContext={false}
                    />
                  ))}
                </div>
              </details>
            )}
          </>
        ) : (
          !main && <Empty title="لسه مفيش مصادر مذاكرة للمحاضرة دي" />
        )}
      </section>
      <section>
        <h2>الشيتات والتدريب</h2>
        {practice.length ? (
          <div className="resource-list">
            {[...practice]
              .sort(
                (a, b) =>
                  Number(b.type === "sheets") - Number(a.type === "sheets"),
              )
              .map((r) => (
                <ResourceRow
                  key={r.id}
                  resource={r}
                  slug={slug}
                  showContext={false}
                />
              ))}
          </div>
        ) : (
          <p className="muted">الشيتات والأسئلة هتظهر هنا أول ما تتضاف.</p>
        )}
      </section>
      <nav className="pagination" aria-label="صفحات مصادر المحاضرة">
        {page > 1 && (
          <Link href={`${here}?page=${page - 1}`}>المصادر السابقة</Link>
        )}
        {(study.length === 20 || practice.length === 20) && (
          <Link href={`${here}?page=${page + 1}`}>مصادر أكتر</Link>
        )}
      </nav>
      {access.can_organize && (
        <details className="panel">
          <summary className="text-link">اختار مصدر البداية للمحاضرة</summary>
          <p className="muted small">
            اختيار واحد واضح للمذاكرة، وباقي الشروحات هتفضل متاحة.
          </p>
          <ActionForm action={chooseLectureMain.bind(null, l.id, slug)}>
            <label className="field">
              المصدر
              <select name="resource" defaultValue={main?.id || ""}>
                <option value="">بدون اختيار</option>
                {main && !study.some((r) => r.id === main.id) && (
                  <option value={main.id}>{main.title}</option>
                )}
                {study.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <Submit variant="outline">احفظ الاختيار</Submit>
          </ActionForm>
        </details>
      )}
      <nav className="lecture-neighbors" aria-label="بين المحاضرات">
        {lectures[i - 1] && (
          <Link href={`${path}/lectures/${lectures[i - 1].id}`}>
            المحاضرة السابقة
          </Link>
        )}
        {lectures[i + 1] && (
          <Link href={`${path}/lectures/${lectures[i + 1].id}`}>
            المحاضرة التالية
          </Link>
        )}
      </nav>
    </div>
  );
}
