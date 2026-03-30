import { fetchPayments, listPaymentAttachments } from "./api";

/**
 * Counts payment attachment files for payments that belong to this bill
 * (supplier-scoped payment list is filtered to rows with matching bill_id).
 */
export async function countBankSlipAttachmentsForBill(billId: string): Promise<number> {
  try {
    const { payments } = await fetchPayments(billId);
    const forBill = payments.filter((p) => p.bill_id === billId);
    if (forBill.length === 0) return 0;
    const lists = await Promise.all(
      forBill.map((p) => listPaymentAttachments(billId, p.id)),
    );
    return lists.reduce((sum, attachments) => sum + attachments.length, 0);
  } catch {
    return 0;
  }
}
