const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export function formatIsoDateAsDdMmmYyyy(iso: string): string {
  const s = iso.trim();
  if (!s) return "";
  const ymd = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return "";
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return "";
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return "";
  const mon = MONTHS_SHORT[m - 1];
  return `${String(d).padStart(2, "0")}/${mon}/${y}`;
}

export function parseDdMmmYyyyToIso(raw: string): string | null {
  const t = raw.trim();
  if (!t) return "";
  const maybeIso = t.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(maybeIso)) {
    return formatIsoDateAsDdMmmYyyy(maybeIso) ? maybeIso : null;
  }
  const m = /^(\d{1,2})\/([A-Za-z]{3})\/(\d{4})$/.exec(t);
  if (!m) return null;
  const d = Number.parseInt(m[1], 10);
  const monToken = m[2];
  const y = Number.parseInt(m[3], 10);
  const monthIdx = MONTHS_SHORT.findIndex((mo) => mo.toLowerCase() === monToken.toLowerCase());
  if (monthIdx < 0 || !Number.isFinite(d) || !Number.isFinite(y)) return null;
  const dt = new Date(y, monthIdx, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== monthIdx || dt.getDate() !== d) return null;
  return `${y}-${String(monthIdx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
