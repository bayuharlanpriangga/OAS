import type { KsKategori } from "../../kalkulator/persediaan/kartu-stock/types";
import type { FoundKartuKategori } from "./types";

export function findKatByNamaPure(
  mks: Record<string, { id?: string; nama?: string; kategori?: Record<string, KsKategori> }>,
  query: unknown
): FoundKartuKategori | null {
  const q = typeof query === "string" ? query.trim().toLowerCase() : "";
  if (!q) return null;

  let partial: FoundKartuKategori | null = null;
  for (const [cardId, card] of Object.entries(mks || {})) {
    const kats = card?.kategori || {};
    for (const [katId, kat] of Object.entries(kats)) {
      const nama = (kat?.nama || "").trim().toLowerCase();
      if (!nama) continue;
      if (nama === q) {
        return { cardId, katId, kat };
      }
      if (!partial && (nama.includes(q) || q.includes(nama))) {
        partial = { cardId, katId, kat };
      }
    }
  }
  return partial;
}
