"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, useRef, useEffect } from "react";
import { ModuleButton } from "@/components/ModuleButton";
import { LoadingScreen } from "@/components/LoadingScreen";
import { setAuth } from "@/lib/auth";

const MODULE1_URL =
  process.env.NEXT_PUBLIC_MODULE1_URL ?? "http://localhost:5001";
const MIN_LOADING_MS = 800;

function ModuleSelectionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const entityId = searchParams.get("entity_id") ?? "";
  const entityName = searchParams.get("entity_name") ?? "";
  const token = searchParams.get("token") ?? "";

  const module1Href =
    entityId && token
      ? `${MODULE1_URL}/entity/${entityId}/enter?token=${token}`
      : `${MODULE1_URL}/entity`;

  const entityBackHref = `${MODULE1_URL}/entity`;

  const acronym = entityName
    ? entityName
        .split(/\s+/)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "?";

  const [showMinty, setShowMinty] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const lastTouchTime = useRef(0);
  const lastPaymentTouchTime = useRef(0);
  const [loadingMintyPeek, setLoadingMintyPeek] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (!isNavigating) {
      setLoadingMintyPeek(false);
      return;
    }
    const id = requestAnimationFrame(() => setLoadingMintyPeek(true));
    return () => cancelAnimationFrame(id);
  }, [isNavigating]);

  const toggleMinty = () => setShowMinty((prev) => !prev);

  const navigateToModule1 = () => {
    setIsNavigating(true);
    window.setTimeout(() => {
      window.location.href = module1Href;
    }, MIN_LOADING_MS);
  };

  const handleTouchEnd = () => {
    lastTouchTime.current = Date.now();
    navigateToModule1();
  };

  const handleClick = () => {
    if (Date.now() - lastTouchTime.current < 400) return;
    navigateToModule1();
  };

  const navigateToModule2 = () => {
    setIsNavigating(true);
    if (token) setAuth(token, entityId, entityName);
    window.setTimeout(() => {
      router.push("/");
    }, MIN_LOADING_MS);
  };

  const handlePaymentTouchEnd = () => {
    lastPaymentTouchTime.current = Date.now();
    navigateToModule2();
  };

  const handlePaymentClick = () => {
    if (Date.now() - lastPaymentTouchTime.current < 400) return;
    navigateToModule2();
  };

  return (
    <div className="flex min-h-dvh min-h-screen flex-col overflow-x-hidden bg-white">
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 py-6 sm:gap-6 sm:p-8 md:gap-8">
        <Image src="/logo-selection.webp" alt="Logo" width={560} height={560} priority sizes="(max-width: 640px) 320px, (max-width: 768px) 400px, (max-width: 1024px) 480px, 560px" className="h-auto w-full max-w-[160px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-[280px]" />

        {hasMounted && entityName && (
          <a href={entityBackHref} className="flex items-center gap-3 rounded-full border border-gray-100 bg-white px-4 py-2 shadow-sm transition-colors hover:bg-gray-50">
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ backgroundColor: "#E0F7FA", color: "#00838F" }}>
              {acronym}
            </span>
            <span className="text-sm font-semibold text-[#474747]">
              {entityName}
            </span>
          </a>
        )}

        <h1 className="text-center text-lg font-bold text-black sm:text-xl md:text-2xl">
          Choose Module Type
        </h1>
        <div className="module-buttons-group mx-auto flex w-full max-w-[260px] flex-col items-center justify-center gap-4 sm:max-w-[400px] sm:flex-row sm:flex-nowrap sm:gap-6 md:max-w-[820px]">
          <ModuleButton iconSrc="/pettycash-icon.webp" iconAlt="Petty cash" imageScale={0.8} hoverBackImage="/minty-l.webp" onClick={handleClick} onTouchEnd={handleTouchEnd} />
          <ModuleButton iconSrc="/payment-icon.webp" iconAlt="Payment request" imageScale={1.0} hoverBackImage="/minty-r.webp" hoverBackImagePosition="top-right" onClick={handlePaymentClick} onTouchEnd={handlePaymentTouchEnd} />
        </div>
      </main>

      <div className={`pointer-events-none fixed bottom-0 left-1/2 z-[100] block h-[260px] w-[280px] max-w-[85vw] -translate-x-1/2 transition-transform duration-300 ease-out md:hidden ${showMinty ? "translate-y-[25%]" : "translate-y-full"}`} aria-hidden><Image src="/minty.webp" alt="" fill className="object-contain object-bottom" sizes="280px" /></div>

      {isNavigating ? (
        <div className="fixed inset-0 z-[200] flex flex-col bg-white">
          <LoadingScreen embedded>
            <div className={`pointer-events-none relative h-[260px] w-[280px] max-w-[85vw] shrink-0 self-center transition-transform duration-300 ease-out md:hidden ${loadingMintyPeek ? "translate-y-[25%]" : "translate-y-full"}`} aria-hidden><Image src="/minty.webp" alt="" fill className="object-contain object-bottom" sizes="280px" /></div>
          </LoadingScreen>
        </div>
      ) : null}
    </div>
  );
}

export default function ModuleSelection() {
  return (
    <Suspense>
      <ModuleSelectionContent />
    </Suspense>
  );
}
