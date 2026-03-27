"use client";

type InvoiceAttachmentToolbarProps = {
  onDelete?: () => void;
  deleteReadOnly?: boolean;
};

export function InvoiceAttachmentToolbar({ onDelete, deleteReadOnly = false }: InvoiceAttachmentToolbarProps) {
  const btnClass =
    "inline-flex h-9 min-h-[44px] shrink-0 items-center gap-1.5 rounded-md border border-primary/25 bg-white px-2.5 text-xs font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:h-10 sm:min-h-0 sm:px-3.5 sm:text-sm";

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 sm:flex-nowrap">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:flex-initial">
        <button
          type="button"
          className={`${btnClass} ${deleteReadOnly ? "cursor-not-allowed opacity-50 hover:bg-white" : ""}`}
          onClick={onDelete}
          aria-label="Delete attachment"
          disabled={deleteReadOnly}
          aria-disabled={deleteReadOnly}
          title={deleteReadOnly ? "Enable Edit to delete attachments" : undefined}
        >
          Delete
          <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
            delete
          </span>
        </button>
      </div>
    </div>
  );
}
