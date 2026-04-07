"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";
import { pushAppScrollLock } from "@/lib/appScrollRoot";
import { ApiError, deletePaymentAttachment, fetchPaymentAttachmentPreview } from "@/lib/api";
import { formatFileSize } from "@/lib/fileAttachmentPreview";
import { AttachmentDeleteConfirmModal } from "./AttachmentDeleteConfirmModal";

export type BankSlipFileRef = { id: string; name: string };

export type BankSlipFileFetchSource = {
  billId: string;
  paymentId: string;
  attachmentId: string;
  /** Nested `attachment.id` from API — used as fallback download path when `/file` on link id 404s. */
  fileAttachmentId?: string;
};

/** Per-file overrides (optional; kept for API compatibility — not shown in the simplified view). */
export type BankSlipFileDetailsOverride = Partial<{
  createdBy: string;
  createdAt: string;
  toName: string;
  toAccount: string;
  amount: string;
  fromName: string;
  fromAccount: string;
  when: string;
}>;

export type BankSlipFileEntry = BankSlipFileRef & {
  details?: BankSlipFileDetailsOverride;
  previewUrl?: string;
  fetchSource?: BankSlipFileFetchSource;
  fileSizeBytes?: number;
};

/** Row-level metadata (subtitle only in the simplified modal). */
export type BankSlipDetails = {
  createdBy: string;
  createdAt: string;
  toName: string;
  toAccount?: string;
  amount: string;
  fromName: string;
  fromAccount?: string;
  when: string;
  files: BankSlipFileEntry[];
};

export type BankSlipDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  details: BankSlipDetails;
  onUpload?: () => void;
  onRemoveFile?: (fileId: string) => void;
  allowRemoveFiles?: boolean;
  onBankSlipFileDeleted?: () => void;
};

const overlayClass =
  "fixed inset-0 z-[300] flex items-center justify-center overflow-x-hidden overscroll-x-none p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-4 md:p-6";

const shellClass =
  "relative z-[1] flex max-h-[min(100dvh-1rem,760px)] w-full min-w-0 max-w-[980px] flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5 sm:max-h-[min(92dvh,760px)] sm:rounded-2xl";

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

const footerCloseClass = `box-border h-12 min-h-[48px] w-full cursor-pointer rounded-lg border-2 border-secondary bg-white px-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 ${focusRing} sm:h-11 sm:min-h-[44px] sm:w-auto sm:px-4`;

const footerUploadClass = `box-border inline-flex h-12 min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 ${focusRing} sm:h-11 sm:min-h-[44px] sm:w-auto`;

function fileIconForName(filename: string): { icon: string; iconClass: string } {
  const ext = filename.trim().split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { icon: "picture_as_pdf", iconClass: "text-red-600" };
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return { icon: "image", iconClass: "text-sky-600" };
  return { icon: "draft", iconClass: "text-primary" };
}

function isPdfName(name: string): boolean {
  return name.trim().toLowerCase().endsWith(".pdf");
}

function isImageName(name: string): boolean {
  const ext = name.trim().split(".").pop()?.toLowerCase() ?? "";
  return ext === "jpg" || ext === "jpeg" || ext === "png" || ext === "gif" || ext === "webp";
}

function PreviewContent({
  fileName,
  previewUrl,
  fetchSource,
  onResolvedFileSize,
}: {
  fileName: string;
  previewUrl?: string;
  fetchSource?: BankSlipFileFetchSource;
  onResolvedFileSize?: (bytes: number) => void;
}) {
  if (previewUrl) {
    return <BlobOrUrlPreviewContent fileName={fileName} url={previewUrl} />;
  }
  if (fetchSource) {
    return (
      <FetchedPreviewContent
        fileName={fileName}
        source={fetchSource}
        onResolvedFileSize={onResolvedFileSize}
      />
    );
  }
  return (
    <p className="py-8 text-center text-sm text-primary/70">No preview available for this file.</p>
  );
}

