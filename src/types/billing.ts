import type { JurnalEntry, JurnalLine } from "./accounting";

export type InvoiceStatus = "draft" | "terkirim" | "sebagian" | "lunas";

export interface InvoiceItem {
  nama?: string;
  qty: number;
  harga: number;
}

export interface Invoice {
  id: string;
  noInvoice: string;
  pelanggan: string;
  tanggal: string;
  jatuhTempo: string;
  deskripsi?: string;
  items: InvoiceItem[];
  subtotal: number;
  ppn: number;
  ppnTarif?: number;
  total: number;
  sisaTagihan: number;
  dibayarLama?: number;
  status: InvoiceStatus;
  akunPiutang: string;
  akunPend: string;
  createdAt: string;
}

export type BillStatus = "draft" | "diterima" | "sebagian" | "lunas";

export interface BillItem {
  nama?: string;
  qty: number;
  harga: number;
  akun: string;
}

export interface Bill {
  id: string;
  noBill: string;
  supplier: string;
  tanggal: string;
  jatuhTempo: string;
  deskripsi?: string;
  items: BillItem[];
  subtotal: number;
  ppn: number;
  ppnTarif: number;
  total: number;
  sisaTagihan: number;
  dibayarLama?: number;
  status: BillStatus;
  akunUtang: string;
  jurnalNo?: string;
  createdAt: string;
}

export interface BillFormInput {
  id?: string;
  noBill?: string;
  supplier?: string;
  tanggal?: string;
  jatuhTempo?: string;
  deskripsi?: string;
  items?: Array<{ nama?: string; qty?: number; harga?: number; akun?: string }>;
  ppnAktif?: boolean;
  ppnTarif?: number;
  akunUtang?: string;
  status?: string;
  createdAt?: string;
}

export type SusunBillResult =
  | { ok: true; bill: Bill }
  | { ok: false; pesan: string };

export interface BillDraftJurnal {
  tanggal: string;
  jenis: string;
  keterangan: string;
  ref: string;
  lines: JurnalLine[];
  _ppnTarif?: number;
}

export type BuatJurnalBillResult =
  | { ok: true; jurnal: BillDraftJurnal }
  | { ok: false; pesan: string };

export interface BillJurnalStatusResult {
  status: "tanpa" | "belum" | "aktif" | "dibalik";
  jurnal: JurnalEntry | null;
}

export type PembayaranJenis = "invoice" | "bill";

export interface Pembayaran {
  id: string;
  jenis: PembayaranJenis;
  dokId: string;
  noDok: string;
  grupId?: string;
  tanggal: string;
  jumlah: number;
  akunKas: string;
  metode?: string;
  catatan?: string;
  jurnalNo?: string;
  createdAt: string;
}

export type DokumenTagihan = Pick<
  Invoice | Bill,
  "id" | "tanggal" | "total" | "sisaTagihan" | "dibayarLama" | "status"
> & {
  noInvoice?: string;
  noBill?: string;
  pelanggan?: string;
  supplier?: string;
  akunPiutang?: string;
  akunUtang?: string;
};

export interface PembayaranFormInput {
  id?: string;
  createdAt?: string;
  tanggal?: string;
  jumlah?: number;
  akunKas?: string;
  metode?: string;
  catatan?: string;
}

export type SusunPembayaranResult =
  | {
      ok: true;
      pembayaran: Pembayaran;
      dibayarLama: number;
      sisaBaru: number;
      lunas: boolean;
    }
  | { ok: false; pesan: string };

export interface AlokasiPembayaranItem {
  dokId: string;
  jumlah: number;
}

export interface AlokasiPembayaranFormInput extends PembayaranFormInput {
  alokasi?: AlokasiPembayaranItem[];
}

export interface AlokasiPerubahan {
  dokId: string;
  dibayarLama: number;
  sisaBaru: number;
  lunas: boolean;
}

export type SusunAlokasiResult =
  | {
      ok: true;
      grupId: string;
      pembayaran: Pembayaran[];
      perubahan: AlokasiPerubahan[];
      totalDialokasikan: number;
    }
  | { ok: false; pesan: string };

