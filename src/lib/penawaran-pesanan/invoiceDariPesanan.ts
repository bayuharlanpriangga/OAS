import type { PesananInvoiceRecord } from "./types";

export function invoiceDariPesanan(
  daftarInvoice: readonly PesananInvoiceRecord[],
  pesananId: string
): PesananInvoiceRecord | null {
  if (!pesananId) return null;
  return (
    (Array.isArray(daftarInvoice) ? daftarInvoice : []).find(
      (i) => i && i.refJenis === "pesanan_jual" && i.refId === pesananId
    ) || null
  );
}
