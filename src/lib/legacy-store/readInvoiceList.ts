import type { Invoice } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readInvoiceList(): Invoice[] {
  return getLegacyStore()?.getInvoiceList?.() ?? [];
}
