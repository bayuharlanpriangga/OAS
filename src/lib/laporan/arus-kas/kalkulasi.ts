import type { Akun, SaldoMap } from "@/types";
import { plNatural } from "../../shared/accounting/saldo-alami";
import type { ArusKasReport } from "../shared/types";

export function computeArusKas(
  akuns: readonly Akun[],
  saldoMap: SaldoMap
): ArusKasReport {
  const getSaldo = (kode: string) => {
    const a = akuns.find((x) => x.kode === kode);
    if (!a) return 0;
    const s = saldoMap[kode] || { debit: 0, kredit: 0 };
    return a.normal === "D" ? s.debit - s.kredit : s.kredit - s.debit;
  };
  const sumK = (...kodes: string[]) =>
    kodes.reduce((acc, k) => acc + getSaldo(k), 0);

  const labaBersih =
    akuns
      .filter((a) => a.tipe === "Pendapatan")
      .reduce((acc, a) => acc + plNatural(a, saldoMap[a.kode]), 0) -
    akuns
      .filter((a) => a.tipe === "HPP" || a.tipe === "Beban")
      .reduce((acc, a) => acc + plNatural(a, saldoMap[a.kode]), 0);

  const penyusutan = akuns
    .filter(
      (a) =>
        a.tipe === "Aset" &&
        a.kat === "Kontra" &&
        a.nama.toLowerCase().includes("penyusutan")
    )
    .reduce((acc, a) => {
      const s = saldoMap[a.kode] || { debit: 0, kredit: 0 };
      return acc + (s.kredit - s.debit);
    }, 0);

  const deltaPiutang = -akuns
    .filter((a) => a.kode.startsWith("12"))
    .reduce((acc, a) => acc + getSaldo(a.kode), 0);

  const deltaPersediaan = -akuns
    .filter((a) => a.kode.startsWith("13"))
    .reduce((acc, a) => acc + getSaldo(a.kode), 0);

  const deltaUtangUsaha = getSaldo("2101");
  const deltaAkrual = sumK("2201", "2301", "2302", "2303", "2304", "2501", "2502");
  const asetLain = -akuns
    .filter(
      (a) =>
        a.kode.startsWith("14") ||
        a.kode.startsWith("15") ||
        a.kode.startsWith("16")
    )
    .reduce((acc, a) => acc + getSaldo(a.kode), 0);

  const totalOperasi =
    labaBersih +
    penyusutan +
    deltaPiutang +
    deltaPersediaan +
    deltaUtangUsaha +
    deltaAkrual +
    asetLain;

  const beliAset = -akuns
    .filter(
      (a) =>
        a.tipe === "Aset" &&
        a.kat === "Tetap" &&
        !a.nama.toLowerCase().includes("penyusutan")
    )
    .reduce((acc, a) => acc + getSaldo(a.kode), 0);

  const setorModal = getSaldo("3101");
  const prive = -getSaldo("3102");
  const utangLP = akuns
    .filter((a) => a.tipe === "Liabilitas" && a.kat === "Jk Panjang")
    .reduce((acc, a) => acc + getSaldo(a.kode), 0);

  const totalPendanaan = setorModal + prive + utangLP;
  const kasAkhir = sumK("1101", "1102", "1103", "1104");
  const kenaikan = totalOperasi + beliAset + totalPendanaan;

  return {
    operasiRows: [
      { label: "Laba Bersih Periode", nilai: labaBersih },
      { label: "Penyusutan & Amortisasi", nilai: penyusutan },
      { label: "Perubahan Piutang Usaha", nilai: deltaPiutang },
      { label: "Perubahan Persediaan", nilai: deltaPersediaan },
      { label: "Perubahan Utang Usaha", nilai: deltaUtangUsaha },
      { label: "Perubahan Kewajiban Akrual & Pajak", nilai: deltaAkrual },
      { label: "Perubahan Aset Lancar Lainnya", nilai: asetLain },
    ].filter((r) => r.nilai !== 0),
    totalOperasi,
    investasiRows: [{ label: "Pembelian Aset Tetap", nilai: beliAset }].filter(
      (r) => r.nilai !== 0
    ),
    totalInvestasi: beliAset,
    pendanaanRows: [
      { label: "Setoran Modal Pemilik", nilai: setorModal },
      { label: "Pengambilan Prive", nilai: prive },
      { label: "Perubahan Utang Bank Jangka Panjang", nilai: utangLP },
    ].filter((r) => r.nilai !== 0),
    totalPendanaan,
    kenaikan,
    kasAkhir,
  };
}
