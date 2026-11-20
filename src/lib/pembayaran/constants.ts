import type { PembayaranJenis } from "@/types";

export const PEMBAYARAN_JENIS: readonly PembayaranJenis[] = ["invoice", "bill"];

export const PEMBAYARAN_STATUS_LANJUT: Record<
  PembayaranJenis,
  readonly string[]
> = {
  invoice: ["terkirim", "sebagian"],
  bill: ["diterima", "sebagian"],
};
