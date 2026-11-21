import type { CounterRecord } from "@/types";
import { getLegacyStore } from "./akses-store";

export function readCounterList(): CounterRecord[] {
  return getLegacyStore()?.getCounterList?.() ?? [];
}
