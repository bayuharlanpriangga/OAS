import type { DokJenis } from "@/types";

export const DOK_JENIS: Record<
  DokJenis,
  { awalan: string; label: string; transisi: Record<string, string[]> }
> = {
  penawaran: {
    awalan: "QUO",
    label: "Penawaran",
    transisi: {
      draft: ["terkirim", "batal"],
      terkirim: ["disetujui", "ditolak", "batal"],
      disetujui: ["selesai", "batal"],
      ditolak: [],
      selesai: [],
      batal: [],
    },
  },
  pesanan_jual: {
    awalan: "SO",
    label: "Pesanan Penjualan",
    transisi: {
      draft: ["dikonfirmasi", "batal"],
      dikonfirmasi: ["sebagian", "selesai", "batal"],
      sebagian: ["selesai", "batal"],
      selesai: [],
      batal: [],
    },
  },
  surat_jalan: {
    awalan: "SJ",
    label: "Surat Jalan",
    transisi: {
      draft: ["dikirim", "batal"],
      dikirim: ["selesai"],
      selesai: [],
      batal: [],
    },
  },
  pesanan_beli: {
    awalan: "PO",
    label: "Pesanan Pembelian",
    transisi: {
      draft: ["dipesan", "batal"],
      dipesan: ["sebagian", "selesai", "batal"],
      sebagian: ["selesai", "batal"],
      selesai: [],
      batal: [],
    },
  },
  penerimaan: {
    awalan: "GRN",
    label: "Penerimaan Barang",
    transisi: {
      draft: ["diterima", "batal"],
      diterima: [],
      batal: [],
    },
  },
  retur_jual: {
    awalan: "RJ",
    label: "Retur Penjualan",
    transisi: {
      draft: ["diproses", "batal"],
      diproses: ["selesai"],
      selesai: [],
      batal: [],
    },
  },
  retur_beli: {
    awalan: "RB",
    label: "Retur Pembelian",
    transisi: {
      draft: ["diproses", "batal"],
      diproses: ["selesai"],
      selesai: [],
      batal: [],
    },
  },
};

export const DOK_REF_LAIN = ["invoice", "bill"] as const;
