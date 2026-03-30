"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ApiError,
  deleteBill,
  fetchBill,
  fetchEntityBillAccounts,
  fetchEntityBillContacts,
  fetchPayments,
  deletePayment as apiDeletePayment,
  isDuplicateBillReferenceError,
  updateBill,
  type BillDetail,
  type EntityBillContact,
  type PaymentItem,
} from "@/lib/api";
import type { ThemedSelectOption } from "@/components/ThemedSelect";
import { currencyLabelForCode } from "@/lib/currencyDisplay";
import { billToDetailedInfo, buildBillUpdatePayload } from "@/lib/paymentRequestBillMap";
import { loadAttachmentBlobs } from "@/lib/paymentRequestAttachmentStore";
import { ActivityHistoryAccordion } from "./ActivityHistoryAccordion";
import { BillActionBar } from "./BillActionBar";
import { InvoiceAttachmentPreview, type InvoiceAttachmentPreviewItem } from "./InvoiceAttachmentPreview";
import { InvoiceAttachmentToolbar } from "./InvoiceAttachmentToolbar";
import { PaymentHistoryCard, type PaymentHistoryRow } from "./PaymentHistoryCard";
import { RecordPaymentModal } from "./RecordPaymentModal";
import {
  PaymentRequestDetailedInfo,
  type PaymentRequestDetailedInfoData,
} from "./PaymentRequestDetailedInfo";

