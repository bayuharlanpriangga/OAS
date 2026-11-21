import type { KsEntry, KsLayer, KsMetode } from "./types";

export function rekalkulasiStorage(
  entries: readonly KsEntry[],
  metode: KsMetode
): KsEntry[] {
  let stock: KsLayer[] = [];
  return (entries || []).map((e) => {
    if (e.mQty > 0) {
      if (metode === "wa" || metode === "mwa") {
        const tq = stock.reduce((s, x) => s + x.qty, 0) + e.mQty;
        const tv =
          stock.reduce((s, x) => s + x.qty * x.harga, 0) + e.mQty * e.mHarga;
        stock = [{ qty: tq, harga: tq ? tv / tq : 0 }];
      } else {
        stock.push({ qty: e.mQty, harga: e.mHarga });
      }
      return {
        ...e,
        kQty: 0,
        kHarga: 0,
        kJml: 0,
        saldoLayers: stock.filter((x) => x.qty > 0).map((x) => ({ ...x })),
      };
    }
    let qSisa = e.kQty;
    let hppBatch = 0;
    let keluarLayers: KsLayer[] = [];
    if (metode === "fifo") {
      while (qSisa > 0 && stock.length) {
        const l = stock[0];
        const a = Math.min(l.qty, qSisa);
        hppBatch += a * l.harga;
        keluarLayers.push({ qty: a, harga: l.harga });
        l.qty -= a;
        qSisa -= a;
        if (l.qty <= 0) stock.shift();
      }
    } else if (metode === "lifo") {
      while (qSisa > 0 && stock.length) {
        const l = stock[stock.length - 1];
        const a = Math.min(l.qty, qSisa);
        hppBatch += a * l.harga;
        keluarLayers.push({ qty: a, harga: l.harga });
        l.qty -= a;
        qSisa -= a;
        if (l.qty <= 0) stock.pop();
      }
    } else {
      const tq = stock.reduce((s, x) => s + x.qty, 0);
      const tv = stock.reduce((s, x) => s + x.qty * x.harga, 0);
      const ha = tq ? tv / tq : 0;
      hppBatch = ha * e.kQty;
      keluarLayers = [{ qty: e.kQty, harga: ha }];
      let s2 = e.kQty;
      for (let i = 0; i < stock.length && s2 > 0; i++) {
        const a = Math.min(stock[i].qty, s2);
        stock[i].qty -= a;
        s2 -= a;
      }
      stock = stock.filter((x) => x.qty > 0);
    }
    const hppPerUnit = e.kQty ? hppBatch / e.kQty : 0;
    return {
      ...e,
      mQty: 0,
      mHarga: 0,
      kHarga: hppPerUnit,
      kJml: hppBatch,
      keluarLayers,
      saldoLayers: stock.filter((x) => x.qty > 0).map((x) => ({ ...x })),
    };
  });
}
