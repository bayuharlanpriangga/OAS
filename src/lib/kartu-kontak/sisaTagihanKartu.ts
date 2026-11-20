import type { Bill, Invoice, Pembayaran } from "@/types";
import { sisaTagihan } from "../pembayaran/sisaTagihan";
import { KARTU_CFG } from "./constants";
import type { KartuKontakJenis } from "./types";

export function sisaTagihanKartu(
  dok: Invoice | Bill,
  bayar: readonly Pembayaran[],
  jenis: KartuKontakJenis
): number {
  return sisaTagihan(dok, bayar, KARTU_CFG[jenis].jenisBayar);
}
