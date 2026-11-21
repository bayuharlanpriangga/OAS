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
