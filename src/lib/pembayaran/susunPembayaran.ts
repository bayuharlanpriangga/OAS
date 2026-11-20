import type {
  DokumenTagihan,
  Pembayaran,
  PembayaranFormInput,
  PembayaranJenis,
  SusunPembayaranResult,
} from "@/types";
import { bayarBulat } from "./bayarBulat";
import { bayarTanggalValid } from "./bayarTanggalValid";
import { PEMBAYARAN_JENIS, PEMBAYARAN_STATUS_LANJUT } from "./constants";
import { dibayarLamaTurunan } from "./dibayarLamaTurunan";
import { sisaTagihan } from "./sisaTagihan";

export function susunPembayaran(
  f: PembayaranFormInput,
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis = "invoice"
): SusunPembayaranResult {
  const gagal = (pesan: string): SusunPembayaranResult => ({ ok: false, pesan });
  const input = f || {};
  if (!PEMBAYARAN_JENIS.includes(jenis)) {
    return gagal("Jenis dokumen tidak dikenal.");
  }
  const label = jenis === "bill" ? "Tagihan" : "Invoice";
  if (
    !dok ||
    typeof dok !== "object" ||
    dok.id === undefined ||
    dok.id === null ||
    dok.id === ""
  ) {
    return gagal(`${label} yang dibayar tidak ditemukan.`);
  }
  if (
    typeof dok.total !== "number" ||
    !isFinite(dok.total) ||
    dok.total <= 0
  ) {
    return gagal(`Total ${label.toLowerCase()} tidak valid.`);
  }
  if (!PEMBAYARAN_STATUS_LANJUT[jenis].includes(dok.status)) {
    if (dok.status === "lunas") return gagal(`${label} ini sudah lunas.`);
    if (dok.status === "draft") {
      return gagal(`${label} ini masih draft, belum bisa dibayar.`);
    }
    return gagal(`Status ${label.toLowerCase()} ini tidak bisa dibayar.`);
  }

  const tanggal = typeof input.tanggal === "string" ? input.tanggal.trim() : "";
  if (!bayarTanggalValid(tanggal)) {
    return gagal("Isi tanggal pembayaran yang valid.");
  }
  if (bayarTanggalValid(dok.tanggal) && tanggal < dok.tanggal) {
    return gagal(
      `Tanggal pembayaran tidak boleh sebelum tanggal ${label.toLowerCase()} (${dok.tanggal}).`
    );
  }

  const akunKas = typeof input.akunKas === "string" ? input.akunKas.trim() : "";
  if (!akunKas) return gagal("Pilih akun kas/bank.");

  const id = typeof input.id === "string" ? input.id.trim() : "";
  if (!id) return gagal("ID pembayaran kosong.");
  if ((Array.isArray(daftar) ? daftar : []).some((p) => p && p.id === id)) {
    return gagal("ID pembayaran sudah dipakai.");
  }
  const createdAt =
    typeof input.createdAt === "string" ? input.createdAt : "";
  if (!createdAt) return gagal("Waktu pembuatan pembayaran kosong.");

  if (typeof input.jumlah !== "number" || !isFinite(input.jumlah)) {
    return gagal("Isi jumlah pembayaran.");
  }
  const jumlah = bayarBulat(input.jumlah);
  if (jumlah <= 0) return gagal("Jumlah pembayaran harus lebih dari 0.");

  const lama = dibayarLamaTurunan(dok, daftar, jenis);
  const sisa = sisaTagihan(
    Object.assign({}, dok, { dibayarLama: lama }),
    daftar,
    jenis
  );
  if (sisa <= 0) return gagal(`${label} ini sudah tidak punya sisa tagihan.`);
  if (jumlah > sisa) {
    return gagal(
      `Jumlah melebihi sisa tagihan (Rp ${sisa.toLocaleString("id-ID")}).`
    );
  }

  const pembayaran: Pembayaran = {
    id,
    jenis,
    dokId: dok.id,
    noDok: String(dok.noInvoice || dok.noBill || ""),
    tanggal,
    jumlah,
    akunKas,
    createdAt,
  };
  const metode = typeof input.metode === "string" ? input.metode.trim() : "";
  const catatan = typeof input.catatan === "string" ? input.catatan.trim() : "";
  if (metode) pembayaran.metode = metode;
  if (catatan) pembayaran.catatan = catatan;

  const sisaBaru = bayarBulat(sisa - jumlah);
  return {
    ok: true,
    pembayaran,
    dibayarLama: lama,
    sisaBaru,
    lunas: sisaBaru <= 0,
  };
}
