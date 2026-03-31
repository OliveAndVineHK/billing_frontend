"use client";

import { useSearchParams } from "next/navigation";
import { AccountCodeSettings } from "./AccountCodeSettings";
import { getSettingsTabFromSearchParams, SETTINGS_TAB_LABELS, SettingsPills } from "./SettingsPills";
import { SettingsPlaceholder } from "./SettingsPlaceholder";

export function SettingsContent() {
  const searchParams = useSearchParams();
  const tab = getSettingsTabFromSearchParams(searchParams.get("tab"));

  return (
    <>
      <div className="pt-3 sm:pt-4">
        <SettingsPills activeTab={tab} />
      </div>
      {tab === "bill" ? (
        <AccountCodeSettings />
      ) : (
        <SettingsPlaceholder title={SETTINGS_TAB_LABELS[tab]} />
      )}
    </>
  );
}
