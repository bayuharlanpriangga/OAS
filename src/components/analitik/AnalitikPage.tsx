"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Calendar,
  ClipboardList,
  PieChart,
  RefreshCw,
  Scale,
  TrendingUp,
  Trophy,
} from "lucide-react";
import {
  computeMonthlyAnalytics,
  fmtRp,
  readAkuns,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib";

function fmtShort(v: number): string {
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}M`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}jt`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}rb`;
  return `${sign}${Math.round(abs)}`;
}

function GroupedBarSvg({
  labels,
  aVals,
  bVals,
  aColor = "#4ade80",
  bColor = "#f87171",
}: {
  labels: string[];
  aVals: number[];
  bVals: number[];
  aColor?: string;
  bColor?: string;
}) {
  const maxVal = Math.max(1, ...aVals.map(Math.abs), ...bVals.map(Math.abs));
  const w = Math.max(460, labels.length * 58 + 50);
  const h = 180;
  const padL = 44;
  const padB = 26;
  const padT = 14;
  const plotH = h - padT - padB;
  const slotW = (w - padL - 12) / Math.max(1, labels.length);
  const barW = Math.min(18, slotW * 0.36);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", minWidth: `${w}px`, height: `${h}px` }}>
      {[0, 0.5, 1].map((t, i) => {
        const y = padT + plotH * (1 - t);
        return (
          <g key={i}>
            <line x1={padL} y1={y} x2={w - 8} y2={y} stroke="var(--border)" strokeDasharray="3 3" />
            <text x={padL - 5} y={y + 3} textAnchor="end" fill="var(--muted)" fontSize="9.5">
              {fmtShort(maxVal * t)}
            </text>
          </g>
        );
      })}
      {labels.map((lbl, i) => {
        const cx = padL + i * slotW + slotW / 2;
        const hA = (Math.max(0, aVals[i]) / maxVal) * plotH;
        const hB = (Math.max(0, bVals[i]) / maxVal) * plotH;
        return (
          <g key={lbl + i}>
            <rect x={cx - barW - 1} y={padT + plotH - hA} width={barW} height={hA} rx={3} fill={aColor} />
            <rect x={cx + 1} y={padT + plotH - hB} width={barW} height={hB} rx={3} fill={bColor} />
            <text x={cx} y={h - 8} textAnchor="middle" fill="var(--muted)" fontSize="9.5">
              {lbl}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChartSvg({
  labels,
  vals,
  color = "#22d3ee",
}: {
  labels: string[];
  vals: number[];
  color?: string;
}) {
  const minV = Math.min(0, ...vals);
  const maxV = Math.max(1, ...vals);
  const span = maxV - minV || 1;
  const w = Math.max(460, labels.length * 58 + 50);
  const h = 180;
  const padL = 46;
  const padB = 26;
  const padT = 16;
  const plotH = h - padT - padB;
  const stepX = (w - padL - 20) / Math.max(1, labels.length - 1);

  const pts = vals.map((v, i) => ({
    x: labels.length === 1 ? padL + (w - padL) / 2 : padL + i * stepX,
    y: padT + plotH - ((v - minV) / span) * plotH,
    v,
  }));
  const poly = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const zeroY = padT + plotH - ((0 - minV) / span) * plotH;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", minWidth: `${w}px`, height: `${h}px` }}>
      <line x1={padL} y1={zeroY} x2={w - 8} y2={zeroY} stroke="var(--border)" />
      <text x={padL - 5} y={padT + 4} textAnchor="end" fill="var(--muted)" fontSize="9.5">{fmtShort(maxV)}</text>
      <text x={padL - 5} y={padT + plotH} textAnchor="end" fill="var(--muted)" fontSize="9.5">{fmtShort(minV)}</text>
      {pts.length > 1 && <polyline fill="none" stroke={color} strokeWidth="2.5" points={poly} />}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3.5} fill={p.v >= 0 ? color : "#f87171"} />
          <text x={p.x} y={h - 8} textAnchor="middle" fill="var(--muted)" fontSize="9.5">
            {labels[i]}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function AnalitikPage() {
  const [period, setPeriod] = useState<string>("12");
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    refresh();
    setOasWindowFn("renderAnalitik", refresh as (...args: never[]) => unknown);
  }, [refresh]);

  const data = useMemo(() => {
    void tick;
    const limit = period === "all" ? "all" : parseInt(period, 10) || 12;
    return computeMonthlyAnalytics(readJurnalEntries(), readAkuns(), limit);
  }, [period, tick]);

  const labels = data.months.map((m) => m.label);
  const maxBeban = Math.max(1, ...data.bebanBreakdown.map((b) => b.nilai));
  const maxAkun = Math.max(1, ...data.topAkuns.map((a) => a.nilai));

  return (
    <div className="page" id="page-analitik" data-react-managed="1">
      <div className="section-header" style={{ flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div className="section-title">
            <BarChart3 size={15} style={{ verticalAlign: "-2px", marginRight: "6px" }} />
            Analitik &amp; Tren Bisnis
          </div>
          <div className="section-sub">
            Pendapatan · Laba · Arus Kas · Rasio · Proyeksi · Perbandingan Periode
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "7px 12px", color: "var(--text)", fontSize: "13px", fontWeight: 600 }}
          >
            <option value="3">3 Bulan Terakhir</option>
            <option value="6">6 Bulan Terakhir</option>
            <option value="12">12 Bulan Terakhir</option>
            <option value="all">Semua Waktu</option>
          </select>
          <button className="btn btn-ghost btn-sm" type="button" onClick={refresh} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: "10px", marginBottom: "16px" }}>
        {[
          { label: "Total Pendapatan", val: fmtRp(data.totalPendapatan), color: "var(--accent2)" },
          { label: "Total Beban & HPP", val: fmtRp(data.totalBeban), color: "var(--accent3)" },
          { label: "Total Laba Bersih", val: fmtRp(data.totalLaba), color: data.totalLaba >= 0 ? "var(--accent)" : "var(--danger)" },
          { label: "Arus Kas Bersih", val: fmtRp(data.totalArusKas), color: data.totalArusKas >= 0 ? "var(--accent)" : "var(--danger)" },
          { label: "Margin Bersih Rata-rata", val: `${data.avgMargin.toFixed(1)}%`, color: "var(--text)" },
        ].map((k) => (
          <div key={k.label} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px 14px" }}>
            <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 600 }}>{k.label}</div>
            <div style={{ fontSize: "15.5px", fontWeight: 700, fontFamily: "var(--mono)", color: k.color, marginTop: "4px" }}>{k.val}</div>
          </div>
        ))}
      </div>

      {!data.months.length ? (
        <div className="table-card" style={{ padding: "36px 20px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
          Belum ada data jurnal untuk dianalisis. Input transaksi terlebih dahulu agar grafik &amp; tren muncul otomatis.
        </div>
      ) : (
        <>
          {/* Row 1: Pendapatan vs Beban + Tren Laba */}
          <div style={{ gridTemplateColumns: "1fr 1fr", marginBottom: "16px" }} className="kalk-grid">
            <div className="table-card">
              <div className="table-header">
                <div className="table-title"><BarChart3 size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Pendapatan vs Beban per Bulan</div>
                <div style={{ fontSize: "11px", color: "var(--muted)", display: "flex", gap: "10px" }}>
                  <span style={{ color: "#4ade80" }}>● Pendapatan</span>
                  <span style={{ color: "#f87171" }}>● Beban</span>
                </div>
              </div>
              <div style={{ padding: "12px", overflowX: "auto" }}>
                <GroupedBarSvg
                  labels={labels}
                  aVals={data.months.map((m) => m.pendapatan)}
                  bVals={data.months.map((m) => m.beban + m.hpp)}
                />
              </div>
            </div>

            <div className="table-card">
              <div className="table-header">
                <div className="table-title"><TrendingUp size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Tren Laba Bersih</div>
              </div>
              <div style={{ padding: "12px", overflowX: "auto" }}>
                <LineChartSvg labels={labels} vals={data.months.map((m) => m.labaBersih)} color="#4ade80" />
              </div>
            </div>
          </div>

          {/* Row 2: Arus Kas + Komposisi Beban */}
          <div style={{ gridTemplateColumns: "1fr 1fr", marginBottom: "16px" }} className="kalk-grid">
            <div className="table-card">
              <div className="table-header">
                <div className="table-title"><TrendingUp size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Arus Kas Kumulatif</div>
              </div>
              <div style={{ padding: "12px", overflowX: "auto" }}>
                <LineChartSvg labels={labels} vals={data.months.map((m) => m.kasKumulatif)} color="#22d3ee" />
              </div>
            </div>

            <div className="table-card">
              <div className="table-header">
                <div className="table-title"><PieChart size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Komposisi Beban Terbesar</div>
              </div>
              <div style={{ padding: "14px", display: "grid", gap: "8px" }}>
                {!data.bebanBreakdown.length ? (
                  <div style={{ fontSize: "12px", color: "var(--muted)" }}>Belum ada beban.</div>
                ) : (
                  data.bebanBreakdown.map((b) => (
                    <div key={b.kode}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                        <span>{b.nama}</span>
                        <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{fmtRp(b.nilai)}</span>
                      </div>
                      <div style={{ height: "6px", borderRadius: "4px", background: "var(--surface2)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.max(4, (b.nilai / maxBeban) * 100)}%`, background: "var(--accent3)" }} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Row 3: Rasio Keuangan + Proyeksi 3 Bulan */}
          <div style={{ gridTemplateColumns: "1fr 1fr", marginBottom: "16px" }} className="kalk-grid">
            <div className="table-card">
              <div className="table-header">
                <div className="table-title"><Scale size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Rasio Keuangan Otomatis</div>
              </div>
              <div style={{ padding: "14px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                {[
                  { label: "Current Ratio", val: `${data.rasio.currentRatio.toFixed(2)}x` },
                  { label: "Debt to Equity", val: `${data.rasio.debtToEquity.toFixed(2)}x` },
                  { label: "Gross Margin", val: `${data.rasio.grossMargin.toFixed(1)}%` },
                  { label: "Net Margin", val: `${data.rasio.netMargin.toFixed(1)}%` },
                  { label: "Return on Assets (ROA)", val: `${data.rasio.roa.toFixed(1)}%` },
                ].map((r) => (
                  <div key={r.label} style={{ background: "var(--surface2)", borderRadius: "8px", padding: "10px 12px" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted)" }}>{r.label}</div>
                    <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: "15px", marginTop: "3px" }}>{r.val}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="table-card">
              <div className="table-header">
                <div className="table-title"><TrendingUp size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Proyeksi 3 Bulan ke Depan</div>
              </div>
              <div style={{ padding: "14px", display: "grid", gap: "8px" }}>
                {data.proyeksi.map((p) => (
                  <div key={p.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 12px", background: "var(--surface2)", borderRadius: "8px", fontSize: "12.5px" }}>
                    <b>{p.label}</b>
                    <div style={{ textAlign: "right", fontFamily: "var(--mono)" }}>
                      <div style={{ color: "var(--accent2)" }}>Pend: {fmtRp(p.pendapatan)}</div>
                      <div style={{ fontSize: "11.5px", color: p.laba >= 0 ? "var(--accent)" : "var(--danger)" }}>Est. Laba: {fmtRp(p.laba)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Top Akun + Perbandingan & Heatmap */}
          <div style={{ gridTemplateColumns: "1fr 1fr", marginBottom: "16px" }} className="kalk-grid">
            <div className="table-card">
              <div className="table-header">
                <div className="table-title"><Trophy size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Top 8 Akun Terbesar (Saldo)</div>
              </div>
              <div style={{ padding: "14px", display: "grid", gap: "8px" }}>
                {data.topAkuns.map((a) => (
                  <div key={a.kode}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "3px" }}>
                      <span><b style={{ fontFamily: "var(--mono)" }}>{a.kode}</b> {a.nama}</span>
                      <span style={{ fontFamily: "var(--mono)", fontWeight: 600 }}>{fmtRp(a.nilai)}</span>
                    </div>
                    <div style={{ height: "6px", borderRadius: "4px", background: "var(--surface2)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.max(4, (a.nilai / maxAkun) * 100)}%`, background: "var(--accent2)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="table-card">
              <div className="table-header">
                <div className="table-title"><Calendar size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Perbandingan &amp; Aktivitas</div>
              </div>
              <div style={{ padding: "14px" }}>
                {data.compare ? (
                  <div style={{ display: "grid", gap: "6px", marginBottom: "14px", fontSize: "12.5px" }}>
                    <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700 }}>
                      {data.compare.currLabel} vs {data.compare.prevLabel}
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Pendapatan</span>
                      <span style={{ fontFamily: "var(--mono)" }}>{fmtRp(data.compare.pendCurr)} vs {fmtRp(data.compare.pendPrev)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Laba Bersih</span>
                      <span style={{ fontFamily: "var(--mono)", fontWeight: 700 }}>{fmtRp(data.compare.labaCurr)} vs {fmtRp(data.compare.labaPrev)}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginBottom: "12px" }}>Butuh minimal 2 bulan data untuk perbandingan periode.</div>
                )}
                <div style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 700, marginBottom: "6px" }}>Aktivitas Jurnal Terbaru (per hari)</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {data.heatmap.map((h) => (
                    <div
                      key={h.day}
                      title={`${h.day}: ${h.count} jurnal`}
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "4px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontFamily: "var(--mono)",
                        background: h.count >= 5 ? "rgba(74,222,128,0.55)" : h.count >= 2 ? "rgba(74,222,128,0.28)" : "rgba(74,222,128,0.12)",
                      }}
                    >
                      {h.count}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Tabel Ringkasan Bulanan */}
          <div className="table-card">
            <div className="table-header">
              <div className="table-title"><ClipboardList size={14} style={{ verticalAlign: "-2px", marginRight: "5px" }} /> Tabel Ringkasan Per Bulan</div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr><th>Bulan</th><th>Pendapatan</th><th>HPP</th><th>Laba Kotor</th><th>Beban</th><th>Laba Bersih</th><th>Kas Masuk</th><th>Kas Keluar</th><th>Arus Kas</th><th>Margin%</th></tr>
                </thead>
                <tbody>
                  {data.months.map((m) => (
                    <tr key={m.ym}>
                      <td style={{ fontWeight: 600, whiteSpace: "nowrap" }}>{m.label}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>{fmtRp(m.pendapatan)}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>{fmtRp(m.hpp)}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>{fmtRp(m.labaKotor)}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>{fmtRp(m.beban)}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px", fontWeight: 700, color: m.labaBersih >= 0 ? "var(--accent)" : "var(--danger)" }}>{fmtRp(m.labaBersih)}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>{fmtRp(m.kasMasuk)}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>{fmtRp(m.kasKeluar)}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px", color: m.arusKas >= 0 ? "var(--accent2)" : "var(--danger)" }}>{fmtRp(m.arusKas)}</td>
                      <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>{m.marginBersih.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
