import type { Metadata } from "next";
import { Header } from "@/components/layout";
import { PaymentRequestDetailBody } from "@/components/payment-request/PaymentRequestDetailBody";

export const metadata: Metadata = {
  title: "Payment Request Details",
  description: "Payment request details",
};

export default function PaymentRequestDetailPage() {
  return (
    <div className="flex min-h-dvh min-h-screen flex-col bg-white">
      <Header
        title="Payment Request Details"
        showLogo={false}
        brandHref={null}
        backHref="/"
        backLabel="Bills"
        companyName="Minty Bills Incorporated"
        statusBadge={
          <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 sm:text-sm">Payment Requested</span>
        }
      />
      <main className="flex min-h-0 flex-1 flex-col pt-2 sm:pt-3">
        <PaymentRequestDetailBody />
      </main>
    </div>
  );
}
