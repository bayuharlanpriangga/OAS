import { getLegacyStore } from "./getLegacyStore";

export function getJurnalSumberAktif(): string {
  return getLegacyStore()?.getJurnalSumberAktif?.() ?? "";
}
