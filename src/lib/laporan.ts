import type { Akun, JurnalEntry, SaldoMap } from "@/types";
import {
  computeSaldoAll,
  getJurnalTanpaPenutup,
  JENIS_JURNAL,
  plNatural,
} from "./accounting";
import { escapeHtml } from "./format";

export type ReportPeriodVal =
  | "all"
  | "this-month"
  | "last-month"
  | "this-quarter"
  | "this-year";

export const REPORT_PERIOD_OPTIONS: ReadonlyArray<{
  value: ReportPeriodVal;
  label: string;
}> = [
  { value: "all", label: "Semua Periode" },
  { value: "this-month", label: "Bulan Ini" },
  { value: "last-month", label: "Bulan Lalu" },
  { value: "this-quarter", label: "Kuartal Ini" },
  { value: "this-year", label: "Tahun Ini" },
];

export function jeninsBadge(jenis: string): string {
  if (jenis === "Kas") return "badge-blue";
  if (jenis === "Penjualan") return "badge-green";
  if (jenis === "Pembelian" || jenis === JENIS_JURNAL.BILL) return "badge-yellow";
  if (jenis === JENIS_JURNAL.INVOICE) return "badge-green";
  return "badge-gray";
}

function isAkunPpnKeluar(kode: string, akuns: readonly Akun[]): boolean {
  if (kode === "2301") return true;
  const a = akuns.find((x) => x.kode === kode);
  const nama = (a?.nama || "").toLowerCase();
  return nama.includes("ppn") && nama.includes("keluar");
}

function isAkunPpnMasuk(kode: string, akuns: readonly Akun[]): boolean {
  if (kode === "1502") return true;
  const a = akuns.find((x) => x.kode === kode);
  const nama = (a?.nama || "").toLowerCase();
  return nama.includes("ppn") && nama.includes("masuk");
}

export function getPpnSubBadge(
  j: JurnalEntry | null | undefined,
  akuns: readonly Akun[]
): string | null {
  if (!j || j.jenis === "PPN") return null;
  const lines = j.lines || [];
  if (lines.some((l) => l.kredit > 0 && isAkunPpnKeluar(l.akun, akuns))) {
    return "PPN Keluaran";
  }
  if (lines.some((l) => l.debit > 0 && isAkunPpnMasuk(l.akun, akuns))) {
    return "PPN Masukan";
  }
  return null;
}

export function getSaldoAkunPure(
  jurnalEntries: readonly JurnalEntry[],
  akuns: readonly Akun[],
  kode: string
): number {
  let d = 0;
  let k = 0;
  jurnalEntries.forEach((j) =>
    (j.lines || []).forEach((l) => {
      if (l.akun === kode) {
        d += l.debit || 0;
        k += l.kredit || 0;
      }
    })
  );
  const akun = akuns.find((a) => a.kode === kode);
  return akun?.normal === "D" ? d - k : k - d;
}

export function getFilteredSaldoPure(
  jurnalEntries: readonly JurnalEntry[],
  periodVal: string = "all",
  opts?: { tanpaPenutup?: boolean },
  now = new Date()
): SaldoMap {
  const y = now.getFullYear();
  const m = now.getMonth();
  let from: Date | null = null;
  let to: Date | null = null;

  if (periodVal === "this-month") {
    from = new Date(y, m, 1);
    to = new Date(y, m + 1, 0);
  } else if (periodVal === "last-month") {
    from = new Date(y, m - 1, 1);
    to = new Date(y, m, 0);
  } else if (periodVal === "this-quarter") {
    const q = Math.floor(m / 3);
    from = new Date(y, q * 3, 1);
    to = new Date(y, q * 3 + 3, 0);
  } else if (periodVal === "this-year") {
    from = new Date(y, 0, 1);
    to = new Date(y, 11, 31);
  }

  const sumber = opts?.tanpaPenutup
    ? getJurnalTanpaPenutup(jurnalEntries)
    : jurnalEntries;

  const filtJurnals =
    from && to
      ? sumber.filter((j) => {
          const d = new Date(j.tanggal);
          return d >= from && d <= to;
        })
      : sumber;

  const map: SaldoMap = {};
  filtJurnals.forEach((j) =>
    (j.lines || []).forEach((l) => {
      if (!map[l.akun]) map[l.akun] = { debit: 0, kredit: 0 };
      map[l.akun].debit += l.debit || 0;
      map[l.akun].kredit += l.kredit || 0;
    })
  );
  return map;
}

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

