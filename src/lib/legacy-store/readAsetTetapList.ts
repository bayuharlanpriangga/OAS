import type { AsetTetap } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readAsetTetapList(): AsetTetap[] {
  return getLegacyStore()?.getAsetTetapList() ?? [];
}
