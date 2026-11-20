import { callOasGlobal } from "../legacy-store/callOasGlobal";
import { setLegacyKartuStockTab } from "../legacy-store/setLegacyKartuStockTab";
import { readInputVal } from "./readInputVal";

export function inputPersediaanJurnal(): void {
  const win = window as unknown as { _invMetode?: string };
  const metode = win._invMetode || readInputVal("inv-metode") || "fifo";
  setLegacyKartuStockTab(metode);
  callOasGlobal("showPilihKartuStockPopup", () => {
    callOasGlobal("bukaPopupJurnalSemua");
  });
}
