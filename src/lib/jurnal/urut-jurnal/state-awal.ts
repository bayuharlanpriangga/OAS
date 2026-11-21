import type { UrutArah, UrutJurnalState } from "./types";

export function createInitialUrutState(awal: UrutArah): UrutJurnalState {
  return {
    awal,
    tglAktif: false,
    tgl: awal,
    no: null,
    utama: "tgl",
  };
}
