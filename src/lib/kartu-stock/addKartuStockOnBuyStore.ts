import { getLegacyKsStore } from "../legacy-store/getLegacyKsStore";
import { findKatByIdStore } from "./findKatByIdStore";
import { hitungSaldoKat } from "./hitungSaldoKat";
import { ksDefaultData } from "./ksDefaultData";
import { rebuildStockFromKartu } from "./rebuildStockFromKartu";
import { saveMksStore } from "./saveMksStore";
import { nextKsId } from "./state";

export function addKartuStockOnBuyStore(
  katId: string,
  qty: number,
  hargaPerUnit: number,
  tanggal: string,
  ket?: string
): void {
  const found = findKatByIdStore(katId);
  if (!found || qty <= 0 || hargaPerUnit < 0) return;
  const kat = found.kat;
  const metode = hitungSaldoKat(kat).metode || "fifo";
  if (!kat.data) kat.data = ksDefaultData();
  if (!kat.data[metode]) kat.data[metode] = [];
  const storage = kat.data[metode];

  let runningStock = rebuildStockFromKartu(storage, metode);
  if (metode === "wa" || metode === "mwa") {
    const tq = runningStock.reduce((s, x) => s + x.qty, 0) + qty;
    const tv =
      runningStock.reduce((s, x) => s + x.qty * x.harga, 0) +
      qty * hargaPerUnit;
    runningStock = [{ qty: tq, harga: tq ? tv / tq : 0 }];
  } else {
    runningStock.push({ qty, harga: hargaPerUnit });
  }

  storage.push({
    id: nextKsId(),
    tgl: tanggal,
    ket: ket || "Pembelian",
    mQty: qty,
    mHarga: hargaPerUnit,
    kQty: 0,
    kHarga: 0,
    kJml: 0,
    saldoLayers: runningStock.filter((x) => x.qty > 0).map((x) => ({ ...x })),
    jurnalDone: true,
  });
  getLegacyKsStore()?.setKsJustWroteDirectly?.(true);
  saveMksStore();
}
