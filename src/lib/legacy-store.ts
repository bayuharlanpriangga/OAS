import type { Akun, AkunTrashItem, AsetTetap, JurnalEntry, Produk } from "@/types";
import { getDefaultAkuns } from "./default-akuns";

export interface KsKategoriRecord {
  id: string;
  nama: string;
  satuan?: string;
  deskripsi?: string;
  metode?: string;
  [key: string]: unknown;
}

export interface KsCardRecord {
  id: string;
  nama: string;
  lockedFromTrx?: boolean;
  kategori?: Record<string, KsKategoriRecord>;
  [key: string]: unknown;
}

export interface KsSaldoSummary {
  totalQty: number;
  hppNext: number;
  totalNilai: number;
  metode: string;
  layers: Array<{ qty: number; harga: number }>;
  allMetodeWithSaldo?: string[];
}

export interface OasLegacyStoreBridge {
  getAkuns: () => Akun[];
  setAkuns: (next: Akun[]) => void;
  getAkunsTrash: () => AkunTrashItem[];
  setAkunsTrash: (next: AkunTrashItem[]) => void;
  getJurnalEntries: () => JurnalEntry[];
  getProdukList: () => Produk[];
  setProdukList: (next: Produk[]) => void;
  getAsetTetapList: () => AsetTetap[];
  setAsetTetapList: (next: AsetTetap[]) => void;
}

export interface OasKsStoreBridge {
  getMultiKartuStock: () => Record<string, KsCardRecord>;
  setKartuStockTab: (metode: string) => void;
}

function getWin(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  return window as unknown as Record<string, unknown>;
}

export function getLegacyStore(): OasLegacyStoreBridge | null {
  const win = getWin();
  if (!win) return null;
  return (win.__oasStore as OasLegacyStoreBridge | undefined) ?? null;
}

export function getLegacyKsStore(): OasKsStoreBridge | null {
  const win = getWin();
  if (!win) return null;
  return (win.__oasKsStore as OasKsStoreBridge | undefined) ?? null;
}

export function readAkuns(): Akun[] {
  return getLegacyStore()?.getAkuns() ?? getDefaultAkuns();
}

export function writeAkuns(next: Akun[]): void {
  getLegacyStore()?.setAkuns(next);
}

export function readAkunsTrash(): AkunTrashItem[] {
  return getLegacyStore()?.getAkunsTrash() ?? [];
}

export function writeAkunsTrash(next: AkunTrashItem[]): void {
  getLegacyStore()?.setAkunsTrash(next);
}

export function readJurnalEntries(): JurnalEntry[] {
  return getLegacyStore()?.getJurnalEntries() ?? [];
}

export function readProdukList(): Produk[] {
  return getLegacyStore()?.getProdukList() ?? [];
}

export function writeProdukList(next: Produk[]): void {
  getLegacyStore()?.setProdukList(next);
}

export function readAsetTetapList(): AsetTetap[] {
  return getLegacyStore()?.getAsetTetapList() ?? [];
}

export function writeAsetTetapList(next: AsetTetap[]): void {
  getLegacyStore()?.setAsetTetapList(next);
}

export function readMultiKartuStock(): Record<string, KsCardRecord> {
  return getLegacyKsStore()?.getMultiKartuStock() ?? {};
}

export function setLegacyKartuStockTab(metode: string): void {
  getLegacyKsStore()?.setKartuStockTab(metode);
}

export function setOasWindowFn(
  name: string,
  fn: (...args: never[]) => unknown
): void {
  const win = getWin();
  if (!win) return;
  win[name] = fn;
}
