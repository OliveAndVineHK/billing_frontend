"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentRequestTable, type PaymentRequestRow, type PaymentRequestTableHandle } from "./PaymentRequestTable";
import { PaymentRequestToolbar, type PaymentRequestStatusFilter } from "./PaymentRequestToolbar";
import { BulkDeleteConfirmModal } from "./BulkDeleteConfirmModal";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { billStatusToDisplayLabel } from "@/lib/billStatusDisplay";
import { deleteBill, fetchBills, publishBill, type BillListItem } from "@/lib/api";
import { fetchBillBankSlipEnrichment } from "@/lib/bankSlipEnrichment";
import { BankSlipDetailsModal, type BankSlipDetails } from "./BankSlipDetailsModal";

/** Sample payload for the toolbar test button (no API / fetchSource — preview panel shows placeholder). */
const TEST_BANK_SLIP_DETAILS: BankSlipDetails = {
  createdBy: "John Doe",
  createdAt: "03 Mar 2026 13:36 HKT",
  toName: "OL*VE AN* V*NE LTD",
  toAccount: "147-622484-838",
  amount: "HK$ 1,500.00",
  fromName: "BUSINESS INTEGRATED SAVINGS - HKD SAVINGS",
  fromAccount: "040-286XXX-838",
  when: "03 Mar 2026",
  files: [
    { id: "test-slip-1", name: "01 Nov 2025_ChunFatSeafood_240 1.pdf" },
    { id: "test-slip-2", name: "Metro_Office_slip_2.pdf" },
  ],
};

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

function mapBillToRow(bill: BillListItem): PaymentRequestRow {
  const status = billStatusToDisplayLabel(bill.status);
  const symbol = bill.currency_code || "HK$";

  return {
    id: bill.id,
    contactTitle: bill.contact || "—",
    contactCaption: bill.description,
    currencyCode: (bill.currency_code && bill.currency_code.trim()) || "HKD",
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
  const [testBankSlipModalOpen, setTestBankSlipModalOpen] = useState(false);
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
      <div className="flex shrink-0 justify-end border-b border-gray-100 bg-[#FAFAFA] px-4 py-2 sm:px-6">
        <button
          type="button"
          onClick={() => setTestBankSlipModalOpen(true)}
          className="rounded-lg border border-secondary/40 bg-white px-3 py-1.5 text-xs font-semibold text-secondary shadow-sm transition-colors hover:bg-secondary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:text-sm"
        >
          Test bank slip modal
        </button>
      </div>
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
      <BankSlipDetailsModal
        open={testBankSlipModalOpen}
        onClose={() => setTestBankSlipModalOpen(false)}
        details={TEST_BANK_SLIP_DETAILS}
        allowRemoveFiles
        onUpload={() => {
          setTestBankSlipModalOpen(false);
          const eligible = bills.find((b) => b.status !== "Voided" && b.status !== "Draft");
          if (eligible) tableRef.current?.openBankSlipUpload(eligible.id);
        }}
      />
    </>
  );
}
