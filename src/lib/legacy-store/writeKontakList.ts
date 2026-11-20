import type { Kontak } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function writeKontakList(next: Kontak[]): void {
  getLegacyStore()?.setKontakList?.(next);
}
