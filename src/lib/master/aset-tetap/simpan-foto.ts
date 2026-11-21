import { AT_FOTO_KEY } from "./constants";
import type { AsetFotoItem } from "./types";

export function saveAtFotoAll(data: Record<string, AsetFotoItem[]>): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AT_FOTO_KEY, JSON.stringify(data));
}
