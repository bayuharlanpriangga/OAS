import { getDefaultAkuns } from "@/lib/master/chart-of-accounts";
import { JENIS_JURNAL, resolveAkunSetting } from "@/lib/shared/accounting";
import {
  callOasGlobal,
  getWin,
  type AnggaranRecord,
  type CompanyLike,
  type DbAdapterLike,
  type JurnalBerulangHistoryRecord,
  type JurnalBerulangRecord,
  type KsCardRecord,
  type KursDataRecord,
  type NotifAlertRecord,
  type NotifHistoryRecord,
  type OasKsStoreBridge,
  type OasLegacyStoreBridge,
  type SupabaseUserLike,
} from "@/lib/shared/legacy-store";
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

function safeJsonParse<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function safeJsonArray<T>(key: string): T[] {
  const res = safeJsonParse<unknown>(key, []);
  return Array.isArray(res) ? (res as T[]) : [];
}

const DEFAULT_KURS: KursDataRecord = {
  USD: 1,
  IDR: 16200,
  SGD: 12100,
  EUR: 18300,
  MYR: 3500,
  JPY: 107,
  updatedAt: null,
};

const DEFAULT_TRX_SETTINGS: TransaksiAkunSettings = {
  jual: {
    "4101": "4101",
    "4102": "4102",
    "4105": "4105",
    "4106": "4106",
    "4107": "4107",
    "4202": "4202",
  },
  beli: {
    "1301": "1301",
    "1302": "1302",
    "1303": "1303",
    "1304": "1304",
    "1401": "1401",
    "5101": "5101",
  },
  jualHpp: "",
  jualPersediaan: "",
};

let initialized = false;

let akuns: Akun[] = [];
let akunsTrash: AkunTrashItem[] = [];
let transaksiAkunSettings: TransaksiAkunSettings = {
  jual: { ...DEFAULT_TRX_SETTINGS.jual },
  beli: { ...DEFAULT_TRX_SETTINGS.beli },
  jualHpp: "",
  jualPersediaan: "",
};
let jurnalEntries: JurnalEntry[] = [];
let jurnalCounter = 1;
let periodeKunciSampai = "";
let jurnalSumberAktif = "";
let produkList: Produk[] = [];
let currentPage = "dashboard";

let jurnalBerulangList: JurnalBerulangRecord[] = [];
let jurnalBerulangHistory: JurnalBerulangHistoryRecord[] = [];
let invoiceList: Invoice[] = [];
let kursData: KursDataRecord = { ...DEFAULT_KURS };
let notifAlerts: NotifAlertRecord[] = [];
let notifHistory: NotifHistoryRecord[] = [];
let anggaranList: AnggaranRecord[] = [];
let asetTetapList: AsetTetap[] = [];
let kontakList: Kontak[] = [];
let billList: Bill[] = [];
let pembayaranList: Pembayaran[] = [];
let dokList: DokRecord[] = [];
let counterList: CounterRecord[] = [];

let kartuStockData: Record<string, unknown[]> = {
  fifo: [],
  lifo: [],
  wa: [],
  mwa: [],
};
let kartuStockTab = "fifo";
let multiKartuStock: Record<string, KsCardRecord> = {};
let activeKartuStockId: string | null = null;
let activeKategoriId: string | null = null;
let kartuStockIdCounter = 1;
let ksJustWroteDirectly = false;

let currentUser: SupabaseUserLike | null = null;
let currentCompany: CompanyLike | null = null;
let authReady = false;
let isGuestMode = false;
let afterLoginRunning = false;

export function getCurrentPage(): string {
  return currentPage;
}

export function setCurrentPage(page: string): void {
  currentPage = page;
}

export function resolveAkunSettingRuntime(
  kategori: "jual" | "beli",
  kodeDefault: string
): string {
  return resolveAkunSetting(transaksiAkunSettings, kategori, kodeDefault);
}

