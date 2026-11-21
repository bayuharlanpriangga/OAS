import { getLegacyStore } from "./akses-store";
import type { AnggaranRecord } from "./types";

export function writeAnggaranList(next: AnggaranRecord[]): void {
  getLegacyStore()?.setAnggaranList?.(next);
}
