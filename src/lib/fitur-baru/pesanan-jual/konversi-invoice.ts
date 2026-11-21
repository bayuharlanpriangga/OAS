import type { CounterRecord, DokRecord } from "@/types";
import { hitungPpn } from "../../shared/accounting/hitung-ppn";
import { hitungTotalDok } from "../penawaran/hitung-total";
import { nomorBerikut } from "../../shared/penomoran/nomor-berikut";
import { berlakuDefaultPenawaran } from "./masa-berlaku";
import { invoiceDariPesanan } from "./cek-invoice";
import type { PesananInvoiceRecord } from "./types";

export function pesananKeInvoice(
  pesanan: DokRecord | null | undefined,
  opsi?: {
    invoices?: readonly PesananInvoiceRecord[];
    counterList?: readonly CounterRecord[];
    tanggal?: string;
    jatuhTempo?: string;
    id?: string;
    noInvoice?: string;
    createdAt?: string;
    akunPiutang?: string;
    akunPend?: string;
  }
):
  | { ok: true; invoice: PesananInvoiceRecord }
  | { ok: false; pesan: string } {
  const gagal = (pesan: string) => ({ ok: false as const, pesan });
  const o = opsi || {};
  if (
    !pesanan ||
    typeof pesanan !== "object" ||
    pesanan.jenis !== "pesanan_jual"
  ) {
    return gagal("Pesanan penjualan tidak ditemukan.");
  }
  if (pesanan.status !== "dikonfirmasi" && pesanan.status !== "sebagian") {
    return gagal(
      "Hanya pesanan berstatus Dikonfirmasi atau Sebagian yang bisa dijadikan Invoice."
    );
  }
  const invoices = Array.isArray(o.invoices) ? o.invoices : [];
  const sudah = invoiceDariPesanan(invoices, pesanan.id);
  if (sudah) {
    return gagal(
      "Pesanan ini sudah punya Invoice (" + (sudah.noInvoice || sudah.id) + ")."
    );
  }
  const tanggal =
    typeof o.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.tanggal)
      ? o.tanggal
      : pesanan.tanggal;
  const tahun = parseInt(tanggal.slice(0, 4), 10);
  const noInvoice =
    o.noInvoice ||
    nomorBerikut(
      "INV",
      tahun,
      invoices.map((i) => i && i.noInvoice),
      o.counterList
    );
  const jatuhTempo =
    typeof o.jatuhTempo === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.jatuhTempo)
      ? o.jatuhTempo
      : berlakuDefaultPenawaran(tanggal, 30) || tanggal;

  const items = (Array.isArray(pesanan.items) ? pesanan.items : []).map(
    (it) => ({
      nama: it.nama,
      qty: it.qty,
      harga: it.harga,
    })
  );
  if (!items.length) return gagal("Pesanan tidak memiliki item.");

  const { subtotal } = hitungTotalDok(pesanan);
  const ppnTarif =
    typeof pesanan.ppnTarif === "number" &&
    isFinite(pesanan.ppnTarif) &&
    pesanan.ppnTarif > 0
      ? pesanan.ppnTarif
      : 0;
  const ppn = ppnTarif ? hitungPpn(subtotal, ppnTarif) : 0;
  const total = subtotal + ppn;

  const invoice: PesananInvoiceRecord = {
    id: o.id || "INV_" + Date.now(),
    noInvoice,
    pelanggan: pesanan.kontak,
    tanggal,
    jatuhTempo,
    deskripsi: pesanan.catatan
      ? `Pesanan ${pesanan.no} — ${pesanan.catatan}`
      : `Pesanan ${pesanan.no}`,
    items,
    subtotal,
    ppn,
    ppnTarif: ppnTarif || 0,
    total,
    sisaTagihan: total,
    status: "draft",
    akunPiutang: o.akunPiutang || "1201",
    akunPend: o.akunPend || "4101",
    createdAt: o.createdAt || new Date().toISOString(),
    refJenis: "pesanan_jual",
    refId: pesanan.id,
    refNo: pesanan.no,
  };
  return { ok: true, invoice };
}
