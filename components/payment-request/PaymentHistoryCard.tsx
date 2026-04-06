"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { PaymentDeleteConfirmModal } from "./PaymentDeleteConfirmModal";

export type PaymentHistoryRow = {
  id: string;
  /** Bill that owns this payment (required for DELETE /bills/{bill_id}/payments/{id}). */
  billId: string;
  /** Status of the bill that owns this payment (for display / future use). */
  billStatus?: string;
  date: string;
  amountLabel: string;
  invoiceNo: string;
  /** Link target for invoice ref; omit or "#" for current bill. */
  invoiceHref?: string;
  /** Payment applies to a different bill than the page context.   */
  isOtherBill?: boolean;
};

type PaymentHistoryCardProps = {
  rows?: PaymentHistoryRow[];
  onDeleteRow?: (row: PaymentHistoryRow) => void;
  /** Whether the current user is permitted to delete payments (elevated roles only). */
  canDeletePayments?: boolean;
};

const defaultRows: PaymentHistoryRow[] = [
  { id: "1", billId: "demo-1", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031626" },
  { id: "2", billId: "demo-2", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031627" },
  { id: "3", billId: "demo-3", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031628" },
  { id: "4", billId: "demo-4", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031629" },
  { id: "5", billId: "demo-5", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031630" },
  { id: "6", billId: "demo-6", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031631" },
];

export function PaymentHistoryCard({ rows = defaultRows, onDeleteRow, canDeletePayments = false }: PaymentHistoryCardProps) {
  const [open, setOpen] = useState(true);
  const [confirmRow, setConfirmRow] = useState<PaymentHistoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmSummary = confirmRow
    ? [confirmRow.date, confirmRow.amountLabel.replace(/^\(|\)$/g, ""), confirmRow.invoiceNo].filter(Boolean).join(" · ")
    : "";

  const handleConfirmDelete = useCallback(async () => {
    if (!confirmRow || !onDeleteRow) return;
    setDeleting(true);
    try {
      await Promise.resolve(onDeleteRow(confirmRow));
      setConfirmRow(null);
    } finally {
      setDeleting(false);
    }
  }, [confirmRow, onDeleteRow]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left sm:px-5 sm:py-4"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className="text-base font-semibold text-primary sm:text-lg">Payment History</h2>
        <span className="material-symbols-outlined text-primary/70" aria-hidden>
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open ? (
        <div className="px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
          <div className="mb-3 hidden grid-cols-[2rem_minmax(9rem,1fr)_minmax(8rem,10rem)_minmax(13rem,1fr)_2.25rem] gap-2 px-3 text-[11px] font-semibold uppercase tracking-wide text-primary/55 sm:grid sm:gap-4 sm:px-4">
            <span aria-hidden />
            <span className="block w-full text-left">Date</span>
            <span className="block w-full text-left">Amount</span>
            <span className="block w-full text-left">Invoice No.</span>
            <span aria-hidden />
          </div>
          <div className="min-h-0 max-h-[min(14rem,38dvh)] overflow-y-auto overscroll-y-contain [-ms-overflow-style:auto] sm:max-h-[min(17.5rem,45vh)]" role="region" aria-label="Payment history list">
            <ul className="flex flex-col gap-2 pb-0.5">
              {rows.map((row) => {
                const isDeleteDisabled = !canDeletePayments;
                return (
                  <li key={row.id} className="grid grid-cols-1 items-center gap-2 rounded-lg bg-gray-50 px-3 py-3 sm:grid-cols-[2rem_minmax(9rem,1fr)_minmax(8rem,10rem)_minmax(13rem,1fr)_2.25rem] sm:gap-4 sm:px-4">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#54D3DA]/15 text-[#54D3DA]" aria-hidden>
                      <span className="material-symbols-outlined text-[20px]">history</span>
                    </span>
                    <span className="text-sm font-medium text-primary sm:min-w-[7rem]">{row.date}</span>
                    <span className="block w-full text-sm font-semibold text-primary text-left">{row.amountLabel}</span>
                    <Link href={row.invoiceHref ?? "#"} className="block w-full min-w-0 truncate text-left text-sm font-medium text-[#54d3da] underline underline-offset-2 hover:text-[#54d3da]">
                      {row.invoiceNo}
                    </Link>
                    <button type="button" className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors sm:justify-self-end ${isDeleteDisabled ? "cursor-not-allowed opacity-50 text-gray-400" : "text-rose-500 hover:bg-rose-100 hover:text-rose-600 disabled:opacity-50"}`} aria-label={isDeleteDisabled ? "You do not have permission to delete payments." : `Delete payment ${row.invoiceNo}`} title={isDeleteDisabled ? "You do not have permission to delete payments." : undefined} disabled={isDeleteDisabled || (deleting && confirmRow?.id === row.id)} onClick={() => { if (isDeleteDisabled || !onDeleteRow) return; setConfirmRow(row); }}>
                      <span className="material-symbols-outlined text-[22px]">delete</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
      {onDeleteRow ? (
        <PaymentDeleteConfirmModal
          open={confirmRow != null}
          summary={confirmSummary}
          pending={deleting}
          onClose={() => {
            if (!deleting) setConfirmRow(null);
          }}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </section>
  );
}
