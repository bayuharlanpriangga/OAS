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

export interface ExportOptions {
  nama: string;
  proyek?: string;
  periode: string;
  excelTemplate?: ExcelTemplateType;
  sections: ExportSections;
  pdfTheme?: PdfThemeConfig;
  logoDataUrl?: string | null;
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

export function safeFileSlug(s: string): string {
  return (s || "OAS")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

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
