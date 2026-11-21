export function tanggalPembalikBill(
  tanggalJurnal: string,
  hariIni: string
): string {
  const t = typeof tanggalJurnal === "string" ? tanggalJurnal.slice(0, 10) : "";
  return t && t > hariIni ? t : hariIni;
}
