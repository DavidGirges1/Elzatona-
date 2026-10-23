import Link from "next/link";
import { requireStudent } from "@/lib/auth/session";
import { ArrowUpLeft, Plus, BookOpen } from "lucide-react";
import { currentUser, configured } from "@/lib/supabase/server";
import { getCourses, getFollowedIds, getResources } from "@/lib/data";
import { ar } from "@/i18n/ar-EG";
import {
  CourseTile,
  Empty,
  SearchBar,
  ResourceRow,
} from "@/components/content";
export default async function Home() {
  await requireStudent("/dashboard");
  const user = await currentUser();
  const [courses, ids] = await Promise.all([getCourses(), getFollowedIds()]);
  const selected = user ? courses.filter((c) => ids.includes(c.id)) : courses;
  const updates =
    user && ids.length
      ? (await getResources())
          .filter((r) => ids.includes(r.course_id))
          .slice(0, 4)
      : [];
  return (
    <>
      <header className="intro">
        <p className="eyebrow">
          <BookOpen size={16} /> مساحة لمصادر موادك
        </p>
        <h1>{ar.headline}</h1>
        <p className="muted">{ar.intro}</p>
      </header>
      <SearchBar />
      <div className="section-head">
        <h2>{user ? ar.home : "اكتشف موادك"}</h2>
        <Link href="/courses">
          {user ? "تعديل المواد" : "كل المواد"} <ArrowUpLeft size={18} />
        </Link>
      </div>
      {!configured() ? (
        <Empty title={ar.setup}>
          <p>{ar.setupBody}</p>
        </Empty>
      ) : selected.length ? (
        <div className="course-grid">
          {selected.map((c) => (
            <CourseTile key={c.id} course={c} />
          ))}
        </div>
      ) : (
        <>
          <Empty
            title={courses.length ? "لسه مضفتش موادك" : "مواد سنتك لسه بتتجهز"}
          >
            <p>
              {courses.length
                ? "اختار من مواد جامعتك وسنتك، وخلي المصادر اللي بتحتاجها قريبة منك."
                : "لسه مفيش مواد مضافة لجامعتك وكليتك وسنتك. ارجع قريب، أو راجع بياناتك الدراسية لو محتاجة تعديل."}
            </p>
            <Link
              className="button primary"
              href={courses.length ? "/courses" : "/onboarding?edit=1"}
            >
              {courses.length ? "اختار موادك" : "راجع بياناتك الدراسية"}
            </Link>
          </Empty>
          {user && courses.length > 0 && (
            <section>
              <h2 className="section-head">مواد جامعتك وسنتك</h2>
              <div className="course-grid">
                {courses.map((c) => (
                  <CourseTile key={c.id} course={c} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
      {updates.length > 0 && (
        <section>
          <div className="section-head">
            <h2>أحدث مصادر موادك</h2>
          </div>
          <div className="resource-list">
            {updates.map((r) => (
              <ResourceRow key={r.id} resource={r} slug={r.course_slug} />
            ))}
          </div>
        </section>
      )}
      <section className="contribute-banner">
        <div>
          <h2>المعلومة الحلوة، مكانها وسط دفعتك.</h2>
          <p>ملخص كتبته أو شرح ساعدك؟ مشاركتك ممكن تفرق.</p>
        </div>
        <Link className="button secondary" href="/courses">
          <Plus size={18} /> اختار مادة وشارك
        </Link>
      </section>
    </>
  );
}
