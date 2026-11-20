import type { Pembayaran } from "@/types";
import { dibayarLamaTurunan } from "../pembayaran/dibayarLamaTurunan";
import { pembayaranDokumen } from "../pembayaran/pembayaranDokumen";
import { KARTU_CFG } from "./constants";
import { kartuBulat } from "./kartuBulat";
import { kartuNama } from "./kartuNama";
import { kartuNo } from "./kartuNo";
import { kartuTgl } from "./kartuTgl";
import type {
  KartuDokInput,
  KartuKontakBaris,
  KartuKontakJenis,
  KartuKontakResult,
} from "./types";

export function susunKartuKontak(
  daftarDok: readonly KartuDokInput[],
  daftarBayar: readonly Pembayaran[],
  jenis: KartuKontakJenis,
  kontak: string,
  opsi?: { dari?: string; sampai?: string }
): KartuKontakResult {
  const cfg = KARTU_CFG[jenis];
  if (!cfg) {
    throw new TypeError(
      'susunKartuKontak: jenis harus "piutang" atau "hutang"'
    );
  }
  const nama = String(kontak || "").trim();
  const dari = kartuTgl(opsi && opsi.dari);
  const sampai = kartuTgl(opsi && opsi.sampai);
  const bayars = Array.isArray(daftarBayar) ? daftarBayar : [];

  const doks = (Array.isArray(daftarDok) ? daftarDok : []).filter((d) => {
    if (!d || typeof d !== "object" || d.status === "draft") return false;
    if (!(typeof d.total === "number" && isFinite(d.total) && d.total > 0)) {
      return false;
    }
    return kartuNama(d) === nama;
  });

  const entri: Array<
    Omit<KartuKontakBaris, "saldo"> & { urutan: number }
  > = [];

  doks.forEach((d) => {
    const tglDok = kartuTgl(d.tanggal);
    const no = kartuNo(d);
    entri.push({
      tanggal: tglDok,
      urutan: 0,
      jenis: "dokumen",
      no,
      ket:
        (jenis === "hutang" ? "Tagihan " : "Invoice ") +
        no +
        (d.deskripsi ? " — " + d.deskripsi : ""),
      debit: jenis === "piutang" ? kartuBulat(d.total) : 0,
      kredit: jenis === "hutang" ? kartuBulat(d.total) : 0,
    });

    const catat = pembayaranDokumen(bayars, cfg.jenisBayar, d.id);
    const lama = dibayarLamaTurunan(d, bayars, cfg.jenisBayar);
    if (lama > 0) {
      entri.push({
        tanggal: tglDok,
        urutan: 1,
        jenis: "bayar_lama",
        no,
        ket: "Pembayaran sebelumnya (" + no + ")",
        debit: jenis === "hutang" ? kartuBulat(lama) : 0,
        kredit: jenis === "piutang" ? kartuBulat(lama) : 0,
      });
    }
    catat.forEach((p) => {
      const tglB = kartuTgl(p.tanggal) || tglDok;
      const ket =
        "Pembayaran " +
        no +
        (p.metode ? " (" + p.metode + ")" : "") +
        (p.catatan ? " — " + p.catatan : "");
      entri.push({
        tanggal: tglB,
        urutan: 2,
        jenis: "bayar",
        no,
        ket,
        metode: p.metode || "",
        debit: jenis === "hutang" ? kartuBulat(p.jumlah) : 0,
        kredit: jenis === "piutang" ? kartuBulat(p.jumlah) : 0,
      });
    });
  });

  entri.sort((a, b) => {
    if (a.tanggal !== b.tanggal) return a.tanggal < b.tanggal ? -1 : 1;
    if (a.urutan !== b.urutan) return a.urutan - b.urutan;
    return String(a.no || "").localeCompare(String(b.no || ""), "id");
  });

  const baris: KartuKontakBaris[] = [];
  let saldo = 0;
  let totalTagihan = 0;
  let totalBayar = 0;

  entri.forEach((e) => {
    if (dari && e.tanggal && e.tanggal < dari) return;
    if (sampai && e.tanggal && e.tanggal > sampai) return;
    const tagih = jenis === "piutang" ? e.debit : e.kredit;
    const bayar = jenis === "piutang" ? e.kredit : e.debit;
    saldo = kartuBulat(saldo + tagih - bayar);
    totalTagihan = kartuBulat(totalTagihan + tagih);
    totalBayar = kartuBulat(totalBayar + bayar);
    baris.push({
      tanggal: e.tanggal,
      jenis: e.jenis,
      no: e.no,
      ket: e.ket,
      debit: e.debit,
      kredit: e.kredit,
      saldo,
      metode: e.metode,
    });
  });

  return {
    kontak: nama,
    jenis,
    baris,
    totalTagihan,
    totalBayar,
    saldoAkhir: saldo,
    jumlahDok: doks.length,
  };
}
