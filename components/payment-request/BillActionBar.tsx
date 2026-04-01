"use client";

import { BillDraftSubmitButton } from "./BillDraftSubmitButton";

type BillActionBarProps = {
  onDeleteBill?: () => void;
  onPublishToXero?: () => void;
  deleteDisabled?: boolean;
  publishStatus?: "not_published" | "published" | "failed";
  publishPending?: boolean;
  draftSubmit?: {
    show: boolean;
    onClick: () => void;
    disabled?: boolean;
    pending?: boolean;
  };
};

export function BillActionBar({ onDeleteBill, onPublishToXero, deleteDisabled, publishStatus, publishPending, draftSubmit }: BillActionBarProps) {
  const isPublished = publishStatus === "published";

  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <button type="button" onClick={onDeleteBill} disabled={deleteDisabled} className="inline-flex h-10 min-h-[44px] w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md bg-rose-50 px-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto sm:justify-start sm:px-4">
        Delete Bill
        <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
          delete
        </span>
      </button>
      <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end sm:gap-3">
        {draftSubmit?.show ? (
          <BillDraftSubmitButton onClick={draftSubmit.onClick} disabled={draftSubmit.disabled} pending={draftSubmit.pending} />
        ) : null}
        <button
          type="button"
          onClick={isPublished ? undefined : onPublishToXero}
          disabled={isPublished || publishPending}
          className={
            "inline-flex h-10 min-h-[44px] w-full max-w-full shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:h-10 sm:w-auto sm:justify-start sm:px-4 " +
            (isPublished
              ? "border-2 border-emerald-500 bg-emerald-50 text-emerald-700 cursor-default"
              : publishPending
                ? "border border-primary/25 bg-white text-primary/50 cursor-wait"
                : "border border-primary/25 bg-white text-primary cursor-pointer hover:bg-primary/5 focus-visible:outline-secondary")
          }
        >
          {isPublished ? (
            <>
              <span className="material-symbols-outlined text-[20px] leading-none text-emerald-500" aria-hidden>
                check_circle
              </span>
              Published to Xero
            </>
          ) : publishPending ? (
            "Publishing…"
          ) : (
            "Publish to Xero"
          )}
          <img src="/xero-active.png" alt="" width={40} height={40} className="h-10 w-10 shrink-0 object-contain" aria-hidden />
        </button>
      </div>
    </div>
  );
}
