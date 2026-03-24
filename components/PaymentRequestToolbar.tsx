"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const PaymentRequestModal = dynamic(
  () => import("@/components/PaymentRequestModal").then((m) => m.PaymentRequestModal),
  { ssr: false, loading: () => null },
);

const STATUS_FILTERS = ["All", "Draft", "Payment Requested", "Paid", "Voided"] as const;

export function PaymentRequestToolbar() {
  const [activeStatus, setActiveStatus] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [billModalOpen, setBillModalOpen] = useState(false);
  /** Load modal chunk only after first “Add Bill” so the home route stays lean. */
  const [billModalMounted, setBillModalMounted] = useState(false);

  return (
    <>
    <div className="flex w-full min-w-0 flex-col gap-3 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      <div
        className="-mx-4 flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain px-4 pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Filter by status"
      >
        {STATUS_FILTERS.map((label) => {
          const isActive = activeStatus === label;
          return (
            <button
              key={label}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveStatus(label)}
              className={`box-border inline-flex h-10 min-h-10 shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border px-2.5 text-xs font-medium transition-colors sm:h-[42px] sm:min-h-[42px] sm:px-4 sm:text-sm md:text-base ${isActive ? "border-secondary bg-secondary/15 text-secondary" : "border-primary/25 text-primary hover:bg-primary/10"}`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-end sm:gap-2 lg:w-auto lg:max-w-2xl lg:flex-1 xl:max-w-3xl">
        <label htmlFor="payment-request-search" className="sr-only">
          Search by contact or description
        </label>
        <div className="relative min-w-0 flex-1">
          <input
            id="payment-request-search"
            type="search"
            name="q"
            placeholder="Search by contact or description"
            className="box-border h-11 min-h-[44px] w-full rounded-lg border border-primary/25 bg-white py-0 pl-3 pr-3 text-base leading-normal text-primary placeholder:text-primary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30 sm:h-[42px] sm:min-h-[42px] sm:text-sm"
          />
        </div>
        <div className="flex shrink-0 items-stretch justify-end gap-2">
          <button
            type="button"
            aria-label="Filter"
            className="box-border inline-flex h-[42px] min-h-[42px] w-[42px] min-w-[42px] cursor-pointer items-center justify-center rounded-lg border border-primary/25 text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            <span className="material-symbols-outlined text-[22px] leading-none">filter_alt</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setBillModalMounted(true);
              setBillModalOpen(true);
            }}
            className="box-border inline-flex h-[42px] min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            Add Bill
            <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>
              add
            </span>
          </button>
        </div>
      </div>
    </div>
    {billModalMounted ? (
      <PaymentRequestModal open={billModalOpen} onClose={() => setBillModalOpen(false)} />
    ) : null}
    </>
  );
}
