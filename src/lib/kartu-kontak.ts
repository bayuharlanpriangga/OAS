import type { Bill, Invoice, JurnalEntry, Kontak, Pembayaran } from "@/types";
import { pembelianKreditTanpaBill } from "./aging";
import { jurnalBillStatus } from "./bill";
import {
  dibayarLamaTurunan,
  pembayaranDokumen,
  sisaTagihan,
} from "./pembayaran";

export type KartuKontakJenis = "piutang" | "hutang";

export interface KartuKontakBaris {
  tanggal: string;
  jenis: "dokumen" | "bayar" | "bayar_lama";
  no: string;
  ket: string;
  debit: number;
  kredit: number;
  saldo: number;
  metode?: string;
}

export interface KartuKontakResult {
  kontak: string;
  jenis: KartuKontakJenis;
  baris: KartuKontakBaris[];
  totalTagihan: number;
  totalBayar: number;
  saldoAkhir: number;
  jumlahDok: number;
}

export interface KartuKontakConfig {
  label: string;
  pihak: string;
  judul: string;
  noDok: string;
  jenisBayar: "invoice" | "bill";
  colTagih: string;
  colBayar: string;
}

export const KARTU_CFG: Record<KartuKontakJenis, KartuKontakConfig> = {
  piutang: {
    label: "Piutang",
    pihak: "Pelanggan",
    judul: "Kartu Piutang",
    noDok: "No Invoice",
    jenisBayar: "invoice",
    colTagih: "Tagihan",
    colBayar: "Pembayaran",
  },
  hutang: {
    label: "Hutang",
    pihak: "Supplier",
    judul: "Kartu Hutang",
    noDok: "No Tagihan",
    jenisBayar: "bill",
    colTagih: "Tagihan",
    colBayar: "Pembayaran",
  },
};

function kartuBulat(n: number): number {
  return Math.round(n * 100) / 100;
}

type KartuDokInput = {
  id: string;
  tanggal: string;
  total: number;
  sisaTagihan: number;
  dibayarLama?: number;
  status: string;
  noInvoice?: string;
  noBill?: string;
  pelanggan?: string;
  supplier?: string;
  kontak?: string;
  deskripsi?: string;
};

function kartuNama(d: KartuDokInput): string {
  return (
    String(d.pelanggan || d.supplier || d.kontak || "").trim() || "(Tanpa nama)"
  );
}

function kartuNo(d: KartuDokInput): string {
  return String(d.noInvoice || d.noBill || "").trim() || "-";
}

function kartuTgl(s: unknown): string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s.trim())
    ? s.trim().slice(0, 10)
    : "";
}

export function daftarKontakKartu(
  daftarDok: readonly KartuDokInput[]
): string[] {
  const set = new Set<string>();
  (Array.isArray(daftarDok) ? daftarDok : []).forEach((d) => {
    if (!d || typeof d !== "object" || d.status === "draft") return;
    if (!(typeof d.total === "number" && isFinite(d.total) && d.total > 0)) {
      return;
    }
    set.add(kartuNama(d));
  });
  return [...set].sort((a, b) => a.localeCompare(b, "id"));
}

export function dokumenHutangKartu(
  daftarBill: readonly Bill[],
  daftarJurnal: readonly JurnalEntry[],
  kontakList?: readonly Kontak[]
): KartuDokInput[] {
  const bills = (Array.isArray(daftarBill) ? daftarBill : []).filter(
    (b) => b && typeof b === "object"
  );
  const jurnal = Array.isArray(daftarJurnal) ? daftarJurnal : [];
  const validBills = bills.filter(
    (b) =>
      b.status !== "draft" && jurnalBillStatus(b, jurnal, bills).status !== "dibalik"
  );
  const extra = pembelianKreditTanpaBill(bills, jurnal, kontakList);
  return extra.length
    ? (validBills as KartuDokInput[]).concat(extra)
    : (validBills as KartuDokInput[]);
}

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

export function sisaTagihanKartu(
  dok: Invoice | Bill,
  bayar: readonly Pembayaran[],
  jenis: KartuKontakJenis
): number {
  return sisaTagihan(dok, bayar, KARTU_CFG[jenis].jenisBayar);
}
