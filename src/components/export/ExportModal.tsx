"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Palette,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";
import OasModalDialog from "@/components/ui/OasModalDialog";
import {
  DEFAULT_EXPORT_SECTIONS,
  exportCsvReport,
  exportExcelWorkbook,
  exportPdfReport,
  loadSavedPdfTheme,
  PDF_THEME_DEFAULTS,
  readCurrentCompany,
  savePdfTheme,
  setOasWindowFn,
  type ExcelTemplateType,
  type ExportFormat,
  type ExportSections,
  type PdfTemplateKey,
  type PdfThemeConfig,
} from "@/lib";

interface ExpWin {
  showAlert?: (msg: string) => void;
  isAdmin?: () => boolean;
  hasPerm?: (mod: string, act: string) => boolean;
  getProfil?: () => { nama?: string; logo?: string } | null;
  auditLog?: (a: string, c: string, d: string, m?: Record<string, unknown>) => void;
}

const getWin = () => window as unknown as ExpWin;

function defaultPeriodeLabel(): string {
  return new Date().toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export default function ExportModal() {
  const [open, setOpen] = useState(false);
  const [fmt, setFmt] = useState<ExportFormat>("excel");
  const [excelTemplate, setExcelTemplate] = useState<ExcelTemplateType>("data");
  const [sections, setSections] = useState<ExportSections>(DEFAULT_EXPORT_SECTIONS);
  const [nama, setNama] = useState("");
  const [proyek, setProyek] = useState("");
  const [periode, setPeriode] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [pdfTheme, setPdfTheme] = useState<PdfThemeConfig>(() => ({
    template: "A",
    colors: {
      A: { ...PDF_THEME_DEFAULTS.A.colors },
      B: { ...PDF_THEME_DEFAULTS.B.colors },
      C: { ...PDF_THEME_DEFAULTS.C.colors },
      D: { ...PDF_THEME_DEFAULTS.D.colors },
    },
  }));
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openModal = useCallback(() => {
    const w = getWin();
    if (w.isAdmin && !w.isAdmin() && w.hasPerm && !w.hasPerm("export", "read")) {
      w.showAlert?.("⛔ Kamu tidak punya izin untuk mengekspor laporan.");
      return;
    }
    const profil = w.getProfil?.() || {};
    const compName = profil.nama || readCurrentCompany()?.name || "PT Demo Indonesia";
    setNama((prev) => prev || compName);
    setPeriode((prev) => prev || defaultPeriodeLabel());
    if (profil.logo && !logoDataUrl) setLogoDataUrl(profil.logo);
    setPdfTheme(loadSavedPdfTheme());
    setStatusMsg(null);
    setBusy(false);
    setOpen(true);
  }, [logoDataUrl]);

  const handleLogoFile = useCallback((file: File | undefined) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      getWin().showAlert?.("⚠️ Ukuran logo maksimal 2MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") setLogoDataUrl(reader.result);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleResetTheme = useCallback(() => {
    const def: PdfThemeConfig = {
      template: "A",
      colors: {
        A: { ...PDF_THEME_DEFAULTS.A.colors },
        B: { ...PDF_THEME_DEFAULTS.B.colors },
        C: { ...PDF_THEME_DEFAULTS.C.colors },
        D: { ...PDF_THEME_DEFAULTS.D.colors },
      },
    };
    setPdfTheme(def);
    savePdfTheme(def);
  }, []);

  const updateTheme = useCallback((next: PdfThemeConfig) => {
    setPdfTheme(next);
    savePdfTheme(next);
  }, []);

  const handleExport = useCallback(() => {
    setBusy(true);
    setStatusMsg("Memproses export...");
    try {
      const opts = {
        nama: nama.trim() || "OAS Akuntansi",
        proyek: proyek.trim(),
        periode: periode.trim() || defaultPeriodeLabel(),
        excelTemplate,
        sections,
        pdfTheme,
        logoDataUrl,
      };
      let fileName = "";
      if (fmt === "excel") fileName = exportExcelWorkbook(opts);
      else if (fmt === "pdf") fileName = exportPdfReport(opts);
      else fileName = exportCsvReport(opts);

      getWin().auditLog?.(
        "export",
        "laporan",
        `Export ${fmt.toUpperCase()} — ${fileName}`,
        { format: fmt }
      );
      setStatusMsg(`✓ Berhasil diekspor: ${fileName}`);
      getWin().showAlert?.(`✓ Berhasil diekspor: ${fileName}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatusMsg(`❌ Gagal export: ${msg}`);
      getWin().showAlert?.(`❌ Gagal export: ${msg}`);
    } finally {
      setBusy(false);
    }
  }, [excelTemplate, fmt, logoDataUrl, nama, pdfTheme, periode, proyek, sections]);

  useEffect(() => {
    setOasWindowFn("openExportModal", openModal as (...args: never[]) => unknown);
    setOasWindowFn(
      "exportExcel",
      ((n?: string, p?: string, t?: ExcelTemplateType) =>
        exportExcelWorkbook({
          nama: n || readCurrentCompany()?.name || "OAS Akuntansi",
          periode: p || defaultPeriodeLabel(),
          excelTemplate: t || "data",
          sections: DEFAULT_EXPORT_SECTIONS,
        })) as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "exportPDF",
      ((n?: string, p?: string, pr?: string) =>
        exportPdfReport({
          nama: n || readCurrentCompany()?.name || "OAS Akuntansi",
          periode: p || defaultPeriodeLabel(),
          proyek: pr || "",
          sections: DEFAULT_EXPORT_SECTIONS,
          pdfTheme: loadSavedPdfTheme(),
        })) as (...args: never[]) => unknown
    );
    setOasWindowFn(
      "exportCSV",
      ((n?: string, p?: string) =>
        exportCsvReport({
          nama: n || readCurrentCompany()?.name || "OAS Akuntansi",
          periode: p || defaultPeriodeLabel(),
          sections: DEFAULT_EXPORT_SECTIONS,
        })) as (...args: never[]) => unknown
    );
  }, [openModal]);

  const toggleSec = (key: keyof ExportSections) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const activePalette = pdfTheme.colors[pdfTheme.template];

  return (
    <OasModalDialog
      id="modal-export"
      open={open}
      onClose={() => setOpen(false)}
      maxWidth="580px"
      title={
        <span style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
          <Upload size={16} /> Export Laporan Keuangan
        </span>
      }
      footer={
        <div style={{ display: "flex", gap: "8px", width: "100%" }}>
          <button
            className="btn btn-ghost"
            type="button"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => setOpen(false)}
          >
            Batal
          </button>
          <button
            className="btn btn-primary"
            type="button"
            disabled={busy}
            style={{ flex: 2, justifyContent: "center", gap: "6px" }}
            onClick={handleExport}
          >
            <Upload size={15} /> {busy ? "Memproses..." : "Export Sekarang"}
          </button>
        </div>
      }
    >
      <div style={{ fontSize: "12.5px", color: "var(--muted)", marginBottom: "14px", lineHeight: 1.6 }}>
        Export seluruh data keuangan langsung menggunakan engine <b>xlsx</b> &amp; <b>jsPDF</b> lokal (tanpa CDN eksternal).
      </div>

      {/* Format Selection */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        {[
          { id: "excel" as const, icon: <FileSpreadsheet size={24} />, title: "Excel", sub: ".xlsx dengan formula" },
          { id: "pdf" as const, icon: <FileText size={24} />, title: "PDF", sub: "Siap cetak / kirim" },
          { id: "csv" as const, icon: <ClipboardList size={24} />, title: "CSV", sub: "Google Sheets" },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            className={`exp-fmt-card${fmt === item.id ? " exp-fmt-active" : ""}`}
            style={{ background: "var(--surface2)", color: "var(--text)" }}
            onClick={() => setFmt(item.id)}
          >
            <div style={{ marginBottom: "6px", display: "flex", justifyContent: "center" }}>{item.icon}</div>
            <div style={{ fontWeight: 700, fontSize: "13px" }}>{item.title}</div>
            <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "3px" }}>{item.sub}</div>
          </button>
        ))}
      </div>

      {/* Excel Template Selection */}
      {fmt === "excel" && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
            Pilih Template Excel:
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            {[
              {
                id: "data" as const,
                title: "Template Data",
                desc: "Data lengkap per sheet, bersih dan siap arsip.",
              },
              {
                id: "formula" as const,
                title: "Template Hitung Otomatis",
                desc: "Formula SUM & SUMIF aktif antar sheet dari INPUT_JURNAL.",
              },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                className={`exp-fmt-card${excelTemplate === t.id ? " exp-fmt-active" : ""}`}
                style={{ textAlign: "left", padding: "12px", background: "var(--surface2)", color: "var(--text)" }}
                onClick={() => setExcelTemplate(t.id)}
              >
                <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>{t.title}</div>
                <div style={{ fontSize: "11px", color: "var(--muted)", lineHeight: 1.5 }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PDF Theme & Logo */}
      {fmt === "pdf" && (
        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "10px 12px", marginBottom: "10px", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: activePalette.primary, display: "inline-block" }} />
              <span style={{ width: "16px", height: "16px", borderRadius: "4px", background: activePalette.accent, display: "inline-block" }} />
              <div style={{ fontSize: "12px" }}>
                <b>{PDF_THEME_DEFAULTS[pdfTheme.template].name}</b>
                <div style={{ fontSize: "10.5px", color: "var(--muted)" }}>{PDF_THEME_DEFAULTS[pdfTheme.template].desc}</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              <button className="btn btn-ghost btn-sm" type="button" onClick={() => setShowThemeEditor((v) => !v)}>
                <Palette size={12} /> {showThemeEditor ? "Tutup" : "Tema"}
              </button>
              <button className="btn btn-ghost btn-sm" type="button" onClick={handleResetTheme} title="Reset tema">
                <RefreshCw size={12} />
              </button>
            </div>
          </div>

          {showThemeEditor && (
            <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: "10px", padding: "12px", marginBottom: "10px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "10px" }}>
                {(["A", "B", "C", "D"] as PdfTemplateKey[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    className={`btn btn-sm ${pdfTheme.template === k ? "btn-primary" : "btn-ghost"}`}
                    onClick={() => updateTheme({ ...pdfTheme, template: k })}
                  >
                    {PDF_THEME_DEFAULTS[k].name}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", fontSize: "12px" }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  Header
                  <input
                    type="color"
                    value={activePalette.primary}
                    onChange={(e) =>
                      updateTheme({
                        ...pdfTheme,
                        colors: {
                          ...pdfTheme.colors,
                          [pdfTheme.template]: { ...activePalette, primary: e.target.value },
                        },
                      })
                    }
                  />
                </label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                  Aksen
                  <input
                    type="color"
                    value={activePalette.accent}
                    onChange={(e) =>
                      updateTheme({
                        ...pdfTheme,
                        colors: {
                          ...pdfTheme.colors,
                          [pdfTheme.template]: { ...activePalette, accent: e.target.value },
                        },
                      })
                    }
                  />
                </label>
              </div>
            </div>
          )}

          {/* Logo upload */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "54px", height: "54px", border: "1px dashed var(--border)", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "var(--surface2)", flexShrink: 0 }}>
              {logoDataUrl ? (
                <img src={logoDataUrl} alt="Logo" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              ) : (
                <ImageIcon size={20} style={{ color: "var(--muted)" }} />
              )}
            </div>
            <label className="btn btn-ghost btn-sm" style={{ cursor: "pointer" }}>
              Upload Logo (PNG/JPG)
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: "none" }}
                onChange={(e) => handleLogoFile(e.target.files?.[0])}
              />
            </label>
            {logoDataUrl && (
              <button className="btn btn-ghost btn-sm" type="button" style={{ color: "var(--danger)" }} onClick={() => setLogoDataUrl(null)}>
                <Trash2 size={13} /> Hapus
              </button>
            )}
          </div>
        </div>
      )}

      {/* Section selection */}
      <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
        <BarChart3 size={13} /> Pilih Bagian Laporan:
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "14px" }}>
        {(
          [
            ["dashboard", "Ringkasan Dashboard"],
            ["jurnalUmum", "Jurnal Umum"],
            ["jurnalKas", "Jurnal Kas"],
            ["jurnalJual", "Jurnal Penjualan"],
            ["jurnalBeli", "Jurnal Pembelian"],
            ["neracaSaldo", "Neraca Saldo"],
            ["labaRugi", "Laporan Laba Rugi"],
            ["neraca", "Neraca"],
            ["arusKas", "Arus Kas"],
            ["coa", "Chart of Accounts"],
            ["invoice", "Invoice & Piutang"],
            ["bill", "Tagihan Pembelian"],
            ["pajak", "Laporan Pajak (PPN)"],
          ] as Array<[keyof ExportSections, string]>
        ).map(([key, label]) => (
          <label key={key} className="exp-check">
            <input
              type="checkbox"
              checked={sections[key]}
              onChange={() => toggleSec(key)}
            />{" "}
            {label}
          </label>
        ))}
      </div>

      {/* Info Laporan */}
      <div className="form-row">
        <div className="form-group">
          <label>Nama Perusahaan</label>
          <input type="text" placeholder="PT Demo Indonesia" value={nama} onChange={(e) => setNama(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Nama Proyek / Catatan</label>
          <input type="text" placeholder="Laporan Keuangan Q1" value={proyek} onChange={(e) => setProyek(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Periode</label>
        <input type="text" placeholder="November 2026" value={periode} onChange={(e) => setPeriode(e.target.value)} />
      </div>

      {statusMsg && (
        <div style={{ padding: "10px", background: "var(--surface2)", borderRadius: "8px", fontSize: "12.5px", color: "var(--accent2)" }}>
          {statusMsg}
        </div>
      )}
    </OasModalDialog>
  );
}
