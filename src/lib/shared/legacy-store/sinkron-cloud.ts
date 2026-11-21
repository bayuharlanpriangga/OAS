import { getWin } from "./jendela";
import { readCurrentCompany } from "./baca-perusahaan";

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
