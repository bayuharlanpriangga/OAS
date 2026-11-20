import type { Akun, SaldoMap } from "@/types";
import { plNatural } from "../accounting/plNatural";
import type { PerubahanEkuitasReport } from "./types";

export function computePerubahanEkuitas(
  akuns: readonly Akun[],
  saldoMap: SaldoMap
): PerubahanEkuitasReport {
  const getSaldo = (kode: string) => {
    const a = akuns.find((x) => x.kode === kode);
    if (!a) return 0;
    const s = saldoMap[kode] || { debit: 0, kredit: 0 };
    return a.normal === "D" ? s.debit - s.kredit : s.kredit - s.debit;
  };
  const modalDisetor = getSaldo("3101");
  const prive = getSaldo("3102");
  const labaDitahan = getSaldo("3201");
  const labaBersih =
    akuns
      .filter((a) => a.tipe === "Pendapatan")
      .reduce((acc, a) => acc + plNatural(a, saldoMap[a.kode]), 0) -
    akuns
      .filter((a) => a.tipe === "HPP" || a.tipe === "Beban")
      .reduce((acc, a) => acc + plNatural(a, saldoMap[a.kode]), 0);
  const totalEkuitas = modalDisetor - prive + labaDitahan + labaBersih;
  const ekuitasAwal = labaDitahan + modalDisetor;
  return {
    modalDisetor,
    prive,
    labaDitahan,
    labaBersih,
    ekuitasAwal,
    totalEkuitas,
  };
}
