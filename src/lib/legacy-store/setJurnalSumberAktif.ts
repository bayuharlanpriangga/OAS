import { getLegacyStore } from "./getLegacyStore";

export function setJurnalSumberAktif(next: string): void {
  getLegacyStore()?.setJurnalSumberAktif?.(next);
}
