import type { Akun, JurnalEntry } from "@/types";
import { computeSaldoAll } from "../accounting/computeSaldoAll";
import { getJurnalTanpaPenutup } from "../accounting/getJurnalTanpaPenutup";
import { computeLabaRugi } from "../laporan/computeLabaRugi";
import { computeNeraca } from "../laporan/computeNeraca";
import type { AnalitikSummary, MonthlyBucket } from "./types";

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
