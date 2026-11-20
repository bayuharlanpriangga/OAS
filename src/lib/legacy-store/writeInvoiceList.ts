import type { Invoice } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function writeInvoiceList(next: Invoice[]): void {
  getLegacyStore()?.setInvoiceList?.(next);
}
