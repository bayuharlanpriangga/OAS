import type { AkunTrashItem } from "@/types";
import { getLegacyStore } from "./akses-store";

export function readAkunsTrash(): AkunTrashItem[] {
  return getLegacyStore()?.getAkunsTrash() ?? [];
}
