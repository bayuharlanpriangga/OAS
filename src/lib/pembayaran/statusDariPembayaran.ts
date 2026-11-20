import type { DokumenTagihan, Pembayaran, PembayaranJenis } from "@/types";
import { PEMBAYARAN_STATUS_LANJUT } from "./constants";
import { sisaTagihan } from "./sisaTagihan";
import { totalDibayar } from "./totalDibayar";

export function statusDariPembayaran(
  dok: DokumenTagihan | null | undefined,
  daftar: readonly Pembayaran[],
  jenis: PembayaranJenis = "invoice"
): string {
  if (!dok || typeof dok !== "object") return "";
  const asal = (typeof dok.status === "string" ? dok.status : "").trim();
  const dasar =
    jenis === "invoice" ? "terkirim" : jenis === "bill" ? "diterima" : "";
  const statusTerhitung = PEMBAYARAN_STATUS_LANJUT[jenis];
  if (
    !dasar ||
    ((!statusTerhitung || !statusTerhitung.includes(asal)) && asal !== "lunas")
  ) {
    return asal;
  }

  const total =
    typeof dok.total === "number" && isFinite(dok.total) ? dok.total : 0;
  if (total <= 0) return asal;

  const sisa = sisaTagihan(dok, daftar, jenis);
  if (sisa <= 0) return "lunas";

  const dibayar = totalDibayar(dok, daftar, jenis);
  if (dibayar > 0 && sisa < total) return "sebagian";
  return dasar;
}
