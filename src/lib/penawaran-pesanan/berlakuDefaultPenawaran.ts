export function berlakuDefaultPenawaran(
  tanggal: string,
  hari = 14
): string {
  if (typeof tanggal !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return "";
  }
  const d = new Date(tanggal + "T00:00:00Z");
  if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== tanggal) return "";
  d.setUTCDate(d.getUTCDate() + (Number.isInteger(hari) ? hari : 14));
  return d.toISOString().slice(0, 10);
}
