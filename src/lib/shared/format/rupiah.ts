export function fmtRp(n: number | null | undefined): string {
  if (!n) return "Rp 0";
  return "Rp " + Number(n).toLocaleString("id-ID");
}
