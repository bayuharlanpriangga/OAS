export type UrutArah = "asc" | "desc";
export type UrutKolom = "tgl" | "no";

export interface UrutJurnalState {
  awal: UrutArah;
  tglAktif: boolean;
  tgl: UrutArah;
  no: UrutArah | null;
  utama: UrutKolom;
}

export interface UrutSortableItem {
  tanggal?: string;
  no?: string;
}

export function createInitialUrutState(awal: UrutArah): UrutJurnalState {
  return {
    awal,
    tglAktif: false,
    tgl: awal,
    no: null,
    utama: "tgl",
  };
}

export function nomorJurnalAngka(no: string | number | null | undefined): number | null {
  const m = /(\d+)\s*$/.exec(String(no == null ? "" : no));
  return m ? parseInt(m[1], 10) : null;
}

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

export function urutkanJurnalUmum<T extends UrutSortableItem>(
  daftar: readonly T[],
  urut?: Partial<UrutJurnalState>
): T[] {
  const arr = (Array.isArray(daftar) ? daftar : []).map((j, i) => ({ j, i }));
  const cfg = urut || {};
  const awalDesc = cfg.awal !== "asc";
  const tglOn = !!cfg.tglAktif;
  const noOn = cfg.no === "asc" || cfg.no === "desc";
  const tglDesc = tglOn ? cfg.tgl !== "asc" : awalDesc;

  const cmpTgl = (a: { j: T; i: number }, b: { j: T; i: number }) => {
    const x = String(a.j?.tanggal || "").slice(0, 10);
    const y = String(b.j?.tanggal || "").slice(0, 10);
    if (x === y) return 0;
    return (x < y ? -1 : 1) * (tglDesc ? -1 : 1);
  };

  const cmpNo = (a: { j: T; i: number }, b: { j: T; i: number }) => {
    const x = nomorJurnalAngka(a.j?.no);
    const y = nomorJurnalAngka(b.j?.no);
    if (x === y) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x < y ? -1 : 1) * (cfg.no === "desc" ? -1 : 1);
  };

  const kunci: Array<(a: { j: T; i: number }, b: { j: T; i: number }) => number> = [];
  if (tglOn && noOn) {
    kunci.push(...(cfg.utama === "no" ? [cmpNo, cmpTgl] : [cmpTgl, cmpNo]));
  } else if (noOn) {
    kunci.push(cmpNo);
  } else if (tglOn) {
    kunci.push(cmpTgl);
  }

  arr.sort((a, b) => {
    for (const k of kunci) {
      const r = k(a, b);
      if (r) return r;
    }
    return tglDesc ? b.i - a.i : a.i - b.i;
  });

  return arr.map((x) => x.j);
}
