import { getLegacyKsStore } from "./akses-store-stok";

export function setLegacyKsJustWroteDirectly(val: boolean): void {
  getLegacyKsStore()?.setKsJustWroteDirectly?.(val);
}
