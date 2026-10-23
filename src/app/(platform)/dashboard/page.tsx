import Link from "next/link";
import { requireStudent } from "@/lib/auth/session";
import { ArrowUpLeft, Plus, BookOpen } from "lucide-react";
import { currentUser, configured } from "@/lib/supabase/server";
import { getCourses, getFollowedCourses, getResources } from "@/lib/data";
import { ar } from "@/i18n/ar-EG";
import {
  CourseTile,
  Empty,
  SearchBar,
  ResourceRow,
} from "@/components/content";
export default async function Home() {
  const { context } = await requireStudent("/dashboard");
  const user = await currentUser();
  const [courses, selected] = await Promise.all([
    getCourses(),
    getFollowedCourses(),
  ]);
  const ids = selected.map((c) => c.id);
  const suggestions = courses
    .filter(
      (c) => c.year_level === context.academic_year && !ids.includes(c.id),
    )
    .slice(0, 6);
  const updates =
    user && ids.length
      ? (await getResources({ courseIds: ids })).slice(0, 4)
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
            title={courses.length ? "لسه مضفتش موادك" : "مواد كليتك لسه بتتجهز"}
          >
            <p>
              {courses.length
                ? "ابدأ بمواد سنتك، أو اختار من سنين تانية. مفيش مادة بتتضاف من غير اختيارك."
                : "لسه مفيش مواد مضافة لجامعتك وكليتك. راجع بياناتك الدراسية لو محتاجة تعديل."}
            </p>
            <Link
              className="button primary"
              href={courses.length ? "/courses" : "/onboarding?edit=1"}
            >
              {courses.length ? "اختار موادك" : "راجع بياناتك الدراسية"}
            </Link>
          </Empty>
        </>
      )}
      {suggestions.length > 0 && (
        <section>
          <div className="section-head">
            <h2>مقترحة لسنتك</h2>
            <Link href={`/courses?year=${context.academic_year}`}>
              اختار موادك <ArrowUpLeft size={18} />
            </Link>
          </div>
          <p className="muted">
            حسب مستوى المقرر في اللائحة. تقدر تضيف مواد من أي سنة.
          </p>
          <div className="course-grid">
            {suggestions.map((c) => (
              <CourseTile key={c.id} course={c} />
            ))}
          </div>
        </section>
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
