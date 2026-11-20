import { fmtRp } from "./format";
import {
  getLegacyKsStore,
  readCurrentCompany,
  type KsCardRecord,
} from "./legacy-store";

export type KsMetode = "fifo" | "lifo" | "wa" | "mwa";

export const KS_METODE_DIAKUI: readonly KsMetode[] = ["fifo", "wa", "mwa"];

export const KS_METODE_LABEL: Record<KsMetode, string> = {
  fifo: "FIFO (Masuk Pertama Keluar Pertama)",
  wa: "Weighted Average (Rata-rata Tertimbang)",
  mwa: "Moving Weighted Average (Rata-rata Bergerak)",
  lifo: "LIFO (Data Lama — Non-PSAK 14)",
};

export interface KsLayer {
  qty: number;
  harga: number;
}

export interface KsEntry {
  id: number | string;
  tgl: string;
  ket: string;
  mQty: number;
  mHarga: number;
  kQty: number;
  kHarga: number;
  kJml: number;
  keluarLayers?: KsLayer[];
  saldoLayers: KsLayer[];
  jurnalDone?: boolean;
}

export interface KsMetodeData {
  fifo: KsEntry[];
  lifo: KsEntry[];
  wa: KsEntry[];
  mwa: KsEntry[];
}

export interface KsKategori {
  id: string;
  nama: string;
  satuan: string;
  deskripsi?: string;
  data: KsMetodeData;
}

export interface KsCard {
  id: string;
  nama: string;
  satuan: string;
  createdAt?: string;
  lockedFromTrx?: boolean;
  kategori: Record<string, KsKategori>;
  data?: KsMetodeData; // legacy format before migration
}

export interface KsSaldoDetail {
  metode: KsMetode;
  totalQty: number;
  totalNilai: number;
  hppRata: number;
  hppNext: number;
  layers: KsLayer[];
  allMetodeWithSaldo: KsMetode[];
}

let ksIdCounter = 1;

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

export function rebuildStockFromKartu(
  storage: readonly KsEntry[],
  metode: KsMetode
): KsLayer[] {
  let stock: KsLayer[] = [];
  (storage || []).forEach((e) => {
    if (e.mQty > 0) {
      if (metode === "wa" || metode === "mwa") {
        const tq = stock.reduce((s, x) => s + x.qty, 0) + e.mQty;
        const tv =
          stock.reduce((s, x) => s + x.qty * x.harga, 0) + e.mQty * e.mHarga;
        stock = [{ qty: tq, harga: tq ? tv / tq : 0 }];
      } else {
        stock.push({ qty: e.mQty, harga: e.mHarga });
      }
    } else if (e.kQty > 0) {
      let sisa = e.kQty;
      if (metode === "fifo") {
        while (sisa > 0 && stock.length) {
          const l = stock[0];
          const a = Math.min(l.qty, sisa);
          l.qty -= a;
          sisa -= a;
          if (l.qty <= 0) stock.shift();
        }
      } else if (metode === "lifo") {
        while (sisa > 0 && stock.length) {
          const l = stock[stock.length - 1];
          const a = Math.min(l.qty, sisa);
          l.qty -= a;
          sisa -= a;
          if (l.qty <= 0) stock.pop();
        }
      } else {
        let s2 = sisa;
        for (let i = 0; i < stock.length && s2 > 0; i++) {
          const a = Math.min(stock[i].qty, s2);
          stock[i].qty -= a;
          s2 -= a;
        }
        stock = stock.filter((x) => x.qty > 0);
      }
    }
  });
  return stock;
}

