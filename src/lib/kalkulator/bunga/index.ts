import type { BungaInput, BungaResult, BungaRow, AnuitasInput, AnuitasResult, AnuitasRow, DiskontoInput, DiskontoResult, PvInput, PvResult, JurnalEntry } from "@/types";
import { JENIS_JURNAL } from "../../shared/accounting";
import { callOasGlobal, readJurnalEntries } from "../../shared/legacy-store";
import { checkAndInputKalkulator, nextKode, readInputVal, showKalkUndoBar, kalkulatorState } from "../shared";

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

export function inputAnuitasJurnal(): void {
  const pokok = parseFloat(readInputVal("an-pokok")) || 0;
  const rate = parseFloat(readInputVal("an-rate")) || 0;
  const tenor = parseInt(readInputVal("an-tenor"), 10) || 0;
  const dp = parseFloat(readInputVal("an-dp")) || 0;

  if (!pokok || !rate || !tenor) {
    callOasGlobal("showAlert", "Hitung anuitas dulu!");
    return;
  }

  const rBln = rate / 100 / 12;
  const pinjaman = pokok - dp;
  const cicilan = (pinjaman * rBln) / (1 - Math.pow(1 + rBln, -tenor));
  const bunga1 = pinjaman * rBln;
  const pokok1 = cicilan - bunga1;
  const today = new Date().toISOString().split("T")[0];
  const kode = nextKode("ANT");

  const jurnals: JurnalEntry[] = [
    {
      tanggal: today,
      ket: `Pencairan pinjaman/kredit [${kode}]`,
      jenis: JENIS_JURNAL.PINJAMAN,
      lines: [
        { akun: "1101", ket: "Kas - penerimaan pinjaman", debit: pinjaman, kredit: 0 },
        {
          akun: "2801",
          ket: "Utang Bank Jangka Panjang",
          debit: 0,
          kredit: pinjaman,
        },
      ],
    },
    {
      tanggal: today,
      ket: `Angsuran ke-1 pinjaman [${kode}]`,
      jenis: JENIS_JURNAL.PINJAMAN,
      lines: [
        {
          akun: "2801",
          ket: "Angsuran pokok",
          debit: Math.round(pokok1),
          kredit: 0,
        },
        {
          akun: "6601",
          ket: "Beban Bunga Pinjaman",
          debit: Math.round(bunga1),
          kredit: 0,
        },
        {
          akun: "1101",
          ket: "Kas keluar",
          debit: 0,
          kredit: Math.round(cicilan),
        },
      ],
    },
  ];

  const beforeCount = readJurnalEntries().length;
  checkAndInputKalkulator(
    kode,
    jurnals,
    `Jurnal pinjaman Rp${pinjaman.toLocaleString("id-ID")} + angsuran ke-1 diinput`,
    (k) => {
      kalkulatorState.lastInput = { kode: k, jurnalIndices: [beforeCount, beforeCount + 1] };
      showKalkUndoBar(`Anuitas: Pinjaman Rp${pinjaman.toLocaleString("id-ID")}`, k);
    }
  );
}
