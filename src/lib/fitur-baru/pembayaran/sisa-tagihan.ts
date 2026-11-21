import type { DokumenTagihan, Pembayaran, PembayaranJenis } from "@/types";
import { bayarBulat } from "./pembulatan";
import { totalDibayar } from "./total-dibayar";

export function sisaTagihan(
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis
): number {
  if (
    !dok ||
    typeof dok !== "object" ||
    typeof dok.total !== "number" ||
    !isFinite(dok.total)
  ) {
    return 0;
  }
  return Math.max(0, bayarBulat(dok.total - totalDibayar(dok, daftar, jenis)));
}