export function hitungSaldoKat(
  kat: Pick<KsKategori, "data"> | null | undefined
): KsSaldoDetail {
  const empty: KsSaldoDetail = {
    metode: "fifo",
    totalQty: 0,
    totalNilai: 0,
    hppRata: 0,
    hppNext: 0,
    layers: [],
    allMetodeWithSaldo: [],
  };
  if (!kat || !kat.data || typeof kat.data !== "object") return empty;
  const metodeArr: KsMetode[] = ["fifo", "lifo", "wa", "mwa"];
  const allMetodeWithSaldo: KsMetode[] = [];
  let metode: KsMetode = "fifo";
  let maxQty = 0;
  let maxLen = 0;

  for (const m of metodeArr) {
    const rows = kat.data[m] || [];
    if (!rows.length) continue;
    const last = rows[rows.length - 1];
    const layers = (last.saldoLayers || []).filter((l) => l.qty > 0);
    const qty = layers.reduce((s, l) => s + l.qty, 0);
    if (qty > 0) allMetodeWithSaldo.push(m);
    if (qty > maxQty || (qty === maxQty && rows.length > maxLen)) {
      maxQty = qty;
      maxLen = rows.length;
      metode = m;
    }
  }

  const rows = kat.data[metode] || [];
  if (!rows.length) return { ...empty, metode, allMetodeWithSaldo };
  const last = rows[rows.length - 1];
  const layers = (last.saldoLayers || [])
    .filter((l) => l.qty > 0)
    .map((l) => ({ ...l }));
  const totalQty = layers.reduce((s, l) => s + l.qty, 0);
  const totalNilai = layers.reduce((s, l) => s + l.qty * l.harga, 0);
  const hppRata = totalQty > 0 ? totalNilai / totalQty : 0;
  const hppNext =
    metode === "fifo" && layers.length
      ? layers[0].harga
      : metode === "lifo" && layers.length
        ? layers[layers.length - 1].harga
        : hppRata;

  return {
    metode,
    totalQty,
    totalNilai,
    hppRata,
    hppNext,
    layers,
    allMetodeWithSaldo,
  };
}

export function hitungSaldoCard(card: KsCard | null | undefined): {
  totalQty: number;
  totalNilai: number;
  hppRata: number;
} {
  if (!card || !card.kategori) return { totalQty: 0, totalNilai: 0, hppRata: 0 };
  let totalQty = 0;
  let totalNilai = 0;
  Object.values(card.kategori).forEach((kat) => {
    const s = hitungSaldoKat(kat);
    totalQty += s.totalQty;
    totalNilai += s.totalNilai;
  });
  return {
    totalQty,
    totalNilai,
    hppRata: totalQty > 0 ? totalNilai / totalQty : 0,
  };
}

export function getHppLayersForSale(
  ks: Pick<KsKategori, "data"> | null | undefined,
  qtySell: number
): KsLayer[] {
  const { metode, layers, hppRata, totalQty } = hitungSaldoKat(ks);
  const capped = Math.min(qtySell, totalQty);
  if (capped <= 0) return [];
  if (metode === "fifo") {
    const result: KsLayer[] = [];
    let sisa = capped;
    for (const layer of layers.map((l) => ({ ...l }))) {
      if (sisa <= 0) break;
      const ambil = Math.min(layer.qty, sisa);
      result.push({ qty: ambil, harga: layer.harga });
      sisa -= ambil;
    }
    return result;
  }
  return [{ qty: capped, harga: hppRata }];
}

export function buildHppJurnalLines(
  hppLayers: readonly KsLayer[],
  akunHpp: string,
  akunPersediaan: string
) {
  return hppLayers.flatMap((layer) => [
    {
      akun: akunHpp,
      ket: `HPP Persediaan (${layer.qty} unit × ${fmtRp(layer.harga)})`,
      debit: layer.qty * layer.harga,
      kredit: 0,
    },
    {
      akun: akunPersediaan,
      ket: `Keluar persediaan ${layer.qty} unit`,
      debit: 0,
      kredit: layer.qty * layer.harga,
    },
  ]);
}

