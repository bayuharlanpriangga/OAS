import type { UrutJurnalState, UrutKolom } from "./types";

export function getSortIndicator(
  state: UrutJurnalState,
  kolom: UrutKolom
): {
  arrow: string;
  active: boolean;
  ariaSort: "none" | "ascending" | "descending";
} {
  if (kolom === "tgl") {
    return {
      arrow: state.tglAktif ? (state.tgl === "desc" ? "↓" : "↑") : "↕",
      active: state.tglAktif,
      ariaSort: state.tglAktif
        ? state.tgl === "desc"
          ? "descending"
          : "ascending"
        : "none",
    };
  }
  return {
    arrow: state.no ? (state.no === "asc" ? "↑" : "↓") : "↕",
    active: !!state.no,
    ariaSort: state.no
      ? state.no === "asc"
        ? "ascending"
        : "descending"
      : "none",
  };
}
