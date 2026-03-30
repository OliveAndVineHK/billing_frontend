import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout";
import { PaymentRequestDetailSkeleton } from "@/components/payment-request/PaymentRequestDetailSkeleton";
import { PaymentRequestDetailStatusBadge } from "@/components/payment-request/PaymentRequestDetailStatusBadge";

const PaymentRequestDetailBody = dynamic(
  () => import("@/components/payment-request/PaymentRequestDetailBody").then((m) => ({ default: m.PaymentRequestDetailBody })),
  { loading: () => <PaymentRequestDetailSkeleton /> },
);

export const metadata: Metadata = {
  title: "Payment Request Details",
  description: "Payment request details",
};

export default function PaymentRequestDetailPage() {
  return (
    <div className="flex min-h-dvh min-h-screen min-w-0 max-w-full flex-col overflow-x-clip bg-white">
      <Header
        title="Payment Request Details"
        showLogo={false}
        brandHref={null}
        backHref="/"
        backLabel="Bills"
        companyName="Minty Bills Incorporated"
        statusBadge={<PaymentRequestDetailStatusBadge />}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden pt-2 sm:pt-3 lg:pt-4">
        <PaymentRequestDetailBody />
      </main>
    </div>
  );
}
