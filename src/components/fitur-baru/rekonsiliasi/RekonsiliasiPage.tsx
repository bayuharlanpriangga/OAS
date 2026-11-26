"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import * as XLSX from "xlsx";
import {
  AlertTriangle,
  BarChart3,
  Bot,
  Building2,
  CheckCircle2,
  ClipboardList,
  Download,
  FolderOpen,
  HelpCircle,
  Search,
  Upload,
} from "lucide-react";
import { JENIS_JURNAL } from "@/lib/shared/accounting";
import { fmtRp as rp } from "@/lib/shared/format";
import {
  parseBankCSV,
  parseBankExcel,
  parseCSVBank,
  type BankStatementRow,
  type RekonCsvRow,
} from "@/lib/fitur-baru/fitur-tambahan";
import {
  callOasGlobal,
  readAkuns,
  readJurnalEntries,
  setOasWindowFn,
} from "@/lib/shared/legacy-store";

export default function RekonsiliasiPage() {
  // ── Page 1: #page-rekonsiliasi (CSV matching & batch import) ──
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

  // ── Page 2: #page-rekonsiliasi-bank (CSV + Excel statement analyzer + AI) ──
  const [bankRows, setBankRows] = useState<BankStatementRow[]>([]);
  const [bankFilter, setBankFilter] = useState<"all" | "miss">("all");
  const [dragActive, setDragActive] = useState(false);
  const bankFileInputRef = useRef<HTMLInputElement | null>(null);

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

  // ── Analyzer (#page-rekonsiliasi-bank) ──
  const processBankFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const analyzeRows = (rows: BankStatementRow[]) => {
      if (!rows.length) {
        callOasGlobal(
          "showAlert",
          "Tidak ada baris data ditemukan. Cek format file."
        );
        return;
      }
      const entries = readJurnalEntries();
      const matched: BankStatementRow[] = rows.map((r) => {
        const amount = r.debit || r.kredit;
        const match = entries.find((j) => {
          const jDate = j.tanggal;
          const jAmt = (j.lines || []).reduce(
            (s, l) => s + Math.max(l.debit || 0, l.kredit || 0),
            0
          );
          const sameDate = jDate === r.tanggal;
          const sameAmt = Math.abs(jAmt - amount) < 1;
          const nearDate =
            !sameDate &&
            Boolean(jDate) &&
            Math.abs(new Date(jDate).getTime() - new Date(r.tanggal).getTime()) <
              3 * 86400000 &&
            sameAmt;
          return (sameDate && sameAmt) || nearDate;
        });
        return {
          ...r,
          status: match ? "verified" : "missing",
          matchedJurnal: match || null,
        };
      });
      setBankRows(matched);
      setBankFilter("all");
      const verified = matched.filter((r) => r.status === "verified").length;
      const missing = matched.filter((r) => r.status === "missing").length;
      if (missing > 0) {
        callOasGlobal(
          "showAlert",
          `Analisis selesai: ${verified} cocok, ${missing} belum tercatat.\n\nKlik tombol "Buat Jurnal" pada baris yang belum tercatat.`
        );
      } else {
        callOasGlobal(
          "showAlert",
          `Semua ${verified} transaksi sudah tercatat di jurnal!`
        );
      }
    };

    if (ext === "csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        analyzeRows(parseBankCSV(String(e.target?.result || "")));
      };
      reader.readAsText(file, "UTF-8");
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), {
            type: "array",
          });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const data = XLSX.utils.sheet_to_json<unknown[]>(ws, {
            header: 1,
            defval: "",
          });
          analyzeRows(parseBankExcel(data));
        } catch (err) {
          callOasGlobal(
            "showAlert",
            "Gagal baca Excel: " +
              (err instanceof Error ? err.message : String(err))
          );
        }
      };
      reader.readAsArrayBuffer(file);
    }
  }, []);

  const handleBankFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processBankFile(file);
      e.target.value = "";
    },
    [processBankFile]
  );

  const handleBankDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processBankFile(file);
    },
    [processBankFile]
  );

  const handleBuatJurnalDariBankRow = useCallback((row: BankStatementRow) => {
    const isIn = row.debit > 0;
    const amt = row.debit || row.kredit;
    const prompt = `Dari mutasi bank: "${row.keterangan}" tanggal ${row.tanggal}, ${
      isIn ? "DEBIT (uang masuk)" : "KREDIT (uang keluar)"
    } ${rp(amt)}. Buatkan jurnal akuntansi yang tepat.`;
    callOasGlobal(
      "showAlert",
      `Orias sedang menganalisis transaksi...\n"${row.keterangan}"\n\nBuka Orias Assisten untuk melihat hasilnya.`
    );
    callOasGlobal("showPage", "ai-assistant");
    window.setTimeout(() => {
      const inp = document.getElementById("ai-input") as
        | HTMLInputElement
        | HTMLTextAreaElement
        | null;
      if (inp) {
        const nativeSetter = Object.getOwnPropertyDescriptor(
          Object.getPrototypeOf(inp),
          "value"
        )?.set;
        nativeSetter?.call(inp, prompt);
        inp.dispatchEvent(new Event("input", { bubbles: true }));
      }
      callOasGlobal("sendAI");
    }, 300);
  }, []);

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
    setOasWindowFn(
      "filterBankRows",
      ((f: "all" | "miss") => setBankFilter(f)) as (...args: never[]) => unknown
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

  const bankSummary = useMemo(() => {
    const verified = bankRows.filter((r) => r.status === "verified").length;
    const missing = bankRows.filter((r) => r.status === "missing").length;
    return { verified, missing, total: bankRows.length };
  }, [bankRows]);

  const filteredBankRows = useMemo(() => {
    if (bankFilter === "miss") {
      return bankRows.filter((r) => r.status === "missing");
    }
    return bankRows;
  }, [bankFilter, bankRows]);

  return (
    <>
      {/* ═══ PAGE: #page-rekonsiliasi (Menu utama Rekonsiliasi) ═══ */}
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

      {/* ═══ PAGE: #page-rekonsiliasi-bank (Upload CSV/Excel + AI Helper) ═══ */}
      <div className="page" id="page-rekonsiliasi-bank" data-react-managed="1">
        <div className="section-header page-actions-only">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => bankFileInputRef.current?.click()}
            style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
          >
            <FolderOpen size={14} /> Upload Mutasi
          </button>
          <input
            ref={bankFileInputRef}
            type="file"
            id="bank-file-input"
            accept=".csv,.xlsx,.xls"
            style={{ display: "none" }}
            onChange={handleBankFileInput}
          />
        </div>

        {bankRows.length === 0 ? (
          <>
            <div
              id="bank-upload-area"
              role="button"
              tabIndex={0}
              onClick={() => bankFileInputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  bankFileInputRef.current?.click();
                }
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragActive(true);
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={handleBankDrop}
              style={{
                border: `2px dashed ${dragActive ? "var(--accent)" : "var(--border)"}`,
                borderRadius: "10px",
                padding: "40px 20px",
                textAlign: "center",
                marginBottom: "20px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              <div
                style={{
                  marginBottom: "12px",
                  display: "flex",
                  justifyContent: "center",
                  color: "var(--accent2)",
                }}
              >
                <Building2 size={36} />
              </div>
              <div
                style={{
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text)",
                  marginBottom: "6px",
                }}
              >
                Upload Mutasi Rekening
              </div>
              <div
                style={{
                  fontSize: "13px",
                  color: "var(--muted)",
                  marginBottom: "16px",
                }}
              >
                Drag &amp; drop atau klik untuk pilih file
              </div>
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                <span className="badge badge-green" style={{ fontSize: "11px" }}>
                  CSV
                </span>
                <span className="badge badge-blue" style={{ fontSize: "11px" }}>
                  Excel .xlsx
                </span>
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "var(--muted)",
                  marginTop: "12px",
                }}
              >
                Mendukung format BCA, Mandiri, BNI, BRI, CIMB
              </div>
            </div>

            <div
              id="bank-format-guide"
              style={{
                background: "var(--surface2)",
                border: "1px solid var(--border-strong)",
                borderRadius: "10px",
                padding: "14px",
                marginBottom: "16px",
                fontSize: "12.5px",
                color: "var(--muted)",
                lineHeight: 1.8,
              }}
            >
              <b
                style={{
                  color: "var(--accent-text)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                }}
              >
                <ClipboardList size={14} /> Cara export mutasi dari m-banking:
              </b>
              <br />• <b>BCA</b>: myBCA → Rekening → Mutasi → Download CSV
              <br />• <b>Mandiri</b>: Livin → History → Export Excel
              <br />• <b>BNI</b>: BNI Mobile → Mutasi Rekening → Unduh
              <br />• Atau buat file CSV manual dengan kolom:{" "}
              <code
                style={{
                  background: "var(--bg)",
                  padding: "1px 5px",
                  borderRadius: "3px",
                }}
              >
                Tanggal, Keterangan, Debit, Kredit, Saldo
              </code>
            </div>
          </>
        ) : (
          <div id="bank-rekon-results">
            <div
              style={{
                display: "flex",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "16px",
              }}
            >
              <div
                className="stat-card green"
                style={{ flex: 1, minWidth: "140px", padding: "14px" }}
              >
                <div className="stat-label">Sudah Tercatat</div>
                <div className="stat-value" style={{ fontSize: "22px" }}>
                  {bankSummary.verified}
                </div>
              </div>
              <div
                className="stat-card red"
                style={{ flex: 1, minWidth: "140px", padding: "14px" }}
              >
                <div className="stat-label">Belum Tercatat</div>
                <div className="stat-value" style={{ fontSize: "22px" }}>
                  {bankSummary.missing}
                </div>
              </div>
              <div
                className="stat-card blue"
                style={{ flex: 1, minWidth: "140px", padding: "14px" }}
              >
                <div className="stat-label">Total Baris</div>
                <div className="stat-value" style={{ fontSize: "22px" }}>
                  {bankSummary.total}
                </div>
              </div>
            </div>

            <div className="table-card">
              <div className="table-header">
                <div className="table-title">Hasil Pencocokan</div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setBankFilter("all")}
                    className="btn btn-ghost btn-sm"
                    style={{
                      borderColor:
                        bankFilter === "all" ? "var(--accent)" : undefined,
                    }}
                  >
                    Semua
                  </button>
                  <button
                    type="button"
                    onClick={() => setBankFilter("miss")}
                    className="btn btn-ghost btn-sm"
                    style={{
                      borderColor:
                        bankFilter === "miss" ? "var(--accent)" : undefined,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <AlertTriangle size={13} style={{ color: "var(--accent3)" }} />{" "}
                    Belum Dicatat
                  </button>
                </div>
              </div>
              <div className="table-scroll">
                <table id="bank-rekon-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Keterangan Bank</th>
                      <th>Debit</th>
                      <th>Kredit</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody id="bank-rekon-body">
                    {filteredBankRows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: "center",
                            padding: "20px",
                            color: "var(--muted)",
                          }}
                        >
                          Tidak ada data
                        </td>
                      </tr>
                    ) : (
                      filteredBankRows.map((r, i) => {
                        const isVerified = r.status === "verified";
                        return (
                          <tr
                            key={`${r.tanggal}-${i}`}
                            style={{ opacity: isVerified ? 0.65 : 1 }}
                          >
                            <td style={{ fontSize: "12px", whiteSpace: "nowrap" }}>
                              {r.tanggal || "-"}
                            </td>
                            <td
                              style={{
                                fontSize: "12px",
                                maxWidth: "180px",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={r.keterangan}
                            >
                              {r.keterangan}
                            </td>
                            <td className="debit">
                              {r.debit ? rp(r.debit) : ""}
                            </td>
                            <td className="kredit">
                              {r.kredit ? rp(r.kredit) : ""}
                            </td>
                            <td>
                              <span
                                className={`badge ${isVerified ? "badge-green" : "badge-yellow"}`}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "4px",
                                }}
                              >
                                {isVerified ? (
                                  <>
                                    <CheckCircle2 size={12} /> Tercatat
                                  </>
                                ) : (
                                  <>
                                    <AlertTriangle size={12} /> Belum
                                  </>
                                )}
                              </span>
                            </td>
                            <td>
                              {!isVerified ? (
                                <button
                                  type="button"
                                  onClick={() => handleBuatJurnalDariBankRow(r)}
                                  className="btn btn-primary btn-sm"
                                  style={{
                                    fontSize: "11px",
                                    padding: "4px 8px",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                  }}
                                >
                                  <Bot size={13} /> Buat Jurnal
                                </button>
                              ) : (
                                <span
                                  style={{
                                    color: "var(--muted)",
                                    fontSize: "11px",
                                  }}
                                >
                                  {r.matchedJurnal?.no || ""}
                                </span>
                              )}
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
        )}
      </div>
    </>
  );
}
