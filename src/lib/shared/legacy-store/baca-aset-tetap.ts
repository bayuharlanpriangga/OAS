import type { AsetTetap } from "@/types";
import { getLegacyStore } from "./akses-store";

export function readAsetTetapList(): AsetTetap[] {
  return getLegacyStore()?.getAsetTetapList() ?? [];
}
