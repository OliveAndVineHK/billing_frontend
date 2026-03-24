"use client";

import { useState } from "react";

export type ActivityHistoryItem = {
  id: string;
  initials: string;
  userName: string;
  action: string;
  timeLabel: string;
};

type ActivityHistoryAccordionProps = {
  items?: ActivityHistoryItem[];
};

const defaultItems: ActivityHistoryItem[] = [
  { id: "1", initials: "JD", userName: "John Doe", action: "created Payment Request #123", timeLabel: "01 Mar 2026 • 09:32 AM" },
  { id: "2", initials: "JD", userName: "John Doe", action: "uploaded Bank Slip", timeLabel: "02 Mar 2026 • 11:05 AM" },
  { id: "3", initials: "AM", userName: "Alex Moore", action: "updated amount", timeLabel: "03 Mar 2026 • 02:18 PM" },
];

export function ActivityHistoryAccordion({ items = defaultItems }: ActivityHistoryAccordionProps) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left sm:px-5 sm:py-4"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <h2 className="text-base font-semibold text-primary sm:text-lg">Activity History</h2>
        <span
          className="material-symbols-outlined text-primary/70 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          aria-hidden
        >
          expand_more
        </span>
      </button>
      {open ? (
        <div className="border-t border-gray-100 px-4 pb-4 pt-2 sm:px-5 sm:pb-5">
          <div className="relative pl-4">
            <div className="absolute bottom-2 left-[7px] top-2 w-px bg-primary/15" aria-hidden />
            <ul className="flex flex-col gap-3">
              {items.map((item) => (
                <li key={item.id} className="relative flex gap-3 rounded-lg bg-gray-50 px-3 py-3 sm:px-4">
                  <span className="absolute -left-[5px] top-5 h-2 w-2 rounded-full bg-primary/35" aria-hidden />
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-800">
                    {item.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-primary">
                      <span className="font-semibold">{item.userName}</span>{" "}
                      <span className="font-normal text-primary/80">{item.action}</span>
                    </p>
                  </div>
                  <time className="shrink-0 text-xs text-primary/50 sm:text-sm" dateTime={item.timeLabel}>
                    {item.timeLabel}
                  </time>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </section>
  );
}
