import type { Akun, JurnalEntry } from "@/types";
import { saldoAlamiPL } from "./saldo-alami-akun";

export function saldoBersihPL(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[],
  kode: string
): number {
  return saldoAlamiPL(akuns, jurnalEntries, kode, { tanpaPenutup: true });
}
