"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fmtRp } from "@/lib/shared/format";
import { computeNeraca } from "@/lib/laporan";
import {
  readAkuns,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";
import type { Akun, JurnalEntry } from "@/types";

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
                style={{
                  textAlign: "right",
                  color: report.labaBersih >= 0 ? "var(--green)" : "var(--red)",
                }}
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

      <div id="neraca-content">
        <div className="grid-2" style={{ alignItems: "start" }}>
          <div>
            {renderSection("Aset", report.asetRows, report.aset, "var(--text)")}
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
              "var(--text)",
              true
            )}
            <div className="table-card">
              <table>
                <tbody>
                  <tr className="total-row">
                    <td>Total liabilitas dan ekuitas</td>
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
            color: report.balanced ? "var(--green)" : "var(--red)",
            marginTop: "8px",
            fontFamily: "var(--mono)",
            fontWeight: 600,
          }}
        >
          {report.balanced
            ? "✓ Neraca seimbang"
            : `✗ Neraca belum seimbang · selisih: ${fmtRp(report.selisih)}`}
        </div>
      </div>
    </div>
  );
}
