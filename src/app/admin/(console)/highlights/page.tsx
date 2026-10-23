import { notFound, redirect } from "next/navigation";
import { currentUser, createClient } from "@/lib/supabase/server";
import { getCourses, getResources } from "@/lib/data";
import { highlight } from "@/lib/actions";
import { ActionForm, Submit } from "@/components/forms";
export default async function Highlights({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; updated?: string }>;
}) {
  if (!(await currentUser())) redirect("/login?next=/admin/highlights");
  const db = await createClient();
  if (!(await db.rpc("is_moderator")).data) notFound();
  const s = await searchParams;
  const courses = await getCourses("", true);
  const course = courses.find((c) => c.id === s.course) || courses[0];
  const resources = course ? await getResources({ courseId: course.id }) : [];
  const { data: existing } = course
    ? await db
        .from("course_highlights")
        .select("*")
        .eq("course_id", course.id)
        .order("position")
    : { data: [] };
  return (
    <div className="form-page">
      <h1>زتونة المادة</h1>
      <p className="muted">
        اختار لحد ٣ مصادر منشورة. الاختيار تحريري ومش اعتماد من الجامعة.
      </p>
      {s.updated && <p className="notice">اتحفظت الاختيارات.</p>}
      <form className="panel">
        <label className="field">
          المادة
          <select name="course" defaultValue={course?.id}>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title_ar || c.title}
              </option>
            ))}
          </select>
        </label>
        <button className="button secondary">اعرض المادة</button>
      </form>
      {course && (
        <>
          <div className="section-head">
            <h2>الاختيارات الحالية</h2>
          </div>
          {existing?.map((h) => (
            <p key={h.id}>
              {h.position} ·{" "}
              <bdi>
                {resources.find((r) => r.id === h.resource_id)?.title ||
                  h.resource_id}
              </bdi>
            </p>
          ))}
          <ActionForm className="panel" action={highlight}>
            <input type="hidden" name="course" value={course.id} />
            <label className="field">
              الترتيب
              <select name="position">
                <option value="1">١</option>
                <option value="2">٢</option>
                <option value="3">٣</option>
              </select>
            </label>
            <label className="field">
              المصدر
              <select name="resource">
                <option value="">إزالة الاختيار من الترتيب</option>
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              ملاحظة التحرير
              <input name="note" maxLength={300} />
            </label>
            <Submit>احفظ الاختيار</Submit>
          </ActionForm>
        </>
      )}
    </div>
  );
}
