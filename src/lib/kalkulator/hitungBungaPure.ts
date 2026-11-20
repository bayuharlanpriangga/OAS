import type { BungaInput, BungaResult, BungaRow } from "@/types";

export function hitungBungaPure(input: BungaInput): BungaResult {
  const { pokok, rateAnn, n, satuan, jenis } = input;
  const nTahun =
    satuan === "tahun" ? n : satuan === "bulan" ? n / 12 : n / 365;
  const r = rateAnn / 100;
  const tabel: BungaRow[] = [];

  if (jenis === "tunggal") {
    const fv = pokok * (1 + r * nTahun);
    const totalBunga = fv - pokok;
    let saldo = pokok;
    const perSatuan =
      pokok * r * (satuan === "tahun" ? 1 : satuan === "bulan" ? 1 / 12 : 1 / 365);
    for (let i = 1; i <= Math.min(n, 120); i++) {
      const saldoAwal = saldo;
      saldo += perSatuan;
      tabel.push({
        periode: i,
        saldoAwal,
        bunga: perSatuan,
        saldoAkhir: saldo,
      });
    }
    return {
      pokok,
      fv,
      totalBunga,
      bungaPerSatuan: totalBunga / n,
      tabel,
    };
  }

  if (jenis.startsWith("majemuk")) {
    const m =
      jenis === "majemuk-tahunan"
        ? 1
        : jenis === "majemuk-semesteran"
        ? 2
        : jenis === "majemuk-triwulanan"
        ? 4
        : 12;
    const fv = pokok * Math.pow(1 + r / m, m * nTahun);
    const totalBunga = fv - pokok;
    const rEfektifPct = (Math.pow(1 + r / m, m) - 1) * 100;
    let saldo = pokok;
    const rPeriode = r / m;
    const totalPeriode = Math.round(m * nTahun);
    for (let i = 1; i <= Math.min(totalPeriode, 120); i++) {
      const saldoAwal = saldo;
      const bunga = saldo * rPeriode;
      saldo += bunga;
      tabel.push({ periode: i, saldoAwal, bunga, saldoAkhir: saldo });
    }
    return { pokok, fv, totalBunga, rEfektifPct, tabel };
  }

  const rBulanan = r / 12;
  const tenor = Math.round(nTahun * 12);
  const cicilan = (pokok * rBulanan) / (1 - Math.pow(1 + rBulanan, -tenor));
  const totalBayar = cicilan * tenor;
  const rFlat = ((totalBayar - pokok) / pokok / nTahun) * 100;
  return {
    pokok,
    fv: totalBayar,
    totalBunga: totalBayar - pokok,
    cicilanBulan: cicilan,
    rFlatSetaraPct: rFlat,
    totalBayar,
    tabel,
  };
}
