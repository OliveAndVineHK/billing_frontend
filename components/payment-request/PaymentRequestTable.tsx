"use client";

import { createPortal } from "react-dom";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import type { PaymentRequestStatusFilter } from "./PaymentRequestToolbar";
import { BankSlipDetailsModal, type BankSlipDetails } from "./BankSlipDetailsModal";
import { RowDeleteConfirmModal } from "./RowDeleteConfirmModal";
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
  currencyCode?: string;
  bankslipFileCount?: number;
  bankSlipDetails?: BankSlipDetails;
  xeroActive?: boolean;
};

function isActionColumnTitle(title: string) {
  return title === "Payment" || title === "Paid Date" || title === "Bankslip";
}

const MOBILE_BILL_DESCRIPTION_VISIBLE_CHARS = 26;

function truncateMobileBillDescription(text: string): string {
  return text.length > MOBILE_BILL_DESCRIPTION_VISIBLE_CHARS
    ? `${text.slice(0, MOBILE_BILL_DESCRIPTION_VISIBLE_CHARS)}...`
    : text;
}

type SortKey = "contact" | "invoiceDate" | "status" | "submittedDate" | "unpaidAmount" | "paidDate";

const SORTABLE_TITLE: Partial<Record<PaymentRequestColumnTitle, SortKey>> = {
  "Contact / Description": "contact",
  "Invoice Date": "invoiceDate",
  Status: "status",
  "Submitted Date": "submittedDate",
  "Unpaid Amount": "unpaidAmount",
  "Paid Date": "paidDate",
};

function dateSortValue(s: string): number | null {
  const t = s.trim();
  if (!t || t === "-") return null;
  const ms = Date.parse(t);
  return Number.isNaN(ms) ? null : ms;
}

function unpaidSortValue(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number.parseFloat(t.replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : null;
}

function compareNullableNumber(a: number | null, b: number | null, dir: 1 | -1): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (a < b) return -dir;
  if (a > b) return dir;
  return 0;
}

const STATUS_TABLE_ORDER = ["Payment Requested", "Returned", "Paid", "Draft", "Voided"] as const;

function statusSortRank(label: string): number {
  const i = (STATUS_TABLE_ORDER as readonly string[]).indexOf(label);
  return i >= 0 ? i : STATUS_TABLE_ORDER.length;
}

function compareRows(a: PaymentRequestRow, b: PaymentRequestRow, key: SortKey, dir: "asc" | "desc"): number {
  const d = dir === "asc" ? 1 : -1;
  switch (key) {
    case "contact": {
      const t = a.contactTitle.localeCompare(b.contactTitle, undefined, { sensitivity: "base" });
      if (t !== 0) return t * d;
      return a.contactCaption.localeCompare(b.contactCaption, undefined, { sensitivity: "base" }) * d;
    }
    case "invoiceDate":
      return compareNullableNumber(dateSortValue(a.invoiceDate), dateSortValue(b.invoiceDate), d);
    case "submittedDate":
      return compareNullableNumber(dateSortValue(a.submittedDate), dateSortValue(b.submittedDate), d);
    case "paidDate":
      return compareNullableNumber(dateSortValue(a.paidDate), dateSortValue(b.paidDate), d);
    case "status": {
      const ra = statusSortRank(a.status);
      const rb = statusSortRank(b.status);
      if (ra !== rb) return (ra - rb) * d;
      return a.status.localeCompare(b.status, undefined, { sensitivity: "base" }) * d;
    }
    case "unpaidAmount":
      return compareNullableNumber(unpaidSortValue(a.unpaidAmount), unpaidSortValue(b.unpaidAmount), d);
    default:
      return 0;
  }
}

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
    currencyCode: "HKD",
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
    currencyCode: "HKD",
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
    bankSlipDetails: {
      createdBy: "John Doe",
      createdAt: "14 Mar 2026 10:22 HKT",
      toName: "Harbour Logistics Ltd",
      toAccount: "147-622484-838",
      amount: "HK$ 0.00",
      fromName: "BUSINESS INTEGRATED SAVINGS - HKD SAVINGS",
      fromAccount: "040-286XXX-838",
      when: "15 Mar 2026",
      files: [{ id: "h1", name: "Harbour_Logistics_receipt.pdf" }],
    },
    currencyCode: "HKD",
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
    bankSlipDetails: {
      createdBy: "John Doe",
      createdAt: "03 Mar 2026 13:36 HKT",
      toName: "OL*VE AN* V*NE LTD",
      toAccount: "147-622484-838",
      amount: "HK$ 1,500.00",
      fromName: "BUSINESS INTEGRATED SAVINGS - HKD SAVINGS",
      fromAccount: "040-286XXX-838",
      when: "03 Mar 2026",
      files: [
        {
          id: "m1",
          name: "01 Nov 2025_ChunFatSeafood_240 1.pdf",
          details: {
            createdAt: "03 Mar 2026 13:36 HKT",
            amount: "HK$ 1,500.00",
            when: "03 Mar 2026",
          },
        },
        {
          id: "m2",
          name: "Metro_Office_slip_2.pdf",
          details: {
            createdAt: "10 Mar 2026 09:15 HKT",
            amount: "HK$ 320.00",
            when: "10 Mar 2026",
            toName: "Metro Office Supplies",
          },
        },
      ],
    },
    currencyCode: "HKD",
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
    currencyCode: "HKD",
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

