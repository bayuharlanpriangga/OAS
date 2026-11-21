import { getLegacyKsStore } from "../../../shared/legacy-store/akses-store-stok";
import type { KsCard } from "./types";

export function readMksMap(): Record<string, KsCard> {
  return (getLegacyKsStore()?.getMultiKartuStock() ??
    {}) as unknown as Record<string, KsCard>;
}
