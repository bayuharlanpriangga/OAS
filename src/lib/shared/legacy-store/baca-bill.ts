import type { Bill } from "@/types";
import { getLegacyStore } from "./akses-store";

export function readBillList(): Bill[] {
  return getLegacyStore()?.getBillList?.() ?? [];
}
