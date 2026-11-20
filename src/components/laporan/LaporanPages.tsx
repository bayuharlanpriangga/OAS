"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AreaChart,
  Banknote,
  Factory,
  Printer,
  Settings,
} from "lucide-react";
import { fmtRp } from "@/lib/format";
import {
  computeArusKas,
  computeLabaRugi,
  computeNeraca,
  computeNeracaSaldo,
  computePerubahanEkuitas,
  getFilteredSaldoPure,
  printReportHtml,
  REPORT_PERIOD_OPTIONS,
  type ReportPeriodVal,
} from "@/lib/laporan";
import { callOasGlobal } from "@/lib/legacy-actions";
import {
  readAkuns,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/legacy-store";
import type { Akun, JurnalEntry } from "@/types";

function fmtSignedRp(v: number): { text: string; negative: boolean } {
  const f = "Rp " + Math.abs(Math.round(v)).toLocaleString("id-ID");
  return v < 0 ? { text: `(${f})`, negative: true } : { text: f, negative: false };
}

function PeriodSelect({
  id,
  value,
  onChange,
}: {
  id?: string;
  value: ReportPeriodVal;
  onChange: (val: ReportPeriodVal) => void;
}) {
  return (
    <div className="filter-bar report-period-filter" style={{ marginBottom: "16px" }}>
      <select
        id={id}
        className="report-period-sel"
        value={value}
        onChange={(e) => onChange(e.target.value as ReportPeriodVal)}
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "7px 12px",
          color: "var(--text)",
          fontSize: "13px",
          fontFamily: "var(--sans)",
        }}
      >
        {REPORT_PERIOD_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 1. NERACA SALDO
// ═══════════════════════════════════════════════════════════════════
export function NeracaSaldoPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [period, setPeriod] = useState<ReportPeriodVal>("all");

  const syncFromStore = useCallback((nextPeriod?: string) => {
    setEntries([...readJurnalEntries()]);
    setAkuns([...readAkuns()]);
    if (nextPeriod) setPeriod(nextPeriod as ReportPeriodVal);
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderNeracaSaldo", () => syncFromStore("all"));
    setOasWindowFn(
      "renderNeracaSaldoFiltered",
      ((p?: string) => syncFromStore(p || "all")) as (...args: never[]) => unknown
    );
  }, [syncFromStore]);

  const report = useMemo(() => {
    const saldoMap = getFilteredSaldoPure(entries, period);
    return computeNeracaSaldo(akuns, saldoMap);
  }, [entries, akuns, period]);

  return (
    <div className="page" id="page-neraca-saldo" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Neraca Saldo</div>
          <div className="section-sub">Saldo semua akun</div>
        </div>
      </div>

      <PeriodSelect value={period} onChange={setPeriod} />

      <div className="table-card">
        <div className="table-scroll">
          <table style={{ minWidth: "560px", width: "100%" }}>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Nama Akun</th>
                <th>Tipe</th>
                <th style={{ textAlign: "right" }}>Debit</th>
                <th style={{ textAlign: "right", paddingRight: "20px" }}>
                  Kredit
                </th>
              </tr>
            </thead>
            <tbody id="neraca-saldo-body">
              {report.rows.map((r) => (
                <tr key={r.kode}>
                  <td style={{ fontFamily: "var(--mono)", fontSize: "12px" }}>
                    {r.kode}
                  </td>
                  <td>{r.nama}</td>
                  <td>
                    <span className="badge badge-gray">{r.tipe}</span>
                  </td>
                  <td style={{ textAlign: "right" }} className="debit">
                    {r.debit ? fmtRp(r.debit) : ""}
                  </td>
                  <td
                    style={{ textAlign: "right", paddingRight: "20px" }}
                    className="kredit"
                  >
                    {r.kredit ? fmtRp(r.kredit) : ""}
                  </td>
                </tr>
              ))}
              <tr className="total-row">
                <td colSpan={3}>TOTAL</td>
                <td style={{ textAlign: "right", fontFamily: "var(--mono)" }}>
                  {fmtRp(report.totalDebit)}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    paddingRight: "20px",
                    fontFamily: "var(--mono)",
                  }}
                >
                  {fmtRp(report.totalKredit)}
                </td>
              </tr>
              <tr>
                <td
                  colSpan={5}
                  style={{
                    textAlign: "right",
                    padding: "8px 20px 4px",
                    fontSize: "12px",
                    fontFamily: "var(--mono)",
                    color: report.balanced ? "var(--accent)" : "var(--red)",
                  }}
                >
                  {report.balanced
                    ? "✓ Neraca Saldo Balance"
                    : `✗ Tidak Balance — selisih: ${fmtRp(report.selisih)}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 2. LABA RUGI
// ═══════════════════════════════════════════════════════════════════
export function LabaRugiPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [period, setPeriod] = useState<ReportPeriodVal>("all");

  const syncFromStore = useCallback((nextPeriod?: string) => {
    setEntries([...readJurnalEntries()]);
    setAkuns([...readAkuns()]);
    if (nextPeriod) setPeriod(nextPeriod as ReportPeriodVal);
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderLabaRugi", () => syncFromStore("all"));
    setOasWindowFn(
      "renderLabaRugiFiltered",
      ((p?: string) => syncFromStore(p || "all")) as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "renderReportWithPeriod",
      ((pageId: string, periodVal: string) => {
        if (pageId === "laba-rugi") {
          callOasGlobal("renderLabaRugiFiltered", periodVal);
        } else if (pageId === "neraca-saldo") {
          callOasGlobal("renderNeracaSaldoFiltered", periodVal);
        }
      }) as (...args: never[]) => unknown
    );
  }, [syncFromStore]);

  const report = useMemo(() => {
    const saldoMap = getFilteredSaldoPure(entries, period, {
      tanpaPenutup: true,
    });
    return computeLabaRugi(akuns, saldoMap);
  }, [entries, akuns, period]);

  const renderSection = (
    title: string,
    rows: Array<{ kode: string; nama: string; nilai: number }>,
    total: number,
    color: string
  ) => (
    <div className="table-card" style={{ marginBottom: "16px" }}>
      <div className="table-header">
        <div className="table-title">{title}</div>
      </div>
      <table>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kode}>
              <td style={{ paddingLeft: "24px" }}>{r.nama}</td>
              <td className="num" style={{ textAlign: "right", color }}>
                {fmtRp(r.nilai)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td>Total {title}</td>
            <td className="num" style={{ textAlign: "right" }}>
              {fmtRp(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="page" id="page-laba-rugi" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Laporan Laba Rugi</div>
          <div className="section-sub">
            Pendapatan dan beban periode berjalan
          </div>
        </div>
      </div>

      <PeriodSelect value={period} onChange={setPeriod} />

      <div id="laba-rugi-content">
        {renderSection("Pendapatan", report.pRows, report.totalPendapatan, "var(--accent)")}
        {renderSection("HPP", report.hRows, report.totalHpp, "var(--red)")}
        <div className="table-card" style={{ marginBottom: "16px" }}>
          <table>
            <tbody>
              <tr className="total-row">
                <td>Laba Kotor</td>
                <td
                  className="num"
                  style={{ textAlign: "right", color: "var(--accent2)" }}
                >
                  {fmtRp(report.labaKotor)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        {renderSection(
          "Beban Operasional",
          report.bRows,
          report.totalBeban,
          "var(--red)"
        )}
        <div className="table-card">
          <table>
            <tbody>
              <tr className="total-row">
                <td>LABA BERSIH</td>
                <td
                  className="num"
                  style={{
                    textAlign: "right",
                    color:
                      report.labaBersih >= 0 ? "var(--accent)" : "var(--red)",
                  }}
                >
                  {fmtRp(report.labaBersih)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 3. NERACA (BALANCE SHEET)
// ═══════════════════════════════════════════════════════════════════
export function NeracaPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);

  const syncFromStore = useCallback(() => {
    setEntries([...readJurnalEntries()]);
    setAkuns([...readAkuns()]);
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderNeraca", syncFromStore);
  }, [syncFromStore]);

  const report = useMemo(
    () => computeNeraca(entries, akuns),
    [entries, akuns]
  );

  const renderSection = (
    title: string,
    rows: Array<{ kode: string; nama: string; nilai: number; isPrive?: boolean }>,
    total: number,
    color: string,
    includeLabaBerjalan = false
  ) => (
    <div className="table-card" style={{ marginBottom: "16px" }}>
      <div className="table-header">
        <div className="table-title">{title}</div>
      </div>
      <table>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kode}>
              <td style={{ paddingLeft: "24px" }}>
                {r.nama}
                {r.isPrive ? (
                  <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                    {" "}
                    (pengurang)
                  </span>
                ) : null}
              </td>
              <td
                className="num"
                style={{
                  textAlign: "right",
                  color: r.isPrive ? "var(--red)" : color,
                }}
              >
                {r.isPrive ? `(${fmtRp(r.nilai)})` : fmtRp(r.nilai)}
              </td>
            </tr>
          ))}
          {includeLabaBerjalan ? (
            <tr>
              <td style={{ paddingLeft: "24px" }}>Laba Periode Berjalan</td>
              <td
                className="num"
                style={{ textAlign: "right", color: "var(--accent)" }}
              >
                {fmtRp(report.labaBersih)}
              </td>
            </tr>
          ) : null}
        </tbody>
        <tfoot>
          <tr className="total-row">
            <td>Total {title}</td>
            <td className="num" style={{ textAlign: "right" }}>
              {fmtRp(total)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );

  return (
    <div className="page" id="page-neraca" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Neraca (Balance Sheet)</div>
          <div className="section-sub">Posisi keuangan perusahaan</div>
        </div>
      </div>

      <div id="neraca-content">
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            {renderSection("Aset", report.asetRows, report.aset, "var(--accent)")}
          </div>
          <div>
            {renderSection(
              "Liabilitas",
              report.liabRows,
              report.liab,
              "var(--red)"
            )}
            {renderSection(
              "Ekuitas",
              report.ekRows,
              report.totalEkuitas,
              "var(--accent2)",
              true
            )}
            <div className="table-card">
              <table>
                <tbody>
                  <tr className="total-row">
                    <td>TOTAL LIAB + EKUITAS</td>
                    <td className="num" style={{ textAlign: "right" }}>
                      {fmtRp(report.liab + report.totalEkuitas)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div
          style={{
            fontSize: "12px",
            color: report.balanced ? "var(--accent)" : "var(--red)",
            marginTop: "8px",
            fontFamily: "var(--mono)",
          }}
        >
          {report.balanced
            ? "✓ Neraca Balance"
            : `✗ Neraca Tidak Balance — selisih: ${fmtRp(report.selisih)}`}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 4. ARUS KAS (PSAK 2)
// ═══════════════════════════════════════════════════════════════════
export function ArusKasPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [period, setPeriod] = useState<ReportPeriodVal>("all");
  const contentRef = useRef<HTMLDivElement | null>(null);

  const syncFromStore = useCallback(() => {
    setEntries([...readJurnalEntries()]);
    setAkuns([...readAkuns()]);
  }, []);

  const handlePrint = useCallback(() => {
    const html = contentRef.current?.innerHTML || "";
    if (!html.trim()) {
      callOasGlobal("showAlert", "Tidak ada data.");
      return;
    }
    printReportHtml(
      "Laporan Arus Kas",
      "Laporan Arus Kas · Metode Tidak Langsung (PSAK 2)",
      html
    );
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderArusKas", syncFromStore);
    setOasWindowFn("exportArusKasPDF", handlePrint);
  }, [syncFromStore, handlePrint]);

  const report = useMemo(() => {
    const saldoMap = getFilteredSaldoPure(entries, period, {
      tanpaPenutup: true,
    });
    return computeArusKas(akuns, saldoMap);
  }, [entries, akuns, period]);

  const renderSection = (
    Icon: typeof Settings,
    title: string,
    rows: Array<{ label: string; nilai: number }>,
    total: number
  ) => {
    const totalFmt = fmtSignedRp(total);
    return (
      <div className="table-card" style={{ marginBottom: "16px" }}>
        <div className="table-header">
          <div
            className="table-title"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <Icon size={15} /> {title}
          </div>
        </div>
        <table>
          <tbody>
            {rows.map((r) => {
              const f = fmtSignedRp(r.nilai);
              return (
                <tr key={r.label}>
                  <td
                    style={{
                      paddingLeft: "28px",
                      color: "var(--muted)",
                      fontSize: "13px",
                    }}
                  >
                    {r.label}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontSize: "13px",
                      color: f.negative ? "var(--red)" : undefined,
                    }}
                  >
                    {f.text}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="total-row">
              <td>Total {title}</td>
              <td
                style={{
                  textAlign: "right",
                  fontFamily: "var(--mono)",
                  color: total >= 0 ? "var(--accent)" : "var(--red)",
                }}
              >
                {totalFmt.text}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const kenaikanFmt = fmtSignedRp(report.kenaikan);
  const kasAkhirFmt = fmtSignedRp(report.kasAkhir);

  return (
    <div className="page" id="page-arus-kas" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Laporan Arus Kas</div>
          <div className="section-sub">Metode Tidak Langsung · PSAK 2</div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handlePrint}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Printer size={14} /> Cetak PDF
          </button>
        </div>
      </div>

      <PeriodSelect id="arus-kas-period" value={period} onChange={setPeriod} />

      <div id="arus-kas-content" ref={contentRef}>
        {renderSection(
          Settings,
          "Aktivitas Operasi",
          report.operasiRows,
          report.totalOperasi
        )}
        {renderSection(
          Factory,
          "Aktivitas Investasi",
          report.investasiRows,
          report.totalInvestasi
        )}
        {renderSection(
          Banknote,
          "Aktivitas Pendanaan",
          report.pendanaanRows,
          report.totalPendanaan
        )}

        <div className="table-card">
          <table>
            <tbody>
              <tr>
                <td
                  style={{
                    color: "var(--muted)",
                    fontSize: "13px",
                    paddingLeft: "16px",
                  }}
                >
                  Kenaikan (Penurunan) Kas Bersih
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                    color: kenaikanFmt.negative ? "var(--red)" : undefined,
                  }}
                >
                  {kenaikanFmt.text}
                </td>
              </tr>
              <tr className="total-row">
                <td>Saldo Kas &amp; Setara Kas Akhir Periode</td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    color: report.kasAkhir >= 0 ? "var(--accent)" : "var(--red)",
                  }}
                >
                  {kasAkhirFmt.text}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            background: "var(--surface2)",
            borderRadius: "10px",
            fontSize: "11px",
            color: "var(--muted)",
            lineHeight: 1.7,
          }}
        >
          <b>Catatan:</b> Laporan metode tidak langsung sesuai PSAK 2. Pastikan
          saldo awal semua akun sudah diisi.
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 5. PERUBAHAN EKUITAS (PSAK 1)
// ═══════════════════════════════════════════════════════════════════
export function PerubahanEkuitasPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);
  const [period, setPeriod] = useState<ReportPeriodVal>("all");
  const contentRef = useRef<HTMLDivElement | null>(null);

  const syncFromStore = useCallback(() => {
    setEntries([...readJurnalEntries()]);
    setAkuns([...readAkuns()]);
  }, []);

  const handlePrint = useCallback(() => {
    const html = contentRef.current?.innerHTML || "";
    if (!html.trim()) {
      callOasGlobal("showAlert", "Tidak ada data.");
      return;
    }
    printReportHtml(
      "Laporan Perubahan Ekuitas",
      "Laporan Perubahan Ekuitas (PSAK 1)",
      html
    );
  }, []);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn("renderPerubahanEkuitas", syncFromStore);
    setOasWindowFn("exportPerubahanEkuitasPDF", handlePrint);
  }, [syncFromStore, handlePrint]);

  const report = useMemo(() => {
    const saldoMap = getFilteredSaldoPure(entries, period, {
      tanpaPenutup: true,
    });
    return computePerubahanEkuitas(akuns, saldoMap);
  }, [entries, akuns, period]);

  const renderSignedCell = (v: number) => {
    const f = fmtSignedRp(v);
    return (
      <span style={f.negative ? { color: "var(--red)" } : undefined}>
        {f.text}
      </span>
    );
  };

  const totalFmt = fmtSignedRp(report.totalEkuitas);

  return (
    <div className="page" id="page-perubahan-ekuitas" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Laporan Perubahan Ekuitas</div>
          <div className="section-sub">Mutasi modal pemilik · PSAK 1</div>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={handlePrint}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <Printer size={14} /> Cetak PDF
          </button>
        </div>
      </div>

      <PeriodSelect id="pe-period" value={period} onChange={setPeriod} />

      <div id="pe-content" ref={contentRef}>
        <div className="table-card" style={{ marginBottom: "16px" }}>
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <AreaChart size={15} /> Perubahan Ekuitas Pemilik
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Keterangan</th>
                <th style={{ textAlign: "right" }}>Modal Disetor</th>
                <th style={{ textAlign: "right" }}>Laba Ditahan</th>
                <th style={{ textAlign: "right" }}>Total Ekuitas</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ color: "var(--muted)", fontSize: "13px" }}>
                  Saldo Awal Periode
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                  }}
                >
                  {renderSignedCell(report.modalDisetor)}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                  }}
                >
                  {renderSignedCell(report.labaDitahan)}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                  }}
                >
                  {renderSignedCell(report.ekuitasAwal)}
                </td>
              </tr>
              {report.modalDisetor ? (
                <tr>
                  <td
                    style={{
                      paddingLeft: "24px",
                      color: "var(--muted)",
                      fontSize: "13px",
                    }}
                  >
                    + Setoran Modal
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontSize: "13px",
                    }}
                  >
                    {renderSignedCell(report.modalDisetor)}
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontSize: "13px",
                    }}
                  >
                    —
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontSize: "13px",
                    }}
                  >
                    {renderSignedCell(report.modalDisetor)}
                  </td>
                </tr>
              ) : null}
              <tr>
                <td
                  style={{
                    paddingLeft: "24px",
                    color: "var(--muted)",
                    fontSize: "13px",
                  }}
                >
                  + Laba Bersih Periode
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                  }}
                >
                  —
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                  }}
                >
                  {renderSignedCell(report.labaBersih)}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    fontSize: "13px",
                  }}
                >
                  {renderSignedCell(report.labaBersih)}
                </td>
              </tr>
              {report.prive ? (
                <tr>
                  <td
                    style={{
                      paddingLeft: "24px",
                      color: "var(--muted)",
                      fontSize: "13px",
                    }}
                  >
                    - Prive / Pengambilan Pribadi
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontSize: "13px",
                    }}
                  >
                    —
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontSize: "13px",
                      color: "var(--red)",
                    }}
                  >
                    (Rp {Math.round(report.prive).toLocaleString("id-ID")})
                  </td>
                  <td
                    style={{
                      textAlign: "right",
                      fontFamily: "var(--mono)",
                      fontSize: "13px",
                      color: "var(--red)",
                    }}
                  >
                    (Rp {Math.round(report.prive).toLocaleString("id-ID")})
                  </td>
                </tr>
              ) : null}
            </tbody>
            <tfoot>
              <tr className="total-row">
                <td>TOTAL EKUITAS AKHIR PERIODE</td>
                <td style={{ textAlign: "right", fontFamily: "var(--mono)" }}>
                  —
                </td>
                <td style={{ textAlign: "right", fontFamily: "var(--mono)" }}>
                  —
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontFamily: "var(--mono)",
                    color:
                      report.totalEkuitas >= 0 ? "var(--accent)" : "var(--red)",
                  }}
                >
                  {totalFmt.text}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
