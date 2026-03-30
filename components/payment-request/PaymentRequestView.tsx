"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentRequestTable, type PaymentRequestRow, type PaymentRequestTableHandle } from "./PaymentRequestTable";
import { PaymentRequestToolbar, type PaymentRequestStatusFilter } from "./PaymentRequestToolbar";
import { BulkDeleteConfirmModal } from "./BulkDeleteConfirmModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { deleteBill, fetchBills, publishBill, type BillListItem } from "@/lib/api";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatAmount(value: string | number): string {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

const STATUS_DISPLAY: Record<string, string> = {
  draft: "Draft",
  submitted: "Payment Requested",
  paid: "Paid",
  voided: "Voided",
  returned: "Returned",
};

function mapBillToRow(bill: BillListItem): PaymentRequestRow {
  const status =
    STATUS_DISPLAY[bill.status.toLowerCase()] ??
    bill.status.charAt(0).toUpperCase() + bill.status.slice(1);
  const symbol = bill.currency_code || "HK$";

  return {
    id: bill.id,
    contactTitle: bill.contact || "—",
    contactCaption: bill.description,
    invoiceDate: bill.invoice_date ? formatDate(bill.invoice_date) : "",
    status,
    submittedDate: formatDate(bill.created_at),
    unpaidAmount:
      parseFloat(bill.amount_due) !== 0
        ? `${symbol} ${formatAmount(bill.amount_due)}`
        : `${symbol} 0.00`,
    invoiceTotal: bill.amount ? formatAmount(bill.amount) : "",
    payment: "",
    paidDate: "",
    bankslip: "",
    xeroActive: bill.published === "published",
  };
}

export function PaymentRequestView() {
  const router = useRouter();
  const [statusFilter, setStatusFilter] =
    useState<PaymentRequestStatusFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rawBills, setRawBills] = useState<BillListItem[]>([]);
  const [bills, setBills] = useState<PaymentRequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recordPaymentBillId, setRecordPaymentBillId] = useState<string | null>(null);
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);
  const tableRef = useRef<PaymentRequestTableHandle>(null);
  const bulkActionsEnabled = selectedBillIds.length >= 2;

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
      const data = await fetchBills({
        page_size: 100,
        ...(debouncedSearch ? { contact: debouncedSearch } : {}),
      });
      setRawBills(data);
      setBills(data.map(mapBillToRow));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load bills");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

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
            onRecordPayment={(rowId) => setRecordPaymentBillId(rowId)}
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
        open={recordPaymentBillId != null}
        onClose={() => setRecordPaymentBillId(null)}
        billId={recordPaymentBillId ?? ""}
        invoiceAmount={
          recordPaymentBillId
            ? parseFloat(rawBills.find((b) => b.id === recordPaymentBillId)?.amount ?? "0")
            : 0
        }
        currencyLabel={
          recordPaymentBillId
            ? rawBills.find((b) => b.id === recordPaymentBillId)?.currency_code || "HK$"
            : "HK$"
        }
        onPaymentSaved={loadBills}
      />
    </>
  );
}
