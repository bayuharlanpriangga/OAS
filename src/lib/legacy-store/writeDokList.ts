import type { DokRecord } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function writeDokList(next: DokRecord[]): void {
  getLegacyStore()?.setDokList?.(next);
}
