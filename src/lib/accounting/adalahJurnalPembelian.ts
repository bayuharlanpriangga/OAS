import type { JurnalEntry } from "@/types";
import { JENIS_JURNAL } from "./constants";

export function adalahJurnalPembelian(
  j: JurnalEntry | null | undefined
): boolean {
  return !!j && (j.jenis === "Pembelian" || j.jenis === JENIS_JURNAL.BILL);
}
