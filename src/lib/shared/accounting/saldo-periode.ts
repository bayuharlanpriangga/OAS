import type { TahunBukuKode, TahunBukuRange, JurnalEntry, ComputeSaldoOptions, SaldoMap, Akun, SaldoAkun } from "@/types";
import { ymd } from "../format";

export const JENIS_PENUTUP = "Penutup" as const;

export const JENIS_JURNAL = {
  MANUAL: "Manual",
  INVOICE: "Invoice & Piutang",
  PENYUSUTAN: "Penyusutan",
  JURNAL_BERULANG: "Jurnal Berulang",
  REKONSILIASI: "Rekonsiliasi",
  SALDO_AWAL: "Saldo Awal",
  KARTU_STOCK: "Kartu Stock",
  BEP: "BEP & Margin",
  PINJAMAN: "Pinjaman",
  GAJI_PPH21: "Gaji & PPh 21",
  PPH23: "PPh 23",
  BILL: "Tagihan Pembelian",
} as const;

export const SUMBER_JURNAL = {
  ORIAS_AI: "Orias AI",
} as const;

export const PPN_TARIF_STANDAR = 11;

export const REV_KET_RE = /^\[Pembalik ([^\]]+)\]\s*/;

export const TB_BULAN_AWAL: Record<TahunBukuKode, number> = {
  jan: 0,
  apr: 3,
  jul: 6,
  okt: 9,
};

export function getBulanAwalTahunBuku(
  tahunBukuKode?: TahunBukuKode | string | null
): number {
  if (
    tahunBukuKode &&
    Object.prototype.hasOwnProperty.call(TB_BULAN_AWAL, tahunBukuKode)
  ) {
    return TB_BULAN_AWAL[tahunBukuKode as TahunBukuKode];
  }
  return 0;
}

export function getTahunBukuRange(
  tanggal: string,
  tahunBukuKode?: TahunBukuKode | string | null
): TahunBukuRange {
  const bulanAwal = getBulanAwalTahunBuku(tahunBukuKode);
  const y = parseInt(tanggal.slice(0, 4), 10);
  const m0 = parseInt(tanggal.slice(5, 7), 10) - 1;
  const yAwal = m0 >= bulanAwal ? y : y - 1;
  const from = ymd(yAwal, bulanAwal, 1);
  const yAkhir = bulanAwal === 0 ? yAwal : yAwal + 1;
  const m0Akhir = (bulanAwal + 11) % 12;
  const to = ymd(yAkhir, m0Akhir, new Date(yAkhir, m0Akhir + 1, 0).getDate());
  const label = bulanAwal === 0 ? String(yAwal) : `${yAwal}/${yAkhir}`;
  return { from, to, label };
}

export function isPeriodeTerkunci(
  tanggal: string | null | undefined,
  periodeKunciSampai: string | null | undefined
): boolean {
  return (
    !!periodeKunciSampai &&
    !!tanggal &&
    String(tanggal).slice(0, 10) <= periodeKunciSampai
  );
}

export class PeriodeTerkunciError extends Error {}

export function isJurnalPenutup(j: JurnalEntry | null | undefined): boolean {
  return !!j && j.jenis === JENIS_PENUTUP;
}

export function getJurnalTanpaPenutup(
  jurnalEntries: readonly JurnalEntry[]
): JurnalEntry[] {
  return jurnalEntries.filter((j) => !isJurnalPenutup(j));
}

export function computeSaldoAll(
  jurnalEntries: readonly JurnalEntry[],
  opts?: ComputeSaldoOptions
): SaldoMap {
  const map: SaldoMap = {};
  const src =
    opts && opts.tanpaPenutup
      ? getJurnalTanpaPenutup(jurnalEntries)
      : jurnalEntries;
  src.forEach((j) =>
    j.lines.forEach((l) => {
      if (!map[l.akun]) map[l.akun] = { debit: 0, kredit: 0 };
      map[l.akun].debit += l.debit || 0;
      map[l.akun].kredit += l.kredit || 0;
    })
  );
  return map;
}

export function computeSaldoBersih(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[],
  kode: string,
  opts?: ComputeSaldoOptions
): number {
  const a = akuns.find((x) => x.kode === kode);
  if (!a) return 0;
  const map = computeSaldoAll(jurnalEntries, opts);
  const s = map[kode] || { debit: 0, kredit: 0 };
  return a.normal === "D" ? s.debit - s.kredit : s.kredit - s.debit;
}

export function saldoBersihPL(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[],
  kode: string
): number {
  return saldoAlamiPL(akuns, jurnalEntries, kode, { tanpaPenutup: true });
}

export function plNatural(
  a: Akun | null | undefined,
  s?: Partial<SaldoAkun> | null
): number {
  const saldo = s || { debit: 0, kredit: 0 };
  if (!a) return 0;
  if (a.tipe === "Pendapatan") return (saldo.kredit || 0) - (saldo.debit || 0);
  if (a.tipe === "HPP" || a.tipe === "Beban") {
    return (saldo.debit || 0) - (saldo.kredit || 0);
  }
  return a.normal === "D"
    ? (saldo.debit || 0) - (saldo.kredit || 0)
    : (saldo.kredit || 0) - (saldo.debit || 0);
}

export function saldoAlamiPL(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[],
  kode: string,
  opts?: ComputeSaldoOptions
): number {
  const a = akuns.find((x) => x.kode === kode);
  if (!a) return 0;
  return plNatural(
    a,
    computeSaldoAll(jurnalEntries, opts || { tanpaPenutup: true })[kode]
  );
}
