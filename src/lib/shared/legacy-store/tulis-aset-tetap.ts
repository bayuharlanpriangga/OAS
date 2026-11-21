import type { AsetTetap } from "@/types";
import { getLegacyStore } from "./akses-store";

export function writeAsetTetapList(next: AsetTetap[]): void {
  getLegacyStore()?.setAsetTetapList(next);
}
