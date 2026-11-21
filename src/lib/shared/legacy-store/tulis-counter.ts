import type { CounterRecord } from "@/types";
import { getLegacyStore } from "./akses-store";

export function writeCounterList(next: CounterRecord[]): void {
  getLegacyStore()?.setCounterList?.(next);
}
