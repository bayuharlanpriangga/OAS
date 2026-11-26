import type { BepBauranItem, BepInput, BepResult, JurnalEntry } from "@/types";
import { JENIS_JURNAL } from "../../shared/accounting";
import { callOasGlobal, readJurnalEntries } from "../../shared/legacy-store";
import { checkAndInputKalkulator, nextKode, readInputVal, showKalkUndoBar, kalkulatorState } from "../shared";

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

export function inputBEPJurnal(): void {
  const harga = parseFloat(readInputVal("bep-harga")) || 0;
  const bv = parseFloat(readInputVal("bep-bv")) || 0;
  const bt = parseFloat(readInputVal("bep-bt")) || 0;
  const vol = parseFloat(readInputVal("bep-vol")) || 0;

  if (!harga || !bt) {
    callOasGlobal("showAlert", "Hitung BEP dulu!");
    return;
  }

  const pendapatan = harga * vol;
  const hpp = bv * vol;
  const today = new Date().toISOString().split("T")[0];
  const kode = nextKode("BEP");

  const jurnals: JurnalEntry[] = [];
  if (pendapatan > 0) {
    jurnals.push({
      tanggal: today,
      ket: `Pendapatan periode BEP [${kode}]`,
      jenis: "Penjualan",
      lines: [
        { akun: "1101", ket: "Kas", debit: pendapatan, kredit: 0 },
        { akun: "4101", ket: "Penjualan Barang", debit: 0, kredit: pendapatan },
      ],
    });
  }
  if (hpp > 0) {
    jurnals.push({
      tanggal: today,
      ket: `HPP periode BEP [${kode}]`,
      jenis: JENIS_JURNAL.BEP,
      lines: [
        { akun: "5101", ket: "HPP", debit: hpp, kredit: 0 },
        {
          akun: "1301",
          ket: "Persediaan Barang Dagangan",
          debit: 0,
          kredit: hpp,
        },
      ],
    });
  }
  if (bt > 0) {
    jurnals.push({
      tanggal: today,
      ket: `Beban tetap periode BEP [${kode}]`,
      jenis: JENIS_JURNAL.BEP,
      lines: [
        {
          akun: "6701",
          ket: "Beban Lain-lain (Biaya Tetap)",
          debit: bt,
          kredit: 0,
        },
        { akun: "1101", ket: "Kas", debit: 0, kredit: bt },
      ],
    });
  }

  if (!jurnals.length) {
    callOasGlobal("showAlert", "Tidak ada data untuk diinput");
    return;
  }

  const beforeCount = readJurnalEntries().length;
  const indices = Array.from({ length: jurnals.length }, (_, i) => beforeCount + i);
  checkAndInputKalkulator(
    kode,
    jurnals,
    `Jurnal BEP (vol:${vol} unit, pendapatan:Rp${pendapatan.toLocaleString("id-ID")}) diinput`,
    (k) => {
      kalkulatorState.lastInput = { kode: k, jurnalIndices: indices };
      showKalkUndoBar(`BEP: Vol ${vol} unit`, k);
    }
  );
}
