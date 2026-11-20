import type {
  Akun,
  AkunTrashItem,
  AsetTetap,
  Bill,
  CounterRecord,
  DokRecord,
  Invoice,
  JurnalEntry,
  Kontak,
  Pembayaran,
  Produk,
  TransaksiAkunSettings,
} from "@/types";

export interface KsKategoriRecord {
  id: string;
  nama: string;
  satuan?: string;
  deskripsi?: string;
  metode?: string;
  [key: string]: unknown;
}

export interface KsCardRecord {
  id: string;
  nama: string;
  lockedFromTrx?: boolean;
  kategori?: Record<string, KsKategoriRecord>;
  [key: string]: unknown;
}

export interface KsSaldoSummary {
  totalQty: number;
  hppNext: number;
  totalNilai: number;
  metode: string;
  layers: Array<{ qty: number; harga: number }>;
  allMetodeWithSaldo?: string[];
}

export interface AnggaranRecord {
  id: string;
  akunKode: string;
  periode: string;
  nominal: number;
  catatan?: string;
}

export interface NotifAlertRecord {
  id: string;
  nama: string;
  tipe: string;
  batas: number | null;
  akun: string | null;
  aktif: boolean;
  createdAt: string;
}

export interface OasLegacyStoreBridge {
  getAkuns: () => Akun[];
  setAkuns: (next: Akun[]) => void;
  getAkunsTrash: () => AkunTrashItem[];
  setAkunsTrash: (next: AkunTrashItem[]) => void;
  getJurnalEntries: () => JurnalEntry[];
  getProdukList: () => Produk[];
  setProdukList: (next: Produk[]) => void;
  getAsetTetapList: () => AsetTetap[];
  setAsetTetapList: (next: AsetTetap[]) => void;
  getKontakList?: () => Kontak[];
  setKontakList?: (next: Kontak[]) => void;
  getInvoiceList?: () => Invoice[];
  setInvoiceList?: (next: Invoice[]) => void;
  getBillList?: () => Bill[];
  setBillList?: (next: Bill[]) => void;
  getPembayaranList?: () => Pembayaran[];
  setPembayaranList?: (next: Pembayaran[]) => void;
  getDokList?: () => DokRecord[];
  setDokList?: (next: DokRecord[]) => void;
  getCounterList?: () => CounterRecord[];
  setCounterList?: (next: CounterRecord[]) => void;
  getAnggaranList?: () => AnggaranRecord[];
  setAnggaranList?: (next: AnggaranRecord[]) => void;
  getNotifAlerts?: () => NotifAlertRecord[];
  setNotifAlerts?: (next: NotifAlertRecord[]) => void;
  getJurnalSumberAktif?: () => string;
  setJurnalSumberAktif?: (next: string) => void;
  getTransaksiAkunSettings?: () => TransaksiAkunSettings;
  getCurrentCompany?: () => {
    id?: string;
    name?: string;
    type?: string;
    tipe?: string;
  } | null;
}

export interface OasKsStoreBridge {
  getMultiKartuStock: () => Record<string, KsCardRecord>;
  setMultiKartuStock?: (next: Record<string, KsCardRecord>) => void;
  getActiveIds?: () => { cardId: string | null; katId: string | null };
  getKartuStockTab?: () => string;
  setKartuStockTab: (metode: string) => void;
  getKartuStockData?: () => Record<string, unknown[]>;
  setKartuStockData?: (data: Record<string, unknown[]>) => void;
  setActiveKartuStock?: (cardId: string | null, katId: string | null) => void;
  getKsJustWroteDirectly?: () => boolean;
  setKsJustWroteDirectly?: (val: boolean) => void;
}
