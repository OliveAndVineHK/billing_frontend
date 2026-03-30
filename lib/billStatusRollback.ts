export function normalizeBillStatusKey(status: string): string {
  return (status ?? "").trim().toLowerCase().replace(/-/g, "_");
}
export function billStatusShouldRollbackWhenNoPayments(status: string): boolean {
  const k = normalizeBillStatusKey(status);
  return k === "paid" || k === "partially_paid";
}
