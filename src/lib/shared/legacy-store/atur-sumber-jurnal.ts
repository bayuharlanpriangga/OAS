import { getLegacyStore } from "./akses-store";

export function setJurnalSumberAktif(next: string): void {
  getLegacyStore()?.setJurnalSumberAktif?.(next);
}
