"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Download,
  FolderOpen,
  HelpCircle,
  Search,
  Upload,
} from "lucide-react";
import { JENIS_JURNAL } from "@/lib/shared/accounting";
import { fmtRp as rp } from "@/lib/shared/format";
import {
  parseCSVBank,
  type RekonCsvRow,
} from "@/lib/fitur-baru/fitur-tambahan";
import {
  callOasGlobal,
  readAkuns,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";

export default function RekonsiliasiPage() {
  const [bank, setBank] = useState("bca");
  const [csvFileName, setCsvFileName] = useState(
    "Format: BCA/Mandiri/BNI/BRI/Generic"
  );
  const [csvRows, setCsvRows] = useState<RekonCsvRow[]>([]);
  const [processed, setProcessed] = useState(false);
  const [csvFilter, setCsvFilter] = useState<"all" | "cocok" | "belum" | "beda">(
    "all"
  );
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  const handleCsvChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setCsvFileName(file.name);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = String(ev.target?.result || "");
        const lines = text.split("\n").filter((l) => l.trim());
        const parsed = parseCSVBank(lines, bank);
        setCsvRows(parsed);
        setProcessed(false);
        callOasGlobal(
          "showAlert",
          `File ${file.name} berhasil dibaca: ${parsed.length} transaksi`
        );
      };
      reader.readAsText(file);
    },
    [bank]
  );

  const handleProsesRekon = useCallback(() => {
    if (!csvRows.length) {
      callOasGlobal("showAlert", "Upload CSV mutasi bank terlebih dahulu");
      return;
    }
    const entries = readJurnalEntries();
    const nextRows: RekonCsvRow[] = csvRows.map((b) => {
      const match = entries.find((j) => {
        if (j.tanggal !== b.tgl) return false;
        const totalLine = (j.lines || []).reduce(
          (s, l) => s + Math.max(l.debit || 0, l.kredit || 0),
          0
        );
        return Math.abs(totalLine - Math.abs(b.nominal)) < 1000;
      });
      if (match) {
        const totalLine = (match.lines || []).reduce(
          (s, l) => s + Math.max(l.debit || 0, l.kredit || 0),
          0
        );
        return {
          ...b,
          status: Math.abs(totalLine - Math.abs(b.nominal)) < 1 ? "cocok" : "beda",
          jurnalId: match.id || match.no || null,
          nominalJurnal: totalLine,
        };
      }
      return { ...b, status: "belum", jurnalId: null, nominalJurnal: undefined };
    });
    setCsvRows(nextRows);
    setProcessed(true);
    setCsvFilter("all");
    const cocok = nextRows.filter((b) => b.status === "cocok").length;
    const belum = nextRows.filter((b) => b.status === "belum").length;
    callOasGlobal(
      "auditLog",
      "create",
      "rekonsiliasi",
      "Proses rekonsiliasi bank",
      { ref: "REKON" }
    );
    callOasGlobal(
      "showAlert",
      `Rekonsiliasi selesai: ${cocok} cocok, ${belum} perlu perhatian`
    );
  }, [csvRows]);

  const handleImportSatu = useCallback(
    (idx: number) => {
      if (callOasGlobal("guardHanyaBaca", "mengimpor mutasi bank") === true) {
        return;
      }
      const target = csvRows[idx];
      if (!target) return;
      const akuns = readAkuns();
      const kas = akuns.find((a) => a.kode === "1101");
      const oth = akuns.find((a) => a.tipe === "Pendapatan");
      if (!kas || !oth) {
        callOasGlobal("showAlert", "Akun kas/pendapatan tidak ditemukan");
        return;
      }
      const masuk = target.nominal > 0;
      const absNom = Math.abs(target.nominal);
      const entry = {
        id: `JRN_REKON_${Date.now()}`,
        tanggal: target.tgl,
        jenis: JENIS_JURNAL.REKONSILIASI,
        keterangan: `[Rekon] ${target.ket}`,
        lines: masuk
          ? [
              { akun: kas.kode, debit: absNom, kredit: 0 },
              { akun: oth.kode, debit: 0, kredit: absNom },
            ]
          : [
              { akun: oth.kode, debit: absNom, kredit: 0 },
              { akun: kas.kode, debit: 0, kredit: absNom },
            ],
      };
      if (!callOasGlobal("postJurnalLegacy", entry)) return;
      const next = csvRows.map((row, i) =>
        i === idx
          ? {
              ...row,
              status: "cocok" as const,
              jurnalId: entry.id,
              nominalJurnal: absNom,
            }
          : row
      );
      setCsvRows(next);
      callOasGlobal("saveToStorage", false);
      callOasGlobal("showAlert", "Jurnal berhasil dibuat dari mutasi bank");
    },
    [csvRows]
  );

  const handleImportSemua = useCallback(() => {
    if (callOasGlobal("guardHanyaBaca", "mengimpor mutasi bank") === true) {
      return;
    }
    const belum = csvRows.filter((b) => b.status === "belum");
    if (!belum.length) {
      callOasGlobal("showAlert", "Tidak ada transaksi yang belum cocok");
      return;
    }
    if (
      !window.confirm(
        `Import ${belum.length} transaksi belum cocok sebagai jurnal baru?`
      )
    ) {
      return;
    }
    const akuns = readAkuns();
    const kas = akuns.find((a) => a.kode === "1101");
    const oth = akuns.find((a) => a.tipe === "Pendapatan");
    if (!kas || !oth) {
      callOasGlobal("showAlert", "Akun kas/pendapatan tidak ditemukan");
      return;
    }
    let imported = 0;
    const next = csvRows.map((b, idx) => {
      if (b.status !== "belum") return b;
      const absNom = Math.abs(b.nominal);
      const entry = {
        id: `JRN_REKON_${Date.now()}_${idx}`,
        tanggal: b.tgl,
        jenis: JENIS_JURNAL.REKONSILIASI,
        keterangan: `[Rekon] ${b.ket}`,
        lines:
          b.nominal > 0
            ? [
                { akun: kas.kode, debit: absNom, kredit: 0 },
                { akun: oth.kode, debit: 0, kredit: absNom },
              ]
            : [
                { akun: oth.kode, debit: absNom, kredit: 0 },
                { akun: kas.kode, debit: 0, kredit: absNom },
              ],
      };
      if (!callOasGlobal("postJurnalLegacy", entry)) return b;
      imported++;
      return {
        ...b,
        status: "cocok" as const,
        jurnalId: entry.id,
        nominalJurnal: absNom,
      };
    });
    setCsvRows(next);
    callOasGlobal("saveToStorage", false);
    callOasGlobal(
      "auditLog",
      "create",
      "jurnal",
      "Import rekonsiliasi sebagai jurnal",
      { ref: "REKON-IMPORT" }
    );
    callOasGlobal("showAlert", `${imported} transaksi berhasil diimpor`);
  }, [csvRows]);

  useEffect(() => {
    setOasWindowFn(
      "prosesRekonsiliasi",
      handleProsesRekon as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "importRekonSebagaiJurnal",
      handleImportSemua as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "filterRekon",
      ((f: "all" | "cocok" | "belum" | "beda") => setCsvFilter(f)) as (
        ...args: never[]
      ) => unknown
    );
  }, [handleImportSemua, handleProsesRekon]);

  const csvSummary = useMemo(() => {
    const totalMutasi = csvRows.reduce((s, b) => s + Math.abs(b.nominal), 0);
    const cocok = csvRows.filter((b) => b.status === "cocok").length;
    const beda = csvRows.filter((b) => b.status === "beda").length;
    const belum = csvRows.filter((b) => b.status === "belum").length;
    return { totalMutasi, cocok, beda, belum };
  }, [csvRows]);

  const filteredCsvRows = useMemo(() => {
    const indexed = csvRows.map((row, origIdx) => ({ row, origIdx }));
    if (csvFilter === "all") return indexed;
    return indexed.filter((x) => x.row.status === csvFilter);
  }, [csvFilter, csvRows]);

  const entries = readJurnalEntries();

  return (
    <div className="page" id="page-rekonsiliasi" data-react-managed="1">
      <div style={{ gridTemplateColumns: "1fr 1fr" }} className="kalk-grid">
        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <Upload size={15} /> Upload Mutasi Bank
            </div>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="rekon-bank">Pilih Bank</label>
              <select
                id="rekon-bank"
                style={{ width: "100%" }}
                value={bank}
                onChange={(e) => setBank(e.target.value)}
              >
                <option value="bca">BCA</option>
                <option value="mandiri">Mandiri</option>
                <option value="bni">BNI</option>
                <option value="bri">BRI</option>
                <option value="cimb">CIMB Niaga</option>
                <option value="generic">Lainnya (CSV Generic)</option>
              </select>
            </div>
            <div className="form-group" style={{ marginTop: "12px" }}>
              <label>Upload File Mutasi (CSV)</label>
              <div
                id="rekon-dropzone"
                role="button"
                tabIndex={0}
                onClick={() => csvInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    csvInputRef.current?.click();
                  }
                }}
                style={{
                  border: "2px dashed var(--border)",
                  borderRadius: "12px",
                  padding: "32px",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  color: "var(--muted)",
                }}
              >
                <div style={{ marginBottom: "8px", display: "flex", justifyContent: "center" }}>
                  <FolderOpen size={28} />
                </div>
                <div style={{ fontSize: "13px", fontWeight: 600 }}>
                  Klik atau drag CSV di sini
                </div>
                <div style={{ fontSize: "11px", marginTop: "4px" }}>
                  {csvFileName}
                </div>
              </div>
              <input
                ref={csvInputRef}
                type="file"
                id="rekon-csv-input"
                accept=".csv"
                style={{ display: "none" }}
                onChange={handleCsvChange}
              />
            </div>
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
              onClick={handleProsesRekon}
            >
              <Search size={14} /> Proses Rekonsiliasi
            </button>
          </div>
        </div>

        <div className="table-card">
          <div className="table-header">
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <BarChart3 size={15} /> Ringkasan Rekonsiliasi
            </div>
          </div>
          <div style={{ padding: "16px" }} id="rekon-summary">
            {csvRows.length === 0 ? (
              <div
                style={{
                  color: "var(--muted)",
                  fontSize: "13px",
                  textAlign: "center",
                  padding: "40px 0",
                }}
              >
                Upload CSV mutasi bank untuk mulai rekonsiliasi
              </div>
            ) : !processed ? (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "12px",
                  }}
                >
                  <div className="stat-card" style={{ padding: "14px" }}>
                    <div className="stat-label">Total Baris</div>
                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: 700,
                        color: "var(--accent2)",
                        fontFamily: "var(--mono)",
                      }}
                    >
                      {csvRows.length}
                    </div>
                  </div>
                  <div className="stat-card" style={{ padding: "14px" }}>
                    <div className="stat-label">Total Mutasi</div>
                    <div
                      style={{
                        fontSize: "16px",
                        fontWeight: 700,
                        color: "var(--accent)",
                        fontFamily: "var(--mono)",
                      }}
                    >
                      {rp(csvSummary.totalMutasi)}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    marginTop: "12px",
                    padding: "10px",
                    background: "rgba(74,222,128,0.08)",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "var(--accent)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <CheckCircle2 size={14} /> {csvRows.length} baris siap
                  diproses. Klik &ldquo;Proses Rekonsiliasi&rdquo;.
                </div>
              </>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "10px",
                }}
              >
                <div className="stat-card" style={{ padding: "12px" }}>
                  <div className="stat-label">Cocok</div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "var(--accent)",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    {csvSummary.cocok}
                  </div>
                </div>
                <div className="stat-card" style={{ padding: "12px" }}>
                  <div className="stat-label">Beda Nominal</div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "var(--accent3)",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    {csvSummary.beda}
                  </div>
                </div>
                <div className="stat-card" style={{ padding: "12px" }}>
                  <div className="stat-label">Belum Cocok</div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 700,
                      color: "var(--red)",
                      fontFamily: "var(--mono)",
                    }}
                  >
                    {csvSummary.belum}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {processed ? (
        <div className="table-card" id="rekon-result-card">
          <div className="table-header" style={{ flexWrap: "wrap", gap: "8px" }}>
            <div
              className="table-title"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
            >
              <CheckCircle2 size={15} style={{ color: "var(--green)" }} /> Hasil
              Pencocokan
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {(
                [
                  ["all", "Semua"],
                  ["cocok", "Cocok"],
                  ["belum", "Belum Cocok"],
                  ["beda", "Beda Nominal"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  className={`btn btn-${csvFilter === key ? "primary" : "ghost"} btn-sm`}
                  onClick={() => setCsvFilter(key)}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleImportSemua}
                style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
              >
                <Download size={13} /> Import Belum Cocok
              </button>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tgl Bank</th>
                  <th>Keterangan Bank</th>
                  <th>Nominal Bank</th>
                  <th>Jurnal Terkait</th>
                  <th>Nominal Jurnal</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody id="rekon-tbody">
                {filteredCsvRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: "24px",
                        color: "var(--muted)",
                      }}
                    >
                      Tidak ada baris yang cocok dengan filter ini.
                    </td>
                  </tr>
                ) : (
                  filteredCsvRows.map(({ row: b, origIdx }) => {
                    const clr =
                      b.status === "cocok"
                        ? "var(--accent)"
                        : b.status === "beda"
                          ? "var(--accent3)"
                          : "var(--red)";
                    const j = b.jurnalId
                      ? entries.find(
                          (x) => x.id === b.jurnalId || x.no === b.jurnalId
                        )
                      : null;
                    return (
                      <tr key={`${b.tgl}-${origIdx}`}>
                        <td
                          style={{
                            fontSize: "12px",
                            fontFamily: "var(--mono)",
                          }}
                        >
                          {b.tgl}
                        </td>
                        <td
                          style={{
                            fontSize: "12px",
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {b.ket}
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "12px",
                          }}
                        >
                          {rp(Math.abs(b.nominal))}
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {j ? j.ket || j.keterangan || "-" : "-"}
                        </td>
                        <td
                          style={{
                            fontFamily: "var(--mono)",
                            fontSize: "12px",
                          }}
                        >
                          {b.nominalJurnal ? rp(b.nominalJurnal) : "-"}
                        </td>
                        <td>
                          <span
                            style={{
                              color: clr,
                              fontSize: "12px",
                              fontWeight: 600,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                            }}
                          >
                            {b.status === "cocok" ? (
                              <CheckCircle2 size={13} />
                            ) : b.status === "beda" ? (
                              <AlertTriangle size={13} />
                            ) : (
                              <HelpCircle size={13} />
                            )}{" "}
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {b.status === "belum" ? (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() => handleImportSatu(origIdx)}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <Download size={12} /> Import
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
