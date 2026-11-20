export function fmtRp(n: number): string {
  return "Rp " + (Math.round(n) || 0).toLocaleString("id-ID");
}
