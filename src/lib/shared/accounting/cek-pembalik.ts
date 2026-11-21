import type { JurnalEntry } from "@/types";
import { getReversalOf } from "./id-pembalik";

export function isJurnalPembalik(j: JurnalEntry | null | undefined): boolean {
  return !!getReversalOf(j);
}
