import type { AkunTrashItem } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function readAkunsTrash(): AkunTrashItem[] {
  return getLegacyStore()?.getAkunsTrash() ?? [];
}
