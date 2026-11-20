export type AkunTipe =
  | "Aset"
  | "Liabilitas"
  | "Ekuitas"
  | "Pendapatan"
  | "HPP"
  | "Beban";

export type SaldoNormal = "D" | "K";

export interface Akun {
  kode: string;
  nama: string;
  tipe: AkunTipe;
  kat: string;
  normal: SaldoNormal;
}

export interface AkunTrashItem extends Akun {
  deletedAt: string;
}

export interface TransaksiAkunSettings {
  jual: Record<string, string>;
  beli: Record<string, string>;
  jualHpp: string;
  jualPersediaan: string;
}

export type JurnalJenis =
  | "Manual"
  | "Kas"
  | "Penjualan"
  | "Pembelian"
  | "Invoice & Piutang"
  | "Penyusutan"
  | "Jurnal Berulang"
  | "Rekonsiliasi"
  | "Saldo Awal"
  | "Kartu Stock"
  | "BEP & Margin"
  | "Pinjaman"
  | "Gaji & PPh 21"
  | "PPh 23"
  | "Tagihan Pembelian"
  | "Penutup"
  | "AI"
  | (string & {});

export type JurnalSumber = "Orias AI" | (string & {});

export interface JurnalLine {
  akun: string;
  ket?: string;
  debit: number;
  kredit: number;
}

export interface JurnalAttachment {
  nama: string;
  url?: string;
  tipe?: string;
}

export interface JurnalEntry {
  id?: string;
  _id?: string;
  no?: string;
  tanggal: string;
  ket?: string;
  keterangan?: string;
  jenis: JurnalJenis;
  ref?: string;
  sumber?: JurnalSumber;
  kodeRef?: string;
  kontakId?: string;
  reversalOf?: string;
  _ppnTarif?: number;
  lines: JurnalLine[];
  attachments?: JurnalAttachment[];
}

export interface SaldoAkun {
  debit: number;
  kredit: number;
}

export type SaldoMap = Record<string, SaldoAkun>;

export interface ComputeSaldoOptions {
  tanpaPenutup?: boolean;
}

export interface RingkasanJurnalPembelian {
  debit: JurnalLine[];
  totalDebit: number;
  kredit: number;
  tunai: boolean;
  no: string;
}

export type TahunBukuKode = "jan" | "apr" | "jul" | "okt";

export interface TahunBukuRange {
  from: string;
  to: string;
  label: string;
}

export type PpnJurnalTipe = "keluaran" | "masukan";

export interface PpnJurnalResult {
  tipe: PpnJurnalTipe;
  ppn: number;
  dpp: number;
  tarif: number;
}

export interface PpnRekapRow {
  j: JurnalEntry;
  ppnVal: number;
  dpp: number;
  tarifPct: number;
}

export interface PpnRekap {
  keluaran: number;
  masukan: number;
  dppKeluaran: number;
  dppMasukan: number;
  rowsKeluaran: PpnRekapRow[];
  rowsMasukan: PpnRekapRow[];
  kurangBayar: number;
}

export interface ParsedAIJurnal {
  tanggal: string;
  ket: string;
  jenis: "AI";
  lines: JurnalLine[];
}
