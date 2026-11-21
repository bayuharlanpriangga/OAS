import { getAtFotoAll } from "./semua-foto";
import type { AsetFotoItem } from "./types";

export function getAtFoto(asetId: string): AsetFotoItem[] {
  return getAtFotoAll()[asetId] || [];
}
