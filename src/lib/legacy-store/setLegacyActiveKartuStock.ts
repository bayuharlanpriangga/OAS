import { getLegacyKsStore } from "./getLegacyKsStore";

export function setLegacyActiveKartuStock(cardId: string, katId: string): void {
  getLegacyKsStore()?.setActiveKartuStock?.(cardId, katId);
}
