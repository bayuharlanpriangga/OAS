import { hitungPpn } from "../accounting/hitungPpn";

export function hitungTotalBill(
  items: readonly { qty?: number; harga?: number }[],
  ppnAktif?: boolean,
  tarifPct?: number
): { subtotal: number; ppn: number; total: number } {
  const angka = (v: unknown) =>
    typeof v === "number" && isFinite(v) && v > 0 ? v : 0;
  const subtotal = (Array.isArray(items) ? items : []).reduce(
    (s, it) => s + angka(it && it.qty) * angka(it && it.harga),
    0
  );
  const ppn = ppnAktif ? hitungPpn(subtotal, tarifPct) : 0;
  return { subtotal, ppn, total: subtotal + ppn };
}
