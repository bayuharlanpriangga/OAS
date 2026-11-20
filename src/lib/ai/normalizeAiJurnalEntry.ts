import type { JurnalLine } from "@/types";
import { JENIS_JURNAL, SUMBER_JURNAL } from "../accounting/constants";
import type { AiAction } from "./types";

export function normalizeAiJurnalEntry(
  action: AiAction,
  today: string = new Date().toISOString().split("T")[0]
): {
  tanggal: string;
  ket: string;
  jenis: string;
  sumber: string;
  lines: JurnalLine[];
  totalDebit: number;
  totalKredit: number;
} {
  const rawLines = Array.isArray(action.lines) ? action.lines : [];
  const lines: JurnalLine[] = rawLines
    .filter((l): l is Record<string, unknown> => typeof l === "object" && l !== null)
    .map((l) => ({
      akun: typeof l.akun === "string" ? l.akun.trim() : String(l.akun ?? ""),
      ket: typeof l.ket === "string" ? l.ket : "",
      debit: Number(l.debit) || 0,
      kredit: Number(l.kredit) || 0,
    }));

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
  const totalKredit = lines.reduce((s, l) => s + l.kredit, 0);

  return {
    tanggal:
      typeof action.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(action.tanggal.trim())
        ? action.tanggal.trim()
        : today,
    ket:
      typeof action.ket === "string" && action.ket.trim()
        ? action.ket.trim()
        : "Dari AI",
    jenis:
      typeof action.jenis === "string" && action.jenis.trim()
        ? action.jenis.trim()
        : JENIS_JURNAL.MANUAL,
    sumber: SUMBER_JURNAL.ORIAS_AI,
    lines,
    totalDebit,
    totalKredit,
  };
}
