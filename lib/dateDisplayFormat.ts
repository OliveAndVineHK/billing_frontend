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

function tryIsoYmdToCalendarParts(iso: string): { y: number; m: number; d: number } | null {
  const s = iso.trim();
  if (!s) return null;
  const ymd = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const y = Number(ymd.slice(0, 4));
  const m = Number(ymd.slice(5, 7));
  const d = Number(ymd.slice(8, 10));
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return null;
  return { y, m, d };
}

/** Date text fields only: `dd/Mmm/yyyy` with slashes (matches placeholder). */
export function formatIsoDateAsDdMmmYyyy(iso: string): string {
  const p = tryIsoYmdToCalendarParts(iso);
  if (!p) return "";
  const mon = MONTHS_SHORT[p.m - 1];
  return `${String(p.d).padStart(2, "0")}/${mon}/${p.y}`;
}

/** Read-only labels, tables, cards: `03 Apr 2026` (no slashes). */
export function formatIsoDateForDisplay(iso: string): string {
  const p = tryIsoYmdToCalendarParts(iso);
  if (!p) return "";
  const mon = MONTHS_SHORT[p.m - 1];
  return `${String(p.d).padStart(2, "0")} ${mon} ${p.y}`;
}

/** Local calendar date from a `Date` as `03 Apr 2026` (no slashes). */
export function formatLocalDateForDisplay(d: Date): string {
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return formatIsoDateForDisplay(`${y}-${String(m).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
}

/** Calendar date in a specific IANA zone, e.g. HK, as `03 Apr 2026` (no slashes). */
export function formatDateInTimeZoneForDisplay(d: Date, timeZone: string): string {
  if (Number.isNaN(d.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).formatToParts(d);
  const dayRaw = parts.find((p) => p.type === "day")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const year = parts.find((p) => p.type === "year")?.value;
  if (!dayRaw || !month || !year) return "";
  const dNum = Number.parseInt(dayRaw, 10);
  if (!Number.isFinite(dNum)) return "";
  const mon = month.replace(/\.$/, "");
  return `${String(dNum).padStart(2, "0")} ${mon} ${year}`;
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
