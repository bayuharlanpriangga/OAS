"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import {
  hitungAnuitasPure,
  hitungBungaPure,
  hitungDiskontoPure,
  hitungPvPure,
} from "@/lib/kalkulator";
import { callOasGlobal } from "@/lib/shared/legacy-store";
import type {
  AnuitasJenis,
  BungaJenis,
  BungaSatuan,
  PvMode,
} from "@/types";
import { CalcNumberInput } from "../shared/CalcNumberInput";
import { CalcResultRow } from "../shared/CalcResultRow";
import { KalkActionBar } from "../shared/KalkActionBar";
import { fmtPct } from "../shared/fmtPct";
import { fmtRp } from "../shared/fmtRp";

type BungaTab = "tunggal" | "anuitas" | "pv" | "diskonto";

export default function KalkBungaPage() {
  const [activeTab, setActiveTab] = useState<BungaTab>("tunggal");

  // Sub-tab 1: Bunga Tunggal & Majemuk
  const [btPokok, setBtPokok] = useState("");
  const [btRate, setBtRate] = useState("");
  const [btN, setBtN] = useState("");
  const [btSatuan, setBtSatuan] = useState<BungaSatuan>("tahun");
  const [btJenis, setBtJenis] = useState<BungaJenis>("tunggal");

  // Sub-tab 2: Anuitas & Cicilan
  const [anPokok, setAnPokok] = useState("");
  const [anRate, setAnRate] = useState("");
  const [anTenor, setAnTenor] = useState("");
  const [anJenis, setAnJenis] = useState<AnuitasJenis>("anuitas");
  const [anDp, setAnDp] = useState("");
  const [anBiaya, setAnBiaya] = useState("");

  // Sub-tab 3: PV / FV
  const [pvMode, setPvMode] = useState<PvMode>("fv");
  const [pvPv, setPvPv] = useState("");
  const [pvFv, setPvFv] = useState("");
  const [pvRate, setPvRate] = useState("");
  const [pvN, setPvN] = useState("");
  const [pvPmt, setPvPmt] = useState("");
  const [pvM, setPvM] = useState("1");

  // Sub-tab 4: Diskonto & Wesel
  const [dkNominal, setDkNominal] = useState("");
  const [dkRate, setDkRate] = useState("");
  const [dkHari, setDkHari] = useState("");
  const [dkBungaWesel, setDkBungaWesel] = useState("");
  const [dkBasis, setDkBasis] = useState("360");

  useEffect(() => {
    const read = (id: string) =>
      (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)
        ?.value ?? "";

    const onSync = (ev: Event) => {
      const detail = (ev as CustomEvent<{ kind?: string; tab?: BungaTab }>)
        .detail;
      if (!detail?.kind) return;
      if (detail.kind === "bunga-tab" && detail.tab) {
        setActiveTab(detail.tab);
        return;
      }
      if (detail.kind === "bunga") {
        setBtPokok(read("bt-pokok"));
        setBtRate(read("bt-rate"));
        setBtN(read("bt-n"));
        const sat = read("bt-satuan") as BungaSatuan;
        if (sat) setBtSatuan(sat);
        const jen = read("bt-jenis") as BungaJenis;
        if (jen) setBtJenis(jen);
        return;
      }
      if (detail.kind === "anuitas") {
        setAnPokok(read("an-pokok"));
        setAnRate(read("an-rate"));
        setAnTenor(read("an-tenor"));
        const jen = read("an-jenis") as AnuitasJenis;
        if (jen) setAnJenis(jen);
        setAnDp(read("an-dp"));
        setAnBiaya(read("an-biaya"));
        return;
      }
      if (detail.kind === "pv") {
        const m = read("pv-mode") as PvMode;
        if (m) setPvMode(m);
        setPvPv(read("pv-pv"));
        setPvFv(read("pv-fv"));
        setPvRate(read("pv-r"));
        setPvN(read("pv-n"));
        setPvPmt(read("pv-pmt"));
        if (read("pv-m")) setPvM(read("pv-m"));
        return;
      }
      if (detail.kind === "diskonto") {
        setDkNominal(read("dk-nominal"));
        setDkRate(read("dk-rate"));
        setDkHari(read("dk-hari"));
        setDkBungaWesel(read("dk-bunga-wesel"));
        if (read("dk-basis")) setDkBasis(read("dk-basis"));
      }
    };

    window.addEventListener("oas:kalk-sync", onSync);
    return () => window.removeEventListener("oas:kalk-sync", onSync);
  }, []);

  const bungaRes = useMemo(() => {
    const pokok = parseFloat(btPokok) || 0;
    const rateAnn = parseFloat(btRate) || 0;
    const n = parseFloat(btN) || 0;
    if (!pokok || !rateAnn || !n) return null;
    return hitungBungaPure({
      pokok,
      rateAnn,
      n,
      satuan: btSatuan,
      jenis: btJenis,
    });
  }, [btPokok, btRate, btN, btSatuan, btJenis]);

  const anuitasRes = useMemo(() => {
    const pokok = parseFloat(anPokok) || 0;
    const rateAnn = parseFloat(anRate) || 0;
    const tenor = parseInt(anTenor, 10) || 0;
    if (!pokok || !rateAnn || !tenor) return null;
    return hitungAnuitasPure({
      pokok,
      dp: parseFloat(anDp) || 0,
      rateAnn,
      tenor,
      biaya: parseFloat(anBiaya) || 0,
      jenis: anJenis,
    });
  }, [anPokok, anDp, anRate, anTenor, anBiaya, anJenis]);

  const pvRes = useMemo(() => {
    const pv = parseFloat(pvPv) || 0;
    const fv = parseFloat(pvFv) || 0;
    const ratePct = parseFloat(pvRate) || 0;
    const n = parseFloat(pvN) || 0;
    const pmt = parseFloat(pvPmt) || 0;
    const m = parseInt(pvM, 10) || 1;
    if (pvMode === "fv" && !pv && !ratePct && !n) return null;
    if (pvMode === "pv" && !fv && !ratePct && !n) return null;
    if (pvMode === "rate" && (!pv || !fv || !n)) return null;
    if (pvMode === "n" && (!pv || !fv || !ratePct)) return null;
    return {
      pmt,
      data: hitungPvPure({ mode: pvMode, pv, fv, ratePct, n, pmt, m }),
    };
  }, [pvMode, pvPv, pvFv, pvRate, pvN, pvPmt, pvM]);

  const diskontoRes = useMemo(() => {
    const nominal = parseFloat(dkNominal) || 0;
    const ratePct = parseFloat(dkRate) || 0;
    const hari = parseFloat(dkHari) || 0;
    const bungaWeselPct = parseFloat(dkBungaWesel) || 0;
    const basis = (parseInt(dkBasis, 10) === 365 ? 365 : 360) as 360 | 365;
    if (!nominal || !ratePct || !hari) return null;
    return {
      hasBungaWesel: bungaWeselPct > 0,
      data: hitungDiskontoPure({
        nominal,
        ratePct,
        hari,
        bungaWeselPct,
        basis,
      }),
    };
  }, [dkNominal, dkRate, dkHari, dkBungaWesel, dkBasis]);

  const anRateNum = parseFloat(anRate) || 0;
  const anTenorNum = parseInt(anTenor, 10) || 1;

  return (
    <div className="page" id="page-kalk-bunga" data-react-managed="1">

      <div className="tabs" id="bunga-tabs">
        <div
          className={`tab${activeTab === "tunggal" ? " active" : ""}`}
          onClick={() => setActiveTab("tunggal")}
        >
          Bunga Tunggal/Majemuk
        </div>
        <div
          className={`tab${activeTab === "anuitas" ? " active" : ""}`}
          onClick={() => setActiveTab("anuitas")}
        >
          Anuitas &amp; Cicilan
        </div>
        <div
          className={`tab${activeTab === "pv" ? " active" : ""}`}
          onClick={() => setActiveTab("pv")}
        >
          Present / Future Value
        </div>
        <div
          className={`tab${activeTab === "diskonto" ? " active" : ""}`}
          onClick={() => setActiveTab("diskonto")}
        >
          Diskonto &amp; Wesel
        </div>
      </div>

      <div
        id="bunga-tunggal"
        style={{ display: activeTab === "tunggal" ? "block" : "none" }}
      >
        <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Parameter</div>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bt-pokok">Pokok (Rp)</label>
                  <CalcNumberInput
                    id="bt-pokok"
                    value={btPokok}
                    onChange={setBtPokok}
                    placeholder="100000000"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bt-rate">Suku Bunga (% / tahun)</label>
                  <CalcNumberInput
                    id="bt-rate"
                    value={btRate}
                    onChange={setBtRate}
                    placeholder="12"
                    showCurrencyHint={false}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="bt-n">Jangka Waktu</label>
                  <CalcNumberInput
                    id="bt-n"
                    value={btN}
                    onChange={setBtN}
                    placeholder="5"
                    showCurrencyHint={false}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="bt-satuan">Satuan Waktu</label>
                  <select
                    id="bt-satuan"
                    data-react-managed="1"
                    value={btSatuan}
                    onChange={(e) => setBtSatuan(e.target.value as BungaSatuan)}
                  >
                    <option value="tahun">Tahun</option>
                    <option value="bulan">Bulan</option>
                    <option value="hari">Hari</option>
                  </select>
                </div>
              </div>
              <div className="form-row full">
                <div className="form-group">
                  <label htmlFor="bt-jenis">Jenis Bunga</label>
                  <select
                    id="bt-jenis"
                    data-react-managed="1"
                    value={btJenis}
                    onChange={(e) => setBtJenis(e.target.value as BungaJenis)}
                  >
                    <option value="tunggal">
                      Bunga Tunggal (Simple Interest)
                    </option>
                    <option value="majemuk-tahunan">
                      Bunga Majemuk Tahunan
                    </option>
                    <option value="majemuk-semesteran">
                      Bunga Majemuk Semesteran
                    </option>
                    <option value="majemuk-triwulanan">
                      Bunga Majemuk Triwulanan
                    </option>
                    <option value="majemuk-bulanan">
                      Bunga Majemuk Bulanan
                    </option>
                    <option value="efektif-menurun">
                      Efektif Menurun (flat→efektif)
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Hasil</div>
            </div>
            <div
              id="bt-hasil"
              style={{ padding: "16px", color: "var(--muted)", fontSize: "13px" }}
            >
              {!bungaRes ? (
                "Isi parameter di kiri."
              ) : btJenis === "tunggal" ? (
                <>
                  <CalcResultRow label="Pokok" value={fmtRp(bungaRes.pokok)} />
                  <CalcResultRow
                    label="Total Bunga"
                    value={fmtRp(bungaRes.totalBunga)}
                  />
                  <CalcResultRow
                    label="FV / Nilai Akhir"
                    value={fmtRp(bungaRes.fv)}
                  />
                  <CalcResultRow
                    label={`Bunga per ${btSatuan}`}
                    value={fmtRp(bungaRes.bungaPerSatuan || 0)}
                  />
                </>
              ) : btJenis.startsWith("majemuk") ? (
                <>
                  <CalcResultRow label="Pokok" value={fmtRp(bungaRes.pokok)} />
                  <CalcResultRow
                    label="Total Bunga"
                    value={fmtRp(bungaRes.totalBunga)}
                  />
                  <CalcResultRow label="FV" value={fmtRp(bungaRes.fv)} />
                  <CalcResultRow
                    label="Suku Bunga Efektif"
                    value={fmtPct(bungaRes.rEfektifPct || 0)}
                  />
                </>
              ) : (
                <>
                  <CalcResultRow
                    label="Cicilan/Bulan"
                    value={fmtRp(bungaRes.cicilanBulan || 0)}
                  />
                  <CalcResultRow
                    label="Suku Bunga Flat Setara"
                    value={fmtPct(bungaRes.rFlatSetaraPct || 0)}
                  />
                  <CalcResultRow
                    label="Total Bayar"
                    value={fmtRp(bungaRes.totalBayar || bungaRes.fv)}
                  />
                  <CalcResultRow
                    label="Total Bunga"
                    value={fmtRp(bungaRes.totalBunga)}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {bungaRes && bungaRes.tabel.length > 0 && (
          <motion.div
            className="table-card"
            id="bt-tabel-wrap"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className="table-header">
              <div className="table-title">Tabel Bunga Per Periode</div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Periode</th>
                    <th>Saldo Awal</th>
                    <th>Bunga</th>
                    <th>Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody id="bt-tabel-body">
                  {bungaRes.tabel.map((row) => (
                    <tr key={row.periode}>
                      <td>{row.periode}</td>
                      <td className="num">{fmtRp(row.saldoAwal)}</td>
                      <td className="debit">{fmtRp(row.bunga)}</td>
                      <td className="num">{fmtRp(row.saldoAkhir)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>

      <div
        id="bunga-anuitas"
        style={{ display: activeTab === "anuitas" ? "block" : "none" }}
      >
        <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Parameter Cicilan / Kredit</div>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="an-pokok">Nilai Pinjaman (Rp)</label>
                  <CalcNumberInput
                    id="an-pokok"
                    value={anPokok}
                    onChange={setAnPokok}
                    placeholder="500000000"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="an-rate">Suku Bunga (% / tahun)</label>
                  <CalcNumberInput
                    id="an-rate"
                    value={anRate}
                    onChange={setAnRate}
                    placeholder="12"
                    showCurrencyHint={false}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="an-tenor">Tenor (bulan)</label>
                  <CalcNumberInput
                    id="an-tenor"
                    value={anTenor}
                    onChange={setAnTenor}
                    placeholder="36"
                    showCurrencyHint={false}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="an-jenis">Jenis Angsuran</label>
                  <select
                    id="an-jenis"
                    data-react-managed="1"
                    value={anJenis}
                    onChange={(e) => setAnJenis(e.target.value as AnuitasJenis)}
                  >
                    <option value="anuitas">Anuitas (cicilan tetap)</option>
                    <option value="flat">Bunga Flat</option>
                    <option value="efektif">Efektif Menurun</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="an-dp">DP / Uang Muka (Rp)</label>
                  <CalcNumberInput
                    id="an-dp"
                    value={anDp}
                    onChange={setAnDp}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="an-biaya">Biaya Admin (Rp)</label>
                  <CalcNumberInput
                    id="an-biaya"
                    value={anBiaya}
                    onChange={setAnBiaya}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Ringkasan Cicilan</div>
            </div>
            <div
              id="an-hasil"
              style={{ padding: "16px", color: "var(--muted)", fontSize: "13px" }}
            >
              {!anuitasRes ? (
                "Isi parameter di kiri."
              ) : anJenis === "anuitas" ? (
                <>
                  <CalcResultRow
                    label="Cicilan / Bulan"
                    value={fmtRp(anuitasRes.cicilanBulan)}
                  />
                  <CalcResultRow
                    label="Total Bunga"
                    value={fmtRp(anuitasRes.totalBunga)}
                  />
                  <CalcResultRow
                    label="Total Bayar (incl DP+biaya)"
                    value={fmtRp(anuitasRes.totalBayar)}
                  />
                  <CalcResultRow
                    label="Efektif Suku Bunga"
                    value={fmtPct(anRateNum)}
                  />
                </>
              ) : anJenis === "flat" ? (
                <>
                  <CalcResultRow
                    label="Cicilan / Bulan"
                    value={fmtRp(anuitasRes.cicilanBulan)}
                  />
                  <CalcResultRow
                    label="Pokok / Bulan"
                    value={fmtRp(anuitasRes.pinjaman / anTenorNum)}
                  />
                  <CalcResultRow
                    label="Bunga / Bulan"
                    value={fmtRp(
                      (anuitasRes.pinjaman * anRateNum) / 100 / 12
                    )}
                  />
                  <CalcResultRow
                    label="Total Bunga"
                    value={fmtRp(anuitasRes.totalBunga)}
                  />
                </>
              ) : (
                <>
                  <CalcResultRow
                    label="Cicilan Pertama"
                    value={fmtRp(anuitasRes.cicilanBulan)}
                  />
                  <CalcResultRow
                    label="Total Bunga"
                    value={fmtRp(anuitasRes.totalBunga)}
                  />
                  <CalcResultRow
                    label="Total Bayar"
                    value={fmtRp(anuitasRes.totalBayar)}
                  />
                </>
              )}
            </div>
          </div>
        </div>

        {anuitasRes && (
          <motion.div
            className="table-card"
            id="an-tabel-wrap"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            <div className="table-header">
              <div className="table-title">Jadwal Angsuran Lengkap</div>
            </div>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Bulan</th>
                    <th>Saldo Awal</th>
                    <th>Pokok</th>
                    <th>Bunga</th>
                    <th>Angsuran</th>
                    <th>Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody id="an-tabel-body">
                  {anuitasRes.tabel.map((row) => (
                    <tr key={row.periode}>
                      <td>{row.periode}</td>
                      <td className="num">{fmtRp(row.saldoAwal)}</td>
                      <td className="debit">{fmtRp(row.pokok)}</td>
                      <td className="kredit">{fmtRp(row.bunga)}</td>
                      <td className="num">{fmtRp(row.cicilan)}</td>
                      <td className="num">{fmtRp(row.saldoAkhir)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <KalkActionBar
              id="an-input-btn-bar"
              label="Input Jurnal Pinjaman & Angsuran"
              onAction={() => callOasGlobal("inputAnuitasJurnal")}
            />
          </motion.div>
        )}
      </div>

      <div
        id="bunga-pv"
        style={{ display: activeTab === "pv" ? "block" : "none" }}
      >
        <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Present Value / Future Value</div>
            </div>
            <div className="modal-body">
              <div className="form-row full">
                <div className="form-group">
                  <label htmlFor="pv-mode">Hitung</label>
                  <select
                    id="pv-mode"
                    data-react-managed="1"
                    value={pvMode}
                    onChange={(e) => setPvMode(e.target.value as PvMode)}
                  >
                    <option value="fv">Future Value (cari FV)</option>
                    <option value="pv">Present Value (cari PV)</option>
                    <option value="rate">Suku Bunga (cari r)</option>
                    <option value="n">Jangka Waktu (cari n)</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pv-pv">PV / Nilai Sekarang (Rp)</label>
                  <CalcNumberInput
                    id="pv-pv"
                    value={pvPv}
                    onChange={setPvPv}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pv-fv">FV / Nilai Mendatang (Rp)</label>
                  <CalcNumberInput
                    id="pv-fv"
                    value={pvFv}
                    onChange={setPvFv}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pv-r">Suku Bunga (% / tahun)</label>
                  <CalcNumberInput
                    id="pv-r"
                    value={pvRate}
                    onChange={setPvRate}
                    placeholder="10"
                    showCurrencyHint={false}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pv-n">Jangka Waktu (Tahun)</label>
                  <CalcNumberInput
                    id="pv-n"
                    value={pvN}
                    onChange={setPvN}
                    placeholder="5"
                    showCurrencyHint={false}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="pv-pmt">
                    Pembayaran Periodik / PMT (Rp)
                  </label>
                  <CalcNumberInput
                    id="pv-pmt"
                    value={pvPmt}
                    onChange={setPvPmt}
                    placeholder="0 (opsional)"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="pv-m">Frekuensi Compounding</label>
                  <select
                    id="pv-m"
                    data-react-managed="1"
                    value={pvM}
                    onChange={(e) => setPvM(e.target.value)}
                  >
                    <option value="1">Tahunan</option>
                    <option value="2">Semesteran</option>
                    <option value="4">Triwulanan</option>
                    <option value="12">Bulanan</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Hasil</div>
            </div>
            <div
              id="pv-hasil"
              style={{ padding: "16px", color: "var(--muted)", fontSize: "13px" }}
            >
              {!pvRes ? (
                "Isi parameter."
              ) : pvRes.data.mode === "fv" ? (
                <>
                  <CalcResultRow
                    label="Future Value (Lump Sum)"
                    value={fmtRp(pvRes.data.fvLump || 0)}
                  />
                  {pvRes.pmt > 0 && (
                    <CalcResultRow
                      label="FV Anuitas"
                      value={fmtRp(pvRes.data.fvAnn || 0)}
                    />
                  )}
                  <CalcResultRow
                    label="Total FV"
                    value={fmtRp(pvRes.data.totalFv || 0)}
                  />
                  <CalcResultRow
                    label="Keuntungan"
                    value={fmtRp(pvRes.data.keuntungan || 0)}
                  />
                </>
              ) : pvRes.data.mode === "pv" ? (
                <>
                  <CalcResultRow
                    label="Present Value"
                    value={fmtRp(pvRes.data.pvCalc || 0)}
                  />
                  {pvRes.pmt > 0 && (
                    <CalcResultRow
                      label="PV Anuitas"
                      value={fmtRp(pvRes.data.pvAnn || 0)}
                    />
                  )}
                  <CalcResultRow
                    label="Total PV"
                    value={fmtRp(pvRes.data.totalPv || 0)}
                  />
                  <CalcResultRow
                    label="Faktor Diskonto"
                    value={`${(pvRes.data.faktorDiskontoPct || 0).toFixed(4)}%`}
                  />
                </>
              ) : pvRes.data.mode === "rate" ? (
                <>
                  <CalcResultRow
                    label="Suku Bunga / Tahun"
                    value={fmtPct(pvRes.data.ratePerTahunPct || 0)}
                  />
                  <CalcResultRow
                    label="Suku Bunga / Periode"
                    value={fmtPct(pvRes.data.ratePerPeriodePct || 0)}
                  />
                </>
              ) : (
                <>
                  <CalcResultRow
                    label="Jangka Waktu (Tahun)"
                    value={(pvRes.data.nTahun || 0).toFixed(4)}
                  />
                  <CalcResultRow
                    label="Jangka Waktu (Bulan)"
                    value={(pvRes.data.nBulan || 0).toFixed(2)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        id="bunga-diskonto"
        style={{ display: activeTab === "diskonto" ? "block" : "none" }}
      >
        <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Diskonto &amp; Wesel</div>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dk-nominal">Nilai Nominal Wesel (Rp)</label>
                  <CalcNumberInput
                    id="dk-nominal"
                    value={dkNominal}
                    onChange={setDkNominal}
                    placeholder="100000000"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dk-rate">Tarif Diskonto (% / tahun)</label>
                  <CalcNumberInput
                    id="dk-rate"
                    value={dkRate}
                    onChange={setDkRate}
                    placeholder="12"
                    showCurrencyHint={false}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="dk-hari">Jangka Waktu (hari)</label>
                  <CalcNumberInput
                    id="dk-hari"
                    value={dkHari}
                    onChange={setDkHari}
                    placeholder="90"
                    showCurrencyHint={false}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="dk-bunga-wesel">
                    Bunga Wesel (% / tahun, jika ada)
                  </label>
                  <CalcNumberInput
                    id="dk-bunga-wesel"
                    value={dkBungaWesel}
                    onChange={setDkBungaWesel}
                    placeholder="0"
                    showCurrencyHint={false}
                  />
                </div>
              </div>
              <div className="form-row full">
                <div className="form-group">
                  <label htmlFor="dk-basis">Metode Hari</label>
                  <select
                    id="dk-basis"
                    data-react-managed="1"
                    value={dkBasis}
                    onChange={(e) => setDkBasis(e.target.value)}
                  >
                    <option value="360">Bank (360 hari)</option>
                    <option value="365">Aktual (365 hari)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="table-card">
            <div className="table-header">
              <div className="table-title">Hasil Diskonto</div>
            </div>
            <div
              id="dk-hasil"
              style={{ padding: "16px", color: "var(--muted)", fontSize: "13px" }}
            >
              {!diskontoRes ? (
                "Isi parameter."
              ) : (
                <>
                  <CalcResultRow
                    label="Nilai Nominal Wesel"
                    value={fmtRp(diskontoRes.data.nominal)}
                  />
                  {diskontoRes.hasBungaWesel && (
                    <CalcResultRow
                      label="Bunga Wesel"
                      value={fmtRp(diskontoRes.data.bungaWesel)}
                    />
                  )}
                  <CalcResultRow
                    label="Nilai Jatuh Tempo"
                    value={fmtRp(diskontoRes.data.nilaiJatuhTempo)}
                  />
                  <CalcResultRow
                    label="Diskonto"
                    value={fmtRp(diskontoRes.data.diskonto)}
                  />
                  <CalcResultRow
                    label="Hasil Bersih Diterima"
                    value={
                      <span
                        style={{ color: "var(--accent-text)", fontSize: "18px" }}
                      >
                        {fmtRp(diskontoRes.data.hasilBersih)}
                      </span>
                    }
                  />
                  <CalcResultRow
                    label="Tarif Efektif"
                    value={fmtPct(diskontoRes.data.tarifEfektifPct)}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
