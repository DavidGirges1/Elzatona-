"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { addCourses } from "@/lib/actions";
import { Submit } from "@/components/forms";
import {
  requirementLabel,
  type Requirement,
  type Program,
} from "@/lib/course-catalog";
import type { Course } from "@/lib/data";
export function CoursePicker({
  courses,
  requirements,
  followedIds,
  next,
  program,
  studentYear,
}: {
  courses: Course[];
  requirements: Requirement[];
  followedIds: string[];
  next: string;
  program?: Program;
  studentYear?: number | null;
}) {
  const [chosen, setChosen] = useState<string[]>([]);
  const [state, action] = useActionState(addCourses.bind(null, next), {});
  const available = courses.filter((c) => !followedIds.includes(c.id));
  const selected = available.filter((c) => chosen.includes(c.id));
  const allSelected =
    available.length > 0 && selected.length === available.length;
  return (
    <form action={action} className="course-picker">
      <div className="course-selection-bar">
        <label className="course-select-all">
          <input
            type="checkbox"
            aria-label="تحديد كل المواد المعروضة"
            checked={allSelected}
            disabled={!available.length}
            onChange={() =>
              setChosen(allSelected ? [] : available.map((c) => c.id))
            }
          />
          تحديد مواد الصفحة
        </label>
        <span className="muted" role="status">
          {new Intl.NumberFormat("ar-EG").format(selected.length)} محددة
        </span>
      </div>
      <div className="course-choice-list">
        {courses.map((course) => {
          const followed = followedIds.includes(course.id);
          const label = requirementLabel(
            requirements.filter((r) => r.course_id === course.id),
            program,
          );
          return (
            <article
              className={`course-choice ${followed ? "is-followed" : ""}`}
              key={course.id}
            >
              <label className="course-checkbox">
                <input
                  name="courses"
                  type="checkbox"
                  value={course.id}
                  checked={followed || chosen.includes(course.id)}
                  disabled={followed}
                  aria-label={`اختيار ${course.title_ar || course.title} ${course.code}`}
                  onChange={(e) =>
                    setChosen(
                      e.target.checked
                        ? [...chosen, course.id]
                        : chosen.filter((id) => id !== course.id),
                    )
                  }
                />
              </label>
              <div className="grow">
                <Link
                  href={`/courses/${course.slug}`}
                  className="course-choice-title"
                >
                  <bdi>{course.title_ar || course.title}</bdi>
                </Link>
                <p className="muted course-choice-english">
                  <bdi>{course.title_en}</bdi>
                </p>
                <div className="course-choice-meta">
                  <bdi dir="ltr">{course.code}</bdi>
                  {course.year_level && (
                    <span>
                      المستوى{" "}
                      {new Intl.NumberFormat("ar-EG").format(course.year_level)}
                    </span>
                  )}
                  {label && <span>{label}</span>}
                </div>
                {studentYear === course.year_level && (
                  <span className="course-match">مقترحة لسنتك</span>
                )}
                {followed && <span className="course-match">ضمن موادي</span>}
              </div>
            </article>
          );
        })}
      </div>
      <div className="course-selection-footer">
        <Submit disabled={!selected.length}>
          {selected.length
            ? `ضيف المحدد لموادي · ${new Intl.NumberFormat("ar-EG").format(selected.length)}`
            : "ضيف المواد المحددة"}
        </Submit>
        <Link href="/dashboard" className="text-link">
          افتح موادي
        </Link>
        <p className="muted">مكتبتك على الزتونة، مش تسجيل رسمي في الكلية.</p>
        {state.error && (
          <p className="form-error" role="alert">
            {state.error}
          </p>
        )}
        {state.success && (
          <p className="notice" role="status">
            {state.success}
          </p>
        )}
      </div>
    </form>
  );
}
