import type { UrutArah, UrutJurnalState, UrutKolom } from "./types";

export function nextUrutJurnalState(
  prev: UrutJurnalState,
  kolom: UrutKolom
): UrutJurnalState {
  if (kolom === "tgl") {
    const kebalikan: UrutArah = prev.awal === "desc" ? "asc" : "desc";
    if (!prev.tglAktif) {
      return { ...prev, tglAktif: true, tgl: kebalikan, utama: "tgl" };
    }
    if (prev.tgl !== prev.awal) {
      return { ...prev, tgl: prev.awal, utama: "tgl" };
    }
    return {
      ...prev,
      tglAktif: false,
      tgl: prev.awal,
      utama: prev.no ? "no" : "tgl",
    };
  }

  const nextNo: UrutArah | null =
    prev.no === null ? "asc" : prev.no === "asc" ? "desc" : null;
  return {
    ...prev,
    no: nextNo,
    utama: nextNo ? "no" : "tgl",
  };
}
