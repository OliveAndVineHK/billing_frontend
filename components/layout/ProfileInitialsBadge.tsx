"use client";

import { useEffect, useState } from "react";
import { fetchAuthMe } from "@/lib/api";

function initialsFromNames(first?: string | null, last?: string | null): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  const a = f.charAt(0);
  const b = l.charAt(0);
  if (a && b) return (a + b).toUpperCase();
  if (a) return a.toUpperCase();
  if (b) return b.toUpperCase();
  return "—";
}

export function ProfileInitialsBadge() {
  const [abbr, setAbbr] = useState<string | null>(null);
  const [label, setLabel] = useState<string>("User profile");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await fetchAuthMe();
        if (cancelled) return;
        const full = [me.first_name, me.last_name]
          .map((s) => (typeof s === "string" ? s.trim() : ""))
          .filter(Boolean)
          .join(" ");
        if (full) setLabel(full);
        setAbbr(initialsFromNames(me.first_name, me.last_name));
      } catch {
        if (!cancelled) setAbbr("—");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <span className="inline-flex items-center justify-center w-7 h-7 shrink-0 rounded-full bg-[#FFE6B1] text-[12px] font-semibold text-[#6B3A12]" aria-label={label} title={label}>
      {abbr === null ? <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary/30" aria-hidden /> : abbr}
    </span>
  );
}
