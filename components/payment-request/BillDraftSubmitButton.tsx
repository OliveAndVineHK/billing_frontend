"use client";

export type BillDraftSubmitButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
};

/** Matches the payment request detail “Edit” pill (BillActionBar `endRowPrefix`). */
const submitButtonClass =
  "inline-flex h-10 min-h-[44px] w-auto max-w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full border border-primary/25 bg-white px-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:px-4";

export function BillDraftSubmitButton({ onClick, disabled, pending }: BillDraftSubmitButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || pending} className={submitButtonClass} aria-busy={pending ? true : undefined}>
      <span className="whitespace-nowrap">{pending ? "Submitting…" : "Submit"}</span>
      <span className="material-symbols-outlined shrink-0 text-[14px] leading-none" aria-hidden>
        chevron_right
      </span>
    </button>
  );
}
