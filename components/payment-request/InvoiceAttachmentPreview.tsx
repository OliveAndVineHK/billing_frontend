"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const MIN_SCALE = 0.6;
const MAX_SCALE = 3;
const ATTACHMENT_CHECKBOX_CLASS = "checkbox-secondary-white-tick h-4 w-4 rounded border border-primary/40";

export type InvoiceAttachmentPreviewItem = {
  url: string;
  name: string;
  mime: string;
};

type InvoiceAttachmentPreviewProps = {
  /** Built from IndexedDB / object URLs on the details page */
  attachments?: InvoiceAttachmentPreviewItem[];
  /** Legacy: plain image URLs only */
  imageSrcs?: string[];
  className?: string;
  fullscreen?: boolean;
  onExitFullscreen?: () => void;
  /** While blobs are loading from IndexedDB */
  isLoadingAttachments?: boolean;
  /** Show attachment selection checkboxes (used in Edit mode). */
  editMode?: boolean;
  selectedIndices?: number[];
  onSelectedIndicesChange?: (next: number[]) => void;
};

function PreviewBlock({ url, name, mime }: InvoiceAttachmentPreviewItem) {
  const mimeLower = mime.toLowerCase();
  if (mimeLower.startsWith("image/")) {
    return (
      <img
        src={url}
        alt={name || "Attachment"}
        className="mx-auto block h-auto max-h-[min(75vh,56rem)] w-full object-contain"
        draggable={false}
      />
    );
  }
  if (mimeLower === "application/pdf") {
    return (
      <div className="relative w-full overflow-hidden rounded bg-white">
        {/* Full width of gray panel; height tracks page aspect (11/8.5) */}
        <div className="relative w-full pb-[129.41%]">
          <iframe
            src={url}
            title={name || "PDF preview"}
            className="absolute inset-0 h-full w-full rounded border-0 bg-white"
          />
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center justify-center gap-2 bg-gray-50 px-4 py-8 text-center">
      <span className="material-symbols-outlined text-[40px] text-primary/35" aria-hidden>
        draft
      </span>
      <p className="text-sm font-medium text-primary">{name || "File"}</p>
      <p className="text-xs text-primary/50">Preview is not available for this file type.</p>
    </div>
  );
}

export function InvoiceAttachmentPreview({
  attachments,
  imageSrcs = [],
  className = "",
  fullscreen = false,
  onExitFullscreen,
  isLoadingAttachments = false,
  editMode = false,
  selectedIndices,
  onSelectedIndicesChange,
}: InvoiceAttachmentPreviewProps) {
  const [scale, setScale] = useState(1);
  const pinchRef = useRef<{ initialDistance: number; initialScale: number } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [internalSelected, setInternalSelected] = useState<Set<number>>(new Set());

  const effectiveSelected = selectedIndices ? new Set(selectedIndices) : internalSelected;
  const setEffectiveSelected = useCallback(
    (updater: (prev: Set<number>) => Set<number>) => {
      if (selectedIndices && onSelectedIndicesChange) {
        const nextSet = updater(new Set(selectedIndices));
        onSelectedIndicesChange(Array.from(nextSet).sort((a, b) => a - b));
        return;
      }
      setInternalSelected((prev) => updater(new Set(prev)));
    },
    [selectedIndices, onSelectedIndicesChange],
  );

  useEffect(() => {
    if (editMode) return;
    if (selectedIndices && onSelectedIndicesChange) {
      if (selectedIndices.length > 0) onSelectedIndicesChange([]);
      return;
    }
    setInternalSelected((prev) => (prev.size > 0 ? new Set() : prev));
  }, [editMode, selectedIndices?.length, onSelectedIndicesChange]);

  const getDistance = (a: { clientX: number; clientY: number }, b: { clientX: number; clientY: number }) =>
    Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        pinchRef.current = {
          initialDistance: getDistance(e.touches[0], e.touches[1]),
          initialScale: scale,
        };
      }
    },
    [scale],
  );

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

  const items: (InvoiceAttachmentPreviewItem | null)[] =
    attachments && attachments.length > 0
      ? attachments
      : imageSrcs.length > 0
        ? imageSrcs.map((url) => ({ url, name: "", mime: "image/png" }))
        : [null];

  const inner = (
    <div
      className="flex min-h-0 w-full flex-col gap-4 p-2 sm:p-3"
      style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
    >
      {isLoadingAttachments ? (
        <div className="flex w-full min-w-0 flex-col gap-3 rounded border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="h-4 w-[75%] animate-pulse rounded bg-gray-200" />
          <div className="aspect-[8.5/11] w-full max-h-[min(82vh,56rem)] animate-pulse rounded bg-gray-100" />
        </div>
      ) : (
        items.map((item, i) => (
          <figure
            key={item ? `${item.url}-${i}` : `placeholder-${i}`}
            className="relative mx-auto w-full min-w-0 max-w-full overflow-hidden rounded border border-gray-200 bg-white shadow-sm"
          >
            {item ? (
              <>
                {editMode ? (
                  <label className="absolute left-2 top-2 z-10 inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      checked={effectiveSelected.has(i)}
                      onChange={(e) => {
                        setEffectiveSelected((prev) => {
                          if (e.target.checked) prev.add(i);
                          else prev.delete(i);
                          return prev;
                        });
                      }}
                      className={`${ATTACHMENT_CHECKBOX_CLASS} cursor-pointer`}
                      aria-label={`Select attachment ${item.name || i + 1}`}
                    />
                  </label>
                ) : null}
                <PreviewBlock {...item} />
              </>
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
        ))
      )}
    </div>
  );

  const scrollArea = (
    <div
      ref={scrollRef}
      className="relative flex min-h-[min(60vh,32rem)] min-w-0 flex-1 flex-col overflow-auto rounded-lg border border-gray-200 bg-gray-100 touch-pan-x touch-pan-y"
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
