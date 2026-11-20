import type { Kontak } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readKontakList(): Kontak[] {
  return getLegacyStore()?.getKontakList?.() ?? [];
}
