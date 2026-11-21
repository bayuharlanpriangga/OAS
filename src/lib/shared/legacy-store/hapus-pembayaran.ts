import type { DokumenTagihan, SusunHapusPembayaranResult } from "@/types";
import { simpanPembayaranState } from "./simpan-pembayaran";
import { writePembayaranList } from "./tulis-pembayaran";

export function terapkanHapusPembayaranState(
  dok: DokumenTagihan | null | undefined,
  hasil: SusunHapusPembayaranResult
): Promise<boolean> {
  if (!hasil || !hasil.ok) return Promise.resolve(false);
  writePembayaranList(hasil.daftarBaru);
  if (dok && !hasil.yatim) {
    if (hasil.dibayarLama > 0) dok.dibayarLama = hasil.dibayarLama;
    dok.sisaTagihan = hasil.sisaBaru;
    if (hasil.statusBaru) {
      dok.status = hasil.statusBaru as DokumenTagihan["status"];
    }
  }
  return simpanPembayaranState(hasil.pembayaran.jenis);
}
