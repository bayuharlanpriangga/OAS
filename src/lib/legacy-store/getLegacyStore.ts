import { getWin } from "./getWin";
import type { OasLegacyStoreBridge } from "./types";

export function getLegacyStore(): OasLegacyStoreBridge | null {
  const win = getWin();
  if (!win) return null;
  return (win.__oasStore as OasLegacyStoreBridge | undefined) ?? null;
}
