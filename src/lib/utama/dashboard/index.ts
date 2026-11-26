import type { JurnalEntry, Akun, Bill, Invoice, Pembayaran } from "@/types";
import { computeSaldoAll, isJurnalPenutup, plNatural, rekapPpnJurnal } from "../../shared/accounting";
import { computeLabaRugi } from "../../laporan/laba-rugi/kalkulasi";
import { computeNeraca } from "../../laporan/neraca/kalkulasi";
import { computeNeracaSaldo } from "../../laporan/neraca-saldo/kalkulasi";
import { sisaTagihan } from "../../fitur-baru/pembayaran";

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
      text: `${overdueInv.length} invoice lewat jatuh tempo · total ${openInvoices
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
