"use client";

import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { pushAppScrollLock } from "@/lib/appScrollRoot";
import { saveAttachmentBlobs } from "@/lib/paymentRequestAttachmentStore";
import { ThemedSelect } from "@/components/ThemedSelect";

import { saveBillDraft, submitBill, uploadBillAttachment } from "@/lib/api";
import {
  BILL_ACCOUNT_SELECT_OPTIONS,
  BILL_CONTACT_SELECT_OPTIONS,
  BILL_CURRENCY_SELECT_OPTIONS,
  modalCurrencyToIsoCode,
} from "@/lib/billFormSelectOptions";

export type PaymentRequestModalProps = {
  open: boolean;
  onClose: () => void;
  onSaveDraft?: () => void;
  onCancel?: () => void;
  onConfirm?: () => void;
};

type UploadedEntry = { id: string; file: File };

/** Material Symbols icon + color for uploaded file row (Google Material Icons naming). */
function getUploadedFileIconInfo(filename: string): { icon: string; iconClass: string } {
  const ext = filename.trim().split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") {
    return { icon: "picture_as_pdf", iconClass: "text-red-600" };
  }
  if (ext === "jpg" || ext === "jpeg" || ext === "png") {
    return { icon: "image", iconClass: "text-sky-600" };
  }
  if (ext === "xls" || ext === "xlsx" || ext === "xlsm") {
    return { icon: "table_chart", iconClass: "text-emerald-700" };
  }
  return { icon: "draft", iconClass: "text-primary" };
}

type ValidatedField = "amount" | "contact" | "accountCode" | "invoiceDate" | "dueDate" | "attachments";

