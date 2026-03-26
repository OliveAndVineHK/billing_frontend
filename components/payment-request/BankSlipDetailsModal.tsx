"use client";

import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";
import { pushAppScrollLock } from "@/lib/appScrollRoot";

export type BankSlipFileRef = { id: string; name: string };

/** Per-file overrides; unspecified fields fall back to the parent `BankSlipDetails` row. */
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

export type BankSlipFileEntry = BankSlipFileRef & { details?: BankSlipFileDetailsOverride };

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
};

const overlayClass =
  "fixed inset-0 z-[300] flex items-center justify-center overflow-x-hidden overscroll-x-none p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-4 md:p-6";

const shellClass =
  "relative z-[1] flex max-h-[min(100dvh-1rem,720px)] w-full min-w-0 max-w-[520px] flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5 sm:max-h-[min(92dvh,720px)] sm:rounded-2xl";

const focusRing = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

const closeIconBtnClass = `-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-gray-100 ${focusRing}`;

const footerCloseClass = `box-border h-12 min-h-[48px] w-full cursor-pointer rounded-lg border-2 border-secondary bg-white px-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 ${focusRing} sm:h-11 sm:min-h-[44px] sm:w-auto sm:px-4`;

const footerUploadClass = `box-border inline-flex h-12 min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 ${focusRing} sm:h-11 sm:min-h-[44px] sm:w-auto`;

const fileRowBaseClass = "flex items-start gap-2 rounded-lg border px-3 py-2.5 sm:items-center";

const fileRowUnselectedClass = `${fileRowBaseClass} border-[#EDEDED] bg-white`;

const fileRowSelectedClass = `${fileRowBaseClass} border-secondary/40 bg-secondary/5 ring-2 ring-secondary/25`;

const accountSubClass = "mt-1 block text-sm font-normal tabular-nums text-primary/65";

function fileIconForName(filename: string): { icon: string; iconClass: string } {
  const ext = filename.trim().split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return { icon: "picture_as_pdf", iconClass: "text-red-600" };
  if (ext === "jpg" || ext === "jpeg" || ext === "png") return { icon: "image", iconClass: "text-sky-600" };
  return { icon: "draft", iconClass: "text-primary" };
}

type SlipBodyFields = Omit<BankSlipDetails, "files">;

function mergedSlipFields(base: BankSlipDetails, entry: BankSlipFileEntry | undefined): SlipBodyFields {
  const o = entry?.details;
  return {
    createdBy: o?.createdBy ?? base.createdBy,
    createdAt: o?.createdAt ?? base.createdAt,
    toName: o?.toName ?? base.toName,
    toAccount: o?.toAccount !== undefined ? o.toAccount : base.toAccount,
    amount: o?.amount ?? base.amount,
    fromName: o?.fromName ?? base.fromName,
    fromAccount: o?.fromAccount !== undefined ? o.fromAccount : base.fromAccount,
    when: o?.when ?? base.when,
  };
}

function ReadonlyField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-100 py-3">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs">{label}</p>
      <div className="text-base font-bold text-[#656565] sm:text-sm">{children}</div>
    </div>
  );
}

function FileRow({
  name,
  icon,
  iconClass,
  selected,
  onSelect,
  onRemove,
}: {
  name: string;
  icon: string;
  iconClass: string;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <li className={selected ? fileRowSelectedClass : fileRowUnselectedClass}>
      <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-md text-left sm:items-center" aria-pressed={selected} aria-label={`Show details for ${name}`}>
        <span className={`material-symbols-outlined shrink-0 text-[22px] leading-none sm:text-[26px] ${iconClass}`} aria-hidden>{icon}</span>
        <span className="min-w-0 flex-1 break-words text-sm leading-snug text-black sm:truncate sm:leading-normal">{name}</span>
      </button>
      <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-primary/60 transition-colors hover:bg-gray-100 hover:text-primary" aria-label={`Remove ${name}`}>
        <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>close</span>
      </button>
    </li>
  );
}

export function BankSlipDetailsModal({ open, onClose, details, onUpload, onRemoveFile }: BankSlipDetailsModalProps) {
  const titleId = useId();
  const [files, setFiles] = useState<BankSlipFileEntry[]>(() => details.files);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(() => details.files[0]?.id ?? null);

  useEffect(() => {
    if (!open) return;
    setFiles(details.files.map((f) => ({ ...f })));
    setSelectedFileId(details.files[0]?.id ?? null);
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
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const removeLocal = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
    onRemoveFile?.(fileId);
  };

  const selectedEntry = files.find((f) => f.id === selectedFileId);
  const view = mergedSlipFields(details, selectedEntry);

  if (!open) return null;

  return createPortal(
    <div className={overlayClass} role="presentation">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" onClick={onClose}/>
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={shellClass} onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0">
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="min-w-0 pr-2 text-sm font-semibold uppercase tracking-[0.12em] text-secondary sm:text-base">Bank slip details</h2>
              <button type="button" onClick={onClose} className={closeIconBtnClass} aria-label="Close"><span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>close</span></button>
            </div>
          </div>
          <div className="mt-3 w-full border-b border-dotted border-gray-300" aria-hidden/>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex flex-col">
            <ReadonlyField label="Created by">{view.createdBy}</ReadonlyField>
            <ReadonlyField label="Created at">{view.createdAt}</ReadonlyField>
            <ReadonlyField label="To">
              <span className="block">{view.toName}</span>
              {view.toAccount ? <span className={accountSubClass}>{view.toAccount}</span> : null}
            </ReadonlyField>
            <ReadonlyField label="Amount">{view.amount}</ReadonlyField>
            <ReadonlyField label="From">
              <span className="block">{view.fromName}</span>
              {view.fromAccount ? <span className={accountSubClass}>{view.fromAccount}</span> : null}
            </ReadonlyField>
            <ReadonlyField label="When">{view.when}</ReadonlyField>
          </div>

          <div className="border-b border-gray-100 pt-5 pb-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-primary/80">Uploaded files ({files.length})</p>
            <ul className="flex flex-col gap-2">
              {files.map((f) => {
                const { icon, iconClass } = fileIconForName(f.name);
                return <FileRow key={f.id} name={f.name} icon={icon} iconClass={iconClass} selected={f.id === selectedFileId} onSelect={() => setSelectedFileId(f.id)} onRemove={() => removeLocal(f.id)} />;
              })}
            </ul>
          </div>
        </div>

        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:justify-end sm:gap-3 sm:px-6 sm:py-4">
          <button type="button" onClick={onClose} className={footerCloseClass}>Close</button>
          {onUpload ? <button type="button" onClick={onUpload} className={footerUploadClass}><span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>upload</span>Upload</button> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
