import type { DokumenTagihan, SusunPembayaranResult } from "@/types";
import { statusDariPembayaran } from "../../fitur-baru/pembayaran/status-tagihan";
import { readPembayaranList } from "./baca-pembayaran";
import { simpanPembayaranState } from "./simpan-pembayaran";
import { writePembayaranList } from "./tulis-pembayaran";

export function catatPembayaranState(
  dok: DokumenTagihan,
  hasil: SusunPembayaranResult
): Promise<boolean> {
  if (!dok || !hasil || !hasil.ok) return Promise.resolve(false);
  const nextList = [hasil.pembayaran, ...readPembayaranList()];
  writePembayaranList(nextList);
  if (hasil.dibayarLama > 0) dok.dibayarLama = hasil.dibayarLama;
  dok.sisaTagihan = hasil.sisaBaru;
  dok.status = statusDariPembayaran(
    dok,
    nextList,
    hasil.pembayaran.jenis
  ) as DokumenTagihan["status"];
  return simpanPembayaranState(hasil.pembayaran.jenis);
}
