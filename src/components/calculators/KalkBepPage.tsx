"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { Package, Settings } from "lucide-react";
import { hitungBepPure } from "@/lib/kalkulator";
import { callOasGlobal } from "@/lib/legacy-actions";
import {
  CalcNumberInput,
  KalkActionBar,
  fmtPct,
  fmtRp,
} from "./CalcPrimitives";

export default function KalkBepPage() {
  const [harga, setHarga] = useState("");
  const [bv, setBv] = useState("");
  const [bt, setBt] = useState("");
  const [vol, setVol] = useState("");
  const [target, setTarget] = useState("");
  const [pajakPct, setPajakPct] = useState("");
  const [bauranStr, setBauranStr] = useState("");

  useEffect(() => {
    const read = (id: string) =>
      (document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null)
        ?.value ?? "";

    const onSync = (ev: Event) => {
      const detail = (ev as CustomEvent<{ kind?: string }>).detail;
      if (detail?.kind !== "bep") return;
      setHarga(read("bep-harga"));
      setBv(read("bep-bv"));
      setBt(read("bep-bt"));
      setVol(read("bep-vol"));
      setTarget(read("bep-target"));
      setPajakPct(read("bep-pajak"));
      setBauranStr(read("bep-bauran"));
    };

    window.addEventListener("oas:kalk-sync", onSync);
    return () => window.removeEventListener("oas:kalk-sync", onSync);
  }, []);

  const hargaVal = parseFloat(harga) || 0;
  const bvVal = parseFloat(bv) || 0;
  const btVal = parseFloat(bt) || 0;
  const volVal = parseFloat(vol) || 0;
  const targetVal = parseFloat(target) || 0;
  const pajakVal = parseFloat(pajakPct) || 0;

  const res = useMemo(() => {
    if (!hargaVal || !btVal) return null;
    const trimmed = bauranStr.trim();
    const bauran = trimmed
      ? trimmed.split(",").map((s) => {
          const parts = s.trim().split(":");
          return {
            nama: parts[0] || "",
            harga: parseFloat(parts[1]) || 0,
            bv: parseFloat(parts[2]) || 0,
            prop: parseFloat(parts[3]) || 0,
          };
        })
      : undefined;

    return hitungBepPure({
      harga: hargaVal,
      bv: bvVal,
      bt: btVal,
      vol: volVal,
      target: targetVal,
      pajakPct: pajakVal,
      bauran,
    });
  }, [hargaVal, bvVal, btVal, volVal, targetVal, pajakVal, bauranStr]);

  return (
    <div className="page" id="page-kalk-bep" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Kalkulator BEP &amp; Margin</div>
          <div className="section-sub">
            Break Even Point · Contribution Margin · Margin of Safety · Leverage
            Operasi
          </div>
        </div>
      </div>

      <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Settings size={16} strokeWidth={2} /> Parameter
            </div>
          </div>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bep-harga">Harga Jual / Unit (Rp)</label>
                <CalcNumberInput
                  id="bep-harga"
                  value={harga}
                  onChange={setHarga}
                  placeholder="50000"
                />
              </div>
              <div className="form-group">
                <label htmlFor="bep-bv">Biaya Variabel / Unit (Rp)</label>
                <CalcNumberInput
                  id="bep-bv"
                  value={bv}
                  onChange={setBv}
                  placeholder="30000"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bep-bt">Biaya Tetap / Periode (Rp)</label>
                <CalcNumberInput
                  id="bep-bt"
                  value={bt}
                  onChange={setBt}
                  placeholder="20000000"
                />
              </div>
              <div className="form-group">
                <label htmlFor="bep-vol">Volume Penjualan Aktual (Unit)</label>
                <CalcNumberInput
                  id="bep-vol"
                  value={vol}
                  onChange={setVol}
                  placeholder="1500"
                  showCurrencyHint={false}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="bep-target">Target Laba (Rp, opsional)</label>
                <CalcNumberInput
                  id="bep-target"
                  value={target}
                  onChange={setTarget}
                  placeholder="0"
                />
              </div>
              <div className="form-group">
                <label htmlFor="bep-pajak">Pajak (%)</label>
                <CalcNumberInput
                  id="bep-pajak"
                  value={pajakPct}
                  onChange={setPajakPct}
                  placeholder="22"
                  showCurrencyHint={false}
                />
              </div>
            </div>

            <div className="form-row full">
              <div className="form-group">
                <label htmlFor="bep-bauran">
                  Bauran Produk (nama:harga:bv:proporsi, pisah koma)
                </label>
                <textarea
                  id="bep-bauran"
                  rows={3}
                  placeholder="Produk A:50000:30000:0.6, Produk B:80000:50000:0.4"
                  value={bauranStr}
                  onChange={(e) => setBauranStr(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        <div
          id="bep-hasil"
          style={{ display: "flex", flexDirection: "column", gap: "12px" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <div className="stat-card green">
              <div className="stat-label">BEP (Unit)</div>
              <div className="stat-value" id="bep-unit">
                {res
                  ? res.bepUnit.toLocaleString("id-ID", {
                      maximumFractionDigits: 0,
                    })
                  : "-"}
              </div>
              <div className="stat-sub">Unit minimal</div>
            </div>
            <div className="stat-card blue">
              <div className="stat-label">BEP (Rupiah)</div>
              <div className="stat-value" id="bep-rp">
                {res ? fmtRp(res.bepRp) : "-"}
              </div>
              <div className="stat-sub">Pendapatan minimal</div>
            </div>
            <div className="stat-card yellow">
              <div className="stat-label">Contribution Margin</div>
              <div className="stat-value" id="bep-cm">
                {res ? fmtRp(res.cm) : "-"}
              </div>
              <div className="stat-sub">Per unit</div>
            </div>
            <div className="stat-card red">
              <div className="stat-label">CM Ratio</div>
              <div className="stat-value" id="bep-cmr">
                {res ? fmtPct(res.cmr * 100) : "-"}
              </div>
              <div className="stat-sub">% dari harga jual</div>
            </div>
          </div>

          <div className="table-card">
            <table>
              <tbody id="bep-detail-body">
                {res && (
                  <>
                    <tr>
                      <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                        Pendapatan Aktual
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {fmtRp(res.pendapatan)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                        Laba Kotor
                      </td>
                      <td className="debit" style={{ textAlign: "right" }}>
                        {fmtRp(res.labaKotor)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                        Laba Bersih (after tax)
                      </td>
                      <td className="debit" style={{ textAlign: "right" }}>
                        {fmtRp(res.labaBersih)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                        Margin of Safety (unit)
                      </td>
                      <td
                        className={res.mos >= 0 ? "debit" : "kredit"}
                        style={{ textAlign: "right" }}
                      >
                        {res.mos.toLocaleString("id-ID", {
                          maximumFractionDigits: 0,
                        })}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                        Margin of Safety (%)
                      </td>
                      <td
                        className={res.mos >= 0 ? "debit" : "kredit"}
                        style={{ textAlign: "right" }}
                      >
                        {fmtPct(res.mosPct * 100)}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                        Degree of Operating Leverage
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {res.dol.toFixed(2)}x
                      </td>
                    </tr>
                    {res.targetVol ? (
                      <tr>
                        <td style={{ color: "var(--muted)", fontSize: "12px" }}>
                          Volume utk target laba {fmtRp(targetVal)}
                        </td>
                        <td className="num" style={{ textAlign: "right" }}>
                          {Math.ceil(res.targetVol).toLocaleString("id-ID")} unit
                        </td>
                      </tr>
                    ) : null}
                  </>
                )}
              </tbody>
            </table>
            {res && (
              <KalkActionBar
                id="bep-input-btn-bar"
                label="Input Jurnal BEP ke Sistem"
                onAction={() => callOasGlobal("inputBEPJurnal")}
              />
            )}
          </div>
        </div>
      </div>

      {res && res.bauranItems && res.bauranItems.length > 0 && (
        <motion.div
          className="table-card"
          id="bep-bauran-wrap"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.16 }}
          style={{ marginTop: "4px" }}
        >
          <div className="table-header">
            <div
              className="table-title"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <Package size={16} strokeWidth={2} /> BEP Bauran Produk
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Produk</th>
                  <th>Harga</th>
                  <th>BV</th>
                  <th>CM</th>
                  <th>Proporsi</th>
                  <th>CM Weighted</th>
                </tr>
              </thead>
              <tbody id="bep-bauran-body">
                {res.bauranItems.map((p, idx) => (
                  <tr key={`${p.nama}-${idx}`}>
                    <td>{p.nama}</td>
                    <td className="num">{fmtRp(p.harga)}</td>
                    <td className="num">{fmtRp(p.bv)}</td>
                    <td className="debit">{fmtRp(p.cm)}</td>
                    <td>{(p.prop * 100).toFixed(0)}%</td>
                    <td className="num">{fmtRp(p.wmCm)}</td>
                  </tr>
                ))}
                <tr
                  style={{
                    borderTop: "2px solid var(--border)",
                    fontWeight: 700,
                  }}
                >
                  <td colSpan={4}>BEP Bauran</td>
                  <td colSpan={2} className="debit">
                    {Math.ceil(res.bepBauranUnit || 0).toLocaleString("id-ID")}{" "}
                    unit
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}
