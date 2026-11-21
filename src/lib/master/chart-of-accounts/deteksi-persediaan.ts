export function guessAkunPersediaanDefault(namaGabungan: string): string {
  const n = (namaGabungan || "").toLowerCase();
  if (n.includes("barang jadi") || n.includes("finished")) return "1304";
  if (n.includes("dalam proses") || n.includes("wip")) return "1303";
  if (n.includes("bahan baku") || n.includes("raw material")) return "1302";
  return "1301";
}
