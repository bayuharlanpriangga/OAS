import type { JurnalEntry } from "@/types";
import { JENIS_JURNAL } from "../../shared/accounting/constants";
import { callOasGlobal } from "../../shared/legacy-store/panggil-global";
import { readJurnalEntries } from "../../shared/legacy-store/baca-jurnal";
import { checkAndInputKalkulator } from "../shared/validasi-input";
import { nextKode } from "../shared/kode-berikut";
import { readInputVal } from "../shared/baca-input";
import { showKalkUndoBar } from "../shared/banner-undo";
import { kalkulatorState } from "../shared/state";

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
