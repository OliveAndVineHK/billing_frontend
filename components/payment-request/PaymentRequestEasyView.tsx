"use client";

import Image from "next/image";
import { useMemo, useState, type MouseEvent } from "react";
import { currencyLabelForCode } from "@/lib/currencyDisplay";
import { compareBySubmittedDate } from "@/lib/paymentRequestDateSort";
import type { PaymentRequestRow } from "./PaymentRequestTable";
import type { PaymentRequestStatusFilter } from "./PaymentRequestToolbar";

const EASY_VIEW_STATUS_CELL =
  "box-border inline-flex w-full min-w-0 max-w-full items-center justify-center rounded-lg px-2.5 py-1 text-sm font-semibold sm:px-3 sm:py-0 lg:h-[42px] lg:min-h-[42px] lg:text-sm";

const SUBMITTED_DATE_SORT_HELP =
  "Sort by submitted date (oldest first or newest first). Click again to reverse. Only rows you see now are sorted; changing the status filter resets the order.";

const EASY_VIEW_TD_BASE = "px-4 py-3 text-sm text-primary sm:px-5 sm:py-3.5";

const easyViewContactTd = `${EASY_VIEW_TD_BASE} align-middle min-w-0`;
const easyViewSubmittedTd = `${EASY_VIEW_TD_BASE} align-middle whitespace-nowrap tabular-nums`;
const easyViewUnpaidTd = `${EASY_VIEW_TD_BASE} align-middle tabular-nums min-w-0`;
const easyViewStatusTd = `${EASY_VIEW_TD_BASE} align-middle min-w-0 max-w-full overflow-hidden`;

const EASY_VIEW_GRID_COLS =
  "md:grid-cols-[minmax(10rem,1.35fr)_minmax(10.5rem,1.2fr)_minmax(11rem,1fr)_minmax(10rem,0.9fr)]";

const EASY_VIEW_ROW_GRID = `grid w-full min-w-0 grid-cols-1 gap-4 ${EASY_VIEW_GRID_COLS} md:gap-x-3 md:gap-y-0 md:items-center`;

const EASY_VIEW_HEADER_GRID = `mb-3 hidden min-w-0 md:grid ${EASY_VIEW_GRID_COLS} md:gap-x-3 md:items-end md:px-0`;

const EASY_VIEW_HEADER_CELL = "text-left text-xs font-medium text-[#656565] sm:text-sm";

function unpaidAmountClass(status: string): string {
  if (status === "Paid") return "text-[#656565]";
  if (status === "Payment Requested") return "text-secondary";
  if (status === "Partially paid") return "text-[#70ebba]";
  if (status === "Voided") return "text-[#FF6B6B]";
  if (status === "Draft") return "text-[#656565]";
  if (status === "Returned") return "text-[#EA9713]";
  return "text-[#C0C0C0]";
}

export type PaymentRequestEasyViewProps = {
  rows: PaymentRequestRow[];
  loading: boolean;
  activeStatus: PaymentRequestStatusFilter;
  onRowClick: (rowId: string) => void;
  onRecordPayment: (rowId: string, readOnly?: boolean) => void;
  isElevated: boolean;
};

