import { readCounterList } from "../../shared/legacy-store/baca-counter";
import { readInvoiceList } from "../../shared/legacy-store/baca-invoice";
import { nomorBerikut } from "../../shared/penomoran/nomor-berikut";

export function nomorInvoiceBerikutState(tahun?: number): string {
  const y = Number.isInteger(tahun)
    ? (tahun as number)
    : new Date().getFullYear();
  return nomorBerikut(
    "INV",
    y,
    readInvoiceList().map((i) => i && i.noInvoice),
    readCounterList()
  );
}
