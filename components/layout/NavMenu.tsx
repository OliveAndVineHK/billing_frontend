"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createPortal } from "react-dom";
import { useEffect, useId, useState } from "react";
import { pushAppScrollLock } from "@/lib/appScrollRoot";

function navItemIsActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

type NavMenuItem = { href: string; label: string; icon?: string };

type NavMenuSection = { title: string; items: NavMenuItem[] };

const DEFAULT_MENU_SECTIONS: NavMenuSection[] = [
  {
    title: "Petty Cash",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "space_dashboard" },
      { href: "/reports", label: "Reports", icon: "bar_chart" },
    ],
  },
  {
    title: "Payment Request",
    items: [{ href: "/", label: "Bills", icon: "local_atm" }],
  },
];

const defaultItems: NavMenuItem[] = [
  { href: "/select-entity", label: "Select entity", icon: "corporate_fare" },
  ...DEFAULT_MENU_SECTIONS.flatMap((s) => s.items),
  { href: "/settings", label: "Settings", icon: "settings" },
  { href: "/module-selection", label: "Change Module", icon: "change_circle" },
];

type NavMenuProps = {
  items?: NavMenuItem[];
  menuSections?: NavMenuSection[];
  companyAbbreviation?: string;
  onLogout?: () => void;
};

function NavMenuItemLink({
  item,
  pathname,
  onNavigate,
  className = "",
}: {
  item: NavMenuItem;
  pathname: string;
  onNavigate: () => void;
  className?: string;
}) {
  const active = navItemIsActive(pathname, item.href);
  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-base font-medium transition-colors ${active ? "bg-secondary/15 text-secondary" : "text-primary hover:bg-primary/10"} ${className}`}>
      {item.icon ? <span className={`material-symbols-outlined shrink-0 text-[22px] leading-none ${active ? "text-secondary" : "text-primary"}`} aria-hidden>{item.icon}</span> : null}
      {item.label}
    </Link>
  );
}

export function NavMenu({ items = defaultItems, menuSections = DEFAULT_MENU_SECTIONS, companyAbbreviation = "ICH", onLogout }: NavMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);
  const panelId = useId();
  const selectEntityItem = items.find((i) => i.href === "/select-entity");
  const settingsItem = items.find((i) => i.href === "/settings");
  const changeModuleItem = items.find((i) => i.href === "/module-selection");

  useEffect(() => {
    setPortalReady(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    return pushAppScrollLock();
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const drawer = (
    <div className={`fixed inset-0 z-[200] overflow-x-hidden overscroll-x-none ${open ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!open}>
      <button type="button" className={`absolute inset-0 cursor-pointer bg-black/40 transition-opacity duration-300 ease-out ${open ? "opacity-100" : "opacity-0"}`} onClick={() => setOpen(false)} tabIndex={open ? 0 : -1} aria-label="Close menu" />
      <nav
        id={panelId}
        className={`absolute right-0 top-0 flex h-full w-[min(100%,18rem)] max-w-[calc(100%-env(safe-area-inset-left)-env(safe-area-inset-right))] flex-col bg-white pt-[env(safe-area-inset-top,0px)] shadow-xl transition-transform duration-300 ease-out ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-label="Main navigation"
      >
          <div className="flex flex-col gap-3 border-b border-primary/20 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-w-0 items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm font-semibold tracking-wide text-primary sm:text-base" title={companyAbbreviation}>
                {companyAbbreviation}
              </span>
              <button type="button" onClick={() => setOpen(false)} className="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-label="Close menu">
                <span className="material-symbols-outlined text-[26px] leading-none">close</span>
              </button>
            </div>
            {selectEntityItem ? (
              <NavMenuItemLink item={selectEntityItem} pathname={pathname} onNavigate={() => setOpen(false)} />
            ) : null}
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
              {menuSections.map((section) => (
                <div key={section.title} className={`flex flex-col ${section.title === "Payment Request" ? "mt-6 gap-3" : "gap-1"}`} role="group" aria-label={section.title}>
                  <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-primary/70">{section.title}</p>
                  <ul className="flex flex-col gap-1">
                    {section.items.map((item) => (
                      <li key={item.href} className="w-full">
                        <NavMenuItemLink item={item} pathname={pathname} onNavigate={() => setOpen(false)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {settingsItem || changeModuleItem ? (
              <div className="flex shrink-0 flex-col gap-1">
                {settingsItem ? <NavMenuItemLink item={settingsItem} pathname={pathname} onNavigate={() => setOpen(false)} /> : null}
                {changeModuleItem ? <NavMenuItemLink item={changeModuleItem} pathname={pathname} onNavigate={() => setOpen(false)} /> : null}
              </div>
            ) : null}
          </div>
          <div className="shrink-0 border-t border-primary/20 px-4 py-3 sm:px-6 sm:py-4">
            <button type="button" onClick={() => { setOpen(false); onLogout?.(); }} className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-base font-medium text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
              <span className="material-symbols-outlined shrink-0 text-[22px] leading-none text-primary" aria-hidden>
                logout
              </span>
              Logout
            </button>
          </div>
        </nav>
    </div>
  );

  return (
    <div className="flex shrink-0 items-center">
      <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md text-primary transition-colors hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" aria-expanded={open} aria-controls={panelId} aria-label="Open navigation menu">
        <span className="material-symbols-outlined text-[26px] leading-none">menu</span>
      </button>
      {portalReady ? createPortal(drawer, document.body) : null}
    </div>
  );
}
