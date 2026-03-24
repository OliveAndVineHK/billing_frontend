"use client";

import { useState } from "react";

const STATUS_FILTERS = ["All", "Draft", "Payment Requested", "Paid", "Voided"] as const;

export function PaymentRequestToolbar() {
  const [activeStatus, setActiveStatus] = useState<(typeof STATUS_FILTERS)[number]>("All");

  return (
    <div className="flex w-full min-w-0 flex-col gap-3 bg-white px-4 py-3 sm:px-6 sm:py-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
      <div className="flex min-w-0 flex-wrap items-center gap-2" role="tablist" aria-label="Filter by status">
        {STATUS_FILTERS.map((label) => {
          const isActive = activeStatus === label;
          return (
            <button key={label} type="button" role="tab" aria-selected={isActive} onClick={() => setActiveStatus(label)} className={`box-border inline-flex h-[42px] min-h-[42px] shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg border px-3 text-sm font-medium transition-colors sm:px-4 sm:text-base ${isActive ? "border-secondary bg-secondary/15 text-secondary" : "border-primary/25 text-primary hover:bg-primary/10"}`}>{label}</button>
          );
        })}
      </div>

      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-stretch sm:justify-end sm:gap-2 lg:w-auto lg:max-w-2xl lg:flex-1 xl:max-w-3xl">
        <label htmlFor="payment-request-search" className="sr-only">
          Search by contact or description
        </label>
        <div className="relative min-w-0 flex-1">
          <input id="payment-request-search" type="search" name="q" placeholder="Search by contact or description" className="box-border h-[42px] min-h-[42px] w-full rounded-lg border border-primary/25 bg-white py-0 pl-3 pr-3 text-sm leading-normal text-primary placeholder:text-primary/50 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/30" />
        </div>
        <div className="flex shrink-0 items-stretch justify-end gap-2">
          <button type="button" aria-label="Filter" className="box-border inline-flex h-[42px] min-h-[42px] w-[42px] min-w-[42px] cursor-pointer items-center justify-center rounded-lg border border-primary/25 text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"><span className="material-symbols-outlined text-[22px] leading-none">filter_alt</span></button>
          <button type="button" className="box-border inline-flex h-[42px] min-h-[42px] cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary">Add Bill<span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>add</span></button>
        </div>
      </div>
    </div>
  );
}
