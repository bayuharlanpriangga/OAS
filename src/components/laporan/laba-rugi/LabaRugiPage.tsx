"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fmtRp } from "@/lib/shared/format";
import {
  computeLabaRugi,
  getFilteredSaldoPure,
  type ReportPeriodVal,
} from "@/lib/laporan";
import {
  callOasGlobal,
  readAkuns,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";
import type { Akun, JurnalEntry } from "@/types";
import { PeriodSelect } from "../shared/PeriodSelect";

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

      <PeriodSelect value={period} onChange={setPeriod} />

      <div id="laba-rugi-content">
        {renderSection("Pendapatan", report.pRows, report.totalPendapatan, "var(--text)")}
        {renderSection("HPP", report.hRows, report.totalHpp, "var(--red)")}
        <div className="table-card" style={{ marginBottom: "16px" }}>
          <table>
            <tbody>
              <tr className="total-row">
                <td>Laba Kotor</td>
                <td
                  className="num"
                  style={{ textAlign: "right", color: "var(--text)" }}
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
                <td>Laba bersih</td>
                <td
                  className="num"
                  style={{
                    textAlign: "right",
                    color:
                      report.labaBersih > 0
                        ? "var(--green)"
                        : report.labaBersih < 0
                          ? "var(--red)"
                          : "var(--text)",
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
