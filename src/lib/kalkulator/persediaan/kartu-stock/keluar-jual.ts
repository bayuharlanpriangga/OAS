import { getLegacyKsStore } from "../../../shared/legacy-store/akses-store-stok";
import { findKatByIdStore } from "./cari-kategori";
import { hitungSaldoKat } from "./saldo-kategori";
import { ksDefaultData } from "./data-awal";
import { rebuildStockFromKartu } from "./sinkron-produk";
import { saveMksStore } from "./simpan-storage";
import { nextKsId } from "./state";
import type { KsLayer, KsMetode } from "./types";

export function deductKartuStockOnSaleStore(
  katId: string,
  qty: number,
  tanggal: string,
  ket?: string
): {
  hppBatch: number;
  keluarLayers: KsLayer[];
  qtySell: number;
  metode?: KsMetode;
} {
  const found = findKatByIdStore(katId);
  if (!found || qty <= 0) return { hppBatch: 0, keluarLayers: [], qtySell: 0 };
  const kat = found.kat;
  const metode = hitungSaldoKat(kat).metode || "fifo";
  if (!kat.data) kat.data = ksDefaultData();
  if (!kat.data[metode]) kat.data[metode] = [];
  const storage = kat.data[metode];

  let runningStock = rebuildStockFromKartu(storage, metode);
  const maxQty = runningStock.reduce((s, x) => s + x.qty, 0);
  if (maxQty <= 0) return { hppBatch: 0, keluarLayers: [], qtySell: 0 };
  const qtySell = Math.min(qty, maxQty);
  let qSisa = qtySell;
  let hppBatch = 0;
  let keluarLayers: KsLayer[] = [];

  if (metode === "fifo") {
    while (qSisa > 0 && runningStock.length) {
      const layer = runningStock[0];
      const ambil = Math.min(layer.qty, qSisa);
      hppBatch += ambil * layer.harga;
      keluarLayers.push({ qty: ambil, harga: layer.harga });
      layer.qty -= ambil;
      qSisa -= ambil;
      if (layer.qty <= 0) runningStock.shift();
    }
  } else if (metode === "lifo") {
    while (qSisa > 0 && runningStock.length) {
      const layer = runningStock[runningStock.length - 1];
      const ambil = Math.min(layer.qty, qSisa);
      hppBatch += ambil * layer.harga;
      keluarLayers.push({ qty: ambil, harga: layer.harga });
      layer.qty -= ambil;
      qSisa -= ambil;
      if (layer.qty <= 0) runningStock.pop();
    }
  } else {
    const tq = runningStock.reduce((s, x) => s + x.qty, 0);
    const tv = runningStock.reduce((s, x) => s + x.qty * x.harga, 0);
    const ha = tq ? tv / tq : 0;
    hppBatch = ha * qtySell;
    keluarLayers = [{ qty: qtySell, harga: ha }];
    let s2 = qtySell;
    for (let i = 0; i < runningStock.length && s2 > 0; i++) {
      const ambil = Math.min(runningStock[i].qty, s2);
      runningStock[i].qty -= ambil;
      s2 -= ambil;
    }
    runningStock = runningStock.filter((x) => x.qty > 0);
  }

  storage.push({
    id: nextKsId(),
    tgl: tanggal,
    ket: ket || "Penjualan",
    mQty: 0,
    mHarga: 0,
    kQty: qtySell,
    kHarga: qtySell ? hppBatch / qtySell : 0,
    kJml: hppBatch,
    keluarLayers,
    saldoLayers: runningStock.filter((x) => x.qty > 0).map((x) => ({ ...x })),
    jurnalDone: true,
  });
  getLegacyKsStore()?.setKsJustWroteDirectly?.(true);
  saveMksStore();
  return { hppBatch, keluarLayers, qtySell, metode };
}
