"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { pushAppScrollLock } from "@/lib/appScrollRoot";
import {
  fetchPayments,
  fetchBill,
  createPayment,
  updatePayment,
  deletePayment,
  updateBill,
  type PaymentItem,
} from "@/lib/api";
import { billStatusShouldRollbackWhenNoPayments } from "@/lib/billStatusRollback";
import { DateTextField } from "@/components/DateTextField";
import { useUserRole } from "@/lib/useUserRole";
import { PaymentDeleteConfirmModal } from "./PaymentDeleteConfirmModal";
import { BankSlipDetailsModal, type BankSlipDetails } from "./BankSlipDetailsModal";
import { buildBankSlipDetailsFromPaymentList } from "@/lib/bankSlipEnrichment";
import { currencyLabelForCode } from "@/lib/currencyDisplay";
import { shouldShowPaymentInHistory } from "@/lib/paymentHistoryDisplay";
import { formatIsoDateForDisplay } from "@/lib/dateDisplayFormat";

export type RecordPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  billId: string;
  billStatus?: string | null;
  invoiceAmount?: number;
  currencyCode?: string;
  contactTitle?: string;
  onPaymentSaved?: () => void;
  readOnly?: boolean;
};

type PayMode = "full" | "partial";

function formatMoney(amount: number, currencyLabel: string) {
  const n = Math.round(amount * 100) / 100;
  return `${currencyLabel} ${n.toLocaleString("en-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPaymentDateLabel(dateStr: string | null) {
  if (!dateStr) return "—";
  const head = dateStr.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) {
    return formatIsoDateForDisplay(head) || dateStr;
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return formatIsoDateForDisplay(`${y}-${m}-${day}`) || dateStr;
}

function parseAmount(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_BANK_SLIP_DETAILS: BankSlipDetails = {
  createdBy: "—",
  createdAt: "—",
  toName: "",
  amount: "—",
  fromName: "—",
  when: "—",
  files: [],
};

const MIN_BANK_SLIP_ROW = {
  contactTitle: "",
  submittedDate: "",
  invoiceDate: "",
  paidDate: "",
  unpaidAmount: "",
};

function isDraftBillStatus(status: string | null | undefined): boolean {
  const n = (status ?? "").trim().toLowerCase().replace(/-/g, "_");
  return n === "draft";
}

export function RecordPaymentModal({
  open,
  onClose,
  billId,
  billStatus,
  invoiceAmount = 0,
  currencyCode = "HKD",
  contactTitle,
  onPaymentSaved,
  readOnly = false,
}: RecordPaymentModalProps) {
  const iso = (currencyCode || "HKD").trim() || "HKD";
  const currencyLabel = currencyLabelForCode(iso);
  const { isElevated: canDeletePayments } = useUserRole();
  const titleId = useId();
  const dateFieldId = useId();
  const amountFieldId = useId();

  const [payMode, setPayMode] = useState<PayMode>("partial");
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [draftDate, setDraftDate] = useState(todayISO);
  const [draftAmount, setDraftAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [finalizingPending, setFinalizingPending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [paymentPendingDelete, setPaymentPendingDelete] = useState<PaymentItem | null>(null);
  const [bankSlipPreviewOpen, setBankSlipPreviewOpen] = useState(false);
  const [bankSlipFileCount, setBankSlipFileCount] = useState(0);
  const [bankSlipDetails, setBankSlipDetails] = useState<BankSlipDetails>(EMPTY_BANK_SLIP_DETAILS);

  const bankSlipRowForEnrichment = useMemo(
    () => ({ ...MIN_BANK_SLIP_ROW, contactTitle: (contactTitle ?? "").trim() }),
    [contactTitle],
  );

  const bankSlipDetailsForModal = useMemo((): BankSlipDetails => {
    const hint = (contactTitle ?? "").trim();
    if (!hint || bankSlipDetails.toName.trim()) return bankSlipDetails;
    return { ...bankSlipDetails, toName: hint };
  }, [bankSlipDetails, contactTitle]);

  const paymentsForBill = useMemo(
    () => payments.filter((p) => p.bill_id === billId),
    [payments, billId],
  );

  const paymentsForHistoryList = useMemo(
    () => paymentsForBill.filter(shouldShowPaymentInHistory),
    [paymentsForBill],
  );

  const totalPaid = useMemo(
    () => paymentsForBill.reduce((s, p) => s + parseFloat(p.amount || "0"), 0),
    [paymentsForBill],
  );
  const remaining = Math.max(0, Math.round((invoiceAmount - totalPaid) * 100) / 100);

  const pendingPayments = useMemo(
    () => paymentsForBill.filter((p) => p.payment_status === "pending"),
    [paymentsForBill],
  );

  const draftBill = isDraftBillStatus(billStatus);
  /** Non-draft bills need at least one bank slip file before pending rows can be finalized (edit mode). */
  const bankSlipRequiredForPending =
    !readOnly && !draftBill && pendingPayments.length > 0 && bankSlipFileCount < 1;

  const pendingIdsKey = useMemo(
    () =>
      pendingPayments
        .map((p) => p.id)
        .sort()
        .join(","),
    [pendingPayments],
  );

  const syncSubmittedIfNoPaymentsLeft = useCallback(
    async (paymentsList: PaymentItem[]): Promise<boolean> => {
      if (!billId) return false;
      const hasAny = paymentsList.some((x) => x.bill_id === billId);
      if (hasAny) return false;
      const b = await fetchBill(billId);
      if (!billStatusShouldRollbackWhenNoPayments(b.status ?? "")) return false;
      await updateBill(billId, { status: "submitted" });
      return true;
    },
    [billId],
  );

  const loadPayments = useCallback(async () => {
    if (!billId) return;
    setLoadingPayments(true);
    try {
      const data = await fetchPayments(billId);
      setPayments(data.payments);
      try {
        const built = await buildBankSlipDetailsFromPaymentList(billId, data.payments, bankSlipRowForEnrichment);
        setBankSlipFileCount(built.count);
        setBankSlipDetails(built.bankSlipDetails ?? EMPTY_BANK_SLIP_DETAILS);
      } catch {
        setBankSlipFileCount(0);
        setBankSlipDetails(EMPTY_BANK_SLIP_DETAILS);
      }
      const rolled = await syncSubmittedIfNoPaymentsLeft(data.payments);
      if (rolled) onPaymentSaved?.();
    } catch {
      setPayments([]);
      setBankSlipFileCount(0);
      setBankSlipDetails(EMPTY_BANK_SLIP_DETAILS);
    } finally {
      setLoadingPayments(false);
    }
  }, [billId, bankSlipRowForEnrichment, syncSubmittedIfNoPaymentsLeft, onPaymentSaved]);

  useEffect(() => {
    if (open && billId) {
      loadPayments();
      setPayMode("partial");
      setDraftDate(todayISO());
      setDraftAmount("");
      setFormError(null);
    }
    if (!open) {
      setPayments([]);
      setPaymentPendingDelete(null);
      setBankSlipPreviewOpen(false);
      setBankSlipFileCount(0);
      setBankSlipDetails(EMPTY_BANK_SLIP_DETAILS);
    }
  }, [open, billId, loadPayments]);

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
    if (!open || payMode !== "full") return;
    setDraftAmount(remaining > 0 ? remaining.toFixed(2) : "");
  }, [open, payMode, remaining]);

  useEffect(() => {
    if (!open || readOnly || !billId || !pendingIdsKey || bankSlipRequiredForPending) return;

    let cancelled = false;
    (async () => {
      setFinalizingPending(true);
      setFormError(null);
      try {
        const ids = new Set(pendingIdsKey.split(",").filter(Boolean));
        const data = await fetchPayments(billId);
        if (cancelled) return;
        const toComplete = data.payments.filter(
          (p) =>
            p.bill_id === billId &&
            p.payment_status === "pending" &&
            ids.has(p.id),
        );
        if (toComplete.length === 0) return;
        await Promise.all(
          toComplete.map((p) => updatePayment(p.bill_id, p.id, { payment_status: "completed" })),
        );
        if (cancelled) return;
        await loadPayments();
        onPaymentSaved?.();
      } catch (err) {
        if (!cancelled) {
          setFormError(err instanceof Error ? err.message : "Failed to update payments.");
        }
      } finally {
        if (!cancelled) setFinalizingPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, readOnly, billId, pendingIdsKey, bankSlipRequiredForPending, loadPayments, onPaymentSaved]);

  const handleAddPayment = async () => {
    setFormError(null);
    const amount = payMode === "full" ? remaining : parseAmount(draftAmount);
    if (amount === null || amount <= 0) {
      setFormError("Enter a valid amount.");
      return;
    }
    if (amount > remaining + 1e-9) {
      setFormError(`Amount cannot exceed ${formatMoney(remaining, currencyLabel)}.`);
      return;
    }
    if (!draftDate.trim()) {
      setFormError("Payment date is required.");
      return;
    }

    setAdding(true);
    try {
      await createPayment(billId, {
        payment_date: draftDate,
        amount,
        currency_code: iso,
        payment_status: "completed",
      });
      await loadPayments();
      onPaymentSaved?.();
      if (payMode === "partial") setDraftAmount("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add payment.");
    } finally {
      setAdding(false);
    }
  };

  const deleteConfirmSummary = useMemo(() => {
    const p = paymentPendingDelete;
    if (!p) return "";
    const amt = parseFloat(p.amount || "0");
    const isPending = p.payment_status === "pending";
    const isPartialPayment = amt > 0 && amt + 1e-9 < invoiceAmount;
    const dateBit = formatPaymentDateLabel(p.payment_date);
    const kind = isPending
      ? `Pending on ${dateBit}`
      : isPartialPayment
        ? `Partial pay on ${dateBit}`
        : `Paid on ${dateBit}`;
    return `${kind} · ${formatMoney(amt, currencyLabel)}`;
  }, [paymentPendingDelete, invoiceAmount, currencyLabel]);

  const handleDeletePayment = async (p: PaymentItem) => {
    setDeletingId(p.id);
    try {
      await deletePayment(p.bill_id, p.id);
      const data = await fetchPayments(billId);
      setPayments(data.payments);
      await syncSubmittedIfNoPaymentsLeft(data.payments);

      onPaymentSaved?.();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to delete payment.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  const paymentDateTextClass =
    "relative z-[1] box-border h-11 min-h-[44px] w-full rounded-lg border border-[#EDEDED] bg-white py-0 pl-3 pr-11 text-base text-black placeholder:text-primary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 [color-scheme:light] sm:min-h-11 sm:text-sm";
  const paymentDateCalendarBtnClass =
    "absolute right-0 top-0 z-[3] flex h-11 min-h-[44px] w-11 min-w-[44px] cursor-pointer items-center justify-center rounded-r-lg border-l border-[#EDEDED] bg-[#EDEDED] text-primary transition-colors hover:bg-[#E4E4E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-11";

  return (
    <>
      {createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-x-hidden overscroll-x-none p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-4 md:p-6" role="presentation">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 cursor-pointer bg-black/35 backdrop-blur-[1px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative z-[1] flex max-h-[min(100dvh-1rem,880px)] w-full min-w-0 max-w-[480px] flex-col rounded-2xl bg-white shadow-xl ring-1 ring-black/5 sm:max-h-[min(92dvh,880px)] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0">
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-sm font-semibold uppercase tracking-[0.12em] text-secondary sm:text-base">
                {readOnly ? "View payments" : "Payment history"}
              </h2>
              <button type="button" onClick={onClose} className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-primary transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary" aria-label="Close">
                <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>close</span>
              </button>
            </div>
          </div>
          <div className="mt-3 w-full border-b border-dotted border-gray-300" aria-hidden />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-primary">INVOICE AMOUNT</p>
              <p className="mt-1 text-xl font-bold text-primary sm:text-2xl">{formatMoney(invoiceAmount, currencyLabel)}</p>
            </div>
            <button
              type="button"
              onClick={() => setBankSlipPreviewOpen(true)}
              className="relative -mr-1 -mt-0.5 box-border flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-primary/25 text-primary transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              aria-label={
                bankSlipFileCount > 0
                  ? `Payment attachments — ${bankSlipFileCount} file${bankSlipFileCount === 1 ? "" : "s"}; open to view or add bank slips`
                  : "Payment attachments — open to view or add bank slips"
              }
            >
              <span className="material-symbols-outlined text-[24px] leading-none" aria-hidden>
                attach_file
              </span>
              {bankSlipFileCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-secondary px-1 text-[10px] font-bold leading-none text-white">
                  {bankSlipFileCount > 99 ? "99+" : bankSlipFileCount}
                </span>
              ) : null}
            </button>
          </div>

          {!readOnly ? (
            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => { setFormError(null); setPayMode("full"); }} className={`flex-1 cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${payMode === "full" ? "bg-secondary text-white shadow-sm" : "border border-secondary/40 bg-white text-secondary hover:bg-secondary/5"}`}>Full Pay</button>
              <button type="button" onClick={() => { setFormError(null); setPayMode("partial"); setDraftAmount(""); }} className={`flex-1 cursor-pointer rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${payMode === "partial" ? "bg-secondary text-white shadow-sm" : "border border-secondary/40 bg-white text-secondary hover:bg-secondary/5"}`}>Partial Pay</button>
            </div>
          ) : null}

          <div className={`relative flex items-center gap-3 ${readOnly ? "mt-2" : "my-6"}`}>
            <div className="h-px flex-1 bg-gray-200" aria-hidden />
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-primary/50">Less : payments</span>
            <div className="h-px flex-1 bg-gray-200" aria-hidden />
          </div>

          {loadingPayments ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-primary/60">
              <span className="material-symbols-outlined animate-spin text-secondary text-[20px]">progress_activity</span>
              Loading payments…
            </div>
          ) : paymentsForHistoryList.length === 0 ? (
            <p className="py-4 text-center text-sm text-primary/50">No payments recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {paymentsForHistoryList.map((p) => {
                const amt = parseFloat(p.amount || "0");
                const isPending = p.payment_status === "pending";
                const isPartialPayment = amt > 0 && amt + 1e-9 < invoiceAmount;
                return (
                  <li key={p.id} className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-3 sm:gap-3 sm:px-4">
                    <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isPending ? "bg-amber-100 text-amber-600" : "bg-secondary/15 text-secondary"}`} aria-hidden>
                      <span className="material-symbols-outlined text-[20px]">{isPending ? "schedule" : "history"}</span>
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-primary">
                        {isPending
                          ? `Pending on ${formatPaymentDateLabel(p.payment_date)}`
                          : isPartialPayment
                            ? `Partial Pay on ${formatPaymentDateLabel(p.payment_date)}`
                            : `Paid on ${formatPaymentDateLabel(p.payment_date)}`}
                      </p>
                      {isPending && (
                        <p className="text-[11px] text-amber-600">Pending</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-primary tabular-nums">({formatMoney(amt, currencyLabel)})</span>
                    {!readOnly || canDeletePayments ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!canDeletePayments) return;
                          setPaymentPendingDelete(p);
                        }}
                        disabled={!canDeletePayments || deletingId === p.id}
                        className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${canDeletePayments ? "cursor-pointer text-rose-500 hover:bg-rose-100 hover:text-rose-600" : "cursor-not-allowed text-gray-400"}`}
                        aria-label={
                          canDeletePayments
                            ? "Remove this payment"
                            : "You do not have permission to delete payments."
                        }
                        title={!canDeletePayments ? "You do not have permission to delete payments." : undefined}
                      >
                        <span className="material-symbols-outlined text-[22px]">
                          {deletingId === p.id ? "progress_activity" : "delete"}
                        </span>
                      </button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}

          {!readOnly ? (
            <>
              <div className={`mt-5 grid grid-cols-1 gap-3 sm:gap-3 ${payMode === "partial" ? "sm:grid-cols-2" : ""}`}>
                <div className="relative w-full min-w-0">
                  <label htmlFor={dateFieldId} className="sr-only">
                    Payment date
                  </label>
                  <DateTextField
                    id={dateFieldId}
                    value={draftDate ?? ""}
                    onChange={setDraftDate}
                    calendarAriaLabel="Open calendar for payment date"
                    textInputClassName={paymentDateTextClass}
                    calendarButtonClassName={paymentDateCalendarBtnClass}
                  />
                </div>
                {payMode === "partial" ? (
                  <div className="min-w-0">
                    <label htmlFor={amountFieldId} className="sr-only">Payment amount</label>
                    <input id={amountFieldId} type="text" inputMode="decimal" placeholder="0.0" value={draftAmount ?? ""} onChange={(e) => setDraftAmount(e.target.value)} className="box-border h-11 min-h-[44px] w-full rounded-lg border border-[#EDEDED] bg-white px-3 text-base text-black placeholder:text-primary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 sm:min-h-11 sm:text-sm" />
                  </div>
                ) : null}
              </div>

              {formError ? <p className="mt-2 text-sm text-red-600" role="alert">{formError}</p> : null}

              <div className="mt-4 flex justify-end">
                <button type="button" onClick={handleAddPayment} disabled={remaining <= 0 || adding} className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#00C896]/10 px-4 py-2.5 text-sm font-semibold text-[#00C896] transition-colors hover:bg-[#00C896]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00C896] disabled:cursor-not-allowed disabled:opacity-50">
                  {adding ? "Adding…" : "Add Payment"}
                  <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden>{adding ? "progress_activity" : "add"}</span>
                </button>
              </div>
            </>
          ) : null}
        </div>

        {!readOnly ? (
          <div className="shrink-0 border-t border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col items-end gap-1">
                <span className="text-sm font-medium text-primary">Amount to be Paid</span>
                <span className="text-2xl font-bold text-secondary sm:text-3xl">{formatMoney(remaining, currencyLabel)}</span>
              </div>
              {bankSlipRequiredForPending ? (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
                  Add at least one bank slip attachment to finalize pending payments. Draft bills do not require this.
                </p>
              ) : null}
              {finalizingPending ? (
                <p className="flex items-center justify-center gap-2 text-sm text-primary/70" role="status">
                  <span className="material-symbols-outlined animate-spin text-secondary text-[18px]">progress_activity</span>
                  Updating payments…
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
      )}
      <BankSlipDetailsModal
        open={bankSlipPreviewOpen}
        onClose={() => setBankSlipPreviewOpen(false)}
        details={bankSlipDetailsForModal}
        allowRemoveFiles={false}
        inlineUploadBillContext={{ billId, currencyCode: iso }}
        onInlineUploadSuccess={async () => {
          await loadPayments();
          onPaymentSaved?.();
        }}
      />
      <PaymentDeleteConfirmModal
        open={paymentPendingDelete != null}
        summary={deleteConfirmSummary}
        pending={paymentPendingDelete != null && deletingId === paymentPendingDelete.id}
        onClose={() => {
          if (deletingId) return;
          setPaymentPendingDelete(null);
        }}
        onConfirm={async () => {
          const p = paymentPendingDelete;
          if (!p) return;
          await handleDeletePayment(p);
          setPaymentPendingDelete(null);
        }}
      />
    </>
  );
}
