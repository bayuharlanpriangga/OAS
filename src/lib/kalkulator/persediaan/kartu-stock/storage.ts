import type { KsMetode, KsMetodeData, KsCard, KsKategori } from "./types";
import { getLegacyKsStore, type KsCardRecord, readCurrentCompany } from "../../../shared/legacy-store";

export const KS_METODE_DIAKUI: readonly KsMetode[] = ["fifo", "wa", "mwa"];

export const KS_METODE_LABEL: Record<KsMetode, string> = {
  fifo: "FIFO (Masuk Pertama Keluar Pertama)",
  wa: "Weighted Average (Rata-rata Tertimbang)",
  mwa: "Moving Weighted Average (Rata-rata Bergerak)",
  lifo: "LIFO (Data Lama · Non-PSAK 14)",
};

let ksIdCounter = 1;

export function nextKsId(): number {
  return ksIdCounter++;
}

export function ksDefaultData(): KsMetodeData {
  return { fifo: [], lifo: [], wa: [], mwa: [] };
}

export function ksMetodeDiakui(m: string): boolean {
  return KS_METODE_DIAKUI.includes(m as KsMetode);
}

export function readMksMap(): Record<string, KsCard> {
  return (getLegacyKsStore()?.getMultiKartuStock() ??
    {}) as unknown as Record<string, KsCard>;
}

export function writeMksMap(next: Record<string, KsCard>): void {
  getLegacyKsStore()?.setMultiKartuStock?.(
    next as unknown as Record<string, KsCardRecord>
  );
}

function notifyKsCloud(): void {
  if (typeof window === "undefined") return;
  const win = window as unknown as { saveKartuStockToCloud?: () => void };
  win.saveKartuStockToCloud?.();
}

export function saveMksStore(): void {
  const mks = readMksMap();
  const cid = readCurrentCompany()?.id || "guest";
  try {
    localStorage.setItem("oas_mks_" + cid, JSON.stringify(mks));
  } catch {}
  notifyKsCloud();
}

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
    if (!card) return;
    if (card.data && !card.kategori) needsMigrate = true;
    if (!Array.isArray(card.rakList)) {
      card.rakList = [];
      needsMigrate = true;
    }
    if (!card.kategori) {
      card.kategori = {};
      needsMigrate = true;
    }
  });

  if (needsMigrate) {
    const migrated: Record<string, KsCard> = {};
    Object.values(mks).forEach((card) => {
      if (!card) return;
      if (card.data && (!card.kategori || Object.keys(card.kategori).length === 0)) {
        const katId =
          "kat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
        migrated[card.id] = {
          id: card.id,
          nama: card.nama,
          satuan: card.satuan || "unit",
          lokasi: card.lokasi || "",
          rakList: Array.isArray(card.rakList) ? card.rakList : [],
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
      } else {
        migrated[card.id] = {
          ...card,
          lokasi: card.lokasi || "",
          rakList: Array.isArray(card.rakList) ? card.rakList : [],
          kategori: card.kategori || {},
        };
      }
    });
    mks = migrated;
    writeMksMap(mks);
    saveMksStore();
  }

  // Jika belum ada gudang sama sekali, buat 1 Gudang Utama kosong (barang hanya masuk lewat Pembelian)
  if (Object.keys(mks).length === 0) {
    const cardId = "gudang_" + Date.now();
    mks[cardId] = {
      id: cardId,
      nama: "Gudang Utama",
      satuan: "unit",
      lokasi: "",
      rakList: [],
      createdAt: new Date().toISOString(),
      kategori: {},
    };
    writeMksMap(mks);
    getLegacyKsStore()?.setActiveKartuStock?.(cardId, null);
    saveMksStore();
    return { cardId, katId: null };
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
