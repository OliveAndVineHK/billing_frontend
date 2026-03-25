import type { Metadata } from "next";
import { Header } from "@/components/layout";
import { PaymentRequestTable } from "@/components/payment-request/PaymentRequestTable";
import { PaymentRequestToolbar } from "@/components/payment-request/PaymentRequestToolbar";
import { PaymentRequestView } from "@/components/payment-request";

export const metadata: Metadata = {
  title: "Payment Request",
  description: "Payment Request",
};

export default function Home() {
  return (
    <div className="flex min-h-dvh min-h-screen min-w-0 max-w-full flex-col overflow-x-clip bg-white pb-[env(safe-area-inset-bottom,0px)]">
      <Header title="Payment Request" showLogo={false} />
      <PaymentRequestView />
    </div>
  );
}
