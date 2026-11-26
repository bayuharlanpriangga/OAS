import { callOasGlobal } from "../../shared/legacy-store";
import { setLegacyKartuStockTab } from "../../shared/legacy-store";
import { readInputVal } from "../shared";

export function inputPersediaanJurnal(): void {
  const win = window as unknown as { _invMetode?: string };
  const metode = win._invMetode || readInputVal("inv-metode") || "fifo";
  setLegacyKartuStockTab(metode);
  callOasGlobal("showPilihKartuStockPopup", () => {
    callOasGlobal("bukaPopupJurnalSemua");
  });
}
