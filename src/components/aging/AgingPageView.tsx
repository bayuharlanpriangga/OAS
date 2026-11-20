"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Download, Printer } from "lucide-react";
import {
  AGING_BUCKETS,
  agingCetakHtml,
  agingCsv,
  agingHariIni,
  billUntukAging,
  hitungAging,
  readBillList,
  readCurrentCompany,
  readInvoiceList,
  readJurnalEntries,
  readKontakList,
  setOasWindowFn,
} from "@/lib";
import type { AgingDokumenItem, AgingResult } from "@/types";
import { BUCKET_LABELS } from "./constants";
import { fmtRpDash } from "./fmtRpDash";
import { fmtUmur } from "./fmtUmur";

export interface AgingPageViewProps {
  jenis: "piutang" | "hutang";
}

export function AgingPageView({ jenis }: AgingPageViewProps) {
  const isHutang = jenis === "hutang";
  const [acuan, setAcuan] = useState<string>("");
  const [tick, setTick] = useState(0);
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  const hasil: AgingResult = useMemo(() => {
    void tick;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(acuan)) {
      return {
        tanggalAcuan: "",
        perKontak: [],
        total: { lancar: 0, b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 },
        tidakValid: [],
      };
    }
    if (isHutang) {
      const sumber = billUntukAging(
        readBillList(),
        readJurnalEntries(),
        readKontakList()
      );
      return hitungAging(sumber, acuan);
    }
    return hitungAging(readInvoiceList(), acuan);
  }, [acuan, isHutang, tick]);

  const handleExportCsv = useCallback(() => {
    const tgl = /^\d{4}-\d{2}-\d{2}$/.test(acuan) ? acuan : agingHariIni();
    const res = isHutang
      ? hitungAging(
          billUntukAging(readBillList(), readJurnalEntries(), readKontakList()),
          tgl
        )
      : hitungAging(readInvoiceList(), tgl);
    const csv = agingCsv(res, isHutang ? "Supplier" : "Pelanggan");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${isHutang ? "umur-hutang" : "umur-piutang"}-${res.tanggalAcuan}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }, [acuan, isHutang]);

  const handleCetak = useCallback(() => {
    const tgl = /^\d{4}-\d{2}-\d{2}$/.test(acuan) ? acuan : agingHariIni();
    const res = isHutang
      ? hitungAging(
          billUntukAging(readBillList(), readJurnalEntries(), readKontakList()),
          tgl
        )
      : hitungAging(readInvoiceList(), tgl);
    const namaPerusahaan = readCurrentCompany()?.name || "";
    const html = agingCetakHtml(res, {
      judul: isHutang ? "Laporan Umur Hutang" : "Laporan Umur Piutang",
      kolomKontak: isHutang ? "Supplier" : "Pelanggan",
      namaPerusahaan,
    });
    const w = window.open("", "_blank");
    if (!w) {
      const win = window as unknown as { showAlert?: (msg: string) => void };
      win.showAlert?.(
        "⚠️ Popup diblokir browser. Izinkan popup untuk mencetak."
      );
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  }, [acuan, isHutang]);

  useEffect(() => {
    setAcuan((prev) => prev || agingHariIni());
    if (isHutang) {
      setOasWindowFn("renderAgingHutang", refresh as (...args: never[]) => unknown);
      setOasWindowFn(
        "exportAgingHutangCSV",
        handleExportCsv as (...args: never[]) => unknown
      );
      setOasWindowFn(
        "cetakAgingHutang",
        handleCetak as (...args: never[]) => unknown
      );
    } else {
      setOasWindowFn("renderAgingPiutang", refresh as (...args: never[]) => unknown);
      setOasWindowFn(
        "exportAgingPiutangCSV",
        handleExportCsv as (...args: never[]) => unknown
      );
      setOasWindowFn(
        "cetakAgingPiutang",
        handleCetak as (...args: never[]) => unknown
      );
    }
  }, [handleCetak, handleExportCsv, isHutang, refresh]);

  const t = hasil.total;
  const lewat = t.b0_30 + t.b31_60 + t.b61_90 + t.b90plus;
  const kolomKontak = isHutang ? "Supplier" : "Pelanggan";
  const labelDok = isHutang ? "tagihan" : "invoice";

  return (
    <div
      className="page"
      id={isHutang ? "page-umur-hutang" : "page-umur-piutang"}
      data-react-managed="1"
    >
      <div className="section-header">
        <div>
          <div className="section-title">
            <Clock
              size={15}
              style={{ verticalAlign: "-2px", marginRight: "6px" }}
            />
            {isHutang ? "Umur Hutang" : "Umur Piutang"}
          </div>
          <div className="section-sub">
            {isHutang
              ? "Utang usaha belum lunas per supplier"
              : "Piutang belum lunas per pelanggan"}
          </div>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: "16px" }}>
        <div className="aging-toolbar">
          <label className="aging-acuan-wrap">
            Per
            <input
              type="date"
              id={isHutang ? "aging-hutang-acuan" : "aging-acuan"}
              value={acuan}
              onChange={(e) => {
                setAcuan(e.target.value);
                setExpanded({});
              }}
              aria-label="Per tanggal"
            />
          </label>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={handleExportCsv}
          >
            <Download size={13} style={{ verticalAlign: "-2px" }} /> CSV
          </button>
          <button
            className="btn btn-ghost btn-sm"
            type="button"
            onClick={handleCetak}
          >
            <Printer size={13} style={{ verticalAlign: "-2px" }} /> Cetak
          </button>
        </div>

        <div id={isHutang ? "aging-hutang-body" : "aging-piutang-body"}>
          {!hasil.perKontak.length ? (
            <div className="aging-empty">
              Tidak ada {isHutang ? "hutang" : "piutang"} belum lunas
              {hasil.tanggalAcuan ? ` pada tanggal ${hasil.tanggalAcuan}` : ""}.
              {hasil.tidakValid.length > 0 && (
                <div className="aging-warn" style={{ marginTop: "10px" }}>
                  ⚠️ {hasil.tidakValid.length} {labelDok} dilewati karena
                  tanggal jatuh tempo tidak valid.
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="aging-summary">
                <div className="aging-sum-card">
                  <div className="aging-sum-lbl">
                    Total {isHutang ? "Hutang" : "Piutang"}
                  </div>
                  <div className="aging-sum-val">{fmtRpDash(t.total)}</div>
                </div>
                <div className="aging-sum-card">
                  <div className="aging-sum-lbl">Belum Jatuh Tempo</div>
                  <div className="aging-sum-val">{fmtRpDash(t.lancar)}</div>
                </div>
                <div className="aging-sum-card">
                  <div className="aging-sum-lbl">Lewat Jatuh Tempo</div>
                  <div
                    className={`aging-sum-val${lewat > 0 ? " is-warn" : ""}`}
                  >
                    {fmtRpDash(lewat)}
                  </div>
                </div>
                <div className="aging-sum-card">
                  <div className="aging-sum-lbl">&gt; 90 Hari</div>
                  <div
                    className={`aging-sum-val${t.b90plus > 0 ? " is-danger" : ""}`}
                  >
                    {fmtRpDash(t.b90plus)}
                  </div>
                </div>
              </div>

              {hasil.tidakValid.length > 0 && (
                <div className="aging-warn">
                  ⚠️ {hasil.tidakValid.length} {labelDok} dilewati karena
                  tanggal jatuh tempo tidak valid.
                </div>
              )}

              {/* Desktop table */}
              <div className="table-scroll aging-desktop">
                <table className="aging-table">
                  <thead>
                    <tr>
                      <th>{kolomKontak}</th>
                      {AGING_BUCKETS.map((b) => (
                        <th key={b} className="r">
                          {BUCKET_LABELS[b]}
                        </th>
                      ))}
                      <th className="r">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hasil.perKontak.map((k, idx) => {
                      const open = Boolean(expanded[idx]);
                      return (
                        <Fragment key={k.kontak + idx}>
                          <tr
                            className={`aging-row${open ? " is-open" : ""}`}
                            onClick={() =>
                              setExpanded((prev) => ({
                                ...prev,
                                [idx]: !prev[idx],
                              }))
                            }
                          >
                            <td>
                              <span className="aging-caret">▸</span>
                              {k.kontak}
                              <span className="aging-cnt">
                                {k.dokumen.length}
                              </span>
                            </td>
                            {AGING_BUCKETS.map((b) => (
                              <td
                                key={b}
                                className={`r${b === "b90plus" && k[b] > 0 ? " is-danger" : ""}`}
                              >
                                {fmtRpDash(k[b])}
                              </td>
                            ))}
                            <td className="r">
                              <b>{fmtRpDash(k.total)}</b>
                            </td>
                          </tr>
                          {open && (
                            <tr className="aging-det-row is-open">
                              <td colSpan={7}>
                                <div className="aging-det-list">
                                  {k.dokumen.map((d: AgingDokumenItem, j: number) => (
                                    <div key={j} className="aging-det-item">
                                      <span className="aging-det-no">
                                        {d.no || "—"}
                                      </span>
                                      <span className="aging-det-jt">
                                        JT {d.jatuhTempo || "—"}
                                      </span>
                                      <span
                                        className={`aging-det-umur${d.umur > 90 ? " is-danger" : d.umur > 0 ? " is-warn" : ""}`}
                                      >
                                        {fmtUmur(d.umur)}
                                      </span>
                                      <span className="aging-det-sisa">
                                        {fmtRpDash(d.sisa)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="aging-foot">
                      <td>TOTAL</td>
                      {AGING_BUCKETS.map((b) => (
                        <td
                          key={b}
                          className={`r${b === "b90plus" && t[b] > 0 ? " is-danger" : ""}`}
                        >
                          {fmtRpDash(t[b])}
                        </td>
                      ))}
                      <td className="r">{fmtRpDash(t.total)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Mobile cards */}
              <div className="aging-mobile">
                {hasil.perKontak.map((k, idx) => (
                  <div key={k.kontak + idx} className="aging-card">
                    <div className="aging-card-head">
                      <div>
                        <div className="aging-card-name">{k.kontak}</div>
                        <div className="aging-card-sub">
                          {k.dokumen.length} {labelDok} belum lunas
                        </div>
                      </div>
                      <div className="aging-card-total">
                        {fmtRpDash(k.total)}
                      </div>
                    </div>
                    <div className="aging-chips">
                      {AGING_BUCKETS.filter((b) => k[b] > 0).map((b) => (
                        <span
                          key={b}
                          className={`aging-chip${b === "b90plus" ? " is-danger" : b !== "lancar" ? " is-warn" : ""}`}
                        >
                          {BUCKET_LABELS[b]}: <b>{fmtRpDash(k[b])}</b>
                        </span>
                      ))}
                    </div>
                    <div className="aging-det-list">
                      {k.dokumen.map((d: AgingDokumenItem, j: number) => (
                        <div key={j} className="aging-det-item">
                          <span className="aging-det-no">{d.no || "—"}</span>
                          <span className="aging-det-jt">
                            JT {d.jatuhTempo || "—"}
                          </span>
                          <span
                            className={`aging-det-umur${d.umur > 90 ? " is-danger" : d.umur > 0 ? " is-warn" : ""}`}
                          >
                            {fmtUmur(d.umur)}
                          </span>
                          <span className="aging-det-sisa">
                            {fmtRpDash(d.sisa)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