const uploadBankslipReadOnlyClass =
  "box-border inline-flex h-10 min-h-10 w-max max-w-full cursor-default items-center justify-center gap-2 rounded-lg border-2 border-primary/15 bg-[#F5F5F5] px-3 text-xs font-semibold text-primary/40 sm:h-[42px] sm:min-h-[42px] sm:px-4 sm:text-sm";

const rowMenuButtonClass =
  "box-border inline-flex h-9 min-h-9 w-9 min-w-9 cursor-pointer items-center justify-center rounded-lg text-primary transition-colors hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:text-primary/35 disabled:hover:bg-transparent sm:h-10 sm:min-h-10 sm:w-10 sm:min-w-10";

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
  onRowClick?: (rowId: string) => void;
  loading?: boolean;
  /** Called whenever the set of selected row ids changes (for toolbar bulk actions). */
  onSelectionChange?: (selectedIds: string[]) => void;
  /** After bank slip files are uploaded via API for a bill. */
  onBankSlipUploaded?: () => void;
};

export type PaymentRequestTableHandle = {
  clearSelection: () => void;
  /** Opens the Upload bank slip modal for the given bill (same as the row Upload control). */
  openBankSlipUpload: (billId: string) => void;
};

const ROW_MENU_MIN_WIDTH_PX = 160;
const COLUMNS_MENU_WIDTH_PX = 288;

type RowMenuState = { rowId: string; top: number; left: number };
type ColumnsMenuState = { top: number; left: number };
type ColumnSelectorKey = "contact" | "submittedDate" | "invoiceDate" | "status" | "unpaidAmount";

const COLUMN_SELECTOR_ITEMS: Array<{ key: ColumnSelectorKey; label: string }> = [
  { key: "contact", label: "Contact / Description" },
  { key: "submittedDate", label: "Submitted Date" },
  { key: "invoiceDate", label: "Invoice Date" },
  { key: "status", label: "Status" },
  { key: "unpaidAmount", label: "Unpaid Amount" },
];

const TITLE_SELECTOR_KEY: Partial<Record<PaymentRequestColumnTitle, ColumnSelectorKey>> = {
  "Contact / Description": "contact",
  "Submitted Date": "submittedDate",
  "Invoice Date": "invoiceDate",
  Status: "status",
  "Unpaid Amount": "unpaidAmount",
};

const SELECTOR_TITLE: Record<ColumnSelectorKey, PaymentRequestColumnTitle> = {
  contact: "Contact / Description",
  submittedDate: "Submitted Date",
  invoiceDate: "Invoice Date",
  status: "Status",
  unpaidAmount: "Unpaid Amount",
};

const NON_SELECTOR_TITLES: PaymentRequestColumnTitle[] = COLUMN_TITLES.filter((title) => !TITLE_SELECTOR_KEY[title]);

function getBankSlipDetailsForRow(row: PaymentRequestRow): BankSlipDetails {
  if (row.bankSlipDetails) return row.bankSlipDetails;
  const count = Math.max(0, row.bankslipFileCount ?? 0);
  const files = Array.from({ length: count }, (_, i) => ({
    id: `${row.id}-slip-${i}`,
    name: `${row.contactTitle.replace(/\s+/g, "_")}_slip_${i + 1}.pdf`,
  }));
  return {
    createdBy: "John Doe",
    createdAt: `${row.submittedDate} 13:36 HKT`,
    toName: row.contactTitle,
    toAccount: "147-622484-838",
    amount: row.unpaidAmount.trim() ? row.unpaidAmount : "—",
    fromName: "BUSINESS INTEGRATED SAVINGS - HKD SAVINGS",
    fromAccount: "040-286XXX-838",
    when: row.paidDate.trim() ? row.paidDate : row.invoiceDate,
    files,
  };
}

