import { getLegacyStore } from "./getLegacyStore";
import type { AnggaranRecord } from "./types";

export function readAnggaranList(): AnggaranRecord[] {
  return getLegacyStore()?.getAnggaranList?.() ?? [];
}
