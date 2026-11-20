import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

export function registerNpmExportGlobals(): void {
  if (typeof window === "undefined") return;
  const win = window as unknown as Record<string, unknown>;
  win.XLSX = XLSX;
  win.jspdf = { jsPDF };
}
