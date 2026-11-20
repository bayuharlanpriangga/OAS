import { hitungSaldoKat } from "./hitungSaldoKat";
import type { KsCard } from "./types";

export function hitungSaldoCard(card: KsCard | null | undefined): {
  totalQty: number;
  totalNilai: number;
  hppRata: number;
} {
  if (!card || !card.kategori) return { totalQty: 0, totalNilai: 0, hppRata: 0 };
  let totalQty = 0;
  let totalNilai = 0;
  Object.values(card.kategori).forEach((kat) => {
    const s = hitungSaldoKat(kat);
    totalQty += s.totalQty;
    totalNilai += s.totalNilai;
  });
  return {
    totalQty,
    totalNilai,
    hppRata: totalQty > 0 ? totalNilai / totalQty : 0,
  };
}
