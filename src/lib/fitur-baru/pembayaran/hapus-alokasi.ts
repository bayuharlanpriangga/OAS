import type {
  Bill,
  DokumenTagihan,
  Invoice,
  JurnalEntry,
  Pembayaran,
  SusunHapusPembayaranResult,
} from "@/types";
import { PEMBAYARAN_JENIS } from "./constants";
import { dibayarLamaTurunan } from "./riwayat-dibayar";
import { jurnalPembayaranBillStatus } from "./status-jurnal-bill";
import { jurnalPembayaranStatus } from "./status-jurnal-invoice";
import { sisaTagihan } from "./sisa-tagihan";
import { statusDariPembayaran } from "./status-tagihan";

export function susunHapusPembayaran(
  id: string,
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  daftarJurnal: readonly JurnalEntry[]
): SusunHapusPembayaranResult {
  const gagal = (pesan: string): SusunHapusPembayaranResult => ({
    ok: false,
    pesan,
  });
  const semua = Array.isArray(daftar) ? daftar : [];
  const p = semua.find(
    (x) => x && typeof x === "object" && String(x.id) === String(id)
  );
  if (!p) return gagal("Pembayaran tidak ditemukan.");
  if (!PEMBAYARAN_JENIS.includes(p.jenis)) {
    return gagal("Jenis pembayaran tidak dikenal.");
  }
  const jenis = p.jenis;
  const daftarBaru = semua.filter((x) => x !== p);
  if (!dok || typeof dok !== "object" || String(dok.id) !== String(p.dokId)) {
    return {
      ok: true,
      pembayaran: p,
      daftarBaru,
      dibayarLama: 0,
      sisaBaru: 0,
      statusBaru: undefined,
      jurnalStatus: "belum",
      jurnal: null,
      yatim: true,
    };
  }
  const dibayarLama = dibayarLamaTurunan(dok, semua, jenis);
  const sisaBaru = sisaTagihan(
    Object.assign({}, dok, { dibayarLama }),
    daftarBaru,
    jenis
  );
  const dokBaru = Object.assign({}, dok, {
    dibayarLama,
    sisaTagihan: sisaBaru,
  });
  const statusBaru = statusDariPembayaran(dokBaru, daftarBaru, jenis);
  const st =
    jenis === "bill"
      ? jurnalPembayaranBillStatus(p, dok as Bill, daftarJurnal, semua)
      : jurnalPembayaranStatus(p, dok as Invoice, daftarJurnal, semua);
  return {
    ok: true,
    pembayaran: p,
    daftarBaru,
    dibayarLama,
    sisaBaru,
    statusBaru,
    jurnalStatus: st.status,
    jurnal: st.jurnal,
    yatim: false,
  };
}
