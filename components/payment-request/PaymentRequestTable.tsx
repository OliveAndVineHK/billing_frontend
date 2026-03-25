"use client";

import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef, useState } from "react";
import type { PaymentRequestStatusFilter } from "./PaymentRequestToolbar";
import { UploadBankslipModal } from "./UploadBankslipModal";

const COLUMN_TITLES = [
  "Contact / Description",
  "Invoice Date",
  "Status",
  "Submitted Date",
  "Unpaid Amount",
  "Payment",
  "Paid Date",
  "Bankslip",
] as const;

export type PaymentRequestColumnTitle = (typeof COLUMN_TITLES)[number];

export type PaymentRequestRow = {
  id: string;
  contactTitle: string;
  contactCaption: string;
  invoiceDate: string;
  status: string;
  submittedDate: string;
  unpaidAmount: string;
  invoiceTotal?: string;
  payment: string;
  paidDate: string;
  bankslip: string;
  bankslipFileCount?: number;
  xeroActive?: boolean;
};

const DEMO_ROWS: PaymentRequestRow[] = [
  {
    id: "1",
    contactTitle: "Young Bros Transport",
    contactCaption: "Lorem ipsum dolor sit amet",
    invoiceDate: "03 Mar 2026",
    status: "Draft",
    submittedDate: "01 Mar 2026",
    unpaidAmount: "HK$ 1,500.00",
    invoiceTotal: "1,000.00",
    payment: "",
    paidDate: "",
    bankslip: "",
    xeroActive: false,
  },
  {
    id: "2",
    contactTitle: "Chun Fat Seafood",
    contactCaption: "Monthly supplier invoice",
    invoiceDate: "28 Feb 2026",
    status: "Payment Requested",
    submittedDate: "27 Feb 2026",
    unpaidAmount: "HK$ 2,400.00",
    invoiceTotal: "2,000.00",
    payment: "",
    paidDate: "",
    bankslip: "",
    xeroActive: false,
  },
  {
    id: "3",
    contactTitle: "Harbour Logistics Ltd",
    contactCaption: "Freight forwarding — Q1",
    invoiceDate: "15 Mar 2026",
    status: "Paid",
    submittedDate: "14 Mar 2026",
    unpaidAmount: "HK$ 0.00",
    invoiceTotal: "890.00",
    payment: "",
    paidDate: "16 Mar 2026",
    bankslip: "",
    bankslipFileCount: 1,
    xeroActive: false,
  },
  {
    id: "4",
    contactTitle: "Metro Office Supplies",
    contactCaption: "Stationery — returned to sender",
    invoiceDate: "10 Mar 2026",
    status: "Returned",
    submittedDate: "08 Mar 2026",
    unpaidAmount: "HK$ 320.00",
    invoiceTotal: "320.00",
    payment: "",
    paidDate: "11 Mar 2026",
    bankslip: "",
    bankslipFileCount: 2,
    xeroActive: false,
  },
  {
    id: "5",
    contactTitle: "Pacific Utilities Co.",
    contactCaption: "Duplicate billing — voided",
    invoiceDate: "02 Mar 2026",
    status: "Voided",
    submittedDate: "01 Mar 2026",
    unpaidAmount: "",
    invoiceTotal: "",
    payment: "",
    paidDate: "",
    bankslip: "",
    xeroActive: false,
  },
];

const HEADER_CHECKBOX_CLASS = "checkbox-secondary-white-tick h-4 w-4 rounded border border-primary/40";

const dataCellBase = "border-b border-gray-100 px-4 py-3 text-sm text-primary sm:px-5 sm:py-3.5";
const contactCellClass = `${dataCellBase} align-middle`;
const invoiceDateCellClass = `${dataCellBase} align-middle`;
const singleLineDateCellClass = `${dataCellBase} align-middle whitespace-nowrap tabular-nums min-w-[9rem]`;
const singleLineStatusCellClass = `${dataCellBase} align-middle whitespace-nowrap min-w-[10rem]`;
const unpaidAmountCellClass = `${dataCellBase} align-middle tabular-nums min-w-[13rem]`;

