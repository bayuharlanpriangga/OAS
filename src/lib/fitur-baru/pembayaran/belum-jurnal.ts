import type {
  Invoice,
  JurnalEntry,
  Pembayaran,
  PembayaranBelumJurnalItem,
} from "@/types";
import { jurnalPembayaranStatus } from "./status-jurnal-invoice";

export function pembayaranInvoiceBelumJurnal(
  daftarPembayaran: readonly Pembayaran[],
  daftarInvoice: readonly Invoice[],
  daftarJurnal: readonly JurnalEntry[]
): PembayaranBelumJurnalItem[] {
  const invs = Array.isArray(daftarInvoice) ? daftarInvoice : [];
  const semua = Array.isArray(daftarPembayaran) ? daftarPembayaran : [];
  const hasil: PembayaranBelumJurnalItem[] = [];
  semua.forEach((p) => {
    if (!p || typeof p !== "object" || p.jenis !== "invoice") return;
    if (!(typeof p.jumlah === "number" && isFinite(p.jumlah) && p.jumlah > 0)) {
      return;
    }
    const inv = invs.find((i) => i && String(i.id) === String(p.dokId));
    if (!inv) return;
    if (jurnalPembayaranStatus(p, inv, daftarJurnal, semua).status !== "belum") {
      return;
    }
    hasil.push({ pembayaran: p, invoice: inv });
  });
  return hasil;
}
