import { readCounterList } from "../legacy-store/readCounterList";
import { counterSetelahPakai } from "../penomoran/counterSetelahPakai";
import { syncCounterOnly } from "./syncCounterOnly";

export function catatNomorInvoiceState(nomor: string): boolean {
  const cur = readCounterList();
  const baru = counterSetelahPakai(cur, nomor);
  if (baru === cur) return false;
  syncCounterOnly(baru);
  return true;
}
