"use client";
import { useState } from "react";
import Link from "next/link";
import {
  areaLabels,
  materialAreas,
  lectureLabel,
  type LectureOption,
  type Placement,
} from "@/lib/placement";
export function PlacementFields({
  lectures,
  slug,
  initial,
  onChange,
  quiz = false,
}: {
  lectures: LectureOption[];
  slug: string;
  initial?: Partial<Placement>;
  onChange?: (p: Placement) => void | boolean;
  quiz?: boolean;
}) {
  const [area, setArea] = useState(initial?.area || "");
  const [selected, setSelected] = useState(initial?.lectures || []);
  function change(nextArea: string, ids: string[]) {
    if (
      nextArea &&
      onChange?.({ area: nextArea as Placement["area"], lectures: ids }) ===
        false
    )
      return;
    setArea(nextArea);
    setSelected(ids);
  }
  return (
    <fieldset className="placement-fields">
      <legend>مكان المصدر</legend>
      <label className="field">
        المصدر يخص إيه؟
        <select
          name="area"
          value={area}
          required
          onChange={(e) => change(e.target.value, [])}
        >
          <option value="" disabled>
            اختار مكان المصدر
          </option>
          {materialAreas
            .filter((a) => !quiz || a === "lecture" || a === "revision")
            .map((a) => (
              <option key={a} value={a}>
                {areaLabels[a]}
              </option>
            ))}
        </select>
      </label>
      {area === "lecture" && (
        <>
          <label className="field">
            المحاضرة
            <select
              name="lectures"
              required
              value={selected[0] || ""}
              onChange={(e) =>
                change(area, [
                  e.target.value,
                  ...selected.slice(1).filter((id) => id !== e.target.value),
                ])
              }
            >
              <option value="" disabled>
                اختار المحاضرة
              </option>
              {lectures.map((l) => (
                <option key={l.id} value={l.id}>
                  {lectureLabel(l)}
                </option>
              ))}
            </select>
          </label>
          {lectures.length > 1 && (
            <details>
              <summary className="text-link">
                نفس المصدر مفيد لمحاضرات تانية؟
              </summary>
              <div className="placement-extras">
                {lectures
                  .filter((l) => l.id !== selected[0])
                  .map((l) => (
                    <label className="check" key={l.id}>
                      <input
                        name="lectures"
                        value={l.id}
                        type="checkbox"
                        checked={selected.slice(1).includes(l.id)}
                        onChange={(e) =>
                          change(
                            area,
                            e.target.checked
                              ? [...selected, l.id]
                              : selected.filter((id) => id !== l.id),
                          )
                        }
                      />
                      <bdi>{lectureLabel(l)}</bdi>
                    </label>
                  ))}
              </div>
            </details>
          )}
          {!lectures.length && (
            <p className="muted">
              المحاضرات لسه ماتضافتش.{" "}
              <Link className="text-link" href={`/courses/${slug}/ask`}>
                اطلب إضافة محاضرة من المنظّمين
              </Link>
            </p>
          )}
        </>
      )}
      {area === "general" && (
        <p className="muted small">للمراجع والملفات اللي بتغطي المادة كلها.</p>
      )}
    </fieldset>
  );
}
