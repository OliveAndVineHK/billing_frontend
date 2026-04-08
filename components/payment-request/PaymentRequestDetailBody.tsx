"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useUserRole } from "@/lib/useUserRole";
import {
  ApiError,
  deleteBill,
  fetchBill,
  fetchEntityBillAccounts,
  dedupeEntityBillContactsForPicker,
  fetchEntityBillContacts,
  fetchPayments,
  deletePayment as apiDeletePayment,
  isDuplicateBillReferenceError,
  publishBill,
  updateBill,
  type BillDetail,
  type EntityBillContact,
  type PaymentItem,
} from "@/lib/api";
import type { ThemedSelectOption } from "@/components/ThemedSelect";
import { currencyLabelForCode } from "@/lib/currencyDisplay";
import { billStatusToDisplayLabel } from "@/lib/billStatusDisplay";
import { billStatusShouldRollbackWhenNoPayments } from "@/lib/billStatusRollback";
import { enrichAccountCodeWithOptions } from "@/lib/billFormSelectOptions";
import { billToDetailedInfo, buildBillUpdatePayload } from "@/lib/paymentRequestBillMap";
import { formatIsoDateForDisplay } from "@/lib/dateDisplayFormat";
import {
  loadAttachmentBlobs,
  replaceAttachmentBlobsFromPreviewItems,
  uniquifyFileName,
} from "@/lib/paymentRequestAttachmentStore";
import { ActivityHistoryAccordion } from "./ActivityHistoryAccordion";
import { BillActionBar } from "./BillActionBar";
import { InvoiceAttachmentPreview, type InvoiceAttachmentPreviewItem } from "./InvoiceAttachmentPreview";
import { InvoiceAttachmentToolbar } from "./InvoiceAttachmentToolbar";
import { OverpaymentWarningModal } from "./OverpaymentWarningModal";
import { PaymentHistoryCard, type PaymentHistoryRow } from "./PaymentHistoryCard";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { RowDeleteConfirmModal } from "./RowDeleteConfirmModal";
import { AttachmentDeleteConfirmModal } from "./AttachmentDeleteConfirmModal";
import { UploadInvoiceAttachmentModal } from "./UploadInvoiceAttachmentModal";
import {
  PaymentRequestDetailedInfo,
  type PaymentRequestDetailedInfoData,
} from "./PaymentRequestDetailedInfo";
export type PaymentRequestDetailBodyProps = {
  /** Called after the bill is refreshed from the server so the header status badge can update. */
  onBillUpdated?: () => void;
};

