"use client";

import { useState } from "react";
import { PaymentRequestTable } from "./PaymentRequestTable";
import { PaymentRequestToolbar, type PaymentRequestStatusFilter } from "./PaymentRequestToolbar";
import { RecordPaymentModal } from "./RecordPaymentModal";

export function PaymentRequestView() {
  const [statusFilter, setStatusFilter] = useState<PaymentRequestStatusFilter>("All");
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);

  return (
    <>
      <PaymentRequestToolbar activeStatus={statusFilter} onActiveStatusChange={setStatusFilter} />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pt-2 sm:pt-3">
        <PaymentRequestTable statusFilter={statusFilter} onRecordPayment={() => setRecordPaymentOpen(true)} />
      </main>
      <RecordPaymentModal open={recordPaymentOpen} onClose={() => setRecordPaymentOpen(false)} />
    </>
  );
}
