"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { pushAppScrollLock } from "@/lib/appScrollRoot";
import {
  fetchPayments,
  createPayment,
  updatePayment,
  deletePayment,
  type PaymentItem,
} from "@/lib/api";

export type RecordPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  billId: string;
  invoiceAmount?: number;
  currencyLabel?: string;
  onPaymentSaved?: () => void;
};

type PayMode = "full" | "partial";

function formatMoney(amount: number, currencyLabel: string) {
  const n = Math.round(amount * 100) / 100;
  return `${currencyLabel} ${n.toLocaleString("en-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatShortDayMonth(dateStr: string | null) {
  if (!dateStr) return "—";
  const d = new Date(dateStr + "T12:00:00");
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function parseAmount(raw: string): number | null {
  const t = raw.trim().replace(/,/g, "");
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}

function openDatePicker(input: HTMLInputElement | null) {
  if (!input) return;
  if (typeof input.showPicker === "function") {
    try {
      input.showPicker();
      return;
    } catch {
      /* ignore */
    }
  }
  input.focus();
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function RecordPaymentModal({
  open,
  onClose,
  billId,
  invoiceAmount = 0,
  currencyLabel = "HK$",
  onPaymentSaved,
}: RecordPaymentModalProps) {
  const titleId = useId();
  const dateFieldId = useId();
  const amountFieldId = useId();
  const dateRef = useRef<HTMLInputElement>(null);

  const [payMode, setPayMode] = useState<PayMode>("partial");
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loadingPayments, setLoadingPayments] = useState(false);
  const [draftDate, setDraftDate] = useState(todayISO);
  const [draftAmount, setDraftAmount] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const totalPaid = useMemo(
    () => payments.reduce((s, p) => s + parseFloat(p.amount || "0"), 0),
    [payments],
  );
  const remaining = Math.max(0, Math.round((invoiceAmount - totalPaid) * 100) / 100);

  const pendingPayments = useMemo(
    () => payments.filter((p) => p.payment_status === "pending"),
    [payments],
  );

  const loadPayments = useCallback(async () => {
    if (!billId) return;
    setLoadingPayments(true);
    try {
      const data = await fetchPayments(billId);
      setPayments(data.payments);
    } catch {
      setPayments([]);
    } finally {
      setLoadingPayments(false);
    }
  }, [billId]);

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
        currency_code: currencyLabel,
        payment_status: "pending",
      });
      await loadPayments();
      if (payMode === "partial") setDraftAmount("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to add payment.");
    } finally {
      setAdding(false);
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    setDeletingId(paymentId);
    try {
      await deletePayment(billId, paymentId);
      await loadPayments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to delete payment.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSavePayment = async () => {
    setSaving(true);
    try {
      await Promise.all(
        pendingPayments.map((p) =>
          updatePayment(billId, p.id, { payment_status: "completed" }),
        ),
      );
      onPaymentSaved?.();
      onClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save payments.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const dateInputClass =
    "pr-date-input box-border h-11 min-h-[44px] w-full rounded-lg border border-[#EDEDED] bg-white py-0 pl-3 pr-11 text-base text-black focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 [color-scheme:light] sm:min-h-11 sm:text-sm";
  const calendarBtnClass =
    "absolute right-0 top-0 flex h-11 min-h-[44px] w-11 min-w-[44px] cursor-pointer items-center justify-center rounded-r-lg border-l border-[#EDEDED] bg-[#EDEDED] text-primary transition-colors hover:bg-[#E4E4E4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:min-h-11";

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center overflow-x-hidden overscroll-x-none p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] sm:p-4 md:p-6" role="presentation">
      <button type="button" aria-label="Close dialog" className="absolute inset-0 bg-black/35 backdrop-blur-[1px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="relative z-[1] flex max-h-[min(100dvh-1rem,880px)] w-full min-w-0 max-w-[480px] flex-col rounded-2xl bg-white shadow-xl ring-1 ring-black/5 sm:max-h-[min(92dvh,880px)] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="shrink-0">
          <div className="px-4 pt-4 sm:px-6 sm:pt-6">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="text-sm font-semibold uppercase tracking-[0.12em] text-secondary sm:text-base">Payment history</h2>
              <button type="button" onClick={onClose} className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-primary transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary" aria-label="Close">
                <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>close</span>
              </button>
            </div>
          </div>
          <div className="mt-3 w-full border-b border-dotted border-gray-300" aria-hidden />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
          <p className="text-sm font-medium text-primary">INVOICE AMOUNT</p>
          <p className="mt-1 text-xl font-bold text-primary sm:text-2xl">{formatMoney(invoiceAmount, currencyLabel)}</p>

          <div className="mt-5 flex gap-2">
            <button type="button" onClick={() => { setFormError(null); setPayMode("full"); }} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${payMode === "full" ? "bg-secondary text-white shadow-sm" : "border border-secondary/40 bg-white text-secondary hover:bg-secondary/5"}`}>Full Pay</button>
            <button type="button" onClick={() => { setFormError(null); setPayMode("partial"); setDraftAmount(""); }} className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors sm:py-2 ${payMode === "partial" ? "bg-secondary text-white shadow-sm" : "border border-secondary/40 bg-white text-secondary hover:bg-secondary/5"}`}>Partial Pay</button>
          </div>

          <div className="relative my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-gray-200" aria-hidden />
            <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-primary/50">Less : payments</span>
            <div className="h-px flex-1 bg-gray-200" aria-hidden />
          </div>

          {loadingPayments ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-primary/60">
              <span className="material-symbols-outlined animate-spin text-secondary text-[20px]">progress_activity</span>
              Loading payments…
            </div>
          ) : payments.length === 0 ? (
            <p className="py-4 text-center text-sm text-primary/50">No payments recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {payments.map((p) => {
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
                          ? `Pending on ${formatShortDayMonth(p.payment_date)}`
                          : isPartialPayment
                            ? `Partial Pay on ${formatShortDayMonth(p.payment_date)}`
                            : `Paid on ${formatShortDayMonth(p.payment_date)}`}
                      </p>
                      {isPending && (
                        <p className="text-[11px] text-amber-600">Pending</p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-bold text-primary tabular-nums">({formatMoney(amt, currencyLabel)})</span>
                    <button
                      type="button"
                      onClick={() => handleDeletePayment(p.id)}
                      disabled={deletingId === p.id}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50"
                      aria-label="Remove this payment"
                    >
                      <span className="material-symbols-outlined text-[22px]">
                        {deletingId === p.id ? "progress_activity" : "delete"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-3">
            <div className="relative w-full min-w-0">
              <label htmlFor={dateFieldId} className="sr-only">Payment date</label>
              <input ref={dateRef} id={dateFieldId} type="date" value={draftDate} onChange={(e) => setDraftDate(e.target.value)} className={dateInputClass} />
              <button type="button" onClick={() => openDatePicker(dateRef.current)} className={calendarBtnClass} aria-label="Open calendar for payment date"><span className="material-symbols-outlined text-[20px] leading-none" aria-hidden>calendar_clock</span></button>
            </div>
            <div className="min-w-0">
              <label htmlFor={amountFieldId} className="sr-only">Payment amount</label>
              <input id={amountFieldId} type="text" inputMode="decimal" placeholder="0.0" value={draftAmount} onChange={(e) => { if (payMode === "partial") setDraftAmount(e.target.value); }} readOnly={payMode === "full"} aria-readonly={payMode === "full"} className={`box-border h-11 min-h-[44px] w-full rounded-lg border border-[#EDEDED] px-3 text-base text-black placeholder:text-primary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25 sm:min-h-11 sm:text-sm ${payMode === "full" ? "cursor-default bg-gray-50 text-black/80" : "bg-white"}`} />
            </div>
          </div>

          {formError ? <p className="mt-2 text-sm text-red-600" role="alert">{formError}</p> : null}

          <div className="mt-4 flex justify-end">
            <button type="button" onClick={handleAddPayment} disabled={remaining <= 0 || adding} className="inline-flex items-center gap-1.5 rounded-lg bg-[#00C896]/10 px-4 py-2.5 text-sm font-semibold text-[#00C896] transition-colors hover:bg-[#00C896]/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00C896] disabled:cursor-not-allowed disabled:opacity-50">
              {adding ? "Adding…" : "Add Payment"}
              <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden>{adding ? "progress_activity" : "add"}</span>
            </button>
          </div>
        </div>

        <div className="shrink-0 border-t border-gray-200 px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-medium text-primary">Amount to be Paid</span>
              <span className="text-2xl font-bold text-secondary sm:text-3xl">{formatMoney(remaining, currencyLabel)}</span>
            </div>
            <button
              type="button"
              onClick={handleSavePayment}
              disabled={pendingPayments.length === 0 || saving}
              className="box-border h-12 min-h-[48px] w-full rounded-lg border border-transparent bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:h-11 sm:min-h-[44px]"
            >
              {saving ? "Saving…" : "Save payment"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
