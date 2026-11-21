import type { JurnalEntry } from "@/types";
import { getReversalOf } from "./id-pembalik";

export function getReversedMap(
  jurnalEntries: readonly JurnalEntry[]
): Map<string, string> {
  const map = new Map<string, string>();
  jurnalEntries.forEach((j) => {
    const r = getReversalOf(j);
    if (r && j.no) map.set(r, j.no);
  });
  return map;
}
