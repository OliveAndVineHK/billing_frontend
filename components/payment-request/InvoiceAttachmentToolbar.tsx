"use client";

type InvoiceAttachmentToolbarProps = {
  onDelete?: () => void;
  onDownloadPdf?: () => void;
  onExpand?: () => void;
};

export function InvoiceAttachmentToolbar({ onDelete, onDownloadPdf, onExpand }: InvoiceAttachmentToolbarProps) {
  const btnClass =
    "inline-flex h-9 min-h-[44px] shrink-0 items-center gap-1.5 rounded-md border border-primary/25 bg-white px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:h-10 sm:min-h-0 sm:px-3.5 sm:text-sm";

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-initial">
        <button type="button" className={btnClass} onClick={onDelete} aria-label="Delete attachment">
          Delete
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
            delete
          </span>
        </button>
        <button type="button" className={btnClass} onClick={onDownloadPdf} aria-label="Download PDF">
          <span className="sm:hidden">PDF</span>
          <span className="hidden sm:inline">Download PDF</span>
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
            download
          </span>
        </button>
      </div>
      <button
        type="button"
        className="inline-flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-primary/25 bg-white text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:h-10 sm:w-10"
        onClick={onExpand}
        aria-label="Expand preview"
      >
        <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>
          open_in_full
        </span>
      </button>
    </div>
  );
}
