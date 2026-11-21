import { PPN_TARIF_STANDAR } from "./constants";

export function hitungPpn(
  dpp: number,
  tarifPct?: number | string | null
): number {
  const t =
    tarifPct === undefined ||
    tarifPct === null ||
    tarifPct === "" ||
    isNaN(Number(tarifPct))
      ? PPN_TARIF_STANDAR
      : Number(tarifPct);
  return Math.round((dpp || 0) * (t / 100));
}
