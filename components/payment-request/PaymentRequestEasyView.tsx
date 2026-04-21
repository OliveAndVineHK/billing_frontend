"use client";

import Image from "next/image";
import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
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
const easyViewAttachmentTd = `${EASY_VIEW_TD_BASE} align-middle flex min-w-0 max-w-full flex-row flex-nowrap items-center justify-start gap-1.5 overflow-hidden sm:gap-2`;
const easyViewStatusTd = `${EASY_VIEW_TD_BASE} align-middle min-w-0 max-w-full overflow-hidden`;

const EASY_VIEW_GRID_COLS =
  "md:grid-cols-[minmax(10rem,1.32fr)_minmax(10.5rem,1.15fr)_minmax(11rem,0.52fr)_minmax(8.5rem,0.9fr)_minmax(10rem,0.82fr)]";

const EASY_VIEW_ROW_GRID = `grid w-full min-w-0 grid-cols-1 gap-4 ${EASY_VIEW_GRID_COLS} md:gap-x-3 md:gap-y-0 md:items-center`;

const EASY_VIEW_HEADER_GRID = `mb-3 hidden min-w-0 md:grid ${EASY_VIEW_GRID_COLS} md:gap-x-3 md:items-end md:px-0`;

const EASY_VIEW_HEADER_CELL = "text-left text-xs font-medium text-[#656565] sm:text-sm";

const EASY_VIEW_BANKSLIP_VOIDED_BTN =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent text-primary/40 transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:gap-2";

const EASY_VIEW_BANKSLIP_DEFAULT_BTN =
  "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent text-primary transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:gap-2";

/** Fixed-width area so rows without files still reserve space; partial icon stays column-aligned with rows that have a slip. */
const EASY_VIEW_BANKSLIP_SLOT =
  "flex h-10 w-24 shrink-0 items-center justify-center sm:h-[42px] sm:w-[6.5rem]";

function EasyViewBankSlipControl({
  row,
  onOpen,
}: {
  row: PaymentRequestRow;
  onOpen: (billId: string) => void;
}) {
  const isVoided = row.status === "Voided";
  const isDraft = row.status === "Draft";
  const n = row.bankslipFileCount;

  if (n == null || n < 1) return null;

  const btnClass = isVoided ? EASY_VIEW_BANKSLIP_VOIDED_BTN : EASY_VIEW_BANKSLIP_DEFAULT_BTN;

  return (
    <button
      type="button"
      className={btnClass}
      onClick={(e) => {
        e.stopPropagation();
        onOpen(row.id);
      }}
      aria-label={
        isVoided
          ? `View bank slip — voided, ${n} file${n === 1 ? "" : "s"}`
          : isDraft
            ? `View bank slip — draft, ${n} file${n === 1 ? "" : "s"}`
            : `View bank slip — ${n} file${n === 1 ? "" : "s"} uploaded`
      }
    >
      <span className="text-sm font-semibold tabular-nums text-inherit sm:text-base">{n}</span>
      <span className="material-symbols-outlined shrink-0 text-[20px] leading-none text-inherit sm:text-[22px]" aria-hidden>
        draft
      </span>
    </button>
  );
}

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
  payPanelBillId: string | null;
  payPanel: ReactNode;
  onRowClick: (rowId: string) => void;
  /** Opens the inline pay panel (Payment Requested) instead of the floating record-payment modal. */
  onPaymentRequestedPay: (rowId: string) => void;
  onRecordPayment: (rowId: string, readOnly?: boolean) => void;
  onOpenBankSlipUpload: (rowId: string) => void;
  isElevated: boolean;
};

function EasyViewStatusCell({
  row,
  isElevated,
  onRecordPayment,
  onPaymentRequestedPay,
}: {
  row: PaymentRequestRow;
  isElevated: boolean;
  onRecordPayment: (rowId: string, readOnly?: boolean) => void;
  onPaymentRequestedPay: (rowId: string) => void;
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
        className={`${EASY_VIEW_STATUS_CELL} cursor-pointer border border-transparent bg-secondary text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-50`}
        onClick={(e) => {
          stop(e);
          if (!isElevated) return;
          onPaymentRequestedPay(row.id);
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
  payPanelBillId,
  payPanel,
  onRowClick,
  onPaymentRequestedPay,
  onRecordPayment,
  onOpenBankSlipUpload,
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

  const easyViewAsideImageSrc =
    activeStatus === "Payment Requested" ? "/unpaid.png" : "/all-cat.png";

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
              <div className={`${EASY_VIEW_TD_BASE} pb-1`} aria-hidden />
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
              <div className={EASY_VIEW_TD_BASE} aria-hidden />
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
                  <div className={easyViewAttachmentTd}>
                    <div className="flex flex-row flex-nowrap items-center gap-1.5 sm:gap-2" aria-hidden>
                      <div className={EASY_VIEW_BANKSLIP_SLOT}>
                        <div className="h-9 w-14 max-w-full animate-pulse rounded-lg bg-gray-200" />
                      </div>
                      <div className="h-[18px] w-[18px] shrink-0 animate-pulse rounded bg-gray-200" />
                    </div>
                  </div>
                  <div className={easyViewUnpaidTd}>
                    <div className="flex min-w-0 flex-col gap-1.5 tabular-nums">
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
              {visibleRows.map((row) => {
                const isPayPanelOpen = payPanelBillId === row.id && payPanel != null;
                return (
                  <li
                    key={row.id}
                    className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-colors"
                  >
                    <div
                      className={`${EASY_VIEW_ROW_GRID} cursor-pointer transition-colors hover:border-primary/20 hover:bg-gray-50/80`}
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
                      <div className={easyViewAttachmentTd} onClick={(e) => e.stopPropagation()}>
                        <div className="flex w-full min-w-0 max-w-full flex-row flex-nowrap items-center gap-1.5 sm:gap-2">
                          <div className={EASY_VIEW_BANKSLIP_SLOT}>
                            <EasyViewBankSlipControl row={row} onOpen={onOpenBankSlipUpload} />
                          </div>
                          {row.status === "Partially paid" ? (
                            <Image
                              src="/partial.png"
                              alt=""
                              width={18}
                              height={18}
                              className="h-[18px] w-[18px] shrink-0 object-contain"
                              sizes="18px"
                              aria-hidden
                            />
                          ) : null}
                        </div>
                      </div>
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
                        <EasyViewStatusCell
                          row={row}
                          isElevated={isElevated}
                          onRecordPayment={onRecordPayment}
                          onPaymentRequestedPay={onPaymentRequestedPay}
                        />
                      </div>
                    </div>
                    {isPayPanelOpen ? (
                      <div
                        className="border-t border-gray-200 bg-gray-50/50 p-4 sm:p-5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex w-full min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:gap-6 sm:justify-between">
                          <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center">
                            <div className="relative aspect-square w-full max-w-[min(100%,22rem)] shrink-0 sm:max-w-[24rem] md:max-w-[26rem] lg:max-w-[30rem]">
                              <Image
                                src="/paid.png"
                                alt=""
                                fill
                                className="object-contain object-center"
                                sizes="(min-width: 1024px) 30rem, (min-width: 768px) 26rem, (min-width: 640px) 24rem, min(100vw, 22rem)"
                                priority
                              />
                            </div>
                          </div>
                          <div className="flex w-full min-w-0 max-w-[min(100%,480px)] shrink-0 justify-end self-end sm:self-center sm:ml-auto">
                            {payPanel}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </li>
                );
              })}
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
            key={easyViewAsideImageSrc}
            src={easyViewAsideImageSrc}
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
