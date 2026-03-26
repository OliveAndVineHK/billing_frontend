"use client";

import { useState } from "react";

export type ActivityHistoryItem = {
  id: string;
  initials: string;
  /** Bold dark name, e.g. "John Doe" */
  userName: string;
  /** Regular-weight verb between name and subject, e.g. "created", "uploaded" */
  verb: string;
  /** Bold medium-grey subject, e.g. "Payment Request #123", "Bank Slip" */
  subjectBold: string;
  timeLabel: string;
};

type ActivityHistoryAccordionProps = {
  items?: ActivityHistoryItem[];
};

const defaultItems: ActivityHistoryItem[] = [
  { id: "1", initials: "JD", userName: "John Doe", verb: "created", subjectBold: "Payment Request #123", timeLabel: "01 Mar 2026 • 09:32 AM" },
  { id: "2", initials: "JD", userName: "John Doe", verb: "uploaded", subjectBold: "Bank Slip", timeLabel: "02 Mar 2026 • 11:05 AM" },
  { id: "3", initials: "AM", userName: "Alex Moore", verb: "updated", subjectBold: "amount", timeLabel: "03 Mar 2026 • 02:18 PM" },
  { id: "4", initials: "SC", userName: "Sarah Chen", verb: "approved", subjectBold: "Payment Request #123", timeLabel: "04 Mar 2026 • 08:15 AM" },
  { id: "5", initials: "JD", userName: "John Doe", verb: "commented on", subjectBold: "invoice details", timeLabel: "04 Mar 2026 • 03:42 PM" },
  { id: "6", initials: "AM", userName: "Alex Moore", verb: "exported", subjectBold: "payment report", timeLabel: "05 Mar 2026 • 10:00 AM" },
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
        <h2 className="text-base font-semibold text-[#5c5c5c] sm:text-lg">Activity History</h2>
        <span className="material-symbols-outlined text-[#5c5c5c]/70" aria-hidden>
          {open ? "expand_less" : "expand_more"}
        </span>
      </button>
      {open ? (
        <div className="px-4 pb-5 pt-3 sm:px-5">
          <div
            className="min-h-0 max-h-[min(14rem,38dvh)] overflow-y-auto overscroll-y-contain pr-1 [scrollbar-gutter:stable] sm:max-h-[min(17.5rem,45vh)]"
            role="region"
            aria-label="Activity history list"
          >
            <div className="relative pb-0.5">
              {/* Vertical timeline — full content height inside scroll area */}
              <div className="absolute bottom-3 left-[7px] top-3 w-px bg-[#e0e0e0]" aria-hidden />
              <ul className="relative flex flex-col gap-3">
                {items.map((item) => (
                  <li key={item.id} className="relative flex gap-3">
                    {/* Dot on timeline */}
                    <div className="relative z-[1] flex w-4 shrink-0 justify-center pt-[18px]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#9ca3af] ring-[3px] ring-white" aria-hidden />
                    </div>
                    {/* Card */}
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
        </div>
      ) : null}
    </section>
  );
}
