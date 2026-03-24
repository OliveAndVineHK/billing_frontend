import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { NavMenu } from "./NavMenu";

type HeaderProps = {
  title?: string;
  showLogo?: boolean;
  brandHref?: string | null;
  /** When set, shows a back link to the payment request dashboard (Bills table). Title is not linked to home. */
  backHref?: string;
  backLabel?: string;
  statusBadge?: ReactNode;
  navItems?: { href: string; label: string }[];
  companyName?: string;
  companyAbbreviation?: string;
  onLogout?: () => void;
};

export function Header({
  title = "Payment Request",
  showLogo = false,
  brandHref,
  backHref,
  backLabel = "Bills",
  statusBadge,
  navItems,
  companyName = "Insert Company Here",
  companyAbbreviation = "ICH",
  onLogout,
}: HeaderProps) {
  const homeHref = brandHref === undefined ? "/" : brandHref;
  const showBack = Boolean(backHref);

  const brand = (
    <>
      {showLogo ? (
        <Image src="/logo-selection.webp" alt="" width={40} height={40} priority className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
      ) : null}
      <span className="text-base font-semibold text-black sm:text-lg">{title}</span>
    </>
  );

  const leftSection = showBack && backHref ? (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-3">
      <Link
        href={backHref}
        className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-primary transition-colors hover:text-secondary sm:text-base"
      >
        <span className="material-symbols-outlined text-[22px] leading-none sm:text-[24px]" aria-hidden>
          chevron_left
        </span>
        {backLabel}
      </Link>
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {showLogo ? (
          <Image src="/logo-selection.webp" alt="" width={40} height={40} priority className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
        ) : null}
        <span className="min-w-0 text-base font-semibold text-black sm:text-lg">{title}</span>
        {statusBadge}
      </div>
    </div>
  ) : homeHref ? (
    <Link href={homeHref} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
      {brand}
    </Link>
  ) : (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">{brand}</div>
  );

  return (
    <header className="border-b border-gray-200 bg-white pt-[env(safe-area-inset-top,0px)]">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-4 lg:px-8">
        <div className="min-w-0 flex-1">{leftSection}</div>
        <div className="flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
          <span className="material-symbols-outlined shrink-0 text-[22px] leading-none text-primary sm:text-[26px]" aria-hidden>
            corporate_fare
          </span>
          <span className="min-w-0 max-w-[min(100%,9rem)] truncate text-sm font-medium text-primary sm:max-w-[14rem] sm:text-base md:max-w-xs lg:max-w-md">
            {companyName}
          </span>
          <div className="pl-1 sm:pl-3">
            <NavMenu items={navItems} companyAbbreviation={companyAbbreviation} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </header>
  );
}
