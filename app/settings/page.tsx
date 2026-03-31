"use client";

import { Suspense, useEffect, useState } from "react";
import { Header } from "@/components/layout";
import { SettingsContent } from "@/components/settings/SettingsContent";
import { getAuth, clearAuth, type AuthInfo } from "@/lib/auth";

const MODULE1_URL =
  process.env.NEXT_PUBLIC_MODULE1_URL ?? "http://localhost:5001";

export default function SettingsPage() {
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
        title="Settings"
        showLogo={false}
        backHref="/"
        backLabel="Bills"
        companyName={auth?.entityName || "Loading…"}
        companyAbbreviation={entityAbbr}
        onLogout={handleLogout}
      />
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
        <Suspense
          fallback={
            <div className="mx-auto w-full max-w-[40rem] px-4 py-6 sm:px-6">
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-full bg-gray-200" />
                ))}
              </div>
              <div className="mt-6 h-48 animate-pulse rounded-lg bg-gray-100" />
            </div>
          }
        >
          <SettingsContent />
        </Suspense>
      </main>
    </div>
  );
}
