import type { Akun, SaldoMap } from "@/types";
import { plNatural } from "../../shared/accounting";
import type { LabaRugiReport } from "../shared";

export function computeLabaRugi(
  akuns: readonly Akun[],
  saldoMap: SaldoMap
): LabaRugiReport {
  let totalPendapatan = 0;
  let totalHpp = 0;
  let totalBeban = 0;
  const pRows: Array<{ kode: string; nama: string; nilai: number }> = [];
  const hRows: Array<{ kode: string; nama: string; nilai: number }> = [];
  const bRows: Array<{ kode: string; nama: string; nilai: number }> = [];

  akuns.forEach((a) => {
    const s = plNatural(a, saldoMap[a.kode]);
    if (!s) return;
    if (a.tipe === "Pendapatan") {
      totalPendapatan += s;
      pRows.push({ kode: a.kode, nama: a.nama, nilai: s });
    } else if (a.tipe === "HPP") {
      totalHpp += s;
      hRows.push({ kode: a.kode, nama: a.nama, nilai: s });
    } else if (a.tipe === "Beban") {
      totalBeban += s;
      bRows.push({ kode: a.kode, nama: a.nama, nilai: s });
    }
  });

  const labaKotor = totalPendapatan - totalHpp;
  const labaBersih = labaKotor - totalBeban;

  return {
    pRows,
    hRows,
    bRows,
    totalPendapatan,
    totalHpp,
    labaKotor,
    totalBeban,
    labaBersih,
  };
}
