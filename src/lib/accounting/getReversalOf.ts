import type { JurnalEntry } from "@/types";
import { REV_KET_RE } from "./constants";

export function getReversalOf(j: JurnalEntry | null | undefined): string {
  if (!j) return "";
  if (j.reversalOf) return j.reversalOf;
  const m = REV_KET_RE.exec(j.ket || "");
  return m ? m[1].trim() : "";
}
