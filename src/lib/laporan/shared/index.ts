import { JENIS_JURNAL, getJurnalTanpaPenutup } from "../../shared/accounting";
import type { Akun, JurnalEntry, SaldoMap } from "@/types";
import { escapeHtml } from "../../shared/format";

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

  const frame = window.document.createElement("iframe");
  frame.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  frame.setAttribute("aria-hidden", "true");
  window.document.body.appendChild(frame);
  const doc = frame.contentDocument || frame.contentWindow?.document;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(
    `<!DOCTYPE html><html><head><title>${escapeHtml(title)}</title><style>body{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:32px;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}td,th{padding:7px 10px;}th{background:#f5f5f5;font-weight:600;}.total-row td{font-weight:700;border-top:2px solid #333;}</style></head><body><h2 style="text-align:center">${escapeHtml(namaPerusahaan)}</h2><p style="text-align:center;color:#666;font-size:11px;">${escapeHtml(subtitle)}</p>${htmlContent}</body></html>`
  );
  doc.close();
  window.setTimeout(() => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      window.setTimeout(() => frame.remove(), 1200);
    }
  }, 350);
}
