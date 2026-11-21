import type { Akun, JurnalEntry, JurnalLine, PpnJurnalResult } from "@/types";

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
