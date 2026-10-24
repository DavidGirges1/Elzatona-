"use client";
import { useState } from "react";
import { ActionForm, Submit } from "@/components/forms";
import { assignCommunityRole } from "@/lib/community-actions";
import {
  communityRoles,
  roleLabels,
  type CommunityRole,
} from "@/lib/community";
export function CommunityRoleForm({
  id,
  role,
  courses,
  assigned,
}: {
  id: string;
  role: CommunityRole;
  courses: { id: string; code: string; title: string }[];
  assigned: string[];
}) {
  const [selected, setSelected] = useState<CommunityRole>(role),
    [ids, setIds] = useState(assigned),
    [search, setSearch] = useState("");
  const visible = courses.filter((c) =>
    (c.code + " " + c.title)
      .toLocaleLowerCase()
      .includes(search.toLocaleLowerCase()),
  );
  return (
    <ActionForm action={assignCommunityRole.bind(null, id)}>
      <label className="field">
        الدور
        <select
          name="role"
          value={selected}
          onChange={(e) => setSelected(e.target.value as CommunityRole)}
        >
          {communityRoles.map((r) => (
            <option key={r} value={r}>
              {roleLabels[r]}
            </option>
          ))}
        </select>
      </label>
      <p className="muted small">
        الدور خاص بالإدارة ومش بيظهر في التسجيل أو على الملف العام. الطالب يبعت
        للمراجعة، المساهم الموثوق ينشر مباشرة، ومسؤول المواد يراجع وينظّم المواد
        المحددة فقط.
      </p>
      <input
        type="hidden"
        name="courses"
        value={JSON.stringify(selected === "class_leader" ? ids : [])}
      />
      {selected === "class_leader" && (
        <fieldset className="role-course-picker">
          <legend>المواد المسؤول عنها</legend>
          <input
            aria-label="دور على مادة للصلاحية"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="الكود أو اسم المادة"
            dir="auto"
          />
          <p className="small">
            محدد {new Intl.NumberFormat("ar-EG").format(ids.length)} مادة
          </p>
          <div>
            {visible.map((c) => (
              <label className="check" key={c.id}>
                <input
                  type="checkbox"
                  checked={ids.includes(c.id)}
                  onChange={(e) =>
                    setIds((old) =>
                      e.target.checked
                        ? [...old, c.id]
                        : old.filter((x) => x !== c.id),
                    )
                  }
                />
                <bdi>
                  {c.code} · {c.title}
                </bdi>
              </label>
            ))}
          </div>
        </fieldset>
      )}
      <label className="field">
        سبب تعيين الدور
        <textarea name="reason" required minLength={4} maxLength={1000} />
      </label>
      <label className="check">
        <input type="checkbox" required name="confirm" />
        راجعت الدور ونطاق المواد وبأكد القرار
      </label>
      <Submit>احفظ الدور</Submit>
    </ActionForm>
  );
}
