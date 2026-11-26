import { readAkuns, readJurnalEntries } from "../../shared/legacy-store";
import { safeFileSlug, type ExportOptions } from "./tema-helper";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";

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
