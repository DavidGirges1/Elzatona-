"use client";
import { useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
type Tables = Database["public"]["Tables"];
export function AcademicFields({
  universities,
  faculties,
  relations,
  years,
  defaults = {},
}: {
  universities: Tables["universities"]["Row"][];
  faculties: Tables["faculties"]["Row"][];
  relations: Tables["university_faculties"]["Row"][];
  years: Tables["academic_years"]["Row"][];
  defaults?: {
    university_id?: string;
    faculty_id?: string | null;
    year_level?: number | null;
  };
}) {
  const [uni, setUni] = useState(defaults.university_id || "");
  const [faculty, setFaculty] = useState(defaults.faculty_id || "");
  const offered = faculties.filter((f) =>
    relations.some((r) => r.university_id === uni && r.faculty_id === f.id),
  );
  return (
    <div className="admin-form-grid">
      <label className="field">
        الجامعة
        <select
          name="university_id"
          required
          value={uni}
          onChange={(e) => {
            setUni(e.target.value);
            setFaculty("");
          }}
        >
          <option value="">اختار الجامعة</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name_ar || u.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        الكلية
        <select
          name="faculty_id"
          required
          value={faculty}
          onChange={(e) => setFaculty(e.target.value)}
          disabled={!uni}
        >
          <option value="">اختار الكلية</option>
          {offered.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name_ar}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        السنة الدراسية
        <select
          name="academic_year"
          required
          defaultValue={defaults.year_level || ""}
          key={`${uni}:${faculty}`}
          disabled={!faculty}
        >
          <option value="">اختار السنة</option>
          {years
            .filter((y) => y.university_id === uni && y.faculty_id === faculty)
            .map((y) => (
              <option key={y.year} value={y.year}>
                السنة {y.year}
              </option>
            ))}
        </select>
      </label>
    </div>
  );
}
