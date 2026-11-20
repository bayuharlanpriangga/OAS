import type { CounterRecord } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readCounterList(): CounterRecord[] {
  return getLegacyStore()?.getCounterList?.() ?? [];
}
