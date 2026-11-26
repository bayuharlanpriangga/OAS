"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { BarChart3, ClipboardList, Settings } from "lucide-react";
import { hitungPenyusutanPure } from "@/lib/kalkulator";
import { callOasGlobal } from "@/lib/shared/legacy-store";
import type { PenyusutanMetode } from "@/types";
import { CalcNumberInput } from "../shared/CalcNumberInput";
import { CalcResultRow } from "../shared/CalcResultRow";
import { KalkActionBar } from "../shared/KalkActionBar";
import { fmtPct } from "../shared/fmtPct";
import { fmtRp } from "../shared/fmtRp";

export default function KalkPenyusutanPage() {
  const [nama, setNama] = useState("");
  const [cost, setCost] = useState("");
  const [sisa, setSisa] = useState("");
  const [umur, setUmur] = useState("");
  const [metode, setMetode] = useState<PenyusutanMetode>("garis-lurus");
  const [totalUnit, setTotalUnit] = useState("");
  const [unitPerTahunText, setUnitPerTahunText] = useState("");
  const [tgl, setTgl] = useState("");
  const [tarif, setTarif] = useState("2");

  useEffect(() => {
    setTgl(new Date().toISOString().split("T")[0]);

    const onSync = (ev: Event) => {
      const detail = (ev as CustomEvent<{ kind?: string }>).detail;
      if (detail?.kind !== "penyusutan") return;
      const read = (id: string) =>
        (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)
          ?.value ?? "";
      setNama(read("py-nama"));
      setCost(read("py-cost"));
      setSisa(read("py-sisa"));
      setUmur(read("py-umur"));
      const nextMetode = read("py-metode") as PenyusutanMetode;
      if (nextMetode) setMetode(nextMetode);
      setTotalUnit(read("py-total-unit"));
      setUnitPerTahunText(read("py-unit-per-tahun"));
    };

    window.addEventListener("oas:kalk-sync", onSync);
    return () => window.removeEventListener("oas:kalk-sync", onSync);
  }, []);

  const isUnitProduksi = metode === "unit-produksi";
  const isSaldoMenurun =
    metode === "saldo-menurun" || metode === "saldo-menurun-1x";

  const costVal = parseFloat(cost) || 0;
  const sisaVal = parseFloat(sisa) || 0;
  const umurVal = parseInt(umur, 10) || 0;
  const tarifVal = parseFloat(tarif) || 2;
  const totalUnitVal = parseFloat(totalUnit) || 1;
  const unitPerTahun = useMemo(
    () => unitPerTahunText.split(",").map((x) => parseFloat(x.trim()) || 0),
    [unitPerTahunText]
  );

  const hasInputs = costVal > 0 && umurVal > 0;
  const result = useMemo(() => {
    if (!hasInputs) return null;
    return hitungPenyusutanPure({
      cost: costVal,
      sisa: sisaVal,
      umur: umurVal,
      metode,
      totalUnit: totalUnitVal,
      unitPerTahun,
    });
  }, [hasInputs, costVal, sisaVal, umurVal, metode, totalUnitVal, unitPerTahun]);

  const scrollToTable = () => {
    document
      .getElementById("py-tabel-wrap")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="page" id="page-kalk-penyusutan" data-react-managed="1">

      <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Settings size={16} strokeWidth={2} /> Parameter Aset
            </div>
          </div>
          <div className="modal-body">
            <div className="form-row full">
              <div className="form-group">
                <label htmlFor="py-nama">Nama Aset</label>
                <input
                  type="text"
                  id="py-nama"
                  placeholder="Mesin Produksi A"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="py-cost">Harga Perolehan (Rp)</label>
                <CalcNumberInput
                  id="py-cost"
                  value={cost}
                  onChange={setCost}
                  placeholder="100000000"
                />
              </div>
              <div className="form-group">
                <label htmlFor="py-sisa">Nilai Sisa / Residu (Rp)</label>
                <CalcNumberInput
                  id="py-sisa"
                  value={sisa}
                  onChange={setSisa}
                  placeholder="10000000"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="py-umur">Umur Ekonomis (Thn)</label>
                <CalcNumberInput
                  id="py-umur"
                  value={umur}
                  onChange={setUmur}
                  placeholder="5"
                  showCurrencyHint={false}
                />
              </div>
              <div className="form-group">
                <label htmlFor="py-metode">Metode</label>
                <select
                  id="py-metode"
                  data-react-managed="1"
                  value={metode}
                  onChange={(e) => setMetode(e.target.value as PenyusutanMetode)}
                >
                  <option value="garis-lurus">Garis Lurus (SLM)</option>
                  <option value="saldo-menurun">Saldo Menurun (DDB)</option>
                  <option value="saldo-menurun-1x">
                    Saldo Menurun 1x (150%)
                  </option>
                  <option value="sum-of-years">Sum of Years Digits</option>
                  <option value="unit-produksi">Unit Produksi</option>
                </select>
              </div>
            </div>

            <div
              id="py-unit-row"
              className="form-row full"
              style={{ display: isUnitProduksi ? "block" : "none" }}
            >
              <div className="form-row" style={{ marginBottom: 0 }}>
                <div className="form-group">
                  <label htmlFor="py-total-unit">
                    Total Kapasitas Produksi
                  </label>
                  <CalcNumberInput
                    id="py-total-unit"
                    value={totalUnit}
                    onChange={setTotalUnit}
                    placeholder="100000"
                    showCurrencyHint={false}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="py-unit-per-tahun">
                    Unit Produksi / Tahun
                  </label>
                  <input
                    type="text"
                    id="py-unit-per-tahun"
                    placeholder="20000,25000,30000,..."
                    value={unitPerTahunText}
                    onChange={(e) => setUnitPerTahunText(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="py-tgl">Tanggal Perolehan</label>
                <input
                  type="date"
                  id="py-tgl"
                  value={tgl}
                  onChange={(e) => setTgl(e.target.value)}
                />
              </div>
              <div
                className="form-group"
                id="py-tarif-group"
                style={{ opacity: isSaldoMenurun ? 1 : 0.4 }}
                title={
                  isSaldoMenurun
                    ? ""
                    : "Tarif pajak hanya digunakan untuk metode Saldo Menurun (DDB)"
                }
              >
                <label htmlFor="py-tarif">Tarif Pajak (untuk DDB)</label>
                <CalcNumberInput
                  id="py-tarif"
                  value={tarif}
                  onChange={setTarif}
                  placeholder="2 (x lipat garis lurus)"
                  disabled={!isSaldoMenurun}
                  showCurrencyHint={false}
                />
              </div>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              className="btn btn-primary"
              onClick={scrollToTable}
              style={{ width: "100%", marginTop: "10px" }}
            >
              Hitung &amp; Generate Tabel
            </motion.button>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <BarChart3 size={16} strokeWidth={2} /> Ringkasan
            </div>
          </div>
          <div
            id="py-summary"
            style={{ padding: "16px", color: "var(--muted)", fontSize: "13px" }}
          >
            {!result ? (
              "Isi parameter lalu klik Hitung."
            ) : !result.ok ? (
              <span style={{ color: "var(--red)" }}>
                {result.pesan || "Parameter tidak valid."}
              </span>
            ) : (
              <>
                <CalcResultRow label="Harga Perolehan" value={fmtRp(costVal)} />
                <CalcResultRow label="Nilai Sisa" value={fmtRp(sisaVal)} />
                <CalcResultRow
                  label="Dasar Penyusutan"
                  value={fmtRp(result.dasarPenyusutan)}
                />
                <CalcResultRow
                  label="Umur Ekonomis"
                  value={`${umurVal} Tahun`}
                />
                <CalcResultRow
                  label="Total Akumulasi"
                  value={fmtRp(result.totalBeban)}
                />
                <CalcResultRow
                  label="Rata-rata / Tahun"
                  value={fmtRp(result.rataRataPerTahun)}
                />
                {metode === "garis-lurus" && (
                  <CalcResultRow
                    label="Tarif Penyusutan"
                    value={fmtPct((1 / umurVal) * 100)}
                  />
                )}
                {metode.includes("saldo") && (
                  <CalcResultRow
                    label="Tarif DDB/SDB"
                    value={fmtPct((tarifVal / umurVal) * 100)}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {result && result.ok && (
        <motion.div
          className="table-card"
          id="py-tabel-wrap"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
          style={{ marginTop: "4px" }}
        >
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <ClipboardList size={16} strokeWidth={2} /> Tabel Penyusutan
              Lengkap
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tahun</th>
                  <th>Beban Penyusutan</th>
                  <th>Akumulasi Penyusutan</th>
                  <th>Nilai Buku Awal</th>
                  <th>Nilai Buku Akhir</th>
                  <th>Jurnal</th>
                </tr>
              </thead>
              <tbody id="py-tabel-body">
                {result.tabel.map((row) => (
                  <tr key={row.t}>
                    <td>
                      Tahun {row.t}
                      {row.unit
                        ? ` (${row.unit.toLocaleString("id-ID")} unit)`
                        : ""}
                    </td>
                    <td className="debit">{fmtRp(row.beban)}</td>
                    <td className="kredit">{fmtRp(row.akum)}</td>
                    <td className="num">{fmtRp(row.nbAwal)}</td>
                    <td className="num">{fmtRp(row.nbAkhir)}</td>
                    <td style={{ fontSize: "11px", color: "var(--muted)" }}>
                      Dr. Beban Peny. {fmtRp(row.beban)}
                      <br />
                      Kr. Akum. Peny. {fmtRp(row.beban)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <KalkActionBar
            id="py-input-btn-bar"
            label="Input Jurnal Penyusutan ke Sistem"
            onAction={() => callOasGlobal("inputPenyusutanJurnal")}
          />
        </motion.div>
      )}
    </div>
  );
}
