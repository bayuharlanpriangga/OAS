import type { TahunBukuKode } from "@/types";

export const JENIS_PENUTUP = "Penutup" as const;

export const JENIS_JURNAL = {
  MANUAL: "Manual",
  INVOICE: "Invoice & Piutang",
  PENYUSUTAN: "Penyusutan",
  JURNAL_BERULANG: "Jurnal Berulang",
  REKONSILIASI: "Rekonsiliasi",
  SALDO_AWAL: "Saldo Awal",
  KARTU_STOCK: "Kartu Stock",
  BEP: "BEP & Margin",
  PINJAMAN: "Pinjaman",
  GAJI_PPH21: "Gaji & PPh 21",
  PPH23: "PPh 23",
  BILL: "Tagihan Pembelian",
} as const;

export const SUMBER_JURNAL = {
  ORIAS_AI: "Orias AI",
} as const;

export const PPN_TARIF_STANDAR = 11;

export const REV_KET_RE = /^\[Pembalik ([^\]]+)\]\s*/;

export const TB_BULAN_AWAL: Record<TahunBukuKode, number> = {
  jan: 0,
  apr: 3,
  jul: 6,
  okt: 9,
};
