/** Maps API bill `status` (lowercase) to list/detail display labels. */
export function billStatusToDisplayLabel(status: string): string {
  const k = status.trim().toLowerCase().replace(/-/g, "_");
  const map: Record<string, string> = {
    draft: "Draft",
    submitted: "Payment Requested",
    paid: "Paid",
    partially_paid: "Partially paid",
    voided: "Voided",
    returned: "Returned",
  };
  if (map[k]) return map[k];
  if (!k) return "—";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Header badge styles aligned with table status tags. */
export function statusDisplayBadgeClass(displayLabel: string): string {
  const base =
    "inline-flex max-w-full items-center justify-center rounded-md px-3 py-1 text-center text-xs font-semibold sm:min-w-[11rem] sm:text-sm";
  switch (displayLabel) {
    case "Paid":
      return `${base} border border-primary/25 bg-transparent text-[#656565]`;
    case "Payment Requested":
      return `${base} bg-secondary/10 text-secondary`;
    case "Partially paid":
      return `${base} bg-[#70ebba]/10 text-[#70ebba]`;
    case "Returned":
      return `${base} bg-[#EA9713]/10 text-[#EA9713]`;
    case "Voided":
      return `${base} bg-[#ADB3BD] font-semibold text-white`;
    case "Draft":
      return `${base} bg-[#EDEDED] font-medium text-[#C0C0C0]`;
    default:
      return `${base} bg-[#EDEDED] font-medium text-[#C0C0C0]`;
  }
}
