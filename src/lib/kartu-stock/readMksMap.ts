import { getLegacyKsStore } from "../legacy-store/getLegacyKsStore";
import type { KsCard } from "./types";

export function readMksMap(): Record<string, KsCard> {
  return (getLegacyKsStore()?.getMultiKartuStock() ??
    {}) as unknown as Record<string, KsCard>;
}
