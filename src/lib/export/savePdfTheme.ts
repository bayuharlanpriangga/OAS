import { PDF_THEME_KEY } from "./constants";
import type { PdfThemeConfig } from "./types";

export function savePdfTheme(cfg: PdfThemeConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PDF_THEME_KEY, JSON.stringify(cfg));
  } catch {}
}
