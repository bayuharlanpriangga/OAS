import type { TahunBukuKode } from "./accounting";

export type CompanyRole = "owner" | "admin" | "member" | "viewer";

export interface Company {
  id: string;
  name: string;
  type?: string;
  user_id?: string;
  _role?: CompanyRole;
  created_at?: string;
}

export interface ProfilPerusahaan {
  nama?: string;
  alamat?: string;
  telp?: string;
  email?: string;
  npwp?: string;
  tahunBuku?: TahunBukuKode;
  logo?: string;
}

export interface KursData {
  USD: number;
  IDR: number;
  SGD: number;
  EUR: number;
  MYR: number;
  JPY: number;
  updatedAt: string | null;
}

export interface AnggaranItem {
  id: string;
  akun: string;
  periode: string;
  target: number;
  catatan?: string;
}

export interface JurnalBerulang {
  id: string;
  nama: string;
  frekuensi: "harian" | "mingguan" | "bulanan" | "triwulan" | "tahunan";
  tanggalMulai: string;
  tanggalBerikut?: string;
  aktif: boolean;
  lines: Array<{ akun: string; ket?: string; debit: number; kredit: number }>;
}
