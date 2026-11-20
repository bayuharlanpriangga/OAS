import { getLegacyKsStore } from "./getLegacyKsStore";

export function setLegacyKartuStockTab(metode: string): void {
  getLegacyKsStore()?.setKartuStockTab(metode);
}
