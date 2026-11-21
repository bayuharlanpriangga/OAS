import type { PvInput, PvResult } from "@/types";

export function hitungPvPure(input: PvInput): PvResult {
  const {
    mode,
    pv = 0,
    fv = 0,
    ratePct = 0,
    n = 0,
    pmt = 0,
    m = 1,
  } = input;
  const r = ratePct / 100;

  if (mode === "fv") {
    const fvLump = pv * Math.pow(1 + r / m, m * n);
    const fvAnn =
      pmt > 0 ? pmt * ((Math.pow(1 + r / m, m * n) - 1) / (r / m)) : 0;
    const totalFv = fvLump + fvAnn;
    return {
      mode,
      fvLump,
      fvAnn,
      totalFv,
      keuntungan: totalFv - pv - pmt * m * n,
    };
  }

  if (mode === "pv") {
    const pvCalc = fv / Math.pow(1 + r / m, m * n);
    const pvAnn =
      pmt > 0 ? pmt * ((1 - Math.pow(1 + r / m, -m * n)) / (r / m)) : 0;
    return {
      mode,
      pvCalc,
      pvAnn,
      totalPv: pvCalc + pvAnn,
      faktorDiskontoPct: fv ? (pvCalc / fv) * 100 : 0,
    };
  }

  if (mode === "rate") {
    const ratePerTahunPct = (Math.pow(fv / pv, 1 / (m * n)) - 1) * m * 100;
    return {
      mode,
      ratePerTahunPct,
      ratePerPeriodePct: ratePerTahunPct / m,
    };
  }

  const nTahun = Math.log(fv / pv) / (m * Math.log(1 + r / m));
  return {
    mode,
    nTahun,
    nBulan: nTahun * 12,
  };
}
