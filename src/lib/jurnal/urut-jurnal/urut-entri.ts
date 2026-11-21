import { nomorJurnalAngka } from "./nomor-angka";
import type { UrutJurnalState, UrutSortableItem } from "./types";

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
