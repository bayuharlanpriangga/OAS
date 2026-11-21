import type { Kontak } from "@/types";
import { getLegacyStore } from "./akses-store";

export function writeKontakList(next: Kontak[]): void {
  getLegacyStore()?.setKontakList?.(next);
}
