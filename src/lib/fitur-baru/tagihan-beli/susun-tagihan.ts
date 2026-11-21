import type { BillFormInput, BillItem, SusunBillResult } from "@/types";
import { PPN_TARIF_STANDAR } from "../../shared/accounting/constants";
import { hitungTotalBill } from "./hitung-total";

export function susunBill(
  f: BillFormInput,
  daftarNomor?: readonly (string | null | undefined)[]
): SusunBillResult {
  const gagal = (pesan: string): SusunBillResult => ({ ok: false, pesan });
  const input = f || {};
  const teks = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const angka = (v: unknown) =>
    typeof v === "number" && isFinite(v) && v > 0 ? v : 0;

  const status = input.status;
  if (status !== "draft" && status !== "diterima") {
    return gagal("Status tagihan tidak valid.");
  }

  const noBill = teks(input.noBill).toUpperCase();
  const supplier = teks(input.supplier);
  if (!supplier) return gagal("Isi nama supplier.");
  if (!noBill) return gagal("Isi nomor tagihan.");
  if (
    (Array.isArray(daftarNomor) ? daftarNomor : []).some(
      (n) => String(n || "").trim().toUpperCase() === noBill
    )
  ) {
    return gagal(
      "Nomor tagihan " +
        noBill +
        " sudah dipakai. Ganti nomornya, atau tutup lalu buka form baru untuk nomor otomatis."
    );
  }

  const tanggal = teks(input.tanggal);
  const jatuhTempo = teks(input.jatuhTempo);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return gagal("Isi tanggal tagihan.");
  if (
    jatuhTempo &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempo) || jatuhTempo < tanggal)
  ) {
    return gagal("Jatuh tempo tidak boleh sebelum tanggal tagihan.");
  }

  const items: BillItem[] = (Array.isArray(input.items) ? input.items : [])
    .filter((it) => it && angka(it.qty) > 0 && angka(it.harga) > 0)
    .map((it) => ({
      nama: teks(it.nama),
      qty: it.qty as number,
      harga: it.harga as number,
      akun: teks(it.akun),
    }));
  if (!items.length) {
    return gagal("Isi minimal 1 item dengan jumlah dan harga lebih dari 0.");
  }

  const akunUtang = teks(input.akunUtang);
  if (status === "diterima") {
    if (!akunUtang) {
      return gagal("Pilih akun Utang Usaha sebelum menyimpan sebagai Diterima.");
    }
    if (items.some((it) => !it.akun)) {
      return gagal(
        "Pilih akun untuk setiap item sebelum menyimpan sebagai Diterima."
      );
    }
  }

  const tarif =
    typeof input.ppnTarif === "number" &&
    isFinite(input.ppnTarif) &&
    input.ppnTarif > 0
      ? input.ppnTarif
      : undefined;
  const h = hitungTotalBill(items, !!input.ppnAktif, tarif);

  return {
    ok: true,
    bill: {
      id: teks(input.id) || "BILL_" + Date.now(),
      noBill,
      supplier,
      tanggal,
      jatuhTempo,
      deskripsi: teks(input.deskripsi),
      items,
      subtotal: h.subtotal,
      ppn: h.ppn,
      ppnTarif: input.ppnAktif
        ? tarif !== undefined
          ? tarif
          : PPN_TARIF_STANDAR
        : 0,
      total: h.total,
      sisaTagihan: h.total,
      status,
      akunUtang,
      createdAt: teks(input.createdAt) || new Date().toISOString(),
    },
  };
}
