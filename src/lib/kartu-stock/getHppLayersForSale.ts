import { hitungSaldoKat } from "./hitungSaldoKat";
import type { KsKategori, KsLayer } from "./types";

export function getHppLayersForSale(
  ks: Pick<KsKategori, "data"> | null | undefined,
  qtySell: number
): KsLayer[] {
  const { metode, layers, hppRata, totalQty } = hitungSaldoKat(ks);
  const capped = Math.min(qtySell, totalQty);
  if (capped <= 0) return [];
  if (metode === "fifo") {
    const result: KsLayer[] = [];
    let sisa = capped;
    for (const layer of layers.map((l) => ({ ...l }))) {
      if (sisa <= 0) break;
      const ambil = Math.min(layer.qty, sisa);
      result.push({ qty: ambil, harga: layer.harga });
      sisa -= ambil;
    }
    return result;
  }
  return [{ qty: capped, harga: hppRata }];
}
