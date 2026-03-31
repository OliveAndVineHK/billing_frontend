"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { pushAppScrollLock } from "@/lib/appScrollRoot";
import { formatFileSize, isImageFile, isPdfFile } from "@/lib/fileAttachmentPreview";

export type UploadInvoiceAttachmentModalProps = {
  open: boolean;
  onClose: () => void;
  onUpload: (files: File[]) => Promise<void> | void;
};

type UploadedEntry = { id: string; file: File };

function getUploadedFileIconInfo(filename: string): { icon: string; iconClass: string } {
  const ext = filename.trim().split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { icon: "picture_as_pdf", iconClass: "text-red-600" };
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return { icon: "image", iconClass: "text-sky-600" };
  return { icon: "draft", iconClass: "text-primary" };
}

export function UploadInvoiceAttachmentModal({ open, onClose, onUpload }: UploadInvoiceAttachmentModalProps) {
  const titleId = useId();
  const previewSubtitleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedEntry[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [previewObjectUrl, setPreviewObjectUrl] = useState<string | null>(null);

  const previewFile = previewFileId ? uploadedFiles.find((x) => x.id === previewFileId)?.file ?? null : null;

  useEffect(() => {
    if (!previewFile) {
      setPreviewObjectUrl(null);
      return;
    }
    const url = URL.createObjectURL(previewFile);
    setPreviewObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewFile]);

  useEffect(() => {
    if (previewFileId && !uploadedFiles.some((x) => x.id === previewFileId)) setPreviewFileId(null);
  }, [uploadedFiles, previewFileId]);

  useEffect(() => {
    if (!open) {
      setUploadedFiles([]);
      setUploadError(null);
      setUploading(false);
      setPreviewFileId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return pushAppScrollLock();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (previewFileId) {
        setPreviewFileId(null);
        return;
      }
      if (!uploading) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, previewFileId, uploading]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const added: UploadedEntry[] = Array.from(list).map((file) => ({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
    }));
    setUploadedFiles((prev) => [...prev, ...added]);
    setUploadError(null);
    e.target.value = "";
  };

  const removeFile = (entryId: string) => {
    setUploadedFiles((prev) => prev.filter((x) => x.id !== entryId));
  };

  const handleUploadClick = async () => {
    if (uploadedFiles.length === 0) {
      setUploadError("Select at least one attachment.");
      return;
    }
    if (uploading) return;
    setUploadError(null);
    setUploading(true);
    try {
      await Promise.resolve(onUpload(uploadedFiles.map((x) => x.file)));
      onClose();
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-x-hidden overscroll-x-none p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-4 md:p-6" role="presentation">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" onClick={() => { if (!uploading) onClose(); }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={previewFile ? previewSubtitleId : undefined}
        className="relative z-[1] flex max-h-[min(100dvh-1rem,760px)] w-full min-w-0 max-w-[980px] flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5 sm:max-h-[min(92dvh,760px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-4 sm:gap-4 sm:px-6 sm:pb-4 sm:pt-6">
          <div className="min-w-0 pr-2">
            <h2 id={titleId} className="text-lg font-bold leading-snug text-black sm:text-xl md:text-2xl">
              Upload Attachment
            </h2>
            <p className="mt-1 text-sm text-primary/70">Add invoice images or PDFs to this bill.</p>
          </div>
          <button type="button" onClick={() => { if (!uploading) onClose(); }} className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary" aria-label="Close">
            <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>
              close
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
          {uploadError ? (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
              {uploadError}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="min-w-0">
              <div className="relative mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  className="absolute inset-0 z-20 h-full min-h-[88px] w-full cursor-pointer opacity-0 sm:min-h-[104px]"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                  onChange={handleFilesSelected}
                  aria-label="Choose attachment files to upload"
                />
                <div className="pointer-events-none">
                  <div className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-white px-3 py-3 sm:min-h-[104px] sm:py-4">
                    <span className="material-symbols-outlined text-2xl leading-none text-secondary sm:text-3xl" aria-hidden>
                      upload_file
                    </span>
                    <span className="text-center text-xs font-medium text-secondary sm:text-sm">
                      Tap or drop files (PDF, JPG, PNG)
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-2 mt-5 flex items-baseline justify-between gap-3">
                <p className="min-w-0 text-[11px] font-semibold uppercase tracking-wide text-primary/80">
                  Selected files ({uploadedFiles.length})
                </p>
                {uploadedFiles.length > 0 ? (
                  <span className="shrink-0 text-[10px] font-medium text-primary/55 sm:text-[11px]">Click to preview</span>
                ) : null}
              </div>

              <ul className="flex flex-col gap-2">
                {uploadedFiles.map(({ id, file }) => {
                  const { icon, iconClass } = getUploadedFileIconInfo(file.name);
                  const selected = previewFileId === id;
                  return (
                    <li
                      key={id}
                      className={
                        "relative flex items-center justify-start rounded-lg border bg-white px-3 py-2.5 pr-11 sm:gap-2 sm:pr-3 " +
                        (selected ? "border-secondary/50 ring-2 ring-secondary/20" : "border-gray-200")
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewFileId(id)}
                        className="flex min-w-0 flex-1 cursor-pointer items-center justify-start gap-2 rounded-md text-left"
                        aria-pressed={selected}
                        aria-label={`Preview ${file.name}`}
                      >
                        <span className={`material-symbols-outlined shrink-0 text-[22px] leading-none sm:text-[26px] ${iconClass}`} aria-hidden>
                          {icon}
                        </span>
                        <span className="min-w-0 break-words text-left text-sm leading-snug text-black sm:flex-1 sm:truncate sm:leading-normal">
                          {file.name}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => removeFile(id)}
                        className="absolute right-2 top-1/2 flex h-8 w-8 shrink-0 -translate-y-1/2 items-center justify-center rounded-md text-primary/60 transition-colors hover:bg-gray-100 hover:text-primary sm:static sm:translate-y-0"
                        aria-label={`Remove ${file.name}`}
                      >
                        <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
                          close
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="min-w-0">
              {previewFile && previewObjectUrl ? (
                <div className="flex h-full flex-col">
                  <div className="flex gap-3 pb-2">
                    <span className={`material-symbols-outlined mt-0.5 shrink-0 text-[28px] leading-none sm:text-[32px] ${getUploadedFileIconInfo(previewFile.name).iconClass}`} aria-hidden>
                      {getUploadedFileIconInfo(previewFile.name).icon}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-black sm:text-base">{previewFile.name}</p>
                      <p id={previewSubtitleId} className="mt-1 text-[11px] font-medium uppercase tracking-wide text-primary/55 sm:text-xs">
                        Document preview<span className="text-primary/35"> • </span>
                        {formatFileSize(previewFile.size)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 min-h-[min(50dvh,320px)] overflow-auto rounded-lg bg-black/5 p-2 sm:p-3">
                    {isImageFile(previewFile) ? (
                      <img src={previewObjectUrl} alt={`Preview: ${previewFile.name}`} className="mx-auto max-h-[min(55dvh,480px)] w-auto max-w-full object-contain" />
                    ) : null}
                    {isPdfFile(previewFile) && !isImageFile(previewFile) ? (
                      <iframe title={previewFile.name} src={previewObjectUrl} className="h-[min(55dvh,480px)] w-full rounded-lg border border-gray-200 bg-white" />
                    ) : null}
                    {!isImageFile(previewFile) && !isPdfFile(previewFile) ? (
                      <p className="py-8 text-center text-sm text-primary/70">Preview is not available for this file type.</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 text-center text-sm text-primary/60">
                  Select a file to preview
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="box-border h-12 min-h-[48px] w-full rounded-lg border-2 border-secondary bg-white px-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:min-h-[44px] sm:w-auto sm:px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleUploadClick()}
            disabled={uploading}
            className="box-border h-12 min-h-[48px] w-full rounded-lg border border-transparent bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:min-h-[44px] sm:w-auto"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

