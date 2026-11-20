import type { JurnalEntry } from "@/types";
import { getReversalOf } from "./getReversalOf";

export function isJurnalPembalik(j: JurnalEntry | null | undefined): boolean {
  return !!getReversalOf(j);
}
