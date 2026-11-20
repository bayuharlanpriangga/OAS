import type { Akun, ComputeSaldoOptions, JurnalEntry } from "@/types";
import { computeSaldoAll } from "./computeSaldoAll";

export function computeSaldoBersih(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[],
  kode: string,
  opts?: ComputeSaldoOptions
): number {
  const a = akuns.find((x) => x.kode === kode);
  if (!a) return 0;
  const map = computeSaldoAll(jurnalEntries, opts);
  const s = map[kode] || { debit: 0, kredit: 0 };
  return a.normal === "D" ? s.debit - s.kredit : s.kredit - s.debit;
}