const actionBodyCellBg = "bg-secondary/8";

const statusTagClass =
  "inline-flex items-center rounded-lg bg-[#EDEDED] px-2.5 py-1 text-xs font-medium text-[#C0C0C0] sm:text-sm";

const statusTagPaidClass =
  "inline-flex items-center rounded-lg bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary sm:text-sm";

const statusTagPaymentRequestedClass =
  "inline-flex items-center rounded-lg bg-[#FF6B6B]/10 px-2.5 py-1 text-xs font-semibold text-[#FF6B6B] sm:text-sm";

const statusTagReturnedClass =
  "inline-flex items-center rounded-lg bg-[#EA9713]/10 px-2.5 py-1 text-xs font-semibold text-[#EA9713] sm:text-sm";

const recordPaymentButtonClass =
  "box-border inline-flex h-10 min-h-10 w-max max-w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-transparent bg-secondary px-3 text-xs font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:bg-[#EDEDED] disabled:text-[#C0C0C0] disabled:shadow-none disabled:hover:opacity-100 sm:h-[42px] sm:min-h-[42px] sm:px-4 sm:text-sm";

const uploadBankslipButtonClass =
  "box-border inline-flex h-10 min-h-10 w-max max-w-full cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-secondary bg-white px-3 text-xs font-semibold text-secondary transition-colors hover:bg-secondary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:h-[42px] sm:min-h-[42px] sm:px-4 sm:text-sm";

const rowMenuButtonClass =
  "box-border inline-flex h-9 min-h-9 w-9 min-w-9 cursor-pointer items-center justify-center rounded-lg text-primary transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:h-10 sm:min-h-10 sm:w-10 sm:min-w-10";

function unpaidAmountTextClass(status: string): string {
  if (status === "Paid") return "text-secondary";
  if (status === "Payment Requested") return "text-[#FF6B6B]";
  if (status === "Draft") return "text-[#C0C0C0]";
  if (status === "Returned") return "text-[#EA9713]";
  return "text-[#C0C0C0]";
}

type PaymentRequestTableProps = {
  rows?: PaymentRequestRow[];
  onRecordPayment?: (rowId: string) => void;
  statusFilter?: PaymentRequestStatusFilter;
  onRowDelete?: (rowId: string) => void;
  onRowPublish?: (rowId: string) => void;
  onRowRepublish?: (rowId: string) => void;
};

const ROW_MENU_MIN_WIDTH_PX = 160;

type RowMenuState = { rowId: string; top: number; left: number };

const TABLE_COL_COUNT = 1 + COLUMN_TITLES.length + 2;

