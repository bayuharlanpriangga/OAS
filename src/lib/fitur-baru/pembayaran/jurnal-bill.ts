import type { Bill, BuatJurnalPembayaranResult, Pembayaran } from "@/types";
import { JENIS_JURNAL } from "../../shared/accounting/constants";
import { bayarBulat } from "./pembulatan";
import { bayarTanggalValid } from "./validasi-tanggal";

export function buatJurnalPembayaranBill(
  pembayaran: Pembayaran | null | undefined,
  bill: Bill | null | undefined
): BuatJurnalPembayaranResult {
  const gagal = (pesan: string): BuatJurnalPembayaranResult => ({
    ok: false,
    pesan,
  });
  const teks = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  if (!pembayaran || pembayaran.jenis !== "bill") {
    return gagal("Pembayaran tagihan tidak valid.");
  }
  if (!bill || String(pembayaran.dokId) !== String(bill.id)) {
    return gagal("Tagihan untuk pembayaran ini tidak ditemukan.");
  }
  const jumlah =
    typeof pembayaran.jumlah === "number" && isFinite(pembayaran.jumlah)
      ? bayarBulat(pembayaran.jumlah)
      : 0;
  if (jumlah <= 0) return gagal("Jumlah pembayaran tidak valid.");
  if (!bayarTanggalValid(teks(pembayaran.tanggal))) {
    return gagal("Tanggal pembayaran tidak valid.");
  }
  const akunKas = teks(pembayaran.akunKas);
  const akunUtang = teks(bill.akunUtang);
  if (!akunKas) return gagal("Akun kas/bank pembayaran kosong.");
  if (!akunUtang) return gagal("Tagihan ini tidak punya akun utang usaha.");
  if (akunKas === akunUtang) {
    return gagal("Akun kas/bank dan akun utang tidak boleh sama.");
  }
  const no = teks(bill.noBill) || teks(pembayaran.noDok);
  const supplier = teks(bill.supplier);

  return {
    ok: true,
    jurnal: {
      tanggal: pembayaran.tanggal,
      jenis: JENIS_JURNAL.BILL,
      keterangan: `Pembayaran Tagihan ${no} — ${supplier}`,
      ref: no,
      lines: [
        { akun: akunUtang, ket: "Pembayaran utang " + no, debit: jumlah, kredit: 0 },
        {
          akun: akunKas,
          ket: "Pengeluaran pembayaran " + no,
          debit: 0,
          kredit: jumlah,
        },
      ],
    },
  };
}
