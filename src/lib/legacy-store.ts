import type {
  Akun,
  AkunTrashItem,
  AsetTetap,
  Bill,
  CounterRecord,
  DokJenis,
  DokRecord,
  DokumenTagihan,
  Invoice,
  JurnalEntry,
  Kontak,
  Pembayaran,
  PembayaranJenis,
  Produk,
  SusunHapusPembayaranResult,
  SusunPembayaranResult,
  TransaksiAkunSettings,
} from "@/types";
import { getDefaultAkuns } from "./default-akuns";
import { nomorDokBerikut } from "./dok";
import { statusDariPembayaran } from "./pembayaran";
import { counterSetelahPakai, nomorBerikut } from "./penomoran";

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
  getKontakList?: () => Kontak[];
  setKontakList?: (next: Kontak[]) => void;
  getInvoiceList?: () => Invoice[];
  setInvoiceList?: (next: Invoice[]) => void;
  getBillList?: () => Bill[];
  setBillList?: (next: Bill[]) => void;
  getPembayaranList?: () => Pembayaran[];
  setPembayaranList?: (next: Pembayaran[]) => void;
  getDokList?: () => DokRecord[];
  setDokList?: (next: DokRecord[]) => void;
  getCounterList?: () => CounterRecord[];
  setCounterList?: (next: CounterRecord[]) => void;
  getTransaksiAkunSettings?: () => TransaksiAkunSettings;
  getCurrentCompany?: () => {
    id?: string;
    name?: string;
    type?: string;
    tipe?: string;
  } | null;
}

