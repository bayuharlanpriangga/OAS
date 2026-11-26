import type { Akun, JurnalEntry, JurnalLine, PpnJurnalResult, PpnRekap, PpnRekapRow, RingkasanJurnalPembelian } from "@/types";
import { PPN_TARIF_STANDAR, JENIS_JURNAL } from "./saldo-periode";
import { getReversedMap, isJurnalPembalik } from "./jurnal-helper";

export function akunPpnKeluaranKode(akuns: readonly Akun[]): string {
  if (akuns.find((a) => a.kode === "2301")) return "2301";
  return (
    akuns.find(
      (a) =>
        a.nama.toLowerCase().includes("ppn") && a.tipe === "Liabilitas"
    )?.kode || "2301"
  );
}

export function hitungPpn(
  dpp: number,
  tarifPct?: number | string | null
): number {
  const t =
    tarifPct === undefined ||
    tarifPct === null ||
    tarifPct === "" ||
    isNaN(Number(tarifPct))
      ? PPN_TARIF_STANDAR
      : Number(tarifPct);
  return Math.round((dpp || 0) * (t / 100));
}

function tarifPpnJurnal(j: JurnalEntry, barisPpn: JurnalLine[]): number {
  if (j._ppnTarif && j._ppnTarif > 0) return Number(j._ppnTarif);
  for (const l of barisPpn) {
    const m = /(\d+(?:[.,]\d+)?)\s*%/.exec(l.ket || "");
    if (m) {
      const t = parseFloat(m[1].replace(",", "."));
      if (t > 0) return t;
    }
  }
  return 0;
}

export function ppnDariJurnal(
  j: JurnalEntry | null | undefined,
  akuns: readonly Akun[]
): PpnJurnalResult | null {
  if (!j || !Array.isArray(j.lines)) return null;
  const jum = (arr: JurnalLine[], f: "debit" | "kredit") =>
    arr.reduce((sum, l) => sum + (l[f] || 0), 0);

  const keluaran = j.lines.filter(
    (l) =>
      (l.kredit || 0) > 0 &&
      (l.akun === "2301" || /ppn keluaran/i.test(l.ket || ""))
  );
  if (keluaran.length) {
    const tarif = tarifPpnJurnal(j, keluaran);
    if (!(tarif > 0)) return null;
    const ppn = jum(keluaran, "kredit");
    const pendapatan = j.lines.filter(
      (l) =>
        (l.kredit || 0) > 0 &&
        akuns.find((a) => a.kode === l.akun)?.tipe === "Pendapatan"
    );
    const dpp = jum(pendapatan, "kredit") || Math.round(ppn / (tarif / 100));
    return { tipe: "keluaran", ppn, dpp, tarif };
  }

  const masukan = j.lines.filter(
    (l) =>
      (l.debit || 0) > 0 &&
      (l.akun === "1502" || /ppn masukan/i.test(l.ket || ""))
  );
  if (masukan.length) {
    const tarif = tarifPpnJurnal(j, masukan);
    if (!(tarif > 0)) return null;
    const ppn = jum(masukan, "debit");
    return {
      tipe: "masukan",
      ppn,
      dpp: Math.round(ppn / (tarif / 100)),
      tarif,
    };
  }

  return null;
}

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

export function adalahJurnalPembelian(
  j: JurnalEntry | null | undefined
): boolean {
  return !!j && (j.jenis === "Pembelian" || j.jenis === JENIS_JURNAL.BILL);
}

export function jurnalPembelianAktif(
  daftar: readonly JurnalEntry[],
  semuaJurnal?: readonly JurnalEntry[]
): JurnalEntry[] {
  const src = Array.isArray(daftar) ? daftar : [];
  const dibalik = getReversedMap(semuaJurnal ?? src);
  return src.filter(
    (j) =>
      adalahJurnalPembelian(j) &&
      !isJurnalPembalik(j) &&
      !(j.no && dibalik.has(j.no))
  );
}

export function ringkasJurnalPembelian(
  j: JurnalEntry | null | undefined
): RingkasanJurnalPembelian {
  const lines = j && Array.isArray(j.lines) ? j.lines : [];
  const bill = !!j && j.jenis === JENIS_JURNAL.BILL;
  const kasUtang = (l: JurnalLine) => l.akun === "1101" || l.akun === "2101";
  const jum = (arr: JurnalLine[], f: "debit" | "kredit") =>
    arr.reduce((s, l) => s + (l[f] || 0), 0);
  const debit = lines.filter((l) => (l.debit || 0) > 0 && (bill || !kasUtang(l)));
  const kreditAll = lines.filter((l) => (l.kredit || 0) > 0);
  const kreditPokok = bill
    ? kreditAll
    : kreditAll.filter(kasUtang).slice(0, 1);
  const m = bill
    ? /^Tagihan (\S+) /.exec(String(j?.ket || j?.keterangan || ""))
    : null;
  return {
    debit,
    totalDebit: jum(debit, "debit"),
    kredit: jum(kreditPokok, "kredit"),
    tunai: kreditPokok.length > 0 && kreditPokok[0].akun === "1101",
    no: (j && j.ref) || (m ? m[1] : "") || (j && j.no) || "",
  };
}
