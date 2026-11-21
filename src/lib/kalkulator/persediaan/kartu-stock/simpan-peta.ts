import { getLegacyKsStore } from "../../../shared/legacy-store/akses-store-stok";
import type { KsCardRecord } from "../../../shared/legacy-store/types";
import type { KsCard } from "./types";

export function writeMksMap(next: Record<string, KsCard>): void {
  getLegacyKsStore()?.setMultiKartuStock?.(
    next as unknown as Record<string, KsCardRecord>
  );
}
