import type { Akun, Bill, Invoice, JurnalEntry, Pembayaran } from "@/types";
import { computeSaldoAll } from "../../shared/accounting/saldo-semua";
import { isJurnalPenutup } from "../../shared/accounting/cek-penutup";
import { plNatural } from "../../shared/accounting/saldo-alami";
import { rekapPpnJurnal } from "../../shared/accounting/rekap-ppn";
import { computeLabaRugi } from "../../laporan/laba-rugi/kalkulasi";
import { computeNeraca } from "../../laporan/neraca/kalkulasi";
import { computeNeracaSaldo } from "../../laporan/neraca-saldo/kalkulasi";
import { sisaTagihan } from "../../fitur-baru/pembayaran/sisa-tagihan";
import { filterJurnalRange } from "./filter-jurnal";
import { getDashPeriodRange } from "./rentang-periode";
import type { DashPeriodKey } from "./types";

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
