import type { ExportSections, PdfTemplateKey, PdfThemeColors } from "./types";

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

export const PDF_THEME_KEY = "oas_pdf_theme_v2";

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