export function rekalkulasiStorage(
  entries: readonly KsEntry[],
  metode: KsMetode
): KsEntry[] {
  let stock: KsLayer[] = [];
  return (entries || []).map((e) => {
    if (e.mQty > 0) {
      if (metode === "wa" || metode === "mwa") {
        const tq = stock.reduce((s, x) => s + x.qty, 0) + e.mQty;
        const tv =
          stock.reduce((s, x) => s + x.qty * x.harga, 0) + e.mQty * e.mHarga;
        stock = [{ qty: tq, harga: tq ? tv / tq : 0 }];
      } else {
        stock.push({ qty: e.mQty, harga: e.mHarga });
      }
      return {
        ...e,
        kQty: 0,
        kHarga: 0,
        kJml: 0,
        saldoLayers: stock.filter((x) => x.qty > 0).map((x) => ({ ...x })),
      };
    }
    let qSisa = e.kQty;
    let hppBatch = 0;
    let keluarLayers: KsLayer[] = [];
    if (metode === "fifo") {
      while (qSisa > 0 && stock.length) {
        const l = stock[0];
        const a = Math.min(l.qty, qSisa);
        hppBatch += a * l.harga;
        keluarLayers.push({ qty: a, harga: l.harga });
        l.qty -= a;
        qSisa -= a;
        if (l.qty <= 0) stock.shift();
      }
    } else if (metode === "lifo") {
      while (qSisa > 0 && stock.length) {
        const l = stock[stock.length - 1];
        const a = Math.min(l.qty, qSisa);
        hppBatch += a * l.harga;
        keluarLayers.push({ qty: a, harga: l.harga });
        l.qty -= a;
        qSisa -= a;
        if (l.qty <= 0) stock.pop();
      }
    } else {
      const tq = stock.reduce((s, x) => s + x.qty, 0);
      const tv = stock.reduce((s, x) => s + x.qty * x.harga, 0);
      const ha = tq ? tv / tq : 0;
      hppBatch = ha * e.kQty;
      keluarLayers = [{ qty: e.kQty, harga: ha }];
      let s2 = e.kQty;
      for (let i = 0; i < stock.length && s2 > 0; i++) {
        const a = Math.min(stock[i].qty, s2);
        stock[i].qty -= a;
        s2 -= a;
      }
      stock = stock.filter((x) => x.qty > 0);
    }
    const hppPerUnit = e.kQty ? hppBatch / e.kQty : 0;
    return {
      ...e,
      mQty: 0,
      mHarga: 0,
      kHarga: hppPerUnit,
      kJml: hppBatch,
      keluarLayers,
      saldoLayers: stock.filter((x) => x.qty > 0).map((x) => ({ ...x })),
    };
  });
}

export function konversiMetodeRows(
  sumber: readonly KsEntry[],
  tujuan: readonly KsEntry[],
  keMetode: KsMetode,
  mode: "gabung" | "timpa"
): KsEntry[] {
  const masukSumber = (sumber || [])
    .filter((e) => e.mQty > 0)
    .map((e) => ({ ...e, id: "conv_" + Date.now() + "_" + ksIdCounter++ }));
  const base =
    mode === "gabung"
      ? (tujuan || []).filter((e) => e.mQty > 0).map((e) => ({ ...e }))
      : [];
  const merged = [...base, ...masukSumber].sort((a, b) =>
    (a.tgl || "").localeCompare(b.tgl || "")
  );
  return rekalkulasiStorage(merged, keMetode);
}

// ── Live Store Operations (shared with 16-auth-company.js & TransaksiPage) ──

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

export function addKartuStockOnBuyStore(
  katId: string,
  qty: number,
  hargaPerUnit: number,
  tanggal: string,
  ket?: string
): void {
  const found = findKatByIdStore(katId);
  if (!found || qty <= 0 || hargaPerUnit < 0) return;
  const kat = found.kat;
  const metode = hitungSaldoKat(kat).metode || "fifo";
  if (!kat.data) kat.data = ksDefaultData();
  if (!kat.data[metode]) kat.data[metode] = [];
  const storage = kat.data[metode];

  let runningStock = rebuildStockFromKartu(storage, metode);
  if (metode === "wa" || metode === "mwa") {
    const tq = runningStock.reduce((s, x) => s + x.qty, 0) + qty;
    const tv =
      runningStock.reduce((s, x) => s + x.qty * x.harga, 0) +
      qty * hargaPerUnit;
    runningStock = [{ qty: tq, harga: tq ? tv / tq : 0 }];
  } else {
    runningStock.push({ qty, harga: hargaPerUnit });
  }

  storage.push({
    id: ksIdCounter++,
    tgl: tanggal,
    ket: ket || "Pembelian",
    mQty: qty,
    mHarga: hargaPerUnit,
    kQty: 0,
    kHarga: 0,
    kJml: 0,
    saldoLayers: runningStock.filter((x) => x.qty > 0).map((x) => ({ ...x })),
    jurnalDone: true,
  });
  getLegacyKsStore()?.setKsJustWroteDirectly?.(true);
  saveMksStore();
}

