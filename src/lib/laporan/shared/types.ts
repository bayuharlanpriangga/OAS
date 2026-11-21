export type ReportPeriodVal =
  | "all"
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "this-year";

export interface LabaRugiReport {
  pRows: Array<{ kode: string; nama: string; nilai: number }>;
  hRows: Array<{ kode: string; nama: string; nilai: number }>;
  bRows: Array<{ kode: string; nama: string; nilai: number }>;
  totalPendapatan: number;
  totalHpp: number;
  labaKotor: number;
  totalBeban: number;
  labaBersih: number;
}

export interface NeracaSaldoRow {
  kode: string;
  nama: string;
  tipe: string;
  debit: number;
  kredit: number;
}

export interface NeracaSaldoReport {
  rows: NeracaSaldoRow[];
  totalDebit: number;
  totalKredit: number;
  balanced: boolean;
  selisih: number;
}

export interface NeracaRow {
  kode: string;
  nama: string;
  nilai: number;
  isPrive?: boolean;
}

export interface NeracaReport {
  asetRows: NeracaRow[];
  liabRows: NeracaRow[];
  ekRows: NeracaRow[];
  aset: number;
  liab: number;
  totalEkuitas: number;
  labaBersih: number;
  balanced: boolean;
  selisih: number;
}

export interface ArusKasReport {
  operasiRows: Array<{ label: string; nilai: number }>;
  totalOperasi: number;
  investasiRows: Array<{ label: string; nilai: number }>;
  totalInvestasi: number;
  pendanaanRows: Array<{ label: string; nilai: number }>;
  totalPendanaan: number;
  kenaikan: number;
  kasAkhir: number;
}

export interface PerubahanEkuitasReport {
  modalDisetor: number;
  prive: number;
  labaDitahan: number;
  labaBersih: number;
  ekuitasAwal: number;
  totalEkuitas: number;
}
