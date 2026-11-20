import type { AkunTrashItem } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function writeAkunsTrash(next: AkunTrashItem[]): void {
  getLegacyStore()?.setAkunsTrash(next);
}
