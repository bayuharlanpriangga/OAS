import type { JurnalEntry } from "@/types";
import { adalahJurnalPembelian } from "./adalahJurnalPembelian";
import { getReversedMap } from "./getReversedMap";
import { isJurnalPembalik } from "./isJurnalPembalik";

export function jurnalPembelianAktif(
  daftar: readonly JurnalEntry[],
  semuaJurnal?: readonly JurnalEntry[]
): JurnalEntry[] {
  const src = Array.isArray(daftar) ? daftar : [];
  const dibalik = getReversedMap(semuaJurnal ?? src);
  return src.filter(
    (j) =>
      adalahJurnalPembelian(j) &&
      !isJurnalPembalik(j) &&
      !(j.no && dibalik.has(j.no))
  );
}
