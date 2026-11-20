import { getLegacyKsStore } from "../legacy-store/getLegacyKsStore";
import type { KsCardRecord } from "../legacy-store/types";
import type { KsCard } from "./types";

export function writeMksMap(next: Record<string, KsCard>): void {
  getLegacyKsStore()?.setMultiKartuStock?.(
    next as unknown as Record<string, KsCardRecord>
  );
}
