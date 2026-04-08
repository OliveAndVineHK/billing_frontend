"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentRequestTable, type PaymentRequestRow, type PaymentRequestTableHandle } from "./PaymentRequestTable";
import { PaymentRequestToolbar, type PaymentRequestStatusFilter } from "./PaymentRequestToolbar";
import { BulkDeleteConfirmModal } from "./BulkDeleteConfirmModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { billStatusToDisplayLabel } from "@/lib/billStatusDisplay";
import { deleteBill, fetchBills, publishBill, type BillListItem } from "@/lib/api";
import { currencyLabelForCode } from "@/lib/currencyDisplay";
import { fetchBillBankSlipEnrichment } from "@/lib/bankSlipEnrichment";
import { formatIsoDateAsDdMmmYyyy } from "@/lib/dateDisplayFormat";
import { useUserRole } from "@/lib/useUserRole";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const head = dateStr.trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(head)) {
    const f = formatIsoDateAsDdMmmYyyy(head);
    if (f) return f;
  }
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return formatIsoDateAsDdMmmYyyy(`${y}-${m}-${day}`) || dateStr;
}

function formatAmount(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function mapBillToRow(bill: BillListItem): PaymentRequestRow {
  const status = billStatusToDisplayLabel(bill.status);
  const iso = (bill.currency_code && bill.currency_code.trim()) || "HKD";
  const symbol = currencyLabelForCode(iso);
  const statusNorm = (bill.status ?? "").trim().toLowerCase().replace(/-/g, "_");
  const xeroActive =
    (bill.published ?? "").trim() === "published" ||
    statusNorm === "authorised" ||
    statusNorm === "authorized";

  return {
    id: bill.id,
    contactTitle: bill.contact || "—",
    contactCaption: bill.description,
    currencyCode: iso,
    invoiceDate: bill.invoice_date ? formatDate(bill.invoice_date) : "",
    status,
    submittedDate: formatDate(bill.created_at),
    unpaidAmount:
      parseFloat(bill.amount_due) !== 0
        ? `${symbol} ${formatAmount(bill.amount_due)}`
        : `${symbol} 0.00`,
    invoiceTotal: bill.amount ? formatAmount(bill.amount) : "",
    payment: "",
    paidDate: bill.paid_at ? formatDate(bill.paid_at) : "",
    bankslip: "",
    xeroActive,
  };
}

const STATUS_LABEL_TO_API: Record<string, string> = {
  "Draft": "draft",
  "Payment Requested": "submitted",
  "Paid": "paid",
  "Partially paid": "partially_paid",
  "Voided": "voided",
  "Returned": "returned",
};

const DATE_TYPE_TO_FIELD: Record<string, string> = {
  "Invoice Date": "invoice_date",
  "Submitted Date": "created_at",
};

export function PaymentRequestView() {
  const router = useRouter();
  const { isElevated } = useUserRole();
  const [statusFilter, setStatusFilter] =
    useState<PaymentRequestStatusFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [dateType, setDateType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [rawBills, setRawBills] = useState<BillListItem[]>([]);
  const [bills, setBills] = useState<PaymentRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordPaymentTarget, setRecordPaymentTarget] = useState<{ billId: string; readOnly: boolean } | null>(null);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const tableRef = useRef<PaymentRequestTableHandle>(null);
  const bulkActionsEnabled = selectedBillIds.length >= 2;

  const selectionContainsPaid = useMemo(() => {
    const selectedSet = new Set(selectedBillIds);
    return bills.some(
      (row) =>
        selectedSet.has(row.id) && (row.status === "Paid" || row.status === "Partially paid"),
    );
  }, [selectedBillIds, bills]);

  const onTableSelectionChange = useCallback((ids: string[]) => {
    setSelectedBillIds(ids);
  }, []);

  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === "") {
      setDebouncedSearch("");
      return;
    }
    const id = window.setTimeout(() => setDebouncedSearch(trimmed), 300);
    return () => window.clearTimeout(id);
  }, [searchQuery]);

  const loadBills = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiStatus = statusFilter !== "All" ? STATUS_LABEL_TO_API[statusFilter] : undefined;
      const dateField = DATE_TYPE_TO_FIELD[dateType];
      const data = await fetchBills({
        page_size: 100,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(apiStatus ? { status: apiStatus } : {}),
        ...(minAmount !== "" ? { amount_min: parseFloat(minAmount) } : {}),
        ...(maxAmount !== "" ? { amount_max: parseFloat(maxAmount) } : {}),
        ...(dateField ? { date_field: dateField } : {}),
        ...(startDate ? { date_from: startDate } : {}),
        ...(endDate ? { date_to: endDate } : {}),
      });
      setRawBills(data);
      const mapped = data.map(mapBillToRow);
      setBills(mapped);
      const BATCH = 5;
      const enriched: PaymentRequestRow[] = [];
      for (let i = 0; i < mapped.length; i += BATCH) {
        const batch = mapped.slice(i, i + BATCH);
        const chunk = await Promise.all(
          batch.map(async (r) => {
            const { bankslipFileCount, bankSlipDetails } = await fetchBillBankSlipEnrichment(r.id, {
              contactTitle: r.contactTitle,
              submittedDate: r.submittedDate,
              invoiceDate: r.invoiceDate,
              paidDate: r.paidDate,
              unpaidAmount: r.unpaidAmount,
              currencyCode: r.currencyCode,
            });
            return {
              ...r,
              bankslipFileCount,
              ...(bankSlipDetails ? { bankSlipDetails } : {}),
            };
          }),
        );
        enriched.push(...chunk);
      }
      setBills(enriched);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, minAmount, maxAmount, dateType, startDate, endDate]);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    if (bulkDeleteModalOpen && selectedBillIds.length < 2 && !bulkDeletePending) {
      setBulkDeleteModalOpen(false);
    }
  }, [bulkDeleteModalOpen, bulkDeletePending, selectedBillIds.length]);

  const openBulkDeleteModal = useCallback(() => {
    if (selectedBillIds.length < 2) return;
    setBulkDeleteModalOpen(true);
  }, [selectedBillIds.length]);

  const executeBulkDelete = useCallback(async () => {
    if (selectedBillIds.length < 2) return;
    setError(null);
    setBulkDeletePending(true);
    try {
      await Promise.all(selectedBillIds.map((id) => deleteBill(id)));
      await loadBills();
      tableRef.current?.clearSelection();
      setBulkDeleteModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete bills");
    } finally {
      setBulkDeletePending(false);
    }
  }, [selectedBillIds, loadBills]);

  const runBulkPublishSelected = useCallback(async () => {
    if (selectedBillIds.length < 2) return;
    setError(null);
    try {
      await Promise.all(selectedBillIds.map((id) => publishBill(id)));
      await loadBills();
      tableRef.current?.clearSelection();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to publish bills");
    }
  }, [selectedBillIds, loadBills]);

  return (
    <>
      <PaymentRequestToolbar
        activeStatus={statusFilter}
        onActiveStatusChange={setStatusFilter}
        onBillCreated={loadBills}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        bulkActionsEnabled={bulkActionsEnabled}
        bulkSelectedCount={selectedBillIds.length}
        onBulkDeleteSelected={openBulkDeleteModal}
        onBulkPublishSelected={runBulkPublishSelected}
        appliedMinAmount={minAmount}
        appliedMaxAmount={maxAmount}
        appliedDateType={dateType}
        appliedStartDate={startDate}
        appliedEndDate={endDate}
        onApplyFilters={(f) => {
          setMinAmount(f.minAmount ?? "");
          setMaxAmount(f.maxAmount ?? "");
          setDateType(f.dateType ?? "");
          setStartDate(f.startDate ?? "");
          setEndDate(f.endDate ?? "");
        }}
        selectionContainsPaid={selectionContainsPaid}
        canVoidPaid={isElevated}
        canPublish={isElevated}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pt-2 sm:pt-3">
        {error ? (
          <div className="px-4 py-8 text-center sm:px-6">
            <p className="text-sm text-red-600">{error}</p>
            <button type="button" onClick={loadBills} className="mt-2 text-sm font-medium text-secondary hover:underline">
              Retry
            </button>
          </div>
        ) : (
          <PaymentRequestTable
            ref={tableRef}
            rows={bills}
            statusFilter={statusFilter}
            loading={loading}
            onSelectionChange={onTableSelectionChange}
            onRecordPayment={(rowId, readOnly) => setRecordPaymentTarget({ billId: rowId, readOnly: readOnly ?? false })}
            onRowClick={(rowId) => router.push(`/payment-request/${rowId}`)}
            onRowDelete={async (rowId) => {
              try {
                await deleteBill(rowId);
                // Deleting a bill voids it; reload the list so the row stays visible as "Voided".
                await loadBills();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to delete bill");
                throw err;
              }
            }}
            onRowPublish={async (rowId) => {
              try {
                await publishBill(rowId);
                await loadBills();
              } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to publish bill");
              }
            }}
            onBankSlipUploaded={loadBills}
          />
        )}
      </main>
      <BulkDeleteConfirmModal
        open={bulkDeleteModalOpen}
        selectedCount={selectedBillIds.length}
        pending={bulkDeletePending}
        onClose={() => {
          if (!bulkDeletePending) setBulkDeleteModalOpen(false);
        }}
        onConfirm={executeBulkDelete}
      />
      <RecordPaymentModal
        open={recordPaymentTarget != null}
        onClose={() => setRecordPaymentTarget(null)}
        billId={recordPaymentTarget?.billId ?? ""}
        billStatus={
          recordPaymentTarget ? rawBills.find((b) => b.id === recordPaymentTarget.billId)?.status : undefined
        }
        readOnly={recordPaymentTarget?.readOnly ?? false}
        invoiceAmount={
          recordPaymentTarget
            ? parseFloat(rawBills.find((b) => b.id === recordPaymentTarget.billId)?.amount ?? "0")
            : 0
        }
        currencyCode={
          recordPaymentTarget
            ? rawBills.find((b) => b.id === recordPaymentTarget.billId)?.currency_code?.trim() || "HKD"
            : "HKD"
        }
        onPaymentSaved={loadBills}
      />
    </>
  );
}
