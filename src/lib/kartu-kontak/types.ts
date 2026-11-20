export type KartuKontakJenis = "piutang" | "hutang";

export interface KartuKontakBaris {
  tanggal: string;
  jenis: "dokumen" | "bayar" | "bayar_lama";
  no: string;
  ket: string;
  debit: number;
  kredit: number;
  saldo: number;
  metode?: string;
}

export interface KartuKontakResult {
  kontak: string;
  jenis: KartuKontakJenis;
  baris: KartuKontakBaris[];
  totalTagihan: number;
  totalBayar: number;
  saldoAkhir: number;
  jumlahDok: number;
}

export interface KartuKontakConfig {
  label: string;
  pihak: string;
  judul: string;
  noDok: string;
  jenisBayar: "invoice" | "bill";
  colTagih: string;
  colBayar: string;
}

export type KartuDokInput = {
  id: string;
  tanggal: string;
  total: number;
  sisaTagihan: number;
  dibayarLama?: number;
  status: string;
  noInvoice?: string;
  noBill?: string;
  pelanggan?: string;
  supplier?: string;
  kontak?: string;
  deskripsi?: string;
};
