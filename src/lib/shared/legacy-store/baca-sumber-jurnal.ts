import { getLegacyStore } from "./akses-store";

export function getJurnalSumberAktif(): string {
  return getLegacyStore()?.getJurnalSumberAktif?.() ?? "";
}
