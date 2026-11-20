import { getLegacyKsStore } from "../legacy-store/getLegacyKsStore";
import { readCurrentCompany } from "../legacy-store/readCurrentCompany";
import { ksDefaultData } from "./ksDefaultData";
import { readMksMap } from "./readMksMap";
import { saveMksStore } from "./saveMksStore";
import { writeMksMap } from "./writeMksMap";
import type { KsCard } from "./types";

export function initMultiKartuStockStore(): {
  cardId: string | null;
  katId: string | null;
} {
  let mks = readMksMap();
  if (Object.keys(mks).length === 0) {
    const cid = readCurrentCompany()?.id || "guest";
    try {
      const stored = localStorage.getItem("oas_mks_" + cid);
      if (stored) mks = JSON.parse(stored) || {};
    } catch {
      mks = {};
    }
  }

  let needsMigrate = false;
  Object.values(mks).forEach((card) => {
    if (card && card.data && !card.kategori) needsMigrate = true;
  });
  if (needsMigrate) {
    const migrated: Record<string, KsCard> = {};
    Object.values(mks).forEach((card) => {
      const katId =
        "kat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      migrated[card.id] = {
        id: card.id,
        nama: card.nama,
        satuan: card.satuan || "unit",
        createdAt: card.createdAt || new Date().toISOString(),
        kategori: {
          [katId]: {
            id: katId,
            nama: card.nama,
            satuan: card.satuan || "unit",
            deskripsi: "",
            data: JSON.parse(JSON.stringify(card.data || ksDefaultData())),
          },
        },
      };
    });
    mks = migrated;
    writeMksMap(mks);
    saveMksStore();
  }

  if (Object.keys(mks).length === 0) {
    const cardId = "card_" + Date.now();
    const katId = "kat_" + Date.now();
    mks[cardId] = {
      id: cardId,
      nama: "Persediaan Barang",
      satuan: "unit",
      createdAt: new Date().toISOString(),
      kategori: {
        [katId]: {
          id: katId,
          nama: "Barang Dagangan",
          satuan: "unit",
          deskripsi: "",
          data: ksDefaultData(),
        },
      },
    };
    writeMksMap(mks);
    getLegacyKsStore()?.setActiveKartuStock?.(cardId, katId);
    saveMksStore();
    return { cardId, katId };
  }

  writeMksMap(mks);
  const cur = getLegacyKsStore()?.getActiveIds?.() ?? {
    cardId: null,
    katId: null,
  };
  const cardId: string | null =
    cur.cardId && mks[cur.cardId] ? cur.cardId : Object.keys(mks)[0] || null;
  const card = cardId ? mks[cardId] : undefined;
  const katId: string | null =
    cur.katId && card?.kategori?.[cur.katId]
      ? cur.katId
      : card?.kategori
        ? Object.keys(card.kategori)[0] || null
        : null;
  getLegacyKsStore()?.setActiveKartuStock?.(cardId, katId);
  return { cardId, katId };
}
