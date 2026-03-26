"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout";
import { PaymentRequestView } from "@/components/payment-request";
import { getAuth, clearAuth, type AuthInfo } from "@/lib/auth";

const MODULE1_URL =
  process.env.NEXT_PUBLIC_MODULE1_URL ?? "http://localhost:5001";

export default function Home() {
  const [auth, setAuthState] = useState<AuthInfo | null>(null);

  useEffect(() => {
    setAuthState(getAuth());
  }, []);

  const handleLogout = () => {
    clearAuth();
    window.location.href = `${MODULE1_URL}/entity`;
  };

  const entityAbbr = auth?.entityName
    ? auth.entityName
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3)
    : "---";

  return (
    <div className="flex min-h-dvh min-h-screen min-w-0 max-w-full flex-col overflow-x-clip bg-white pb-[env(safe-area-inset-bottom,0px)]">
      <Header
        title="Payment Request"
        showLogo={false}
        companyName={auth?.entityName || "Loading…"}
        companyAbbreviation={entityAbbr}
        onLogout={handleLogout}
      />
      <PaymentRequestView />
    </div>
  );
}
