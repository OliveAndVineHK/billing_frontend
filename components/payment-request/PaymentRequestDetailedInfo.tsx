import type { ReactNode } from "react";
import { currencyLabelForCode } from "@/lib/currencyDisplay";

/** Bill / request fields shown in the “Detailed Information” card. */
export type PaymentRequestDetailedInfoData = {
  billNo: string;
  amount: string;
  /** ISO 4217 (e.g. HKD). */
  currencyCode: string;
  description: string;
  contact: string;
  accountCode: string;
  /** ISO date YYYY-MM-DD */
  invoiceDate: string;
  /** ISO date YYYY-MM-DD */
  dueDate: string;
};

export type PaymentRequestDetailedInfoProps = {
  data: PaymentRequestDetailedInfoData;
  isEditing?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
  onPatchChange?: (patch: Partial<PaymentRequestDetailedInfoData>) => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  className?: string;
};

const labelClass =
  "text-[11px] font-semibold uppercase leading-tight tracking-[0.06em] text-[#5c5c5c] sm:text-xs";
const valueClass = "text-sm leading-snug text-[#4a4a4a] sm:text-[15px]";

const amountLabelClass =
  "text-[11px] font-medium uppercase tracking-wide text-primary/60";

const inputClass =
  "mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm leading-snug text-[#4a4a4a] outline-none placeholder:text-primary/35 focus:border-secondary focus:ring-1 focus:ring-secondary/30 sm:text-[15px] disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-primary/50";

const cancelButtonClass =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full border border-secondary bg-white px-5 py-2.5 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50";

const saveButtonClass =
  "inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-full bg-secondary px-5 py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60";

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

function formatLongDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function TextRow({
  label,
  value,
  required,
  valueEmphasis = "normal",
  isEditing,
  onChange,
}: {
  label: ReactNode;
  value: string;
  required?: boolean;
  valueEmphasis?: "normal" | "medium";
  isEditing: boolean;
  onChange?: (v: string) => void;
}) {
  const valueCls =
    valueEmphasis === "medium" ? `${valueClass} font-medium` : valueClass;
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <dd className="mt-0">
        {isEditing ? (
          <input
            type="text"
            className={inputClass}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
          />
        ) : (
          <span className={`block ${valueCls}`}>{value || "—"}</span>
        )}
      </dd>
    </div>
  );
}

function AmountRow({
  currencyCode,
  amount,
  isEditing,
  onPatchChange,
  disabled,
}: {
  currencyCode: string;
  amount: string;
  isEditing: boolean;
  onPatchChange?: (patch: Partial<PaymentRequestDetailedInfoData>) => void;
  disabled?: boolean;
}) {
  const pillLabel = currencyLabelForCode(currencyCode);
  return (
    <div>
      <dt className={amountLabelClass}>
        Amount <span className="text-rose-500">*</span>
      </dt>
      <dd className="mt-1 flex flex-wrap items-center gap-2">
        {isEditing ? (
          <>
            <input
              type="text"
              className={`${inputClass} mt-0 w-[5.5rem] shrink-0 uppercase`}
              value={currencyCode}
              onChange={(e) =>
                onPatchChange?.({ currencyCode: e.target.value.trim().toUpperCase() })
              }
              maxLength={8}
              aria-label="Currency code"
              disabled={disabled}
            />
            <input
              type="text"
              inputMode="decimal"
              className={`${inputClass} mt-0 min-w-0 flex-1`}
              value={amount}
              onChange={(e) => onPatchChange?.({ amount: e.target.value })}
              aria-label="Amount"
              disabled={disabled}
            />
          </>
        ) : (
          <>
            <span className="inline-flex items-center justify-center rounded-md bg-[#F2F2F2] px-2.5 py-1 text-xs font-semibold uppercase text-[#666666]">
              {pillLabel}
            </span>
            <span className="text-sm font-semibold text-primary sm:text-base">{amount}</span>
          </>
        )}
      </dd>
    </div>
  );
}

function DateRow({
  label,
  isoDate,
  required,
  isEditing,
  onChange,
  disabled,
}: {
  label: ReactNode;
  isoDate: string;
  required?: boolean;
  isEditing: boolean;
  onChange?: (iso: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <dd className="mt-1 flex flex-wrap items-center gap-2">
        {isEditing ? (
          <input
            type="date"
            className={`${inputClass} mt-0 max-w-full`}
            value={isoDate}
            onChange={(e) => onChange?.(e.target.value)}
            disabled={disabled}
          />
        ) : (
          <span className={`${valueClass} font-medium`}>{formatLongDate(isoDate)}</span>
        )}
      </dd>
    </div>
  );
}

export function PaymentRequestDetailedInfo({
  data,
  isEditing = false,
  isSaving = false,
  disabled = false,
  onPatchChange,
  onEdit,
  onCancel,
  onSave,
  className = "",
}: PaymentRequestDetailedInfoProps) {
  const {
    billNo,
    amount,
    currencyCode,
    description,
    contact,
    accountCode,
    invoiceDate,
    dueDate,
  } = data;

  const patch = onPatchChange ?? (() => {});

  return (
    <section
      className={`rounded-xl border border-gray-200/90 bg-white p-4 sm:p-5 md:p-6 ${className}`}
    >
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="min-w-0 text-base font-medium leading-snug text-[#5c5c5c] sm:text-lg">
          Detailed Information
        </h2>
        {isEditing ? (
          <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className={cancelButtonClass}
              disabled={disabled || isSaving}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              className={saveButtonClass}
              disabled={disabled || isSaving}
            >
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-secondary px-3.5 py-2 text-sm font-semibold text-white transition-[filter] hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:opacity-50"
            disabled={disabled}
          >
            Edit
            <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden>
              edit_document
            </span>
          </button>
        )}
      </div>

      <dl className="flex flex-col gap-5 sm:gap-6">
        <TextRow
          label="Bill No."
          value={billNo}
          valueEmphasis="medium"
          isEditing={isEditing}
          onChange={(v) => patch({ billNo: v })}
        />

        <AmountRow
          currencyCode={currencyCode}
          amount={amount}
          isEditing={isEditing}
          onPatchChange={patch}
          disabled={disabled}
        />

        <TextRow
          label="Description (Optional)"
          value={description}
          isEditing={isEditing}
          onChange={(v) => patch({ description: v })}
        />

        <TextRow
          label="Contact"
          value={contact}
          required
          valueEmphasis="medium"
          isEditing={isEditing}
          onChange={(v) => patch({ contact: v })}
        />

        <TextRow
          label="Account Code"
          value={accountCode}
          required
          valueEmphasis="medium"
          isEditing={isEditing}
          onChange={(v) => patch({ accountCode: v })}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
          <DateRow
            label="Invoice Date"
            isoDate={invoiceDate}
            required
            isEditing={isEditing}
            onChange={(iso) => patch({ invoiceDate: iso })}
            disabled={disabled}
          />
          <DateRow
            label="Due Date"
            isoDate={dueDate}
            required
            isEditing={isEditing}
            onChange={(iso) => patch({ dueDate: iso })}
            disabled={disabled}
          />
        </div>
      </dl>
    </section>
  );
}
