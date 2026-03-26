/** Short symbol for common ISO 4217 codes (pill / money display). */
export function currencyLabelForCode(code: string): string {
  const m: Record<string, string> = {
    HKD: "HK$",
    USD: "$",
    EUR: "€",
    GBP: "£",
    CNY: "¥",
  };
  return m[code.toUpperCase()] ?? code;
}
