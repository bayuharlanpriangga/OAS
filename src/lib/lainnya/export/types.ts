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
