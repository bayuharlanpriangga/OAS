import type { Invoice } from "@/types";
import { getLegacyStore } from "./akses-store";

export function readInvoiceList(): Invoice[] {
  return getLegacyStore()?.getInvoiceList?.() ?? [];
}
