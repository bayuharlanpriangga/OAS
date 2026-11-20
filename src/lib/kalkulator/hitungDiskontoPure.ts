import type { DiskontoInput, DiskontoResult } from "@/types";

export function hitungDiskontoPure(input: DiskontoInput): DiskontoResult {
  const {
    nominal,
    ratePct,
    hari,
    bungaWeselPct = 0,
    basis = 360,
  } = input;
  const rate = ratePct / 100;
  const bungaWeselRate = bungaWeselPct / 100;
  const nilaiJatuhTempo = nominal * (1 + (bungaWeselRate * hari) / basis);
  const diskonto = nilaiJatuhTempo * rate * (hari / basis);
  const hasilBersih = nilaiJatuhTempo - diskonto;
  return {
    nominal,
    bungaWesel: nilaiJatuhTempo - nominal,
    nilaiJatuhTempo,
    diskonto,
    hasilBersih,
    tarifEfektifPct: hasilBersih
      ? (diskonto / hasilBersih) * (basis / hari) * 100
      : 0,
  };
}
