import { getLegacyKsStore } from "./akses-store-stok";

export function setLegacyKartuStockTab(metode: string): void {
  getLegacyKsStore()?.setKartuStockTab(metode);
}