export function PaymentRequestDetailBody() {
  const params = useParams();
  const requestId = typeof params?.id === "string" ? params.id : "";

  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loadingBill, setLoadingBill] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PaymentRequestDetailedInfoData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [billNoError, setBillNoError] = useState<string | null>(null);

  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [auditRefresh, setAuditRefresh] = useState(0);
  const bumpAudit = useCallback(() => setAuditRefresh((n) => n + 1), []);

  const [accountOptions, setAccountOptions] = useState<ThemedSelectOption[]>([
    { value: "", label: "Select account code" },
  ]);
  const [contactOptions, setContactOptions] = useState<ThemedSelectOption[]>([
    { value: "", label: "Select contact" },
  ]);
  const [contactXeroByName, setContactXeroByName] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    let cancelled = false;
    fetchEntityBillAccounts()
      .then((accounts) => {
        if (cancelled) return;
        setAccountOptions([
          { value: "", label: "Select account code" },
          ...accounts
            .filter((a) => a.is_active)
            .map((a) => ({
              value: `${a.account_code} - ${a.account_name}`,
              label: `${a.account_code} - ${a.account_name}`,
            })),
        ]);
      })
      .catch(() => {});
    fetchEntityBillContacts()
      .then((contacts: EntityBillContact[]) => {
        if (cancelled) return;
        const byName = new Map<string, string>();
        for (const c of contacts) {
          byName.set(c.name, c.xero_contact_id);
        }
        setContactXeroByName(byName);
        const seen = new Set<string>();
        const unique = contacts.filter((c) => {
          if (seen.has(c.name)) return false;
          seen.add(c.name);
          return true;
        });
        setContactOptions([
          { value: "", label: "Select contact" },
          ...unique.map((c) => ({ value: c.name, label: c.name })),
        ]);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const loadPayments = useCallback(async () => {
    if (!requestId) return;
    try {
      const data = await fetchPayments(requestId);
      setPayments(data.payments);
    } catch {
      setPayments([]);
    }
  }, [requestId]);

  const reloadBill = useCallback(async () => {
    if (!requestId) return;
    try {
      const b = await fetchBill(requestId);
      setBill(b);
    } catch { /* ignore */ }
  }, [requestId]);

  useEffect(() => {
    if (requestId) loadPayments();
  }, [requestId, loadPayments]);

  const [attachments, setAttachments] = useState<InvoiceAttachmentPreviewItem[]>([]);
  const [attachmentsReady, setAttachmentsReady] = useState(false);
  const attachmentUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!requestId) {
      setBill(null);
      setLoadingBill(false);
      setLoadError(null);
      return;
    }
    let cancelled = false;
    setLoadingBill(true);
    setLoadError(null);
    fetchBill(requestId)
      .then((b) => {
        if (!cancelled) setBill(b);
      })
      .catch((e) => {
        if (!cancelled) {
          setBill(null);
          setLoadError(e instanceof ApiError ? e.message : "Failed to load bill.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingBill(false);
      });
    return () => {
      cancelled = true;
    };
  }, [requestId]);

  useEffect(() => {
    attachmentUrlsRef.current = [];
    let cancelled = false;

    if (!requestId) {
      setAttachments([]);
      setAttachmentsReady(true);
      return () => {
        cancelled = true;
      };
    }

    setAttachmentsReady(false);
    (async () => {
      try {
        const blobs = await loadAttachmentBlobs(requestId);
        if (cancelled) return;
        const next: InvoiceAttachmentPreviewItem[] = blobs.map((b) => {
          const url = URL.createObjectURL(b.blob);
          attachmentUrlsRef.current.push(url);
          return { url, name: b.name, mime: b.type };
        });
        if (!cancelled) setAttachments(next);
      } catch {
        if (!cancelled) setAttachments([]);
      } finally {
        if (!cancelled) setAttachmentsReady(true);
      }
    })();

    return () => {
      cancelled = true;
      attachmentUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      attachmentUrlsRef.current = [];
    };
  }, [requestId]);

  const viewData = useMemo(() => (bill ? billToDetailedInfo(bill) : null), [bill]);

  const formData = isEditing && draft ? draft : viewData;

  const invoiceTotalMajor = useMemo(() => {
    const raw = formData?.amount ?? "0";
    return Number.parseFloat(raw.replace(/,/g, "")) || 0;
  }, [formData?.amount]);

  const handleEdit = useCallback(() => {
    if (!bill) return;
    setDraft(billToDetailedInfo(bill));
    setIsEditing(true);
    setActionError(null);
    setBillNoError(null);
  }, [bill]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft(null);
    setActionError(null);
    setBillNoError(null);
  }, []);

  const handlePatch = useCallback((patch: Partial<PaymentRequestDetailedInfoData>) => {
    if (Object.prototype.hasOwnProperty.call(patch, "billNo")) {
      setBillNoError(null);
    }
    setDraft((d) => (d ? { ...d, ...patch } : null));
  }, []);

  const handleSave = useCallback(async () => {
    if (!requestId || !bill || !draft) return;
    setIsSaving(true);
    setActionError(null);
    setBillNoError(null);
    try {
      const payload = buildBillUpdatePayload(bill, draft);
      const updated = await updateBill(requestId, payload);
      setBill(updated);
      await loadPayments();
      setIsEditing(false);
      setDraft(null);
      setBillNoError(null);
      bumpAudit();
    } catch (e) {
      if (isDuplicateBillReferenceError(e)) {
        setBillNoError(e.message);
      } else {
        setActionError(e instanceof ApiError ? e.message : "Could not save changes.");
      }
    } finally {
      setIsSaving(false);
    }
  }, [requestId, bill, draft, bumpAudit, loadPayments]);

  const handleDeleteBill = useCallback(async () => {
    if (!requestId) return;
    if (!window.confirm("Delete this bill? This cannot be undone.")) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteBill(requestId);
      // Deleting a bill voids it; keep the user on this page and refresh status.
      setIsEditing(false);
      setDraft(null);
      await reloadBill();
      await loadPayments();
      bumpAudit();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Could not delete bill.");
    } finally {
      setIsDeleting(false);
    }
  }, [requestId, reloadBill, bumpAudit, loadPayments]);

  const currencyLabel = formData ? currencyLabelForCode(formData.currencyCode) : "HK$";

  const billIsDraft = (bill?.status ?? "").toLowerCase() === "draft";

  return (
    <>
      {actionError ? (
        <div className="mx-auto mb-3 max-w-[1920px] px-4 text-sm text-rose-700 sm:px-6 lg:px-8" role="alert">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">{actionError}</div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full min-w-0 max-w-[1920px] grid-cols-1 gap-4 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-1 sm:gap-5 sm:px-6 lg:grid-cols-2 lg:grid-rows-[auto_minmax(20rem,1fr)] lg:gap-x-6 lg:gap-y-4 lg:px-8 xl:gap-x-8 2xl:gap-x-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <InvoiceAttachmentToolbar deleteReadOnly={!isEditing} />
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:self-center">
          <BillActionBar
            onDeleteBill={handleDeleteBill}
            deleteDisabled={loadingBill || !bill || isDeleting || bill?.status === "voided"}
          />
        </div>
        <div className="flex min-h-0 min-w-0 flex-col lg:col-start-1 lg:row-start-2">
          <InvoiceAttachmentPreview
            attachments={attachments}
            isLoadingAttachments={!attachmentsReady}
            editMode={isEditing}
            className="min-h-[min(45dvh,22rem)] sm:min-h-[min(55dvh,30rem)] lg:min-h-[min(70vh,40rem)]"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:col-start-2 lg:row-start-2">
          {loadingBill ? (
            <div className="animate-pulse rounded-xl border border-gray-200/90 bg-white p-6">
              <div className="mb-4 h-6 w-48 rounded bg-gray-100" />
              <div className="space-y-4">
                <div className="h-4 w-full rounded bg-gray-100" />
                <div className="h-4 w-3/4 rounded bg-gray-100" />
                <div className="h-4 w-full rounded bg-gray-100" />
              </div>
            </div>
          ) : loadError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
              {loadError}
            </div>
          ) : formData ? (
            <PaymentRequestDetailedInfo
              data={formData}
              isEditing={isEditing}
              isSaving={isSaving}
              disabled={!bill}
              billNoError={isEditing ? billNoError : null}
              accountOptions={accountOptions}
              contactOptions={contactOptions}
              contactXeroByName={contactXeroByName}
              onPatchChange={isEditing ? handlePatch : undefined}
              onEdit={handleEdit}
              onCancel={handleCancel}
              onSave={handleSave}
            />
          ) : null}

          <button
            type="button"
            disabled={loadingBill || !bill || billIsDraft}
            onClick={() => setRecordPaymentOpen(true)}
            aria-label={
              billIsDraft
                ? "Draft — add payment not available"
                : "Add payment"
            }
            className="box-border inline-flex h-12 w-full min-w-0 shrink-0 items-center justify-between gap-2 rounded-md border border-transparent bg-[#00C896]/10 px-4 text-left text-base font-semibold text-[#00C896] transition-colors hover:bg-[#00C896]/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#00C896]/10 sm:h-[46px] sm:w-[199px] sm:self-start"
          >
            Add Payment
            <span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>
              add
            </span>
          </button>
          <PaymentHistoryCard
            rows={payments.map((p): PaymentHistoryRow => {
              const amt = parseFloat(p.amount || "0");
              const shortDate = p.payment_date
                ? new Date(p.payment_date + "T12:00:00").toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                  })
                : "—";
              const forThisBill = p.bill_id === requestId;
              let dateLabel: string;
              if (p.payment_status === "pending") {
                dateLabel = `Pending on ${shortDate}`;
              } else if (forThisBill && amt > 0 && amt + 1e-9 < invoiceTotalMajor) {
                dateLabel = `Partial Pay on ${shortDate}`;
              } else {
                dateLabel = `Paid on ${shortDate}`;
              }
              const ref =
                (p.bill_reference && p.bill_reference.trim()) ||
                (p.reference_no && p.reference_no.trim()) ||
                p.bill_id.slice(0, 13).toUpperCase();
              return {
                id: p.id,
                billId: p.bill_id,
                date: dateLabel,
                amountLabel: `(${currencyLabel} ${parseFloat(p.amount || "0").toLocaleString("en-HK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`,
                invoiceNo: ref,
                invoiceHref: forThisBill ? "#" : `/payment-request/${p.bill_id}`,
                isOtherBill: !forThisBill,
              };
            })}
            onDeleteRow={async (row) => {
              try {
                await apiDeletePayment(row.billId, row.id);
                await loadPayments();
                await reloadBill();
                bumpAudit();
              } catch {
                /* ignore */
              }
            }}
          />
          <ActivityHistoryAccordion
            billId={requestId}
            billRef={bill?.reference ? `#${bill.reference}` : undefined}
            refreshSignal={auditRefresh}
          />
        </div>
      </div>
      <RecordPaymentModal
        open={recordPaymentOpen}
        onClose={() => setRecordPaymentOpen(false)}
        billId={requestId}
        invoiceAmount={invoiceTotalMajor}
        currencyLabel={currencyLabel}
        onPaymentSaved={async () => {
          await loadPayments();
          await reloadBill();
          bumpAudit();
        }}
      />
    </>
  );
}
