import { getLegacyKsStore } from "./akses-store-stok";
import type { KsCardRecord } from "./types";

export function readMultiKartuStock(): Record<string, KsCardRecord> {
  return getLegacyKsStore()?.getMultiKartuStock() ?? {};
}
