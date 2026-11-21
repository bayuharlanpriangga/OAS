import { getWin } from "./jendela";
import type { OasKsStoreBridge } from "./types";

export function getLegacyKsStore(): OasKsStoreBridge | null {
  const win = getWin();
  if (!win) return null;
  return (win.__oasKsStore as OasKsStoreBridge | undefined) ?? null;
}
