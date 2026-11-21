import type { JurnalEntry } from "@/types";

export function filterJurnalRange(
  jurnals: readonly JurnalEntry[],
  from: string,
  to: string
): JurnalEntry[] {
  return jurnals.filter((j) => {
    const t = j.tanggal || "";
    if (from && t < from) return false;
    if (to && t > to) return false;
    return true;
  });
}
