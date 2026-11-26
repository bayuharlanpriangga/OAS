import type {
  CompanyLike,
  DbAdapterLike,
  OasLegacyStoreBridge,
  SupabaseUserLike,
} from "./types";
import type {
  Akun,
  AkunTrashItem,
  TransaksiAkunSettings,
  JurnalEntry,
  CounterRecord,
} from "@/types";
import { getDefaultAkuns } from "../../master/chart-of-accounts";

export function getWin(): Record<string, unknown> | null {
  if (typeof window === "undefined") return null;
  return window as unknown as Record<string, unknown>;
}

export function getLegacyStore(): OasLegacyStoreBridge | null {
  const win = getWin();
  if (!win) return null;
  return (win.__oasStore as OasLegacyStoreBridge | undefined) ?? null;
}

export function callOasGlobal(fnName: string, ...args: unknown[]): unknown {
  if (typeof window === "undefined") return undefined;
  const win = window as unknown as Record<string, unknown>;
  const fn = win[fnName];
  if (typeof fn === "function") {
    return (fn as (...callArgs: unknown[]) => unknown)(...args);
  }
  return undefined;
}

export function setOasWindowFn(
  name: string,
  fn: (...args: never[]) => unknown
): void {
  const win = getWin();
  if (!win) return;
  win[name] = fn;
}

export function getCloudSync(): ((kinds: string[]) => Promise<boolean>) | null {
  const win = getWin();
  if (!win) return null;
  const company = readCurrentCompany();
  const fn = win.cloudSyncRecords;
  if (company && typeof fn === "function") {
    return fn as (kinds: string[]) => Promise<boolean>;
  }
  return null;
}

export function readCurrentCompany(): CompanyLike | null {
  return getLegacyStore()?.getCurrentCompany?.() ?? null;
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

export function readJurnalEntries(): JurnalEntry[] {
  return getLegacyStore()?.getJurnalEntries() ?? [];
}

export function getJurnalSumberAktif(): string {
  return getLegacyStore()?.getJurnalSumberAktif?.() ?? "";
}

export function setJurnalSumberAktif(next: string): void {
  getLegacyStore()?.setJurnalSumberAktif?.(next);
}

export function readCounterList(): CounterRecord[] {
  return getLegacyStore()?.getCounterList?.() ?? [];
}

export function writeCounterList(next: CounterRecord[]): void {
  getLegacyStore()?.setCounterList?.(next);
}

export function writeTransaksiAkunSettings(next: TransaksiAkunSettings): void {
  getLegacyStore()?.setTransaksiAkunSettings?.(next);
}

export function readPeriodeKunciSampai(): string {
  return getLegacyStore()?.getPeriodeKunciSampai?.() ?? "";
}

export function writePeriodeKunciSampai(next: string): void {
  getLegacyStore()?.setPeriodeKunciSampai?.(next);
}

export function readJurnalCounter(): number {
  return getLegacyStore()?.getJurnalCounter?.() ?? 1;
}

export function writeJurnalCounter(next: number): void {
  getLegacyStore()?.setJurnalCounter?.(next);
}

export function readCurrentUser(): SupabaseUserLike | null {
  return getLegacyStore()?.getCurrentUser?.() ?? null;
}

export function readIsGuestMode(): boolean {
  return getLegacyStore()?.getIsGuestMode?.() ?? false;
}

export function readAuthReady(): boolean {
  return getLegacyStore()?.getAuthReady?.() ?? false;
}

export function readDbAdapter(): DbAdapterLike | null {
  return getLegacyStore()?.getDB?.() ?? null;
}

export function writeJurnalEntries(next: JurnalEntry[]): void {
  getLegacyStore()?.setJurnalEntries?.(next);
}

export function writeCurrentCompany(next: CompanyLike | null): void {
  getLegacyStore()?.setCurrentCompany?.(next);
}

export function writeCurrentUser(next: SupabaseUserLike | null): void {
  getLegacyStore()?.setCurrentUser?.(next);
}

export function writeIsGuestMode(next: boolean): void {
  getLegacyStore()?.setIsGuestMode?.(next);
}

export function writeAuthReady(next: boolean): void {
  getLegacyStore()?.setAuthReady?.(next);
}

export function readAfterLoginRunning(): boolean {
  return getLegacyStore()?.getAfterLoginRunning?.() ?? false;
}

export function writeAfterLoginRunning(next: boolean): void {
  getLegacyStore()?.setAfterLoginRunning?.(next);
}
