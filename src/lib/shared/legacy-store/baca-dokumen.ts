import type { DokRecord } from "@/types";
import { getLegacyStore } from "./akses-store";

export function readDokList(): DokRecord[] {
  return getLegacyStore()?.getDokList?.() ?? [];
}
