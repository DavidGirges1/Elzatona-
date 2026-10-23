import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUser, createClient } from "@/lib/supabase/server";
import { moderate } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
import { Empty } from "@/components/content";
export default async function Reports() {
  if (!(await currentUser())) redirect("/login?next=/admin/reports");
  const db = await createClient();
  const { data: allowed } = await db.rpc("is_moderator");
  if (!allowed) notFound();
  const { data: reports, error } = await db
    .from("reports")
    .select("*")
    .eq("status", "open")
    .order("created_at")
    .limit(50);
  if (error) throw error;
  const reviewed = await Promise.all(
    (reports || []).map(async (report) => {
      let title = "",
        body = "",
        url = "";
      if (report.resource_id) {
        const { data: r } = await db
          .from("resource_cards")
          .select("*")
          .eq("id", report.resource_id)
          .maybeSingle();
        if (r) {
          title = r.title;
          body = r.description || "";
          url = `/courses/${r.course_slug}/resources/${r.id}`;
        }
      } else {
        let discussionId = report.discussion_id;
        if (report.reply_id) {
          const { data: r } = await db
            .from("discussion_replies")
            .select("*")
            .eq("id", report.reply_id)
            .maybeSingle();
          body = r?.body || "";
          discussionId = r?.discussion_id || null;
        }
        if (discussionId) {
          const { data: d } = await db
            .from("discussions")
            .select("*")
            .eq("id", discussionId)
            .maybeSingle();
          if (d) {
            title = d.title;
            if (!report.reply_id) body = d.body;
            const { data: c } = await db
              .from("courses")
              .select("slug")
              .eq("id", d.course_id)
              .maybeSingle();
            if (c) url = `/courses/${c.slug}/discussions/${d.id}`;
          }
        }
      }
      return { report, title, body, url };
    }),
  );
  return (
    <>
      <div className="section-head">
        <h1>مراجعة البلاغات</h1>
        <Link href="/admin/highlights">اختيارات المواد</Link>
      </div>
      {!reports?.length ? (
        <Empty title="مفيش بلاغات مفتوحة" />
      ) : (
        reviewed.map(({ report: r, title, body, url }) => (
          <article className="panel" key={r.id} style={{ marginBottom: 16 }}>
            <h2>
              بلاغ: <bdi>{r.reason}</bdi>
            </h2>
            <section className="notice">
              <h3>
                <bdi>{title || "المحتوى غير متاح"}</bdi>
              </h3>
              <p className="description">{body}</p>
              {url && (
                <Link href={url} className="text-link">
                  افتح المحتوى للمراجعة
                </Link>
              )}
            </section>
            <p className="description">{r.details}</p>
            <p>
              المحتوى:{" "}
              <bdi>{r.resource_id || r.discussion_id || r.reply_id}</bdi>
            </p>
            <ActionForm action={moderate.bind(null, r.id)}>
              <label className="field">
                القرار
                <select name="action">
                  <option value="hide">إخفاء المحتوى وحل البلاغ</option>
                  <option value="dismiss">رفض البلاغ</option>
                </select>
              </label>
              <label className="field">
                سبب القرار
                <textarea
                  name="reason"
                  required
                  minLength={4}
                  maxLength={1000}
                />
              </label>
              <label className="check">
                <input type="checkbox" name="confirm" required />
                راجعت المحتوى وأؤكد القرار
              </label>
              <Submit>نفّذ القرار</Submit>
            </ActionForm>
          </article>
        ))
      )}
    </>
  );
}
