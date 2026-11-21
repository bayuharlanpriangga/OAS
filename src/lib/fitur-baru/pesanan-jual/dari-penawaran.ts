import type { CounterRecord, DokFormInput, DokRecord } from "@/types";
import { idDokBaru } from "../penawaran/buat-id";
import { nomorDokBerikut } from "../penawaran/nomor-berikut";
import { susunDok } from "../penawaran/susun-dokumen";
import { pesananDariRef } from "./cek-referensi";

export function pesananDariPenawaran(
  penawaran: DokRecord | null | undefined,
  opsi?: {
    daftar?: readonly DokRecord[];
    counterList?: readonly CounterRecord[];
    tanggal?: string;
    id?: string;
    no?: string;
    createdAt?: string;
  }
): { ok: true; dok: DokRecord } | { ok: false; pesan: string } {
  const gagal = (pesan: string) => ({ ok: false as const, pesan });
  const o = opsi || {};
  if (
    !penawaran ||
    typeof penawaran !== "object" ||
    penawaran.jenis !== "penawaran"
  ) {
    return gagal("Penawaran tidak ditemukan.");
  }
  if (penawaran.status !== "disetujui") {
    return gagal(
      "Hanya penawaran berstatus Disetujui yang bisa dijadikan Pesanan Penjualan."
    );
  }
  const daftar = Array.isArray(o.daftar) ? o.daftar : [];
  const sudah = pesananDariRef(daftar, "penawaran", penawaran.id);
  if (sudah) {
    return gagal(
      "Penawaran ini sudah punya Pesanan Penjualan (" + sudah.no + ")."
    );
  }
  const tanggal =
    typeof o.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(o.tanggal)
      ? o.tanggal
      : penawaran.tanggal;
  const tahun = parseInt(tanggal.slice(0, 4), 10);
  const no =
    o.no || nomorDokBerikut("pesanan_jual", tahun, daftar, o.counterList);
  const id = o.id || idDokBaru(daftar);
  const createdAt = o.createdAt || new Date().toISOString();
  const items = (Array.isArray(penawaran.items) ? penawaran.items : []).map(
    (it) => {
      const b: { nama: string; qty: number; harga: number; satuan?: string } = {
        nama: it.nama,
        qty: it.qty,
        harga: it.harga,
      };
      if (it.satuan) b.satuan = it.satuan;
      return b;
    }
  );
  const form: DokFormInput = {
    id,
    jenis: "pesanan_jual",
    no,
    tanggal,
    kontak: penawaran.kontak,
    items,
    catatan: penawaran.catatan || "",
    ppnTarif: penawaran.ppnTarif || 0,
    refJenis: "penawaran",
    refId: penawaran.id,
    refNo: penawaran.no,
    createdAt,
  };
  return susunDok(form, daftar);
}
