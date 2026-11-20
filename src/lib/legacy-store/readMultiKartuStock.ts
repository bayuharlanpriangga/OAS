import { getLegacyKsStore } from "./getLegacyKsStore";
import type { KsCardRecord } from "./types";

export function readMultiKartuStock(): Record<string, KsCardRecord> {
  return getLegacyKsStore()?.getMultiKartuStock() ?? {};
}
