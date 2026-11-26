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
  rakId?: string;
  deskripsi?: string;
  metode?: string;
  [key: string]: unknown;
}

export interface KsCardRecord {
  id: string;
  nama: string;
  lokasi?: string;
  rakList?: Array<{ id: string; nama: string }>;
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

export interface NotifHistoryRecord {
  tipe: string;
  msg: string;
  alertId?: string;
  tgl: string;
  dibaca?: boolean;
}

export interface JurnalBerulangRecord {
  id: string;
  nama: string;
  frekuensi: "harian" | "mingguan" | "bulanan" | "triwulan" | "tahunan" | string;
  akunDebit: string;
  akunKredit: string;
  nominal: number;
  keterangan?: string;
  tglMulai: string;
  tglAkhir?: string | null;
  aktif: boolean;
  berikutnya: string;
  createdAt?: string;
}

export interface JurnalBerulangHistoryRecord {
  tgl: string;
  nama: string;
  nominal: number;
  jurnalId?: string;
}

export interface KursDataRecord {
  USD: number;
  IDR: number;
  SGD: number;
  EUR: number;
  MYR: number;
  JPY: number;
  updatedAt: string | null;
  [code: string]: number | string | null;
}

export interface SupabaseUserLike {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    picture?: string;
    has_password?: boolean;
    [key: string]: unknown;
  };
  app_metadata?: {
    providers?: string[];
    [key: string]: unknown;
  };
  identities?: Array<{
    provider: string;
    identity_data?: { email?: string; [key: string]: unknown };
    [key: string]: unknown;
  }>;
}

export interface SupabaseSessionLike {
  user?: SupabaseUserLike | null;
  access_token?: string;
  refresh_token?: string;
  [key: string]: unknown;
}

export interface CompanyLike {
  id: string;
  name?: string;
  type?: string;
  tipe?: string;
  user_id?: string;
  created_at?: string;
  _role?: string;
  [key: string]: unknown;
}

export interface DbQueryBuilderLike {
  select: (cols?: string) => DbQueryBuilderLike;
  insert: (payload: unknown) => DbQueryBuilderLike;
  update: (payload: unknown) => DbQueryBuilderLike;
  upsert: (payload: unknown, opts?: unknown) => DbQueryBuilderLike;
  delete: () => DbQueryBuilderLike;
  eq: (col: string, val: unknown) => DbQueryBuilderLike;
  in: (col: string, vals: unknown[]) => DbQueryBuilderLike;
  order: (col: string, opts?: unknown) => DbQueryBuilderLike;
  range: (from: number, to: number) => DbQueryBuilderLike;
  limit: (n: number) => DbQueryBuilderLike;
  single: () => Promise<{
    data: unknown;
    error: { message?: string; code?: string; details?: string; hint?: string } | null;
  }>;
  maybeSingle: () => Promise<{
    data: unknown;
    error: { message?: string; code?: string; details?: string; hint?: string } | null;
  }>;
  then: PromiseLike<{
    data: unknown;
    error: { message?: string; code?: string; details?: string; hint?: string } | null;
  }>["then"];
}

export interface DbAdapterLike {
  isConnected: () => boolean;
  auth: {
    signInWithPassword: (opts: {
      email: string;
      password: string;
    }) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
    signUp: (opts: {
      email: string;
      password: string;
      options?: unknown;
    }) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
    signOut: (opts?: {
      scope?: string;
    }) => Promise<{ error?: { message?: string } | null }>;
    signInWithOAuth: (
      opts: unknown
    ) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
    getSession: () => Promise<{
      data: { session: SupabaseSessionLike | null };
      error?: { message?: string } | null;
    }>;
    getUser: () => Promise<{
      data: { user: SupabaseUserLike | null };
      error?: { message?: string } | null;
    }>;
    onAuthStateChange: (
      cb: (event: string, session: SupabaseSessionLike | null) => void
    ) => { data?: { subscription?: { unsubscribe: () => void } } };
    resetPasswordForEmail: (
      email: string,
      opts?: unknown
    ) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
    updateUser: (
      opts: unknown
    ) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
    refreshSession: (
      opts?: unknown
    ) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
    setSession: (opts: {
      access_token: string;
      refresh_token: string;
    }) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
    exchangeCodeForSession: (code: string) => Promise<{
      data?: { session?: SupabaseSessionLike | null };
      error?: { message?: string } | null;
    }>;
    linkIdentity: (
      opts: unknown
    ) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
    unlinkIdentity: (
      identity: unknown
    ) => Promise<{ data?: unknown; error?: { message?: string } | null }>;
  };
  table: (name: string) => DbQueryBuilderLike;
  rpc: (
    fn: string,
    params?: Record<string, unknown>
  ) => Promise<{
    data: unknown;
    error: { message?: string; code?: string } | null;
  }>;
}

export interface OasLegacyStoreBridge {
  getAkuns: () => Akun[];
  setAkuns: (next: Akun[]) => void;
  getAkunsTrash: () => AkunTrashItem[];
  setAkunsTrash: (next: AkunTrashItem[]) => void;
  getJurnalEntries: () => JurnalEntry[];
  setJurnalEntries?: (next: JurnalEntry[]) => void;
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
  getNotifHistory?: () => NotifHistoryRecord[];
  setNotifHistory?: (next: NotifHistoryRecord[]) => void;
  getJurnalBerulangList?: () => JurnalBerulangRecord[];
  setJurnalBerulangList?: (next: JurnalBerulangRecord[]) => void;
  getJurnalBerulangHistory?: () => JurnalBerulangHistoryRecord[];
  setJurnalBerulangHistory?: (next: JurnalBerulangHistoryRecord[]) => void;
  getKursData?: () => KursDataRecord;
  setKursData?: (next: KursDataRecord) => void;
  getPeriodeKunciSampai?: () => string;
  setPeriodeKunciSampai?: (next: string) => void;
  getJurnalCounter?: () => number;
  setJurnalCounter?: (next: number) => void;
  getJurnalSumberAktif?: () => string;
  setJurnalSumberAktif?: (next: string) => void;
  getTransaksiAkunSettings?: () => TransaksiAkunSettings;
  setTransaksiAkunSettings?: (next: TransaksiAkunSettings) => void;
  getCurrentCompany?: () => CompanyLike | null;
  setCurrentCompany?: (next: CompanyLike | null) => void;
  getCurrentUser?: () => SupabaseUserLike | null;
  setCurrentUser?: (next: SupabaseUserLike | null) => void;
  getIsGuestMode?: () => boolean;
  setIsGuestMode?: (next: boolean) => void;
  getAuthReady?: () => boolean;
  setAuthReady?: (next: boolean) => void;
  getAfterLoginRunning?: () => boolean;
  setAfterLoginRunning?: (next: boolean) => void;
  getDB?: () => DbAdapterLike | null;
}

export interface OasKsStoreBridge {
  getMultiKartuStock: () => Record<string, KsCardRecord>;
  setMultiKartuStock?: (next: Record<string, KsCardRecord>) => void;
  getActiveIds?: () => { cardId: string | null; katId: string | null };
  getKartuStockTab?: () => string;
  setKartuStockTab: (metode: string) => void;
  getKartuStockData?: () => Record<string, unknown[]>;
  setKartuStockData?: (data: Record<string, unknown[]>) => void;
  setKartuStockIdCounter?: (next: number) => void;
  setActiveKartuStock?: (cardId: string | null, katId: string | null) => void;
  getKsJustWroteDirectly?: () => boolean;
  setKsJustWroteDirectly?: (val: boolean) => void;
}
