import type { JurnalEntry } from "@/types";
import { JENIS_JURNAL } from "../../shared/accounting/constants";
import { callOasGlobal } from "../../shared/legacy-store/panggil-global";
import { readJurnalEntries } from "../../shared/legacy-store/baca-jurnal";
import { checkAndInputKalkulator } from "../shared/validasi-input";
import { nextKode } from "../shared/kode-berikut";
import { readInputVal } from "../shared/baca-input";
import { showKalkUndoBar } from "../shared/banner-undo";
import { kalkulatorState } from "../shared/state";

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