export const PaymentRequestTable = forwardRef<PaymentRequestTableHandle, PaymentRequestTableProps>(function PaymentRequestTable(
  {
    rows = DEMO_ROWS,
    onRecordPayment,
    statusFilter = "All",
    onRowDelete,
    onRowPublish,
    onRowRepublish,
    onRowClick,
    loading = false,
    onSelectionChange,
    onBankSlipUploaded,
  },
  ref,
) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bankslipModalRowId, setBankslipModalRowId] = useState<string | null>(null);
  const [bankSlipDetailsRowId, setBankSlipDetailsRowId] = useState<string | null>(null);
  const [rowMenu, setRowMenu] = useState<RowMenuState | null>(null);
  const [rowDeleteConfirmId, setRowDeleteConfirmId] = useState<string | null>(null);
  const [rowDeletePending, setRowDeletePending] = useState(false);
  const [columnsMenu, setColumnsMenu] = useState<ColumnsMenuState | null>(null);
  const [sort, setSort] = useState<{ key: SortKey | null; dir: "asc" | "desc" }>({ key: "status", dir: "asc" });
  const [columnVisibility, setColumnVisibility] = useState<Record<ColumnSelectorKey, boolean>>({
    contact: true,
    submittedDate: true,
    invoiceDate: true,
    status: true,
    unpaidAmount: true,
  });
  const [columnOrder, setColumnOrder] = useState<ColumnSelectorKey[]>(() => COLUMN_SELECTOR_ITEMS.map((item) => item.key));
  const [draggingColumnKey, setDraggingColumnKey] = useState<ColumnSelectorKey | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  /** Bill id for the open bank slip details modal — stable when transitioning to Upload modal. */
  const bankSlipDetailsBillIdRef = useRef<string | null>(null);

  const rowIdSet = useMemo(() => new Set(rows.map((r) => r.id)), [rows]);

  useImperativeHandle(ref, () => ({
    clearSelection: () => setSelectedIds(new Set()),
    openBankSlipUpload: (billId: string) => setBankslipModalRowId(billId),
  }));

  useEffect(() => {
    onSelectionChange?.([...selectedIds]);
  }, [selectedIds, onSelectionChange]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const next = new Set(
        [...prev].filter((id) => {
          if (!rowIdSet.has(id)) return false;
          const r = rows.find((x) => x.id === id);
          return r != null && r.status !== "Voided";
        }),
      );
      if (next.size === prev.size && [...prev].every((id) => next.has(id))) return prev;
      return next;
    });
  }, [rowIdSet, rows]);

  const visibleRows = useMemo(
    () => (statusFilter === "All" ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  const sortedVisibleRows = useMemo(() => {
    if (!sort.key) return visibleRows;
    const next = [...visibleRows];
    next.sort((a, b) => compareRows(a, b, sort.key!, sort.dir));
    return next;
  }, [visibleRows, sort.key, sort.dir]);

  const selectableVisibleRows = useMemo(
    () => visibleRows.filter((r) => r.status !== "Voided"),
    [visibleRows],
  );

  const allSelected =
    selectableVisibleRows.length > 0 && selectableVisibleRows.every((r) => selectedIds.has(r.id));
  const someSelected =
    selectableVisibleRows.some((r) => selectedIds.has(r.id)) && !allSelected;
  const visibleSelectorCount = COLUMN_SELECTOR_ITEMS.reduce((n, item) => n + (columnVisibility[item.key] ? 1 : 0), 0);
  const tableColCount = 1 + visibleSelectorCount + 2 + 2;
  const orderedTableTitles = useMemo(() => [...columnOrder.map((key) => SELECTOR_TITLE[key]), ...NON_SELECTOR_TITLES], [columnOrder]);
  const orderedSelectorItems = useMemo(
    () => columnOrder.map((key) => COLUMN_SELECTOR_ITEMS.find((item) => item.key === key)).filter((item): item is { key: ColumnSelectorKey; label: string } => item != null),
    [columnOrder],
  );

  const bankSlipDetailsSourceRow = useMemo(() => {
    if (!bankSlipDetailsRowId) return undefined;
    return rows.find((x) => x.id === bankSlipDetailsRowId);
  }, [bankSlipDetailsRowId, rows]);

  const bankSlipDetailsPayload = useMemo(() => {
    if (!bankSlipDetailsSourceRow) return null;
    return getBankSlipDetailsForRow(bankSlipDetailsSourceRow);
  }, [bankSlipDetailsSourceRow]);

  const bankSlipDetailsReadOnly =
    bankSlipDetailsSourceRow != null &&
    (bankSlipDetailsSourceRow.status === "Voided" || bankSlipDetailsSourceRow.status === "Draft");

  useEffect(() => {
    setSelectedIds(new Set());
    setSort({ key: "status", dir: "asc" });
    setRowMenu(null);
    setRowDeleteConfirmId(null);
    setColumnsMenu(null);
    setBankslipModalRowId(null);
    setBankSlipDetailsRowId(null);
  }, [statusFilter]);

  const onSortColumn = (sk: SortKey) => {
    setSort((s) => (s.key === sk ? { key: sk, dir: s.dir === "asc" ? "desc" : "asc" } : { key: sk, dir: "asc" }));
  };

  useEffect(() => {
    const el = headerCheckboxRef.current;
    if (el) el.indeterminate = someSelected;
  }, [someSelected]);

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(selectableVisibleRows.map((r) => r.id)));
  };

  const toggleRow = (id: string) => {
    const r = rows.find((x) => x.id === id);
    if (r?.status === "Voided") return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const bankslipModalRow = bankslipModalRowId ? rows.find((r) => r.id === bankslipModalRowId) : undefined;
  const rowMenuRow = rowMenu ? rows.find((r) => r.id === rowMenu.rowId) : undefined;
  const isRowMenuDeleteDisabled = rowMenuRow?.status === "Voided";
  const rowMenuPaidOrPaymentRequested =
    rowMenuRow?.status === "Paid" || rowMenuRow?.status === "Payment Requested";
  const rowMenuPublishedToXero = rowMenuRow?.xeroActive === true;
  const showRowMenuPublish =
    rowMenuRow != null &&
    rowMenuRow.status !== "Draft" &&
    (rowMenuPaidOrPaymentRequested ? !rowMenuPublishedToXero : true);
  const showRowMenuRepublish =
    rowMenuRow != null &&
    rowMenuRow.status !== "Draft" &&
    (rowMenuPaidOrPaymentRequested ? rowMenuPublishedToXero : true);
  const rowDeleteContactTitle = useMemo(() => {
    if (!rowDeleteConfirmId) return "";
    return rows.find((r) => r.id === rowDeleteConfirmId)?.contactTitle ?? "";
  }, [rowDeleteConfirmId, rows]);

  const confirmRowDelete = useCallback(async () => {
    if (!rowDeleteConfirmId) return;
    setRowDeletePending(true);
    try {
      await Promise.resolve(onRowDelete?.(rowDeleteConfirmId));
      setRowDeleteConfirmId(null);
    } catch {
      /* error surfaced by parent */
    } finally {
      setRowDeletePending(false);
    }
  }, [rowDeleteConfirmId, onRowDelete]);

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

  const toggleColumnsMenu = (trigger: HTMLButtonElement) => {
    const r = trigger.getBoundingClientRect();
    const left = Math.max(8, r.right - COLUMNS_MENU_WIDTH_PX);
    const top = r.bottom + 6;
    setColumnsMenu((open) => (open ? null : { top, left }));
  };

  const moveColumnOrder = (source: ColumnSelectorKey, target: ColumnSelectorKey) => {
    if (source === target) return;
    setColumnOrder((prev) => {
      const from = prev.indexOf(source);
      const to = prev.indexOf(target);
      if (from < 0 || to < 0) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  useEffect(() => {
    if (!columnsMenu) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setColumnsMenu(null);
    };
    const onMouseDown = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("[data-columns-menu-panel]")) return;
      if (t.closest("[data-columns-menu-trigger]")) return;
      setColumnsMenu(null);
    };
    const onScroll = () => setColumnsMenu(null);
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onMouseDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [columnsMenu]);

  return (
    <div className="w-full min-w-0 px-4 pb-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:hidden" role="list" aria-label="Payment requests">
        {loading ? (
          <div className="rounded-xl border border-gray-200 bg-[#F5F5F5] px-4 py-10 text-center text-sm text-primary/60">
            <span className="inline-flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin text-secondary text-[22px]">progress_activity</span>
              Loading bills…
            </span>
          </div>
        ) : visibleRows.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-[#F5F5F5] px-4 py-8 text-center text-sm text-primary/70">No payment requests match this status.</div>
        ) : (
          sortedVisibleRows.map((row) => {
            const isPaid = row.status === "Paid";
            const isVoided = row.status === "Voided";
            const isPaymentRequested = row.status === "Payment Requested";
            const isDraft = row.status === "Draft";
            const isReturned = row.status === "Returned";
            const bankslipReadOnly = isVoided || isDraft;
            const xeroConnected = !isDraft && row.xeroActive;
            const statusBadgeClass = isPaid
              ? statusTagPaidClass
              : isPaymentRequested
                ? statusTagPaymentRequestedClass
                : isReturned
                  ? statusTagReturnedClass
                  : statusTagClass;
            const articleClassName = `rounded-xl border border-gray-200 p-4 shadow-sm transition-colors ${isPaid ? "bg-[#54D3DA]/10" : isPaymentRequested ? "bg-[#FF6B6B]/10" : "bg-[#F5F5F5]"} ${isVoided ? "cursor-default opacity-90" : isPaid ? "cursor-pointer active:bg-[#54D3DA]/20" : isPaymentRequested ? "cursor-pointer active:bg-[#FF6B6B]/20" : "cursor-pointer active:bg-gray-200/60"}`;
            return (
              <article key={row.id} role="listitem" className={articleClassName} onClick={() => { if (isVoided) return; onRowClick?.(row.id); }}>
                <div className="flex gap-3">
                  <div className="hidden shrink-0 pt-0.5 sm:block" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.has(row.id)} disabled={isVoided} onChange={() => toggleRow(row.id)} className={`${HEADER_CHECKBOX_CLASS} disabled:cursor-not-allowed disabled:opacity-40`} aria-label={isVoided ? `Voided — cannot select ${row.contactTitle}` : `Select row ${row.contactTitle}`} suppressHydrationWarning />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold leading-snug text-primary">{row.contactTitle}</h3>
                        {row.contactCaption ? (
                          <p className="mt-0.5 min-w-0 max-w-full text-xs leading-snug text-primary/60" title={row.contactCaption}>
                            {truncateMobileBillDescription(row.contactCaption)}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center" onClick={(e) => e.stopPropagation()}>
                        <img src={xeroConnected ? "/xero-active.png" : "/xero-inactive.png"} alt={xeroConnected ? "Xero connected" : "Xero not connected"} width={40} height={40} className="h-10 w-10 object-contain" />
                      </div>
                    </div>
                    <div className="mt-4 flex min-w-0 flex-col gap-2">
                      {row.status ? (
                        <div className="flex w-full justify-end">
                          <span className={statusBadgeClass}>{row.status}</span>
                        </div>
                      ) : null}
                      <div className="flex min-w-0 items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-col gap-0.5">
                          <span className="text-[10px] font-medium uppercase tracking-wide text-primary/45">Invoice date</span>
                          <span className="text-sm font-semibold tabular-nums text-primary">{row.invoiceDate}</span>
                        </div>
                        {row.unpaidAmount || row.invoiceTotal ? (
                          <div className="shrink-0 space-y-0.5 text-right">
                            {row.unpaidAmount ? (
                              <p className={"text-base font-semibold tabular-nums " + unpaidAmountTextClass(row.status)}>{row.unpaidAmount}</p>
                            ) : null}
                            {row.invoiceTotal ? (
                              <p className="text-[11px] tabular-nums text-primary/55">(Inv total HK$ {row.invoiceTotal})</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="mt-4 flex min-h-[2.5rem] min-w-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex min-w-0 min-h-10 flex-1 flex-wrap items-center gap-2">
                        {!isPaid && !isVoided && !isDraft ? (
                          <button type="button" aria-label={`Record payment for ${row.contactTitle}`} onClick={(e) => { e.stopPropagation(); onRecordPayment?.(row.id); }} className={recordPaymentButtonClass}>
                            <span className="whitespace-nowrap">Record Payment</span>
                            <span className="material-symbols-outlined shrink-0 text-[20px] leading-none" aria-hidden>add</span>
                          </button>
                        ) : null}
                        {row.bankslipFileCount != null && row.bankslipFileCount > 0 ? (
                          <button
                            type="button"
                            className={`inline-flex h-10 min-h-10 cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${bankslipReadOnly ? "text-primary/40" : "text-secondary"}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              bankSlipDetailsBillIdRef.current = row.id;
                              setBankSlipDetailsRowId(row.id);
                            }}
                            aria-label={
                              isVoided
                                ? `View bank slip — voided, ${row.bankslipFileCount} file${row.bankslipFileCount === 1 ? "" : "s"}`
                                : isDraft
                                  ? `View bank slip — draft, ${row.bankslipFileCount} file${row.bankslipFileCount === 1 ? "" : "s"}`
                                  : `View bank slip — ${row.bankslipFileCount} file${row.bankslipFileCount === 1 ? "" : "s"} uploaded`
                            }
                          >
                            <span className="text-sm font-semibold tabular-nums">{row.bankslipFileCount}</span>
                            <span className="material-symbols-outlined shrink-0 text-[20px] leading-none" aria-hidden>draft</span>
                          </button>
                        ) : null}
                      </div>
                      <div className="flex h-10 min-h-10 shrink-0 items-center justify-end">
                        {bankslipReadOnly ? (
                          <div className={uploadBankslipReadOnlyClass} aria-label={isVoided ? `Voided — upload not available for ${row.contactTitle}` : `Draft — upload not available for ${row.contactTitle}`}>
                            <span className="whitespace-nowrap">Upload</span>
                            <span className="material-symbols-outlined shrink-0 text-[20px] leading-none" aria-hidden>upload_file</span>
                          </div>
                        ) : row.bankslipFileCount != null && row.bankslipFileCount > 0 ? null : (
                          <button type="button" className={uploadBankslipButtonClass} onClick={(e) => { e.stopPropagation(); setBankslipModalRowId(row.id); }}>
                            <span className="whitespace-nowrap">Upload</span>
                            <span className="material-symbols-outlined shrink-0 text-[20px] leading-none" aria-hidden>upload_file</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-gray-200 sm:block">
        <div className="overflow-x-auto touch-pan-x [-webkit-overflow-scrolling:touch]">
          <table className="min-w-[82rem] w-full border-collapse text-left">
            <thead>
              <tr>
                <th scope="col" className="w-12 min-w-[2.75rem] border-b border-gray-200 bg-[#9CA3AF] px-2 py-3 text-center sm:px-3 sm:py-3.5">
                  <input ref={headerCheckboxRef} type="checkbox" checked={allSelected} onChange={toggleAll} disabled={selectableVisibleRows.length === 0} className={`${HEADER_CHECKBOX_CLASS} disabled:cursor-not-allowed disabled:opacity-40`} aria-label="Select all rows" suppressHydrationWarning />
                </th>
                {orderedTableTitles.map((title) => {
                  const selectorKey = TITLE_SELECTOR_KEY[title];
                  if (selectorKey && !columnVisibility[selectorKey]) return null;
                  const sortKeyForCol = SORTABLE_TITLE[title];
                  const sortActive = sortKeyForCol != null && sort.key === sortKeyForCol;
                  const thBase = `border-b border-gray-200 px-4 py-3 text-left text-xs sm:px-5 sm:py-3.5 sm:text-sm ${isActionColumnTitle(title) ? "bg-secondary text-white" : "bg-[#9CA3AF] text-white"} ${title === "Contact / Description" ? "min-w-[14rem]" : title === "Payment" || title === "Bankslip" ? "min-w-[11rem] whitespace-nowrap" : title === "Invoice Date" || title === "Paid Date" ? "min-w-[9rem] whitespace-nowrap" : title === "Status" ? "min-w-[10rem] whitespace-nowrap" : title === "Unpaid Amount" ? "min-w-[13rem] whitespace-nowrap" : "min-w-[7rem] whitespace-nowrap"}`;
                  const hoverSort = title === "Paid Date" ? "hover:bg-white/15 focus-visible:outline-white/60" : "hover:bg-black/10 focus-visible:outline-white/60";
                  return (
                    <th key={title} scope="col" aria-sort={sortActive ? (sort.dir === "asc" ? "ascending" : "descending") : undefined} className={thBase}>
                      {sortKeyForCol ? (
                        <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
                          <span className="min-w-0 flex-1 truncate font-semibold">{title}</span>
                          <button type="button" className={`inline-flex size-7 shrink-0 cursor-pointer items-center justify-center rounded outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${hoverSort}`} aria-label={`Sort by ${title}${sortActive ? `, ${sort.dir === "asc" ? "ascending" : "descending"}` : ""}`} onClick={() => onSortColumn(sortKeyForCol)}>
                            <span className="inline-flex size-5 items-center justify-center" aria-hidden>
                              <span className={`material-symbols-outlined block text-[18px] leading-none ${sortActive ? "opacity-100" : "opacity-60"}`}>{sortActive ? (sort.dir === "asc" ? "expand_less" : "expand_more") : "expand_more"}</span>
                            </span>
                          </button>
                        </div>
                      ) : (
                        <span className="font-semibold">{title}</span>
                      )}
                    </th>
                  );
                })}
                <th scope="col" colSpan={2} aria-label="Actions" className="border-b border-gray-200 bg-secondary px-2 py-2 text-right text-white sm:px-3 sm:py-2.5">
                  <button type="button" data-columns-menu-trigger className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-white/40 bg-white/15 px-3 text-sm font-medium text-white transition-colors hover:bg-white/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" aria-label="Columns" aria-expanded={columnsMenu ? "true" : "false"} aria-haspopup="dialog" onClick={(e) => { e.stopPropagation(); toggleColumnsMenu(e.currentTarget); }}>
                    <span>Columns</span>
                    <span className="material-symbols-outlined text-[18px] leading-none" aria-hidden>vertical_split</span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {loading ? (
                <tr>
                  <td colSpan={tableColCount} className="border-b border-gray-100 px-4 py-10 text-center text-sm text-primary/60 sm:px-5">
                    <span className="inline-flex items-center gap-2">
                      <span className="material-symbols-outlined animate-spin text-secondary text-[22px]">progress_activity</span>
                      Loading bills…
                    </span>
                  </td>
                </tr>
              ) : visibleRows.length === 0 ? (
                <tr>
                  <td colSpan={tableColCount} className="border-b border-gray-100 px-4 py-8 text-center text-sm text-primary/70 sm:px-5">No payment requests match this status.</td>
                </tr>
              ) : null}
              {sortedVisibleRows.map((row) => {
                const isPaid = row.status === "Paid";
                const isVoided = row.status === "Voided";
                const isPaymentRequested = row.status === "Payment Requested";
                const isDraft = row.status === "Draft";
                const isReturned = row.status === "Returned";
                const bankslipReadOnly = isVoided || isDraft;
                const xeroConnected = !isDraft && row.xeroActive;
                return (
                  <tr key={row.id} className={`transition-colors duration-150 ease-out ${isVoided ? "cursor-default" : "cursor-pointer hover:bg-gray-50"}`} onClick={() => { if (isVoided) return; onRowClick?.(row.id); }} aria-disabled={isVoided ? "true" : undefined}>
                    <td className="border-b border-gray-100 px-2 py-3 text-center align-middle sm:px-3">
                      <input type="checkbox" checked={selectedIds.has(row.id)} disabled={isVoided} onChange={() => toggleRow(row.id)} onClick={(e) => e.stopPropagation()} className={`${HEADER_CHECKBOX_CLASS} disabled:cursor-not-allowed disabled:opacity-40`} aria-label={isVoided ? `Voided — cannot select ${row.contactTitle}` : `Select row ${row.contactTitle}`} suppressHydrationWarning />
                    </td>
                    {orderedTableTitles.map((title) => {
                      const selectorKey = TITLE_SELECTOR_KEY[title];
                      if (selectorKey && !columnVisibility[selectorKey]) return null;
                      switch (title) {
                        case "Contact / Description":
                          return (
                            <td key={title} className={contactCellClass}>
                              <div className="flex min-w-0 flex-col gap-0.5">
                                <span className="text-sm font-semibold text-primary sm:text-base">{row.contactTitle}</span>
                                {row.contactCaption ? <span className="text-xs text-primary/65 sm:text-sm">{row.contactCaption}</span> : null}
                              </div>
                            </td>
                          );
                        case "Invoice Date":
                          return <td key={title} className={singleLineDateCellClass}>{row.invoiceDate}</td>;
                        case "Status":
                          return (
                            <td key={title} className={singleLineStatusCellClass}>
                              {row.status ? <span className={isPaid ? statusTagPaidClass : isPaymentRequested ? statusTagPaymentRequestedClass : isReturned ? statusTagReturnedClass : statusTagClass}>{row.status}</span> : null}
                            </td>
                          );
                        case "Submitted Date":
                          return <td key={title} className={invoiceDateCellClass}>{row.submittedDate}</td>;
                        case "Unpaid Amount":
                          return (
                            <td key={title} className={unpaidAmountCellClass}>
                              {row.unpaidAmount || row.invoiceTotal ? (
                                <div className="flex min-w-0 flex-col gap-0.5">
                                  {row.unpaidAmount ? <span className={"whitespace-nowrap text-sm font-semibold sm:text-base " + unpaidAmountTextClass(row.status)}>{row.unpaidAmount}</span> : null}
                                  {row.invoiceTotal ? <span className="whitespace-nowrap text-xs text-primary/65 tabular-nums sm:text-sm">(Inv total HK$ {row.invoiceTotal})</span> : null}
                                </div>
                              ) : null}
                            </td>
                          );
                        case "Payment":
                          return (
                            <td key={title} className={`${dataCellBase} align-middle text-left ${actionBodyCellBg}`}>
                              <button
                                type="button"
                                disabled={isPaid || isVoided || isDraft}
                                aria-label={
                                  isVoided
                                    ? `Voided — record payment not available for ${row.contactTitle}`
                                    : isDraft
                                      ? `Draft — record payment not available for ${row.contactTitle}`
                                      : isPaid
                                        ? `Already paid — ${row.contactTitle}`
                                        : `Record payment for ${row.contactTitle}`
                                }
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isPaid || isVoided || isDraft) return;
                                  onRecordPayment?.(row.id);
                                }}
                                className={recordPaymentButtonClass}
                              >
                                <span className="whitespace-nowrap">Record Payment</span>
                                <span className="material-symbols-outlined shrink-0 text-[20px] leading-none sm:text-[22px]" aria-hidden>add</span>
                              </button>
                            </td>
                          );
                        case "Paid Date":
                          return (
                            <td key={title} className={`${singleLineDateCellClass} ${actionBodyCellBg}`}>
                              {row.paidDate.trim() ? row.paidDate : <span className="text-primary/40 tabular-nums" aria-label="No paid date">-</span>}
                            </td>
                          );
                        case "Bankslip":
                          return (
                            <td key={title} className={`${invoiceDateCellClass} ${actionBodyCellBg}`}>
                              {row.bankslipFileCount != null && row.bankslipFileCount > 0 ? (
                                <button
                                  type="button"
                                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border-0 bg-transparent transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:gap-2 ${bankslipReadOnly ? "text-primary/40" : "text-secondary"}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    bankSlipDetailsBillIdRef.current = row.id;
                                    setBankSlipDetailsRowId(row.id);
                                  }}
                                  aria-label={
                                    isVoided
                                      ? `View bank slip — voided, ${row.bankslipFileCount} file${row.bankslipFileCount === 1 ? "" : "s"}`
                                      : isDraft
                                        ? `View bank slip — draft, ${row.bankslipFileCount} file${row.bankslipFileCount === 1 ? "" : "s"}`
                                        : `View bank slip — ${row.bankslipFileCount} file${row.bankslipFileCount === 1 ? "" : "s"} uploaded`
                                  }
                                >
                                  <span className="text-sm font-semibold tabular-nums sm:text-base">{row.bankslipFileCount}</span>
                                  <span className="material-symbols-outlined shrink-0 text-[20px] leading-none sm:text-[22px]" aria-hidden>draft</span>
                                </button>
                              ) : bankslipReadOnly ? (
                                <div
                                  className={uploadBankslipReadOnlyClass}
                                  aria-label={
                                    isVoided
                                      ? `Voided — upload not available for ${row.contactTitle}`
                                      : `Draft — upload not available for ${row.contactTitle}`
                                  }
                                >
                                  <span className="whitespace-nowrap">Upload</span>
                                  <span className="material-symbols-outlined shrink-0 text-[20px] leading-none sm:text-[22px]" aria-hidden>upload_file</span>
                                </div>
                              ) : (
                                <button type="button" className={uploadBankslipButtonClass} onClick={(e) => { e.stopPropagation(); setBankslipModalRowId(row.id); }}><span className="whitespace-nowrap">Upload</span><span className="material-symbols-outlined shrink-0 text-[20px] leading-none sm:text-[22px]" aria-hidden>upload_file</span></button>
                              )}
                            </td>
                          );
                        default:
                          return null;
                      }
                    })}
                    <td className={`border-b border-gray-100 px-2 py-3 text-center align-middle sm:px-3 ${actionBodyCellBg}`}>
                      <img src={xeroConnected ? "/xero-active.png" : "/xero-inactive.png"} alt={xeroConnected ? "Xero connected" : "Xero not connected"} width={40} height={40} className="mx-auto h-10 w-10 max-h-10 max-w-10 object-contain" />
                    </td>
                    <td className={`border-b border-gray-100 px-2 py-3 text-center align-middle sm:px-3 ${actionBodyCellBg}`}>
                      <button type="button" data-row-menu-trigger disabled={isVoided} className={rowMenuButtonClass} aria-label={isVoided ? `Voided — row actions not available for ${row.contactTitle}` : `More options for ${row.contactTitle}`} aria-expanded={rowMenu?.rowId === row.id ? "true" : "false"} aria-haspopup={isVoided ? undefined : "menu"} onClick={(e) => { e.stopPropagation(); if (isVoided) return; toggleRowMenu(row.id, e.currentTarget); }}>
                        <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>more_vert</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <UploadBankslipModal
        open={bankslipModalRowId != null}
        billId={bankslipModalRowId}
        currencyCode={bankslipModalRow?.currencyCode ?? "HKD"}
        contactTitle={bankslipModalRow?.contactTitle}
        onClose={() => setBankslipModalRowId(null)}
        onUploaded={onBankSlipUploaded}
      />
      {bankSlipDetailsRowId != null && bankSlipDetailsPayload ? (
        <BankSlipDetailsModal
          open
          onClose={() => setBankSlipDetailsRowId(null)}
          details={bankSlipDetailsPayload}
          allowRemoveFiles={!bankSlipDetailsReadOnly}
          onBankSlipFileDeleted={onBankSlipUploaded}
          onUpload={
            bankSlipDetailsReadOnly
              ? undefined
              : () => {
                  const id = bankSlipDetailsBillIdRef.current;
                  setBankSlipDetailsRowId(null);
                  if (id) setBankslipModalRowId(id);
                }
          }
        />
      ) : null}
      {rowMenu
        ? createPortal(
            <div data-row-menu-panel role="menu" aria-label="Row actions" className="fixed z-[400] rounded-lg border border-gray-200 bg-white py-1 shadow-lg" style={{ top: rowMenu.top, left: rowMenu.left, minWidth: ROW_MENU_MIN_WIDTH_PX }}>
              <button type="button" role="menuitem" disabled={isRowMenuDeleteDisabled} className="block w-full px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => { if (isRowMenuDeleteDisabled) return; const id = rowMenu.rowId; setRowMenu(null); setRowDeleteConfirmId(id); }}>
                Delete
              </button>
              {showRowMenuPublish ? (
                <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-gray-100" onClick={() => { onRowPublish?.(rowMenu.rowId); setRowMenu(null); }}>
                  Publish
                </button>
              ) : null}
              {showRowMenuRepublish ? <button type="button" role="menuitem" className="block w-full px-3 py-2 text-left text-sm font-medium text-primary transition-colors hover:bg-gray-100" onClick={() => { onRowRepublish?.(rowMenu.rowId); setRowMenu(null); }}>Republish</button> : null}
            </div>,
            document.body,
          )
        : null}
      {columnsMenu
        ? createPortal(
            <div data-columns-menu-panel role="dialog" aria-label="Columns selector" className="fixed z-[400] w-[min(18rem,calc(100vw-1rem))] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg" style={{ top: columnsMenu.top, left: columnsMenu.left }}>
              <div className="border-b border-gray-200 px-3 py-2">
                <h3 className="text-sm font-semibold text-primary">Columns</h3>
                <p className="mt-1 text-xs leading-snug text-primary/65">Select columns to show in the column or drag to reorder.</p>
              </div>
              <ul className="max-h-[min(22rem,55dvh)] overflow-y-auto overscroll-contain py-1">
                {orderedSelectorItems.map((item) => (
                  <li key={item.key}>
                    <label className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-gray-100" draggable onDragStart={() => setDraggingColumnKey(item.key)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (!draggingColumnKey) return; moveColumnOrder(draggingColumnKey, item.key); setDraggingColumnKey(null); }} onDragEnd={() => setDraggingColumnKey(null)}>
                      <span className="material-symbols-outlined shrink-0 text-[20px] leading-none text-primary/55" aria-hidden>drag_indicator</span>
                      <span className="min-w-0 flex-1 truncate">{item.label}</span>
                      <input type="checkbox" className={HEADER_CHECKBOX_CLASS} checked={columnVisibility[item.key]} onChange={() => setColumnVisibility((prev) => ({ ...prev, [item.key]: !prev[item.key] }))} aria-label={`Toggle ${item.label} column`} suppressHydrationWarning />
                    </label>
                  </li>
                ))}
              </ul>
              <div className="border-t border-gray-200 px-3 py-2 text-right">
                <button type="button" className="inline-flex h-9 items-center rounded-lg bg-secondary px-4 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary" onClick={() => setColumnsMenu(null)}>Save Changes</button>
              </div>
            </div>,
            document.body,
          )
        : null}
      <RowDeleteConfirmModal
        open={rowDeleteConfirmId != null}
        contactTitle={rowDeleteContactTitle}
        pending={rowDeletePending}
        onClose={() => {
          if (!rowDeletePending) setRowDeleteConfirmId(null);
        }}
        onConfirm={confirmRowDelete}
      />
    </div>
  );
});

export { COLUMN_TITLES };
