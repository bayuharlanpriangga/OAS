import type { Akun, JurnalEntry } from "@/types";
import { computeSaldoAll } from "../../shared/accounting/saldo-semua";
import { plNatural } from "../../shared/accounting/saldo-alami";
import type { NeracaReport, NeracaRow } from "../shared/types";

export function computeNeraca(
  jurnalEntries: readonly JurnalEntry[],
  akuns: readonly Akun[]
): NeracaReport {
  let aset = 0;
  let liab = 0;
  let ekuitas = 0;
  const asetRows: NeracaRow[] = [];
  const liabRows: NeracaRow[] = [];
  const ekRows: NeracaRow[] = [];

  const fullMap = computeSaldoAll(jurnalEntries);
  let p = 0;
  let b = 0;
  akuns.forEach((a) => {
    const s = plNatural(a, fullMap[a.kode]);
    if (a.tipe === "Pendapatan") p += s;
    if (a.tipe === "Beban" || a.tipe === "HPP") b += s;
  });
  const labaBersih = p - b;

  akuns.forEach((a) => {
    const raw = fullMap[a.kode] || { debit: 0, kredit: 0 };
    const s = a.normal === "D" ? raw.debit - raw.kredit : raw.kredit - raw.debit;
    if (!s && a.tipe !== "Ekuitas") return;
    if (a.tipe === "Aset") {
      const v = a.normal === "D" ? s : -s;
      aset += v;
      asetRows.push({ kode: a.kode, nama: a.nama, nilai: v });
    } else if (a.tipe === "Liabilitas") {
      liab += s;
      liabRows.push({ kode: a.kode, nama: a.nama, nilai: s });
    } else if (a.tipe === "Ekuitas") {
      if (a.normal === "D") {
        ekuitas -= s;
        if (s) ekRows.push({ kode: a.kode, nama: a.nama, nilai: s, isPrive: true });
      } else {
        if (s) ekuitas += s;
        ekRows.push({ kode: a.kode, nama: a.nama, nilai: s, isPrive: false });
      }
    }
  });

  const totalEkuitas = ekuitas + labaBersih;
  const selisih = Math.abs(aset - (liab + totalEkuitas));
  return {
    asetRows,
    liabRows,
    ekRows,
    aset,
    liab,
    totalEkuitas,
    labaBersih,
    balanced: selisih < 1,
    selisih,
  };
}
