export type KsMetode = "fifo" | "lifo" | "wa" | "mwa";

export interface KsLayer {
  qty: number;
  harga: number;
}

export interface KsEntry {
  id: number | string;
  tgl: string;
  ket: string;
  mQty: number;
  mHarga: number;
  kQty: number;
  kHarga: number;
  kJml: number;
  keluarLayers?: KsLayer[];
  saldoLayers: KsLayer[];
  jurnalDone?: boolean;
}

export interface KsMetodeData {
  fifo: KsEntry[];
  lifo: KsEntry[];
  wa: KsEntry[];
  mwa: KsEntry[];
}

export interface KsKategori {
  id: string;
  nama: string;
  satuan: string;
  deskripsi?: string;
  data: KsMetodeData;
}

export interface KsCard {
  id: string;
  nama: string;
  satuan: string;
  createdAt?: string;
  lockedFromTrx?: boolean;
  kategori: Record<string, KsKategori>;
  data?: KsMetodeData;
}

export interface KsSaldoDetail {
  metode: KsMetode;
  totalQty: number;
  totalNilai: number;
  hppRata: number;
  hppNext: number;
  layers: KsLayer[];
  allMetodeWithSaldo: KsMetode[];
}
