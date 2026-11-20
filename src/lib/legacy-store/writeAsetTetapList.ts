import type { AsetTetap } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function writeAsetTetapList(next: AsetTetap[]): void {
  getLegacyStore()?.setAsetTetapList(next);
}
