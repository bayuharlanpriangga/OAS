import { KS_METODE_DIAKUI } from "./constants";
import type { KsMetode } from "./types";

export function ksMetodeDiakui(m: string): boolean {
  return KS_METODE_DIAKUI.includes(m as KsMetode);
}
