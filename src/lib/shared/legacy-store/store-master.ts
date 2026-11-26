import { getWin, getLegacyStore, getCloudSync } from "./store-inti";
import type { OasKsStoreBridge, KsCardRecord } from "./types";
import type { Produk, Kontak, AsetTetap } from "@/types";

export function getLegacyKsStore(): OasKsStoreBridge | null {
  const win = getWin();
  if (!win) return null;
  return (win.__oasKsStore as OasKsStoreBridge | undefined) ?? null;
}

export function readMultiKartuStock(): Record<string, KsCardRecord> {
  return getLegacyKsStore()?.getMultiKartuStock() ?? {};
}

export function writeMultiKartuStock(next: Record<string, KsCardRecord>): void {
  const ks = getLegacyKsStore();
  if (ks?.setMultiKartuStock) {
    ks.setMultiKartuStock(next);
  } else {
    const win = getWin();
    if (win) win.multiKartuStock = next;
  }
}

export function writeKartuStockData(data: Record<string, unknown[]>): void {
  const ks = getLegacyKsStore();
  if (ks?.setKartuStockData) {
    ks.setKartuStockData(data);
  } else {
    const win = getWin();
    if (win) win.kartuStockData = data;
  }
}

export function writeKartuStockIdCounter(next: number): void {
  const ks = getLegacyKsStore();
  if (ks?.setKartuStockIdCounter) {
    ks.setKartuStockIdCounter(next);
  } else {
    const win = getWin();
    if (win) win.kartuStockIdCounter = next;
  }
}

export function setLegacyActiveKartuStock(cardId: string, katId: string): void {
  getLegacyKsStore()?.setActiveKartuStock?.(cardId, katId);
}

export function setLegacyKartuStockTab(metode: string): void {
  getLegacyKsStore()?.setKartuStockTab(metode);
}

export function setLegacyKsJustWroteDirectly(val: boolean): void {
  getLegacyKsStore()?.setKsJustWroteDirectly?.(val);
}

export function readProdukList(): Produk[] {
  return getLegacyStore()?.getProdukList() ?? [];
}

export function writeProdukList(next: Produk[]): void {
  getLegacyStore()?.setProdukList(next);
}

export function readKontakList(): Kontak[] {
  return getLegacyStore()?.getKontakList?.() ?? [];
}

export function writeKontakList(next: Kontak[]): void {
  getLegacyStore()?.setKontakList?.(next);
}

export function simpanKontakState(): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(["kontak"]);
  try {
    localStorage.setItem("oas_kontak", JSON.stringify(readKontakList()));
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}

export function readAsetTetapList(): AsetTetap[] {
  return getLegacyStore()?.getAsetTetapList() ?? [];
}

export function writeAsetTetapList(next: AsetTetap[]): void {
  getLegacyStore()?.setAsetTetapList(next);
}
