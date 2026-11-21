"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AreaChart, Printer } from "lucide-react";
import {
  computePerubahanEkuitas,
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
