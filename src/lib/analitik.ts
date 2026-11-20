import type { Akun, Bill, Invoice, JurnalEntry, Pembayaran } from "@/types";
import {
  computeSaldoAll,
  getJurnalTanpaPenutup,
  isJurnalPenutup,
  plNatural,
  rekapPpnJurnal,
} from "./accounting";
import { computeLabaRugi, computeNeraca, computeNeracaSaldo } from "./laporan";
import { sisaTagihan } from "./pembayaran";

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

export function getDashPeriodRange(
  period: DashPeriodKey,
  customFrom = "",
  customTo = ""
): DateRangeResult {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const pad = (n: number) => String(n).padStart(2, "0");
  const lastDay = (yr: number, mo: number) =>
    new Date(yr, mo + 1, 0).getDate();

  if (period === "this-month") {
    const mo = pad(m + 1);
    return {
      from: `${y}-${mo}-01`,
      to: `${y}-${mo}-${pad(lastDay(y, m))}`,
      label: now.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    };
  }
  if (period === "last-month") {
    const d = new Date(y, m - 1, 1);
    const ly = d.getFullYear();
    const lm = d.getMonth();
    const mo = pad(lm + 1);
    return {
      from: `${ly}-${mo}-01`,
      to: `${ly}-${mo}-${pad(lastDay(ly, lm))}`,
      label: d.toLocaleDateString("id-ID", { month: "long", year: "numeric" }),
    };
  }
  if (period === "this-quarter") {
    const q = Math.floor(m / 3);
    const sm = q * 3;
    const em = sm + 2;
    return {
      from: `${y}-${pad(sm + 1)}-01`,
      to: `${y}-${pad(em + 1)}-${pad(lastDay(y, em))}`,
      label: `Q${q + 1} ${y}`,
    };
  }
  if (period === "this-year") {
    return { from: `${y}-01-01`, to: `${y}-12-31`, label: `Tahun ${y}` };
  }
  if (period === "custom") {
    return {
      from: customFrom || "2000-01-01",
      to: customTo || "2099-12-31",
      label:
        customFrom && customTo
          ? `${customFrom} s/d ${customTo}`
          : "Rentang Kustom",
    };
  }
  return { from: "", to: "", label: "Semua Periode" };
}

