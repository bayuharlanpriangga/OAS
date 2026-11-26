"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Bot,
  Building2,
  Landmark,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  Upload,
  User,
} from "lucide-react";
import {
  agingHariIni,
  computeDashboardData,
  computeLabaRugi,
  computeSaldoAll,
  fmtDate,
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
        "Tidak ada saldo pendapatan atau beban untuk ditutup."
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
        ket: `Jurnal Penutup · Laba Bersih ${fmtRp(lr.labaBersih)}`,
        lines,
      });
      if (!posted) return;
      w.saveToStorage?.(false);
      refresh();
      w.renderJurnalUmum?.();
      w.showAlert?.("Jurnal penutup dibuat.");
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
      {/* Kontrol periode & pengaturan cepat */}
      <div className="dash-toolbar">
        <div className="dash-toolbar-group">
          <select
            id="dash-filter-period"
            aria-label="Pilih periode laporan"
            className="dash-period-select"
            value={period}
            onChange={(e) => setPeriod(e.target.value as DashPeriodKey)}
          >
            <option value="all">Semua periode</option>
            <option value="this-month">Bulan ini</option>
            <option value="last-month">Bulan lalu</option>
            <option value="this-quarter">Kuartal ini</option>
            <option value="this-year">Tahun ini</option>
            <option value="custom">Rentang kustom</option>
          </select>
          {period === "custom" && (
            <div className="dash-toolbar-group">
              <input
                type="date"
                aria-label="Tanggal mulai"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="dash-period-select"
              />
              <span className="dash-period-label">s/d</span>
              <input
                type="date"
                aria-label="Tanggal akhir"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="dash-period-select"
              />
            </div>
          )}
          <span className="dash-period-label">{data.range.label}</span>
        </div>

        <div className="dash-toolbar-group">
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={() => getWin().openModalSaldoAwal?.()}
          >
            <Settings size={14} aria-hidden="true" />
            Saldo awal
          </button>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={() => {
              getWin().openModal?.("modal-profil");
              getWin().loadProfil?.();
            }}
          >
            <Building2 size={14} aria-hidden="true" />
            Profil
          </button>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={() => getWin().openAccountSettings?.()}
          >
            <User size={14} aria-hidden="true" />
            Akun
          </button>
        </div>
      </div>

      {/* Peringatan jatuh tempo / saldo (hanya tampil jika ada) */}
      {data.reminders.length > 0 && (
        <div style={{ display: "grid", gap: "8px", marginBottom: "14px" }}>
          {data.reminders.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => getWin().showPage?.(r.targetPage)}
              style={{
                cursor: "pointer",
                padding: "9px 14px",
                borderRadius: "var(--r-control)",
                fontSize: "13px",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontFamily: "var(--sans)",
                background: r.tone === "danger" ? "var(--red-tint)" : "var(--warn-tint)",
                border: `1px solid ${r.tone === "danger" ? "var(--danger)" : "var(--warn)"}`,
                color: r.tone === "danger" ? "var(--danger)" : "var(--warn)",
              }}
            >
              <AlertTriangle size={15} strokeWidth={2} style={{ flexShrink: 0 }} aria-hidden="true" />
              <span>{r.text}</span>
            </button>
          ))}
        </div>
      )}

      {/* Pita Posisi Keuangan — 1 titik masuk utama (Laba Bersih) + 3 angka pendukung */}
      <section className="dash-ledger-hero" aria-label="Ringkasan posisi keuangan">
        <div className="dash-kpi-primary">
          <div className="dash-kpi-label">Laba bersih ({data.range.label})</div>
          <div
            className="dash-kpi-main-val"
            id="stat-laba"
            style={{
              color:
                data.labaBersih > 0
                  ? "var(--green)"
                  : data.labaBersih < 0
                    ? "var(--danger)"
                    : "var(--text)",
            }}
          >
            {fmtRp(data.labaBersih)}
          </div>
          <div className="dash-kpi-sub">
            Pendapatan dikurangi HPP dan beban operasional
          </div>
        </div>

        <div className="dash-kpi-secondary">
          <div className="dash-kpi-sec-item">
            <span className="dash-kpi-label">Pendapatan</span>
            <span className="dash-kpi-sec-val" id="stat-pendapatan">
              {fmtRp(data.totalPendapatan)}
            </span>
          </div>
          <div className="dash-kpi-sec-item">
            <span className="dash-kpi-label">Beban &amp; HPP</span>
            <span className="dash-kpi-sec-val" id="stat-beban">
              {fmtRp(data.totalBeban)}
            </span>
          </div>
          <div className="dash-kpi-sec-item">
            <span className="dash-kpi-label">Total aset</span>
            <span className="dash-kpi-sec-val" id="stat-aset">
              {fmtRp(data.totalAset)}
            </span>
          </div>
        </div>
      </section>

      {/* Pita aksi kerja — datar dan ringkas, satu baris tanpa bingkai kartu */}
      <div className="dash-action-strip" role="toolbar" aria-label="Aksi pembukuan cepat">
        <button
          type="button"
          onClick={() => getWin().openJurnalPenyesuaian?.()}
          className="quick-action-btn"
        >
          <SlidersHorizontal size={14} aria-hidden="true" />
          Penyesuaian
        </button>
        <button
          type="button"
          onClick={() => getWin().showPage?.("laba-rugi")}
          className="quick-action-btn"
        >
          <TrendingUp size={14} aria-hidden="true" />
          Laba rugi
        </button>
        <button
          type="button"
          onClick={() => getWin().showPage?.("neraca")}
          className="quick-action-btn"
        >
          <Landmark size={14} aria-hidden="true" />
          Neraca
        </button>
        <button
          type="button"
          onClick={handleJurnalPenutup}
          className="quick-action-btn"
        >
          <BookOpen size={14} aria-hidden="true" />
          Tutup buku
        </button>
        <button
          type="button"
          onClick={handleCekRekonsiliasi}
          className="quick-action-btn"
        >
          <RefreshCw size={14} aria-hidden="true" />
          Cek saldo kas
        </button>
        <button
          type="button"
          onClick={() => getWin().openExportModal?.()}
          className="quick-action-btn"
        >
          <Upload size={14} aria-hidden="true" />
          Ekspor laporan
        </button>
        <button
          type="button"
          onClick={() => getWin().showPage?.("ai-assistant")}
          className="quick-action-btn"
        >
          <Bot size={14} aria-hidden="true" />
          Orias AI
        </button>
      </div>

      {/* Area kerja asimetris: Operasional (kiri ~62%) & Referensi (kanan ~38%) */}
      <div className="dash-workspace-grid">
        <div className="dash-col-main">
          {/* Transaksi terbaru — tabel/daftar langsung di permukaan */}
          <section className="dash-section" id="dash-recent">
            <div className="dash-section-head">
              <div>
                <h2 className="dash-section-title">Transaksi terbaru</h2>
                <div className="dash-section-meta">5 entri jurnal terakhir</div>
              </div>
              <button
                className="dash-link-btn"
                type="button"
                onClick={() => getWin().showPage?.("jurnal-umum")}
              >
                Buka jurnal umum
              </button>
            </div>
            {!data.recent.length ? (
              <div className="dash-empty">
                <span>Belum ada entri jurnal pada pembukuan ini.</span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => getWin().showPage?.("transaksi")}
                >
                  Catat transaksi pertama
                </button>
              </div>
            ) : (
              <div className="dash-list">
                {data.recent.map((j, idx) => {
                  const nom = (j.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
                  return (
                    <div key={j.no || idx} className="dash-row">
                      <div className="dash-row-main">
                        <div className="dash-row-title">{j.ket}</div>
                        <div className="dash-row-meta">
                          <span>{fmtDate(j.tanggal)}</span>
                          <span>{j.jenis}</span>
                          {j.no ? <span style={{ fontFamily: "var(--mono)" }}>{j.no}</span> : null}
                        </div>
                      </div>
                      <span className="dash-row-num">{fmtRp(nom)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Piutang & Utang berjalan — dua kolom sejajar di permukaan */}
          <div className="dash-subsplit">
            <section className="dash-section">
              <div className="dash-section-head">
                <div>
                  <h2 className="dash-section-title">Piutang usaha</h2>
                  <div className="dash-section-meta">
                    {fmtRp(data.totalPiutangInv)} ({data.openInvoices.length} invoice)
                  </div>
                </div>
                <button
                  className="dash-link-btn"
                  type="button"
                  onClick={() => getWin().showPage?.("invoice")}
                >
                  Kelola
                </button>
              </div>
              {!data.openInvoices.length ? (
                <div className="dash-empty">
                  <span>Tidak ada piutang berjalan.</span>
                </div>
              ) : (
                <div className="dash-list">
                  {data.openInvoices.slice(0, 6).map(({ inv, sisa }) => (
                    <div key={inv.id} className="dash-row">
                      <div className="dash-row-main">
                        <div className="dash-row-title">{inv.pelanggan}</div>
                        <div className="dash-row-meta">
                          <span style={{ fontFamily: "var(--mono)" }}>{inv.noInvoice}</span>
                          <span>JT {inv.jatuhTempo ? fmtDate(inv.jatuhTempo) : "-"}</span>
                        </div>
                      </div>
                      <span className="dash-row-num" style={{ color: "var(--accent-text)" }}>
                        {fmtRp(sisa)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="dash-section">
              <div className="dash-section-head">
                <div>
                  <h2 className="dash-section-title">Utang usaha</h2>
                  <div className="dash-section-meta">
                    {fmtRp(data.totalUtangBill)} ({data.openBills.length} tagihan)
                  </div>
                </div>
                <button
                  className="dash-link-btn"
                  type="button"
                  onClick={() => getWin().showPage?.("pesanan-pembelian")}
                >
                  Kelola
                </button>
              </div>
              {!data.openBills.length ? (
                <div className="dash-empty">
                  <span>Tidak ada tagihan belum lunas.</span>
                </div>
              ) : (
                <div className="dash-list">
                  {data.openBills.slice(0, 6).map(({ b, sisa }) => (
                    <div key={b.id} className="dash-row">
                      <div className="dash-row-main">
                        <div className="dash-row-title">{b.supplier}</div>
                        <div className="dash-row-meta">
                          <span style={{ fontFamily: "var(--mono)" }}>{b.noBill}</span>
                          <span>JT {b.jatuhTempo ? fmtDate(b.jatuhTempo) : "-"}</span>
                        </div>
                      </div>
                      <span className="dash-row-num" style={{ color: "var(--warn)" }}>
                        {fmtRp(sisa)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Penjualan periode ini */}
          <section className="dash-section">
            <div className="dash-section-head">
              <div>
                <h2 className="dash-section-title">Penjualan periode ini</h2>
                <div className="dash-section-meta">
                  {data.penjualanJurnals.length} transaksi pada {data.range.label}
                </div>
              </div>
              <button
                className="dash-link-btn"
                type="button"
                onClick={() => getWin().showPage?.("jurnal-penjualan")}
              >
                Jurnal penjualan
              </button>
            </div>
            {!data.penjualanJurnals.length ? (
              <div className="dash-empty">
                <span>Belum ada penjualan pada {data.range.label}.</span>
              </div>
            ) : (
              <div className="dash-list">
                {data.penjualanJurnals.slice(-5).reverse().map((j, idx) => {
                  const nom = (j.lines || []).reduce((s, l) => s + (l.debit || 0), 0);
                  return (
                    <div key={j.no || idx} className="dash-row">
                      <div className="dash-row-main">
                        <div className="dash-row-title">{j.ket}</div>
                        <div className="dash-row-meta">
                          <span>{fmtDate(j.tanggal)}</span>
                          {j.no ? <span style={{ fontFamily: "var(--mono)" }}>{j.no}</span> : null}
                        </div>
                      </div>
                      <span className="dash-row-num" style={{ color: "var(--green)" }}>
                        {fmtRp(nom)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Kolom referensi (lebih rapat) */}
        <aside className="dash-col-ref" aria-label="Ringkasan akun dan pajak">
          {/* Neraca saldo utama */}
          <section className="dash-section" id="dash-saldo">
            <div className="dash-section-head">
              <div>
                <h2 className="dash-section-title">Neraca saldo utama</h2>
                <div className="dash-section-meta">Akun aktif dengan saldo</div>
              </div>
              <button
                className="dash-link-btn"
                type="button"
                onClick={() => getWin().showPage?.("neraca-saldo")}
              >
                Lengkap
              </button>
            </div>
            {!data.topSaldo.length ? (
              <div className="dash-empty">
                <span>Belum ada saldo akun tercatat.</span>
              </div>
            ) : (
              <div className="dash-list">
                {data.topSaldo.map((r) => (
                  <div key={r.kode} className="dash-row">
                    <div className="dash-row-main">
                      <div className="dash-row-title" style={{ fontWeight: 500 }}>
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            color: "var(--muted)",
                            marginRight: "8px",
                            fontSize: "12px",
                          }}
                        >
                          {r.kode}
                        </span>
                        {r.nama}
                      </div>
                    </div>
                    <span className="dash-row-num">
                      {fmtRp(r.debit || r.kredit)}{" "}
                      <span style={{ color: "var(--muted)", fontSize: "12px" }}>
                        {r.debit > 0 ? "D" : "K"}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Rekap pajak PPN — format ledger dengan garis total ganda */}
          <section className="dash-section">
            <div className="dash-section-head">
              <div>
                <h2 className="dash-section-title">Rekap PPN</h2>
                <div className="dash-section-meta">Keluaran dibanding masukan</div>
              </div>
              <button
                className="dash-link-btn"
                type="button"
                onClick={() => getWin().showPage?.("pajak")}
              >
                Pajak
              </button>
            </div>
            <div className="dash-list">
              <div className="dash-row">
                <span style={{ color: "var(--muted)" }}>PPN keluaran</span>
                <span className="dash-row-num">{fmtRp(data.ppn.keluaran)}</span>
              </div>
              <div className="dash-row">
                <span style={{ color: "var(--muted)" }}>PPN masukan</span>
                <span className="dash-row-num">{fmtRp(data.ppn.masukan)}</span>
              </div>
              <div className="dash-total-double">
                <span>{data.ppn.kurangBayar >= 0 ? "PPN kurang bayar" : "PPN lebih bayar"}</span>
                <span
                  className="dash-row-num"
                  style={{
                    color: data.ppn.kurangBayar >= 0 ? "var(--warn)" : "var(--green)",
                  }}
                >
                  {fmtRp(Math.abs(data.ppn.kurangBayar))}
                </span>
              </div>
            </div>
          </section>

          {/* Beban operasional */}
          <section className="dash-section">
            <div className="dash-section-head">
              <div>
                <h2 className="dash-section-title">Beban operasional</h2>
                <div className="dash-section-meta">{data.range.label}</div>
              </div>
              <button
                className="dash-link-btn"
                type="button"
                onClick={() => getWin().showPage?.("laba-rugi")}
              >
                Laba rugi
              </button>
            </div>
            {!data.bebanRows.length ? (
              <div className="dash-empty">
                <span>Belum ada beban tercatat.</span>
              </div>
            ) : (
              <div className="dash-list">
                {data.bebanRows.slice(0, 6).map((b) => (
                  <div key={b.kode} className="dash-row">
                    <div className="dash-row-main">
                      <div className="dash-row-title" style={{ fontWeight: 500 }}>
                        <span
                          style={{
                            fontFamily: "var(--mono)",
                            color: "var(--muted)",
                            marginRight: "8px",
                            fontSize: "12px",
                          }}
                        >
                          {b.kode}
                        </span>
                        {b.nama}
                      </div>
                    </div>
                    <span className="dash-row-num" style={{ color: "var(--warn)" }}>
                      {fmtRp(b.nilai)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
