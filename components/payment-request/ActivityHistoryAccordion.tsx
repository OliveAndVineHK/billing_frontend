"use client";

import { useEffect, useState } from "react";
import { fetchAuditHistory, type AuditItem } from "@/lib/api";

type ActivityHistoryItem = {
  id: string;
  initials: string;
  userName: string;
  verb: string;
  subjectBold: string;
  timeLabel: string;
};

type ActivityHistoryAccordionProps = {
  billId: string;
  billRef?: string;
  refreshSignal?: number;
};

const ACTION_MAP: Record<string, { verb: string; subject: (detail: string, ref: string) => string }> = {
  created:            { verb: "created",           subject: (_d, r) => `Payment Request ${r}` },
  edited:             { verb: "updated",           subject: (_d, r) => `Payment Request ${r}` },
  submitted:          { verb: "submitted",         subject: (_d, r) => `Payment Request ${r}` },
  marked_paid:        { verb: "marked as paid",    subject: (_d, r) => `Payment Request ${r}` },
  voided:             { verb: "voided",            subject: (_d, r) => `Payment Request ${r}` },
  cancelled:          { verb: "cancelled",         subject: (_d, r) => `Payment Request ${r}` },
  status_changed:     { verb: "updated status of", subject: (_d, r) => `Payment Request ${r}` },
  published_to_xero:  { verb: "published",         subject: (_d, r) => `Payment Request ${r} to Xero` },
  attachment_uploaded: { verb: "uploaded",          subject: (d) => d.match(/File '(.+?)'/)?.[1] || "attachment" },
  attachment_deleted:  { verb: "removed",           subject: (d) => d.match(/Attachment '(.+?)'/)?.[1] || "attachment" },
  payment_created:    { verb: "recorded",           subject: (d) => { const m = d.match(/Payment of ([\d,.]+)/); return m ? `Payment of ${m[1]}` : "Payment"; } },
  payment_updated:    { verb: "updated",            subject: () => "Payment" },
  payment_deleted:    { verb: "deleted",            subject: (d) => { const m = d.match(/Payment of ([\d,.]+)/); return m ? `Payment of ${m[1]}` : "Payment"; } },
};

function formatTimeLabel(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${day} \u2022 ${time}`;
}

function auditToItem(audit: AuditItem, billRef: string): ActivityHistoryItem {
  const words = (audit.user_name || "Unknown").trim().split(/\s+/);
  const initials = words.map((w) => w[0]?.toUpperCase() ?? "").join("").slice(0, 2) || "?";

  const mapping = ACTION_MAP[audit.action];
  const verb = mapping?.verb ?? audit.action.replace(/_/g, " ");
  const subject = mapping?.subject(audit.detail, billRef) ?? `Payment Request ${billRef}`;

  return {
    id: audit.id,
    initials,
    userName: audit.user_name || "System",
    verb,
    subjectBold: subject,
    timeLabel: formatTimeLabel(audit.date),
  };
}

export function ActivityHistoryAccordion({ billId, billRef, refreshSignal = 0 }: ActivityHistoryAccordionProps) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<ActivityHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const ref = billRef || `#${billId.slice(0, 8)}`;

  useEffect(() => {
    if (!billId) { setItems([]); return; }
    let cancelled = false;
    setLoading(true);
    fetchAuditHistory(billId)
      .then((audits) => {
        if (!cancelled) setItems(audits.map((a) => auditToItem(a, ref)));
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [billId, ref, refreshSignal]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-2 px-4 py-3 text-left sm:px-5 sm:py-4"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className="text-base font-semibold text-[#5c5c5c] sm:text-lg">Activity History</h2>
        <span className="material-symbols-outlined text-[#5c5c5c]/70" aria-hidden>
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open ? (
        <div className="px-4 pb-5 pt-3 sm:px-5">
          {loading ? (
            <div className="flex items-center justify-center py-6 text-sm text-gray-400">Loading…</div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center py-6 text-sm text-gray-400">No activity yet</div>
          ) : (
            <div
              className="min-h-0 max-h-[min(14rem,38dvh)] overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable] sm:max-h-[min(17.5rem,45vh)]"
              role="region"
              aria-label="Activity history list"
            >
              <div className="relative pb-0.5">
                <div className="absolute bottom-3 left-[7px] top-3 w-px bg-[#e0e0e0]" aria-hidden />
                <ul className="relative flex flex-col gap-3">
                  {items.map((item) => (
                    <li key={item.id} className="relative flex gap-3">
                      <div className="relative z-[1] flex w-4 shrink-0 justify-center pt-[18px]">
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#9ca3af] ring-[3px] ring-white" aria-hidden />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg bg-[#f9f9f9] px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
                        <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-sm font-bold leading-none text-[#333333]">
                            {item.initials}
                          </div>
                          <p className="min-w-0 flex-1 text-sm leading-snug">
                            <span className="font-bold text-[#333333]">{item.userName}</span>
                            <span className="font-normal text-[#666666]"> {item.verb} </span>
                            <span className="font-bold text-[#666666]">{item.subjectBold}</span>
                          </p>
                        </div>
                        <time
                          className="shrink-0 pl-[3.25rem] text-xs font-normal tabular-nums text-[#999999] sm:pl-0 sm:text-right sm:text-sm"
                          dateTime={item.timeLabel}
                        >
                          {item.timeLabel}
                        </time>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
