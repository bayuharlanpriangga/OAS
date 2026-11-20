import { getCloudSync } from "./getCloudSync";
import { readCounterList } from "./readCounterList";
import { readInvoiceList } from "./readInvoiceList";

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
