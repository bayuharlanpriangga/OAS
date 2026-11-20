import { getLegacyStore } from "./getLegacyStore";
import type { AnggaranRecord } from "./types";

export function writeAnggaranList(next: AnggaranRecord[]): void {
  getLegacyStore()?.setAnggaranList?.(next);
}
