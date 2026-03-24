import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { PaymentRequestToolbar } from "@/components/PaymentRequestToolbar";

export const metadata: Metadata = {
  title: "Payment Request",
  description: "Payment Request",
};

export default function Home() {
  return (
    <div className="flex min-h-dvh min-h-screen flex-col bg-white pb-[env(safe-area-inset-bottom,0px)]">
      <Header title="Payment Request" showLogo={false} />
      <PaymentRequestToolbar />
      <main className="flex min-h-0 flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8" />
    </div>
  );
}
