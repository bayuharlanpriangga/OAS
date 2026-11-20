import type { DokumenTagihan, Pembayaran, PembayaranJenis } from "@/types";
import { bayarBulat } from "./bayarBulat";
import { pembayaranDokumen } from "./pembayaranDokumen";

export function dibayarLamaTurunan(
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
  const lama =
    typeof dok.dibayarLama === "number" &&
    isFinite(dok.dibayarLama) &&
    dok.dibayarLama > 0
      ? dok.dibayarLama
      : 0;
  if (typeof dok.sisaTagihan !== "number" || !isFinite(dok.sisaTagihan)) {
    return bayarBulat(Math.min(dok.total, lama));
  }
  const catat = pembayaranDokumen(daftar, jenis, dok.id).reduce(
    (s, p) => s + p.jumlah,
    0
  );
  const tersirat = bayarBulat(
    dok.total - Math.max(0, dok.sisaTagihan) - catat
  );
  return bayarBulat(
    Math.min(dok.total, Math.max(lama, tersirat > 0 ? tersirat : 0))
  );
}
