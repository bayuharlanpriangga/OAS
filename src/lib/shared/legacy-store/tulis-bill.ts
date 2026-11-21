import type { Bill } from "@/types";
import { getLegacyStore } from "./akses-store";

export function writeBillList(next: Bill[]): void {
  getLegacyStore()?.setBillList?.(next);
}
