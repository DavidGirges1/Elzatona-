"use client";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { Play, FileText, Maximize, Minimize, ExternalLink } from "lucide-react";
import { appPath } from "@/lib/paths";
import { youtubeVideo } from "@/lib/material-preview";
const PdfPreview = dynamic(() => import("./pdf-preview"), {
  ssr: false,
  loading: () => (
    <p className="preview-message" role="status">
      جاري تجهيز المعاينة…
    </p>
  ),
});
export function MaterialPreview({
  id,
  title,
  kind,
  url,
}: {
  id: string;
  title: string;
  kind: string;
  url: string | null;
}) {
  const video = kind === "external" ? youtubeVideo(url) : null;
  const isPdf = kind === "pdf";
  const [active, setActive] = useState(isPdf);
  const [full, setFull] = useState(false);
  const [fullscreenError, setFullscreenError] = useState("");
  const frame = useRef<HTMLElement>(null);
  const fullscreenToggle = useRef<HTMLButtonElement>(null);
  const wasFull = useRef(false);
  useEffect(() => {
    const update = () => {
      const current = document.fullscreenElement === frame.current;
      setFull(current);
      if (wasFull.current && !current)
        fullscreenToggle.current?.focus({ preventScroll: true });
      wasFull.current = current;
    };
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, []);
  if (!video && !isPdf)
    return (
      <a
        className="button primary"
        href={appPath(`/api/resources/${id}/open`)}
        target="_blank"
        rel="noopener noreferrer"
      >
        افتح المصدر
        <ExternalLink size={18} />
      </a>
    );
  const open = appPath(`/api/resources/${id}/open`);
  return (
    <section
      className={`material-preview ${isPdf ? "pdf" : "video"}`}
      aria-label={isPdf ? "معاينة الملف" : "مشاهدة الفيديو"}
      ref={frame}
    >
      <div className="preview-heading">
        <span>
          {isPdf ? <FileText size={18} /> : <Play size={18} />}
          {isPdf ? "معاينة PDF" : "شاهد هنا"}
        </span>
        <div>
          {active && (
            <button
              type="button"
              className="preview-icon-button"
              ref={fullscreenToggle}
              aria-label={full ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
              title={full ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
              onClick={async () => {
                try {
                  if (document.fullscreenElement)
                    await document.exitFullscreen();
                  else await frame.current?.requestFullscreen();
                } catch {
                  setFullscreenError(
                    "ملء الشاشة مش متاح في المتصفح ده. المعاينة لسه شغّالة هنا.",
                  );
                }
              }}
            >
              {full ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          )}
          <a
            href={open}
            className="preview-original"
            target="_blank"
            rel="noopener noreferrer"
          >
            {isPdf ? "افتح الـ PDF" : "افتح في YouTube"}
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
      {active ? (
        isPdf ? (
          <PdfPreview id={id} />
        ) : (
          <div className="video-frame">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${video!.id}?rel=0&playsinline=1${video!.start ? `&start=${video!.start}` : ""}`}
              title={title}
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        )
      ) : (
        <div className="preview-placeholder">
          <span className={`preview-type-icon ${isPdf ? "sky" : "pink"}`}>
            {isPdf ? <FileText size={28} /> : <Play size={28} />}
          </span>
          <button
            type="button"
            className="button primary"
            onClick={() => {
              setActive(true);
              if (video)
                void fetch(appPath(`/api/resources/${id}/preview`), {
                  method: "POST",
                }).catch(() => {});
            }}
          >
            {isPdf ? "اعرض الـ PDF هنا" : "شاهد الفيديو هنا"}
            {isPdf ? <FileText size={18} /> : <Play size={18} />}
          </button>
          <p>
            {isPdf
              ? "اقرأ الملف من غير ما تسيب الصفحة"
              : "المشغّل بيتحمّل لما تختار تشاهد"}
          </p>
        </div>
      )}
      {fullscreenError && (
        <p className="reader-status" role="status">
          {fullscreenError}
        </p>
      )}
    </section>
  );
}
