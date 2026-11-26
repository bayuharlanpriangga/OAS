export const MONTHS_ID = [
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

export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function ymd(y: number, m0: number, d: number): string {
  return `${y}-${pad2(m0 + 1)}-${pad2(d)}`;
}

export function agingHariIni(sekarang?: Date): string {
  const d = sekarang instanceof Date ? sekarang : new Date();
  return ymd(d.getFullYear(), d.getMonth(), d.getDate());
}

export function berlakuDefaultPenawaran(tanggal: string, hari = 14): string {
  const base = /^\d{4}-\d{2}-\d{2}$/.test(tanggal)
    ? new Date(`${tanggal}T00:00:00`)
    : new Date();
  if (Number.isNaN(base.getTime())) return agingHariIni();
  base.setDate(base.getDate() + hari);
  return ymd(base.getFullYear(), base.getMonth(), base.getDate());
}

export function tanggalPembalikBill(
  tglAsal: string | undefined,
  hariIni: string
): string {
  if (tglAsal && /^\d{4}-\d{2}-\d{2}$/.test(tglAsal) && tglAsal > hariIni) {
    return tglAsal;
  }
  return hariIni;
}

export function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  const [y, m, day] = d.split("-");
  const idx = parseInt(m, 10) - 1;
  return `${day} ${MONTHS_ID[idx] ?? ""} ${y}`;
}

export function fmtRp(n: number | null | undefined): string {
  if (!n) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}

export function rpNum(n: number): number {
  return Math.round(n) || 0;
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
