"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import {
  daftarKontakKartu,
  dokumenHutangKartu,
  KARTU_CFG,
  readBillList,
  readInvoiceList,
  readJurnalEntries,
  readKontakList,
  readPembayaranList,
  setOasWindowFn,
  susunKartuKontak,
} from "@/lib";
import type { KartuKontakJenis } from "@/lib";

function fmtRpDash(n: number): string {
  return n ? "Rp " + Math.round(n).toLocaleString("id-ID") : "—";
}

function KartuKontakView({ jenis }: { jenis: KartuKontakJenis }) {
  const cfg = KARTU_CFG[jenis];
  const isHutang = jenis === "hutang";
  const [selectedKontak, setSelectedKontak] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => {
    setTick((t) => t + 1);
  }, []);

  useEffect(() => {
    setOasWindowFn(
      isHutang ? "renderKartuHutang" : "renderKartuPiutang",
      refresh as (...args: never[]) => unknown
    );
  }, [isHutang, refresh]);

  const { daftarDok, kontakListNames, activeKontak, hasil } = useMemo(() => {
    void tick;
    const doks = isHutang
      ? dokumenHutangKartu(
          readBillList(),
          readJurnalEntries(),
          readKontakList()
        )
      : readInvoiceList();
    const names = daftarKontakKartu(doks);
    const chosen =
      selectedKontak && names.includes(selectedKontak)
        ? selectedKontak
        : names[0] || "";
    const res = chosen
      ? susunKartuKontak(doks, readPembayaranList(), jenis, chosen, {
          dari,
          sampai,
        })
      : null;
    return {
      daftarDok: doks,
      kontakListNames: names,
      activeKontak: chosen,
      hasil: res,
    };
  }, [dari, isHutang, jenis, sampai, selectedKontak, tick]);

  const prefix = isHutang ? "kartu-hutang" : "kartu-piutang";

  return (
    <div
      className="page"
      id={isHutang ? "page-kartu-hutang" : "page-kartu-piutang"}
      data-react-managed="1"
    >
      <div className="section-header">
        <div>
          <div className="section-title">
            <FileText
              size={15}
              style={{ verticalAlign: "-2px", marginRight: "6px" }}
            />
            {cfg.judul}
          </div>
          <div className="section-sub">
            {isHutang
              ? "Tagihan, pembayaran, dan saldo berjalan per supplier"
              : "Invoice, pembayaran, dan saldo berjalan per pelanggan"}
          </div>
        </div>
      </div>

      <div className="table-card" style={{ marginBottom: "16px" }}>
        <div className="aging-toolbar" style={{ flexWrap: "wrap" }}>
          <label className="aging-acuan-wrap">
            {cfg.pihak}
            <select
              id={`${prefix}-kontak`}
              value={activeKontak}
              onChange={(e) => setSelectedKontak(e.target.value)}
              aria-label={cfg.pihak}
              style={{
                flex: 1,
                minWidth: 0,
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px 10px",
                color: "var(--text)",
                fontSize: "12px",
                fontFamily: "var(--sans)",
              }}
            >
              {kontakListNames.length === 0 ? (
                <option value="">
                  — Belum ada {cfg.pihak.toLowerCase()} —
                </option>
              ) : (
                kontakListNames.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))
              )}
            </select>
          </label>
          <label className="aging-acuan-wrap">
            Dari
            <input
              type="date"
              id={`${prefix}-dari`}
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              aria-label="Dari tanggal"
            />
          </label>
          <label className="aging-acuan-wrap">
            Sampai
            <input
              type="date"
              id={`${prefix}-sampai`}
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              aria-label="Sampai tanggal"
            />
          </label>
        </div>

        <div id={`${prefix}-body`}>
          {!kontakListNames.length || !hasil ? (
            <div className="aging-empty">
              Belum ada {isHutang ? "tagihan" : "invoice"} yang diterbitkan
              {daftarDok.length === 0 ? "." : "."}
            </div>
          ) : (
            <>
              <div className="aging-summary">
                <div className="aging-sum-card">
                  <div className="aging-sum-lbl">Total Tagihan</div>
                  <div className="aging-sum-val">
                    {fmtRpDash(hasil.totalTagihan)}
                  </div>
                </div>
                <div className="aging-sum-card">
                  <div className="aging-sum-lbl">Total Dibayar</div>
                  <div className="aging-sum-val">
                    {fmtRpDash(hasil.totalBayar)}
                  </div>
                </div>
                <div className="aging-sum-card">
                  <div className="aging-sum-lbl">Saldo Akhir</div>
                  <div
                    className={`aging-sum-val${hasil.saldoAkhir > 0 ? " is-warn" : ""}`}
                  >
                    {fmtRpDash(hasil.saldoAkhir)}
                  </div>
                </div>
                <div className="aging-sum-card">
                  <div className="aging-sum-lbl">
                    Jumlah {isHutang ? "Tagihan" : "Invoice"}
                  </div>
                  <div className="aging-sum-val">{hasil.jumlahDok}</div>
                </div>
              </div>

              {!hasil.baris.length ? (
                <div className="aging-empty">
                  Tidak ada mutasi pada rentang tanggal ini.
                </div>
              ) : (
                <>
                  <div className="table-scroll aging-desktop">
                    <table className="aging-table">
                      <thead>
                        <tr>
                          <th>Tanggal</th>
                          <th>{cfg.noDok}</th>
                          <th>Keterangan</th>
                          <th className="r">Debit</th>
                          <th className="r">Kredit</th>
                          <th className="r">Saldo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hasil.baris.map((b, idx) => (
                          <tr key={idx}>
                            <td
                              style={{
                                fontFamily: "var(--mono)",
                                fontSize: "12px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {b.tanggal || "—"}
                            </td>
                            <td
                              style={{
                                fontFamily: "var(--mono)",
                                fontSize: "12px",
                                fontWeight: 600,
                              }}
                            >
                              {b.no}
                            </td>
                            <td style={{ fontSize: "12px" }}>{b.ket}</td>
                            <td className="r">{fmtRpDash(b.debit)}</td>
                            <td className="r">{fmtRpDash(b.kredit)}</td>
                            <td className="r">
                              <b>{fmtRpDash(b.saldo)}</b>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="aging-foot">
                          <td colSpan={3}>TOTAL</td>
                          <td className="r">
                            {fmtRpDash(
                              isHutang ? hasil.totalBayar : hasil.totalTagihan
                            )}
                          </td>
                          <td className="r">
                            {fmtRpDash(
                              isHutang ? hasil.totalTagihan : hasil.totalBayar
                            )}
                          </td>
                          <td className="r">{fmtRpDash(hasil.saldoAkhir)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="aging-mobile">
                    {hasil.baris.map((b, idx) => (
                      <div key={idx} className="aging-card">
                        <div className="aging-card-head">
                          <div>
                            <div className="aging-card-name">{b.no}</div>
                            <div className="aging-card-sub">
                              {b.tanggal || "—"} · {b.ket}
                            </div>
                          </div>
                          <div className="aging-card-total">
                            {fmtRpDash(b.saldo)}
                          </div>
                        </div>
                        <div className="aging-chips">
                          {b.debit > 0 && (
                            <span className="aging-chip">
                              Debit: <b>{fmtRpDash(b.debit)}</b>
                            </span>
                          )}
                          {b.kredit > 0 && (
                            <span className="aging-chip">
                              Kredit: <b>{fmtRpDash(b.kredit)}</b>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function KartuPiutangPage() {
  return <KartuKontakView jenis="piutang" />;
}

export function KartuHutangPage() {
  return <KartuKontakView jenis="hutang" />;
}
