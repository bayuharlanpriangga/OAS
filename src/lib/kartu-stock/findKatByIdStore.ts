import { readMksMap } from "./readMksMap";
import type { KsCard, KsKategori } from "./types";

export function findKatByIdStore(
  katId: string
): { card: KsCard; kat: KsKategori } | null {
  const mks = readMksMap();
  for (const card of Object.values(mks)) {
    if (card?.kategori?.[katId]) {
      return { card, kat: card.kategori[katId] };
    }
  }
  return null;
}
