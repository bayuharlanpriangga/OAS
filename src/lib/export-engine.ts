import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { computeSaldoAll, rekapPpnJurnal } from "./accounting";
import { fmtRp } from "./format";
import {
  computeArusKas,
  computeLabaRugi,
  computeNeraca,
  computeNeracaSaldo,
  getFilteredSaldoPure,
} from "./laporan";
import {
  readAkuns,
  readBillList,
  readInvoiceList,
  readJurnalEntries,
  readKontakList,
} from "./legacy-store";

export type ExportFormat = "excel" | "pdf" | "csv";
export type ExcelTemplateType = "data" | "formula";
export type PdfTemplateKey = "A" | "B" | "C" | "D";

export interface PdfThemeColors {
  primary: string;
  accent: string;
  bg: string;
}

export interface PdfThemeConfig {
  template: PdfTemplateKey;
  colors: Record<PdfTemplateKey, PdfThemeColors>;
}

export const PDF_THEME_DEFAULTS: Record<
  PdfTemplateKey,
  { name: string; desc: string; dark: boolean; colors: PdfThemeColors }
> = {
  A: {
    name: "Corporate",
    desc: "Header bar solid, zebra tabel, footer warna",
    dark: false,
    colors: { primary: "#1e3a8a", accent: "#3b82f6", bg: "#ffffff" },
  },
  B: {
    name: "Klasik Minimal",
    desc: "Garis kiri tegas, tabel bersih, footer tipis",
    dark: false,
    colors: { primary: "#111827", accent: "#10b981", bg: "#f9fafb" },
  },
  C: {
    name: "Modern Dark",
    desc: "Sidebar strip vertikal, nuansa gelap modern",
    dark: true,
    colors: { primary: "#7c3aed", accent: "#a78bfa", bg: "#0f172a" },
  },
  D: {
    name: "OAS Dark",
    desc: "Tema gelap native OAS, aksen hijau-cyan",
    dark: true,
    colors: { primary: "#4ade80", accent: "#22d3ee", bg: "#1c2030" },
  },
};

const PDF_THEME_KEY = "oas_pdf_theme_v2";

export function loadSavedPdfTheme(): PdfThemeConfig {
  const fallback: PdfThemeConfig = {
    template: "A",
    colors: {
      A: { ...PDF_THEME_DEFAULTS.A.colors },
      B: { ...PDF_THEME_DEFAULTS.B.colors },
      C: { ...PDF_THEME_DEFAULTS.C.colors },
      D: { ...PDF_THEME_DEFAULTS.D.colors },
    },
  };
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(PDF_THEME_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<PdfThemeConfig>;
    const t = parsed.template;
    const template: PdfTemplateKey =
      t === "A" || t === "B" || t === "C" || t === "D" ? t : "A";
    return {
      template,
      colors: {
        A: { ...fallback.colors.A, ...(parsed.colors?.A || {}) },
        B: { ...fallback.colors.B, ...(parsed.colors?.B || {}) },
        C: { ...fallback.colors.C, ...(parsed.colors?.C || {}) },
        D: { ...fallback.colors.D, ...(parsed.colors?.D || {}) },
      },
    };
  } catch {
    return fallback;
  }
}

export function savePdfTheme(cfg: PdfThemeConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PDF_THEME_KEY, JSON.stringify(cfg));
  } catch {}
}

export interface ExportSections {
  jurnalUmum: boolean;
  jurnalKas: boolean;
  jurnalJual: boolean;
  jurnalBeli: boolean;
  bukuBesar: boolean;
  neracaSaldo: boolean;
  labaRugi: boolean;
  neraca: boolean;
  arusKas: boolean;
  coa: boolean;
  dashboard: boolean;
  invoice: boolean;
  bill: boolean;
  pajak: boolean;
}

export const DEFAULT_EXPORT_SECTIONS: ExportSections = {
  jurnalUmum: true,
  jurnalKas: true,
  jurnalJual: true,
  jurnalBeli: true,
  bukuBesar: true,
  neracaSaldo: true,
  labaRugi: true,
  neraca: true,
  arusKas: true,
  coa: true,
  dashboard: true,
  invoice: true,
  bill: true,
  pajak: true,
};

export interface ExportOptions {
  nama: string;
  proyek?: string;
  periode: string;
  excelTemplate?: ExcelTemplateType;
  sections: ExportSections;
  pdfTheme?: PdfThemeConfig;
  logoDataUrl?: string | null;
}

