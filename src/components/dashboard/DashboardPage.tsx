"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  BookOpen,
  Bot,
  Building2,
  Clock,
  CreditCard,
  Landmark,
  Receipt,
  RefreshCw,
  Scale,
  Settings,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  Upload,
  User,
  Zap,
} from "lucide-react";
import {
  agingHariIni,
  computeDashboardData,
  computeLabaRugi,
  computeSaldoAll,
  fmtRp,
  getJurnalTanpaPenutup,
  JENIS_PENUTUP,
  readAkuns,
  readBillList,
  readInvoiceList,
  readJurnalEntries,
  readPembayaranList,
  setOasWindowFn,
  type DashPeriodKey,
} from "@/lib";

interface DashWin {
  showPage?: (id: string) => void;
  openModal?: (id: string) => void;
  openModalSaldoAwal?: () => void;
  loadProfil?: () => void;
  openAccountSettings?: () => void;
  openJurnalPenyesuaian?: () => void;
  openExportModal?: () => void;
  showAlert?: (msg: string) => void;
  showConfirm?: (msg: string, cb: () => void) => void;
  guardWrite?: (mod?: string, act?: string) => boolean;
  addJurnal?: (entry: Record<string, unknown>) => { no?: string } | null;
  saveToStorage?: (showToast?: boolean) => void;
  renderJurnalUmum?: () => void;
}