export function deductKartuStockOnSaleStore(
  katId: string,
  qty: number,
  tanggal: string,
  ket?: string
): {
  hppBatch: number;
  keluarLayers: KsLayer[];
  qtySell: number;
  metode?: KsMetode;
} {
  const found = findKatByIdStore(katId);
  if (!found || qty <= 0) return { hppBatch: 0, keluarLayers: [], qtySell: 0 };
  const kat = found.kat;
  const metode = hitungSaldoKat(kat).metode || "fifo";
  if (!kat.data) kat.data = ksDefaultData();
  if (!kat.data[metode]) kat.data[metode] = [];
  const storage = kat.data[metode];

  let runningStock = rebuildStockFromKartu(storage, metode);
  const maxQty = runningStock.reduce((s, x) => s + x.qty, 0);
  if (maxQty <= 0) return { hppBatch: 0, keluarLayers: [], qtySell: 0 };
  const qtySell = Math.min(qty, maxQty);
  let qSisa = qtySell;
  let hppBatch = 0;
  let keluarLayers: KsLayer[] = [];

  if (metode === "fifo") {
    while (qSisa > 0 && runningStock.length) {
      const layer = runningStock[0];
      const ambil = Math.min(layer.qty, qSisa);
      hppBatch += ambil * layer.harga;
      keluarLayers.push({ qty: ambil, harga: layer.harga });
      layer.qty -= ambil;
      qSisa -= ambil;
      if (layer.qty <= 0) runningStock.shift();
    }
  } else if (metode === "lifo") {
    while (qSisa > 0 && runningStock.length) {
      const layer = runningStock[runningStock.length - 1];
      const ambil = Math.min(layer.qty, qSisa);
      hppBatch += ambil * layer.harga;
      keluarLayers.push({ qty: ambil, harga: layer.harga });
      layer.qty -= ambil;
      qSisa -= ambil;
      if (layer.qty <= 0) runningStock.pop();
    }
  } else {
    const tq = runningStock.reduce((s, x) => s + x.qty, 0);
    const tv = runningStock.reduce((s, x) => s + x.qty * x.harga, 0);
    const ha = tq ? tv / tq : 0;
    hppBatch = ha * qtySell;
    keluarLayers = [{ qty: qtySell, harga: ha }];
    let s2 = qtySell;
    for (let i = 0; i < runningStock.length && s2 > 0; i++) {
      const ambil = Math.min(runningStock[i].qty, s2);
      runningStock[i].qty -= ambil;
      s2 -= ambil;
    }
    runningStock = runningStock.filter((x) => x.qty > 0);
  }

  storage.push({
    id: ksIdCounter++,
    tgl: tanggal,
    ket: ket || "Penjualan",
    mQty: 0,
    mHarga: 0,
    kQty: qtySell,
    kHarga: qtySell ? hppBatch / qtySell : 0,
    kJml: hppBatch,
    keluarLayers,
    saldoLayers: runningStock.filter((x) => x.qty > 0).map((x) => ({ ...x })),
    jurnalDone: true,
  });
  getLegacyKsStore()?.setKsJustWroteDirectly?.(true);
  saveMksStore();
  return { hppBatch, keluarLayers, qtySell, metode };
}

export function appendKalkRowsToKatStore(
  katId: string,
  kartuRows: readonly {
    tgl?: string;
    ket?: string;
    mQty?: number | string;
    mHarga?: number | string;
    kQty?: number | string;
  }[],
  metode: KsMetode
): boolean {
  const found = findKatByIdStore(katId);
  if (!found) return false;
  const kat = found.kat;
  if (!kat.data) kat.data = ksDefaultData();
  if (!kat.data[metode]) kat.data[metode] = [];
  const rawNew: KsEntry[] = [];
  (kartuRows || []).forEach((k) => {
    const mQty = k.mQty !== "" && k.mQty !== undefined ? Number(k.mQty) : 0;
    const mHarga =
      k.mHarga !== "" && k.mHarga !== undefined ? Number(k.mHarga) : 0;
    const kQty = k.kQty !== "" && k.kQty !== undefined ? Number(k.kQty) : 0;
    if (mQty > 0) {
      rawNew.push({
        id: ksIdCounter++,
        tgl: k.tgl || "",
        ket: k.ket || "Pembelian",
        mQty,
        mHarga,
        kQty: 0,
        kHarga: 0,
        kJml: 0,
        saldoLayers: [],
        jurnalDone: false,
      });
    } else if (kQty > 0) {
      rawNew.push({
        id: ksIdCounter++,
        tgl: k.tgl || "",
        ket: k.ket || "Penjualan",
        mQty: 0,
        mHarga: 0,
        kQty,
        kHarga: 0,
        kJml: 0,
        saldoLayers: [],
        jurnalDone: false,
      });
    }
  });
  kat.data[metode] = rekalkulasiStorage(
    [...kat.data[metode], ...rawNew],
    metode
  );
  saveMksStore();
  return true;
}
