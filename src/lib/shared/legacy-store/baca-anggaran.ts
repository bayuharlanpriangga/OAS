import { getLegacyStore } from "./akses-store";
import type { AnggaranRecord } from "./types";

export function readAnggaranList(): AnggaranRecord[] {
  return getLegacyStore()?.getAnggaranList?.() ?? [];
}
