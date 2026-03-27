"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchEntityBillAccounts, updateEntityBillAccount } from "@/lib/api";

const CHECKBOX_CLASS = "checkbox-secondary-white-tick h-4 w-4 shrink-0 rounded border border-primary/40";

export type AccountCodeRow = { id: string; label: string };

export function AccountCodeSettings() {
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
    fetchEntityBillAccounts()
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

  const handleSave = async () => {
    if (!hasChanges || saving) return;
    setSaving(true);
    setSaveMessage(null);
    try {
      await Promise.all(
        changedIds.map(({ id, is_active }) => updateEntityBillAccount(id, { is_active })),
      );
      setSavedIds(new Set(selectedIds));
      setSaveMessage({ type: "success", text: "Changes saved successfully." });
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
    <div className="mx-auto w-full max-w-[40rem] px-4 pb-8 pt-2 sm:px-6 sm:pt-3">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex w-full items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 text-left transition-colors hover:bg-gray-50 sm:px-5"
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-black sm:text-lg">Account Code</h2>
            <p className="mt-1 text-sm text-primary/65">Only ticked codes will appear in the Account Code dropdown when adding a bill</p>
          </div>
          <span className="material-symbols-outlined shrink-0 text-[24px] leading-none text-primary" aria-hidden>
            {expanded ? "expand_less" : "expand_more"}
          </span>
        </button>

        {expanded ? (
          <div className="flex flex-col gap-3 px-4 py-4 sm:px-5 sm:py-5">
            <div className="relative">
              <label htmlFor="settings-account-search" className="sr-only">
                Search account code
              </label>
              <input
                id="settings-account-search"
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search account code"
                autoComplete="off"
                className="box-border h-11 w-full rounded-lg border border-primary/25 bg-white py-0 pl-3 pr-11 text-sm text-black placeholder:text-primary/45 focus:border-secondary focus:outline-none focus:ring-2 focus:ring-secondary/25"
              />
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center justify-center text-primary/55" aria-hidden>
                <span className="material-symbols-outlined inline-flex text-[22px] leading-none">search</span>
              </span>
            </div>

            <div className="flex items-center justify-end gap-2">
              <span className="text-sm font-medium text-primary">Select all</span>
              <input
                ref={selectAllRef}
                type="checkbox"
                checked={allFilteredSelected}
                onChange={toggleSelectAllFiltered}
                disabled={filtered.length === 0}
                className={CHECKBOX_CLASS}
                aria-label="Select all visible account codes"
              />
            </div>

            {loading ? (
              <div className="flex flex-col gap-3 py-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center justify-between gap-3 px-3">
                    <div className="h-4 flex-1 rounded bg-gray-100" />
                    <div className="h-4 w-4 rounded bg-gray-100" />
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <p className="py-8 text-center text-sm text-primary/60">No account codes available. Please ensure Xero is connected.</p>
            ) : filtered.length === 0 ? (
              <p className="text-center text-sm text-primary/60">No codes match your search.</p>
            ) : (
              <ul
                className="max-h-[min(24rem,50vh)] divide-y divide-gray-100 overflow-y-auto overscroll-contain rounded-lg border border-gray-100"
                aria-label="Account codes"
              >
                {filtered.map((row) => {
                  const isChecked = selectedIds.has(row.id);
                  const wasSaved = savedIds.has(row.id);
                  const changed = isChecked !== wasSaved;
                  return (
                    <li key={row.id} className={`flex items-center justify-between gap-3 px-3 py-3 sm:px-4 ${changed ? "bg-secondary/5" : ""}`}>
                      <span className="min-w-0 flex-1 text-sm font-medium text-primary">{row.label}</span>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRow(row.id)}
                        className={CHECKBOX_CLASS}
                        aria-label={`Include ${row.label} in bill account dropdown`}
                      />
                    </li>
                  );
                })}
              </ul>
            )}

            {saveMessage ? (
              <p className={`text-center text-sm font-medium ${saveMessage.type === "success" ? "text-emerald-600" : "text-red-600"}`} role="alert">
                {saveMessage.text}
              </p>
            ) : null}

            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="mt-1 box-border h-12 w-full rounded-lg bg-secondary text-base font-bold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary disabled:cursor-not-allowed disabled:opacity-50 sm:h-11 sm:text-sm"
            >
              {saving ? "Saving…" : hasChanges ? `Save Changes (${changedIds.length})` : "No Changes"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
