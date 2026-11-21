import { getCloudSync } from "./sinkron-cloud";
import { readCounterList } from "./baca-counter";
import { readInvoiceList } from "./baca-invoice";

export function simpanInvoiceState(includeCounter = false): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(includeCounter ? ["invoice", "counter"] : ["invoice"]);
  try {
    localStorage.setItem("oas_invoices", JSON.stringify(readInvoiceList()));
    if (includeCounter) {
      localStorage.setItem("oas_counter", JSON.stringify(readCounterList()));
    }
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}