function hexToRgbTuple(hex: string): [number, number, number] {
  const clean = (hex || "#1e3a8a").replace("#", "");
  if (clean.length !== 6) return [30, 58, 138];
  return [
    parseInt(clean.slice(0, 2), 16) || 0,
    parseInt(clean.slice(2, 4), 16) || 0,
    parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function safeFileSlug(s: string): string {
  return (s || "OAS")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

function autoFitCols(ws: XLSX.WorkSheet, rows: unknown[][]): void {
  const widths: number[] = [];
  rows.forEach((r) => {
    r.forEach((cell, i) => {
      const len = String(cell ?? "").length + 3;
      if (!widths[i] || len > widths[i]) widths[i] = Math.min(len, 42);
    });
  });
  ws["!cols"] = widths.map((wch) => ({ wch: Math.max(wch, 10) }));
}

export function exportExcelWorkbook(opts: ExportOptions): string {
  const wb = XLSX.utils.book_new();
  const akuns = readAkuns();
  const jurnals = readJurnalEntries();
  const invoices = readInvoiceList();
  const bills = readBillList();
  const kontaks = readKontakList();
  const saldoAll = computeSaldoAll(jurnals);
  const saldoPl = getFilteredSaldoPure(jurnals, "all", { tanpaPenutup: true });
  const ns = computeNeracaSaldo(akuns, saldoAll);
  const lr = computeLabaRugi(akuns, saldoPl);
  const ner = computeNeraca(jurnals, akuns);
  const ak = computeArusKas(akuns, saldoPl);
  const ppn = rekapPpnJurnal(jurnals, akuns);
  const namaAkun = (kode: string) =>
    akuns.find((a) => a.kode === kode)?.nama || kode;
  const s = opts.sections;
  const useFormula = opts.excelTemplate === "formula";

  const addSheet = (title: string, rows: unknown[][]) => {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    autoFitCols(ws, rows);
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    return ws;
  };

  // 1. Ringkasan Dashboard
  if (s.dashboard) {
    addSheet("Ringkasan", [
      [opts.nama.toUpperCase()],
      ["RINGKASAN LAPORAN KEUANGAN", opts.periode],
      ...(opts.proyek ? [["Proyek / Catatan", opts.proyek]] : []),
      [],
      ["Indikator Keuangan", "Nilai (Rp)"],
      ["Total Pendapatan", lr.totalPendapatan],
      ["Total HPP", lr.totalHpp],
      ["Laba Kotor", lr.labaKotor],
      ["Total Beban Operasional", lr.totalBeban],
      ["Laba Bersih", lr.labaBersih],
      ["Total Aset", ner.aset],
      ["Total Liabilitas", ner.liab],
      ["Total Ekuitas", ner.totalEkuitas],
      ["Arus Kas Bersih", ak.kenaikan],
      ["Total Jurnal", jurnals.length],
      ["Total Kontak", kontaks.length],
    ]);
  }

  // 2. Jurnal Umum (or INPUT sheet for Formula template)
  if (s.jurnalUmum || useFormula) {
    const header = [
      "No Jurnal",
      "Tanggal",
      "Jenis",
      "Keterangan",
      "Kode Akun",
      "Nama Akun",
      "Debit",
      "Kredit",
    ];
    const rows: unknown[][] = [
      [opts.nama, "JURNAL UMUM", opts.periode],
      [],
      header,
    ];
    jurnals.forEach((j) => {
      (j.lines || []).forEach((l) => {
        rows.push([
          j.no || "",
          j.tanggal || "",
          j.jenis || "Manual",
          l.ket || j.ket || "",
          l.akun,
          namaAkun(l.akun),
          Number(l.debit) || 0,
          Number(l.kredit) || 0,
        ]);
      });
    });
    const lastRow = rows.length;
    if (useFormula && lastRow >= 4) {
      rows.push([
        "",
        "",
        "",
        "TOTAL",
        "",
        "",
        { f: `SUM(G4:G${lastRow})` },
        { f: `SUM(H4:H${lastRow})` },
      ]);
    } else {
      const totD = jurnals.reduce(
        (sum, j) => sum + (j.lines || []).reduce((a, l) => a + (l.debit || 0), 0),
        0
      );
      const totK = jurnals.reduce(
        (sum, j) =>
          sum + (j.lines || []).reduce((a, l) => a + (l.kredit || 0), 0),
        0
      );
      rows.push(["", "", "", "TOTAL", "", "", totD, totK]);
    }
    addSheet(useFormula ? "INPUT_JURNAL" : "Jurnal Umum", rows);
  }

  const addFilteredJurnal = (sheetName: string, jenis: string) => {
    const filtered = jurnals.filter((j) => j.jenis === jenis);
    const rows: unknown[][] = [
      [opts.nama, sheetName.toUpperCase(), opts.periode],
      [],
      ["No", "Tanggal", "Keterangan", "Kode", "Nama Akun", "Debit", "Kredit"],
    ];
    filtered.forEach((j) => {
      (j.lines || []).forEach((l) => {
        rows.push([
          j.no || "",
          j.tanggal || "",
          l.ket || j.ket || "",
          l.akun,
          namaAkun(l.akun),
          Number(l.debit) || 0,
          Number(l.kredit) || 0,
        ]);
      });
    });
    addSheet(sheetName, rows);
  };

  if (s.jurnalKas) addFilteredJurnal("Jurnal Kas", "Kas");
  if (s.jurnalJual) addFilteredJurnal("Jurnal Penjualan", "Penjualan");
  if (s.jurnalBeli) addFilteredJurnal("Jurnal Pembelian", "Pembelian");

  // 3. Neraca Saldo
  if (s.neracaSaldo) {
    const rows: unknown[][] = [
      [opts.nama, "NERACA SALDO", opts.periode],
      [],
      ["Kode", "Nama Akun", "Tipe", "Debit", "Kredit"],
    ];
    if (useFormula) {
      akuns.forEach((a, i) => {
        const r = i + 4;
        rows.push([
          a.kode,
          a.nama,
          a.tipe,
          { f: `SUMIF(INPUT_JURNAL!$E$4:$E$5000,A${r},INPUT_JURNAL!$G$4:$G$5000)` },
          { f: `SUMIF(INPUT_JURNAL!$E$4:$E$5000,A${r},INPUT_JURNAL!$H$4:$H$5000)` },
        ]);
      });
      const last = rows.length;
      rows.push([
        "",
        "TOTAL",
        "",
        { f: `SUM(D4:D${last})` },
        { f: `SUM(E4:E${last})` },
      ]);
    } else {
      ns.rows.forEach((r) => {
        rows.push([r.kode, r.nama, r.tipe, r.debit, r.kredit]);
      });
      rows.push(["", "TOTAL", "", ns.totalDebit, ns.totalKredit]);
    }
    addSheet("Neraca Saldo", rows);
  }

  // 4. Laba Rugi
  if (s.labaRugi) {
    const rows: unknown[][] = [
      [opts.nama, "LAPORAN LABA RUGI", opts.periode],
      [],
      ["Kode", "Keterangan", "Nominal (Rp)"],
      ["", "PENDAPATAN", ""],
      ...lr.pRows.map((r) => [r.kode, r.nama, r.nilai]),
      ["", "Total Pendapatan", lr.totalPendapatan],
      [],
      ["", "HARGA POKOK PENJUALAN (HPP)", ""],
      ...lr.hRows.map((r) => [r.kode, r.nama, r.nilai]),
      ["", "Total HPP", lr.totalHpp],
      ["", "LABA KOTOR", lr.labaKotor],
      [],
      ["", "BEBAN OPERASIONAL", ""],
      ...lr.bRows.map((r) => [r.kode, r.nama, r.nilai]),
      ["", "Total Beban", lr.totalBeban],
      [],
      ["", "LABA BERSIH", lr.labaBersih],
    ];
    addSheet("Laba Rugi", rows);
  }

  // 5. Neraca
  if (s.neraca) {
    const rows: unknown[][] = [
      [opts.nama, "NERACA (POSISI KEUANGAN)", opts.periode],
      [],
      ["Kode", "Akun", "Saldo (Rp)"],
      ["", "ASET", ""],
      ...ner.asetRows.map((r) => [r.kode, r.nama, r.nilai]),
      ["", "TOTAL ASET", ner.aset],
      [],
      ["", "LIABILITAS", ""],
      ...ner.liabRows.map((r) => [r.kode, r.nama, r.nilai]),
      ["", "TOTAL LIABILITAS", ner.liab],
      [],
      ["", "EKUITAS", ""],
      ...ner.ekRows.map((r) => [r.kode, r.nama, r.isPrive ? -r.nilai : r.nilai]),
      ["", "Laba Tahun Berjalan", ner.labaBersih],
      ["", "TOTAL EKUITAS", ner.totalEkuitas],
      ["", "TOTAL LIABILITAS & EKUITAS", ner.liab + ner.totalEkuitas],
    ];
    addSheet("Neraca", rows);
  }

  // 6. Arus Kas
  if (s.arusKas) {
    const rows: unknown[][] = [
      [opts.nama, "LAPORAN ARUS KAS (PSAK 2)", opts.periode],
      [],
      ["Kategori", "Keterangan", "Nominal (Rp)"],
      ...ak.operasiRows.map((r) => ["Operasi", r.label, r.nilai]),
      ["", "Arus Kas Operasi Bersih", ak.totalOperasi],
      ...ak.investasiRows.map((r) => ["Investasi", r.label, r.nilai]),
      ["", "Arus Kas Investasi Bersih", ak.totalInvestasi],
      ...ak.pendanaanRows.map((r) => ["Pendanaan", r.label, r.nilai]),
      ["", "Arus Kas Pendanaan Bersih", ak.totalPendanaan],
      ["", "KENAIKAN / (PENURUNAN) KAS BERSIH", ak.kenaikan],
    ];
    addSheet("Arus Kas", rows);
  }

  // 7. COA
  if (s.coa) {
    addSheet("Chart of Accounts", [
      ["Kode", "Nama Akun", "Tipe", "Kategori", "Saldo Normal"],
      ...akuns.map((a) => [a.kode, a.nama, a.tipe, a.kat || "", a.normal]),
    ]);
  }

  // 8. Invoice & Bill
  if (s.invoice && invoices.length) {
    addSheet("Invoice & Piutang", [
      ["No Invoice", "Pelanggan", "Tanggal", "Jatuh Tempo", "Total", "Sisa", "Status"],
      ...invoices.map((i) => [
        i.noInvoice,
        i.pelanggan,
        i.tanggal,
        i.jatuhTempo,
        i.total,
        i.sisaTagihan,
        i.status,
      ]),
    ]);
  }

  if (s.bill && bills.length) {
    addSheet("Tagihan Pembelian", [
      ["No Bill", "Supplier", "Tanggal", "Jatuh Tempo", "Total", "Sisa", "Status"],
      ...bills.map((b) => [
        b.noBill,
        b.supplier,
        b.tanggal,
        b.jatuhTempo,
        b.total,
        b.sisaTagihan,
        b.status,
      ]),
    ]);
  }

  // 9. Pajak PPN
  if (s.pajak) {
    addSheet("Rekap PPN", [
      [opts.nama, "REKAP PPN KELUARAN & MASUKAN", opts.periode],
      [],
      ["Komponen", "Nominal (Rp)"],
      ["Total PPN Keluaran", ppn.keluaran],
      ["Total PPN Masukan", ppn.masukan],
      ["PPN Kurang / (Lebih) Bayar", ppn.kurangBayar],
    ]);
  }

  if (wb.SheetNames.length === 0) {
    addSheet("Ringkasan", [["Tidak ada seksi yang dipilih."]]);
  }

  const fileName = `OAS_${safeFileSlug(opts.nama)}_${safeFileSlug(opts.periode)}${useFormula ? "_Formula" : ""}.xlsx`;
  XLSX.writeFile(wb, fileName);
  return fileName;
}

export function exportPdfReport(opts: ExportOptions): string {
  const themeCfg = opts.pdfTheme || loadSavedPdfTheme();
  const palette = themeCfg.colors[themeCfg.template];
  const primaryRgb = hexToRgbTuple(palette.primary);
  const accentRgb = hexToRgbTuple(palette.accent);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const akuns = readAkuns();
  const jurnals = readJurnalEntries();
  const invoices = readInvoiceList();
  const saldoAll = computeSaldoAll(jurnals);
  const saldoPl = getFilteredSaldoPure(jurnals, "all", { tanpaPenutup: true });
  const ns = computeNeracaSaldo(akuns, saldoAll);
  const lr = computeLabaRugi(akuns, saldoPl);
  const ner = computeNeraca(jurnals, akuns);
  const ak = computeArusKas(akuns, saldoPl);
  const ppn = rekapPpnJurnal(jurnals, akuns);
  const s = opts.sections;

  const drawHeader = (subtitle: string) => {
    doc.setFillColor(...primaryRgb);
    doc.rect(0, 0, 210, 24, "F");
    let textX = 14;
    if (opts.logoDataUrl) {
      try {
        doc.addImage(opts.logoDataUrl, "PNG", 12, 4, 16, 16);
        textX = 32;
      } catch {}
    }
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(opts.nama || "OAS Akuntansi", textX, 11);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `${subtitle}  ·  Periode: ${opts.periode}${opts.proyek ? `  ·  ${opts.proyek}` : ""}`,
      textX,
      18
    );
    doc.setTextColor(30, 41, 59);
  };

  let hasFirstPage = false;
  const startSection = (title: string): number => {
    if (hasFirstPage) doc.addPage();
    hasFirstPage = true;
    drawHeader(title);
    return 32;
  };

  if (s.dashboard) {
    const y = startSection("Ringkasan Keuangan");
    autoTable(doc, {
      startY: y,
      head: [["Indikator Keuangan", "Nominal"]],
      body: [
        ["Total Pendapatan", fmtRp(lr.totalPendapatan)],
        ["Total HPP", fmtRp(lr.totalHpp)],
        ["Laba Kotor", fmtRp(lr.labaKotor)],
        ["Total Beban Operasional", fmtRp(lr.totalBeban)],
        ["Laba Bersih", fmtRp(lr.labaBersih)],
        ["Total Aset", fmtRp(ner.aset)],
        ["Total Liabilitas", fmtRp(ner.liab)],
        ["Total Ekuitas", fmtRp(ner.totalEkuitas)],
        ["Arus Kas Bersih", fmtRp(ak.kenaikan)],
      ],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      styles: { fontSize: 9.5 },
    });
  }

  if (s.labaRugi) {
    const y = startSection("Laporan Laba Rugi");
    autoTable(doc, {
      startY: y,
      head: [["Kode", "Akun / Keterangan", "Nominal"]],
      body: [
        ...lr.pRows.map((r) => [r.kode, r.nama, fmtRp(r.nilai)]),
        ["", "Total Pendapatan", fmtRp(lr.totalPendapatan)],
        ...lr.hRows.map((r) => [r.kode, r.nama, fmtRp(r.nilai)]),
        ["", "Laba Kotor", fmtRp(lr.labaKotor)],
        ...lr.bRows.map((r) => [r.kode, r.nama, fmtRp(r.nilai)]),
        ["", "LABA BERSIH", fmtRp(lr.labaBersih)],
      ],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 2: { halign: "right" } },
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        const txt = String(data.row.cells[1]?.raw || "");
        if (txt === "LABA BERSIH" || txt === "Laba Kotor" || txt === "Total Pendapatan") {
          data.cell.styles.fontStyle = "bold";
          if (txt === "LABA BERSIH") {
            data.cell.styles.fillColor = accentRgb;
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
      },
    });
  }

  if (s.neraca) {
    const y = startSection("Neraca (Posisi Keuangan)");
    autoTable(doc, {
      startY: y,
      head: [["Kode", "Akun", "Saldo"]],
      body: [
        ...ner.asetRows.map((r) => [r.kode, r.nama, fmtRp(r.nilai)]),
        ["", "TOTAL ASET", fmtRp(ner.aset)],
        ...ner.liabRows.map((r) => [r.kode, r.nama, fmtRp(r.nilai)]),
        ["", "TOTAL LIABILITAS", fmtRp(ner.liab)],
        ...ner.ekRows.map((r) => [r.kode, r.nama, fmtRp(r.isPrive ? -r.nilai : r.nilai)]),
        ["", "Laba Tahun Berjalan", fmtRp(ner.labaBersih)],
        ["", "TOTAL EKUITAS", fmtRp(ner.totalEkuitas)],
        ["", "TOTAL LIABILITAS & EKUITAS", fmtRp(ner.liab + ner.totalEkuitas)],
      ],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 2: { halign: "right" } },
      styles: { fontSize: 9 },
      didParseCell: (data) => {
        const txt = String(data.row.cells[1]?.raw || "");
        if (txt.startsWith("TOTAL ")) data.cell.styles.fontStyle = "bold";
      },
    });
  }

  if (s.neracaSaldo) {
    const y = startSection("Neraca Saldo");
    autoTable(doc, {
      startY: y,
      head: [["Kode", "Nama Akun", "Debit", "Kredit"]],
      body: [
        ...ns.rows.map((r) => [
          r.kode,
          r.nama,
          r.debit ? fmtRp(r.debit) : "—",
          r.kredit ? fmtRp(r.kredit) : "—",
        ]),
        ["", "TOTAL", fmtRp(ns.totalDebit), fmtRp(ns.totalKredit)],
      ],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
      styles: { fontSize: 8.5 },
    });
  }

  if (s.jurnalUmum) {
    const y = startSection("Jurnal Umum");
    const body: string[][] = [];
    jurnals.forEach((j) => {
      (j.lines || []).forEach((l) => {
        body.push([
          j.tanggal || "",
          j.no || "",
          l.akun,
          (l.ket || j.ket || "").slice(0, 48),
          l.debit ? fmtRp(l.debit) : "—",
          l.kredit ? fmtRp(l.kredit) : "—",
        ]);
      });
    });
    autoTable(doc, {
      startY: y,
      head: [["Tanggal", "No", "Akun", "Keterangan", "Debit", "Kredit"]],
      body: body.length ? body : [["—", "—", "—", "Belum ada jurnal", "—", "—"]],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 4: { halign: "right" }, 5: { halign: "right" } },
      styles: { fontSize: 8 },
    });
  }

  if (s.invoice && invoices.length) {
    const y = startSection("Daftar Invoice & Piutang");
    autoTable(doc, {
      startY: y,
      head: [["No Invoice", "Pelanggan", "Tanggal", "Total", "Sisa", "Status"]],
      body: invoices.map((i) => [
        i.noInvoice,
        i.pelanggan,
        i.tanggal,
        fmtRp(i.total),
        fmtRp(i.sisaTagihan),
        i.status,
      ]),
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 3: { halign: "right" }, 4: { halign: "right" } },
      styles: { fontSize: 8.5 },
    });
  }

  if (s.pajak) {
    const y = startSection("Rekap Pajak PPN");
    autoTable(doc, {
      startY: y,
      head: [["Komponen Pajak", "Nominal"]],
      body: [
        ["PPN Keluaran", fmtRp(ppn.keluaran)],
        ["PPN Masukan", fmtRp(ppn.masukan)],
        ["PPN Kurang / (Lebih) Bayar", fmtRp(ppn.kurangBayar)],
      ],
      headStyles: { fillColor: primaryRgb, textColor: 255 },
      columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
      styles: { fontSize: 9.5 },
    });
  }

  if (!hasFirstPage) {
    startSection("Laporan Keuangan");
    doc.text("Tidak ada seksi laporan yang dipilih.", 14, 40);
  }

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Dicetak oleh OAS Akuntansi · Halaman ${p} dari ${totalPages}`,
      14,
      290
    );
  }

  const fileName = `OAS_${safeFileSlug(opts.nama)}_${safeFileSlug(opts.periode)}.pdf`;
  doc.save(fileName);
  return fileName;
}

export function exportCsvReport(opts: ExportOptions): string {
  const akuns = readAkuns();
  const jurnals = readJurnalEntries();
  const namaAkun = (kode: string) =>
    akuns.find((a) => a.kode === kode)?.nama || kode;
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines: string[] = [
    ["No Jurnal", "Tanggal", "Jenis", "Keterangan", "Kode Akun", "Nama Akun", "Debit", "Kredit"]
      .map(esc)
      .join(","),
  ];
  jurnals.forEach((j) => {
    (j.lines || []).forEach((l) => {
      lines.push(
        [
          j.no || "",
          j.tanggal || "",
          j.jenis || "Manual",
          l.ket || j.ket || "",
          l.akun,
          namaAkun(l.akun),
          Number(l.debit) || 0,
          Number(l.kredit) || 0,
        ]
          .map(esc)
          .join(",")
      );
    });
  });

  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  });
  const fileName = `OAS_${safeFileSlug(opts.nama)}_${safeFileSlug(opts.periode)}.csv`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return fileName;
}

export function registerNpmExportGlobals(): void {
  if (typeof window === "undefined") return;
  const win = window as unknown as Record<string, unknown>;
  win.XLSX = XLSX;
  win.jspdf = { jsPDF };
}