function EasyViewStatusCell({
  row,
  isElevated,
  onRecordPayment,
}: {
  row: PaymentRequestRow;
  isElevated: boolean;
  onRecordPayment: (rowId: string, readOnly?: boolean) => void;
}) {
  const stop = (e: MouseEvent) => e.stopPropagation();

  if (row.status === "Voided") {
    return (
      <span className={`${EASY_VIEW_STATUS_CELL} text-[#FF6B6B]`} onClick={stop}>
        Voided
      </span>
    );
  }
  if (row.status === "Returned") {
    return (
      <span
        className={`${EASY_VIEW_STATUS_CELL} bg-[#EA9713]/15 text-[#EA9713]`}
        onClick={stop}
      >
        Returned
      </span>
    );
  }
  if (row.status === "Draft") {
    return (
      <span
        className={`${EASY_VIEW_STATUS_CELL} bg-[#EDEDED] font-medium text-[#C0C0C0]`}
        onClick={stop}
      >
        Draft
      </span>
    );
  }
  if (row.status === "Paid") {
    return (
      <button
        type="button"
        className={`${EASY_VIEW_STATUS_CELL} cursor-pointer border border-primary/25 bg-white text-[#656565] shadow-sm transition-colors hover:bg-gray-50 disabled:cursor-not-allowed`}
        onClick={(e) => {
          stop(e);
          if (!isElevated) return;
          onRecordPayment(row.id, true);
        }}
        disabled={!isElevated}
      >
        Paid
      </button>
    );
  }
  if (row.status === "Partially paid") {
    return (
      <button
        type="button"
        className={`${EASY_VIEW_STATUS_CELL} cursor-pointer bg-[#70ebba]/10 font-semibold text-[#70ebba] shadow-sm transition-colors hover:bg-[#70ebba]/20 disabled:cursor-not-allowed`}
        onClick={(e) => {
          stop(e);
          if (!isElevated) return;
          onRecordPayment(row.id, true);
        }}
        disabled={!isElevated}
      >
        Partial
      </button>
    );
  }
  if (row.status === "Payment Requested") {
    return (
      <button
        type="button"
        className={`${EASY_VIEW_STATUS_CELL} cursor-pointer border border-transparent bg-secondary text-white shadow-sm transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`}
        onClick={(e) => {
          stop(e);
          if (!isElevated) return;
          onRecordPayment(row.id, false);
        }}
        disabled={!isElevated}
      >
        Pay
      </button>
    );
  }
  return (
    <span
      className={`${EASY_VIEW_STATUS_CELL} truncate font-medium text-primary/80`}
      title={row.status}
      onClick={stop}
    >
      {row.status}
    </span>
  );
}

