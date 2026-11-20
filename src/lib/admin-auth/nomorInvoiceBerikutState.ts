import { readCounterList } from "../legacy-store/readCounterList";
import { readInvoiceList } from "../legacy-store/readInvoiceList";
import { nomorBerikut } from "../penomoran/nomorBerikut";

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
