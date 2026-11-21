import type { BuatJurnalPembayaranResult, Invoice, Pembayaran } from "@/types";
import { JENIS_JURNAL } from "../../shared/accounting/constants";
import { bayarBulat } from "./pembulatan";
import { bayarKetJurnal } from "./keterangan-jurnal";
import { bayarTanggalValid } from "./validasi-tanggal";

export function buatJurnalPembayaranInvoice(
  pembayaran: Pembayaran | null | undefined,
  inv: Invoice | null | undefined,
  opsi?: { akunPiutang?: string }
): BuatJurnalPembayaranResult {
  const gagal = (pesan: string): BuatJurnalPembayaranResult => ({
    ok: false,
    pesan,
  });
  const teks = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (
    !pembayaran ||
    typeof pembayaran !== "object" ||
    pembayaran.jenis !== "invoice"
  ) {
    return gagal("Pembayaran invoice tidak valid.");
  }
  if (!inv || typeof inv !== "object") {
    return gagal("Invoice untuk pembayaran ini tidak ditemukan.");
  }
  if (String(pembayaran.dokId) !== String(inv.id)) {
    return gagal("Pembayaran ini bukan milik invoice tersebut.");
  }
  const jumlah =
    typeof pembayaran.jumlah === "number" && isFinite(pembayaran.jumlah)
      ? bayarBulat(pembayaran.jumlah)
      : 0;
  if (jumlah <= 0) return gagal("Jumlah pembayaran tidak valid.");
  const tanggal = teks(pembayaran.tanggal);
  if (!bayarTanggalValid(tanggal)) {
    return gagal("Tanggal pembayaran tidak valid.");
  }
  const akunKas = teks(pembayaran.akunKas);
  if (!akunKas) return gagal("Akun kas/bank pembayaran kosong.");
  const akunPiutang =
    teks(inv.akunPiutang) || teks(opsi && opsi.akunPiutang);
  if (!akunPiutang) {
    return gagal(
      "Invoice ini tidak punya akun piutang, jurnal pembayaran tidak bisa dibuat."
    );
  }
  if (akunKas === akunPiutang) {
    return gagal("Akun kas/bank dan akun piutang tidak boleh sama.");
  }
  const no = teks(inv.noInvoice) || teks(pembayaran.noDok);
  const pelanggan = teks(inv.pelanggan);

  return {
    ok: true,
    jurnal: {
      tanggal,
      jenis: JENIS_JURNAL.INVOICE,
      keterangan: bayarKetJurnal(pembayaran, inv),
      ref: no,
      lines: [
        { akun: akunKas, ket: "Penerimaan " + no, debit: jumlah, kredit: 0 },
        {
          akun: akunPiutang,
          ket: "Pelunasan piutang" + (pelanggan ? " — " + pelanggan : ""),
          debit: 0,
          kredit: jumlah,
        },
      ],
    },
  };
}
