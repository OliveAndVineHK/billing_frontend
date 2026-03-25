type BillActionBarProps = {
  onDeleteBill?: () => void;
  onPublishToXero?: () => void;
  deleteDisabled?: boolean;
};

function XeroMark({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#13B5EA] text-[10px] font-bold text-white ${className}`}
      aria-hidden
    >
      Xe
    </span>
  );
}

export function BillActionBar({ onDeleteBill, onPublishToXero, deleteDisabled }: BillActionBarProps) {
  return (
    <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <button
        type="button"
        onClick={onDeleteBill}
        disabled={deleteDisabled}
        className="inline-flex h-10 min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-md bg-rose-50 px-3 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-400 disabled:cursor-not-allowed disabled:opacity-50 sm:h-10 sm:w-auto sm:justify-start sm:px-4"
      >
        Delete Bill
        <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
          delete
        </span>
      </button>
      <button
        type="button"
        onClick={onPublishToXero}
        className="inline-flex h-10 min-h-[44px] w-full max-w-full shrink-0 items-center justify-center gap-2 rounded-full border border-primary/25 bg-white px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:h-10 sm:w-auto sm:justify-start sm:px-4"
      >
        Publish to Xero
        <XeroMark />
      </button>
    </div>
  );
}
