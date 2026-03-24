"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 0.6;
const MAX_SCALE = 3;

type InvoiceAttachmentPreviewProps = {
  /** Optional image URLs; placeholder blocks are shown when empty */
  imageSrcs?: string[];
  className?: string;
  fullscreen?: boolean;
  onExitFullscreen?: () => void;
};

export function InvoiceAttachmentPreview({ imageSrcs = [], className = "", fullscreen = false, onExitFullscreen }: InvoiceAttachmentPreviewProps) {
  const [scale, setScale] = useState(1);
  const pinchRef = useRef<{ initialDistance: number; initialScale: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const getDistance = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        initialDistance: getDistance(e.touches[0], e.touches[1]),
        initialScale: scale,
      };
    }
  }, [scale]);

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 2 || !pinchRef.current) return;
    const d = getDistance(e.touches[0], e.touches[1]);
    const { initialDistance, initialScale } = pinchRef.current;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, (d / initialDistance) * initialScale));
    setScale(next);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (pinchRef.current) pinchRef.current = null;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const preventOverscroll = (ev: TouchEvent) => {
      if (ev.touches.length === 2) ev.preventDefault();
    };
    el.addEventListener("touchmove", preventOverscroll, { passive: false });
    return () => el.removeEventListener("touchmove", preventOverscroll);
  }, []);

  const pages =
    imageSrcs.length > 0
      ? imageSrcs
      : [null];

  const inner = (
    <div
      className="flex min-h-0 w-full flex-col gap-4 p-3 sm:p-4"
      style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
    >
      {pages.map((src, i) => (
        <figure
          key={src ?? `placeholder-${i}`}
          className="mx-auto w-full max-w-md overflow-hidden rounded border border-gray-200 bg-white shadow-sm"
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element -- dynamic preview URLs
            <img src={src} alt="" className="block h-auto w-full object-contain" draggable={false} />
          ) : (
            <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 bg-gray-50 px-4 text-center text-sm text-primary/60">
              <span className="material-symbols-outlined text-[40px] text-primary/35" aria-hidden>
                description
              </span>
              <span>Invoice attachment preview</span>
              <span className="text-xs text-primary/45">Pinch to zoom on mobile</span>
            </div>
          )}
        </figure>
      ))}
    </div>
  );

  const scrollArea = (
    <div
      ref={scrollRef}
      className="relative min-h-[min(60vh,32rem)] flex-1 overflow-auto rounded-lg border border-gray-200 bg-gray-100 touch-pan-x touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
    >
      <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-black/55 px-2 py-1 text-xs text-white sm:hidden">
        <span className="material-symbols-outlined align-middle text-[16px]" aria-hidden>
          pinch
        </span>{" "}
        Pinch to zoom
      </div>
      {inner}
    </div>
  );

  if (fullscreen) {
    return (
      <div className={`fixed inset-0 z-[300] flex flex-col bg-black/90 ${className}`}>
        <div className="flex shrink-0 items-center justify-end gap-2 px-3 py-2">
          <button
            type="button"
            onClick={() => setScale(1)}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/10"
          >
            Reset zoom
          </button>
          <button
            type="button"
            onClick={onExitFullscreen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white hover:bg-white/10"
            aria-label="Close fullscreen"
          >
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden px-2 pb-4">{scrollArea}</div>
      </div>
    );
  }

  return <div className={`flex min-h-0 flex-1 flex-col ${className}`}>{scrollArea}</div>;
}
