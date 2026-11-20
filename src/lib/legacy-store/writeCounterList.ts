import type { CounterRecord } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function writeCounterList(next: CounterRecord[]): void {
  getLegacyStore()?.setCounterList?.(next);
}
