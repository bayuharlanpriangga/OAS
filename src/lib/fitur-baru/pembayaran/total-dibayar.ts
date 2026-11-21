import type { DokumenTagihan, Pembayaran, PembayaranJenis } from "@/types";
import { bayarBulat } from "./pembulatan";
import { pembayaranDokumen } from "./daftar-dokumen";

export function totalDibayar(
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis
): number {
  if (!dok || typeof dok !== "object") return 0;
  const lama =
    typeof dok.dibayarLama === "number" &&
    isFinite(dok.dibayarLama) &&
    dok.dibayarLama > 0
      ? dok.dibayarLama
      : 0;
  const baru = pembayaranDokumen(daftar, jenis, dok.id).reduce(
    (s, p) => s + p.jumlah,
    0
  );
  return bayarBulat(lama + baru);
}
