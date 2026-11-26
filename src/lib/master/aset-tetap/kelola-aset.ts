import { type AsetFotoItem, AT_FOTO_KEY, AT_LAST_RUN_KEY, AT_AUTO_KEY } from "./penyusutan-aset";

export function getAtFoto(asetId: string): AsetFotoItem[] {
  return getAtFotoAll()[asetId] || [];
}

export function getAtFotoAll(): Record<string, AsetFotoItem[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(AT_FOTO_KEY) || "{}") as Record<
      string,
      AsetFotoItem[]
    >;
  } catch {
    return {};
  }
}

export function saveAtFotoAll(data: Record<string, AsetFotoItem[]>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AT_FOTO_KEY, JSON.stringify(data));
}

export function getAtLastRun(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(AT_LAST_RUN_KEY);
}

export function setAtAutoEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AT_AUTO_KEY, on ? "on" : "off");
}

export function getAtAutoEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(AT_AUTO_KEY) !== "off";
}

export function setAtLastRun(iso: string): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AT_LAST_RUN_KEY, iso);
}
