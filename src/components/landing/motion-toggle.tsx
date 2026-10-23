"use client";
import { useState } from "react";
import { Pause, Play } from "lucide-react";
export function MotionToggle() {
  const [paused, setPaused] = useState(false);
  return (
    <button
      type="button"
      className="motion-toggle"
      aria-pressed={paused}
      aria-label={paused ? "تشغيل حركة الخلفية" : "إيقاف حركة الخلفية"}
      title={paused ? "تشغيل حركة الخلفية" : "إيقاف حركة الخلفية"}
      onClick={() => setPaused((v) => !v)}
    >
      {paused ? <Play size={17} /> : <Pause size={17} />}
    </button>
  );
}
