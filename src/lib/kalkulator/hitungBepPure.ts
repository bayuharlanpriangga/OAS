import type { BepBauranItem, BepInput, BepResult } from "@/types";

export function hitungBepPure(input: BepInput): BepResult {
  const { harga, bv, bt, vol, target = 0, pajakPct = 0, bauran } = input;
  const pajak = pajakPct / 100;
  const cm = harga - bv;
  const cmr = harga ? cm / harga : 0;
  const bepUnit = cm ? bt / cm : 0;
  const bepRp = cmr ? bt / cmr : 0;
  const pendapatan = harga * vol;
  const labaKotor = cm * vol - bt;
  const labaBersih = labaKotor * (1 - pajak);
  const mos = vol - bepUnit;
  const mosPct = vol ? mos / vol : 0;
  const dol = labaKotor ? (cm * vol) / labaKotor : 0;
  const targetVol = target > 0 && cm ? (bt + target / (1 - pajak)) / cm : null;
  const targetVolPreTax = target > 0 && cm ? (bt + target) / cm : null;

  let bauranItems: BepBauranItem[] | undefined;
  let bepBauranUnit: number | undefined;
  if (bauran && bauran.length > 0) {
    bauranItems = bauran.map((p) => {
      const cmP = p.harga - p.bv;
      return {
        nama: p.nama,
        harga: p.harga,
        bv: p.bv,
        prop: p.prop,
        cm: cmP,
        wmCm: cmP * p.prop,
      };
    });
    const wmCM = bauranItems.reduce((s, p) => s + p.wmCm, 0);
    bepBauranUnit = wmCM ? bt / wmCM : 0;
  }

  return {
    cm,
    cmr,
    bepUnit,
    bepRp,
    pendapatan,
    labaKotor,
    labaBersih,
    mos,
    mosPct,
    dol,
    targetVol,
    targetVolPreTax,
    bauranItems,
    bepBauranUnit,
  };
}
