export function fmtRpDash(n: number): string {
  return n ? "Rp " + Math.round(n).toLocaleString("id-ID") : "—";
}
