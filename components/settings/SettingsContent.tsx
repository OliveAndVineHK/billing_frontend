"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { AccountCodeSettings } from "./AccountCodeSettings";
import { getSettingsTabFromSearchParams, SETTINGS_TAB_LABELS, SettingsPills } from "./SettingsPills";
import { SettingsPlaceholder } from "./SettingsPlaceholder";

const MODULE1_URL =
  process.env.NEXT_PUBLIC_MODULE1_URL ?? "http://localhost:5001";

export function SettingsContent() {
  const searchParams = useSearchParams();
  const tab = getSettingsTabFromSearchParams(searchParams.get("tab"));
  const [entityId, setEntityId] = useState("");

  useEffect(() => {
    const auth = getAuth();
    if (auth?.entityId) setEntityId(auth.entityId);
  }, []);

  return (
    <div className="mx-auto w-full max-w-[1024px] px-4 sm:px-6">
      <div className="pt-3 sm:pt-4">
        <SettingsPills activeTab={tab} entityId={entityId} module1Url={MODULE1_URL} />
      </div>
      {tab === "bill" ? (
        <AccountCodeSettings />
      ) : (
        <SettingsPlaceholder title={SETTINGS_TAB_LABELS[tab]} />
      )}
    </div>
  );
}