export interface OasKsStoreBridge {
  getMultiKartuStock: () => Record<string, KsCardRecord>;
  setMultiKartuStock?: (next: Record<string, KsCardRecord>) => void;
  getActiveIds?: () => { cardId: string | null; katId: string | null };
  getKartuStockTab?: () => string;
  setKartuStockTab: (metode: string) => void;
  getKartuStockData?: () => Record<string, unknown[]>;
  setKartuStockData?: (data: Record<string, unknown[]>) => void;
  setActiveKartuStock?: (cardId: string | null, katId: string | null) => void;
  getKsJustWroteDirectly?: () => boolean;
  setKsJustWroteDirectly?: (val: boolean) => void;
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

export function setLegacyActiveKartuStock(cardId: string, katId: string): void {
  getLegacyKsStore()?.setActiveKartuStock?.(cardId, katId);
}

export function setLegacyKsJustWroteDirectly(val: boolean): void {
  getLegacyKsStore()?.setKsJustWroteDirectly?.(val);
}

export function readKontakList(): Kontak[] {
  return getLegacyStore()?.getKontakList?.() ?? [];
}

export function writeKontakList(next: Kontak[]): void {
  getLegacyStore()?.setKontakList?.(next);
}

export function readInvoiceList(): Invoice[] {
  return getLegacyStore()?.getInvoiceList?.() ?? [];
}

export function writeInvoiceList(next: Invoice[]): void {
  getLegacyStore()?.setInvoiceList?.(next);
}

export function readBillList(): Bill[] {
  return getLegacyStore()?.getBillList?.() ?? [];
}

export function writeBillList(next: Bill[]): void {
  getLegacyStore()?.setBillList?.(next);
}

export function readPembayaranList(): Pembayaran[] {
  return getLegacyStore()?.getPembayaranList?.() ?? [];
}

export function writePembayaranList(next: Pembayaran[]): void {
  getLegacyStore()?.setPembayaranList?.(next);
}

export function readDokList(): DokRecord[] {
  return getLegacyStore()?.getDokList?.() ?? [];
}

export function writeDokList(next: DokRecord[]): void {
  getLegacyStore()?.setDokList?.(next);
}

export function readCounterList(): CounterRecord[] {
  return getLegacyStore()?.getCounterList?.() ?? [];
}

export function writeCounterList(next: CounterRecord[]): void {
  getLegacyStore()?.setCounterList?.(next);
}

export function readTransaksiAkunSettings(): TransaksiAkunSettings {
  return (
    getLegacyStore()?.getTransaksiAkunSettings?.() ?? {
      jual: {},
      beli: {},
      jualHpp: "",
      jualPersediaan: "",
    }
  );
}

export function readCurrentCompany(): {
  id?: string;
  name?: string;
  type?: string;
  tipe?: string;
} | null {
  return getLegacyStore()?.getCurrentCompany?.() ?? null;
}

export function setOasWindowFn(
  name: string,
  fn: (...args: never[]) => unknown
): void {
  const win = getWin();
  if (!win) return;
  win[name] = fn;
}

// ── State persistence helpers for Domain 3 (Kontak, Invoice, Bill, Pembayaran, Dok) ──

function getCloudSync(): ((kinds: string[]) => Promise<boolean>) | null {
  const win = getWin();
  if (!win) return null;
  const company = readCurrentCompany();
  const fn = win.cloudSyncRecords;
  if (company && typeof fn === "function") {
    return fn as (kinds: string[]) => Promise<boolean>;
  }
  return null;
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

export function simpanInvoiceState(includeCounter = false): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(includeCounter ? ["invoice", "counter"] : ["invoice"]);
  try {
    localStorage.setItem("oas_invoices", JSON.stringify(readInvoiceList()));
    if (includeCounter) {
      localStorage.setItem("oas_counter", JSON.stringify(readCounterList()));
    }
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}

export function nomorBillBerikutState(tahun?: number): string {
  const y = Number.isInteger(tahun)
    ? (tahun as number)
    : new Date().getFullYear();
  return nomorBerikut(
    "BILL",
    y,
    readBillList().map((b) => b && b.noBill),
    readCounterList()
  );
}

export function simpanBillState(): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(["bill", "counter"]);
  try {
    localStorage.setItem("oas_bill", JSON.stringify(readBillList()));
    localStorage.setItem("oas_counter", JSON.stringify(readCounterList()));
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}

export function tambahBillState(bill: Bill): Promise<boolean> {
  const next = [bill, ...readBillList()];
  writeBillList(next);
  const nextCounter = counterSetelahPakai(readCounterList(), bill.noBill);
  writeCounterList(nextCounter);
  return simpanBillState();
}

export function perbaruiBillState(bill: Bill): boolean {
  if (!bill || typeof bill !== "object") return false;
  const list = readBillList().slice();
  const i = list.findIndex((b) => b && b.id === bill.id);
  if (i < 0) return false;
  list[i] = bill;
  writeBillList(list);
  const nextCounter = counterSetelahPakai(readCounterList(), bill.noBill);
  writeCounterList(nextCounter);
  void simpanBillState();
  return true;
}

export function hapusBillByIdState(id: string): boolean {
  const prev = readBillList();
  const next = prev.filter((b) => b && b.id !== id);
  if (next.length === prev.length) return false;
  writeBillList(next);
  void simpanBillState();
  return true;
}

export function simpanPembayaranState(
  jenis: PembayaranJenis = "invoice"
): Promise<boolean> {
  const kindDok = jenis === "bill" ? "bill" : "invoice";
  const sync = getCloudSync();
  if (sync) return sync([kindDok, "pembayaran"]);
  try {
    localStorage.setItem(
      "oas_pembayaran",
      JSON.stringify(readPembayaranList())
    );
    if (kindDok === "bill") {
      localStorage.setItem("oas_bill", JSON.stringify(readBillList()));
    } else {
      localStorage.setItem("oas_invoices", JSON.stringify(readInvoiceList()));
    }
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}

export function catatPembayaranState(
  dok: DokumenTagihan,
  hasil: SusunPembayaranResult
): Promise<boolean> {
  if (!dok || !hasil || !hasil.ok) return Promise.resolve(false);
  const nextList = [hasil.pembayaran, ...readPembayaranList()];
  writePembayaranList(nextList);
  if (hasil.dibayarLama > 0) dok.dibayarLama = hasil.dibayarLama;
  dok.sisaTagihan = hasil.sisaBaru;
  dok.status = statusDariPembayaran(
    dok,
    nextList,
    hasil.pembayaran.jenis
  ) as DokumenTagihan["status"];
  return simpanPembayaranState(hasil.pembayaran.jenis);
}

export function terapkanHapusPembayaranState(
  dok: DokumenTagihan | null | undefined,
  hasil: SusunHapusPembayaranResult
): Promise<boolean> {
  if (!hasil || !hasil.ok) return Promise.resolve(false);
  writePembayaranList(hasil.daftarBaru);
  if (dok && !hasil.yatim) {
    if (hasil.dibayarLama > 0) dok.dibayarLama = hasil.dibayarLama;
    dok.sisaTagihan = hasil.sisaBaru;
    if (hasil.statusBaru) {
      dok.status = hasil.statusBaru as DokumenTagihan["status"];
    }
  }
  return simpanPembayaranState(hasil.pembayaran.jenis);
}

export function nomorDokBerikutState(jenis: DokJenis, tahun?: number): string {
  const y = Number.isInteger(tahun)
    ? (tahun as number)
    : new Date().getFullYear();
  return nomorDokBerikut(jenis, y, readDokList(), readCounterList());
}

export function simpanDokState(): Promise<boolean> {
  const sync = getCloudSync();
  if (sync) return sync(["dok", "counter"]);
  try {
    localStorage.setItem("oas_dok", JSON.stringify(readDokList()));
    localStorage.setItem("oas_counter", JSON.stringify(readCounterList()));
  } catch {
    return Promise.resolve(false);
  }
  return Promise.resolve(true);
}

export function tambahDokState(dok: DokRecord): Promise<boolean> {
  const next = [dok, ...readDokList()];
  writeDokList(next);
  const nextCounter = counterSetelahPakai(readCounterList(), dok.no);
  writeCounterList(nextCounter);
  return simpanDokState();
}

export function perbaruiDokState(dok: DokRecord): boolean {
  if (!dok || typeof dok !== "object") return false;
  const list = readDokList().slice();
  const i = list.findIndex((d) => d && d.id === dok.id);
  if (i < 0) return false;
  list[i] = dok;
  writeDokList(list);
  void simpanDokState();
  return true;
}

export function hapusDokByIdState(id: string): boolean {
  const prev = readDokList();
  const next = prev.filter((d) => d && d.id !== id);
  if (next.length === prev.length) return false;
  writeDokList(next);
  void simpanDokState();
  return true;
}
