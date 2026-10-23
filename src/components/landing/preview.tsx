"use client";
import { useState } from "react";
import {
  FileText,
  Play,
  ClipboardList,
  ArrowLeft,
  FolderOpen,
  Check,
} from "lucide-react";
const types = [
  {
    label: "ملخصات",
    Icon: FileText,
    tone: "lavender",
    title: "النقط المهمة، مرتبة قدامك.",
    body: "ملخصات الطلبة للمحاضرات والموضوعات؛ افتح المصدر وشوف مين شاركه.",
  },
  {
    label: "فيديوهات",
    Icon: Play,
    tone: "pink",
    title: "الشرح اللي يوصّل المعلومة.",
    body: "لينكات الشرح في مكانها جوه المادة، عشان ترجع للجزء اللي محتاجه.",
  },
  {
    label: "امتحانات",
    Icon: ClipboardList,
    tone: "sunshine",
    title: "راجع على اللي ذاكرته.",
    body: "امتحانات سابقة وأسئلة متاحة بإذن أصحابها، منظمة مع مصادر المادة.",
  },
] as const;
export function ProductPreview() {
  const [selected, setSelected] = useState(0);
  const t = types[selected];
  return (
    <div className="product-preview">
      <div className="preview-top">
        <span className="wordmark">الزتونة.</span>
        <span className="small muted">فكرة عن ترتيب المصادر</span>
      </div>
      <div className="preview-path">
        <span>جامعتك</span>
        <ArrowLeft size={14} />
        <span>كليتك</span>
        <ArrowLeft size={14} />
        <span>سنتك</span>
      </div>
      <div className="preview-course sky">
        <FolderOpen size={25} />
        <div>
          <strong>مادتك، بكل مصادرها.</strong>
          <p>المحاضرات · الموضوعات · المصادر</p>
        </div>
        <Check size={18} />
      </div>
      <div className="preview-tabs" role="tablist" aria-label="أنواع المصادر">
        {types.map((v, i) => (
          <button
            role="tab"
            aria-selected={selected === i}
            aria-controls="preview-panel"
            id={`preview-tab-${i}`}
            tabIndex={selected === i ? 0 : -1}
            onKeyDown={(e) => {
              if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
                return;
              e.preventDefault();
              const next =
                e.key === "Home"
                  ? 0
                  : e.key === "End"
                    ? types.length - 1
                    : (i + (e.key === "ArrowLeft" ? 1 : -1) + types.length) %
                      types.length;
              setSelected(next);
              e.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("button")
                [next]?.focus();
            }}
            onClick={() => setSelected(i)}
            className={selected === i ? v.tone : ""}
            key={v.label}
          >
            <v.Icon size={16} />
            {v.label}
          </button>
        ))}
      </div>
      <div
        className="preview-resource"
        role="tabpanel"
        id="preview-panel"
        aria-labelledby={`preview-tab-${selected}`}
      >
        <div className={`resource-icon ${t.tone}`}>
          <t.Icon size={22} />
        </div>
        <div>
          <h3>{t.title}</h3>
          <p className="muted">{t.body}</p>
        </div>
      </div>
      <div className="preview-foot">
        <span className="status-dot" />
        من طلبة فاهمة إنت محتاج إيه
      </div>
    </div>
  );
}
