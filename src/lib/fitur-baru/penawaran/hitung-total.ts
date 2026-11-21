import type { DokRecord, DokTotalResult } from "@/types";
import { totalDok } from "./total-dokumen";

export function hitungTotalDok(
  dok: Pick<DokRecord, "items" | "ppnTarif"> | null | undefined
): DokTotalResult {
  const subtotal = totalDok(dok);
  const t =
    dok &&
    typeof dok.ppnTarif === "number" &&
    isFinite(dok.ppnTarif) &&
    dok.ppnTarif > 0
      ? dok.ppnTarif
      : 0;
  const ppn = t ? Math.round((subtotal * t) / 100) : 0;
  return { subtotal, ppn, total: subtotal + ppn };
}
