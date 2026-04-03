"use client";

import type { ReactNode } from "react";
import { useId, useRef } from "react";
import { BillContactPicker } from "@/components/BillContactPicker";
import { ThemedSelect } from "@/components/ThemedSelect";
import { currencyLabelForCode } from "@/lib/currencyDisplay";
import type { ThemedSelectOption } from "@/components/ThemedSelect";
import {
  currencyOptionsForEditing,
  isoCodeToModalCurrency,
  mergeSelectOption,
  modalCurrencyToIsoCode,
} from "@/lib/billFormSelectOptions";
import type { EntityBillContact } from "@/lib/api";
import { openDatePicker } from "@/lib/openDatePicker";

/** Bill / request fields shown in the “Detailed Information” card. */
export type PaymentRequestDetailedInfoData = {
  billNo: string;
  amount: string;
  /** ISO 4217 (e.g. HKD). */
  currencyCode: string;
  description: string;
  contact: string;
  /** Xero ContactID when supplier is chosen from synced contacts; empty if unknown. */
  xero_contact_id: string;
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
  /** Inline error under Bill No. (e.g. duplicate invoice number from API). */
  billNoError?: string | null;
  accountCodeError?: string | null;
  accountOptions?: ThemedSelectOption[];
  /** Contacts for typeahead / create-in-Xero (edit mode). */
  entityBillContacts?: EntityBillContact[];
  onRefetchEntityBillContacts?: (ensureMerged?: EntityBillContact) => Promise<void>;
  onPatchChange?: (patch: Partial<PaymentRequestDetailedInfoData>) => void;
  onEdit?: () => void;
  onCancel?: () => void;
  onSave?: () => void;
  className?: string;
};

/** Same as Add Payment Request modal field labels — used in view and edit so spacing matches. */
const fieldLabelClass =
  "mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs";

/** Same as modal text inputs (Bill No., Description, etc.). */
const modalTextInputClass =
  "box-border h-11 min-h-[44px] w-full rounded-lg border border-[#EDEDED] bg-white px-3 text-base text-black placeholder:text-primary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 sm:min-h-11 sm:text-sm";

const amountValueInputClass =
  "box-border h-11 min-h-[44px] min-w-0 w-full rounded-lg border border-[#EDEDED] bg-white px-3 text-base text-black focus:outline-none focus:ring-2 sm:min-h-11 sm:flex-1 sm:rounded-l-none sm:rounded-r-lg sm:border-l-0 sm:text-sm focus:border-secondary focus:ring-secondary/25";

const cancelButtonClass =
  "box-border h-11 min-h-[44px] shrink-0 cursor-pointer rounded-lg border-2 border-secondary bg-white px-4 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[44px] sm:px-5";

const saveButtonClass =
  "box-border h-11 min-h-[44px] shrink-0 cursor-pointer rounded-lg border border-transparent bg-secondary px-5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px] sm:px-6";

/** Header actions row: same min-height in view (Edit) and edit (Cancel + Save) to avoid vertical jump. */
const headerActionsClass =
  "flex min-h-[44px] w-full shrink-0 flex-wrap items-center gap-2 sm:w-auto sm:justify-end";

const editToggleButtonClass =
  "inline-flex h-11 min-h-[44px] shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-[filter] hover:brightness-95 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50";

function FieldLabel({
  htmlFor,
  editing,
  children,
}: {
  htmlFor?: string;
  editing: boolean;
  children: ReactNode;
}) {
  if (editing && htmlFor) {
    return (
      <label htmlFor={htmlFor} className={fieldLabelClass}>
        {children}
      </label>
    );
  }
  return <div className={fieldLabelClass}>{children}</div>;
}

function formatLongDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** Read-only text row: same outer box as modal `<input>`. */
function ReadOnlyTextBox({
  children,
  emphasis = "semibold",
}: {
  children: React.ReactNode;
  emphasis?: "normal" | "semibold";
}) {
  return (
    <div className={`flex h-11 min-h-[44px] w-full items-center rounded-lg bg-transparent px-3 text-base text-black sm:min-h-11 sm:text-sm ${emphasis === "semibold" ? "font-semibold" : ""}`}>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </div>
  );
}

