export function fmtSignedRp(v: number): { text: string; negative: boolean } {
  const f = "Rp " + Math.abs(Math.round(v)).toLocaleString("id-ID");
  return v < 0 ? { text: `(${f})`, negative: true } : { text: f, negative: false };
}
