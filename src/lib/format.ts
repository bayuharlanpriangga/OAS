const MONTHS_ID = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

export function fmtRp(n: number | null | undefined): string {
  if (!n) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${day} ${MONTHS_ID[idx] ?? ""} ${y}`;
}

export function rpNum(n: number): number {
  return Math.round(n) || 0;
}

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function ymd(y: number, m0: number, d: number): string {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
}

export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeForJsAttr(str: unknown): string {
  if (str === null || str === undefined) return "";
  return escapeHtml(String(str).replace(/\\/g, "\\\\").replace(/'/g, "\\'"));
}
