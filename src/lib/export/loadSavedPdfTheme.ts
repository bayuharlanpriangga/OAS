import { PDF_THEME_DEFAULTS, PDF_THEME_KEY } from "./constants";
import type { PdfTemplateKey, PdfThemeConfig } from "./types";

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
