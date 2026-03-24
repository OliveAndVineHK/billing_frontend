"use client";

import Link from "next/link";
import { useState } from "react";

export type PaymentHistoryRow = {
  id: string;
  date: string;
  amountLabel: string;
  invoiceNo: string;
};

type PaymentHistoryCardProps = {
  rows?: PaymentHistoryRow[];
  onDeleteRow?: (id: string) => void;
};

const defaultRows: PaymentHistoryRow[] = [
  { id: "1", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031626" },
  { id: "2", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031627" },
  { id: "3", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031628" },
  { id: "4", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031629" },
  { id: "5", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031630" },
  { id: "6", date: "03 Mar 2026", amountLabel: "(HK$ 500.00)", invoiceNo: "MBIDAN-115803031631" },
];

export function PaymentHistoryCard({ rows = defaultRows, onDeleteRow }: PaymentHistoryCardProps) {
  const [open, setOpen] = useState(true);

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left sm:px-5 sm:py-4"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className="text-base font-semibold text-primary sm:text-lg">Payment History</h2>
        <span className="material-symbols-outlined text-primary/70 transition-transform" style={{ transform: open ? "rotate(0deg)" : "rotate(-90deg)" }} aria-hidden>
          expand_more
        </span>
      </button>
      {open ? (
        <div className="border-t border-gray-100 px-4 pb-4 pt-1 sm:px-5 sm:pb-5">
          <div className="mb-3 hidden grid-cols-[1fr_auto_auto_auto] gap-2 text-[11px] font-semibold uppercase tracking-wide text-primary/55 sm:grid sm:gap-3">
            <span className="pl-10">Date</span>
            <span>Amount</span>
            <span className="col-span-2">Invoice No.</span>
          </div>
          <div
            className="min-h-0 max-h-[min(14rem,38dvh)] overflow-y-auto overscroll-y-contain pr-1 [-ms-overflow-style:auto] [scrollbar-gutter:stable] sm:max-h-[min(17.5rem,45vh)]"
            role="region"
            aria-label="Payment history list"
          >
            <ul className="flex flex-col gap-2 pb-0.5">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="grid grid-cols-1 items-center gap-2 rounded-lg bg-gray-50 px-3 py-3 sm:grid-cols-[auto_1fr_auto_auto] sm:gap-3 sm:px-4"
                >
                  <div className="flex items-center gap-2 sm:contents">
                    <span
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#54D3DA]/15 text-[#54D3DA]"
                      aria-hidden
                    >
                      <span className="material-symbols-outlined text-[20px]">history</span>
                    </span>
                    <span className="text-sm font-medium text-primary sm:min-w-[7rem]">{row.date}</span>
                  </div>
                  <span className="text-sm font-semibold text-primary">{row.amountLabel}</span>
                  <div className="flex min-w-0 items-center justify-between gap-2 sm:justify-end">
                    <Link
                      href="#"
                      className="min-w-0 truncate text-sm font-medium text-[#54D3DA] underline underline-offset-2 hover:text-[#3db9c2]"
                    >
                      {row.invoiceNo}
                    </Link>
                    <button
                      type="button"
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-rose-500 transition-colors hover:bg-rose-100 hover:text-rose-600"
                      aria-label={`Delete payment ${row.invoiceNo}`}
                      onClick={() => onDeleteRow?.(row.id)}
                    >
                      <span className="material-symbols-outlined text-[22px]">delete</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
