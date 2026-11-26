"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Banknote, Factory, Printer, Settings } from "lucide-react";
import {
  computeArusKas,
  getFilteredSaldoPure,
  printReportHtml,
  type ReportPeriodVal,
} from "@/lib/laporan";
import {
  callOasGlobal,
  readAkuns,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";
import type { Akun, JurnalEntry } from "@/types";
import { fmtSignedRp } from "../shared/fmtSignedRp";
import { PeriodSelect } from "../shared/PeriodSelect";

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
                  fontVariantNumeric: "tabular-nums",
                  color: total >= 0 ? "var(--green)" : "var(--red)",
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
      <div className="section-header page-actions-only">
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={handlePrint}
          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
        >
          <Printer size={14} /> Cetak PDF
        </button>
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
                    fontVariantNumeric: "tabular-nums",
                    color: report.kasAkhir >= 0 ? "var(--green)" : "var(--red)",
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
