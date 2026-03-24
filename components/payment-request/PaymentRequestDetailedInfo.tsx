type PaymentRequestDetailedInfoProps = {
  billNo?: string;
  amount?: string;
  currencyLabel?: string;
  description?: string;
  contact?: string;
  accountCode?: string;
  invoiceDate?: string;
  dueDate?: string;
  onEdit?: () => void;
};

export function PaymentRequestDetailedInfo({
  billNo = "MBIDAN-115803AM031626",
  amount = "1,500.00",
  currencyLabel = "HK$",
  description = "Lorem ipsum Dolor",
  contact = "Young Bros Transport",
  accountCode = "425 - Transport",
  invoiceDate = "03 Mar 2026",
  dueDate = "03 Mar 2026",
  onEdit,
}: PaymentRequestDetailedInfoProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <h2 className="text-base font-semibold text-primary sm:text-lg">Detailed Information</h2>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-secondary px-3 py-1.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
        >
          Edit
          <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden>
            edit_square
          </span>
        </button>
      </div>

      <dl className="flex flex-col gap-4">
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-primary/60">Bill No.</dt>
          <dd className="mt-1 text-sm font-medium text-primary sm:text-base">{billNo}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-primary/60">
            Amount <span className="text-rose-500">*</span>
          </dt>
          <dd className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-primary/20 bg-gray-50 px-2 py-0.5 text-xs font-medium text-primary/80">{currencyLabel}</span>
            <span className="text-sm font-semibold text-primary sm:text-base">{amount}</span>
          </dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-primary/60">Description (Optional)</dt>
          <dd className="mt-1 text-sm text-primary sm:text-base">{description}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-primary/60">
            Contact <span className="text-rose-500">*</span>
          </dt>
          <dd className="mt-1 text-sm font-medium text-primary sm:text-base">{contact}</dd>
        </div>
        <div>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-primary/60">
            Account Code <span className="text-rose-500">*</span>
          </dt>
          <dd className="mt-1 text-sm font-medium text-primary sm:text-base">{accountCode}</dd>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-primary/60">
              Invoice Date <span className="text-rose-500">*</span>
            </dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="text-sm font-medium text-primary sm:text-base">{invoiceDate}</span>
              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-primary/20 bg-gray-50 text-primary/70" aria-label="Invoice date">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              </button>
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-primary/60">
              Due Date <span className="text-rose-500">*</span>
            </dt>
            <dd className="mt-1 flex items-center gap-2">
              <span className="text-sm font-medium text-primary sm:text-base">{dueDate}</span>
              <button type="button" className="inline-flex h-8 w-8 items-center justify-center rounded border border-primary/20 bg-gray-50 text-primary/70" aria-label="Due date">
                <span className="material-symbols-outlined text-[20px]">calendar_today</span>
              </button>
            </dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
