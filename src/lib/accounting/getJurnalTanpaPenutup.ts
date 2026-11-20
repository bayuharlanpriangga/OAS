import type { JurnalEntry } from "@/types";
import { isJurnalPenutup } from "./isJurnalPenutup";

export function getJurnalTanpaPenutup(
  jurnalEntries: readonly JurnalEntry[]
): JurnalEntry[] {
  return jurnalEntries.filter((j) => !isJurnalPenutup(j));
}
