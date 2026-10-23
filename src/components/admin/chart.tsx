"use client";
import { useState } from "react";
import type { Overview } from "@/lib/admin/data";
export function GrowthChart({ data }: { data: Overview["growth"] }) {
  const [metric, setMetric] = useState<"registrations" | "views">(
    "registrations",
  );
  const [selected, setSelected] = useState(data.length - 1);
  const max = Math.max(1, ...data.map((d) => d[metric]));
  const active = data[selected];
  return (
    <section className="panel admin-chart">
      <div className="section-head">
        <div>
          <h2>المنصة بتتحرك إزاي؟</h2>
          <p className="muted small">آخر ٣٠ يوم · البيانات المسجلة فقط</p>
        </div>
        <div className="segmented">
          <button
            className={metric === "registrations" ? "selected" : ""}
            onClick={() => setMetric("registrations")}
            aria-pressed={metric === "registrations"}
          >
            التسجيلات
          </button>
          <button
            className={metric === "views" ? "selected" : ""}
            onClick={() => setMetric("views")}
            aria-pressed={metric === "views"}
          >
            الزيارات
          </button>
        </div>
      </div>
      <p className="chart-readout" aria-live="polite">
        {active && (
          <>
            <bdi>{active.day}</bdi>
            <strong>{active[metric]}</strong>
            <span>{metric === "views" ? "زيارة مسجلة" : "حساب جديد"}</span>
          </>
        )}
      </p>
      <div
        className="chart-bars"
        aria-label="الرسم اليومي؛ اختار يومًا لعرض رقمه"
      >
        {data.map((d, i) => (
          <button
            key={d.day}
            onFocus={() => setSelected(i)}
            onMouseEnter={() => setSelected(i)}
            onClick={() => setSelected(i)}
            aria-label={`${d.day}: ${d[metric]}`}
            aria-pressed={i === selected}
          >
            <span
              style={{
                height: `${d[metric] === 0 ? 0 : Math.max(2, (d[metric] / max) * 100)}%`,
              }}
            />
          </button>
        ))}
      </div>
      <div className="chart-range">
        <bdi>{data[0]?.day}</bdi>
        <bdi>{data.at(-1)?.day}</bdi>
      </div>
      <details>
        <summary className="text-link">عرض جدول البيانات</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>اليوم</th>
                <th>التسجيلات</th>
                <th>الزيارات</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d) => (
                <tr key={d.day}>
                  <td>
                    <bdi>{d.day}</bdi>
                  </td>
                  <td>{d.registrations}</td>
                  <td>{d.views}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
