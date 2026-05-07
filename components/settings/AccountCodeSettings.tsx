"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { fetchEntityBillAccounts, updateEntityBillAccount } from "@/lib/api";
import { useUserRole } from "@/lib/useUserRole";
import { getAuth } from "@/lib/auth";
import { MINTY_MODULE_URL } from "@/lib/mintyUrls";

const CHECKBOX_CLASS = "checkbox-secondary-white-tick h-4 w-4 shrink-0 rounded border border-primary/40 disabled:opacity-40";

export type AccountCodeRow = { id: string; label: string };

export function AccountCodeSettings() {
  const { isViewOnly, role } = useUserRole();
  const isCashier = (role ?? "").trim().toLowerCase() === "cashier";
  const readOnly = isViewOnly || isCashier;
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "1";
  const cardRef = useRef<HTMLDivElement>(null);
  const saveSpotlightRef = useRef<HTMLDivElement>(null);
  const [tourStep, setTourStep] = useState<"card" | "save">("card");
  const onboardingBackHref = (() => {
    const auth = getAuth();
    if (auth?.entityId) {
      return `${MINTY_MODULE_URL}/entity/${auth.entityId}/onboarding`;
    }
    return `${MINTY_MODULE_URL}/entity`;
  })();
  useEffect(() => {
    if (!isOnboarding) return;
    const target = tourStep === "save" ? saveSpotlightRef.current : cardRef.current;
    if (!target) return;
    const t = window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 250);
    return () => clearTimeout(t);
  }, [isOnboarding, tourStep]);
  const [rows, setRows] = useState<AccountCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEntityBillAccounts({ forceChartSync: true, includeInactive: true })
      .then((accounts) => {
        if (cancelled) return;
        setRows(
          accounts.map((a) => ({
            id: a.id,
            label: `${a.account_code} - ${a.account_name}`,
          })),
        );
        const activeIds = new Set(accounts.filter((a) => a.is_active).map((a) => a.id));
        setSelectedIds(activeIds);
        setSavedIds(activeIds);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const hasChanges = useMemo(() => {
    if (selectedIds.size !== savedIds.size) return true;
    for (const id of selectedIds) {
      if (!savedIds.has(id)) return true;
    }
    return false;
  }, [selectedIds, savedIds]);

  const changedIds = useMemo(() => {
    const ids: { id: string; is_active: boolean }[] = [];
    for (const row of rows) {
      const wasActive = savedIds.has(row.id);
      const isActive = selectedIds.has(row.id);
      if (wasActive !== isActive) ids.push({ id: row.id, is_active: isActive });
    }
    return ids;
  }, [rows, selectedIds, savedIds]);

  const navigateToOnboardingHub = () => {
    const auth = getAuth();
    if (auth?.entityId) {
      window.location.href =
        `${MINTY_MODULE_URL}/entity/${auth.entityId}/onboarding/bill-settings/complete`;
    }
  };

  const handleSave = async () => {
    if (saving) return;
    if (!hasChanges) {
      if (isOnboarding) navigateToOnboardingHub();
      return;
    }
    setSaving(true);
    setSaveMessage(null);
    try {
      await Promise.all(
        changedIds.map(({ id, is_active }) => updateEntityBillAccount(id, { is_active })),
      );
      setSavedIds(new Set(selectedIds));
      setSaveMessage({ type: "success", text: "Changes saved successfully." });
      if (isOnboarding) {
        navigateToOnboardingHub();
        return;
      }
    } catch {
      setSaveMessage({ type: "error", text: "Failed to save some changes. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!saveMessage) return;
    const t = window.setTimeout(() => setSaveMessage(null), 3000);
    return () => clearTimeout(t);
  }, [saveMessage]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.label.toLowerCase().includes(q));
  }, [rows, search]);

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selectedIds.has(r.id));
  const someFilteredSelected = filtered.some((r) => selectedIds.has(r.id)) && !allFilteredSelected;

  useEffect(() => {
    const el = selectAllRef.current;
    if (el) el.indeterminate = someFilteredSelected;
  }, [someFilteredSelected]);

  const visibleIds = useMemo(() => new Set(filtered.map((r) => r.id)), [filtered]);

  const toggleRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAllFiltered = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        for (const id of visibleIds) next.delete(id);
      } else {
        for (const id of visibleIds) next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="w-full pb-8 pt-2 sm:pt-3">
      <div
        ref={cardRef}
        className={`overflow-visible rounded-lg border border-gray-200 bg-white shadow-sm${isOnboarding && tourStep === "card" ? " onboarding-spotlight" : ""}`}
      >
        <div className="flex w-full items-start gap-3 px-4 py-4 sm:px-5">
          <button type="button" onClick={() => setExpanded((e) => !e)} className="flex flex-1 items-start justify-between gap-3 text-left" aria-expanded={expanded}>
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-semibold text-gray-800 sm:text-lg">Bill Account Code</h2>
              <p className="text-sm text-gray-600">Only selected account code will appear when adding a bill in Bill.</p>
            </div>
          </button>
          <div className="group relative inline-flex shrink-0 items-center" tabIndex={0}>
            <button
              type="button"
              className="text-gray-400 transition-colors hover:text-secondary focus:outline-none focus-visible:text-secondary"
              aria-label="More information about Bill Account Code"
              aria-describedby="billAccountCodeTooltip"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </button>
            <div
              id="billAccountCodeTooltip"
              role="tooltip"
              className={`pointer-events-none absolute right-full top-1/2 z-50 mr-2 w-64 -translate-y-1/2 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs leading-snug text-white shadow-lg opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100${isOnboarding && tourStep === "card" ? " onboarding-tooltip-open" : ""}`}
            >
              Pick the account codes that should appear when adding a bill with a supporting document.
              {isOnboarding ? (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <a
                    href={onboardingBackHref}
                    className="inline-flex items-center rounded-md border border-white/40 px-2.5 py-1 text-xs font-medium leading-none text-white transition-colors hover:bg-white/10"
                  >
                    <span className="leading-none">Back</span>
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      (e.currentTarget as HTMLButtonElement).blur();
                      setTourStep("save");
                    }}
                    className="inline-flex items-center rounded-md bg-secondary px-2.5 py-1 text-xs font-medium leading-none text-white transition-colors hover:opacity-80"
                  >
                    <span className="leading-none">Next</span>
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <button type="button" onClick={() => setExpanded((e) => !e)} aria-label={expanded ? "Collapse Bill Account Code" : "Expand Bill Account Code"} aria-expanded={expanded}>
            <span
              className={`material-symbols-outlined shrink-0 cursor-pointer text-[24px] leading-none text-gray-400 transition-transform duration-200 ease-out ${expanded ? "rotate-0" : "rotate-180"}`}
              aria-hidden
            >
              expand_more
            </span>
          </button>
        </div>

        {expanded ? (
          <div className="flex flex-col gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
            <div className="relative">
              <label htmlFor="settings-account-search" className="sr-only">
                Search account code
              </label>
              <input id="settings-account-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search account code" autoComplete="off" className="box-border h-11 w-full rounded-lg border border-gray-300 bg-white py-0 pl-3 pr-11 text-base text-black placeholder:text-gray-700 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25" />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center justify-center text-gray-300" aria-hidden>
                <span className="material-symbols-outlined inline-flex text-[22px] leading-none">search</span>
              </span>
            </div>

            {loading ? (
              <>
                <div className="flex items-center justify-between gap-3 px-3 sm:px-4">
                  <span className="min-w-0 flex-1 text-right text-base font-normal text-primary">Select all</span>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={false}
                    disabled
                    className={CHECKBOX_CLASS}
                    aria-label="Select all visible account codes"
                    aria-busy
                  />
                </div>
                <div className="flex flex-col gap-3 py-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex animate-pulse items-center justify-between gap-3 px-3 sm:px-4">
                      <div className="h-4 flex-1 rounded bg-gray-100" />
                      <div className="h-4 w-4 shrink-0 rounded bg-gray-100" />
                    </div>
                  ))}
                </div>
              </>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-primary/60">No account codes available. Please ensure Xero is connected.</p>
            ) : filtered.length === 0 ? (
              <>
                <div className="flex items-center justify-between gap-3 px-3 sm:px-4">
                  <span className="min-w-0 flex-1 text-right text-base font-normal text-primary">Select all</span>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    disabled
                    className={CHECKBOX_CLASS}
                    aria-label="Select all visible account codes"
                  />
                </div>
                <p className="text-center text-sm text-primary/60">No codes match your search.</p>
              </>
            ) : (
              <ul
                className="visible-scrollbar max-h-[min(24rem,50vh)] overflow-y-auto overscroll-contain rounded-b-lg border-b border-r border-gray-100 [scrollbar-gutter:stable]"
                aria-label="Account codes"
              >
                <li className="sticky top-0 z-10 flex items-center justify-between gap-3 bg-white px-3 py-3 sm:px-4">
                  <span className="min-w-0 flex-1 text-right text-base font-normal text-primary">Select all</span>
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allFilteredSelected}
                    onChange={toggleSelectAllFiltered}
                    disabled={filtered.length === 0 || readOnly}
                    className={CHECKBOX_CLASS}
                    aria-label="Select all visible account codes"
                  />
                </li>
                {filtered.map((row, index) => {
                  const isChecked = selectedIds.has(row.id);
                  return (
                    <li key={row.id} className={`flex items-center justify-between gap-3 px-3 py-3 sm:px-4 ${index > 0 ? "border-t border-gray-100" : ""}`}>
                      <span className="min-w-0 flex-1 text-base font-normal text-gray-700">{row.label}</span>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleRow(row.id)} disabled={readOnly} className={CHECKBOX_CLASS} aria-label={`Include ${row.label} in bill account dropdown`}/>
                    </li>
                  );
                })}
              </ul>
            )}

          </div>
        ) : null}
      </div>

      {expanded ? (
        <div className="mt-3 flex w-full flex-col gap-3">
          {saveMessage ? (
            <p className={`text-center text-sm font-medium ${saveMessage.type === "success" ? "text-emerald-600" : "text-red-600"}`} role="alert">
              {saveMessage.text}
            </p>
          ) : null}
          <div
            ref={saveSpotlightRef}
            className={`relative${isOnboarding && tourStep === "save" ? " onboarding-spotlight rounded-lg" : ""}`}
          >
            <button type="button" onClick={handleSave} disabled={saving || readOnly} title={isViewOnly ? "You have view-only access and cannot perform this action" : isCashier ? "Cashiers cannot modify bill settings" : undefined} className="box-border h-12 w-full cursor-pointer rounded-lg bg-secondary text-base font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-sm">
              {saving ? "Saving…" : "Save Changes"}
            </button>
            {isOnboarding ? (
              <div
                role="tooltip"
                className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 w-64 -translate-x-1/2 rounded-lg bg-gray-900 px-3 py-2 text-left text-xs leading-snug text-white shadow-lg opacity-0 transition-opacity duration-150${tourStep === "save" ? " onboarding-tooltip-open" : ""}`}
              >
                Click Save Changes to save your selection and continue.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
