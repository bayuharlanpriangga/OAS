import type { Bill } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function writeBillList(next: Bill[]): void {
  getLegacyStore()?.setBillList?.(next);
}
