"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  Droplets,
  Dumbbell,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { hitungRasioPure } from "@/lib/kalkulator";
import { CalcNumberInput } from "./CalcNumberInput";
import { RasioTableRow } from "./RasioTableRow";
import { fmtPct } from "./fmtPct";
import { fmtRp } from "./fmtRp";

export default function KalkRasioPage() {
  const [kas, setKas] = useState("");
  const [piutang, setPiutang] = useState("");
  const [persediaan, setPersediaan] = useState("");
  const [asetLancarManual, setAsetLancarManual] = useState("");
  const [asetTetap, setAsetTetap] = useState("");
  const [totalAsetManual, setTotalAsetManual] = useState("");
  const [utangLancar, setUtangLancar] = useState("");
  const [utangPanjang, setUtangPanjang] = useState("");
  const [totalLiabManual, setTotalLiabManual] = useState("");
  const [ekuitas, setEkuitas] = useState("");
  const [penjualan, setPenjualan] = useState("");
  const [hpp, setHpp] = useState("");
  const [labaKotorManual, setLabaKotorManual] = useState("");
  const [ebit, setEbit] = useState("");
  const [bebanBunga, setBebanBunga] = useState("");
  const [labaBersihManual, setLabaBersihManual] = useState("");
  const [saham, setSaham] = useState("");
  const [hargaSaham, setHargaSaham] = useState("");

  useEffect(() => {
    const read = (id: string) =>
      (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";

    const onSync = (ev: Event) => {
      const detail = (ev as CustomEvent<{ kind?: string }>).detail;
      if (detail?.kind !== "rasio") return;
      setKas(read("rs-kas"));
      setPiutang(read("rs-piutang"));
      setPersediaan(read("rs-persediaan"));
      setAsetLancarManual(read("rs-aset-lancar"));
      setAsetTetap(read("rs-aset-tetap"));
      setTotalAsetManual(read("rs-total-aset"));
      setUtangLancar(read("rs-utang-lancar"));
      setUtangPanjang(read("rs-utang-panjang"));
      setTotalLiabManual(read("rs-total-liab"));
      setEkuitas(read("rs-ekuitas"));
      setPenjualan(read("rs-penjualan"));
      setHpp(read("rs-hpp"));
      setLabaKotorManual(read("rs-laba-kotor"));
      setEbit(read("rs-ebit"));
      setBebanBunga(read("rs-beban-bunga"));
      setLabaBersihManual(read("rs-laba-bersih"));
      setSaham(read("rs-saham"));
      setHargaSaham(read("rs-harga-saham"));
    };

    window.addEventListener("oas:kalk-sync", onSync);
    return () => window.removeEventListener("oas:kalk-sync", onSync);
  }, []);

  const hasAnyInput =
    kas ||
    piutang ||
    persediaan ||
    asetLancarManual ||
    asetTetap ||
    totalAsetManual ||
    utangLancar ||
    utangPanjang ||
    totalLiabManual ||
    ekuitas ||
    penjualan ||
    hpp ||
    labaKotorManual ||
    ebit ||
    bebanBunga ||
    labaBersihManual ||
    saham ||
    hargaSaham;

  const res = useMemo(() => {
    if (!hasAnyInput) return null;
    const n = (v: string) => parseFloat(v) || 0;
    return hitungRasioPure({
      kas: n(kas),
      piutang: n(piutang),
      persediaan: n(persediaan),
      asetLancar: n(asetLancarManual),
      asetTetap: n(asetTetap),
      totalAset: n(totalAsetManual),
      utangLancar: n(utangLancar),
      utangPanjang: n(utangPanjang),
      totalLiab: n(totalLiabManual),
      ekuitas: n(ekuitas),
      penjualan: n(penjualan),
      hpp: n(hpp),
      labaKotor: n(labaKotorManual),
      ebit: n(ebit),
      bebanBunga: n(bebanBunga),
      labaBersih: n(labaBersihManual),
      saham: n(saham),
      hargaSaham: n(hargaSaham),
    });
  }, [
    hasAnyInput,
    kas,
    piutang,
    persediaan,
    asetLancarManual,
    asetTetap,
    totalAsetManual,
    utangLancar,
    utangPanjang,
    totalLiabManual,
    ekuitas,
    penjualan,
    hpp,
    labaKotorManual,
    ebit,
    bebanBunga,
    labaBersihManual,
    saham,
    hargaSaham,
  ]);

  const lbManualVal = parseFloat(labaBersihManual) || 0;

  return (
    <div className="page" id="page-kalk-rasio" data-react-managed="1">
      <div className="section-header">
        <div>
          <div className="section-title">Kalkulator Rasio Keuangan</div>
          <div className="section-sub">
            Likuiditas · Solvabilitas · Profitabilitas · Aktivitas · Pasar
          </div>
        </div>
      </div>

      <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
        <div>
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
                <ClipboardList size={16} strokeWidth={2} /> Input Laporan
                Keuangan
              </div>
            </div>
            <div className="modal-body">
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                NERACA
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rs-kas">Kas &amp; Setara Kas</label>
                  <CalcNumberInput
                    id="rs-kas"
                    value={kas}
                    onChange={setKas}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rs-piutang">Piutang Usaha</label>
                  <CalcNumberInput
                    id="rs-piutang"
                    value={piutang}
                    onChange={setPiutang}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rs-persediaan">Persediaan</label>
                  <CalcNumberInput
                    id="rs-persediaan"
                    value={persediaan}
                    onChange={setPersediaan}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rs-aset-lancar">
                    Aset Lancar Total{" "}
                    <span style={{ color: "var(--primary)", fontSize: "11px" }}>
                      (otomatis)
                    </span>
                  </label>
                  <CalcNumberInput
                    id="rs-aset-lancar"
                    value={asetLancarManual}
                    onChange={setAsetLancarManual}
                    placeholder={
                      res && res.asetLancar > 0
                        ? res.asetLancar.toLocaleString("id-ID")
                        : "= Kas + Piutang + Persediaan"
                    }
                    style={{ background: "var(--surface2)" }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rs-aset-tetap">Aset Tetap (Neto)</label>
                  <CalcNumberInput
                    id="rs-aset-tetap"
                    value={asetTetap}
                    onChange={setAsetTetap}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rs-total-aset">
                    Total Aset{" "}
                    <span style={{ color: "var(--primary)", fontSize: "11px" }}>
                      (otomatis)
                    </span>
                  </label>
                  <CalcNumberInput
                    id="rs-total-aset"
                    value={totalAsetManual}
                    onChange={setTotalAsetManual}
                    placeholder={
                      res && res.totalAset > 0
                        ? res.totalAset.toLocaleString("id-ID")
                        : "= Aset Lancar + Aset Tetap"
                    }
                    style={{ background: "var(--surface2)" }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rs-utang-lancar">Utang Lancar</label>
                  <CalcNumberInput
                    id="rs-utang-lancar"
                    value={utangLancar}
                    onChange={setUtangLancar}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rs-utang-panjang">
                    Utang Jangka Panjang
                  </label>
                  <CalcNumberInput
                    id="rs-utang-panjang"
                    value={utangPanjang}
                    onChange={setUtangPanjang}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rs-total-liab">
                    Total Liabilitas{" "}
                    <span style={{ color: "var(--primary)", fontSize: "11px" }}>
                      (otomatis)
                    </span>
                  </label>
                  <CalcNumberInput
                    id="rs-total-liab"
                    value={totalLiabManual}
                    onChange={setTotalLiabManual}
                    placeholder={
                      res && res.totalLiab > 0
                        ? res.totalLiab.toLocaleString("id-ID")
                        : "= Utang Lancar + Utang Panjang"
                    }
                    style={{ background: "var(--surface2)" }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rs-ekuitas">Total Ekuitas</label>
                  <CalcNumberInput
                    id="rs-ekuitas"
                    value={ekuitas}
                    onChange={setEkuitas}
                    placeholder="0"
                  />
                </div>
              </div>

              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--accent)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  margin: "14px 0 10px",
                }}
              >
                LABA RUGI
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rs-penjualan">
                    Pendapatan / Penjualan
                  </label>
                  <CalcNumberInput
                    id="rs-penjualan"
                    value={penjualan}
                    onChange={setPenjualan}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rs-hpp">HPP</label>
                  <CalcNumberInput
                    id="rs-hpp"
                    value={hpp}
                    onChange={setHpp}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rs-laba-kotor">
                    Laba Kotor{" "}
                    <span style={{ color: "var(--primary)", fontSize: "11px" }}>
                      (otomatis)
                    </span>
                  </label>
                  <CalcNumberInput
                    id="rs-laba-kotor"
                    value={labaKotorManual}
                    onChange={setLabaKotorManual}
                    placeholder={
                      res && res.labaKotor > 0
                        ? res.labaKotor.toLocaleString("id-ID")
                        : "= Penjualan - HPP"
                    }
                    style={{ background: "var(--surface2)" }}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rs-ebit">EBIT (Laba Operasi)</label>
                  <CalcNumberInput
                    id="rs-ebit"
                    value={ebit}
                    onChange={setEbit}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rs-beban-bunga">Beban Bunga</label>
                  <CalcNumberInput
                    id="rs-beban-bunga"
                    value={bebanBunga}
                    onChange={setBebanBunga}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rs-laba-bersih">
                    Laba Bersih (EAT){" "}
                    <span style={{ color: "var(--primary)", fontSize: "11px" }}>
                      (otomatis jika EBIT diisi)
                    </span>
                  </label>
                  <CalcNumberInput
                    id="rs-laba-bersih"
                    value={labaBersihManual}
                    onChange={setLabaBersihManual}
                    placeholder={
                      res && res.labaBersihFinal > 0 && lbManualVal === 0
                        ? res.labaBersihFinal.toLocaleString("id-ID")
                        : "= EBIT - Beban Bunga"
                    }
                    style={{ background: "var(--surface2)" }}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="rs-saham">Jml Saham Beredar</label>
                  <CalcNumberInput
                    id="rs-saham"
                    value={saham}
                    onChange={setSaham}
                    placeholder="0"
                    showCurrencyHint={false}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="rs-harga-saham">Harga Saham (Rp)</label>
                  <CalcNumberInput
                    id="rs-harga-saham"
                    value={hargaSaham}
                    onChange={setHargaSaham}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          id="rasio-hasil"
          style={{ display: "flex", flexDirection: "column", gap: "16px" }}
        >
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
                <Droplets size={16} strokeWidth={2} /> Rasio Likuiditas
              </div>
            </div>
            <table>
              <tbody id="rasio-likuiditas">
                {res && (
                  <>
                    <RasioTableRow
                      nama="Current Ratio"
                      nilai={res.currentRatio.toFixed(2)}
                      satuan="x"
                      benchmark={{ ok: 2, warn: 1 }}
                      keterangan="Baik ≥ 2x"
                    />
                    <RasioTableRow
                      nama="Quick Ratio"
                      nilai={res.quickRatio.toFixed(2)}
                      satuan="x"
                      benchmark={{ ok: 1, warn: 0.5 }}
                      keterangan="Baik ≥ 1x"
                    />
                    <RasioTableRow
                      nama="Cash Ratio"
                      nilai={res.cashRatio.toFixed(2)}
                      satuan="x"
                      benchmark={{ ok: 0.5, warn: 0.2 }}
                      keterangan="Baik ≥ 0.5x"
                    />
                    <RasioTableRow
                      nama="Net Working Capital"
                      nilai=""
                      rawText={fmtRp(res.netWorkingCapital)}
                      keterangan="Modal kerja bersih"
                    />
                  </>
                )}
              </tbody>
            </table>
          </div>

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
                <Dumbbell size={16} strokeWidth={2} /> Rasio Solvabilitas /
                Leverage
              </div>
            </div>
            <table>
              <tbody id="rasio-solvabilitas">
                {res && (
                  <>
                    <RasioTableRow
                      nama="Debt to Equity (DER)"
                      nilai={res.der.toFixed(2)}
                      satuan="x"
                      benchmark={{ ok: 1, warn: 2 }}
                      keterangan="Baik ≤ 1x"
                    />
                    <RasioTableRow
                      nama="Debt to Assets (DAR)"
                      nilai={fmtPct(res.dar * 100)}
                      benchmark={{ ok: 50, warn: 70 }}
                      keterangan="Baik < 50%"
                    />
                    <RasioTableRow
                      nama="Equity Multiplier"
                      nilai={res.equityMultiplier.toFixed(2)}
                      satuan="x"
                    />
                    {res.interestCoverage !== null && (
                      <RasioTableRow
                        nama="Interest Coverage (ICR)"
                        nilai={res.interestCoverage.toFixed(2)}
                        satuan="x"
                        benchmark={{ ok: 3, warn: 1.5 }}
                        keterangan="Baik ≥ 3x"
                      />
                    )}
                    <RasioTableRow
                      nama="Long-term Debt Ratio"
                      nilai={res.longTermDebtRatio.toFixed(2)}
                      satuan="x"
                      keterangan="Utang JP / (Utang JP + Ekuitas)"
                    />
                  </>
                )}
              </tbody>
            </table>
          </div>

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
                <TrendingUp size={16} strokeWidth={2} /> Rasio Profitabilitas
              </div>
            </div>
            <table>
              <tbody id="rasio-profitabilitas">
                {res && (
                  <>
                    <RasioTableRow
                      nama="Gross Profit Margin"
                      nilai={fmtPct(res.grossProfitMarginPct)}
                      benchmark={{ ok: 30, warn: 15 }}
                      keterangan="Baik ≥ 30%"
                    />
                    <RasioTableRow
                      nama="Net Profit Margin (NPM)"
                      nilai={fmtPct(res.netProfitMarginPct)}
                      benchmark={{ ok: 10, warn: 5 }}
                      keterangan="Baik ≥ 10%"
                    />
                    <RasioTableRow
                      nama="Return on Assets (ROA)"
                      nilai={fmtPct(res.roaPct)}
                      benchmark={{ ok: 5, warn: 2 }}
                      keterangan="Baik ≥ 5%"
                    />
                    <RasioTableRow
                      nama="Return on Equity (ROE)"
                      nilai={fmtPct(res.roePct)}
                      benchmark={{ ok: 15, warn: 8 }}
                      keterangan="Baik ≥ 15%"
                    />
                    <RasioTableRow
                      nama="EBIT Margin"
                      nilai={fmtPct(res.ebitMarginPct)}
                      benchmark={{ ok: 15, warn: 8 }}
                      keterangan="Laba operasi/penjualan"
                    />
                    <RasioTableRow
                      nama="Return on Sales"
                      nilai={fmtPct(res.netProfitMarginPct)}
                    />
                  </>
                )}
              </tbody>
            </table>
          </div>

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
                <RefreshCw size={16} strokeWidth={2} /> Rasio Aktivitas
              </div>
            </div>
            <table>
              <tbody id="rasio-aktivitas">
                {res && (
                  <>
                    <RasioTableRow
                      nama="Perputaran Piutang"
                      nilai={res.perputaranPiutang.toFixed(2)}
                      satuan="x"
                      benchmark={{ ok: 8, warn: 4 }}
                      keterangan="Makin tinggi makin baik"
                    />
                    <RasioTableRow
                      nama="Days Sales Outstanding (DSO)"
                      nilai={res.dso.toFixed(1)}
                      satuan="hari"
                      benchmark={{ ok: 45, warn: 60 }}
                      keterangan="Makin kecil makin baik"
                    />
                    <RasioTableRow
                      nama="Perputaran Persediaan"
                      nilai={res.perputaranPersediaan.toFixed(2)}
                      satuan="x"
                      benchmark={{ ok: 6, warn: 3 }}
                      keterangan="Makin tinggi makin baik"
                    />
                    <RasioTableRow
                      nama="Days of Inventory (DOH)"
                      nilai={res.doh.toFixed(1)}
                      satuan="hari"
                      keterangan="Rata-rata lama simpan"
                    />
                    <RasioTableRow
                      nama="Asset Turnover"
                      nilai={res.assetTurnover.toFixed(2)}
                      satuan="x"
                      benchmark={{ ok: 1, warn: 0.5 }}
                    />
                    <RasioTableRow
                      nama="Fixed Asset Turnover"
                      nilai={res.fixedAssetTurnover.toFixed(2)}
                      satuan="x"
                      benchmark={{ ok: 2, warn: 1 }}
                    />
                  </>
                )}
              </tbody>
            </table>
          </div>

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
                <BarChart3 size={16} strokeWidth={2} /> Rasio Pasar (Market)
              </div>
            </div>
            <table>
              <tbody id="rasio-pasar">
                {res && (
                  <>
                    <RasioTableRow
                      nama="EPS (Earning per Share)"
                      nilai=""
                      rawText={res.eps !== null ? fmtRp(res.eps) : "—"}
                      keterangan="Laba per lembar saham"
                    />
                    <RasioTableRow
                      nama="Price to Earning (PER)"
                      nilai={res.per !== null ? res.per.toFixed(2) : "—"}
                      satuan={res.per !== null ? "x" : ""}
                      benchmark={{ ok: 15, warn: 25 }}
                      keterangan="Valuasi saham"
                    />
                    <RasioTableRow
                      nama="Price to Book Value (PBV)"
                      nilai={res.pbv !== null ? res.pbv.toFixed(2) : "—"}
                      satuan={res.pbv !== null ? "x" : ""}
                      benchmark={{ ok: 1, warn: 3 }}
                      keterangan="Nilai pasar vs buku"
                    />
                    <RasioTableRow
                      nama="Book Value per Share"
                      nilai=""
                      rawText={res.bvps !== null ? fmtRp(res.bvps) : "—"}
                      keterangan="Nilai buku per saham"
                    />
                    <RasioTableRow
                      nama="Market Cap"
                      nilai=""
                      rawText={
                        res.marketCap !== null ? fmtRp(res.marketCap) : "—"
                      }
                      keterangan="Kapitalisasi pasar"
                    />
                    <RasioTableRow
                      nama="Dividend per Share"
                      nilai=""
                      rawText="—"
                      keterangan="Isi manual jika ada"
                    />
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
