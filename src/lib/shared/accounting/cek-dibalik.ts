import type { JurnalEntry } from "@/types";
import { getReversedMap } from "./peta-dibalik";

export function isJurnalDibalik(
  j: JurnalEntry | null | undefined,
  jurnalEntries: readonly JurnalEntry[]
): boolean {
  return !!j && !!j.no && getReversedMap(jurnalEntries).has(j.no);
}
