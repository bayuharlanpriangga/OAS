import type {
  PenyusutanInput,
  PenyusutanResult,
  PenyusutanRow,
} from "@/types";

export function hitungPenyusutanPure(input: PenyusutanInput): PenyusutanResult {
  const { cost, sisa, umur, metode, totalUnit = 1, unitPerTahun = [] } = input;
  if (!cost || !umur) return { ok: false, pesan: "Parameter belum lengkap." };
  if (sisa > cost) {
    return {
      ok: false,
      pesan: "Nilai sisa tidak boleh melebihi harga perolehan.",
    };
  }

  const dasarPenyusutan = cost - sisa;
  const tabel: PenyusutanRow[] = [];
  let nb = cost;

  if (metode === "garis-lurus") {
    const beban = dasarPenyusutan / umur;
    for (let t = 1; t <= umur; t++) {
      const akum = beban * t;
      tabel.push({ t, beban, akum, nbAwal: nb, nbAkhir: nb - beban });
      nb -= beban;
    }
  } else if (metode === "saldo-menurun" || metode === "saldo-menurun-1x") {
    const multiplier = metode === "saldo-menurun" ? 2 : 1.5;
    const rate = multiplier / umur;
    for (let t = 1; t <= umur; t++) {
      let beban = nb * rate;
      if (nb - beban < sisa) beban = nb - sisa;
      if (beban < 0) beban = 0;
      const nbAwal = nb;
      nb -= beban;
      tabel.push({ t, beban, akum: cost - nb, nbAwal, nbAkhir: nb });
    }
  } else if (metode === "sum-of-years") {
    const sumYears = (umur * (umur + 1)) / 2;
    let akum = 0;
    for (let t = 1; t <= umur; t++) {
      const fraksi = (umur - t + 1) / sumYears;
      const beban = dasarPenyusutan * fraksi;
      akum += beban;
      tabel.push({ t, beban, akum, nbAwal: nb, nbAkhir: nb - beban });
      nb -= beban;
    }
  } else if (metode === "unit-produksi") {
    const tarifPerUnit = dasarPenyusutan / (totalUnit || 1);
    let akum = 0;
    for (let t = 0; t < Math.max(umur, unitPerTahun.length); t++) {
      const u = unitPerTahun[t] || 0;
      const beban = tarifPerUnit * u;
      akum += beban;
      tabel.push({
        t: t + 1,
        beban,
        akum,
        nbAwal: nb,
        nbAkhir: nb - beban,
        unit: u,
      });
      nb -= beban;
    }
  }

  const totalBeban = tabel.reduce((s, r) => s + r.beban, 0);
  return {
    ok: true,
    dasarPenyusutan,
    totalBeban,
    rataRataPerTahun: totalBeban / umur,
    tabel,
  };
}