export interface PembayaranDraftJurnal {
  tanggal: string;
  jenis: string;
  keterangan: string;
  ref: string;
  lines: JurnalLine[];
}

export type BuatJurnalPembayaranResult =
  | { ok: true; jurnal: PembayaranDraftJurnal }
  | { ok: false; pesan: string };

export interface JurnalPembayaranStatusResult {
  status: "belum" | "aktif" | "dibalik";
  jurnal: JurnalEntry | null;
}

export interface PembayaranBelumJurnalItem {
  pembayaran: Pembayaran;
  invoice: Invoice;
}

export type SusunHapusPembayaranResult =
  | {
      ok: true;
      pembayaran: Pembayaran;
      daftarBaru: Pembayaran[];
      dibayarLama: number;
      sisaBaru: number;
      statusBaru: string | undefined;
      jurnalStatus: "belum" | "aktif" | "dibalik";
      jurnal: JurnalEntry | null;
      yatim: boolean;
    }
  | { ok: false; pesan: string };

export type AgingBucketName =
  | "lancar"
  | "b0_30"
  | "b31_60"
  | "b61_90"
  | "b90plus";

export interface AgingSummary {
  lancar: number;
  b0_30: number;
  b31_60: number;
  b61_90: number;
  b90plus: number;
  total: number;
}

export interface AgingDokumenInput {
  pelanggan?: string;
  supplier?: string;
  kontak?: string;
  jatuhTempo?: string;
  tanggal?: string;
  sisaTagihan: number;
  status?: string;
  noInvoice?: string;
  noBill?: string;
  no?: string;
}

export interface AgingDokumenItem {
  no: string;
  jatuhTempo: string | undefined;
  sisa: number;
  umur: number;
  bucket: AgingBucketName;
}

export interface AgingPerKontak extends AgingSummary {
  kontak: string;
  dokumen: AgingDokumenItem[];
}

export interface AgingResult<TInvalid = AgingDokumenInput> {
  tanggalAcuan: string;
  perKontak: AgingPerKontak[];
  total: AgingSummary;
  tidakValid: TInvalid[];
}

export interface CounterRecord {
  id: string;
  jenis: string;
  tahun: number;
  terakhir: number;
}

export interface ParsedNomor {
  jenis: string;
  tahun: number;
  urut: number;
}

export interface BentrokNomorItem {
  id: string;
  noLama: string;
  noBaru: string;
  pelanggan: string;
}

export interface SelesaikanBentrokResult<T extends Invoice = Invoice> {
  invoices: T[];
  bentrok: BentrokNomorItem[];
  counterList: CounterRecord[];
}

export type DokJenis =
  | "penawaran"
  | "pesanan_jual"
  | "surat_jalan"
  | "pesanan_beli"
  | "penerimaan"
  | "retur_jual"
  | "retur_beli";

export interface DokItem {
  nama: string;
  qty: number;
  harga: number;
  satuan?: string;
}

export interface DokRiwayatEntry {
  dari: string;
  ke: string;
  waktu?: string;
}

export interface DokRecord {
  id: string;
  jenis: DokJenis;
  no: string;
  tanggal: string;
  kontak: string;
  status: string;
  items: DokItem[];
  catatan?: string;
  ppnTarif?: number;
  berlakuSampai?: string;
  refJenis?: string;
  refId?: string;
  refNo?: string;
  riwayat?: DokRiwayatEntry[];
  createdAt: string;
}

export interface DokFormInput {
  id?: string;
  jenis?: string;
  no?: string;
  tanggal?: string;
  kontak?: string;
  items?: Array<{ nama?: string; qty?: number; harga?: number | string; satuan?: string }>;
  catatan?: string;
  ppnTarif?: number | string | null;
  berlakuSampai?: string;
  refJenis?: string;
  refId?: string;
  refNo?: string;
  createdAt?: string;
}

export type SusunDokResult =
  | { ok: true; dok: DokRecord }
  | { ok: false; pesan: string };

export type TransisiDokResult =
  | { ok: true; dok: DokRecord }
  | { ok: false; pesan: string };

export interface DokTotalResult {
  subtotal: number;
  ppn: number;
  total: number;
}
