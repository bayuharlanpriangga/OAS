import type { AnuitasInput, AnuitasResult, AnuitasRow } from "@/types";

export function hitungAnuitasPure(input: AnuitasInput): AnuitasResult {
  const { pokok, dp = 0, rateAnn, tenor, biaya = 0, jenis } = input;
  const pinjaman = pokok - dp;
  const rBln = rateAnn / 100 / 12;
  const tabel: AnuitasRow[] = [];

  if (jenis === "anuitas") {
    const cicilan = (pinjaman * rBln) / (1 - Math.pow(1 + rBln, -tenor));
    const totalBayar = cicilan * tenor + dp + biaya;
    const totalBunga = cicilan * tenor - pinjaman;
    let saldo = pinjaman;
    for (let i = 1; i <= Math.min(tenor, 360); i++) {
      const saldoAwal = saldo;
      const bunga = saldo * rBln;
      const pokokI = cicilan - bunga;
      saldo -= pokokI;
      tabel.push({
        periode: i,
        saldoAwal,
        pokok: pokokI,
        bunga,
        cicilan,
        saldoAkhir: Math.max(0, saldo),
      });
    }
    return { pinjaman, cicilanBulan: cicilan, totalBunga, totalBayar, tabel };
  }

  if (jenis === "flat") {
    const bungaPerBln = ((pinjaman * rateAnn) / 100) / 12;
    const pokokPerBln = pinjaman / tenor;
    const cicilan = pokokPerBln + bungaPerBln;
    const totalBunga = bungaPerBln * tenor;
    let saldo = pinjaman;
    for (let i = 1; i <= Math.min(tenor, 360); i++) {
      const saldoAwal = saldo;
      saldo -= pokokPerBln;
      tabel.push({
        periode: i,
        saldoAwal,
        pokok: pokokPerBln,
        bunga: bungaPerBln,
        cicilan,
        saldoAkhir: Math.max(0, saldo),
      });
    }
    return {
      pinjaman,
      cicilanBulan: cicilan,
      totalBunga,
      totalBayar: cicilan * tenor + dp + biaya,
      tabel,
    };
  }

  let saldo = pinjaman;
  let totalBunga = 0;
  for (let i = 1; i <= Math.min(tenor, 360); i++) {
    const bunga = saldo * rBln;
    const pkok = pinjaman / tenor;
    const cic = pkok + bunga;
    totalBunga += bunga;
    const nbaru = saldo - pkok;
    tabel.push({
      periode: i,
      saldoAwal: saldo,
      pokok: pkok,
      bunga,
      cicilan: cic,
      saldoAkhir: Math.max(0, nbaru),
    });
    saldo = nbaru;
  }
  const cicilanAwal = pinjaman / tenor + pinjaman * rBln;
  return {
    pinjaman,
    cicilanBulan: cicilanAwal,
    totalBunga,
    totalBayar: pinjaman + totalBunga,
    tabel,
  };
}
