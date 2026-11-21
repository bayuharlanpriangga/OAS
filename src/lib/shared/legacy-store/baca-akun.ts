import type { Akun } from "@/types";
import { getDefaultAkuns } from "../../master/chart-of-accounts/akun-bawaan";
import { getLegacyStore } from "./akses-store";

export function readAkuns(): Akun[] {
  return getLegacyStore()?.getAkuns() ?? getDefaultAkuns();
}
