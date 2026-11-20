import type { Akun } from "@/types";
import { getDefaultAkuns } from "../default-akuns/getDefaultAkuns";
import { getLegacyStore } from "./getLegacyStore";

export function readAkuns(): Akun[] {
  return getLegacyStore()?.getAkuns() ?? getDefaultAkuns();
}
