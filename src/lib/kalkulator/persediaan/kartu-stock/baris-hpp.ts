import { fmtRp } from "../../../shared/format/rupiah";
import type { KsLayer } from "./types";

export function buildHppJurnalLines(
  hppLayers: readonly KsLayer[],
  akunHpp: string,
  akunPersediaan: string
) {
  return hppLayers.flatMap((layer) => [
    {
      akun: akunHpp,
      ket: `HPP Persediaan (${layer.qty} unit × ${fmtRp(layer.harga)})`,
      debit: layer.qty * layer.harga,
      kredit: 0,
    },
    {
      akun: akunPersediaan,
      ket: `Keluar persediaan ${layer.qty} unit`,
      debit: 0,
      kredit: layer.qty * layer.harga,
    },
  ]);
}
