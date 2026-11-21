import type { Kontak } from "@/types";
import { getLegacyStore } from "./akses-store";

export function readKontakList(): Kontak[] {
  return getLegacyStore()?.getKontakList?.() ?? [];
}
