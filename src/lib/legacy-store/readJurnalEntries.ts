import type { JurnalEntry } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readJurnalEntries(): JurnalEntry[] {
  return getLegacyStore()?.getJurnalEntries() ?? [];
}
