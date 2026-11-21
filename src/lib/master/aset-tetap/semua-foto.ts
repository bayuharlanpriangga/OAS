import { AT_FOTO_KEY } from "./constants";
import type { AsetFotoItem } from "./types";

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