const getWin = () => window as unknown as DashWin;

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);
  const [period, setPeriod] = useState<DashPeriodKey>("this-month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const handleJurnalPenutup = useCallback(() => {
    const w = getWin();
    if (w.guardWrite && !w.guardWrite("jurnal", "create")) return;
    const akuns = readAkuns();
    const jurnals = readJurnalEntries();
    const nonClosing = getJurnalTanpaPenutup(jurnals);
    const saldo = computeSaldoAll(nonClosing);
    const lr = computeLabaRugi(akuns, saldo);
    if (!lr.pRows.length && !lr.hRows.length && !lr.bRows.length) {
      return void w.showAlert?.(
        "ℹ️ Tidak ada saldo pendapatan atau beban untuk ditutup."
      );
    }
    const akunLaba =
      akuns.find((a) => a.kode === "3201")?.kode ||
      akuns.find((a) => a.tipe === "Ekuitas")?.kode ||
      "3201";
    const lines: Array<{ akun: string; ket: string; debit: number; kredit: number }> = [];
    lr.pRows.forEach((r) => {
      if (r.nilai > 0) lines.push({ akun: r.kode, ket: `Tutup ${r.nama}`, debit: r.nilai, kredit: 0 });
    });
    lr.hRows.forEach((r) => {
      if (r.nilai > 0) lines.push({ akun: r.kode, ket: `Tutup ${r.nama}`, debit: 0, kredit: r.nilai });
    });
    lr.bRows.forEach((r) => {
      if (r.nilai > 0) lines.push({ akun: r.kode, ket: `Tutup ${r.nama}`, debit: 0, kredit: r.nilai });
    });
    if (lr.labaBersih > 0) {
      lines.push({ akun: akunLaba, ket: "Pemindahan Laba Bersih", debit: 0, kredit: lr.labaBersih });
    } else if (lr.labaBersih < 0) {
      lines.push({ akun: akunLaba, ket: "Pemindahan Rugi Bersih", debit: Math.abs(lr.labaBersih), kredit: 0 });
    }
    const run = () => {
      const posted = w.addJurnal?.({
        tanggal: agingHariIni(),
        jenis: JENIS_PENUTUP,
        ket: `Jurnal Penutup — Laba Bersih ${fmtRp(lr.labaBersih)}`,
        lines,
      });
      if (!posted) return;
      w.saveToStorage?.(false);
      refresh();
      w.renderJurnalUmum?.();
      w.showAlert?.("✓ Jurnal Penutup berhasil dibuat!");
    };
    if (w.showConfirm) {
      w.showConfirm(
        `Buat Jurnal Penutup untuk memindahkan laba bersih sebesar ${fmtRp(lr.labaBersih)} ke akun ${akunLaba}?`,
        run
      );
    } else run();
  }, [refresh]);

  const handleCekRekonsiliasi = useCallback(() => {
    const w = getWin();
    const akuns = readAkuns();
    const saldo = computeSaldoAll(readJurnalEntries());
    const kasAkuns = akuns.filter((a) => a.tipe === "Aset" && a.kode.startsWith("11"));
    const rows = kasAkuns
      .map((a) => {
        const s = saldo[a.kode] || { debit: 0, kredit: 0 };
        const net = s.debit - s.kredit;
        return net !== 0 ? `${a.kode} ${a.nama}: ${fmtRp(net)}` : null;
      })
      .filter(Boolean);
    w.showAlert?.(
      rows.length
        ? `Saldo Kas & Bank saat ini:<br>${rows.join("<br>")}`
        : "Belum ada transaksi pada akun Kas & Bank (11xx)."
    );
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    setOasWindowFn("renderDashboard", refresh as (...args: never[]) => unknown);
    setOasWindowFn("renderDashPiutangUtang", refresh as (...args: never[]) => unknown);
    setOasWindowFn("renderDashBebanPajak", refresh as (...args: never[]) => unknown);
    setOasWindowFn("buatJurnalPenutup", handleJurnalPenutup as (...args: never[]) => unknown);
    setOasWindowFn("cekRekonsiliasi", handleCekRekonsiliasi as (...args: never[]) => unknown);
  }, [handleCekRekonsiliasi, handleJurnalPenutup, refresh]);

  const data = useMemo(() => {
    void tick;
    if (!mounted) {
      return computeDashboardData([], [], [], [], [], "all", "", "");
    }
    return computeDashboardData(
      readJurnalEntries(),
      readAkuns(),
      readInvoiceList(),
      readBillList(),
      readPembayaranList(),
      period,
      customFrom,
      customTo
    );
  }, [customFrom, customTo, mounted, period, tick]);

  return (
    <div className="page active" id="page-dashboard" data-react-managed="1">
      {/* Top controls */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <select
            id="dash-filter-period"
            value={period}
            onChange={(e) => setPeriod(e.target.value as DashPeriodKey)}
            style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "8px", padding: "7px 12px", color: "var(--text)", fontSize: "13px", fontFamily: "var(--sans)" }}
          >
            <option value="all">Semua Periode</option>
            <option value="this-month">Bulan Ini</option>
            <option value="last-month">Bulan Lalu</option>
            <option value="this-quarter">Kuartal Ini</option>
            <option value="this-year">Tahun Ini</option>
            <option value="custom">Rentang Kustom</option>
          </select>
          {period === "custom" && (
            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 10px", color: "var(--text)", fontSize: "12px" }} />
              <span style={{ color: "var(--muted)", fontSize: "12px" }}>s/d</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "6px", padding: "6px 10px", color: "var(--text)", fontSize: "12px" }} />
            </div>
          )}
          <span style={{ fontSize: "12px", color: "var(--accent2)", fontFamily: "var(--mono)" }}>{data.range.label}</span>
        </div>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => getWin().openModalSaldoAwal?.()}>
            <Settings size={13} /> Saldo Awal
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => { getWin().openModal?.("modal-profil"); getWin().loadProfil?.(); }}>
            <Building2 size={13} /> Profil
          </button>
          <button className="btn btn-ghost btn-sm" type="button" onClick={() => getWin().openAccountSettings?.()}>
            <User size={13} /> Akun
          </button>
        </div>
      </div>

      {/* Reminders */}
      {data.reminders.length > 0 && (
        <div style={{ display: "grid", gap: "6px", marginBottom: "14px" }}>
          {data.reminders.map((r, i) => (
            <div
              key={i}
              onClick={() => getWin().showPage?.(r.targetPage)}
              style={{
                cursor: "pointer",
                padding: "9px 14px",
                borderRadius: "9px",
                fontSize: "12.5px",
                background: r.tone === "danger" ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)",
                border: `1px solid ${r.tone === "danger" ? "rgba(248,113,113,0.35)" : "rgba(251,191,36,0.35)"}`,
                color: r.tone === "danger" ? "var(--danger)" : "var(--accent3)",
              }}
            >
              ⚠️ {r.text}
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div className="stats-grid" style={{ marginBottom: "16px" }}>
        <div className="stat-card green">
          <div className="stat-label">Total Aset</div>
          <div className="stat-value" id="stat-aset">{fmtRp(data.totalAset)}</div>
          <div className="stat-sub">Semua periode</div>
        </div>
        <div className="stat-card blue">
          <div className="stat-label">Pendapatan</div>
          <div className="stat-value" id="stat-pendapatan">{fmtRp(data.totalPendapatan)}</div>
          <div className="stat-sub">{data.range.label}</div>
        </div>
        <div className="stat-card yellow">
          <div className="stat-label">Total Beban &amp; HPP</div>
          <div className="stat-value" id="stat-beban">{fmtRp(data.totalBeban)}</div>
          <div className="stat-sub">{data.range.label}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-label">Laba Bersih</div>
          <div className="stat-value" id="stat-laba" style={{ color: data.labaBersih >= 0 ? "var(--accent)" : "var(--danger)" }}>
            {fmtRp(data.labaBersih)}
          </div>
          <div className="stat-sub">{data.range.label}</div>
        </div>
      </div>

      {/* Row 1: Piutang, Utang, Aksi Cepat, Penjualan */}
      <div className="grid-2" style={{ marginBottom: "16px" }}>
        <div className="table-card">
          <div className="table-header">
            <div>
              <div className="table-title"><ArrowUpRight size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} /> Piutang Usaha</div>
              <div className="table-subtitle">Total: {fmtRp(data.totalPiutangInv)} ({data.openInvoices.length} invoice)</div>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => getWin().showPage?.("invoice")}>Lihat Semua</button>
          </div>
          <div className="dash-card-scroll" style={{ padding: "10px 14px" }}>
            {!data.openInvoices.length ? (
              <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Tidak ada piutang berjalan.</div>
            ) : (
              data.openInvoices.slice(0, 6).map(({ inv, sisa }) => (
                <div key={inv.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{inv.pelanggan}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>{inv.noInvoice} · JT {inv.jatuhTempo || "—"}</div>
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent2)" }}>{fmtRp(sisa)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div>
              <div className="table-title"><ArrowDownLeft size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} /> Utang Usaha</div>
              <div className="table-subtitle">Total: {fmtRp(data.totalUtangBill)} ({data.openBills.length} tagihan)</div>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => getWin().showPage?.("bill")}>Lihat Semua</button>
          </div>
          <div className="dash-card-scroll" style={{ padding: "10px 14px" }}>
            {!data.openBills.length ? (
              <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Tidak ada tagihan utang belum lunas.</div>
            ) : (
              data.openBills.slice(0, 6).map(({ b, sisa }) => (
                <div key={b.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{b.supplier}</div>
                    <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>{b.noBill} · JT {b.jatuhTempo || "—"}</div>
                  </div>
                  <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent3)" }}>{fmtRp(sisa)}</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div className="table-title"><Zap size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} /> Aksi Cepat</div>
          </div>
          <div style={{ padding: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <button type="button" onClick={() => getWin().showPage?.("transaksi")} className="quick-action-btn"><CreditCard size={15} /> Input Transaksi</button>
            <button type="button" onClick={() => getWin().openJurnalPenyesuaian?.()} className="quick-action-btn"><SlidersHorizontal size={15} /> Jurnal Penyesuaian</button>
            <button type="button" onClick={() => getWin().showPage?.("laba-rugi")} className="quick-action-btn"><TrendingUp size={15} /> Laba Rugi</button>
            <button type="button" onClick={() => getWin().showPage?.("neraca")} className="quick-action-btn"><Landmark size={15} /> Neraca</button>
            <button type="button" onClick={handleJurnalPenutup} className="quick-action-btn" style={{ borderColor: "rgba(245,158,11,0.3)", color: "var(--accent3)" }}><BookOpen size={15} /> Jurnal Penutup</button>
            <button type="button" onClick={handleCekRekonsiliasi} className="quick-action-btn" style={{ borderColor: "rgba(34,211,238,0.3)", color: "var(--accent2)" }}><RefreshCw size={15} /> Cek Saldo Kas</button>
            <button type="button" onClick={() => getWin().showPage?.("ai-assistant")} className="quick-action-btn" style={{ borderColor: "rgba(34,211,238,0.3)", color: "var(--accent2)" }}><Bot size={15} /> Orias Assisten</button>
            <button type="button" onClick={() => getWin().openExportModal?.()} className="quick-action-btn"><Upload size={15} /> Export Laporan</button>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div>
              <div className="table-title"><Receipt size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} /> Informasi Penjualan</div>
              <div className="table-subtitle">{data.penjualanJurnals.length} transaksi pada {data.range.label}</div>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => getWin().showPage?.("jurnal-penjualan")}>Detail</button>
          </div>
          <div className="dash-card-scroll" style={{ padding: "10px 14px" }}>
            {!data.penjualanJurnals.length ? (
              <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Belum ada penjualan pada periode ini.</div>
            ) : (
              data.penjualanJurnals.slice(-5).reverse().map((j, idx) => {
                const nom = (j.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
                return (
                  <div key={j.no || idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{j.ket}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>{j.tanggal} · {j.no}</div>
                    </div>
                    <div style={{ fontFamily: "var(--mono)", fontWeight: 700, color: "var(--accent)" }}>{fmtRp(nom)}</div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Row 2: Beban Usaha + Rekap Pajak */}
      <div className="grid-2" style={{ marginBottom: "16px" }}>
        <div className="table-card">
          <div className="table-header">
            <div>
              <div className="table-title"><TrendingDown size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} /> Beban Usaha</div>
              <div className="table-subtitle">Pengeluaran operasional ({data.range.label})</div>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => getWin().showPage?.("laba-rugi")}>Detail</button>
          </div>
          <div className="dash-card-scroll" style={{ padding: "10px 14px" }}>
            {!data.bebanRows.length ? (
              <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Belum ada beban tercatat.</div>
            ) : (
              data.bebanRows.slice(0, 6).map((b) => (
                <div key={b.kode} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                  <span><span style={{ fontFamily: "var(--mono)", color: "var(--muted)", marginRight: "6px" }}>{b.kode}</span>{b.nama}</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: "var(--accent3)" }}>{fmtRp(b.nilai)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div>
              <div className="table-title"><Receipt size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} /> Rekap Pajak Periode</div>
              <div className="table-subtitle">PPN Keluaran vs PPN Masukan</div>
            </div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => getWin().showPage?.("pajak")}>Detail</button>
          </div>
          <div style={{ padding: "12px 14px", display: "grid", gap: "8px", fontSize: "13px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>PPN Keluaran</span><span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{fmtRp(data.ppn.keluaran)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>PPN Masukan</span><span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{fmtRp(data.ppn.masukan)}</span></div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--border)", paddingTop: "8px" }}>
              <span style={{ fontWeight: 700 }}>{data.ppn.kurangBayar >= 0 ? "PPN Kurang Bayar" : "PPN Lebih Bayar"}</span>
              <span style={{ fontFamily: "var(--mono)", fontWeight: 700, color: data.ppn.kurangBayar >= 0 ? "var(--accent3)" : "var(--accent)" }}>
                {fmtRp(Math.abs(data.ppn.kurangBayar))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Recent + Neraca Saldo */}
      <div className="grid-2">
        <div className="table-card">
          <div className="table-header">
            <div><div className="table-title"><Clock size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} /> Transaksi Terbaru</div><div className="table-subtitle">5 entri terakhir</div></div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => getWin().showPage?.("jurnal-umum")}>Lihat Semua</button>
          </div>
          <div className="dash-card-scroll" style={{ padding: "10px 14px" }}>
            {!data.recent.length ? (
              <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Belum ada jurnal tercatat.</div>
            ) : (
              data.recent.map((j, idx) => {
                const nom = (j.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
                return (
                  <div key={j.no || idx} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{j.ket}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted)", fontFamily: "var(--mono)" }}>{j.tanggal} · {j.jenis}</div>
                    </div>
                    <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{fmtRp(nom)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div><div className="table-title"><Scale size={14} style={{ verticalAlign: "-2px", marginRight: "4px" }} /> Neraca Saldo Utama</div><div className="table-subtitle">Akun aktif dengan saldo</div></div>
            <button className="btn btn-ghost btn-sm" type="button" onClick={() => getWin().showPage?.("neraca-saldo")}>Lengkap</button>
          </div>
          <div className="dash-card-scroll" style={{ padding: "10px 14px" }}>
            {!data.topSaldo.length ? (
              <div style={{ fontSize: "12px", color: "var(--muted)", textAlign: "center", padding: "16px 0" }}>Belum ada saldo akun.</div>
            ) : (
              data.topSaldo.map((r) => (
                <div key={r.kode} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "12.5px" }}>
                  <span><span style={{ fontFamily: "var(--mono)", color: "var(--muted)", marginRight: "6px" }}>{r.kode}</span>{r.nama}</span>
                  <span style={{ fontFamily: "var(--mono)", fontWeight: 600, color: r.debit > 0 ? "var(--accent2)" : "var(--accent)" }}>
                    {fmtRp(r.debit || r.kredit)} {r.debit > 0 ? "D" : "K"}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
