import type { KartuKontakConfig, KartuKontakJenis } from "./types";

export const KARTU_CFG: Record<KartuKontakJenis, KartuKontakConfig> = {
  piutang: {
    label: "Piutang",
    pihak: "Pelanggan",
    judul: "Kartu Piutang",
    noDok: "No Invoice",
    jenisBayar: "invoice",
    colTagih: "Tagihan",
    colBayar: "Pembayaran",
  },
  hutang: {
    label: "Hutang",
    pihak: "Supplier",
    judul: "Kartu Hutang",
    noDok: "No Tagihan",
    jenisBayar: "bill",
    colTagih: "Tagihan",
    colBayar: "Pembayaran",
  },
};
