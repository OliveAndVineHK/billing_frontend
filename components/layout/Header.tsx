import Image from "next/image";
import Link from "next/link";
import { NavMenu } from "./NavMenu";

type HeaderProps = {
  title?: string;
  showLogo?: boolean;
  brandHref?: string;
  navItems?: { href: string; label: string }[];
  companyName?: string;
  companyAbbreviation?: string;
  onLogout?: () => void;
};

export function Header({ title = "Payment Request", showLogo = false, brandHref, navItems, companyName = "Insert Company Here", companyAbbreviation = "ICH", onLogout }: HeaderProps) {
  const homeHref = brandHref === undefined ? "/" : brandHref;

  const brand = (
    <>
      {showLogo ? (
        <Image src="/logo-selection.webp" alt="" width={40} height={40} priority className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
      ) : null}
      <span className="min-w-0 truncate text-base font-semibold text-black sm:text-lg">{title}</span>
    </>
  );

  return (
    <header className="border-b border-gray-200 bg-white pt-[env(safe-area-inset-top,0px)]">
      <div className="flex w-full min-w-0 flex-row items-center justify-between gap-2 px-4 py-3 sm:gap-3 sm:px-6 sm:py-4">
        {homeHref ? (
          <Link href={homeHref} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {brand}
          </Link>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">{brand}</div>
        )}
        <div className="flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          <span className="material-symbols-outlined shrink-0 text-[22px] leading-none text-primary sm:text-[26px]" aria-hidden>
            corporate_fare
          </span>
          <span className="min-w-0 max-w-[min(100%,9rem)] truncate text-sm font-medium text-primary sm:max-w-[14rem] sm:text-base md:max-w-xs">
            {companyName}
          </span>
          <div className="shrink-0 pl-0.5 sm:pl-2">
            <NavMenu items={navItems} companyAbbreviation={companyAbbreviation} onLogout={onLogout} />
          </div>
        </div>
      </div>
    </header>
  );
}
