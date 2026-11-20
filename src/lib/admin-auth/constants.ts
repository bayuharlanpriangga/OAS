import type { PeranBisnis } from "./types";

export const PERAN_BISNIS_LABEL: Record<PeranBisnis, string> = {
  owner: "Pemilik",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const MODUL_HALAMAN: Record<string, string> = {
  dashboard: "dashboard",
  transaksi: "transaksi",
  kurs: "transaksi",
  "jurnal-umum": "jurnal",
  "jurnal-kas": "jurnal",
  "jurnal-penjualan": "jurnal",
  "jurnal-pembelian": "jurnal",
  "jurnal-berulang": "jurnal",
  "buku-besar": "jurnal",
  "neraca-saldo": "jurnal",
  "laba-rugi": "laba-rugi",
  neraca: "neraca",
  "perubahan-ekuitas": "neraca",
  "arus-kas": "arus-kas",
  akun: "akun",
  "aset-tetap": "akun",
  kontak: "kontak",
  invoice: "invoice",
  bill: "invoice",
  "umur-piutang": "invoice",
  "umur-hutang": "invoice",
  "kartu-piutang": "invoice",
  "kartu-hutang": "invoice",
  penawaran: "invoice",
  "pesanan-jual": "invoice",
  produk: "invoice",
  anggaran: "anggaran",
  pajak: "pajak",
  rekonsiliasi: "rekonsiliasi",
  analitik: "analitik",
  "kalk-rasio": "analitik",
  "kalk-bep": "analitik",
  "kalk-bunga": "analitik",
  "kalk-penyusutan": "analitik",
  "kalk-persediaan": "analitik",
  "ai-assistant": "ai-assistant",
};

export const PERAN_BOLEH_TULIS: readonly PeranBisnis[] = [
  "owner",
  "admin",
  "member",
];
