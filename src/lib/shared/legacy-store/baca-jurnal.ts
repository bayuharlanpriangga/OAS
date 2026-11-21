import type { JurnalEntry } from "@/types";
import { getLegacyStore } from "./akses-store";

export function readJurnalEntries(): JurnalEntry[] {
  return getLegacyStore()?.getJurnalEntries() ?? [];
}
