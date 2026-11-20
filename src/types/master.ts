export interface Produk {
  id?: string;
  ksId: string;
  kode?: string;
  nama?: string;
  kat?: string;
  satuan?: string;
  hargaJual: number;
  hpp?: number;
  stok?: number;
  stokMin?: number;
  akunPend?: string;
  akunHpp?: string;
  akunPers?: string;
  ppn: number | null;
  ppnInclusive?: boolean;
  deskripsi?: string;
}

export type KontakTipe = "pelanggan" | "supplier" | "keduanya";

export interface Kontak {
  id: string;
  nama: string;
  tipe: KontakTipe;
  telp?: string;
  email?: string;
  alamat?: string;
  npwp?: string;
  pic?: string;
  catatan?: string;
  totalTrx?: number;
  totalPenjualan?: number;
  totalPembelian?: number;
  createdAt: string;
}

export type AsetTetapMetode =
  | "garis-lurus"
  | "saldo-menurun"
  | "sum-of-years"
  | "unit-produksi";

export type AsetTetapStatus = "aktif" | "disposal";

export interface AsetTetap {
  id: string;
  nama: string;
  hargaPerolehan: number;
  kategori: string;
  tglPerolehan: string;
  nilaiResidu: number;
  umurEkonomis: number;
  metode: AsetTetapMetode;
  lokasi?: string;
  status: AsetTetapStatus;
  tglDisposal?: string;
  createdAt: string;
}

export interface KartuStockLayer {
  tanggal: string;
  qty: number;
  hargaSatuan: number;
  sisaQty: number;
}

export interface KartuStockCategory {
  id: string;
  nama: string;
  satuan: string;
  stok: number;
  stokMin?: number;
  entries: KartuStockLayer[];
  kategori?: Record<string, KartuStockCategory>;
}
