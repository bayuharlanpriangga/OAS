import { getLegacyKsStore } from "./akses-store-stok";

export function setLegacyActiveKartuStock(cardId: string, katId: string): void {
  getLegacyKsStore()?.setActiveKartuStock?.(cardId, katId);
}
