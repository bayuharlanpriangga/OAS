import { readCounterList } from "../../shared/legacy-store/baca-counter";
import { counterSetelahPakai } from "../../shared/penomoran/update-counter";
import { syncCounterOnly } from "./sinkron-counter";

export function catatNomorInvoiceState(nomor: string): boolean {
  const cur = readCounterList();
  const baru = counterSetelahPakai(cur, nomor);
  if (baru === cur) return false;
  syncCounterOnly(baru);
  return true;
}
