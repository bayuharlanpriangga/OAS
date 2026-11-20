import { JENIS_JURNAL } from "../accounting/constants";

export function jeninsBadge(jenis: string): string {
  if (jenis === "Kas") return "badge-blue";
  if (jenis === "Penjualan") return "badge-green";
  if (jenis === "Pembelian" || jenis === JENIS_JURNAL.BILL) return "badge-yellow";
  if (jenis === JENIS_JURNAL.INVOICE) return "badge-green";
  return "badge-gray";
}
