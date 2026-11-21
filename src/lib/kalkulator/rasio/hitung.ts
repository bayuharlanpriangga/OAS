import type { RasioKeuanganInput, RasioKeuanganResult } from "@/types";

export function hitungRasioPure(
  input: RasioKeuanganInput
): RasioKeuanganResult {
  const r = (a: number, b: number) => (b ? a / b : 0);
  const asetLancar =
    input.asetLancar && input.asetLancar > 0
      ? input.asetLancar
      : input.kas + input.piutang + input.persediaan;
  const labaKotor =
    input.labaKotor && input.labaKotor > 0
      ? input.labaKotor
      : input.penjualan - input.hpp;
  const totalLiab =
    input.totalLiab && input.totalLiab > 0
      ? input.totalLiab
      : input.utangLancar + input.utangPanjang;
  const totalAset =
    input.totalAset && input.totalAset > 0
      ? input.totalAset
      : asetLancar + input.asetTetap;

  const lbManual = input.labaBersih || 0;
  const labaBersihFinal =
    lbManual > 0
      ? lbManual
      : input.ebit > 0
      ? Math.max(0, input.ebit - input.bebanBunga)
      : 0;

  const quickAsset = Math.max(0, asetLancar - input.persediaan);
  const perputaranPiutang = r(input.penjualan, input.piutang);
  const dso = perputaranPiutang ? 365 / perputaranPiutang : 0;
  const perputaranPersediaan = r(input.hpp, input.persediaan);
  const doh = perputaranPersediaan ? 365 / perputaranPersediaan : 0;

  const saham = input.saham || 0;
  const hargaSaham = input.hargaSaham || 0;
  const eps = saham > 0 && labaBersihFinal > 0 ? labaBersihFinal / saham : null;
  const bvps = saham > 0 && input.ekuitas > 0 ? input.ekuitas / saham : null;
  const per = eps !== null && hargaSaham > 0 ? hargaSaham / eps : null;
  const pbv = bvps !== null && hargaSaham > 0 ? hargaSaham / bvps : null;
  const marketCap = saham > 0 && hargaSaham > 0 ? hargaSaham * saham : null;

  return {
    asetLancar,
    labaKotor,
    totalLiab,
    totalAset,
    labaBersihFinal,
    currentRatio: r(asetLancar, input.utangLancar),
    quickRatio: r(quickAsset, input.utangLancar),
    cashRatio: r(input.kas, input.utangLancar),
    netWorkingCapital: asetLancar - input.utangLancar,
    der: r(totalLiab, input.ekuitas),
    dar: r(totalLiab, totalAset),
    equityMultiplier: r(totalAset, input.ekuitas),
    interestCoverage: input.bebanBunga
      ? r(input.ebit, input.bebanBunga)
      : null,
    longTermDebtRatio: r(
      input.utangPanjang,
      input.utangPanjang + input.ekuitas
    ),
    grossProfitMarginPct: r(labaKotor, input.penjualan) * 100,
    netProfitMarginPct: r(labaBersihFinal, input.penjualan) * 100,
    roaPct: r(labaBersihFinal, totalAset) * 100,
    roePct: r(labaBersihFinal, input.ekuitas) * 100,
    ebitMarginPct: r(input.ebit, input.penjualan) * 100,
    perputaranPiutang,
    dso,
    perputaranPersediaan,
    doh,
    assetTurnover: r(input.penjualan, totalAset),
    fixedAssetTurnover: r(input.penjualan, input.asetTetap),
    eps,
    bvps,
    per,
    pbv,
    marketCap,
  };
}