/** Matches ThemedSelect split trigger (contact / account) — non-interactive. */
function ReadOnlySelectShell({ value }: { value?: string | null }) {
  const display = (value ?? "").trim() || "—";
  return (
    <div className="box-border flex h-11 min-h-[44px] min-w-0 w-full cursor-default overflow-hidden rounded-lg bg-transparent p-0 text-left text-base font-semibold text-black sm:min-h-11 sm:text-sm" aria-readonly="true">
      <span className="flex min-h-[44px] min-w-0 flex-1 items-center py-0 pl-3 pr-3 sm:min-h-11">
        <span className="min-w-0 flex-1 truncate">{display}</span>
      </span>
    </div>
  );
}

/** Same layout as amount row in modal: gray #EDEDED currency cell + white amount cell. */
function ReadOnlyAmountRow({
  currencyDisplayLabel,
  amount,
}: {
  currencyDisplayLabel: string;
  amount: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:gap-0">
      <div className="box-border flex h-11 min-h-[44px] w-full shrink-0 items-center justify-between gap-2 rounded-lg bg-transparent px-2 pl-3 pr-2 text-base font-semibold text-[#656565] sm:w-24 sm:rounded-l-lg sm:rounded-r-none sm:px-3 sm:text-sm" aria-label="Currency">
        <span className="min-w-0 flex-1 truncate">{currencyDisplayLabel}</span>
      </div>
      <div className="box-border flex h-11 min-h-[44px] min-w-0 w-full items-center rounded-lg bg-transparent px-3 text-base font-semibold text-black sm:min-h-11 sm:flex-1 sm:rounded-l-none sm:rounded-r-lg sm:text-sm" aria-readonly="true">
        <span className="min-w-0 flex-1 truncate">{amount || "—"}</span>
      </div>
    </div>
  );
}

/** Same chrome as date field + calendar strip in modal; read-only text. */
function ReadOnlyDateRow({ display }: { display: string }) {
  return (
    <div className="relative">
      <div className="flex h-11 min-h-[44px] w-full items-center rounded-lg bg-transparent py-0 pl-3 pr-11 text-base font-semibold text-black sm:min-h-11 sm:text-sm">
        <span className="min-w-0 flex-1 truncate">{display}</span>
      </div>
      <div className="pointer-events-none absolute right-0 top-0 flex h-11 min-h-[44px] w-11 min-w-[44px] items-center justify-center rounded-r-lg text-primary sm:min-h-11" aria-hidden>
        <span className="material-symbols-outlined text-[20px] leading-none">calendar_clock</span>
      </div>
    </div>
  );
}