export function PaymentRequestDetailBody({ onBillUpdated }: PaymentRequestDetailBodyProps) {
  const params = useParams();
  const requestId = typeof params?.id === "string" ? params.id : "";
  const { isElevated } = useUserRole();

  const [bill, setBill] = useState<BillDetail | null>(null);
  const [loadingBill, setLoadingBill] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<PaymentRequestDetailedInfoData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSubmittingDraft, setIsSubmittingDraft] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [billNoError, setBillNoError] = useState<string | null>(null);
  const [accountCodeError, setAccountCodeError] = useState<string | null>(null);

  const [isPublishing, setIsPublishing] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [recordPaymentReadOnly, setRecordPaymentReadOnly] = useState(false);
  const [deleteBillConfirmOpen, setDeleteBillConfirmOpen] = useState(false);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [overpaymentWarningOpen, setOverpaymentWarningOpen] = useState(false);
  const [auditRefresh, setAuditRefresh] = useState(0);
  const bumpAudit = useCallback(() => setAuditRefresh((n) => n + 1), []);

  const [accountOptions, setAccountOptions] = useState<ThemedSelectOption[]>([]);
  const [entityBillContacts, setEntityBillContacts] = useState<EntityBillContact[]>([]);

  const applyEntityBillContacts = useCallback((contacts: EntityBillContact[]) => {
    setEntityBillContacts(dedupeEntityBillContactsForPicker(contacts));
  }, []);

  const refetchEntityBillContacts = useCallback(
    async (ensureMerged?: EntityBillContact) => {
      const list = await fetchEntityBillContacts();
      const mergedId = (ensureMerged?.xero_contact_id || "").trim().toUpperCase();
      let merged =
        ensureMerged &&
        mergedId &&
        !list.some(
          (c) => (c.xero_contact_id || "").trim().toUpperCase() === mergedId,
        )
          ? [...list, ensureMerged]
          : list;
      merged = [...merged].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
      applyEntityBillContacts(merged);
    },
    [applyEntityBillContacts],
  );

  useEffect(() => {
    let cancelled = false;
    fetchEntityBillAccounts({ billDropdown: true })
      .then((accounts) => {
        if (cancelled) return;
        setAccountOptions(
          accounts
            .filter((a) => a.is_active)
            .map((a) => ({
              value: `${a.account_code} - ${a.account_name}`,
              label: `${a.account_code} - ${a.account_name}`,
            })),
        );
      })
      .catch(() => {});
    fetchEntityBillContacts()
      .then((contacts: EntityBillContact[]) => {
        if (cancelled) return;
        applyEntityBillContacts(contacts);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [applyEntityBillContacts]);

  const rollbackToPaymentRequestedIfNoPayments = useCallback(
    async (nextPayments: PaymentItem[]): Promise<boolean> => {
      if (!requestId) return false;
      const hasAnyForThisBill = nextPayments.some((p) => p.bill_id === requestId);
      if (hasAnyForThisBill) return false;

      const b = await fetchBill(requestId);
      if (!billStatusShouldRollbackWhenNoPayments(b.status ?? "")) return false;

      await updateBill(requestId, { status: "submitted" });
      return true;
    },
    [requestId],
  );

  const reloadBill = useCallback(async () => {
    if (!requestId) return;
    try {
      const b = await fetchBill(requestId);
      setBill(b);
      onBillUpdated?.();
    } catch { /* ignore */ }
  }, [requestId, onBillUpdated]);

  const loadPayments = useCallback(async () => {
    if (!requestId) return;
    try {
      const data = await fetchPayments(requestId);
      setPayments(data.payments);
      const rolled = await rollbackToPaymentRequestedIfNoPayments(data.payments);
      if (rolled) await reloadBill();
    } catch {
      setPayments([]);
    }
  }, [requestId, rollbackToPaymentRequestedIfNoPayments, reloadBill]);

  useEffect(() => {
    if (requestId) loadPayments();
  }, [requestId, loadPayments]);

  const [attachments, setAttachments] = useState<InvoiceAttachmentPreviewItem[]>([]);
  const [attachmentsReady, setAttachmentsReady] = useState(false);
  const attachmentUrlsRef = useRef<string[]>([]);
  const [selectedAttachmentIndices, setSelectedAttachmentIndices] = useState<number[]>([]);
  const [uploadAttachmentOpen, setUploadAttachmentOpen] = useState(false);
  const [deleteAttachmentConfirmOpen, setDeleteAttachmentConfirmOpen] = useState(false);
  const [deleteAttachmentPending, setDeleteAttachmentPending] = useState(false);

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
    setDeleteBillConfirmOpen(false);
  }, [requestId]);

  useEffect(() => {
    if (!isEditing) {
      setSelectedAttachmentIndices([]);
      setDeleteAttachmentConfirmOpen(false);
    }
  }, [isEditing]);

  const loadAttachmentsFromIndexedDb = useCallback(
    async (opts?: { abandoned?: () => boolean }) => {
      const abandoned = opts?.abandoned;
      if (!requestId) {
        attachmentUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
        attachmentUrlsRef.current = [];
        if (!abandoned?.()) setAttachments([]);
        if (!abandoned?.()) setAttachmentsReady(true);
        return;
      }
      if (!abandoned?.()) setAttachmentsReady(false);
      try {
        const blobs = await loadAttachmentBlobs(requestId);
        if (abandoned?.()) return;
        attachmentUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
        attachmentUrlsRef.current = [];
        const next: InvoiceAttachmentPreviewItem[] = blobs.map((b) => {
          const url = URL.createObjectURL(b.blob);
          attachmentUrlsRef.current.push(url);
          return { url, name: b.name, mime: b.type };
        });
        setAttachments(next);
      } catch {
        if (abandoned?.()) return;
        attachmentUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
        attachmentUrlsRef.current = [];
        setAttachments([]);
      } finally {
        if (!abandoned?.()) setAttachmentsReady(true);
      }
    },
    [requestId],
  );

  useEffect(() => {
    let cancelled = false;
    void loadAttachmentsFromIndexedDb({ abandoned: () => cancelled });
    return () => {
      cancelled = true;
      attachmentUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      attachmentUrlsRef.current = [];
    };
  }, [requestId, loadAttachmentsFromIndexedDb]);

  const viewData = useMemo(() => {
    if (!bill) return null;
    const base = billToDetailedInfo(bill);
    return {
      ...base,
      accountCode: enrichAccountCodeWithOptions(base.accountCode, accountOptions),
    };
  }, [bill, accountOptions]);

  const formData = isEditing && draft ? draft : viewData;

  const invoiceTotalMajor = useMemo(() => {
    const raw = formData?.amount ?? "0";
    return Number.parseFloat(raw.replace(/,/g, "")) || 0;
  }, [formData?.amount]);

  const handleEdit = useCallback(() => {
    if (!bill) return;
    const base = billToDetailedInfo(bill);
    setDraft({
      ...base,
      accountCode: enrichAccountCodeWithOptions(base.accountCode, accountOptions),
    });
    setIsEditing(true);
    setActionError(null);
    setBillNoError(null);
    setAccountCodeError(null);
  }, [bill, accountOptions]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setDraft(null);
    setActionError(null);
    setBillNoError(null);
    setAccountCodeError(null);
    void loadAttachmentsFromIndexedDb();
  }, [loadAttachmentsFromIndexedDb]);

  const handlePatch = useCallback((patch: Partial<PaymentRequestDetailedInfoData>) => {
    if (Object.prototype.hasOwnProperty.call(patch, "billNo")) {
      setBillNoError(null);
    }
    if (Object.prototype.hasOwnProperty.call(patch, "accountCode")) {
      setAccountCodeError(null);
    }
    setDraft((d) => (d ? { ...d, ...patch } : null));
  }, []);

  const executeSave = useCallback(
    async (overrideStatus?: string) => {
      if (!requestId || !bill || !draft) return;
      setIsSaving(true);
      try {
        const payload = buildBillUpdatePayload(bill, draft);
        if (overrideStatus) {
          (payload as typeof payload & { status?: string }).status = overrideStatus;
        }
        const updated = await updateBill(requestId, payload);
        setBill(updated);
        onBillUpdated?.();
        await loadPayments();
        try {
          await replaceAttachmentBlobsFromPreviewItems(requestId, attachments);
        } catch {
          await loadAttachmentsFromIndexedDb();
          setActionError(
            "Saved bill details but could not update stored invoice attachments. Try editing attachments again.",
          );
        }
        setIsEditing(false);
        setDraft(null);
        setBillNoError(null);
        setAccountCodeError(null);
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
    },
    [requestId, bill, draft, attachments, bumpAudit, loadPayments, loadAttachmentsFromIndexedDb, onBillUpdated],
  );

  const handleSave = useCallback(async () => {
    if (!requestId || !bill || !draft) return;
    setActionError(null);
    setBillNoError(null);
    setAccountCodeError(null);
    if (!draft.accountCode.trim()) {
      setAccountCodeError("Please select an account code.");
      return;
    }

    // Overpayment check: warn if new amount is less than what has already been paid.
    const completedPayments = payments.filter(
      (p) => p.bill_id === requestId && p.payment_status !== "pending",
    );
    if (completedPayments.length > 0) {
      const totalPaid = completedPayments.reduce(
        (sum, p) => sum + parseFloat(p.amount || "0"),
        0,
      );
      const newAmount = Number.parseFloat(draft.amount.replace(/,/g, ""));
      if (Number.isFinite(newAmount) && newAmount < totalPaid - 1e-9) {
        setOverpaymentWarningOpen(true);
        return;
      }
    }

    await executeSave();
  }, [requestId, bill, draft, payments, executeSave]);

  const handleRequestDeleteBill = useCallback(() => {
    setDeleteBillConfirmOpen(true);
  }, []);

  const executeDeleteBill = useCallback(async () => {
    if (!requestId) return;
    setIsDeleting(true);
    setActionError(null);
    try {
      await deleteBill(requestId);
      setDeleteBillConfirmOpen(false);
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

  const handleSubmitDraft = useCallback(async () => {
    if (!requestId || !bill) return;
    const info = isEditing && draft ? draft : viewData;
    if (!info) return;
    setActionError(null);
    setBillNoError(null);
    setAccountCodeError(null);
    if (!info.accountCode.trim()) {
      if (isEditing && draft) {
        setAccountCodeError("Please select an account code.");
      } else {
        setActionError("Account code is required. Click Edit, choose an account code, then submit.");
      }
      return;
    }
    setIsSubmittingDraft(true);
    try {
      const payload = buildBillUpdatePayload(bill, info);
      const updated = await updateBill(requestId, { ...payload, status: "submitted" });
      setBill(updated);
      onBillUpdated?.();
      try {
        await replaceAttachmentBlobsFromPreviewItems(requestId, attachments);
      } catch {
        await loadAttachmentsFromIndexedDb();
        setActionError(
          "Bill was submitted but could not update stored invoice attachments. Try editing attachments again.",
        );
      }
      setIsEditing(false);
      setDraft(null);
      setAccountCodeError(null);
      await loadPayments();
      bumpAudit();
    } catch (e) {
      if (isDuplicateBillReferenceError(e)) {
        setBillNoError(e.message);
        setActionError(e.message);
      } else {
        setActionError(e instanceof ApiError ? e.message : "Could not submit this bill.");
      }
    } finally {
      setIsSubmittingDraft(false);
    }
  }, [
    requestId,
    bill,
    isEditing,
    draft,
    viewData,
    attachments,
    loadPayments,
    loadAttachmentsFromIndexedDb,
    bumpAudit,
    onBillUpdated,
  ]);

  const handlePublishToXero = useCallback(async () => {
    if (!requestId || !bill || isPublishing) return;
    setActionError(null);
    setIsPublishing(true);
    try {
      const updated = await publishBill(requestId);
      setBill(updated);
      onBillUpdated?.();
      bumpAudit();
    } catch (e) {
      setActionError(e instanceof ApiError ? e.message : "Failed to publish to Xero.");
    } finally {
      setIsPublishing(false);
    }
  }, [requestId, bill, isPublishing, bumpAudit, onBillUpdated]);

  const currencyLabel = formData ? currencyLabelForCode(formData.currencyCode) : "HK$";

  const billIsDraft = (bill?.status ?? "").toLowerCase() === "draft";

  const billDisplayStatus = useMemo(() => (bill ? billStatusToDisplayLabel(bill.status) : ""), [bill]);
  const billStatusNormalized = useMemo(
    () => (bill?.status ?? "").trim().toLowerCase().replace(/-/g, "_"),
    [bill?.status],
  );
  const xeroPublishedToMenu = useMemo(() => {
    if (!bill) return false;
    if ((bill.published ?? "").trim() === "published") return true;
    return billStatusNormalized === "authorised" || billStatusNormalized === "authorized";
  }, [bill, billStatusNormalized]);
  const actionOverflowShowPublish = useMemo(
    () =>
      !xeroPublishedToMenu &&
      isElevated &&
      !!bill &&
      billDisplayStatus !== "Draft" &&
      billDisplayStatus !== "Voided",
    [isElevated, bill, billDisplayStatus, xeroPublishedToMenu],
  );
  const actionOverflowShowRepublish = useMemo(
    () =>
      xeroPublishedToMenu &&
      isElevated &&
      !!bill &&
      billDisplayStatus !== "Draft" &&
      billDisplayStatus !== "Voided",
    [isElevated, bill, billDisplayStatus, xeroPublishedToMenu],
  );
  const actionOverflowVoidDisabled = useMemo(
    () =>
      loadingBill ||
      !bill ||
      isDeleting ||
      isPublishing ||
      billDisplayStatus === "Voided" ||
      ((billDisplayStatus === "Paid" || billDisplayStatus === "Partially paid") && !isElevated),
    [loadingBill, bill, isDeleting, isPublishing, billDisplayStatus, isElevated],
  );
  const actionOverflowTriggerDisabled = loadingBill || !bill || bill?.status === "voided";

  const handleOpenUploadAttachment = useCallback(() => {
    setUploadAttachmentOpen(true);
  }, []);

  const handleConfirmDeleteAttachments = useCallback(() => {
    if (selectedAttachmentIndices.length === 0) return;
    setDeleteAttachmentConfirmOpen(true);
  }, [selectedAttachmentIndices.length]);

  const executeDeleteSelectedAttachments = useCallback(() => {
    if (selectedAttachmentIndices.length === 0) return;
    const itemsToDelete = selectedAttachmentIndices
      .map((i) => attachments[i])
      .filter((x): x is InvoiceAttachmentPreviewItem => Boolean(x));
    if (itemsToDelete.length === 0) return;

    const removeSet = new Set(selectedAttachmentIndices);
    setAttachments((prev) => {
      const next = prev.filter((_, idx) => !removeSet.has(idx));
      for (let i = 0; i < prev.length; i++) {
        if (removeSet.has(i)) URL.revokeObjectURL(prev[i].url);
      }
      return next;
    });
    setSelectedAttachmentIndices([]);
  }, [attachments, selectedAttachmentIndices]);

  return (
    <>
      {actionError ? (
        <div className="mx-auto mb-3 max-w-[1920px] px-4 text-sm text-rose-700 sm:px-6 lg:px-8" role="alert">
          <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">{actionError}</div>
        </div>
      ) : null}

      <div className="mx-auto grid w-full min-w-0 max-w-[1920px] grid-cols-1 gap-4 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-1 sm:gap-5 sm:px-6 lg:grid-cols-2 lg:grid-rows-[auto_minmax(20rem,1fr)] lg:gap-x-6 lg:gap-y-4 lg:px-8 xl:gap-x-8 2xl:gap-x-10">
        <div className="min-w-0 max-lg:order-2 lg:order-none lg:col-start-1 lg:row-start-1">
          <InvoiceAttachmentToolbar
            onDelete={isEditing ? handleConfirmDeleteAttachments : undefined}
            deleteReadOnly={selectedAttachmentIndices.length === 0 || deleteAttachmentPending}
            onUpload={isEditing ? handleOpenUploadAttachment : undefined}
            uploadReadOnly={false}
            showUpload={attachmentsReady && attachments.length === 0}
            showAddMore={attachmentsReady && attachments.length > 0}
          />
          <AttachmentDeleteConfirmModal
            open={deleteAttachmentConfirmOpen}
            count={selectedAttachmentIndices.length}
            pending={deleteAttachmentPending}
            onClose={() => {
              if (!deleteAttachmentPending) setDeleteAttachmentConfirmOpen(false);
            }}
            onConfirm={() => {
              if (deleteAttachmentPending) return;
              setDeleteAttachmentPending(true);
              try {
                executeDeleteSelectedAttachments();
              } finally {
                setDeleteAttachmentPending(false);
                setDeleteAttachmentConfirmOpen(false);
              }
            }}
          />
          <UploadInvoiceAttachmentModal
            open={uploadAttachmentOpen}
            onClose={() => setUploadAttachmentOpen(false)}
            onUpload={(files) => {
              if (!requestId) return;
              setAttachments((prev) => {
                const usedNames = new Set(prev.map((x) => x.name));
                const added: InvoiceAttachmentPreviewItem[] = [];
                for (const f of files) {
                  const base = f.name.trim() || "attachment";
                  const name = uniquifyFileName(base, usedNames);
                  usedNames.add(name);
                  const url = URL.createObjectURL(f);
                  attachmentUrlsRef.current.push(url);
                  added.push({ url, name, mime: f.type || "application/octet-stream" });
                }
                return [...prev, ...added];
              });
              setAttachmentsReady(true);
            }}
          />
        </div>
        <div className="min-w-0 w-full max-w-full max-lg:order-1 lg:order-none lg:col-start-2 lg:row-start-1 lg:self-center">
          <BillActionBar
            onDeleteBill={handleRequestDeleteBill}
            onPublishToXero={handlePublishToXero}
            deleteDisabled={loadingBill || !bill || isDeleting || isPublishing || bill?.status === "voided" || ((bill?.status === "paid" || bill?.status === "authorised") && !isElevated)}
            publishDisabled={loadingBill || !bill || bill?.status === "voided" || !isElevated}
            publishStatus={(bill?.published as "not_published" | "published" | "failed") ?? "not_published"}
            publishPending={isPublishing}
            showVoidBill={false}
            endRowPrefix={
              !isEditing ? (
                <button
                  type="button"
                  onClick={handleEdit}
                  disabled={
                    loadingBill ||
                    !bill ||
                    bill?.status === "voided" ||
                    ((bill?.status === "paid" || bill?.status === "authorised") && !isElevated)
                  }
                  className="inline-flex h-10 min-h-[44px] w-auto max-w-full shrink-0 cursor-pointer items-center justify-center rounded-full border border-primary/25 bg-white px-2.5 text-sm font-medium text-primary transition-colors hover:bg-primary/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                >
                  Edit
                </button>
              ) : null
            }
            draftSubmit={
              billIsDraft
                ? {
                    show: true,
                    onClick: handleSubmitDraft,
                    disabled:
                      loadingBill ||
                      !bill ||
                      isSubmittingDraft ||
                      isSaving ||
                      isDeleting,
                    pending: isSubmittingDraft,
                  }
                : undefined
            }
            useActionsOverflowMenu
            overflowShowPublish={actionOverflowShowPublish}
            overflowShowRepublish={actionOverflowShowRepublish}
            overflowMenuTriggerDisabled={actionOverflowTriggerDisabled}
            overflowVoidDisabled={actionOverflowVoidDisabled}
          />
        </div>
        <div className="flex h-full min-h-0 min-w-0 max-lg:order-3 flex-col lg:order-none lg:col-start-1 lg:row-start-2">
          <InvoiceAttachmentPreview
            attachments={attachments}
            isLoadingAttachments={!attachmentsReady}
            editMode={isEditing}
            selectedIndices={selectedAttachmentIndices}
            onSelectedIndicesChange={setSelectedAttachmentIndices}
            className="h-full min-h-[min(45dvh,22rem)] sm:min-h-[min(55dvh,30rem)] lg:min-h-[min(70vh,40rem)]"
          />
        </div>
        <div className="flex min-w-0 max-lg:order-4 flex-col gap-4 sm:gap-5 lg:order-none lg:col-start-2 lg:row-start-2">
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
              disabled={!bill || bill?.status === "voided" || ((bill?.status === "paid" || bill?.status === "authorised") && !isElevated)}
              billNoError={isEditing ? billNoError : null}
              accountCodeError={isEditing ? accountCodeError : null}
              accountOptions={accountOptions}
              entityBillContacts={entityBillContacts}
              onRefetchEntityBillContacts={refetchEntityBillContacts}
              onPatchChange={isEditing ? handlePatch : undefined}
              onEdit={handleEdit}
              onCancel={handleCancel}
              onSave={handleSave}
              editInCardHeader={false}
            />
          ) : null}

          {loadingBill || !bill ? (
            <button
              type="button"
              disabled
              aria-label={loadingBill ? "Loading bill" : "Add payment"}
              className="box-border inline-flex h-12 w-fit max-w-full min-w-0 shrink-0 cursor-pointer items-center justify-start gap-1.5 rounded-md border border-transparent bg-[#00C896]/10 px-3 text-left text-base font-semibold text-[#00C896] transition-colors hover:bg-[#00C896]/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#00C896]/10 sm:h-[46px] sm:self-start sm:px-3.5"
            >
              Add Payment
              <span className="material-symbols-outlined shrink-0 text-[18px] leading-none" aria-hidden>
                add
              </span>
            </button>
          ) : billIsDraft || bill?.status === "voided" ? (
            <button
              type="button"
              disabled
              aria-label={billIsDraft ? "Draft — add payment not available" : "Voided — add payment not available"}
              className="box-border inline-flex h-12 w-fit max-w-full min-w-0 shrink-0 cursor-pointer items-center justify-start gap-1.5 rounded-md border border-transparent bg-[#00C896]/10 px-3 text-left text-base font-semibold text-[#00C896] transition-colors hover:bg-[#00C896]/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#00C896]/10 sm:h-[46px] sm:self-start sm:px-3.5"
            >
              Add Payment
              <span className="material-symbols-outlined shrink-0 text-[18px] leading-none" aria-hidden>
                add
              </span>
            </button>
          ) : bill?.status === "paid" || bill?.status === "authorised" ? (
            <button
              type="button"
              disabled={!isElevated}
              onClick={() => {
                setRecordPaymentReadOnly(true);
                setRecordPaymentOpen(true);
              }}
              aria-label={
                isElevated ? "View payments" : "Insufficient permissions — view payments not available"
              }
              className="box-border inline-flex h-12 w-fit max-w-full min-w-0 shrink-0 cursor-pointer items-center justify-start gap-1.5 rounded-lg border-0 bg-secondary/15 px-3 text-left text-base font-medium text-secondary transition-colors hover:bg-secondary/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:bg-[#F5F5F5] disabled:text-primary/40 disabled:hover:bg-[#F5F5F5] sm:h-[46px] sm:self-start sm:px-3.5"
            >
              View payments
            </button>
          ) : (
            <button
              type="button"
              disabled={!isElevated}
              onClick={() => {
                setRecordPaymentReadOnly(false);
                setRecordPaymentOpen(true);
              }}
              aria-label="Add payment"
              className="box-border inline-flex h-12 w-fit max-w-full min-w-0 shrink-0 cursor-pointer items-center justify-start gap-1.5 rounded-md border border-transparent bg-[#00C896]/10 px-3 text-left text-base font-semibold text-[#00C896] transition-colors hover:bg-[#00C896]/15 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#00C896]/10 sm:h-[46px] sm:self-start sm:px-3.5"
            >
              Add Payment
              <span className="material-symbols-outlined shrink-0 text-[18px] leading-none" aria-hidden>
                add
              </span>
            </button>
          )}
          <PaymentHistoryCard
            canDeletePayments={isElevated}
            rows={payments.map((p): PaymentHistoryRow => {
              const amt = parseFloat(p.amount || "0");
              const shortDate = p.payment_date
                ? formatIsoDateForDisplay(p.payment_date.trim().slice(0, 10)) || "—"
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
                billStatus: p.bill_status,
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
                const data = await fetchPayments(requestId);
                setPayments(data.payments);
                await rollbackToPaymentRequestedIfNoPayments(data.payments);
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
      <RowDeleteConfirmModal
        open={deleteBillConfirmOpen}
        contactTitle={bill?.contact ?? ""}
        pending={isDeleting}
        onClose={() => {
          if (!isDeleting) setDeleteBillConfirmOpen(false);
        }}
        onConfirm={executeDeleteBill}
      />
      <RecordPaymentModal
        open={recordPaymentOpen}
        onClose={() => {
          setRecordPaymentOpen(false);
          setRecordPaymentReadOnly(false);
        }}
        billId={requestId}
        readOnly={recordPaymentReadOnly}
        invoiceAmount={invoiceTotalMajor}
        currencyCode={formData?.currencyCode ?? "HKD"}
        onPaymentSaved={async () => {
          await loadPayments();
          await reloadBill();
          bumpAudit();
        }}
      />
      <OverpaymentWarningModal
        open={overpaymentWarningOpen}
        payments={payments.filter(
          (p) => p.bill_id === requestId && p.payment_status !== "pending",
        )}
        newAmount={
          draft ? Number.parseFloat(draft.amount.replace(/,/g, "")) || 0 : 0
        }
        totalPaid={payments
          .filter((p) => p.bill_id === requestId && p.payment_status !== "pending")
          .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0)}
        currencyLabel={currencyLabel}
        pending={isSaving}
        onCancel={() => {
          if (!isSaving) setOverpaymentWarningOpen(false);
        }}
        onProceed={async () => {
          setOverpaymentWarningOpen(false);
          await executeSave("paid");
        }}
      />
    </>
  );
}
