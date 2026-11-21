import { PERAN_BISNIS_LABEL } from "./constants";
import type { PeranBisnis } from "./types";

export function labelPeranBisnis(role?: string | null): string {
  if (role && role in PERAN_BISNIS_LABEL) {
    return PERAN_BISNIS_LABEL[role as PeranBisnis];
  }
  return PERAN_BISNIS_LABEL.viewer;
}
