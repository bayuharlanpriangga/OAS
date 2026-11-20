import type { Bill } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readBillList(): Bill[] {
  return getLegacyStore()?.getBillList?.() ?? [];
}
