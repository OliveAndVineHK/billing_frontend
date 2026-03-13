import Image from "next/image";
import { ModuleButton } from "@/components/ModuleButton";

export default function ModuleSelection() {
  return (
    <div className="min-h-screen bg-white">
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 py-6 sm:gap-6 sm:p-8 md:gap-8">
        <Image src="/logo-selection.webp" alt="Logo" width={560} height={560} priority sizes="(max-width: 640px) 320px, (max-width: 768px) 400px, (max-width: 1024px) 480px, 560px" className="h-auto w-full max-w-[160px] sm:max-w-[200px] md:max-w-[240px] lg:max-w-[280px]" />
        <h1 className="text-center text-lg font-bold text-black sm:text-xl md:text-2xl">Choose Module Type</h1>
        <div className="mx-auto flex w-full max-w-[260px] flex-col items-center justify-center gap-4 overflow-visible sm:max-w-[400px] sm:flex-row sm:flex-nowrap sm:gap-6 md:max-w-[820px]">
          <ModuleButton iconSrc="/pettycash-icon.webp" iconAlt="Petty cash" imageScale={0.8} hoverBackImage="/minty-l.webp" />
          <ModuleButton iconSrc="/payment-icon.webp" iconAlt="Payment request" imageScale={1.0} hoverBackImage="/minty-r.webp" hoverBackImagePosition="top-right" />
        </div>
      </main>
    </div>
  );
}
