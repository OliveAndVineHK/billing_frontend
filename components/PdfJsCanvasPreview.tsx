"use client";

import { useEffect, useRef, useState } from "react";

let workerSrcConfigured = false;

function configureWorker(pdfjs: typeof import("pdfjs-dist")) {
  if (workerSrcConfigured) return;
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  workerSrcConfigured = true;
}

const DEFAULT_MAX_PAGES = 50;

export type PdfJsCanvasPreviewProps = {
  src: string;
  title?: string;
  className?: string;
  maxPageWidthCssPx?: number;
  maxPages?: number;
};

export function PdfJsCanvasPreview({
  src,
  title = "PDF preview",
  className = "",
  maxPageWidthCssPx = 720,
  maxPages = DEFAULT_MAX_PAGES,
}: PdfJsCanvasPreviewProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "error" | "ready">("loading");

  useEffect(() => {
    let cancelled = false;
    let pdfDoc: import("pdfjs-dist").PDFDocumentProxy | undefined;
    const host = hostRef.current;
    if (!host) return;

    host.replaceChildren();
    setStatus("loading");

    void (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        configureWorker(pdfjs);
        const loadingTask = pdfjs.getDocument({ url: src, withCredentials: false });
        pdfDoc = await loadingTask.promise;
        const pageLimit = Math.min(pdfDoc.numPages, Math.max(1, maxPages));
        const dpr = Math.min(typeof window !== "undefined" ? window.devicePixelRatio ?? 1 : 1, 2);

        for (let p = 1; p <= pageLimit; p++) {
          if (cancelled) return;
          const page = await pdfDoc.getPage(p);
          const base = page.getViewport({ scale: 1 });
          const scale = Math.min(maxPageWidthCssPx / base.width, 2.5);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.setAttribute("role", "img");
          canvas.setAttribute("aria-label", `${title} — page ${p} of ${pdfDoc.numPages}`);
          canvas.width = Math.floor(viewport.width * dpr);
          canvas.height = Math.floor(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;
          canvas.className =
            "mx-auto block h-auto max-w-full rounded border border-gray-200 bg-white shadow-sm";
          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("2D context unavailable");
          ctx.scale(dpr, dpr);
          const renderTask = page.render({ canvasContext: ctx, viewport });
          await renderTask.promise;
          if (cancelled) return;
          host.appendChild(canvas);
        }

        if (!cancelled && pageLimit < pdfDoc.numPages) {
          const note = document.createElement("p");
          note.className = "mt-2 text-center text-xs text-primary/55";
          note.textContent = `Showing first ${pageLimit} of ${pdfDoc.numPages} pages.`;
          host.appendChild(note);
        }

        if (!cancelled) setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      } finally {
        if (pdfDoc) {
          await pdfDoc.destroy().catch(() => {});
        }
      }
    })();

    return () => {
      cancelled = true;
      host.replaceChildren();
    };
  }, [src, title, maxPageWidthCssPx, maxPages]);

  return (
    <div className={className}>
      {status === "loading" ? (
        <div className="flex min-h-[200px] items-center justify-center py-8 text-sm text-primary/60">
          <span className="inline-flex items-center gap-2">
            <span className="material-symbols-outlined animate-spin text-secondary text-[22px]" aria-hidden>
              progress_activity
            </span>
            Loading PDF…
          </span>
        </div>
      ) : null}
      {status === "error" ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-primary/70">
          <p>Could not display this PDF in preview.</p>
          <a href={src} target="_blank" rel="noopener noreferrer" className="font-semibold text-secondary underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">
            Open PDF in new tab
          </a>
        </div>
      ) : null}
      <div ref={hostRef} className={status === "ready" ? "flex w-full flex-col items-stretch gap-3" : "hidden"} />
    </div>
  );
}
