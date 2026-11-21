import type { JurnalEntry } from "@/types";
import { adalahJurnalPembelian } from "./cek-jurnal-beli";
import { getReversedMap } from "./peta-dibalik";
import { isJurnalPembalik } from "./cek-pembalik";

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
