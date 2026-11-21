import type { DokRecord } from "@/types";
import { getLegacyStore } from "./akses-store";

export function writeDokList(next: DokRecord[]): void {
  getLegacyStore()?.setDokList?.(next);
}
