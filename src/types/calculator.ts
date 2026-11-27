export type PenyusutanMetode =
  | "garis-lurus"
  | "saldo-menurun"
  | "saldo-menurun-1x"
  | "sum-of-years"
  | "unit-produksi";

export interface PenyusutanInput {
  cost: number;
  sisa: number;
  umur: number;
  metode: PenyusutanMetode;
  tarif?: number;
  totalUnit?: number;
  unitPerTahun?: number[];
}

export interface PenyusutanRow {
  t: number;
  beban: number;
  akum: number;
  nbAwal: number;
  nbAkhir: number;
  unit?: number;
}

export type PenyusutanResult =
  | {
      ok: true;
      dasarPenyusutan: number;
      totalBeban: number;
      rataRataPerTahun: number;
      tabel: PenyusutanRow[];
    }
  | { ok: false; pesan: string };

export type BungaSatuan = "tahun" | "bulan" | "hari";

export type BungaJenis =
  | "tunggal"
  | "majemuk-tahunan"
  | "majemuk-semesteran"
  | "majemuk-triwulanan"
  | "majemuk-bulanan"
  | "efektif-menurun";

export interface BungaInput {
  pokok: number;
  rateAnn: number;
  n: number;
  satuan: BungaSatuan;
  jenis: BungaJenis;
}

export interface BungaRow {
  periode: number;
  saldoAwal: number;
  bunga: number;
  saldoAkhir: number;
}

export interface BungaResult {
  pokok: number;
  fv: number;
  totalBunga: number;
  bungaPerSatuan?: number;
  rEfektifPct?: number;
  cicilanBulan?: number;
  rFlatSetaraPct?: number;
  totalBayar?: number;
  tabel: BungaRow[];
}

export type AnuitasJenis = "anuitas" | "flat" | "efektif";

export interface AnuitasInput {
  pokok: number;
  dp?: number;
  rateAnn: number;
  tenor: number;
  biaya?: number;
  jenis: AnuitasJenis;
}

export interface AnuitasRow {
  periode: number;
  saldoAwal: number;
  pokok: number;
  bunga: number;
  cicilan: number;
  saldoAkhir: number;
}

export interface AnuitasResult {
  pinjaman: number;
  cicilanBulan: number;
  totalBunga: number;
  totalBayar: number;
  tabel: AnuitasRow[];
}

export type PvMode = "fv" | "pv" | "rate" | "n";

export interface PvInput {
  mode: PvMode;
  pv?: number;
  fv?: number;
  ratePct?: number;
  n?: number;
  pmt?: number;
  m?: number;
}

export interface PvResult {
  mode: PvMode;
  fvLump?: number;
  fvAnn?: number;
  totalFv?: number;
  keuntungan?: number;
  pvCalc?: number;
  pvAnn?: number;
  totalPv?: number;
  faktorDiskontoPct?: number;
  ratePerTahunPct?: number;
  ratePerPeriodePct?: number;
  nTahun?: number;
  nBulan?: number;
}

export interface DiskontoInput {
  nominal: number;
  ratePct: number;
  hari: number;
  bungaWeselPct?: number;
  basis?: number;
}

export interface DiskontoResult {
  nominal: number;
  bungaWesel: number;
  nilaiJatuhTempo: number;
  diskonto: number;
  hasilBersih: number;
  tarifEfektifPct: number;
}

export interface RasioKeuanganInput {
  kas: number;
  piutang: number;
  persediaan: number;
  asetTetap: number;
  asetLancar?: number;
  totalAset?: number;
  utangLancar: number;
  utangPanjang: number;
  totalLiab?: number;
  ekuitas: number;
  penjualan: number;
  hpp: number;
  labaKotor?: number;
  ebit: number;
  bebanBunga: number;
  labaBersih?: number;
  saham?: number;
  hargaSaham?: number;
}

export interface RasioKeuanganResult {
  asetLancar: number;
  labaKotor: number;
  totalLiab: number;
  totalAset: number;
  labaBersihFinal: number;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  netWorkingCapital: number;
  der: number;
  dar: number;
  equityMultiplier: number;
  interestCoverage: number | null;
  longTermDebtRatio: number;
  grossProfitMarginPct: number;
  netProfitMarginPct: number;
  roaPct: number;
  roePct: number;
  ebitMarginPct: number;
  perputaranPiutang: number;
  dso: number;
  perputaranPersediaan: number;
  doh: number;
  assetTurnover: number;
  fixedAssetTurnover: number;
  eps: number | null;
  bvps: number | null;
  per: number | null;
  pbv: number | null;
  marketCap: number | null;
}

export interface BepBauranItem {
  nama: string;
  harga: number;
  bv: number;
  prop: number;
  cm: number;
  wmCm: number;
}

export interface BepInput {
  harga: number;
  bv: number;
  bt: number;
  vol: number;
  target?: number;
  pajakPct?: number;
  bauran?: Array<{ nama: string; harga: number; bv: number; prop: number }>;
}

export interface BepResult {
  cm: number;
  cmr: number;
  bepUnit: number;
  bepRp: number;
  pendapatan: number;
  labaKotor: number;
  labaBersih: number;
  mos: number;
  mosPct: number;
  dol: number;
  targetVol: number | null;
  targetVolPreTax: number | null;
  bauranItems?: BepBauranItem[];
  bepBauranUnit?: number;
}
