"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building,
  CheckCircle2,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Info,
  NotebookPen,
  Printer,
  Receipt,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  JENIS_JURNAL,
  jurnalPembelianAktif,
  rekapPpnJurnal,
} from "@/lib/shared/accounting";
import { fmtRp as rp } from "@/lib/shared/format";
import {
  hitungPPh21OtomatisCalc,
  hitungPPh23OtomatisCalc,
  hitungRekapPajakBulan,
  printRekapPajakPDF,
} from "@/lib/fitur-baru/fitur-tambahan";
import {
  callOasGlobal,
  readAkuns,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";
import type { Akun, JurnalEntry } from "@/types";

function buildMonthOptions(): Array<{ val: string; lbl: string }> {
  const now = new Date();
  const list: Array<{ val: string; lbl: string }> = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const lbl = d.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    list.push({ val, lbl });
  }
  return list;
}

export default function PajakPage() {
  const [entries, setEntries] = useState<JurnalEntry[]>([]);
  const [akuns, setAkuns] = useState<Akun[]>([]);

  // PPh 21
  const [pph21Gaji, setPph21Gaji] = useState("");
  const [pph21Karyawan, setPph21Karyawan] = useState("1");

  // PPh 23
  const [pph23Jenis, setPph23Jenis] = useState("jasa");
  const [pph23Bruto, setPph23Bruto] = useState("");

  // Rekap siap setor bulan
  const monthOptions = useMemo(() => buildMonthOptions(), []);
  const [selectedBulan, setSelectedBulan] = useState(
    () => monthOptions[0]?.val || ""
  );

  const syncFromStore = useCallback(() => {
    setEntries([...readJurnalEntries()]);
    setAkuns([...readAkuns()]);
  }, []);

  const handleBuatJurnalPPh21 = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "membuat jurnal PPh 21") === true) {
      return;
    }
    const gajiBruto = parseFloat(pph21Gaji) || 0;
    const jmlKaryawan = parseInt(pph21Karyawan, 10) || 1;
    if (!gajiBruto) {
      callOasGlobal("showAlert", "Masukkan gaji bruto terlebih dahulu");
      return;
    }
    const calc = hitungPPh21OtomatisCalc(gajiBruto, jmlKaryawan);
    const pphReal = Math.round(calc.totalPphBulan);
    const totalGaji = gajiBruto * jmlKaryawan;
    const currentAkuns = readAkuns();
    const bebanAkun =
      currentAkuns.find(
        (a) => a.tipe === "Beban" && a.nama.toLowerCase().includes("gaji")
      ) || currentAkuns.find((a) => a.tipe === "Beban");
    const hutangAkun =
      currentAkuns.find((a) => a.kode === "2302") ||
      currentAkuns.find((a) => a.tipe === "Liabilitas") ||
      currentAkuns.find((a) => a.kode === "2101");
    const kasAkun = currentAkuns.find((a) => a.kode === "1101");
    if (!bebanAkun || !kasAkun) {
      callOasGlobal("showAlert", "Akun beban gaji / kas tidak ditemukan");
      return;
    }
    const entry = {
      id: `JRN_PPH21_${Date.now()}`,
      tanggal: new Date().toISOString().split("T")[0],
      jenis: JENIS_JURNAL.GAJI_PPH21,
      keterangan: `Gaji & PPh 21 · ${jmlKaryawan} karyawan`,
      lines: [
        { akun: bebanAkun.kode, debit: totalGaji, kredit: 0 },
        ...(hutangAkun && pphReal > 0
          ? [{ akun: hutangAkun.kode, debit: 0, kredit: pphReal }]
          : []),
        { akun: kasAkun.kode, debit: 0, kredit: Math.max(0, totalGaji - pphReal) },
      ],
    };
    if (!callOasGlobal("postJurnalLegacy", entry)) return;
    callOasGlobal("saveToStorage", false);
    callOasGlobal("auditLog", "create", "pajak", "Buat Jurnal PPh 21", {
      ref: "PPH21",
    });
    syncFromStore();
    callOasGlobal(
      "showAlert",
      `Jurnal PPh 21 dibuat! Gaji bersih: ${rp(totalGaji - pphReal)}, PPh 21: ${rp(pphReal)}`
    );
  }, [pph21Gaji, pph21Karyawan, syncFromStore]);

  const handleBuatJurnalPPh23 = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "membuat jurnal PPh 23") === true) {
      return;
    }
    const bruto = parseFloat(pph23Bruto) || 0;
    if (!bruto) {
      callOasGlobal("showAlert", "Masukkan nilai bruto");
      return;
    }
    const { tarif, pph, neto } = hitungPPh23OtomatisCalc(pph23Jenis, bruto);
    const currentAkuns = readAkuns();
    const kasAkun = currentAkuns.find((a) => a.kode === "1101");
    const pendAkun = currentAkuns.find((a) => a.tipe === "Pendapatan");
    const hutangAkun =
      currentAkuns.find((a) => a.kode === "2303") ||
      currentAkuns.find((a) => a.tipe === "Liabilitas");
    if (!kasAkun || !pendAkun) {
      callOasGlobal("showAlert", "Akun tidak ditemukan");
      return;
    }
    const entry = {
      id: `JRN_PPH23_${Date.now()}`,
      tanggal: new Date().toISOString().split("T")[0],
      jenis: JENIS_JURNAL.PPH23,
      keterangan: `PPh 23 · ${pph23Jenis} (${(tarif * 100).toFixed(0)}%)`,
      lines: [
        { akun: kasAkun.kode, debit: neto, kredit: 0 },
        ...(hutangAkun ? [{ akun: hutangAkun.kode, debit: pph, kredit: 0 }] : []),
        { akun: pendAkun.kode, debit: 0, kredit: bruto },
      ],
    };
    if (!callOasGlobal("postJurnalLegacy", entry)) return;
    callOasGlobal("saveToStorage", false);
    callOasGlobal("auditLog", "create", "pajak", "Buat Jurnal PPh 23", {
      ref: "PPH23",
    });
    syncFromStore();
    callOasGlobal(
      "showAlert",
      `Jurnal PPh 23 dibuat! Bruto: ${rp(bruto)}, PPh: ${rp(pph)}, Neto: ${rp(neto)}`
    );
  }, [pph23Bruto, pph23Jenis, syncFromStore]);

  const handlePrintPdf = useCallback(() => {
    printRekapPajakPDF(selectedBulan, readJurnalEntries(), readAkuns());
  }, [selectedBulan]);

  useEffect(() => {
    syncFromStore();
    setOasWindowFn(
      "renderPajakOtomatis",
      syncFromStore as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "renderRekapSiapSetor",
      syncFromStore as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "initRekapPajakBulanSelect",
      syncFromStore as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "exportRekapPajakPDF",
      handlePrintPdf as (...args: never[]) => unknown
    );
  }, [handlePrintPdf, syncFromStore]);

  const rekapPpn = useMemo(
    () => rekapPpnJurnal(entries, akuns),
    [akuns, entries]
  );

  const sptTotals = useMemo(() => {
    const totalPenjualan = entries
      .filter((j) => j.jenis === "Penjualan")
      .reduce(
        (s, j) =>
          s +
          (j.lines || []).reduce((ss, l) => {
            const a = akuns.find((x) => x.kode === l.akun);
            return ss + (a && a.tipe === "Pendapatan" ? l.kredit || 0 : 0);
          }, 0),
        0
      );
    const totalPembelian = jurnalPembelianAktif(entries).reduce(
      (s, j) =>
        s +
        (j.lines || []).reduce((ss, l) => {
          const a = akuns.find((x) => x.kode === l.akun);
          return (
            ss + (a && (a.tipe === "HPP" || a.tipe === "Beban") ? l.debit || 0 : 0)
          );
        }, 0),
      0
    );
    return { totalPenjualan, totalPembelian };
  }, [akuns, entries]);

  const allPpnRows = useMemo(() => {
    return [
      ...rekapPpn.rowsKeluaran.map((r) => ({
        ...r,
        tipe: "Keluaran" as const,
      })),
      ...rekapPpn.rowsMasukan.map((r) => ({
        ...r,
        tipe: "Masukan" as const,
      })),
    ].sort((a, b) => (a.j.tanggal || "").localeCompare(b.j.tanggal || ""));
  }, [rekapPpn]);

  const pph21Calc = useMemo(
    () =>
      hitungPPh21OtomatisCalc(
        parseFloat(pph21Gaji) || 0,
        parseInt(pph21Karyawan, 10) || 1
      ),
    [pph21Gaji, pph21Karyawan]
  );

  const pph23Calc = useMemo(
    () => hitungPPh23OtomatisCalc(pph23Jenis, parseFloat(pph23Bruto) || 0),
    [pph23Bruto, pph23Jenis]
  );

  const rekapBulan = useMemo(
    () => hitungRekapPajakBulan(selectedBulan, entries, akuns),
    [akuns, entries, selectedBulan]
  );

  const ppnKurang = rekapPpn.kurangBayar;
  const yr = new Date().getFullYear();

  return (
    <div className="page" id="page-pajak" data-react-managed="1">
      <div className="section-header page-actions-only">
        <button
          type="button"
          className="btn btn-primary"
          onClick={syncFromStore}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <RefreshCw size={15} /> Hitung Ulang
        </button>
      </div>

      <div className="oas-kpi-strip" id="pajak-kpi">
        <div className="oas-kpi-cell">
          <span className="oas-kpi-label">
            {ppnKurang > 0 ? "PPN kurang bayar" : "PPN lebih bayar"}
          </span>
          <span
            className="oas-kpi-val"
            style={{ color: ppnKurang > 0 ? "var(--warn)" : "var(--green)" }}
          >
            {rp(Math.abs(ppnKurang))}
          </span>
        </div>
        <div className="oas-kpi-cell">
          <span className="oas-kpi-label">PPN keluaran</span>
          <span className="oas-kpi-val" style={{ color: "var(--text)" }}>
            {rp(rekapPpn.keluaran)}
          </span>
        </div>
        <div className="oas-kpi-cell">
          <span className="oas-kpi-label">PPN masukan</span>
          <span className="oas-kpi-val" style={{ color: "var(--text)" }}>
            {rp(rekapPpn.masukan)}
          </span>
        </div>
        <div className="oas-kpi-cell">
          <span className="oas-kpi-label">Transaksi PPN</span>
          <span className="oas-kpi-val" style={{ color: "var(--accent-text)" }}>
            {rekapPpn.rowsKeluaran.length + rekapPpn.rowsMasukan.length} jurnal
          </span>
        </div>
      </div>

      <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Receipt size={15} /> PPN Keluaran &amp; Masukan
            </div>
          </div>
          <div style={{ padding: "16px" }} id="pajak-ppn-detail">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div
                style={{
                  background: "var(--surface2)",
                  borderRadius: "10px",
                  padding: "14px",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginBottom: "6px",
                  }}
                >
                  PPN KELUARAN (dari penjualan berPPN)
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "var(--red)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  {rp(rekapPpn.keluaran)}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  DPP: {rp(rekapPpn.dppKeluaran)} · {rekapPpn.rowsKeluaran.length}{" "}
                  transaksi · Tarif per produk
                </div>
              </div>

              <div
                style={{
                  background: "var(--surface2)",
                  borderRadius: "10px",
                  padding: "14px",
                  border: "1px solid var(--border)",
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginBottom: "6px",
                  }}
                >
                  PPN MASUKAN (dari pembelian berPPN)
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: "var(--accent)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  {rp(rekapPpn.masukan)}
                </div>
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginTop: "4px",
                  }}
                >
                  DPP: {rp(rekapPpn.dppMasukan)} · {rekapPpn.rowsMasukan.length}{" "}
                  transaksi · Tarif per produk
                </div>
                {rekapPpn.rowsMasukan.length === 0 ? (
                  <div
                    style={{
                      fontSize: "11px",
                      color: "var(--muted)",
                      marginTop: "6px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Info size={12} style={{ color: "var(--accent2)" }} /> Belum
                    ada pembelian produk ber-PPN.
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  background:
                    ppnKurang > 0
                      ? "rgba(248,113,113,0.1)"
                      : "rgba(74,222,128,0.1)",
                  borderRadius: "10px",
                  padding: "14px",
                  border: `1px solid ${
                    ppnKurang > 0
                      ? "rgba(248,113,113,0.3)"
                      : "rgba(74,222,128,0.3)"
                  }`,
                }}
              >
                <div
                  style={{
                    fontSize: "11px",
                    color: "var(--muted)",
                    marginBottom: "6px",
                  }}
                >
                  {ppnKurang > 0 ? "PPN KURANG BAYAR" : "PPN LEBIH BAYAR"}
                </div>
                <div
                  style={{
                    fontSize: "22px",
                    fontWeight: 700,
                    color: ppnKurang > 0 ? "var(--red)" : "var(--accent)",
                    fontFamily: "var(--mono)",
                  }}
                >
                  {rp(Math.abs(ppnKurang))}
                </div>
              </div>

              {rekapPpn.rowsKeluaran.length + rekapPpn.rowsMasukan.length ===
              0 ? (
                <div
                  style={{
                    background: "rgba(34,211,238,0.06)",
                    border: "1px solid rgba(34,211,238,0.2)",
                    borderRadius: "10px",
                    padding: "12px 14px",
                    fontSize: "12px",
                    color: "var(--muted)",
                  }}
                >
                  Belum ada transaksi kena PPN. Set tarif PPN di{" "}
                  <b>Master Produk</b> atau centang PPN saat membuat invoice.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Users size={15} /> PPh 21 Karyawan
            </div>
          </div>
          <div className="modal-body">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="pph21-gaji">Total Gaji Bruto/Bulan</label>
                <input
                  type="number"
                  id="pph21-gaji"
                  placeholder="10000000"
                  value={pph21Gaji}
                  onChange={(e) => setPph21Gaji(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="pph21-karyawan">Jumlah Karyawan</label>
                <input
                  type="number"
                  id="pph21-karyawan"
                  placeholder="5"
                  value={pph21Karyawan}
                  onChange={(e) => setPph21Karyawan(e.target.value)}
                />
              </div>
            </div>
            {parseFloat(pph21Gaji) > 0 ? (
              <div
                style={{
                  marginTop: "8px",
                  background: "var(--surface2)",
                  borderRadius: "10px",
                  padding: "14px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                }}
              >
                {[
                  ["PKP Setahun", rp(pph21Calc.pkp)],
                  ["PPh 21 Setahun", rp(pph21Calc.pphSetahun)],
                  ["PPh 21/Bulan/Karyawan", rp(pph21Calc.pphBulanPerKaryawan)],
                  ["Total PPh 21/Bulan", rp(pph21Calc.totalPphBulan)],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                      {label}
                    </span>
                    <span
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "12px",
                        fontWeight: 600,
                        color: "var(--accent3)",
                      }}
                    >
                      {val}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: "100%",
                marginTop: "12px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
              onClick={handleBuatJurnalPPh21}
            >
              <NotebookPen size={14} /> Buat Jurnal PPh 21
            </button>
          </div>
        </div>
      </div>

      <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Building size={15} /> PPh 23 (Jasa &amp; Royalti)
            </div>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="pph23-jenis">Jenis Penghasilan</label>
              <select
                id="pph23-jenis"
                style={{ width: "100%" }}
                value={pph23Jenis}
                onChange={(e) => setPph23Jenis(e.target.value)}
              >
                <option value="jasa">Jasa (2%)</option>
                <option value="royalti">Royalti (15%)</option>
                <option value="sewa">Sewa Harta (2%)</option>
                <option value="dividen">Dividen (15%)</option>
                <option value="bunga">Bunga (15%)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: "8px" }}>
              <label htmlFor="pph23-bruto">Nilai Bruto</label>
              <input
                type="number"
                id="pph23-bruto"
                placeholder="5000000"
                value={pph23Bruto}
                onChange={(e) => setPph23Bruto(e.target.value)}
              />
            </div>
            {parseFloat(pph23Bruto) > 0 ? (
              <div
                style={{
                  marginTop: "8px",
                  background: "var(--surface2)",
                  borderRadius: "10px",
                  padding: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    PPh 23 ({(pph23Calc.tarif * 100).toFixed(0)}%)
                  </div>
                  <div
                    style={{
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "var(--accent3)",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    {rp(pph23Calc.pph)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Neto Diterima
                  </div>
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "var(--accent)",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    {rp(pph23Calc.neto)}
                  </div>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: "100%",
                marginTop: "12px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
              onClick={handleBuatJurnalPPh23}
            >
              <NotebookPen size={14} /> Buat Jurnal PPh 23
            </button>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <FileText size={15} /> Ringkasan SPT Tahunan
            </div>
          </div>
          <div style={{ padding: "16px" }} id="pajak-spt-summary">
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                marginBottom: "12px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
              }}
            >
              <FileText size={14} /> Ringkasan SPT {yr}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                ["Penghasilan Bruto", rp(sptTotals.totalPenjualan), "var(--accent)"],
                ["HPP & Biaya", rp(sptTotals.totalPembelian), "var(--red)"],
                [
                  "Penghasilan Neto",
                  rp(sptTotals.totalPenjualan - sptTotals.totalPembelian),
                  sptTotals.totalPenjualan - sptTotals.totalPembelian >= 0
                    ? "var(--accent)"
                    : "var(--red)",
                ],
                ["PPN Wajib Bayar", rp(Math.max(0, ppnKurang)), "var(--accent3)"],
              ].map(([l, v, c]) => (
                <div
                  key={l}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 10px",
                    background: "var(--surface2)",
                    borderRadius: "8px",
                  }}
                >
                  <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                    {l}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: "13px",
                      color: c,
                      fontWeight: 600,
                    }}
                  >
                    {v}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Rekap Pajak Siap Setor ── */}
      <div className="table-card">
        <div className="table-header" style={{ flexWrap: "wrap", gap: "8px" }}>
          <div
            className="table-title"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <FileSpreadsheet size={15} /> Rekap Pajak Siap Setor
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              id="pajak-setor-bulan"
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(e.target.value)}
              style={{
                minWidth: "160px",
                background: "var(--surface2)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "6px 10px",
                color: "var(--text)",
                fontSize: "12.5px",
              }}
            >
              {monthOptions.map((m) => (
                <option key={m.val} value={m.val}>
                  {m.lbl}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={handlePrintPdf}
              style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
            >
              <Printer size={14} /> Cetak PDF
            </button>
          </div>
        </div>

        <div id="rekap-setor-content" style={{ padding: "16px" }}>
          {rekapBulan ? (
            <>
              <div
                style={{
                  border: "2px solid var(--accent2)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  marginBottom: "16px",
                }}
              >
                <div
                  style={{
                    background: "rgba(34,211,238,0.08)",
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>
                    SPT Masa PPN · {rekapBulan.blnLabel}
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--muted)" }}>
                    Formulir 1111
                  </span>
                </div>
                <div
                  style={{
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                          fontWeight: 600,
                        }}
                      >
                        BAGIAN I · PENYERAHAN BKP/JKP
                      </div>
                      <div
                        style={{
                          background: "var(--surface2)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            Jumlah Transaksi
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            {rekapBulan.rekapPpn.rowsKeluaran.length} faktur
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            DPP
                          </span>
                          <span
                            style={{ fontFamily: "var(--mono)", fontSize: "13px" }}
                          >
                            {rp(rekapBulan.rekapPpn.dppKeluaran)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            paddingTop: "6px",
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <span style={{ fontSize: "12px", fontWeight: 700 }}>
                            PPN Keluaran
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "14px",
                              fontWeight: 700,
                              color: "var(--red)",
                            }}
                          >
                            {rp(rekapBulan.ppnKeluar)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "11px",
                          color: "var(--muted)",
                          marginBottom: "4px",
                          fontWeight: 600,
                        }}
                      >
                        BAGIAN II · PEROLEHAN BKP/JKP
                      </div>
                      <div
                        style={{
                          background: "var(--surface2)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            Jumlah Transaksi
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            {rekapBulan.rekapPpn.rowsMasukan.length} faktur
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            marginBottom: "6px",
                          }}
                        >
                          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
                            DPP
                          </span>
                          <span
                            style={{ fontFamily: "var(--mono)", fontSize: "13px" }}
                          >
                            {rp(rekapBulan.rekapPpn.dppMasukan)}
                          </span>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            paddingTop: "6px",
                            borderTop: "1px solid var(--border)",
                          }}
                        >
                          <span style={{ fontSize: "12px", fontWeight: 700 }}>
                            PPN Masukan
                          </span>
                          <span
                            style={{
                              fontFamily: "var(--mono)",
                              fontSize: "14px",
                              fontWeight: 700,
                              color: "var(--accent)",
                            }}
                          >
                            {rp(rekapBulan.ppnMasuk)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      background:
                        rekapBulan.kurangBayar > 0
                          ? "rgba(248,113,113,0.08)"
                          : "rgba(74,222,128,0.08)",
                      border: `1px solid ${
                        rekapBulan.kurangBayar > 0
                          ? "rgba(248,113,113,0.3)"
                          : "rgba(74,222,128,0.3)"
                      }`,
                      borderRadius: "8px",
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: "12px",
                          color: "var(--muted)",
                          marginBottom: "2px",
                        }}
                      >
                        {rekapBulan.kurangBayar > 0
                          ? "PPN KURANG BAYAR (WAJIB SETOR)"
                          : "PPN LEBIH BAYAR (DAPAT DIKOMPENSASI)"}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                        Batas setor: tgl 15 bulan berikutnya
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: "22px",
                        fontWeight: 800,
                        color:
                          rekapBulan.kurangBayar > 0
                            ? "var(--red)"
                            : "var(--accent)",
                      }}
                    >
                      {rp(Math.abs(rekapBulan.kurangBayar))}
                    </div>
                  </div>
                </div>
              </div>

              <div
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "var(--surface2)",
                    padding: "10px 16px",
                  }}
                >
                  <div style={{ fontSize: "14px", fontWeight: 700 }}>
                    Estimasi PPh Badan · {rekapBulan.blnLabel}
                  </div>
                </div>
                <div
                  style={{
                    padding: "14px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  {[
                    ["Penghasilan Bruto", rekapBulan.bruto, "var(--accent)"],
                    ["Biaya-biaya", rekapBulan.biaya, "var(--red)"],
                    [
                      "Laba Bersih Estimasi",
                      rekapBulan.laba,
                      rekapBulan.laba >= 0 ? "var(--text)" : "var(--red)",
                    ],
                    [
                      "Estimasi PPh Badan (22%)",
                      rekapBulan.pphBadan,
                      "var(--accent3)",
                    ],
                  ].map(([label, val, clr]) => (
                    <div
                      key={String(label)}
                      style={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <span style={{ fontSize: "13px", color: "var(--muted)" }}>
                        {label}
                      </span>
                      <span
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: "13px",
                          fontWeight: 600,
                          color: String(clr),
                        }}
                      >
                        {rp(Number(val))}
                      </span>
                    </div>
                  ))}
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "11px",
                      color: "var(--muted)",
                      background: "rgba(245,158,11,0.07)",
                      borderRadius: "6px",
                      padding: "8px 10px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <AlertTriangle
                      size={13}
                      style={{ color: "var(--accent3)", flexShrink: 0 }}
                    />
                    Estimasi saja. Konsultasikan dengan akuntan/konsultan pajak
                    untuk perhitungan resmi.
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>

      <div className="table-card">
        <div className="table-header">
          <div
            className="table-title"
            style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
          >
            <ClipboardList size={15} /> Riwayat Transaksi Kena Pajak
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Keterangan</th>
                <th>Bruto</th>
                <th>Jenis Pajak</th>
                <th>Tarif</th>
                <th>Nilai Pajak</th>
                <th>Jurnal</th>
              </tr>
            </thead>
            <tbody id="pajak-tbody">
              {allPpnRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    style={{
                      textAlign: "center",
                      color: "var(--muted)",
                      padding: "32px",
                    }}
                  >
                    Belum ada transaksi kena PPN. Set tarif PPN di Master Produk
                    atau centang PPN saat membuat invoice.
                  </td>
                </tr>
              ) : (
                allPpnRows.slice(0, 50).map((row, idx) => {
                  const isKeluaran = row.tipe === "Keluaran";
                  return (
                    <tr key={`${row.j.no || row.j.tanggal}-${idx}`}>
                      <td style={{ fontSize: "12px", fontFamily: "var(--mono)" }}>
                        {row.j.tanggal}
                      </td>
                      <td style={{ fontSize: "12px" }}>
                        {row.j.ket || row.j.keterangan || "-"}
                      </td>
                      <td style={{ fontFamily: "var(--mono)" }}>{rp(row.dpp)}</td>
                      <td>
                        <span
                          style={{
                            background: isKeluaran
                              ? "rgba(248,113,113,0.1)"
                              : "rgba(74,222,128,0.1)",
                            color: isKeluaran ? "var(--red)" : "var(--accent)",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                          }}
                        >
                          PPN {row.tipe}
                        </span>
                      </td>
                      <td style={{ fontFamily: "var(--mono)" }}>
                        {row.tarifPct}%
                      </td>
                      <td
                        style={{
                          fontFamily: "var(--mono)",
                          color: "var(--accent3)",
                        }}
                      >
                        {rp(row.ppnVal)}
                      </td>
                      <td>
                        <span
                          style={{
                            background: "rgba(74,222,128,0.1)",
                            color: "var(--accent)",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "11px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                          }}
                        >
                          <CheckCircle2 size={12} /> Otomatis
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
