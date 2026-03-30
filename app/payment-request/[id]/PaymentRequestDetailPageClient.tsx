"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { Header } from "@/components/layout";
import { PaymentRequestDetailSkeleton } from "@/components/payment-request/PaymentRequestDetailSkeleton";
import { PaymentRequestDetailStatusBadge } from "@/components/payment-request/PaymentRequestDetailStatusBadge";

const PaymentRequestDetailBody = dynamic(
  () => import("@/components/payment-request/PaymentRequestDetailBody").then((m) => ({ default: m.PaymentRequestDetailBody })),
  { loading: () => <PaymentRequestDetailSkeleton /> },
);

export function PaymentRequestDetailPageClient() {
  const [billStatusRefresh, setBillStatusRefresh] = useState(0);
  const bumpBillStatusInHeader = useCallback(() => setBillStatusRefresh((n) => n + 1), []);

  return (
    <div className="flex min-h-dvh min-h-screen min-w-0 max-w-full flex-col overflow-x-clip bg-white">
      <Header
        title="Payment Request Details"
        showLogo={false}
        brandHref={null}
        backHref="/"
        backLabel="Bills"
        companyName="Minty Bills Incorporated"
        statusBadge={<PaymentRequestDetailStatusBadge refreshSignal={billStatusRefresh} />}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pt-2 sm:pt-3 lg:pt-4">
        <PaymentRequestDetailBody onBillUpdated={bumpBillStatusInHeader} />
      </main>
    </div>
  );
}
