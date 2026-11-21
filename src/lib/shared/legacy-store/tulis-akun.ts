import type { Akun } from "@/types";
import { getLegacyStore } from "./akses-store";

export function writeAkuns(next: Akun[]): void {
  getLegacyStore()?.setAkuns(next);
}
