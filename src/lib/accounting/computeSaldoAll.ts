import type { ComputeSaldoOptions, JurnalEntry, SaldoMap } from "@/types";
import { getJurnalTanpaPenutup } from "./getJurnalTanpaPenutup";

export function computeSaldoAll(
  jurnalEntries: readonly JurnalEntry[],
  opts?: ComputeSaldoOptions
): SaldoMap {
  const map: SaldoMap = {};
  const src =
    opts && opts.tanpaPenutup
      ? getJurnalTanpaPenutup(jurnalEntries)
      : jurnalEntries;
  src.forEach((j) =>
    j.lines.forEach((l) => {
      if (!map[l.akun]) map[l.akun] = { debit: 0, kredit: 0 };
      map[l.akun].debit += l.debit || 0;
      map[l.akun].kredit += l.kredit || 0;
    })
  );
  return map;
}