export function seedData(): void {
  const today = new Date().toISOString().split("T")[0];
  const [y, m] = today.split("-");
  const samples = [
    {
      tanggal: `${y}-${m}-01`,
      ket: "Modal awal pemilik",
      jenis: JENIS_JURNAL.SALDO_AWAL,
      lines: [
        { akun: "1101", ket: "Kas masuk", debit: 50000000, kredit: 0 },
        { akun: "3101", ket: "Modal pemilik", debit: 0, kredit: 50000000 },
      ],
    },
    {
      tanggal: `${y}-${m}-05`,
      ket: "Penjualan tunai INV-001",
      jenis: "Penjualan",
      ref: "INV-001",
      lines: [
        { akun: "1101", ket: "Kas masuk", debit: 15000000, kredit: 0 },
        { akun: "4101", ket: "Penjualan", debit: 0, kredit: 15000000 },
      ],
    },
    {
      tanggal: `${y}-${m}-05`,
      ket: "HPP penjualan",
      jenis: "Penjualan",
      ref: "INV-001",
      lines: [
        { akun: "5101", ket: "HPP", debit: 9000000, kredit: 0 },
        { akun: "1301", ket: "Persediaan", debit: 0, kredit: 9000000 },
      ],
    },
    {
      tanggal: `${y}-${m}-10`,
      ket: "Pembelian persediaan PO-001",
      jenis: "Pembelian",
      ref: "PO-001",
      lines: [
        { akun: "1301", ket: "Persediaan", debit: 8000000, kredit: 0 },
        { akun: "1101", ket: "Kas keluar", debit: 0, kredit: 8000000 },
      ],
    },
    {
      tanggal: `${y}-${m}-15`,
      ket: "Beban gaji karyawan",
      jenis: "Kas",
      lines: [
        { akun: "6101", ket: "Beban gaji", debit: 5000000, kredit: 0 },
        { akun: "1101", ket: "Kas keluar", debit: 0, kredit: 5000000 },
      ],
    },
    {
      tanggal: `${y}-${m}-20`,
      ket: "Penjualan kredit INV-002",
      jenis: "Penjualan",
      ref: "INV-002",
      lines: [
        { akun: "1201", ket: "Piutang usaha", debit: 12000000, kredit: 0 },
        { akun: "4101", ket: "Penjualan", debit: 0, kredit: 12000000 },
      ],
    },
    {
      tanggal: `${y}-${m}-25`,
      ket: "Beban sewa kantor",
      jenis: "Kas",
      lines: [
        { akun: "6102", ket: "Beban sewa", debit: 2500000, kredit: 0 },
        { akun: "1101", ket: "Kas keluar", debit: 0, kredit: 2500000 },
      ],
    },
  ];
  samples.forEach((s) => callOasGlobal("addJurnal", s));
}

