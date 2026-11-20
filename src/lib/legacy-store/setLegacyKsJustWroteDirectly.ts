import { getLegacyKsStore } from "./getLegacyKsStore";

export function setLegacyKsJustWroteDirectly(val: boolean): void {
  getLegacyKsStore()?.setKsJustWroteDirectly?.(val);
}