function BlobOrUrlPreviewContent({ fileName, url }: { fileName: string; url: string }) {
  if (isImageName(fileName)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Preview: ${fileName}`}
        className="mx-auto max-h-[min(55dvh,480px)] w-auto max-w-full object-contain"
      />
    );
  }
  if (isPdfName(fileName)) {
    const frameClass =
      "h-[min(55dvh,480px)] min-h-[200px] w-full rounded-lg border border-gray-200 bg-white";
    return (
      <object data={url} type="application/pdf" title={fileName} className={frameClass}>
        <iframe title={fileName} src={url} className={frameClass} />
      </object>
    );
  }
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-primary/70">Preview is not available for this file type.</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`mt-2 inline-block text-sm font-semibold text-secondary underline ${focusRing} rounded`}
      >
        Open file
      </a>
    </div>
  );
}

function FetchedPreviewContent({
  fileName,
  source,
  onResolvedFileSize,
}: {
  fileName: string;
  source: BankSlipFileFetchSource;
  onResolvedFileSize?: (bytes: number) => void;
}) {
  const [state, setState] = useState<
    | { status: "loading" }
    | { status: "ready"; url: string; mime: string }
    | { status: "error" }
  >({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const blobObjectUrlRef: { current: string | null } = { current: null };
    setState({ status: "loading" });
    (async () => {
      try {
        const preview = await fetchPaymentAttachmentPreview(
          source.billId,
          source.paymentId,
          source.attachmentId,
          source.fileAttachmentId,
        );
        if (cancelled) return;

        if (preview.kind === "embed") {
          const mime = (preview.mime_type || "").toLowerCase();
          setState({ status: "ready", url: preview.url, mime });
          const sz = preview.file_size;
          if (sz != null && Number.isFinite(sz) && sz >= 0) {
            onResolvedFileSize?.(sz);
          }
          return;
        }

        const blob = preview.blob;
        const rawType = (blob.type || "").toLowerCase();
        let previewBlob = blob;
        if (isPdfName(fileName) && (!rawType || rawType === "application/octet-stream")) {
          previewBlob = new Blob([await blob.arrayBuffer()], { type: "application/pdf" });
        } else if (isImageName(fileName) && (!rawType || rawType === "application/octet-stream")) {
          const ext = fileName.trim().split(".").pop()?.toLowerCase() ?? "";
          const imageType =
            ext === "png"
              ? "image/png"
              : ext === "gif"
                ? "image/gif"
                : ext === "webp"
                  ? "image/webp"
                  : "image/jpeg";
          previewBlob = new Blob([await blob.arrayBuffer()], { type: imageType });
        }
        const objectUrl = URL.createObjectURL(previewBlob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        blobObjectUrlRef.current = objectUrl;
        setState({ status: "ready", url: objectUrl, mime: previewBlob.type || "" });
        const sz = preview.file_size ?? previewBlob.size;
        if (Number.isFinite(sz) && sz >= 0) {
          onResolvedFileSize?.(sz);
        }
      } catch {
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
      if (blobObjectUrlRef.current) {
        URL.revokeObjectURL(blobObjectUrlRef.current);
        blobObjectUrlRef.current = null;
      }
    };
  }, [source.billId, source.paymentId, source.attachmentId, source.fileAttachmentId, onResolvedFileSize]);

  if (state.status === "loading") {
    return (
      <div className="flex min-h-[200px] items-center justify-center py-8">
        <span className="inline-flex items-center gap-2 text-sm text-primary/60">
          <span className="material-symbols-outlined animate-spin text-secondary text-[22px]" aria-hidden>
            progress_activity
          </span>
          Loading preview…
        </span>
      </div>
    );
  }
  if (state.status === "error") {
    return <p className="py-8 text-center text-sm text-primary/70">Could not load this file.</p>;
  }

  const { url, mime } = state;
  const showImage = mime.startsWith("image/") || isImageName(fileName);
  const showPdf = mime === "application/pdf" || mime === "application/octet-stream" || isPdfName(fileName);

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={`Preview: ${fileName}`}
        className="mx-auto max-h-[min(55dvh,480px)] w-auto max-w-full object-contain"
      />
    );
  }
  if (showPdf) {
    const frameClass =
      "h-[min(55dvh,480px)] min-h-[200px] w-full rounded-lg border border-gray-200 bg-white";
    return (
      <object data={url} type="application/pdf" title={fileName} className={frameClass}>
        <iframe title={fileName} src={url} className={frameClass} />
      </object>
    );
  }
  return (
    <div className="py-8 text-center">
      <p className="text-sm text-primary/70">Preview is not available for this file type.</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        download={fileName}
        className={`mt-2 inline-flex items-center gap-2 text-sm font-semibold text-secondary underline ${focusRing} rounded`}
      >
        <span className="material-symbols-outlined text-[28px] leading-none sm:text-[32px]" aria-hidden>
          download
        </span>
        Download file
      </a>
    </div>
  );
}

/** Same layout as UploadBankslipModal’s inline preview: title row + document area. */
function ViewBankSlipInlinePreview({
  fileName,
  previewUrl,
  fetchSource,
  previewSubtitleId,
  fileSizeBytes,
}: {
  fileName: string;
  previewUrl?: string;
  fetchSource?: BankSlipFileFetchSource;
  previewSubtitleId: string;
  fileSizeBytes?: number;
}) {
  const [fetchedSize, setFetchedSize] = useState<number | undefined>(undefined);
  useEffect(() => {
    setFetchedSize(undefined);
  }, [
    fileName,
    previewUrl,
    fetchSource?.billId,
    fetchSource?.paymentId,
    fetchSource?.attachmentId,
    fetchSource?.fileAttachmentId,
  ]);

  const displayBytes =
    fileSizeBytes != null && Number.isFinite(fileSizeBytes) && fileSizeBytes >= 0
      ? fileSizeBytes
      : fetchedSize;

  const { icon, iconClass } = fileIconForName(fileName);
  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-3 pb-2">
        <span
          className={`material-symbols-outlined mt-0.5 shrink-0 text-[28px] leading-none sm:text-[32px] ${iconClass}`}
          aria-hidden
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-black sm:text-base">{fileName}</p>
          <p id={previewSubtitleId} className="mt-1 text-[11px] font-medium uppercase tracking-wide text-primary/55 sm:text-xs">
            Document preview
            {displayBytes != null && Number.isFinite(displayBytes) ? (
              <>
                <span className="text-primary/35"> • </span>
                {formatFileSize(displayBytes)}
              </>
            ) : null}
          </p>
        </div>
      </div>
      <div className="mt-3 min-h-[min(50dvh,320px)] overflow-auto rounded-lg bg-black/5 p-2 sm:min-h-[240px] sm:p-3">
        <PreviewContent
          fileName={fileName}
          previewUrl={previewUrl}
          fetchSource={fetchSource}
          onResolvedFileSize={fetchSource ? setFetchedSize : undefined}
        />
      </div>
    </div>
  );
}

export function BankSlipDetailsModal({
  open,
  onClose,
  details,
  onUpload,
  onRemoveFile,
  allowRemoveFiles = true,
  onBankSlipFileDeleted,
}: BankSlipDetailsModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const previewSubtitleId = useId();
  const [files, setFiles] = useState<BankSlipFileEntry[]>(() => details.files);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(() => details.files[0]?.id ?? null);
  const [pendingDeleteFileId, setPendingDeleteFileId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFiles(details.files.map((f) => ({ ...f })));
    setSelectedFileId(details.files[0]?.id ?? null);
    setPendingDeleteFileId(null);
    setDeleteError(null);
    setDeletePending(false);
  }, [open, details]);

  useEffect(() => {
    setSelectedFileId((sel) => {
      if (files.length === 0) return null;
      if (sel != null && files.some((f) => f.id === sel)) return sel;
      return files[0].id;
    });
  }, [files]);

  useEffect(() => {
    if (!open) return;
    return pushAppScrollLock();
  }, [open]);

  useEffect(() => {
    if (!open || pendingDeleteFileId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, pendingDeleteFileId]);

  const removeLocal = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    onRemoveFile?.(fileId);
  };

  const pendingDeleteFile = pendingDeleteFileId ? files.find((f) => f.id === pendingDeleteFileId) : undefined;

  const confirmDeleteBankSlip = async () => {
    if (!pendingDeleteFileId || !pendingDeleteFile) return;
    setDeleteError(null);
    const wasLast = files.length === 1;
    try {
      if (pendingDeleteFile.fetchSource) {
        setDeletePending(true);
        const { billId, paymentId, attachmentId } = pendingDeleteFile.fetchSource;
        await deletePaymentAttachment(billId, paymentId, attachmentId);
      }
      removeLocal(pendingDeleteFileId);
      setPendingDeleteFileId(null);
      onBankSlipFileDeleted?.();
      if (wasLast) onClose();
    } catch (e) {
      setPendingDeleteFileId(null);
      setDeleteError(e instanceof ApiError ? e.message : "Could not delete this bank slip. Please try again.");
    } finally {
      setDeletePending(false);
    }
  };

  const selectedEntry = files.find((f) => f.id === selectedFileId);
  const showRemoveOnRows = allowRemoveFiles;

  if (!open) return null;

  return createPortal(
    <div className={overlayClass} role="presentation">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={details.toName.trim() ? descriptionId : undefined}
        className={shellClass}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-4 sm:gap-4 sm:px-6 sm:pb-4 sm:pt-6">
          <div className="min-w-0 pr-2">
            <h2 id={titleId} className="text-lg font-bold leading-snug text-black sm:text-xl md:text-2xl">
              Bank Slip
            </h2>
            {details.toName.trim() ? (
              <p id={descriptionId} className="mt-1 text-sm text-primary/70">
                {details.toName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>
              close
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
          {deleteError ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {deleteError}
            </div>
          ) : null}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="min-w-0">
              <div className="mb-2 flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                  Files ({files.length})
                </p>
                {files.length > 0 ? (
                  <span className="shrink-0 text-[10px] font-medium text-primary/55 sm:text-[11px]">Click to preview</span>
                ) : null}
              </div>
              <ul className="flex flex-col gap-2">
                {files.map((f) => {
                  const { icon, iconClass } = fileIconForName(f.name);
                  const selected = f.id === selectedFileId;
                  return (
                    <li
                      key={f.id}
                      className={
                        "relative flex items-center justify-start rounded-lg border bg-white px-3 py-2.5 pr-11 sm:gap-2 sm:pr-3 " +
                        (selected ? "border-secondary/50 ring-2 ring-secondary/20" : "border-gray-200")
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedFileId(f.id)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center justify-start gap-2 rounded-md text-left"
                        aria-pressed={selected}
                        aria-label={`Preview ${f.name}`}
                      >
                        <span
                          className={`material-symbols-outlined shrink-0 text-[22px] leading-none sm:text-[26px] ${iconClass}`}
                          aria-hidden
                        >
                          {icon}
                        </span>
                        <span className="min-w-0 break-words text-left text-sm leading-snug text-black sm:flex-1 sm:truncate sm:leading-normal">
                          {f.name}
                        </span>
                      </button>
                      {showRemoveOnRows ? (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null);
                            setPendingDeleteFileId(f.id);
                          }}
                          className="absolute right-2 top-1/2 flex h-8 w-8 shrink-0 -translate-y-1/2 items-center justify-center rounded-md text-primary/60 transition-colors hover:bg-gray-100 hover:text-primary sm:static sm:translate-y-0"
                          aria-label={`Delete ${f.name}`}
                        >
                          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
                            close
                          </span>
                        </button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="min-w-0">
              {selectedEntry ? (
                <ViewBankSlipInlinePreview
                  fileName={selectedEntry.name}
                  previewUrl={selectedEntry.previewUrl}
                  fetchSource={selectedEntry.fetchSource}
                  previewSubtitleId={previewSubtitleId}
                  fileSizeBytes={selectedEntry.fileSizeBytes}
                />
              ) : files.length === 0 ? (
                <div className="flex min-h-[156px] items-center justify-center rounded-lg border-2 border-dashed border-[#EDEDED] bg-gray-50 px-4 text-center text-sm text-primary/60 sm:min-h-[176px]">
                  No bank slip files uploaded for these payments yet.
                </div>
              ) : (
                <div className="flex min-h-[156px] items-center justify-center rounded-lg border-2 border-dashed border-[#EDEDED] bg-gray-50 px-4 text-center text-sm text-primary/60 sm:min-h-[176px]">
                  Select a file to preview
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
          <button type="button" onClick={onClose} className={footerCloseClass}>
            Close
          </button>
          {onUpload ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onUpload();
              }}
              className={footerUploadClass}
            >
              New Bank Slip
            </button>
          ) : null}
        </div>
      </div>
      <AttachmentDeleteConfirmModal
        open={pendingDeleteFileId != null}
        count={1}
        pending={deletePending}
        variant="bankSlip"
        fileName={pendingDeleteFile?.name}
        onClose={() => {
          if (!deletePending) {
            setPendingDeleteFileId(null);
            setDeleteError(null);
          }
        }}
        onConfirm={() => void confirmDeleteBankSlip()}
      />
    </div>,
    document.body,
  );
}
