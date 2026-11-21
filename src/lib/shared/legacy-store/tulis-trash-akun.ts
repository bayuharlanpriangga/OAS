import type { AkunTrashItem } from "@/types";
import { getLegacyStore } from "./akses-store";

export function writeAkunsTrash(next: AkunTrashItem[]): void {
  getLegacyStore()?.setAkunsTrash(next);
}
