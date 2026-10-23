"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Minus, Plus, RotateCw } from "lucide-react";
import type { PDFDocumentProxy } from "pdfjs-dist";
import { appPath } from "@/lib/paths";
export default function PdfPreview({ id }: { id: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.floor(entry.contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let disposed = false;
    let task: ReturnType<typeof import("pdfjs-dist").getDocument> | undefined;
    async function load() {
      try {
        const pdf = await import("pdfjs-dist");
        if (disposed) return;
        pdf.GlobalWorkerOptions.workerSrc = appPath("/pdf/pdf.worker.min.mjs");
        task = pdf.getDocument({
          url: appPath(`/api/resources/${id}/preview`),
          useSystemFonts: true,
          cMapUrl: appPath("/pdf/cmaps/"),
          cMapPacked: true,
          standardFontDataUrl: appPath("/pdf/standard_fonts/"),
          wasmUrl: appPath("/pdf/wasm/"),
        });
        const loaded = await task.promise;
        if (!disposed) setDocument(loaded);
      } catch {
        if (!disposed) {
          setError("المعاينة ما اتحمّلتش. جرّب تاني أو افتح الملف مباشرة.");
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      disposed = true;
      void task?.destroy();
    };
  }, [id, retry]);
  useEffect(() => {
    if (!document || !width || !canvas.current) return;
    let disposed = false;
    let render:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;
    async function draw() {
      try {
        const p = await document!.getPage(page);
        if (disposed || !canvas.current) return;
        const original = p.getViewport({ scale: 1 });
        const scale = Math.min(width / original.width, 1.6) * zoom;
        const view = p.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const target = canvas.current;
        target.width = Math.floor(view.width * ratio);
        target.height = Math.floor(view.height * ratio);
        target.style.width = `${Math.floor(view.width)}px`;
        target.style.height = `${Math.floor(view.height)}px`;
        render = p.render({
          canvas: target,
          viewport: view,
          transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
        });
        await render.promise;
        if (!disposed) setLoading(false);
      } catch {
        if (!disposed) {
          setError("الصفحة دي مش قابلة للمعاينة. تقدر تفتح الملف مباشرة.");
          setLoading(false);
        }
      }
    }
    void draw();
    return () => {
      disposed = true;
      render?.cancel();
    };
  }, [document, page, zoom, width]);
  const changePage = (value: number) => {
    setLoading(true);
    setPage(value);
  };
  return (
    <div className="pdf-reader">
      <div className="pdf-controls" aria-label="أدوات قراءة PDF">
        <div className="reader-pager">
          <button
            type="button"
            aria-label="الصفحة السابقة"
            disabled={!document || page <= 1}
            onClick={() => changePage(page - 1)}
          >
            <ChevronRight size={20} />
          </button>
          <span aria-live="polite">
            {document
              ? `صفحة ${new Intl.NumberFormat("ar-EG").format(page)} من ${new Intl.NumberFormat("ar-EG").format(document.numPages)}`
              : "PDF"}
          </span>
          <button
            type="button"
            aria-label="الصفحة التالية"
            disabled={!document || page >= document.numPages}
            onClick={() => changePage(page + 1)}
          >
            <ChevronLeft size={20} />
          </button>
        </div>
        <div className="reader-zoom">
          <button
            type="button"
            aria-label="تصغير"
            disabled={!document || zoom <= 0.75}
            onClick={() => setZoom((z) => z - 0.25)}
          >
            <Minus size={18} />
          </button>
          <span dir="ltr">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="تكبير"
            disabled={!document || zoom >= 2}
            onClick={() => setZoom((z) => z + 0.25)}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
      <div className="pdf-viewport" ref={viewport} aria-busy={loading}>
        {loading && !error && (
          <p className="reader-status" role="status">
            جاري تحميل الصفحة…
          </p>
        )}
        {error ? (
          <div className="preview-message" role="alert">
            <p>{error}</p>
            <button
              type="button"
              className="button secondary"
              onClick={() => {
                setError("");
                setDocument(null);
                setPage(1);
                setLoading(true);
                setRetry((v) => v + 1);
              }}
            >
              <RotateCw size={16} />
              حاول تاني
            </button>
          </div>
        ) : (
          <canvas
            ref={canvas}
            role="img"
            aria-label={`معاينة PDF، صفحة ${page}. لقراءة النص بأدوات الإتاحة افتح الملف مباشرة.`}
          />
        )}
      </div>
    </div>
  );
}
