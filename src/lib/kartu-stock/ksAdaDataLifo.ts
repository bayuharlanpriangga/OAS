import { readMksMap } from "./readMksMap";
import type { KsCard } from "./types";

export function ksAdaDataLifo(
  mks: Record<string, KsCard> = readMksMap()
): boolean {
  try {
    return Object.values(mks || {}).some(
      (card) =>
        Object.values(card.kategori || {}).some(
          (kat) => (kat.data?.lifo || []).length > 0
        ) || (card.data?.lifo || []).length > 0
    );
  } catch {
    return false;
  }
}