export function filterJurnalRange(
  jurnals: readonly JurnalEntry[],
  from: string,
  to: string
): JurnalEntry[] {
  return jurnals.filter((j) => {
    const t = j.tanggal || "";
    if (from && t < from) return false;
    if (to && t > to) return false;
    return true;
  });
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

const SHORT_MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

function fmtYmLabel(ym: string): string {
  const [yr, mo] = ym.split("-");
  const idx = parseInt(mo, 10) - 1;
  return `${SHORT_MONTHS[idx] || mo} ${yr?.slice(2) || ""}`;
}

function linearPredict(values: number[], steps: number): number[] {
  const n = values.length;
  if (n < 2) return Array(steps).fill(values[0] || 0);
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denom = n * sumX2 - sumX * sumX;
  const slope = denom ? (n * sumXY - sumX * sumY) / denom : 0;
  const intercept = (sumY - slope * sumX) / n;
  return Array.from({ length: steps }, (_, k) =>
    Math.round(intercept + slope * (n + k))
  );
}

export function computeMonthlyAnalytics(
  jurnals: readonly JurnalEntry[],
  akuns: readonly Akun[],
  periodLimit: number | "all" = 12
): AnalitikSummary {
  const akunMap = new Map(akuns.map((a) => [a.kode, a]));
  const nonClosing = getJurnalTanpaPenutup(jurnals);

  const byYm = new Map<string, JurnalEntry[]>();
  const dayCounts = new Map<string, number>();

  nonClosing.forEach((j) => {
    const t = j.tanggal || "";
    if (!/^\d{4}-\d{2}/.test(t)) return;
    const ym = t.slice(0, 7);
    const list = byYm.get(ym) || [];
    list.push(j);
    byYm.set(ym, list);
    dayCounts.set(t, (dayCounts.get(t) || 0) + 1);
  });

  let sortedYms = Array.from(byYm.keys()).sort();
  if (periodLimit !== "all" && sortedYms.length > periodLimit) {
    sortedYms = sortedYms.slice(-periodLimit);
  }

  let kasKum = 0;
  const months: MonthlyBucket[] = sortedYms.map((ym, idx) => {
    const entries = byYm.get(ym) || [];
    const saldo = computeSaldoAll(entries);
    const lr = computeLabaRugi(akuns, saldo);
    let kasMasuk = 0;
    let kasKeluar = 0;
    entries.forEach((j) => {
      (j.lines || []).forEach((l) => {
        if (l.akun.startsWith("11")) {
          kasMasuk += Number(l.debit) || 0;
          kasKeluar += Number(l.kredit) || 0;
        }
      });
    });
    const arusKas = kasMasuk - kasKeluar;
    kasKum += arusKas;
    const marginKotor =
      lr.totalPendapatan > 0 ? (lr.labaKotor / lr.totalPendapatan) * 100 : 0;
    const marginBersih =
      lr.totalPendapatan > 0 ? (lr.labaBersih / lr.totalPendapatan) * 100 : 0;
    return {
      ym,
      label: fmtYmLabel(ym),
      pendapatan: lr.totalPendapatan,
      hpp: lr.totalHpp,
      labaKotor: lr.labaKotor,
      beban: lr.totalBeban,
      labaBersih: lr.labaBersih,
      kasMasuk,
      kasKeluar,
      arusKas,
      kasKumulatif: kasKum,
      marginKotor,
      marginBersih,
      momGrowth: idx === 0 ? null : 0,
    };
  });

  for (let i = 1; i < months.length; i++) {
    const prev = months[i - 1].pendapatan;
    const curr = months[i].pendapatan;
    months[i].momGrowth =
      prev > 0 ? ((curr - prev) / prev) * 100 : curr > 0 ? 100 : 0;
  }

  const totalPendapatan = months.reduce((s, m) => s + m.pendapatan, 0);
  const totalBeban = months.reduce((s, m) => s + m.beban + m.hpp, 0);
  const totalLaba = months.reduce((s, m) => s + m.labaBersih, 0);
  const totalArusKas = months.reduce((s, m) => s + m.arusKas, 0);
  const avgMargin =
    totalPendapatan > 0 ? (totalLaba / totalPendapatan) * 100 : 0;

  const fullPlSaldo = computeSaldoAll(nonClosing);
  const fullLr = computeLabaRugi(akuns, fullPlSaldo);
  const fullNer = computeNeraca(jurnals, akuns);

  const bebanBreakdown = [...fullLr.bRows, ...fullLr.hRows]
    .filter((r) => r.nilai > 0)
    .sort((a, b) => b.nilai - a.nilai)
    .slice(0, 8);

  const fullAllSaldo = computeSaldoAll(jurnals);
  const topAkuns = akuns
    .map((a) => {
      const s = fullAllSaldo[a.kode] || { debit: 0, kredit: 0 };
      const nilai = Math.abs(
        a.normal === "D" ? s.debit - s.kredit : s.kredit - s.debit
      );
      return { kode: a.kode, nama: a.nama, tipe: a.tipe, nilai };
    })
    .filter((x) => x.nilai > 0)
    .sort((a, b) => b.nilai - a.nilai)
    .slice(0, 8);

  const asetLancar = akuns
    .filter((a) => a.tipe === "Aset" && a.kat === "Lancar")
    .reduce((sum, a) => {
      const s = fullAllSaldo[a.kode] || { debit: 0, kredit: 0 };
      return sum + (s.debit - s.kredit);
    }, 0);
  const liabLancar = akuns
    .filter((a) => a.tipe === "Liabilitas" && a.kat === "Lancar")
    .reduce((sum, a) => {
      const s = fullAllSaldo[a.kode] || { debit: 0, kredit: 0 };
      return sum + (s.kredit - s.debit);
    }, 0);

  const rasio = {
    currentRatio: liabLancar > 0 ? asetLancar / liabLancar : asetLancar > 0 ? 9.99 : 0,
    debtToEquity:
      fullNer.totalEkuitas > 0 ? fullNer.liab / fullNer.totalEkuitas : 0,
    grossMargin:
      fullLr.totalPendapatan > 0
        ? (fullLr.labaKotor / fullLr.totalPendapatan) * 100
        : 0,
    netMargin:
      fullLr.totalPendapatan > 0
        ? (fullLr.labaBersih / fullLr.totalPendapatan) * 100
        : 0,
    roa: fullNer.aset > 0 ? (fullLr.labaBersih / fullNer.aset) * 100 : 0,
  };

  const predPend = linearPredict(
    months.map((m) => m.pendapatan),
    3
  );
  const predLaba = linearPredict(
    months.map((m) => m.labaBersih),
    3
  );
  const proyeksi = [1, 2, 3].map((k, i) => ({
    label: `Bulan +${k}`,
    pendapatan: Math.max(0, predPend[i] || 0),
    laba: predLaba[i] || 0,
  }));

  const heatmap = Array.from(dayCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-28)
    .map(([day, count]) => ({ day, count }));

  const compare =
    months.length >= 2
      ? {
          currLabel: months[months.length - 1].label,
          prevLabel: months[months.length - 2].label,
          pendCurr: months[months.length - 1].pendapatan,
          pendPrev: months[months.length - 2].pendapatan,
          bebanCurr:
            months[months.length - 1].beban + months[months.length - 1].hpp,
          bebanPrev:
            months[months.length - 2].beban + months[months.length - 2].hpp,
          labaCurr: months[months.length - 1].labaBersih,
          labaPrev: months[months.length - 2].labaBersih,
        }
      : null;

  void akunMap;
  return {
    months,
    totalPendapatan,
    totalBeban,
    totalLaba,
    totalArusKas,
    avgMargin,
    bebanBreakdown,
    topAkuns,
    rasio,
    proyeksi,
    heatmap,
    compare,
  };
}

export function computeDashboardData(
  jurnals: readonly JurnalEntry[],
  akuns: readonly Akun[],
  invoices: readonly Invoice[],
  bills: readonly Bill[],
  pembayarans: readonly Pembayaran[],
  period: DashPeriodKey,
  customFrom = "",
  customTo = ""
) {
  const range = getDashPeriodRange(period, customFrom, customTo);
  const periodJurnals = filterJurnalRange(jurnals, range.from, range.to);
  const periodPlJurnals = periodJurnals.filter((j) => !isJurnalPenutup(j));
  const saldoPeriod = computeSaldoAll(periodPlJurnals);
  const lr = computeLabaRugi(akuns, saldoPeriod);
  const ner = computeNeraca(jurnals, akuns);
  const ns = computeNeracaSaldo(akuns, computeSaldoAll(jurnals));
  const ppn = rekapPpnJurnal(periodJurnals, akuns);

  const today = new Date().toISOString().slice(0, 10);
  const openInvoices = invoices
    .map((inv) => ({
      inv,
      sisa: sisaTagihan(inv, pembayarans, "invoice"),
    }))
    .filter(
      ({ inv, sisa }) =>
        (inv.status === "terkirim" || inv.status === "sebagian") && sisa > 0
    );
  const openBills = bills
    .map((b) => ({ b, sisa: sisaTagihan(b, pembayarans, "bill") }))
    .filter(
      ({ b, sisa }) =>
        (b.status === "diterima" || b.status === "sebagian") && sisa > 0
    );

  const overdueInv = openInvoices.filter(
    ({ inv }) => inv.jatuhTempo && inv.jatuhTempo < today
  );
  const overdueBill = openBills.filter(
    ({ b }) => b.jatuhTempo && b.jatuhTempo < today
  );

  const reminders: Array<{ text: string; targetPage: string; tone: "warn" | "danger" }> = [];
  if (overdueInv.length) {
    reminders.push({
      text: `${overdueInv.length} invoice lewat jatuh tempo — total ${openInvoices
        .filter(({ inv }) => inv.jatuhTempo && inv.jatuhTempo < today)
        .reduce((s, x) => s + x.sisa, 0)
        .toLocaleString("id-ID")}`,
      targetPage: "invoice",
      tone: "danger",
    });
  }
  if (overdueBill.length) {
    reminders.push({
      text: `${overdueBill.length} tagihan pembelian lewat jatuh tempo`,
      targetPage: "bill",
      tone: "warn",
    });
  }
  if (!ns.balanced && jurnals.length > 0) {
    reminders.push({
      text: `Neraca saldo belum seimbang (selisih Rp ${Math.round(ns.selisih).toLocaleString("id-ID")})`,
      targetPage: "neraca-saldo",
      tone: "danger",
    });
  }

  const totalPiutangInv = openInvoices.reduce((s, x) => s + x.sisa, 0);
  const totalUtangBill = openBills.reduce((s, x) => s + x.sisa, 0);
  const penjualanJurnals = periodPlJurnals.filter(
    (j) => j.jenis === "Penjualan" || j.jenis === "Invoice & Piutang"
  );

  const recent = jurnals.slice(-5).reverse();
  const topSaldo = ns.rows.slice(0, 8);

  void plNatural;
  return {
    range,
    totalAset: ner.aset,
    totalPendapatan: lr.totalPendapatan,
    totalBeban: lr.totalBeban + lr.totalHpp,
    labaBersih: lr.labaBersih,
    openInvoices,
    openBills,
    totalPiutangInv,
    totalUtangBill,
    penjualanJurnals,
    bebanRows: [...lr.bRows, ...lr.hRows]
      .filter((r) => r.nilai > 0)
      .sort((a, b) => b.nilai - a.nilai),
    ppn,
    reminders,
    recent,
    topSaldo,
  };
}
