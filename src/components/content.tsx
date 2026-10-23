import Link from "next/link";
import { appPath } from "@/lib/paths";
import {
  ArrowUpLeft,
  BookOpen,
  FileText,
  Play,
  Layers,
  Search,
  ArrowUp,
  ArrowDown,
  Library,
} from "lucide-react";
import { ar } from "@/i18n/ar-EG";
import type { Course, Resource } from "@/lib/data";
export function Empty({
  title = ar.empty,
  children,
}: {
  title?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="empty">
      <Library size={32} strokeWidth={1.5} />
      <h2>{title}</h2>
      {children}
    </section>
  );
}
export function CourseTile({ course }: { course: Course }) {
  const tones = ["sky", "lavender", "pink", "mint"];
  const tone =
    tones[[...course.id].reduce((a, c) => a + c.charCodeAt(0), 0) % 4];
  return (
    <Link href={`/courses/${course.slug}`} className={`course-tile ${tone}`}>
      <div className="row spread">
        <span className="course-icon">
          <BookOpen size={25} />
        </span>
        <ArrowUpLeft size={21} />
      </div>
      <h3 dir="auto">{course.title_ar || course.title}</h3>
      <p>
        <bdi>{course.title_en || course.code}</bdi>
      </p>
      <span className="course-context">
        <bdi dir="ltr">{course.code}</bdi>
        {course.year_level && (
          <>
            {" "}
            · المستوى {new Intl.NumberFormat("ar-EG").format(course.year_level)}
          </>
        )}
      </span>
      <span className="course-context">
        {course.department_ar || course.department}
      </span>
    </Link>
  );
}
const tones = {
  notes: "lavender",
  slides: "sky",
  past_exam: "sunshine",
  video: "pink",
  question_bank: "mint",
  reference: "neutral",
  other: "neutral",
};
export function TypeBadge({ type }: { type: Resource["type"] }) {
  return (
    <span className={`type-chip ${tones[type]}`}>
      {type === "video" ? <Play size={16} /> : <FileText size={16} />}{" "}
      {ar.types[type]}
    </span>
  );
}
export function ResourceRow({
  resource,
  slug,
}: {
  resource: Resource;
  slug: string;
}) {
  return (
    <Link
      className="resource-row"
      href={`/courses/${slug}/resources/${resource.id}`}
    >
      <span className={`resource-icon ${tones[resource.type]}`}>
        {resource.type === "video" ? (
          <Play />
        ) : resource.type === "slides" ? (
          <Layers />
        ) : (
          <FileText />
        )}
      </span>
      <div className="grow">
        <h3>
          <bdi>{resource.title}</bdi>
        </h3>
        <p className="muted">
          <span>{ar.types[resource.type]}</span> ·{" "}
          <bdi>{resource.topic_title || "المادة كلها"}</bdi>
        </p>
      </div>
      <span className="score" aria-label={`${resource.score} صافي الأصوات`}>
        {resource.score < 0 ? <ArrowDown size={16} /> : <ArrowUp size={16} />}
        {new Intl.NumberFormat("ar-EG").format(resource.score)}
      </span>
      <ArrowUpLeft className="row-arrow" size={19} />
    </Link>
  );
}
export function SearchBar({
  action = "/courses",
  value = "",
  placeholder = ar.search,
  children,
}: {
  action?: string;
  value?: string;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <form action={appPath(action)} className="search-form">
      <div className="search-field">
        <Search size={21} />
        <input
          name="q"
          aria-label={placeholder}
          placeholder={placeholder}
          defaultValue={value}
          maxLength={100}
        />
        <button aria-label="بحث" type="submit">
          <ArrowUpLeft size={21} />
        </button>
      </div>
      {children}
    </form>
  );
}
