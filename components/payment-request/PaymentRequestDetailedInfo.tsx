import type { ReactNode } from "react";

/** Bill / request fields shown in the “Detailed Information” card. */
export type PaymentRequestDetailedInfoData = {
  billNo: string;
  amount: string;
  currencyLabel: string;
  description: string;
  contact: string;
  accountCode: string;
  invoiceDate: string;
  dueDate: string;
};

export type PaymentRequestDetailedInfoProps = {
  data: PaymentRequestDetailedInfoData;
  onEdit?: () => void;
  onInvoiceDateClick?: () => void;
  onDueDateClick?: () => void;
  className?: string;
};

const labelClass =
  "text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-[#5c5c5c] sm:text-xs";
const valueClass = "text-sm leading-snug text-[#4a4a4a] sm:text-[15px]";

const amountLabelClass =
  "text-[11px] font-medium uppercase tracking-wide text-primary/60";

const editButtonClass =
  "inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-secondary px-3.5 py-2 text-sm font-semibold text-white transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary";

const calendarButtonClass =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-[#f3f4f6] text-[#6b6b6b] transition-colors hover:bg-gray-200/80";

function RequiredMark() {
  return (
    <span className="ml-0.5 text-red-500" aria-hidden>
      *
    </span>
  );
}

function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <dt className={labelClass}>
      {children}
      {required ? <RequiredMark /> : null}
    </dt>
  );
}

function TextField({
  label,
  value,
  required,
  valueEmphasis = "normal",
}: {
  label: ReactNode;
  value: string;
  required?: boolean;
  valueEmphasis?: "normal" | "medium";
}) {
  const valueCls =
    valueEmphasis === "medium" ? `${valueClass} font-medium` : valueClass;
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <dd className={`mt-1 ${valueCls}`}>{value}</dd>
    </div>
  );
}

function AmountField({
  currencyLabel,
  amount,
}: {
  currencyLabel: string;
  amount: string;
}) {
  return (
    <div>
      <dt className={amountLabelClass}>
        Amount <span className="text-rose-500">*</span>
      </dt>
      <dd className="mt-1 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center justify-center rounded-md bg-[#F2F2F2] px-2.5 py-1 text-xs font-semibold uppercase text-[#666666]">
          {currencyLabel}
        </span>
        <span className="text-sm font-semibold text-primary sm:text-base">{amount}</span>
      </dd>
    </div>
  );
}

function CalendarIconButton({
  "aria-label": ariaLabel,
  onClick,
}: {
  "aria-label": string;
  onClick?: () => void;
}) {
  return (
    <button type="button" className={calendarButtonClass} aria-label={ariaLabel} onClick={onClick}>
      <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
        calendar_clock
      </span>
    </button>
  );
}

export function PaymentRequestDetailedInfo({
  data,
  onEdit,
  onInvoiceDateClick,
  onDueDateClick,
  className = "",
}: PaymentRequestDetailedInfoProps) {
  const {
    billNo,
    amount,
    currencyLabel,
    description,
    contact,
    accountCode,
    invoiceDate,
    dueDate,
  } = data;

  return (
    <section
      className={`rounded-xl border border-gray-200/90 bg-white p-4 sm:p-5 md:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="min-w-0 text-base font-medium leading-snug text-[#5c5c5c] sm:text-lg">
          Detailed Information
        </h2>
        <button type="button" onClick={onEdit} className={editButtonClass}>
          Edit
          <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden>
            edit_document
          </span>
        </button>
      </div>

      <dl className="flex flex-col gap-5 sm:gap-6">
        <TextField label="Bill No." value={billNo} valueEmphasis="medium" />

        <AmountField currencyLabel={currencyLabel} amount={amount} />

        <TextField label="Description (Optional)" value={description} />

        <TextField label="Contact" value={contact} required valueEmphasis="medium" />

        <TextField label="Account Code" value={accountCode} required valueEmphasis="medium" />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
          <div>
            <FieldLabel required>Invoice Date</FieldLabel>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`${valueClass} font-medium`}>{invoiceDate}</span>
              <CalendarIconButton aria-label="Invoice date" onClick={onInvoiceDateClick} />
            </dd>
          </div>
          <div>
            <FieldLabel required>Due Date</FieldLabel>
            <dd className="mt-1 flex flex-wrap items-center gap-2">
              <span className={`${valueClass} font-medium`}>{dueDate}</span>
              <CalendarIconButton aria-label="Due date" onClick={onDueDateClick} />
            </dd>
          </div>
        </div>
      </dl>
    </section>
  );
}
