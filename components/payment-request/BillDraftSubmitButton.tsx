"use client";

export type BillDraftSubmitButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  pending?: boolean;
};

const focusRing =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

export function BillDraftSubmitButton({ onClick, disabled, pending }: BillDraftSubmitButtonProps) {
  return (
    <button type="button" onClick={onClick} disabled={disabled || pending} className={`inline-flex h-10 min-h-[44px] w-full shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full border border-transparent bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-auto ${focusRing}`} aria-busy={pending ? true : undefined}>
      {pending ? "Submitting…" : "Submit"}
    </button>
  );
}
