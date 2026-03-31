"use client";

import Link from "next/link";

export const SETTINGS_TAB_IDS = ["users", "xero", "entity", "bill"] as const;
export type SettingsTabId = (typeof SETTINGS_TAB_IDS)[number];

const TABS: { id: SettingsTabId; label: string }[] = [
  { id: "users", label: "Users" },
  { id: "xero", label: "Xero Integration" },
  { id: "entity", label: "Entity Settings" },
  { id: "bill", label: "Bill Settings" },
];

export const SETTINGS_TAB_LABELS: Record<SettingsTabId, string> = {
  users: "Users",
  xero: "Xero Integration",
  entity: "Entity Settings",
  bill: "Bill Settings",
};

export function getSettingsTabFromSearchParams(tab: string | null): SettingsTabId {
  if (tab && SETTINGS_TAB_IDS.includes(tab as SettingsTabId)) return tab as SettingsTabId;
  return "bill";
}

const pillClass = (isActive: boolean) =>
  `shrink-0 rounded-full px-4 py-2 text-center text-sm font-medium transition-colors flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary ${
    isActive ? "bg-secondary font-semibold text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
  }`;

type SettingsPillsProps = {
  activeTab: SettingsTabId;
};

export function SettingsPills({ activeTab }: SettingsPillsProps) {
  return (
    <div className="w-full px-4 sm:px-6">
      <div className="-mx-4 flex flex-wrap gap-2 px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map(({ id, label }) => {
          const isActive = activeTab === id;
          return (
            <Link
              key={id}
              href={`/settings?tab=${id}`}
              scroll={false}
              className={pillClass(isActive)}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
