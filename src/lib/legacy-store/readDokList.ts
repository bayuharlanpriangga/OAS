import type { DokRecord } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readDokList(): DokRecord[] {
  return getLegacyStore()?.getDokList?.() ?? [];
}
