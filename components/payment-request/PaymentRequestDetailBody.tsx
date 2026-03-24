"use client";

import { useState } from "react";
import { ActivityHistoryAccordion } from "./ActivityHistoryAccordion";
import { BillActionBar } from "./BillActionBar";
import { InvoiceAttachmentPreview } from "./InvoiceAttachmentPreview";
import { InvoiceAttachmentToolbar } from "./InvoiceAttachmentToolbar";
import { PaymentHistoryCard } from "./PaymentHistoryCard";
import { PaymentRequestDetailedInfo } from "./PaymentRequestDetailedInfo";

export function PaymentRequestDetailBody() {
  const [fullscreen, setFullscreen] = useState(false);

  return (
    <>
      <div className="grid w-full min-w-0 grid-cols-1 gap-4 px-4 pb-8 sm:px-6 lg:grid-cols-2 lg:grid-rows-[auto_minmax(20rem,1fr)] lg:gap-x-6 lg:gap-y-4">
        <div className="min-w-0 lg:col-start-1 lg:row-start-1">
          <InvoiceAttachmentToolbar onExpand={() => setFullscreen(true)} />
        </div>
        <div className="min-w-0 lg:col-start-2 lg:row-start-1 lg:self-center">
          <BillActionBar />
        </div>
        <div
          className={`flex min-h-0 min-w-0 flex-col lg:col-start-1 lg:row-start-2 ${fullscreen ? "min-h-[min(65vh,36rem)] lg:min-h-[min(70vh,40rem)]" : ""}`}
        >
          <InvoiceAttachmentPreview
            fullscreen={fullscreen}
            onExitFullscreen={() => setFullscreen(false)}
            className="min-h-[min(65vh,36rem)] lg:min-h-[min(70vh,40rem)]"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-2">
          <PaymentRequestDetailedInfo />
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-md border border-secondary/20 border-l-4 border-l-orange-400 bg-secondary/10 px-4 py-3.5 text-left text-base font-semibold text-secondary transition-colors hover:bg-secondary/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
          >
            Add Payment
            <span className="material-symbols-outlined text-[24px] leading-none" aria-hidden>
              add
            </span>
          </button>
          <PaymentHistoryCard />
          <ActivityHistoryAccordion />
        </div>
      </div>
    </>
  );
}
