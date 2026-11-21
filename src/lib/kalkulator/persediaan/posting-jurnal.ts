import { callOasGlobal } from "../../shared/legacy-store/panggil-global";
import { setLegacyKartuStockTab } from "../../shared/legacy-store/atur-tab-stok";
import { readInputVal } from "../shared/baca-input";

export function inputPersediaanJurnal(): void {
  const win = window as unknown as { _invMetode?: string };
  const metode = win._invMetode || readInputVal("inv-metode") || "fifo";
  setLegacyKartuStockTab(metode);
  callOasGlobal("showPilihKartuStockPopup", () => {
    callOasGlobal("bukaPopupJurnalSemua");
  });
}
