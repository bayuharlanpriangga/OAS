export type DashPeriodKey =
  | "all"
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "this-year"
  | "custom";

export interface DateRangeResult {
  from: string;
  to: string;
  label: string;
}

export interface MonthlyBucket {
  ym: string;
  label: string;
  pendapatan: number;
  hpp: number;
  labaKotor: number;
  beban: number;
  labaBersih: number;
  kasMasuk: number;
  kasKeluar: number;
  arusKas: number;
  kasKumulatif: number;
  marginKotor: number;
  marginBersih: number;
  momGrowth: number | null;
}

export interface AnalitikSummary {
  months: MonthlyBucket[];
  totalPendapatan: number;
  totalBeban: number;
  totalLaba: number;
  totalArusKas: number;
  avgMargin: number;
  bebanBreakdown: Array<{ kode: string; nama: string; nilai: number }>;
  topAkuns: Array<{ kode: string; nama: string; tipe: string; nilai: number }>;
  rasio: {
    currentRatio: number;
    debtToEquity: number;
    grossMargin: number;
    netMargin: number;
    roa: number;
  };
  proyeksi: Array<{ label: string; pendapatan: number; laba: number }>;
  heatmap: Array<{ day: string; count: number }>;
  compare: {
    currLabel: string;
    prevLabel: string;
    pendCurr: number;
    pendPrev: number;
    bebanCurr: number;
    bebanPrev: number;
    labaCurr: number;
    labaPrev: number;
  } | null;
}
