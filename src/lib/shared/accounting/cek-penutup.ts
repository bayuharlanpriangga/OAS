import type { JurnalEntry } from "@/types";
import { JENIS_PENUTUP } from "./constants";

export function isJurnalPenutup(j: JurnalEntry | null | undefined): boolean {
  return !!j && j.jenis === JENIS_PENUTUP;
}
