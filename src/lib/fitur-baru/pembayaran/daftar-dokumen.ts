import type { Pembayaran, PembayaranJenis } from "@/types";
import { PEMBAYARAN_JENIS } from "./constants";

export function pembayaranDokumen(
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis,
  dokId: string
): Pembayaran[] {
  if (
    !PEMBAYARAN_JENIS.includes(jenis) ||
    dokId === undefined ||
    dokId === null ||
    dokId === ""
  ) {
    return [];
  }
  return (Array.isArray(daftar) ? daftar : []).filter(
    (p) =>
      p &&
      typeof p === "object" &&
      p.jenis === jenis &&
      String(p.dokId) === String(dokId) &&
      typeof p.jumlah === "number" &&
      isFinite(p.jumlah) &&
      p.jumlah > 0
  );
}
