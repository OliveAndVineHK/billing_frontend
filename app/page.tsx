import type { Metadata } from "next";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "Payment Request",
  description: "Payment Request",
};

export default function Home() {
  return (
    <div className="flex min-h-dvh min-h-screen flex-col bg-white">
      <Header title="Payment Request" showLogo={false} />
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-4 py-8 sm:px-6">
      </main>
    </div>
  );
}
