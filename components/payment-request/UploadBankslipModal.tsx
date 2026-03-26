"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState } from "react";
import { pushAppScrollLock } from "@/lib/appScrollRoot";

export type UploadBankslipModalProps = {
  open: boolean;
  onClose: () => void;
  /** Shown for context in the dialog description (optional). */
  contactTitle?: string;
  /** Called when the user confirms with the current file selection, paid date, and amount. */
  onComplete?: (files: File[], paidDate: string, amount: string) => void;
};

type UploadedEntry = { id: string; file: File };

function getUploadedFileIconInfo(filename: string): { icon: string; iconClass: string } {
  const ext = filename.trim().split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { icon: "picture_as_pdf", iconClass: "text-red-600" };
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return { icon: "image", iconClass: "text-sky-600" };
  return { icon: "draft", iconClass: "text-primary" };
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      /* showPicker can throw outside a user gesture in some browsers */
    }
  }
  input.focus();
}

export function UploadBankslipModal({ open, onClose, contactTitle, onComplete }: UploadBankslipModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const paidDateFieldId = useId();
  const amountFieldId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const paidDateRef = useRef<HTMLInputElement>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedEntry[]>([]);
  const [paidDate, setPaidDate] = useState("2026-03-03");
  const [amount, setAmount] = useState("");
  const [paidDateError, setPaidDateError] = useState<string | null>(null);
  const [amountError, setAmountError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setUploadedFiles([]);
      setPaidDateError(null);
      setAmountError(null);
      setPaidDate("2026-03-03");
      setAmount("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    return pushAppScrollLock();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

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
    e.target.value = "";
  };

  const removeFile = (entryId: string) => {
    setUploadedFiles((prev) => prev.filter((x) => x.id !== entryId));
  };

  const handleDone = () => {
    let invalid = false;
    if (!paidDate.trim()) {
      setPaidDateError("Paid date is required.");
      invalid = true;
    } else {
      setPaidDateError(null);
    }
    if (!amount.trim()) {
      setAmountError("Amount is required.");
      invalid = true;
    } else {
      setAmountError(null);
    }
    if (invalid) return;
    onComplete?.(
      uploadedFiles.map((x) => x.file),
      paidDate,
      amount.trim(),
    );
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-x-hidden overscroll-x-none p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-4 md:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={contactTitle ? descriptionId : undefined}
        className="relative z-[1] flex max-h-[min(100dvh-1rem,640px)] w-full min-w-0 max-w-[480px] flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5 sm:max-h-[min(92dvh,640px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-4 sm:gap-4 sm:px-6 sm:pb-4 sm:pt-6">
          <div className="min-w-0 pr-2">
            <h2 id={titleId} className="text-lg font-bold leading-snug text-black sm:text-xl md:text-2xl">
              Upload Bank Slip
            </h2>
            {contactTitle ? (
              <p id={descriptionId} className="mt-1 text-sm text-primary/70">
                {contactTitle}
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
          <div className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
            <div className="min-w-0">
              <label htmlFor={paidDateFieldId} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
                Paid date
                <span className="text-red-500"> *</span>
              </label>
              <div className="relative w-full">
                <input
                  ref={paidDateRef}
                  id={paidDateFieldId}
                  type="date"
                  value={paidDate}
                  onChange={(e) => {
                    setPaidDate(e.target.value);
                    setPaidDateError(null);
                  }}
                  aria-invalid={!!paidDateError}
                  aria-required
                  className={
                    "pr-date-input box-border h-11 min-h-[44px] w-full rounded-lg border bg-white py-0 pl-3 pr-11 text-base text-black focus:outline-none focus:ring-2 [color-scheme:light] sm:min-h-11 sm:text-sm " +
                    (paidDateError
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200/50"
                      : "border-[#EDEDED] focus:border-secondary focus:ring-secondary/25")
                  }
                />
                <button
                  type="button"
                  onClick={() => openDatePicker(paidDateRef.current)}
                  className="absolute right-0 top-0 flex h-11 min-h-[44px] w-11 min-w-[44px] cursor-pointer items-center justify-center rounded-r-lg border-l border-[#EDEDED] bg-[#EDEDED] text-primary transition-colors hover:bg-[#E4E4E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-11"
                  aria-label="Open calendar for paid date"
                >
                  <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
                    calendar_clock
                  </span>
                </button>
              </div>
              {paidDateError ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {paidDateError}
                </p>
              ) : null}
            </div>
            <div className="min-w-0">
              <label htmlFor={amountFieldId} className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs">
                Amount
                <span className="text-red-500"> *</span>
              </label>
              <input
                id={amountFieldId}
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setAmountError(null);
                }}
                placeholder="e.g. 1,500.00"
                aria-invalid={!!amountError}
                aria-required
                className={
                  "box-border h-11 min-h-[44px] w-full rounded-lg border bg-white px-3 text-base text-black placeholder:text-primary/45 focus:outline-none focus:ring-2 sm:min-h-11 sm:text-sm " +
                  (amountError
                    ? "border-red-500 focus:border-red-500 focus:ring-red-200/50"
                    : "border-[#EDEDED] focus:border-secondary focus:ring-secondary/25")
                }
              />
              {amountError ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {amountError}
                </p>
              ) : null}
            </div>
          </div>

          <div className="relative mb-3">
            <input
              ref={fileInputRef}
              type="file"
              className="absolute inset-0 z-20 h-full min-h-[88px] w-full cursor-pointer opacity-0 sm:min-h-[104px]"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
              onChange={handleFilesSelected}
              aria-label="Choose bank slip files to upload"
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

          <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-primary/80">
            Selected files ({uploadedFiles.length})
          </p>
          <ul className="flex flex-col gap-2">
            {uploadedFiles.map(({ id, file }) => {
              const { icon, iconClass } = getUploadedFileIconInfo(file.name);
              return (
                <li
                  key={id}
                  className="flex items-start gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2.5 sm:items-center"
                >
                  <span
                    className={`material-symbols-outlined shrink-0 text-[22px] leading-none sm:text-[26px] ${iconClass}`}
                    aria-hidden
                  >
                    {icon}
                  </span>
                  <span className="min-w-0 flex-1 break-words text-sm leading-snug text-black sm:truncate sm:leading-normal">
                    {file.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeFile(id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-primary/60 transition-colors hover:bg-gray-100 hover:text-primary"
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

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
          <button
            type="button"
            onClick={onClose}
            className="box-border h-12 min-h-[48px] w-full rounded-lg border-2 border-secondary bg-white px-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:h-11 sm:min-h-[44px] sm:w-auto sm:px-4"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="box-border h-12 min-h-[48px] w-full rounded-lg border border-transparent bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:h-11 sm:min-h-[44px] sm:w-auto"
          >
            Upload
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
