import type { Invoice } from "@/types";
import { getLegacyStore } from "./akses-store";

export function writeInvoiceList(next: Invoice[]): void {
  getLegacyStore()?.setInvoiceList?.(next);
}
