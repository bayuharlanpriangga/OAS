import type { Akun } from "@/types";
import { getLegacyStore } from "./getLegacyStore";

export function writeAkuns(next: Akun[]): void {
  getLegacyStore()?.setAkuns(next);
}
