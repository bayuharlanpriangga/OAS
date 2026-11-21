import type { Akun, JurnalEntry, PpnRekap, PpnRekapRow } from "@/types";
import { getReversedMap } from "./peta-dibalik";
import { isJurnalPembalik } from "./cek-pembalik";
import { ppnDariJurnal } from "./ppn-jurnal";

export function rekapPpnJurnal(
  jurnalEntries: readonly JurnalEntry[],
  akuns: readonly Akun[],
  fromStr?: string,
  toStr?: string
): PpnRekap {
  const r: PpnRekap = {
    keluaran: 0,
    masukan: 0,
    dppKeluaran: 0,
    dppMasukan: 0,
    rowsKeluaran: [],
    rowsMasukan: [],
    kurangBayar: 0,
  };
  const dibalik = getReversedMap(jurnalEntries);
  jurnalEntries.forEach((j) => {
    if (fromStr && (j.tanggal || "") < fromStr) return;
    if (toStr && (j.tanggal || "") > toStr) return;
    if (isJurnalPembalik(j) || (j.no && dibalik.has(j.no))) return;
    const p = ppnDariJurnal(j, akuns);
    if (!p) return;
    const row: PpnRekapRow = { j, ppnVal: p.ppn, dpp: p.dpp, tarifPct: p.tarif };
    if (p.tipe === "keluaran") {
      r.keluaran += p.ppn;
      r.dppKeluaran += p.dpp;
      r.rowsKeluaran.push(row);
    } else {
      r.masukan += p.ppn;
      r.dppMasukan += p.dpp;
      r.rowsMasukan.push(row);
    }
  });
  r.kurangBayar = r.keluaran - r.masukan;
  return r;
}
