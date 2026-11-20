import type {
  AnuitasInput,
  AnuitasResult,
  AnuitasRow,
  BepBauranItem,
  BepInput,
  BepResult,
  BungaInput,
  BungaResult,
  BungaRow,
  DiskontoInput,
  DiskontoResult,
  PenyusutanInput,
  PenyusutanResult,
  PenyusutanRow,
  PersediaanKartuRow,
  PersediaanLayer,
  PersediaanMetode,
  PersediaanResult,
  PersediaanTxInput,
  PvInput,
  PvResult,
  RasioKeuanganInput,
  RasioKeuanganResult,
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

export function hitungPersediaanPure(
  rows: readonly PersediaanTxInput[],
  metode: PersediaanMetode
): PersediaanResult {
  let stock: PersediaanLayer[] = [];
  let hpp = 0;
  const kartu: PersediaanKartuRow[] = [];

  rows.forEach((r) => {
    if (r.jenis === "masuk") {
      if (metode === "wa" || metode === "mwa") {
        const totalQty = stock.reduce((s, x) => s + x.qty, 0) + r.qty;
        const totalVal =
          stock.reduce((s, x) => s + x.qty * x.harga, 0) + r.qty * r.harga;
        const hargaWA = totalQty ? totalVal / totalQty : 0;
        stock = [{ qty: totalQty, harga: hargaWA }];
      } else {
        stock.push({ qty: r.qty, harga: r.harga });
      }
      const saldoLayers = stock.filter((x) => x.qty > 0).map((x) => ({ ...x }));
      kartu.push({
        tgl: r.tgl,
        ket: r.ket || "masuk",
        mQty: r.qty,
        mHarga: r.harga,
        mJml: r.qty * r.harga,
        kQty: "",
        kHarga: "",
        kJml: "",
        saldoLayers,
      });
    } else {
      let qKeluarSisa = r.qty;
      let hppBatch = 0;
      let keluarLayers: PersediaanLayer[] = [];

      if (metode === "fifo") {
        while (qKeluarSisa > 0 && stock.length) {
          const layer = stock[0];
          const ambil = Math.min(layer.qty, qKeluarSisa);
          hppBatch += ambil * layer.harga;
          keluarLayers.push({ qty: ambil, harga: layer.harga });
          layer.qty -= ambil;
          qKeluarSisa -= ambil;
          if (layer.qty <= 0) stock.shift();
        }
      } else if (metode === "lifo") {
        while (qKeluarSisa > 0 && stock.length) {
          const layer = stock[stock.length - 1];
          const ambil = Math.min(layer.qty, qKeluarSisa);
          hppBatch += ambil * layer.harga;
          keluarLayers.push({ qty: ambil, harga: layer.harga });
          layer.qty -= ambil;
          qKeluarSisa -= ambil;
          if (layer.qty <= 0) stock.pop();
        }
      } else {
        const totalQty = stock.reduce((s, x) => s + x.qty, 0);
        const totalVal = stock.reduce((s, x) => s + x.qty * x.harga, 0);
        const hargaWA = totalQty ? totalVal / totalQty : 0;
        hppBatch = hargaWA * r.qty;
        keluarLayers = [{ qty: r.qty, harga: hargaWA }];
        let sisa2 = r.qty;
        for (let i = 0; i < stock.length && sisa2 > 0; i++) {
          const ambil = Math.min(stock[i].qty, sisa2);
          stock[i].qty -= ambil;
          sisa2 -= ambil;
        }
        stock = stock.filter((x) => x.qty > 0);
      }

      hpp += hppBatch;
      const hppPerUnit = r.qty ? hppBatch / r.qty : 0;
      const saldoLayers = stock.filter((x) => x.qty > 0).map((x) => ({ ...x }));
      kartu.push({
        tgl: r.tgl,
        ket: r.ket || "keluar",
        mQty: "",
        mHarga: "",
        mJml: "",
        kQty: r.qty,
        kHarga: hppPerUnit,
        kJml: hppBatch,
        keluarLayers,
        saldoLayers,
      });
    }
  });

  const akhirQty = stock.reduce((s, x) => s + x.qty, 0);
  const akhirVal = stock.reduce((s, x) => s + x.qty * x.harga, 0);
  return {
    metode,
    hpp,
    akhirQty,
    akhirVal,
    kartu,
    stock: stock.map((x) => ({ ...x })),
  };
}

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