export function PaymentRequestTable({
  rows = DEMO_ROWS,
  onRecordPayment,
  statusFilter = "All",
  onRowDelete,
  onRowPublish,
  onRowRepublish,
}: PaymentRequestTableProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bankslipModalRowId, setBankslipModalRowId] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  const visibleRows = useMemo(
    () => (statusFilter === "All" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  const allSelected = visibleRows.length > 0 && visibleRows.every((r) => selectedIds.has(r.id));
  const someSelected = visibleRows.some((r) => selectedIds.has(r.id)) && !allSelected;

  useEffect(() => {
    setSelectedIds(new Set());
    setRowMenu(null);
  }, [statusFilter]);

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(visibleRows.map((r) => r.id)));
  };

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bankslipModalRow = bankslipModalRowId ? rows.find((r) => r.id === bankslipModalRowId) : undefined;

  useEffect(() => {
    if (!rowMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setRowMenu(null);
    };
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-row-menu-panel]")) return;
      if (t.closest("[data-row-menu-trigger]")) return;
      setRowMenu(null);
    };
    const onScroll = () => setRowMenu(null);
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [rowMenu]);

  const toggleRowMenu = (rowId: string, trigger: HTMLButtonElement) => {
    const r = trigger.getBoundingClientRect();
    const left = Math.max(8, r.right - ROW_MENU_MIN_WIDTH_PX);
    const top = r.bottom + 4;
    setRowMenu((open) => (open?.rowId === rowId ? null : { rowId, top, left }));
  };

  return (
    <div className="w-full min-w-0 px-4 pb-6 sm:px-6">
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch]">
          <table className="min-w-[82rem] w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th scope="col" className="w-12 min-w-[2.75rem] px-2 py-3 text-center sm:px-3 sm:py-3.5">
                  <input ref={headerCheckboxRef} type="checkbox" checked={allSelected} onChange={toggleAll} className={HEADER_CHECKBOX_CLASS} aria-label="Select all rows" suppressHydrationWarning />
                </th>
                {COLUMN_TITLES.map((title, index) => (
                  <th key={title} scope="col" className={`px-4 py-3 text-left text-xs font-semibold text-primary sm:px-5 sm:py-3.5 sm:text-sm ${index === 0 ? "min-w-[14rem]" : title === "Payment" || title === "Bankslip" ? "min-w-[11rem] whitespace-nowrap" : title === "Invoice Date" || title === "Paid Date" ? "min-w-[9rem] whitespace-nowrap" : title === "Status" ? "min-w-[10rem] whitespace-nowrap" : title === "Unpaid Amount" ? "min-w-[13rem] whitespace-nowrap" : "min-w-[7rem] whitespace-nowrap"}`}>{title}</th>
                ))}
                <th scope="col" aria-label="Xero" className="w-14 min-w-[3.25rem] px-2 py-3 text-center sm:px-3 sm:py-3.5" />
                <th scope="col" aria-label="Row actions" className="w-12 min-w-[2.75rem] px-2 py-3 text-center sm:px-3 sm:py-3.5" />
              </tr>
            </thead>
            <tbody className="bg-white">
              {visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COL_COUNT} className="border-b border-gray-100 px-4 py-8 text-center text-sm text-primary/70 sm:px-5">No payment requests match this status.</td>
                </tr>
              ) : null}
              {visibleRows.map((row) => {
                const isPaid = row.status === "Paid";
                const isPaymentRequested = row.status === "Payment Requested";
                const isDraft = row.status === "Draft";
                const isReturned = row.status === "Returned";
                const xeroConnected = !isDraft && row.xeroActive;
                return (
                  <tr key={row.id} className="cursor-pointer transition-colors duration-150 ease-out hover:bg-gray-50">
                    <td className="border-b border-gray-100 px-2 py-3 text-center align-middle sm:px-3">
                      <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleRow(row.id)} className={HEADER_CHECKBOX_CLASS} aria-label={`Select row ${row.contactTitle}`} suppressHydrationWarning />
                    </td>
                    <td className={contactCellClass}>
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-semibold text-primary sm:text-base">{row.contactTitle}</span>
                        {row.contactCaption ? <span className="text-xs text-primary/65 sm:text-sm">{row.contactCaption}</span> : null}
                      </div>
                    </td>
                    <td className={singleLineDateCellClass}>{row.invoiceDate}</td>
                    <td className={singleLineStatusCellClass}>
                      {row.status ? <span className={isPaid ? statusTagPaidClass : isPaymentRequested ? statusTagPaymentRequestedClass : isReturned ? statusTagReturnedClass : statusTagClass}>{row.status}</span> : null}
                    </td>
                    <td className={invoiceDateCellClass}>{row.submittedDate}</td>
                    <td className={unpaidAmountCellClass}>
                      {row.unpaidAmount || row.invoiceTotal ? (
                        <div className="flex min-w-0 flex-col gap-0.5">
                          {row.unpaidAmount ? <span className={"whitespace-nowrap text-sm font-semibold sm:text-base " + unpaidAmountTextClass(row.status)}>{row.unpaidAmount}</span> : null}
                          {row.invoiceTotal ? <span className="whitespace-nowrap text-xs text-primary/65 tabular-nums sm:text-sm">(Inv total HK$ {row.invoiceTotal})</span> : null}
                        </div>
                      ) : null}
                    </td>
                    <td className={`${dataCellBase} align-middle text-left ${actionBodyCellBg}`}>
                      <button type="button" disabled={isPaid} aria-label={isPaid ? `Already paid — ${row.contactTitle}` : `Record payment for ${row.contactTitle}`} onClick={() => { if (isPaid) return; onRecordPayment?.(row.id); }} className={recordPaymentButtonClass}><span className="whitespace-nowrap">Record Payment</span><span className="material-symbols-outlined shrink-0 text-[20px] leading-none sm:text-[22px]" aria-hidden>add</span></button>
                    </td>
                    <td className={`${singleLineDateCellClass} ${actionBodyCellBg}`}>{row.paidDate.trim() ? row.paidDate : <span className="text-primary/40 tabular-nums" aria-label="No paid date">-</span>}</td>
                    <td className={`${invoiceDateCellClass} ${actionBodyCellBg}`}>
                      {row.bankslipFileCount != null && row.bankslipFileCount > 0 ? (
                        <div className="inline-flex items-center gap-1.5 text-secondary sm:gap-2" role="status" aria-label={`${row.bankslipFileCount} file${row.bankslipFileCount === 1 ? "" : "s"} uploaded`}><span className="text-sm font-semibold tabular-nums sm:text-base">{row.bankslipFileCount}</span><span className="material-symbols-outlined shrink-0 text-[20px] leading-none sm:text-[22px]" aria-hidden>draft</span></div>
                      ) : (
                        <button type="button" className={uploadBankslipButtonClass} onClick={(e) => { e.stopPropagation(); setBankslipModalRowId(row.id); }}><span className="whitespace-nowrap">Upload</span><span className="material-symbols-outlined shrink-0 text-[20px] leading-none sm:text-[22px]" aria-hidden>upload_file</span></button>
                      )}
                    </td>
                    <td className={`border-b border-gray-100 px-2 py-3 text-center align-middle sm:px-3 ${actionBodyCellBg}`}>
                      <img src={xeroConnected ? "/xero-active.png" : "/xero-inactive.png"} alt={xeroConnected ? "Xero connected" : "Xero not connected"} width={24} height={24} className="mx-auto h-6 w-6 max-h-6 max-w-6 object-contain" />
                    </td>
                    <td className={`border-b border-gray-100 px-2 py-3 text-center align-middle sm:px-3 ${actionBodyCellBg}`}>
                      <button type="button" data-row-menu-trigger className={rowMenuButtonClass} aria-label={`More options for ${row.contactTitle}`} aria-expanded={rowMenu?.rowId === row.id ? "true" : "false"} aria-haspopup="menu" onClick={(e) => { e.stopPropagation(); toggleRowMenu(row.id, e.currentTarget); }}><span className="material-symbols-outlined text-[22px] leading-none text-primary" aria-hidden>more_vert</span></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <UploadBankslipModal open={bankslipModalRowId != null} onClose={() => setBankslipModalRowId(null)} contactTitle={bankslipModalRow?.contactTitle} />
      {rowMenu
        ? createPortal(
            <div data-row-menu-panel role="menu" aria-label="Row actions" className="fixed z-[400] rounded-lg border border-gray-200 bg-white py-1 shadow-lg" style={{ top: rowMenu.top, left: rowMenu.left, minWidth: ROW_MENU_MIN_WIDTH_PX }}>
              <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50" onClick={() => { onRowDelete?.(rowMenu.rowId); setRowMenu(null); }}>Delete</button>
              <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-gray-100" onClick={() => { onRowPublish?.(rowMenu.rowId); setRowMenu(null); }}>Publish</button>
              <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-gray-100" onClick={() => { onRowRepublish?.(rowMenu.rowId); setRowMenu(null); }}>Republish</button>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

export { COLUMN_TITLES };