export function PaymentRequestEasyView({
  rows,
  loading,
  activeStatus,
  onRowClick,
  onRecordPayment,
  isElevated,
}: PaymentRequestEasyViewProps) {
  const [submittedDateSort, setSubmittedDateSort] = useState<"asc" | "desc">("desc");

  const visibleRows = useMemo(() => {
    const filtered =
      activeStatus === "All" ? rows : rows.filter((r) => r.status === activeStatus);
    const copy = [...filtered];
    copy.sort((a, b) => compareBySubmittedDate(a, b, submittedDateSort));
    return copy;
  }, [rows, activeStatus, submittedDateSort]);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 px-4 pb-4 pt-1 sm:px-6 lg:flex-row lg:items-stretch lg:gap-6 lg:pt-2">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="mb-3 flex w-full min-w-0 flex-wrap items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[18px] font-semibold text-black" title={activeStatus}>
            {activeStatus}
          </span>
          <div className="flex shrink-0 flex-wrap items-center gap-1 sm:gap-1.5">
            <span className="text-[14px] font-medium text-primary">Submitted date</span>
            <button
              type="button"
              className="inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded outline-none hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
              aria-label={`Sort by submitted date${submittedDateSort === "asc" ? ", ascending" : ", descending"}`}
              title={SUBMITTED_DATE_SORT_HELP}
              onClick={() => setSubmittedDateSort((d) => (d === "asc" ? "desc" : "asc"))}
            >
              <span className="inline-flex size-5 items-center justify-center" aria-hidden>
                <span className="material-symbols-outlined block text-[18px] leading-none text-primary opacity-100">
                  {submittedDateSort === "asc" ? "expand_less" : "expand_more"}
                </span>
              </span>
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {loading ? (
            <div className={EASY_VIEW_HEADER_GRID} aria-hidden>
              <div className={`${EASY_VIEW_HEADER_CELL} ${EASY_VIEW_TD_BASE} pb-1`}>
                <div className="h-3.5 w-[min(100%,11rem)] rounded-md bg-gray-200/90 animate-pulse" />
              </div>
              <div className={`${EASY_VIEW_HEADER_CELL} ${EASY_VIEW_TD_BASE} pb-1`}>
                <div className="h-3.5 w-[min(100%,9.5rem)] rounded-md bg-gray-200/90 animate-pulse" />
              </div>
              <div className={`${EASY_VIEW_HEADER_CELL} ${EASY_VIEW_TD_BASE} pb-1`}>
                <div className="h-3.5 w-[min(100%,7.5rem)] rounded-md bg-gray-200/90 animate-pulse" />
              </div>
              <div className={`${EASY_VIEW_HEADER_CELL} ${EASY_VIEW_TD_BASE} pb-1`}>
                <div className="h-3.5 w-[min(100%,5rem)] rounded-md bg-gray-200/90 animate-pulse" />
              </div>
            </div>
          ) : (
            <div className={EASY_VIEW_HEADER_GRID}>
              <div className={`${EASY_VIEW_HEADER_CELL} ${EASY_VIEW_TD_BASE}`}>Contact / Description</div>
              <div className={`${EASY_VIEW_HEADER_CELL} ${EASY_VIEW_TD_BASE}`}>Submitted Date</div>
              <div className={`${EASY_VIEW_HEADER_CELL} ${EASY_VIEW_TD_BASE}`}>Unpaid Amount</div>
              <div className={`${EASY_VIEW_HEADER_CELL} ${EASY_VIEW_TD_BASE}`}>Status</div>
            </div>
          )}

          {loading ? (
            <ul className="flex flex-col gap-3" aria-hidden>
              {Array.from({ length: 6 }, (_, i) => (
                <li
                  key={`sk-${i}`}
                  className={`${EASY_VIEW_ROW_GRID} rounded-lg border border-gray-200 bg-white shadow-sm`}
                >
                  <div className={`${easyViewContactTd} space-y-2 py-0.5`}>
                    <div className="h-4 max-w-[14rem] animate-pulse rounded bg-gray-200" />
                    <div className="h-3 max-w-[min(100%,20rem)] animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className={easyViewSubmittedTd}>
                    <div className="h-4 w-[9.5rem] max-w-full shrink-0 animate-pulse rounded-md bg-gray-200 tabular-nums" />
                  </div>
                  <div className={easyViewUnpaidTd}>
                    <div className="flex flex-col gap-1.5 tabular-nums">
                      <div className="h-4 w-28 animate-pulse rounded bg-gray-200 sm:h-5" />
                      <div className="h-3 w-36 max-w-full animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>
                  <div className={easyViewStatusTd}>
                    <div className="h-7 w-full min-h-[42px] max-w-full animate-pulse rounded-lg bg-gray-200 sm:h-[42px]" />
                  </div>
                </li>
              ))}
            </ul>
          ) : visibleRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-12 text-center text-sm text-primary/60">
              No payment requests match this status.
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {visibleRows.map((row) => (
                <li
                  key={row.id}
                  className={`${EASY_VIEW_ROW_GRID} cursor-pointer rounded-lg border border-gray-200 bg-white shadow-sm transition-colors hover:border-primary/20 hover:bg-gray-50/80`}
                  onClick={() => onRowClick(row.id)}
                >
                  <div className={easyViewContactTd}>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-sm font-semibold text-primary sm:text-base">{row.contactTitle}</span>
                      {row.contactCaption ? (
                        <span className="text-xs text-primary/65 sm:text-sm">{row.contactCaption}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className={easyViewSubmittedTd}>{row.submittedDate}</div>
                  <div className={easyViewUnpaidTd}>
                    {row.unpaidAmount || row.invoiceTotal ? (
                      <div className="flex min-w-0 flex-col gap-0.5">
                        {row.unpaidAmount ? (
                          <span
                            className={`whitespace-nowrap text-sm font-semibold sm:text-base ${unpaidAmountClass(row.status)}`}
                          >
                            {row.unpaidAmount}
                          </span>
                        ) : null}
                        {row.invoiceTotal ? (
                          <span className="whitespace-nowrap text-xs text-primary/65 tabular-nums sm:text-sm">
                            (Inv total {currencyLabelForCode(row.currencyCode ?? "HKD")} {row.invoiceTotal})
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className={easyViewStatusTd} onClick={(e) => e.stopPropagation()}>
                    <EasyViewStatusCell row={row} isElevated={isElevated} onRecordPayment={onRecordPayment} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div
        className="hidden min-h-0 w-px shrink-0 self-stretch bg-gray-200 lg:block"
        aria-hidden
      />

      <aside className="relative mx-auto hidden w-full max-w-2xl shrink-0 overflow-hidden rounded-2xl lg:flex lg:w-[min(55%,42rem)] lg:items-center lg:justify-center lg:self-center">
        <div className="relative aspect-square w-full">
          <Image
            src="/all-cat.png"
            alt=""
            fill
            className="object-contain object-center"
            sizes="(min-width: 1024px) min(55vw, 42rem), 0px"
            priority
          />
        </div>
      </aside>
    </div>
  );
}
