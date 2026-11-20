import { getAtFotoAll } from "./getAtFotoAll";
import type { AsetFotoItem } from "./types";

export function getAtFoto(asetId: string): AsetFotoItem[] {
  return getAtFotoAll()[asetId] || [];
}
