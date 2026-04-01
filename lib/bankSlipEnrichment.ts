import {
  fetchPayments,
  listPaymentAttachments,
  type PaymentItem,
} from "./api";
import type { BankSlipDetails, BankSlipFileEntry } from "@/components/payment-request/BankSlipDetailsModal";

function formatApiDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return iso;
  }
}

function formatBillDate(dateStr: string): string {
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

function formatPaymentDisplayAmount(currencyCode: string | undefined, amount: string): string {
  const symbol = currencyCode === "HKD" ? "HK$" : currencyCode?.trim() || "";
  const n = parseFloat(amount);
  const formatted = Number.isFinite(n)
    ? n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : amount;
  return symbol ? `${symbol} ${formatted}` : formatted;
}

function paymentToDetailsBase(
  row: {
    contactTitle: string;
    submittedDate: string;
    invoiceDate: string;
    paidDate: string;
    unpaidAmount: string;
    currencyCode?: string;
  },
  payment: PaymentItem,
): Omit<BankSlipDetails, "files"> {
  return {
    createdBy: payment.created_by?.trim() ? payment.created_by : "—",
    createdAt: formatApiDateTime(payment.created_at),
    toName: row.contactTitle,
    amount: formatPaymentDisplayAmount(payment.currency_code || row.currencyCode, payment.amount),
    fromName: "—",
    when: payment.payment_date ? formatBillDate(payment.payment_date) : row.paidDate.trim() || row.invoiceDate,
  };
}

export type BankSlipEnrichment = {
  bankslipFileCount: number;
  bankSlipDetails?: BankSlipDetails;
};

/**
 * Loads payment-attachment metadata for a bill so the table can show counts and the bank-slip details modal
 * can preview files via `fetchSource` + authenticated download.
 */
export async function fetchBillBankSlipEnrichment(billId: string, row: {
  contactTitle: string;
  submittedDate: string;
  invoiceDate: string;
  paidDate: string;
  unpaidAmount: string;
  currencyCode?: string;
}): Promise<BankSlipEnrichment> {
  try {
    const { payments } = await fetchPayments(billId);
    const forBill = payments.filter((p) => p.bill_id === billId);
    if (forBill.length === 0) return { bankslipFileCount: 0 };

    const files: BankSlipFileEntry[] = [];
    const seenAttachmentLinkIds = new Set<string>();
    for (const p of forBill) {
      const attachments = await listPaymentAttachments(billId, p.id);
      for (const a of attachments) {
        if (seenAttachmentLinkIds.has(a.id)) continue;
        seenAttachmentLinkIds.add(a.id);
        const uploadedAt = a.created_at?.trim() || a.attachment.created_at?.trim();
        const nestedId = a.attachment.id?.trim();
        files.push({
          id: a.id,
          name: a.attachment.original_name,
          fetchSource: {
            billId,
            paymentId: p.id,
            attachmentId: a.id,
            ...(nestedId ? { fileAttachmentId: nestedId } : {}),
          },
          ...(uploadedAt
            ? { details: { createdAt: formatApiDateTime(uploadedAt) } }
            : {}),
        });
      }
    }

    if (files.length === 0) return { bankslipFileCount: 0 };

    const primary = forBill[0];
    const details: BankSlipDetails = {
      ...paymentToDetailsBase(row, primary),
      files,
    };

    return { bankslipFileCount: files.length, bankSlipDetails: details };
  } catch {
    return { bankslipFileCount: 0 };
  }
}
