import type {
  DokFormInput,
  DokItem,
  DokJenis,
  DokRecord,
  SusunDokResult,
} from "@/types";
import { DOK_JENIS, DOK_REF_LAIN } from "./constants";

export function susunDok(
  f: DokFormInput,
  daftar?: readonly DokRecord[]
): SusunDokResult {
  const gagal = (pesan: string): SusunDokResult => ({ ok: false, pesan });
  const input = f || {};
  const teks = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const jenis = input.jenis as DokJenis;
  const J = DOK_JENIS[jenis];
  if (!J) return gagal("Jenis dokumen tidak dikenal.");
  const ada = Array.isArray(daftar)
    ? daftar.filter((d) => d && typeof d === "object")
    : [];

  const id = teks(input.id);
  if (!id) return gagal("ID dokumen kosong.");
  if (ada.some((d) => d.id === id)) return gagal("ID dokumen sudah dipakai.");
  const no = teks(input.no).toUpperCase();
  if (!no) return gagal(`Isi nomor ${J.label.toLowerCase()}.`);
  if (
    ada.some(
      (d) =>
        d.jenis === jenis &&
        String(d.no || "").trim().toUpperCase() === no
    )
  ) {
    return gagal(`Nomor ${no} sudah dipakai. Ganti nomornya.`);
  }
  const tanggal = teks(input.tanggal);
  const d0 = /^\d{4}-\d{2}-\d{2}$/.test(tanggal)
    ? new Date(tanggal + "T00:00:00Z")
    : null;
  if (
    !d0 ||
    isNaN(d0.getTime()) ||
    d0.toISOString().slice(0, 10) !== tanggal
  ) {
    return gagal(`Isi tanggal ${J.label.toLowerCase()} yang valid.`);
  }
  const kontak = teks(input.kontak);
  if (!kontak) return gagal("Isi nama kontak.");
  const createdAt = teks(input.createdAt);
  if (!createdAt) return gagal("Waktu pembuatan dokumen kosong.");

  const items: DokItem[] = [];
  for (const it of Array.isArray(input.items) ? input.items : []) {
    if (!it || typeof it !== "object") continue;
    const nama = teks(it.nama);
    const qty = typeof it.qty === "number" && isFinite(it.qty) ? it.qty : 0;
    if (!nama && qty <= 0) continue;
    if (!nama) return gagal("Isi nama item.");
    if (qty <= 0) return gagal(`Jumlah item "${nama}" harus lebih dari 0.`);
    const harga =
      it.harga === undefined || it.harga === null || it.harga === ""
        ? 0
        : Number(it.harga);
    if (typeof harga !== "number" || !isFinite(harga) || harga < 0) {
      return gagal(`Harga item "${nama}" tidak valid.`);
    }
    const baris: DokItem = { nama, qty, harga };
    const satuan = teks(it.satuan);
    if (satuan) baris.satuan = satuan;
    items.push(baris);
  }
  if (!items.length) {
    return gagal("Isi minimal 1 item dengan jumlah lebih dari 0.");
  }

  let ppnTarif = 0;
  if (
    input.ppnTarif !== undefined &&
    input.ppnTarif !== null &&
    input.ppnTarif !== "" &&
    input.ppnTarif !== 0
  ) {
    if (
      typeof input.ppnTarif !== "number" ||
      !isFinite(input.ppnTarif) ||
      input.ppnTarif < 0 ||
      input.ppnTarif > 100
    ) {
      return gagal("Tarif PPN tidak valid.");
    }
    ppnTarif = input.ppnTarif;
  }

  const berlakuSampai = teks(input.berlakuSampai);
  if (berlakuSampai) {
    const b0 = /^\d{4}-\d{2}-\d{2}$/.test(berlakuSampai)
      ? new Date(berlakuSampai + "T00:00:00Z")
      : null;
    if (
      !b0 ||
      isNaN(b0.getTime()) ||
      b0.toISOString().slice(0, 10) !== berlakuSampai
    ) {
      return gagal("Isi tanggal berlaku sampai yang valid.");
    }
    if (berlakuSampai < tanggal) {
      return gagal(
        `Tanggal berlaku sampai tidak boleh sebelum tanggal ${J.label.toLowerCase()}.`
      );
    }
  }

  const refJenis = teks(input.refJenis);
  const refId = teks(input.refId);
  const refNo = teks(input.refNo);
  if (refJenis || refId) {
    if (!refJenis || !refId) return gagal("Ref asal harus berisi jenis dan id.");
    if (
      !DOK_JENIS[refJenis as DokJenis] &&
      !DOK_REF_LAIN.includes(refJenis as (typeof DOK_REF_LAIN)[number])
    ) {
      return gagal("Jenis ref asal tidak dikenal.");
    }
    if (refJenis === jenis && refId === id) {
      return gagal("Dokumen tidak boleh menunjuk dirinya sendiri.");
    }
    if (
      DOK_JENIS[refJenis as DokJenis] &&
      !ada.some((d) => d.jenis === refJenis && d.id === refId)
    ) {
      return gagal("Dokumen asal tidak ditemukan.");
    }
  }

  const dok: DokRecord = {
    id,
    jenis,
    no,
    tanggal,
    kontak,
    status: "draft",
    items,
    createdAt,
  };
  const catatan = teks(input.catatan);
  if (catatan) dok.catatan = catatan;
  if (ppnTarif) dok.ppnTarif = ppnTarif;
  if (berlakuSampai) dok.berlakuSampai = berlakuSampai;
  if (refJenis && refId) {
    dok.refJenis = refJenis;
    dok.refId = refId;
    if (refNo) dok.refNo = refNo;
  }
  return { ok: true, dok };
}