function parseAmountValue(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function validatePaymentRequestForm(values: {
  amount: string;
  contact: string;
  accountCode: string;
  invoiceDate: string;
  dueDate: string;
  attachmentCount: number;
}): Partial<Record<ValidatedField, string>> {
  const e: Partial<Record<ValidatedField, string>> = {};
  const n = parseAmountValue(values.amount);
  if (n === null) {
    e.amount = "Amount is required.";
  } else if (n <= 0) {
    e.amount = "Enter an amount greater than zero.";
  }
  if (!values.contact.trim()) {
    e.contact = "Contact is required.";
  }
  if (!values.accountCode.trim()) {
    e.accountCode = "Account code is required.";
  }
  if (!values.invoiceDate.trim()) {
    e.invoiceDate = "Invoice date is required.";
  }
  if (!values.dueDate.trim()) {
    e.dueDate = "Due date is required.";
  }
  if (values.attachmentCount < 1) {
    e.attachments = "At least one attachment is required.";
  }
  return e;
}

function FieldLabel({
  htmlFor,
  children,
  required,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-primary sm:text-xs"
    >
      {children}
      {required ? <span className="text-red-500"> *</span> : null}
    </label>
  );
}

export function PaymentRequestModal({
  open,
  onClose,
  onSaveDraft,
  onCancel,
  onConfirm,
}: PaymentRequestModalProps) {
  const router = useRouter();
  const titleId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const invoiceDateRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);

  const openDatePicker = (input: HTMLInputElement | null) => {
    if (!input) return;
    if (typeof input.showPicker === "function") {
      try {
        input.showPicker();
        return;
      } catch {
        /* showPicker can throw outside a user gesture in some browsers */
      }
    }
    input.focus();
  };

  const [uploadedFiles, setUploadedFiles] = useState<UploadedEntry[]>([]);
  const [billNo, setBillNo] = useState("MBIDAN-115803031626");
  const [currency, setCurrency] = useState("HK$");
  const [amount, setAmount] = useState("1,500.00");
  const [description, setDescription] = useState("");
  const [contact, setContact] = useState("Young Bros Transport");
  const [accountCode, setAccountCode] = useState("425 - Transport");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<ValidatedField, string>>>({});
  const [confirmSubmitting, setConfirmSubmitting] = useState(false);
  const [draftSubmitting, setDraftSubmitting] = useState(false);

  const clearFieldError = (key: ValidatedField) => {
    setFieldErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  useEffect(() => {
    if (!open) return;
    return pushAppScrollLock();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    setInvoiceDate("");
    setDueDate("");
  }, [open]);

  useEffect(() => {
    if (!open) {
      setConfirmSubmitting(false);
      setDraftSubmitting(false);
    }
  }, [open]);

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files;
    if (!list?.length) return;
    const added: UploadedEntry[] = Array.from(list).map((file) => ({
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${file.name}-${file.size}-${file.lastModified}-${Math.random()}`,
      file,
    }));
    setUploadedFiles((prev) => [...prev, ...added]);
    clearFieldError("attachments");
    e.target.value = "";
  };

  const removeFile = (entryId: string) => {
    setUploadedFiles((prev) => prev.filter((x) => x.id !== entryId));
  };

  const handleSaveDraft = async () => {
    if (draftSubmitting) return;
    setDraftSubmitting(true);
    setFieldErrors({});
    try {
      const parsedAmount = parseAmountValue(amount);
      const acctCode = accountCode.split(" - ")[0]?.trim() ?? "";

      const bill = await saveBillDraft({
        contact: contact || undefined,
        description: description || undefined,
        amount: parsedAmount ?? undefined,
        currency_code: modalCurrencyToIsoCode(currency) || undefined,
        invoice_date: invoiceDate || undefined,
        due_date: dueDate || undefined,
        reference: billNo || undefined,
        line_items: acctCode || description || (parsedAmount && parsedAmount > 0)
          ? [
              {
                description: description || undefined,
                quantity: 1,
                unit_amount: parsedAmount ?? undefined,
                line_amount: parsedAmount ?? undefined,
                account_code: acctCode || undefined,
              },
            ]
          : undefined,
      });

      for (const entry of uploadedFiles) {
        try {
          await uploadBillAttachment(bill.id, entry.file);
        } catch (e) {
          console.error("Failed to upload attachment:", e);
        }
      }

      try {
        await saveAttachmentBlobs(
          bill.id,
          uploadedFiles.map((x) => x.file),
        );
      } catch (e) {
        console.error("Could not store attachments for preview:", e);
      }

      onSaveDraft?.();
      onClose();
    } catch (err) {
      console.error("Failed to save draft:", err);
      setFieldErrors({
        amount: err instanceof Error ? err.message : "Failed to save draft. Please try again.",
      });
    } finally {
      setDraftSubmitting(false);
    }
  };

  const handleCancel = () => {
    onCancel?.();
    onClose();
  };

  const handleConfirm = async () => {
    const next = validatePaymentRequestForm({
      amount,
      contact,
      accountCode,
      invoiceDate,
      dueDate,
      attachmentCount: uploadedFiles.length,
    });
    if (Object.keys(next).length > 0) {
      setFieldErrors(next);
      return;
    }
    setFieldErrors({});
    if (confirmSubmitting) return;
    setConfirmSubmitting(true);
    try {
      const parsedAmount = parseAmountValue(amount) ?? 0;
      const acctCode = accountCode.split(" - ")[0]?.trim() ?? "";

      const bill = await submitBill({
        contact,
        description,
        amount: parsedAmount,
        currency_code: modalCurrencyToIsoCode(currency),
        invoice_date: invoiceDate || null,
        due_date: dueDate || null,
        reference: billNo,
        line_items: [
          {
            description,
            quantity: 1,
            unit_amount: parsedAmount,
            line_amount: parsedAmount,
            account_code: acctCode,
          },
        ],
      });

      for (const entry of uploadedFiles) {
        try {
          await uploadBillAttachment(bill.id, entry.file);
        } catch (e) {
          console.error("Failed to upload attachment:", e);
        }
      }

      try {
        await saveAttachmentBlobs(
          bill.id,
          uploadedFiles.map((x) => x.file),
        );
      } catch (e) {
        console.error("Could not store attachments for preview:", e);
      }

      onConfirm?.();
      onClose();
      router.push(`/payment-request/${encodeURIComponent(bill.id)}`);
    } catch (err) {
      console.error("Failed to create bill:", err);
      setFieldErrors({
        amount: err instanceof Error ? err.message : "Failed to create bill. Please try again.",
      });
    } finally {
      setConfirmSubmitting(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-x-hidden overscroll-x-none p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-4 md:p-6"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-black/35 backdrop-blur-[1px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[1] flex max-h-[min(100dvh-1rem,880px)] w-full min-w-0 max-w-[640px] flex-col rounded-xl bg-white shadow-xl ring-1 ring-black/5 sm:max-h-[min(92dvh,880px)] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 pb-3 pt-4 sm:gap-4 sm:px-6 sm:pb-4 sm:pt-6">
          <h2 id={titleId} className="min-w-0 pr-2 text-lg font-bold leading-snug text-black sm:text-xl md:text-2xl">
            Add Payment Request
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>
              close
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6 sm:py-6">
          {/* Full-area file input overlay: avoids sr-only / display:none issues with native pickers on some browsers */}
          <div className="relative mb-3">
            <input
              ref={fileInputRef}
              type="file"
              className="absolute inset-0 z-20 h-full min-h-[88px] w-full cursor-pointer opacity-0 sm:min-h-[104px]"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.xlsm,application/pdf,image/jpeg,image/png,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFilesSelected}
              aria-label="Choose files to upload"
            />
            <div className="pointer-events-none">
              <div className="flex min-h-[88px] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[#EDEDED] bg-white px-3 py-3 sm:min-h-[104px] sm:py-4">
                <span className="material-symbols-outlined text-2xl leading-none text-secondary sm:text-3xl" aria-hidden>
                  library_add
                </span>
                <span className="text-center text-xs font-medium text-secondary sm:text-sm">Add from Library</span>
              </div>
            </div>
          </div>

          <p className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-wide text-primary/80">
            Uploaded files ({uploadedFiles.length})
          </p>
          <ul className="flex flex-col gap-2">
            {uploadedFiles.map(({ id, file }) => {
              const { icon, iconClass } = getUploadedFileIconInfo(file.name);
              return (
              <li
                key={id}
                className="relative flex items-center justify-start rounded-lg border border-[#EDEDED] bg-white px-3 py-2.5 pr-11 sm:gap-2 sm:pr-3"
              >
                <div className="flex min-w-0 items-center justify-start gap-2">
                  <span
                    className={`material-symbols-outlined shrink-0 text-[22px] leading-none sm:text-[26px] ${iconClass}`}
                    aria-hidden
                  >
                    {icon}
                  </span>
                  <span className="min-w-0 break-words text-left text-sm leading-snug text-black sm:flex-1 sm:truncate sm:leading-normal">
                    {file.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(id)}
                  className="absolute right-2 top-1/2 flex h-8 w-8 shrink-0 -translate-y-1/2 items-center justify-center rounded-md text-primary/60 transition-colors hover:bg-gray-100 hover:text-primary sm:static sm:translate-y-0"
                  aria-label={`Remove ${file.name}`}
                >
                  <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
                    close
                  </span>
                </button>
              </li>
            );
            })}
          </ul>
          {fieldErrors.attachments ? (
            <p className="mt-2 text-xs text-red-600" role="alert">
              {fieldErrors.attachments}
            </p>
          ) : null}

          <div className="mt-6 flex flex-col gap-5">
            <div>
              <FieldLabel htmlFor="pr-bill-no">Bill No.</FieldLabel>
              <input
                id="pr-bill-no"
                type="text"
                value={billNo ?? ""}
                onChange={(e) => setBillNo(e.target.value)}
                className="box-border h-11 min-h-[44px] w-full rounded-lg border border-[#EDEDED] bg-white px-3 text-base text-black placeholder:text-primary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 sm:min-h-11 sm:text-sm"
                placeholder="MBIDAN-115803031626"
              />
            </div>

            <div>
              <FieldLabel htmlFor="pr-amount" required>
                Amount
              </FieldLabel>
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:gap-0">
                <ThemedSelect
                  id="pr-currency"
                  ariaLabel="Currency"
                  value={currency ?? ""}
                  onChange={setCurrency}
                  options={BILL_CURRENCY_SELECT_OPTIONS}
                  className="w-full shrink-0 sm:w-24"
                  fullWidth
                  uniformFill
                  triggerClassName="w-full px-2 sm:rounded-l-lg sm:rounded-r-none sm:border-r-0 sm:px-3"
                />
                <input
                  id="pr-amount"
                  type="text"
                  inputMode="decimal"
                  value={amount ?? ""}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    clearFieldError("amount");
                  }}
                  aria-invalid={!!fieldErrors.amount}
                  className={
                    "box-border h-11 min-h-[44px] min-w-0 w-full rounded-lg border bg-white px-3 text-base text-black focus:outline-none focus:ring-2 sm:min-h-11 sm:flex-1 sm:rounded-l-none sm:rounded-r-lg sm:border-l-0 sm:text-sm " +
                    (fieldErrors.amount
                      ? "border-red-500 focus:border-red-500 focus:ring-red-200/50"
                      : "border-[#EDEDED] focus:border-secondary focus:ring-secondary/25")
                  }
                />
              </div>
              {fieldErrors.amount ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {fieldErrors.amount}
                </p>
              ) : null}
            </div>

            <div>
              <FieldLabel htmlFor="pr-description">Description (Optional)</FieldLabel>
              <input
                id="pr-description"
                type="text"
                value={description ?? ""}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Lorem ipsum Dolor"
                className="box-border h-11 min-h-[44px] w-full rounded-lg border border-[#EDEDED] bg-white px-3 text-base text-black placeholder:text-primary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 sm:min-h-11 sm:text-sm"
              />
            </div>

            <div>
              <FieldLabel htmlFor="pr-contact" required>
                Contact
              </FieldLabel>
              <ThemedSelect
                id="pr-contact"
                value={contact ?? ""}
                onChange={(v) => {
                  setContact(v);
                  clearFieldError("contact");
                }}
                options={BILL_CONTACT_SELECT_OPTIONS}
                error={!!fieldErrors.contact}
              />
              {fieldErrors.contact ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {fieldErrors.contact}
                </p>
              ) : null}
            </div>

            <div>
              <FieldLabel htmlFor="pr-account" required>
                Account Code
              </FieldLabel>
              <ThemedSelect
                id="pr-account"
                value={accountCode ?? ""}
                onChange={(v) => {
                  setAccountCode(v);
                  clearFieldError("accountCode");
                }}
                options={BILL_ACCOUNT_SELECT_OPTIONS}
                error={!!fieldErrors.accountCode}
              />
              {fieldErrors.accountCode ? (
                <p className="mt-1 text-xs text-red-600" role="alert">
                  {fieldErrors.accountCode}
                </p>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-4">
              <div>
                <FieldLabel htmlFor="pr-invoice-date" required>
                  Invoice Date
                </FieldLabel>
                <div className="relative">
                  <input
                    ref={invoiceDateRef}
                    id="pr-invoice-date"
                    type="date"
                    value={invoiceDate ?? ""}
                    onChange={(e) => {
                      setInvoiceDate(e.target.value);
                      clearFieldError("invoiceDate");
                    }}
                    aria-invalid={!!fieldErrors.invoiceDate}
                    className={
                      "pr-date-input relative z-[1] box-border h-11 min-h-[44px] w-full rounded-lg border bg-white py-0 pl-3 pr-11 text-base focus:outline-none focus:ring-2 [color-scheme:light] sm:min-h-11 sm:text-sm " +
                      (invoiceDate ? "text-black " : "text-transparent ") +
                      (fieldErrors.invoiceDate
                        ? "border-red-500 focus:border-red-500 focus:ring-red-200/50"
                        : "border-[#EDEDED] focus:border-secondary focus:ring-secondary/25")
                    }
                  />
                  {!invoiceDate ? (
                    <span
                      className="pointer-events-none absolute left-3 top-1/2 z-[2] -translate-y-1/2 text-sm text-primary/45"
                      aria-hidden
                    >
                      mm/dd/yyyy
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openDatePicker(invoiceDateRef.current)}
                    className="absolute right-0 top-0 z-[3] flex h-11 min-h-[44px] w-11 min-w-[44px] cursor-pointer items-center justify-center rounded-r-lg border-l border-[#EDEDED] bg-[#EDEDED] text-primary transition-colors hover:bg-[#E4E4E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-11"
                    aria-label="Open calendar for invoice date"
                  >
                    <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
                      calendar_clock
                    </span>
                  </button>
                </div>
                {fieldErrors.invoiceDate ? (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {fieldErrors.invoiceDate}
                  </p>
                ) : null}
              </div>
              <div>
                <FieldLabel htmlFor="pr-due-date" required>
                  Due Date
                </FieldLabel>
                <div className="relative">
                  <input
                    ref={dueDateRef}
                    id="pr-due-date"
                    type="date"
                    value={dueDate ?? ""}
                    onChange={(e) => {
                      setDueDate(e.target.value);
                      clearFieldError("dueDate");
                    }}
                    aria-invalid={!!fieldErrors.dueDate}
                    className={
                      "pr-date-input relative z-[1] box-border h-11 min-h-[44px] w-full rounded-lg border bg-white py-0 pl-3 pr-11 text-base focus:outline-none focus:ring-2 [color-scheme:light] sm:min-h-11 sm:text-sm " +
                      (dueDate ? "text-black " : "text-transparent ") +
                      (fieldErrors.dueDate
                        ? "border-red-500 focus:border-red-500 focus:ring-red-200/50"
                        : "border-[#EDEDED] focus:border-secondary focus:ring-secondary/25")
                    }
                  />
                  {!dueDate ? (
                    <span
                      className="pointer-events-none absolute left-3 top-1/2 z-[2] -translate-y-1/2 text-sm text-primary/45"
                      aria-hidden
                    >
                      mm/dd/yyyy
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openDatePicker(dueDateRef.current)}
                    className="absolute right-0 top-0 z-[3] flex h-11 min-h-[44px] w-11 min-w-[44px] cursor-pointer items-center justify-center rounded-r-lg border-l border-[#EDEDED] bg-[#EDEDED] text-primary transition-colors hover:bg-[#E4E4E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-11"
                    aria-label="Open calendar for due date"
                  >
                    <span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>
                      calendar_clock
                    </span>
                  </button>
                </div>
                {fieldErrors.dueDate ? (
                  <p className="mt-1 text-xs text-red-600" role="alert">
                    {fieldErrors.dueDate}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-gray-100 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-5 sm:pb-5">
          <div className="order-1 flex w-full min-w-0 gap-2 sm:order-2 sm:ml-auto sm:w-auto">
            <button
              type="button"
              onClick={handleCancel}
              className="box-border h-12 min-h-[48px] min-w-0 flex-1 rounded-lg border-2 border-secondary bg-white px-3 text-sm font-semibold text-secondary transition-colors hover:bg-secondary/10 sm:h-11 sm:min-h-[44px] sm:flex-none sm:px-4"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={confirmSubmitting}
              className="box-border h-12 min-h-[48px] min-w-0 flex-1 rounded-lg border border-transparent bg-secondary px-4 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:min-h-[44px] sm:flex-none sm:px-5"
            >
              {confirmSubmitting ? "Confirming…" : "Confirm"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => void handleSaveDraft()}
            disabled={draftSubmitting}
            className="order-2 box-border h-12 min-h-[48px] w-full rounded-lg border border-gray-200 bg-white px-4 text-sm font-semibold text-primary transition-colors hover:bg-gray-50 enabled:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 sm:order-1 sm:h-11 sm:min-h-[44px] sm:w-auto"
          >
            {draftSubmitting ? "Saving…" : "Save as Draft"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