export function computeLabaRugi(
  akuns: readonly Akun[],
  saldoMap: SaldoMap
): LabaRugiReport {
  let totalPendapatan = 0;
  let totalHpp = 0;
  let totalBeban = 0;
  const pRows: Array<{ kode: string; nama: string; nilai: number }> = [];
  const hRows: Array<{ kode: string; nama: string; nilai: number }> = [];
  const bRows: Array<{ kode: string; nama: string; nilai: number }> = [];

  akuns.forEach((a) => {
    const s = plNatural(a, saldoMap[a.kode]);
    if (!s) return;
    if (a.tipe === "Pendapatan") {
      totalPendapatan += s;
      pRows.push({ kode: a.kode, nama: a.nama, nilai: s });
    } else if (a.tipe === "HPP") {
      totalHpp += s;
      hRows.push({ kode: a.kode, nama: a.nama, nilai: s });
    } else if (a.tipe === "Beban") {
      totalBeban += s;
      bRows.push({ kode: a.kode, nama: a.nama, nilai: s });
    }
  });

  const labaKotor = totalPendapatan - totalHpp;
  const labaBersih = labaKotor - totalBeban;

  return {
    pRows,
    hRows,
    bRows,
    totalPendapatan,
    totalHpp,
    labaKotor,
    totalBeban,
    labaBersih,
  };
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

export function computeNeracaSaldo(
  akuns: readonly Akun[],
  saldoMap: SaldoMap
): NeracaSaldoReport {
  let totalDebit = 0;
  let totalKredit = 0;
  const rows: NeracaSaldoRow[] = [];

  akuns.forEach((a) => {
    const s = saldoMap[a.kode] || { debit: 0, kredit: 0 };
    if (!s.debit && !s.kredit) return;
    const net = s.debit - s.kredit;
    const debit = net > 0 ? net : 0;
    const kredit = net < 0 ? -net : 0;
    if (!debit && !kredit) return;
    totalDebit += debit;
    totalKredit += kredit;
    rows.push({ kode: a.kode, nama: a.nama, tipe: a.tipe, debit, kredit });
  });

  const selisih = Math.abs(totalDebit - totalKredit);
  return {
    rows,
    totalDebit,
    totalKredit,
    balanced: selisih < 1,
    selisih,
  };
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

export function computeNeraca(
  jurnalEntries: readonly JurnalEntry[],
  akuns: readonly Akun[]
): NeracaReport {
  let aset = 0;
  let liab = 0;
  let ekuitas = 0;
  const asetRows: NeracaRow[] = [];
  const liabRows: NeracaRow[] = [];
  const ekRows: NeracaRow[] = [];

  const fullMap = computeSaldoAll(jurnalEntries);
  let p = 0;
  let b = 0;
  akuns.forEach((a) => {
    const s = plNatural(a, fullMap[a.kode]);
    if (a.tipe === "Pendapatan") p += s;
    if (a.tipe === "Beban" || a.tipe === "HPP") b += s;
  });
  const labaBersih = p - b;

  akuns.forEach((a) => {
    const raw = fullMap[a.kode] || { debit: 0, kredit: 0 };
    const s = a.normal === "D" ? raw.debit - raw.kredit : raw.kredit - raw.debit;
    if (!s && a.tipe !== "Ekuitas") return;
    if (a.tipe === "Aset") {
      const v = a.normal === "D" ? s : -s;
      aset += v;
      asetRows.push({ kode: a.kode, nama: a.nama, nilai: v });
    } else if (a.tipe === "Liabilitas") {
      liab += s;
      liabRows.push({ kode: a.kode, nama: a.nama, nilai: s });
    } else if (a.tipe === "Ekuitas") {
      if (a.normal === "D") {
        ekuitas -= s;
        if (s) ekRows.push({ kode: a.kode, nama: a.nama, nilai: s, isPrive: true });
      } else {
        if (s) ekuitas += s;
        ekRows.push({ kode: a.kode, nama: a.nama, nilai: s, isPrive: false });
      }
    }
  });

  const totalEkuitas = ekuitas + labaBersih;
  const selisih = Math.abs(aset - (liab + totalEkuitas));
  return {
    asetRows,
    liabRows,
    ekRows,
    aset,
    liab,
    totalEkuitas,
    labaBersih,
    balanced: selisih < 1,
    selisih,
  };
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

export function computeArusKas(
  akuns: readonly Akun[],
  saldoMap: SaldoMap
): ArusKasReport {
  const getSaldo = (kode: string) => {
    const a = akuns.find((x) => x.kode === kode);
    if (!a) return 0;
    const s = saldoMap[kode] || { debit: 0, kredit: 0 };
    return a.normal === "D" ? s.debit - s.kredit : s.kredit - s.debit;
  };
  const sumK = (...kodes: string[]) =>
    kodes.reduce((acc, k) => acc + getSaldo(k), 0);

  const labaBersih =
    akuns
      .filter((a) => a.tipe === "Pendapatan")
      .reduce((acc, a) => acc + plNatural(a, saldoMap[a.kode]), 0) -
    akuns
      .filter((a) => a.tipe === "HPP" || a.tipe === "Beban")
      .reduce((acc, a) => acc + plNatural(a, saldoMap[a.kode]), 0);

  const penyusutan = akuns
    .filter(
      (a) =>
        a.tipe === "Aset" &&
        a.kat === "Kontra" &&
        a.nama.toLowerCase().includes("penyusutan")
    )
    .reduce((acc, a) => {
      const s = saldoMap[a.kode] || { debit: 0, kredit: 0 };
      return acc + (s.kredit - s.debit);
    }, 0);

  const deltaPiutang = -akuns
    .filter((a) => a.kode.startsWith("12"))
    .reduce((acc, a) => acc + getSaldo(a.kode), 0);

  const deltaPersediaan = -akuns
    .filter((a) => a.kode.startsWith("13"))
    .reduce((acc, a) => acc + getSaldo(a.kode), 0);

  const deltaUtangUsaha = getSaldo("2101");
  const deltaAkrual = sumK("2201", "2301", "2302", "2303", "2304", "2501", "2502");
  const asetLain = -akuns
    .filter(
      (a) =>
        a.kode.startsWith("14") ||
        a.kode.startsWith("15") ||
        a.kode.startsWith("16")
    )
    .reduce((acc, a) => acc + getSaldo(a.kode), 0);

  const totalOperasi =
    labaBersih +
    penyusutan +
    deltaPiutang +
    deltaPersediaan +
    deltaUtangUsaha +
    deltaAkrual +
    asetLain;

  const beliAset = -akuns
    .filter(
      (a) =>
        a.tipe === "Aset" &&
        a.kat === "Tetap" &&
        !a.nama.toLowerCase().includes("penyusutan")
    )
    .reduce((acc, a) => acc + getSaldo(a.kode), 0);

  const setorModal = getSaldo("3101");
  const prive = -getSaldo("3102");
  const utangLP = akuns
    .filter((a) => a.tipe === "Liabilitas" && a.kat === "Jk Panjang")
    .reduce((acc, a) => acc + getSaldo(a.kode), 0);

  const totalPendanaan = setorModal + prive + utangLP;
  const kasAkhir = sumK("1101", "1102", "1103", "1104");
  const kenaikan = totalOperasi + beliAset + totalPendanaan;

  return {
    operasiRows: [
      { label: "Laba Bersih Periode", nilai: labaBersih },
      { label: "Penyusutan & Amortisasi", nilai: penyusutan },
      { label: "Perubahan Piutang Usaha", nilai: deltaPiutang },
      { label: "Perubahan Persediaan", nilai: deltaPersediaan },
      { label: "Perubahan Utang Usaha", nilai: deltaUtangUsaha },
      { label: "Perubahan Kewajiban Akrual & Pajak", nilai: deltaAkrual },
      { label: "Perubahan Aset Lancar Lainnya", nilai: asetLain },
    ].filter((r) => r.nilai !== 0),
    totalOperasi,
    investasiRows: [{ label: "Pembelian Aset Tetap", nilai: beliAset }].filter(
      (r) => r.nilai !== 0
    ),
    totalInvestasi: beliAset,
    pendanaanRows: [
      { label: "Setoran Modal Pemilik", nilai: setorModal },
      { label: "Pengambilan Prive", nilai: prive },
      { label: "Perubahan Utang Bank Jangka Panjang", nilai: utangLP },
    ].filter((r) => r.nilai !== 0),
    totalPendanaan,
    kenaikan,
    kasAkhir,
  };
}

export interface PerubahanEkuitasReport {
  modalDisetor: number;
  prive: number;
  labaDitahan: number;
  labaBersih: number;
  ekuitasAwal: number;
  totalEkuitas: number;
}

export function computePerubahanEkuitas(
  akuns: readonly Akun[],
  saldoMap: SaldoMap
): PerubahanEkuitasReport {
  const getSaldo = (kode: string) => {
    const a = akuns.find((x) => x.kode === kode);
    if (!a) return 0;
    const s = saldoMap[kode] || { debit: 0, kredit: 0 };
    return a.normal === "D" ? s.debit - s.kredit : s.kredit - s.debit;
  };
  const modalDisetor = getSaldo("3101");
  const prive = getSaldo("3102");
  const labaDitahan = getSaldo("3201");
  const labaBersih =
    akuns
      .filter((a) => a.tipe === "Pendapatan")
      .reduce((acc, a) => acc + plNatural(a, saldoMap[a.kode]), 0) -
    akuns
      .filter((a) => a.tipe === "HPP" || a.tipe === "Beban")
      .reduce((acc, a) => acc + plNatural(a, saldoMap[a.kode]), 0);
  const totalEkuitas = modalDisetor - prive + labaDitahan + labaBersih;
  const ekuitasAwal = labaDitahan + modalDisetor;
  return {
    modalDisetor,
    prive,
    labaDitahan,
    labaBersih,
    ekuitasAwal,
    totalEkuitas,
  };
}

export function printReportHtml(
  title: string,
  subtitle: string,
  htmlContent: string
): void {
  if (typeof window === "undefined") return;
  let namaPerusahaan = "Perusahaan";
  try {
    const raw =
      window.localStorage.getItem("oas_profil") ||
      window.localStorage.getItem("oas_profil_v1") ||
      "{}";
    const parsed = JSON.parse(raw) as { nama?: string };
    if (parsed.nama) namaPerusahaan = parsed.nama;
  } catch {}

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(
    `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:32px;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}td,th{padding:7px 10px;}th{background:#f5f5f5;font-weight:600;}.total-row td{font-weight:700;border-top:2px solid #333;}</style></head><body><h2 style="text-align:center">${escapeHtml(namaPerusahaan)}</h2><p style="text-align:center;color:#666;font-size:11px;">${escapeHtml(subtitle)}</p>${htmlContent}</body></html>`
  );
  win.document.close();
  window.setTimeout(() => win.print(), 500);
}
