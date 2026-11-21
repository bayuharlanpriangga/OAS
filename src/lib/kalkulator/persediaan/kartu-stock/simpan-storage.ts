import { readCurrentCompany } from "../../../shared/legacy-store/baca-perusahaan";
import { readMksMap } from "./baca-peta";

function notifyKsCloud(): void {
  if (typeof window === "undefined") return;
  const win = window as unknown as { saveKartuStockToCloud?: () => void };
  win.saveKartuStockToCloud?.();
}

export function saveMksStore(): void {
  const mks = readMksMap();
  const cid = readCurrentCompany()?.id || "guest";
  try {
    localStorage.setItem("oas_mks_" + cid, JSON.stringify(mks));
  } catch {}
  notifyKsCloud();
}
