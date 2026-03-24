"use client";

import { useState } from "react";
import { PaymentRequestTable } from "./PaymentRequestTable";
import { PaymentRequestToolbar, type PaymentRequestStatusFilter } from "./PaymentRequestToolbar";

export function PaymentRequestView() {
  const [statusFilter, setStatusFilter] = useState<PaymentRequestStatusFilter>("All");

  return (
    <>
      <PaymentRequestToolbar activeStatus={statusFilter} onActiveStatusChange={setStatusFilter} />
      <main className="flex min-h-0 flex-1 flex-col pt-2 sm:pt-3">
        <PaymentRequestTable statusFilter={statusFilter} />
      </main>
    </>
  );
}