export function initOasRuntimeStore(): void {
  if (typeof window === "undefined") return;
  const win = getWin();
  if (!win) return;

  if (!initialized) {
    initialized = true;
    akuns = getDefaultAkuns();
    jurnalBerulangList = safeJsonArray<JurnalBerulangRecord>("oas_jb");
    jurnalBerulangHistory = safeJsonArray<JurnalBerulangHistoryRecord>(
      "oas_jb_hist"
    );
    invoiceList = safeJsonArray<Invoice>("oas_invoices");
    kursData =
      safeJsonParse<KursDataRecord | null>("oas_kurs", null) || {
        ...DEFAULT_KURS,
      };
    notifAlerts = safeJsonArray<NotifAlertRecord>("oas_alerts");
    notifHistory = safeJsonArray<NotifHistoryRecord>("oas_notif_hist");
    anggaranList = safeJsonArray<AnggaranRecord>("oas_anggaran");
    asetTetapList = safeJsonArray<AsetTetap>("oas_aset_tetap");
    kontakList = safeJsonArray<Kontak>("oas_kontak");
    billList = safeJsonArray<Bill>("oas_bill");
    pembayaranList = safeJsonArray<Pembayaran>("oas_pembayaran");
    dokList = safeJsonArray<DokRecord>("oas_dok");
    counterList = safeJsonArray<CounterRecord>("oas_counter");
  }

  const storeBridge: OasLegacyStoreBridge = {
    getAkuns: () => akuns,
    setAkuns: (next) => {
      akuns = Array.isArray(next) ? next : getDefaultAkuns();
    },
    getAkunsTrash: () => akunsTrash,
    setAkunsTrash: (next) => {
      akunsTrash = Array.isArray(next) ? next : [];
    },
    getJurnalEntries: () => jurnalEntries,
    setJurnalEntries: (next) => {
      jurnalEntries = Array.isArray(next) ? next : [];
    },
    getProdukList: () => produkList,
    setProdukList: (next) => {
      produkList = Array.isArray(next) ? next : [];
    },
    getAsetTetapList: () => asetTetapList,
    setAsetTetapList: (next) => {
      asetTetapList = Array.isArray(next) ? next : [];
    },
    getKontakList: () => kontakList,
    setKontakList: (next) => {
      kontakList = Array.isArray(next) ? next : [];
    },
    getInvoiceList: () => invoiceList,
    setInvoiceList: (next) => {
      invoiceList = Array.isArray(next) ? next : [];
    },
    getBillList: () => billList,
    setBillList: (next) => {
      billList = Array.isArray(next) ? next : [];
    },
    getPembayaranList: () => pembayaranList,
    setPembayaranList: (next) => {
      pembayaranList = Array.isArray(next) ? next : [];
    },
    getDokList: () => dokList,
    setDokList: (next) => {
      dokList = Array.isArray(next) ? next : [];
    },
    getCounterList: () => counterList,
    setCounterList: (next) => {
      counterList = Array.isArray(next) ? next : [];
    },
    getAnggaranList: () => anggaranList,
    setAnggaranList: (next) => {
      anggaranList = Array.isArray(next) ? next : [];
    },
    getNotifAlerts: () => notifAlerts,
    setNotifAlerts: (next) => {
      notifAlerts = Array.isArray(next) ? next : [];
    },
    getNotifHistory: () => notifHistory,
    setNotifHistory: (next) => {
      notifHistory = Array.isArray(next) ? next : [];
    },
    getJurnalBerulangList: () => jurnalBerulangList,
    setJurnalBerulangList: (next) => {
      jurnalBerulangList = Array.isArray(next) ? next : [];
    },
    getJurnalBerulangHistory: () => jurnalBerulangHistory,
    setJurnalBerulangHistory: (next) => {
      jurnalBerulangHistory = Array.isArray(next) ? next : [];
    },
    getKursData: () => kursData,
    setKursData: (next) => {
      if (next && typeof next === "object") kursData = next;
    },
    getPeriodeKunciSampai: () => periodeKunciSampai,
    setPeriodeKunciSampai: (next) => {
      periodeKunciSampai = typeof next === "string" ? next : "";
    },
    getJurnalCounter: () => jurnalCounter,
    setJurnalCounter: (next) => {
      if (typeof next === "number" && Number.isFinite(next)) {
        jurnalCounter = next;
      }
    },
    getJurnalSumberAktif: () => jurnalSumberAktif,
    setJurnalSumberAktif: (next) => {
      jurnalSumberAktif = typeof next === "string" ? next : "";
    },
    getTransaksiAkunSettings: () => transaksiAkunSettings,
    setTransaksiAkunSettings: (next) => {
      if (next && typeof next === "object") transaksiAkunSettings = next;
    },
    getCurrentCompany: () => currentCompany,
    setCurrentCompany: (next) => {
      currentCompany = next || null;
    },
    getCurrentUser: () => currentUser,
    setCurrentUser: (next) => {
      currentUser = next || null;
    },
    getIsGuestMode: () => isGuestMode,
    setIsGuestMode: (next) => {
      isGuestMode = !!next;
    },
    getAuthReady: () => authReady,
    setAuthReady: (next) => {
      authReady = !!next;
    },
    getAfterLoginRunning: () => afterLoginRunning,
    setAfterLoginRunning: (next) => {
      afterLoginRunning = !!next;
    },
    getDB: () => (win.DB as DbAdapterLike | undefined) ?? null,
  };

  const ksBridge: OasKsStoreBridge = {
    getMultiKartuStock: () => multiKartuStock,
    setMultiKartuStock: (next) => {
      multiKartuStock = next || {};
    },
    getActiveIds: () => ({
      cardId: activeKartuStockId,
      katId: activeKategoriId,
    }),
    setActiveKartuStock: (cardId, katId) => {
      activeKartuStockId = cardId || null;
      activeKategoriId = katId || null;
    },
    getKartuStockTab: () => kartuStockTab,
    setKartuStockTab: (m) => {
      if (m) kartuStockTab = m;
    },
    getKartuStockData: () => kartuStockData,
    setKartuStockData: (d) => {
      kartuStockData = d || { fifo: [], lifo: [], wa: [], mwa: [] };
    },
    setKartuStockIdCounter: (n) => {
      if (typeof n === "number" && Number.isFinite(n)) kartuStockIdCounter = n;
    },
    getKsJustWroteDirectly: () => ksJustWroteDirectly,
    setKsJustWroteDirectly: (v) => {
      ksJustWroteDirectly = !!v;
    },
  };

  win.__oasStore = storeBridge;
  win.__oasKsStore = ksBridge;

  // Live property accessors di window untuk backward-compatibility kode yang membaca window.akuns dll.
  const defineLiveProp = <T>(
    prop: string,
    get: () => T,
    set: (v: T) => void
  ) => {
    try {
      Object.defineProperty(window, prop, {
        configurable: true,
        enumerable: true,
        get,
        set,
      });
    } catch {
      // ignore if already non-configurable
    }
  };

  defineLiveProp("akuns", () => akuns, (v) => {
    akuns = v;
  });
  defineLiveProp("jurnalEntries", () => jurnalEntries, (v) => {
    jurnalEntries = v;
  });
  defineLiveProp("currentCompany", () => currentCompany, (v) => {
    currentCompany = v;
  });
  defineLiveProp("currentUser", () => currentUser, (v) => {
    currentUser = v;
  });
  defineLiveProp("isGuestMode", () => isGuestMode, (v) => {
    isGuestMode = !!v;
  });
  defineLiveProp("_authReady", () => authReady, (v) => {
    authReady = !!v;
  });
  defineLiveProp("currentPage", () => currentPage, (v) => {
    currentPage = v;
  });
  defineLiveProp("multiKartuStock", () => multiKartuStock, (v) => {
    multiKartuStock = v || {};
  });
  defineLiveProp("kartuStockIdCounter", () => kartuStockIdCounter, (v) => {
    kartuStockIdCounter = v;
  });
  defineLiveProp("activeKartuStockId", () => activeKartuStockId, (v) => {
    activeKartuStockId = v;
  });
  defineLiveProp("activeKategoriId", () => activeKategoriId, (v) => {
    activeKategoriId = v;
  });
}
