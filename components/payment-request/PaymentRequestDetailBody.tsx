"use client";

import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { loadAttachmentBlobs } from "@/lib/paymentRequestAttachmentStore";
import { ActivityHistoryAccordion } from "./ActivityHistoryAccordion";
import { BillActionBar } from "./BillActionBar";
import { InvoiceAttachmentPreview, type InvoiceAttachmentPreviewItem } from "./InvoiceAttachmentPreview";
import { InvoiceAttachmentToolbar } from "./InvoiceAttachmentToolbar";
import { PaymentHistoryCard } from "./PaymentHistoryCard";
import { RecordPaymentModal } from "./RecordPaymentModal";
import { PaymentRequestDetailedInfo, type PaymentRequestDetailedInfoData } from "./PaymentRequestDetailedInfo";

const mockPaymentRequestDetailedInfo: PaymentRequestDetailedInfoData = {
  billNo: "MBIDAN-115803AM031626",
  amount: "1,500.00",
  currencyLabel: "HK$",
  description: "Lorem ipsum Dolor",
  contact: "Young Bros Transport",
  accountCode: "425 - Transport",
  invoiceDate: "03 Mar 2026",
  dueDate: "03 Mar 2026",
};

const invoiceTotalMajor =
  Number.parseFloat(mockPaymentRequestDetailedInfo.amount.replace(/,/g, "")) || 1500;

export function PaymentRequestDetailBody() {
  const params = useParams();
  const requestId = typeof params?.id === "string" ? params.id : "";
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [attachments, setAttachments] = useState<InvoiceAttachmentPreviewItem[]>([]);
  const [attachmentsReady, setAttachmentsReady] = useState(false);
  const attachmentUrlsRef = useRef<string[]>([]);

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

  return (
    <>
      <div className="mx-auto grid w-full min-w-0 max-w-[1920px] grid-cols-1 gap-4 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-1 sm:gap-5 sm:px-6 lg:grid-cols-2 lg:grid-rows-[auto_minmax(20rem,1fr)] lg:gap-x-6 lg:gap-y-4 lg:px-8 xl:gap-x-8 2xl:gap-x-10">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <InvoiceAttachmentToolbar onExpand={() => setFullscreen(true)} />
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:self-center">
          <BillActionBar />
        </div>
        <div className={`flex min-h-0 min-w-0 flex-col lg:col-start-1 lg:row-start-2 ${fullscreen ? "min-h-[min(45dvh,22rem)] sm:min-h-[min(55dvh,30rem)] lg:min-h-[min(70vh,40rem)]" : ""}`}>
          <InvoiceAttachmentPreview attachments={attachments} isLoadingAttachments={!attachmentsReady} fullscreen={fullscreen} onExitFullscreen={() => setFullscreen(false)} className="min-h-[min(45dvh,22rem)] sm:min-h-[min(55dvh,30rem)] lg:min-h-[min(70vh,40rem)]" />
        </div>
        <div className="flex min-w-0 flex-col gap-4 sm:gap-5 lg:col-start-2 lg:row-start-2">
          <PaymentRequestDetailedInfo data={mockPaymentRequestDetailedInfo} />
          <button type="button" onClick={() => setRecordPaymentOpen(true)} className="box-border inline-flex h-12 w-full min-w-0 shrink-0 items-center justify-between gap-2 rounded-md border border-secondary/20 bg-secondary/10 px-4 text-left text-base font-semibold text-secondary transition-colors hover:bg-secondary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary sm:h-[46px] sm:w-[199px] sm:self-start">Add Payment<span className="material-symbols-outlined text-[22px] leading-none" aria-hidden>add</span></button>
          <PaymentHistoryCard />
          <ActivityHistoryAccordion />
        </div>
      </div>
      <RecordPaymentModal open={recordPaymentOpen} onClose={() => setRecordPaymentOpen(false)} invoiceAmount={invoiceTotalMajor} currencyLabel={mockPaymentRequestDetailedInfo.currencyLabel} />
    </>
  );
}
