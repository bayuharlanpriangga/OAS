"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fmtRp } from "@/lib/format";
import {
  computeNeracaSaldo,
  getFilteredSaldoPure,
  type ReportPeriodVal,
} from "@/lib/laporan";
import {
  readAkuns,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/legacy-store";
import type { Akun, JurnalEntry } from "@/types";
import { PeriodSelect } from "./PeriodSelect";

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
