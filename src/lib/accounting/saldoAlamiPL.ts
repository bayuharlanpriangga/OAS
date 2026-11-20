import type { Akun, ComputeSaldoOptions, JurnalEntry } from "@/types";
import { computeSaldoAll } from "./computeSaldoAll";
import { plNatural } from "./plNatural";

export function saldoAlamiPL(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[],
  kode: string,
  opts?: ComputeSaldoOptions
): number {
  const a = akuns.find((x) => x.kode === kode);
  if (!a) return 0;
  return plNatural(
    a,
    computeSaldoAll(jurnalEntries, opts || { tanpaPenutup: true })[kode]
  );
}
