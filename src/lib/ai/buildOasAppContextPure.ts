import type { Akun, JurnalEntry } from "@/types";
import { computeSaldoBersih } from "../accounting/computeSaldoBersih";
import { saldoBersihPL } from "../accounting/saldoBersihPL";
import type { OasAppContext } from "./types";

export function buildOasAppContextPure(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[]
): OasAppContext {
  let totalAset = 0;
  let totalPendapatan = 0;
  let totalBeban = 0;

  for (const a of akuns) {
    if (a.tipe === "Aset") {
      const s = computeSaldoBersih(akuns, jurnalEntries, a.kode);
      totalAset += a.normal === "D" ? s : -s;
    } else if (a.tipe === "Pendapatan") {
      totalPendapatan += saldoBersihPL(akuns, jurnalEntries, a.kode);
    } else if (a.tipe === "Beban" || a.tipe === "HPP") {
      totalBeban += saldoBersihPL(akuns, jurnalEntries, a.kode);
    }
  }

  const recentJurnals = jurnalEntries.slice(-8).map((j) => {
    const ket = j.ket || j.keterangan || "-";
    const linesDesc = (j.lines || [])
      .map((l) => {
        const a = akuns.find((x) => x.kode === l.akun);
        return (a?.nama || l.akun) + (l.debit ? ` Dr${l.debit}` : ` Kr${l.kredit}`);
      })
      .join(", ");
    return `[${j.tanggal}] ${ket} (${j.jenis}): ${linesDesc}`;
  });

  const akunsSummary = akuns.map((a) => `${a.kode} ${a.nama} (${a.tipe})`);

  return {
    totalAset,
    totalPendapatan,
    totalBeban,
    labaBersih: totalPendapatan - totalBeban,
    jumlahJurnal: jurnalEntries.length,
    recentJurnals,
    akunsSummary,
  };
}