export function PaymentRequestDetailedInfo({
  data,
  isEditing = false,
  isSaving = false,
  disabled = false,
  billNoError = null,
  accountCodeError = null,
  onPatchChange,
  onEdit,
  onCancel,
  onSave,
  className = "",
  accountOptions: accountOptionsProp,
  entityBillContacts = [],
  onRefetchEntityBillContacts,
}: PaymentRequestDetailedInfoProps) {
  const {
    billNo,
    amount,
    currencyCode,
    description,
    contact,
    xero_contact_id,
    accountCode,
    invoiceDate,
    dueDate,
  } = data;

  const patch = onPatchChange ?? (() => {});

  const uid = useId();
  const invoiceDateRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  const idBillNo = `detail-bill-no-${uid}`;
  const idAmount = `detail-amount-${uid}`;
  const idCurrency = `detail-currency-${uid}`;
  const idDescription = `detail-desc-${uid}`;
  const idContact = `detail-contact-${uid}`;
  const idAccount = `detail-account-${uid}`;
  const idInvoiceDate = `detail-inv-date-${uid}`;
  const idDueDate = `detail-due-date-${uid}`;
  const idBillNoError = `detail-bill-no-err-${uid}`;
  const idAccountError = `detail-account-err-${uid}`;

  const fallbackAccountOptions: ThemedSelectOption[] = [{ value: "", label: "Select account code" }];
  const accountOptions = mergeSelectOption(accountOptionsProp ?? fallbackAccountOptions, accountCode);
  const currencyOptions = currencyOptionsForEditing(currencyCode);
  const currencyModalValue = isoCodeToModalCurrency(currencyCode);
  const currencyDisplayLabel =
    currencyOptions.find((o) => o.value === currencyModalValue)?.label ??
    currencyLabelForCode(currencyCode);

  return (
    <section className={`rounded-xl border border-gray-200/90 bg-white p-4 sm:p-5 md:p-6 ${className}`}>
      <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <h2 className="min-w-0 text-base font-medium leading-snug text-[#5c5c5c] sm:text-lg">
          Detailed Information
        </h2>
        <div className={headerActionsClass}>
          {isEditing ? (
            <>
              <button type="button" onClick={onCancel} className={cancelButtonClass} disabled={disabled || isSaving}>
                Cancel
              </button>
              <button type="button" onClick={onSave} className={saveButtonClass} disabled={disabled || isSaving}>
                {isSaving ? "Saving…" : "Save Changes"}
              </button>
            </>
          ) : (
            <button type="button" onClick={onEdit} className={editToggleButtonClass} disabled={disabled}>
              Edit
              <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden>
                edit_document
              </span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <FieldLabel htmlFor={idBillNo} editing={isEditing}>
            Bill No.
          </FieldLabel>
          {isEditing ? (
            <>
              <input
                id={idBillNo}
                type="text"
                value={billNo ?? ""}
                onChange={(e) => patch({ billNo: e.target.value })}
                aria-invalid={!!billNoError}
                aria-describedby={billNoError ? idBillNoError : undefined}
                className={
                  billNoError
                    ? "box-border h-11 min-h-[44px] w-full rounded-lg border border-red-500 bg-white px-3 text-base text-black placeholder:text-primary/45 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-200/50 sm:min-h-11 sm:text-sm"
                    : modalTextInputClass
                }
                placeholder="MBIDAN-115803031626"
                disabled={disabled}
              />
              {billNoError ? (
                <p id={idBillNoError} className="mt-1 text-xs text-red-600" role="alert">
                  {billNoError}
                </p>
              ) : null}
            </>
          ) : (
            <ReadOnlyTextBox emphasis="semibold">{billNo}</ReadOnlyTextBox>
          )}
        </div>

        <div>
          <FieldLabel htmlFor={idAmount} editing={isEditing}>
            Amount<span className="text-red-500"> *</span>
          </FieldLabel>
          {isEditing ? (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:gap-0">
              <ThemedSelect
                id={idCurrency}
                ariaLabel="Currency"
                value={currencyModalValue ?? ""}
                onChange={(v) => patch({ currencyCode: modalCurrencyToIsoCode(v) })}
                options={currencyOptions}
                className="w-full shrink-0 sm:w-24"
                fullWidth
                uniformFill
                triggerClassName="w-full px-2 sm:rounded-l-lg sm:rounded-r-none sm:border-r-0 sm:px-3"
                disabled={disabled}
              />
              <input
                id={idAmount}
                type="text"
                inputMode="decimal"
                value={amount ?? ""}
                onChange={(e) => patch({ amount: e.target.value })}
                className={amountValueInputClass}
                disabled={disabled}
              />
            </div>
          ) : (
            <ReadOnlyAmountRow currencyDisplayLabel={currencyDisplayLabel} amount={amount} />
          )}
        </div>

        <div>
          <FieldLabel htmlFor={idDescription} editing={isEditing}>
            Description (Optional)
          </FieldLabel>
          {isEditing ? (
            <input
              id={idDescription}
              type="text"
              value={description ?? ""}
              onChange={(e) => patch({ description: e.target.value })}
              placeholder="e.g. Office supplies"
              className={modalTextInputClass}
              disabled={disabled}
            />
          ) : (
            <ReadOnlyTextBox>{description}</ReadOnlyTextBox>
          )}
        </div>

        <div>
          <FieldLabel htmlFor={idContact} editing={isEditing}>
            Contact<span className="text-red-500"> *</span>
          </FieldLabel>
          {isEditing ? (
            <BillContactPicker
              id={idContact}
              contacts={entityBillContacts}
              xeroContactId={xero_contact_id}
              contactName={contact}
              onChange={(next) =>
                patch({ contact: next.contact, xero_contact_id: next.xero_contact_id })
              }
              refetchContacts={onRefetchEntityBillContacts ?? (async () => {})}
              disabled={disabled}
            />
          ) : (
            <ReadOnlySelectShell value={contact} />
          )}
        </div>

        <div>
          <FieldLabel htmlFor={idAccount} editing={isEditing}>
            Account Code<span className="text-red-500"> *</span>
          </FieldLabel>
          {isEditing ? (
            <>
              <ThemedSelect
                id={idAccount}
                value={accountCode ?? ""}
                onChange={(v) => patch({ accountCode: v })}
                options={accountOptions}
                disabled={disabled}
                error={!!accountCodeError}
              />
              {accountCodeError ? (
                <p id={idAccountError} className="mt-1 text-xs text-red-600" role="alert">
                  {accountCodeError}
                </p>
              ) : null}
            </>
          ) : (
            <ReadOnlySelectShell value={accountCode} />
          )}
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
          <div>
            <FieldLabel htmlFor={idInvoiceDate} editing={isEditing}>
              Invoice Date<span className="text-red-500"> *</span>
            </FieldLabel>
            {isEditing ? (
              <div className="relative">
                <input
                  ref={invoiceDateRef}
                  id={idInvoiceDate}
                  type="date"
                  value={invoiceDate ?? ""}
                  onChange={(e) => patch({ invoiceDate: e.target.value })}
                  onClick={(e) => openDatePicker(e.currentTarget)}
                  className="pr-date-input box-border h-11 min-h-[44px] w-full rounded-lg border border-[#EDEDED] bg-white py-0 pl-3 pr-11 text-base text-black focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 [color-scheme:light] sm:min-h-11 sm:text-sm"
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => openDatePicker(invoiceDateRef.current)}
                  className="absolute right-0 top-0 flex h-11 min-h-[44px] w-11 min-w-[44px] cursor-pointer items-center justify-center rounded-r-lg border-l border-[#EDEDED] bg-[#EDEDED] text-primary transition-colors hover:bg-[#E4E4E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-11"
                  aria-label="Open calendar for invoice date"
                  disabled={disabled}
                >
                  <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
                    calendar_clock
                  </span>
                </button>
              </div>
            ) : (
              <ReadOnlyDateRow display={formatLongDate(invoiceDate)} />
            )}
          </div>
          <div>
            <FieldLabel htmlFor={idDueDate} editing={isEditing}>
              Due Date<span className="text-red-500"> *</span>
            </FieldLabel>
            {isEditing ? (
              <div className="relative">
                <input
                  ref={dueDateRef}
                  id={idDueDate}
                  type="date"
                  value={dueDate ?? ""}
                  onChange={(e) => patch({ dueDate: e.target.value })}
                  onClick={(e) => openDatePicker(e.currentTarget)}
                  className="pr-date-input box-border h-11 min-h-[44px] w-full rounded-lg border border-[#EDEDED] bg-white py-0 pl-3 pr-11 text-base text-black focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 [color-scheme:light] sm:min-h-11 sm:text-sm"
                  disabled={disabled}
                />
                <button
                  type="button"
                  onClick={() => openDatePicker(dueDateRef.current)}
                  className="absolute right-0 top-0 flex h-11 min-h-[44px] w-11 min-w-[44px] cursor-pointer items-center justify-center rounded-r-lg border-l border-[#EDEDED] bg-[#EDEDED] text-primary transition-colors hover:bg-[#E4E4E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-11"
                  aria-label="Open calendar for due date"
                  disabled={disabled}
                >
                  <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
                    calendar_clock
                  </span>
                </button>
              </div>
            ) : (
              <ReadOnlyDateRow display={formatLongDate(dueDate)} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
