import type { KsEntry, KsLayer, KsMetode } from "./types";

export function rebuildStockFromKartu(
  storage: readonly KsEntry[],
  metode: KsMetode
): KsLayer[] {
  let stock: KsLayer[] = [];
  (storage || []).forEach((e) => {
    if (e.mQty > 0) {
      if (metode === "wa" || metode === "mwa") {
        const tq = stock.reduce((s, x) => s + x.qty, 0) + e.mQty;
        const tv =
          stock.reduce((s, x) => s + x.qty * x.harga, 0) + e.mQty * e.mHarga;
        stock = [{ qty: tq, harga: tq ? tv / tq : 0 }];
      } else {
        stock.push({ qty: e.mQty, harga: e.mHarga });
      }
    } else if (e.kQty > 0) {
      let sisa = e.kQty;
      if (metode === "fifo") {
        while (sisa > 0 && stock.length) {
          const l = stock[0];
          const a = Math.min(l.qty, sisa);
          l.qty -= a;
          sisa -= a;
          if (l.qty <= 0) stock.shift();
        }
      } else if (metode === "lifo") {
        while (sisa > 0 && stock.length) {
          const l = stock[stock.length - 1];
          const a = Math.min(l.qty, sisa);
          l.qty -= a;
          sisa -= a;
          if (l.qty <= 0) stock.pop();
        }
      } else {
        let s2 = sisa;
        for (let i = 0; i < stock.length && s2 > 0; i++) {
          const a = Math.min(stock[i].qty, s2);
          stock[i].qty -= a;
          s2 -= a;
        }
        stock = stock.filter((x) => x.qty > 0);
      }
    }
  });
  return stock;
}
