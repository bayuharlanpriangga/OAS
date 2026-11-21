import type { KsKategori, KsMetode, KsSaldoDetail } from "./types";

export function hitungSaldoKat(
  kat: Pick<KsKategori, "data"> | null | undefined
): KsSaldoDetail {
  const empty: KsSaldoDetail = {
    metode: "fifo",
    totalQty: 0,
    totalNilai: 0,
    hppRata: 0,
    hppNext: 0,
    layers: [],
    allMetodeWithSaldo: [],
  };
  if (!kat || !kat.data || typeof kat.data !== "object") return empty;
  const metodeArr: KsMetode[] = ["fifo", "lifo", "wa", "mwa"];
  const allMetodeWithSaldo: KsMetode[] = [];
  let metode: KsMetode = "fifo";
  let maxQty = 0;
  let maxLen = 0;

  for (const m of metodeArr) {
    const rows = kat.data[m] || [];
    if (!rows.length) continue;
    const last = rows[rows.length - 1];
    const layers = (last.saldoLayers || []).filter((l) => l.qty > 0);
    const qty = layers.reduce((s, l) => s + l.qty, 0);
    if (qty > 0) allMetodeWithSaldo.push(m);
    if (qty > maxQty || (qty === maxQty && rows.length > maxLen)) {
      maxQty = qty;
      maxLen = rows.length;
      metode = m;
    }
  }

  const rows = kat.data[metode] || [];
  if (!rows.length) return { ...empty, metode, allMetodeWithSaldo };
  const last = rows[rows.length - 1];
  const layers = (last.saldoLayers || [])
    .filter((l) => l.qty > 0)
    .map((l) => ({ ...l }));
  const totalQty = layers.reduce((s, l) => s + l.qty, 0);
  const totalNilai = layers.reduce((s, l) => s + l.qty * l.harga, 0);
  const hppRata = totalQty > 0 ? totalNilai / totalQty : 0;
  const hppNext =
    metode === "fifo" && layers.length
      ? layers[0].harga
      : metode === "lifo" && layers.length
        ? layers[layers.length - 1].harga
        : hppRata;

  return {
    metode,
    totalQty,
    totalNilai,
    hppRata,
    hppNext,
    layers,
    allMetodeWithSaldo,
  };
}
