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
  const base = "rounded-md px-3 py-1 text-xs font-semibold sm:text-sm";
  switch (displayLabel) {
    case "Paid":
      return `${base} bg-secondary/10 text-secondary`;
    case "Partially paid":
      return `${base} bg-[#70ebba]/10 text-[#70ebba]`;
    case "Payment Requested":
      return `${base} bg-[#FFF0F0] text-[#FF6B6B]`;
    case "Returned":
      return `${base} bg-[#EA9713]/10 text-[#EA9713]`;
    case "Voided":
      return `${base} bg-[#8587c5]/10 font-semibold text-[#8587c5]`;
    case "Draft":
      return `${base} bg-[#EDEDED] font-medium text-[#C0C0C0]`;
    default:
      return `${base} bg-[#EDEDED] font-medium text-[#C0C0C0]`;
  }
}
