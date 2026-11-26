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

export interface GudangRak {
  id: string;
  nama: string;
}

export interface KsKategori {
  id: string;
  nama: string;
  satuan: string;
  rakId?: string;
  deskripsi?: string;
  data: KsMetodeData;
}

export interface KsCard {
  id: string;
  nama: string;
  satuan: string;
  lokasi?: string;
  rakList?: GudangRak[];
  createdAt?: string;
  lockedFromTrx?: boolean;
  kategori: Record<string, KsKategori>;
  data?: KsMetodeData;
}

export interface TransferGudangLog {
  id: string;
  tanggal: string;
  fromGudangId: string;
  fromGudangNama: string;
  toGudangId: string;
  toGudangNama: string;
  toRakNama?: string;
  barangNama: string;
  satuan: string;
  qty: number;
  nilaiTotal: number;
  catatan?: string;
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
