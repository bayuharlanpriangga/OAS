import type { DokRecord } from "@/types";

function dokBulat(n: number): number {
  return Math.round(n * 100) / 100;
}

export function totalDok(dok: Pick<DokRecord, "items"> | null | undefined): number {
  const items = dok && Array.isArray(dok.items) ? dok.items : [];
  return dokBulat(
    items.reduce((s, it) => {
      const q =
        it && typeof it.qty === "number" && isFinite(it.qty) && it.qty > 0
          ? it.qty
          : 0;
      const h =
        it && typeof it.harga === "number" && isFinite(it.harga) && it.harga > 0
          ? it.harga
          : 0;
      return s + q * h;
    }, 0)
  );
}
