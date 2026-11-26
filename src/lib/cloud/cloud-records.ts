import { adalahPemilikBisnis, periksaDanSelesaikanBentrokInvoiceState } from "@/lib/lainnya/audit-tim";
import {
  callOasGlobal,
  readAnggaranList,
  readAsetTetapList,
  readBillList,
  readCounterList,
  readCurrentCompany,
  readCurrentUser,
  readDokList,
  readInvoiceList,
  readJurnalBerulangList,
  readKontakList,
  readKursData,
  readNotifAlerts,
  readPembayaranList,
  readProdukList,
  writeAnggaranList,
  writeAsetTetapList,
  writeBillList,
  writeCounterList,
  writeDokList,
  writeInvoiceList,
  writeJurnalBerulangList,
  writeKontakList,
  writeKursData,
  writeNotifAlerts,
  writePembayaranList,
  writeProdukList,
  type KursDataRecord,
} from "@/lib/shared/legacy-store";
import { getDB } from "./db-adapter";

interface CloudRecordDef {
  get: () => unknown[];
  set: (v: unknown[]) => void;
  idOf: (r: Record<string, unknown> | null | undefined) => unknown;
  legacyKey: string | null;
  legacyOnce?: boolean;
  fromLegacy?: (raw: unknown) => unknown[];
  mergeRec?: (
    cloudRec: Record<string, unknown>,
    localRec: Record<string, unknown>
  ) => Record<string, unknown>;
}

function cloudKursDefault(): KursDataRecord {
  return {
    USD: 1,
    IDR: 16200,
    SGD: 12100,
    EUR: 18300,
    MYR: 3500,
    JPY: 107,
    updatedAt: null,
  };
}

function cloudKursFromList(list: unknown[]): KursDataRecord {
  const r = Array.isArray(list) ? list[0] : null;
  if (!r || typeof r !== "object") return cloudKursDefault();
  const { id: _id, ...rest } = r as Record<string, unknown>;
  void _id;
  return { ...cloudKursDefault(), ...rest } as KursDataRecord;
}

function cloudKursLegacy(raw: unknown): unknown[] {
  if (
    raw &&
    typeof raw === "object" &&
    !Array.isArray(raw) &&
    (raw as { updatedAt?: unknown }).updatedAt
  ) {
    return [{ id: "kurs", ...(raw as Record<string, unknown>) }];
  }
  return [];
}

export const CLOUD_RECORD_KINDS: Record<string, CloudRecordDef> = {
  invoice: {
    get: () => readInvoiceList(),
    set: (v) => writeInvoiceList(v as never[]),
    idOf: (r) => r?.id,
    legacyKey: "oas_invoices",
  },
  kontak: {
    get: () => readKontakList(),
    set: (v) => writeKontakList(v as never[]),
    idOf: (r) => r?.id,
    legacyKey: "oas_kontak",
  },
  aset_tetap: {
    get: () => readAsetTetapList(),
    set: (v) => writeAsetTetapList(v as never[]),
    idOf: (r) => r?.id,
    legacyKey: "oas_aset_tetap",
  },
  produk: {
    get: () => readProdukList(),
    set: (v) => writeProdukList(v as never[]),
    idOf: (r) => r?.ksId,
    legacyKey: null,
  },
  jurnal_berulang: {
    get: () => readJurnalBerulangList(),
    set: (v) => writeJurnalBerulangList(v as never[]),
    idOf: (r) => r?.id,
    legacyKey: "oas_jb",
    legacyOnce: true,
  },
  anggaran: {
    get: () => readAnggaranList(),
    set: (v) => writeAnggaranList(v as never[]),
    idOf: (r) => r?.id,
    legacyKey: "oas_anggaran",
    legacyOnce: true,
  },
  alert: {
    get: () => readNotifAlerts(),
    set: (v) => writeNotifAlerts(v as never[]),
    idOf: (r) => r?.id,
    legacyKey: "oas_alerts",
    legacyOnce: true,
  },
  kurs: {
    get: () => {
      const k = readKursData();
      return k && k.updatedAt ? [{ id: "kurs", ...k }] : [];
    },
    set: (v) => writeKursData(cloudKursFromList(v)),
    idOf: (r) => r?.id,
    legacyKey: "oas_kurs",
    legacyOnce: true,
    fromLegacy: cloudKursLegacy,
  },
  bill: {
    get: () => readBillList(),
    set: (v) => writeBillList(v as never[]),
    idOf: (r) => r?.id,
    legacyKey: "oas_bill",
    legacyOnce: true,
  },
  pembayaran: {
    get: () => readPembayaranList(),
    set: (v) => writePembayaranList(v as never[]),
    idOf: (r) => r?.id,
    legacyKey: "oas_pembayaran",
    legacyOnce: true,
  },
  dok: {
    get: () => readDokList(),
    set: (v) => writeDokList(v as never[]),
    idOf: (r) => r?.id,
    legacyKey: "oas_dok",
    legacyOnce: true,
  },
  counter: {
    get: () => readCounterList(),
    set: (v) => writeCounterList(v as never[]),
    idOf: (r) => r?.id,
    legacyKey: "oas_counter",
    legacyOnce: true,
    mergeRec: (c, l) =>
      Number(c?.terakhir || 0) > Number(l?.terakhir || 0) ? c : l,
  },
};

const CLOUD_REC_PAGE = 1000;
const CLOUD_REC_CHUNK = 200;
const CLOUD_REQ_TIMEOUT = 20000;

const _cloudSnap: Record<string, Record<string, Record<string, string>>> = {};
let _cloudQueue: Promise<boolean> = Promise.resolve(true);
let _cloudReadyFor: string | null = null;
let _cloudTableWarned = false;
let _cloudSyncErr = false;
let _cloudFailNotified = false;

function isCloudReadOnly(): boolean {
  return callOasGlobal("isReadOnly") === true;
}

function cacheKey(cid: string, kind: string): string {
  return `oas_rec_${kind}_${cid}`;
}

function cacheLocal(cid: string, kind: string, list: unknown[]): void {
  try {
    localStorage.setItem(cacheKey(cid, kind), JSON.stringify(list || []));
  } catch {
    // ignore
  }
}

function readCache(cid: string, kind: string): unknown[] {
  try {
    const arr = JSON.parse(localStorage.getItem(cacheKey(cid, kind)) || "[]");
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function seenKey(cid: string, kind: string): string {
  return `oas_rec_seen_${cid}_${kind}`;
}

function pendingOnce(cid: string): string[] {
  return Object.keys(CLOUD_RECORD_KINDS).filter(
    (k) =>
      CLOUD_RECORD_KINDS[k].legacyOnce && !localStorage.getItem(seenKey(cid, k))
  );
}

function legacyAllowed(
  cid: string,
  kind: string,
  def: CloudRecordDef,
  legacyOk: boolean
): boolean {
  if (!def.legacyOnce) return legacyOk;
  return (
    !localStorage.getItem(seenKey(cid, kind)) &&
    !localStorage.getItem(`oas_rec_legacy_claimed_${kind}`)
  );
}

function indexRecords(
  def: CloudRecordDef,
  list: unknown[]
): Map<string, { rec: Record<string, unknown>; json: string }> {
  const idx = new Map<string, { rec: Record<string, unknown>; json: string }>();
  (list || []).forEach((r) => {
    const rec = r as Record<string, unknown>;
    const id = def.idOf(rec);
    if (id === undefined || id === null || id === "") return;
    idx.set(String(id), { rec, json: JSON.stringify(rec) });
  });
  return idx;
}

function fnvHash(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function snapHashKey(cid: string): string {
  return `oas_rec_snaph_${cid}`;
}

function readSnapHash(cid: string): Record<string, Record<string, string>> {
  try {
    const o = JSON.parse(localStorage.getItem(snapHashKey(cid)) || "{}");
    return o && typeof o === "object" ? o : {};
  } catch {
    return {};
  }
}

function saveSnapHash(cid: string, kind: string): void {
  const snap = (_cloudSnap[cid] && _cloudSnap[cid][kind]) || {};
  const h: Record<string, string> = {};
  Object.keys(snap).forEach((id) => {
    h[id] = fnvHash(snap[id]);
  });
  const all = readSnapHash(cid);
  all[kind] = h;
  try {
    localStorage.setItem(snapHashKey(cid), JSON.stringify(all));
  } catch {
    // ignore
  }
}

function findUnsynced(
  cid: string
): Record<string, { up: Record<string, Record<string, unknown>>; del: string[] }> {
  const hashes = readSnapHash(cid);
  const out: Record<
    string,
    { up: Record<string, Record<string, unknown>>; del: string[] }
  > = {};
  Object.entries(CLOUD_RECORD_KINDS).forEach(([kind, def]) => {
    const h = hashes[kind];
    if (!h) return;
    const cache = indexRecords(def, readCache(cid, kind));
    const up: Record<string, Record<string, unknown>> = {};
    const del: string[] = [];
    let n = 0;
    cache.forEach((v, id) => {
      if (h[id] !== fnvHash(v.json)) {
        up[id] = v.rec;
        n++;
      }
    });
    Object.keys(h).forEach((id) => {
      if (!cache.has(id)) {
        del.push(id);
        n++;
      }
    });
    if (n) out[kind] = { up, del };
  });
  return out;
}

function sortNewestFirst(list: unknown[]): unknown[] {
  return list
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const ca = String((a.r as { createdAt?: string })?.createdAt || "");
      const cb = String((b.r as { createdAt?: string })?.createdAt || "");
      if (ca === cb) return a.i - b.i;
      return ca < cb ? 1 : -1;
    })
    .map((x) => x.r);
}

function applyUnsynced(
  def: CloudRecordDef,
  cloudList: unknown[],
  u: { up: Record<string, Record<string, unknown>>; del: string[] }
): unknown[] {
  const map = new Map<string, Record<string, unknown>>();
  indexRecords(def, cloudList).forEach((v, id) => map.set(id, v.rec));
  u.del.forEach((id) => map.delete(id));
  Object.keys(u.up).forEach((id) => {
    const existing = map.get(id);
    map.set(
      id,
      existing && def.mergeRec ? def.mergeRec(existing, u.up[id]) : u.up[id]
    );
  });
  return sortNewestFirst(Array.from(map.values()));
}

function withTimeout<T>(
  p: PromiseLike<T>
): Promise<T | { error: Error }> {
  return new Promise((resolve) => {
    const t = window.setTimeout(
      () => resolve({ error: new Error("timeout") }),
      CLOUD_REQ_TIMEOUT
    );
    Promise.resolve(p).then(
      (r) => {
        window.clearTimeout(t);
        resolve(r);
      },
      (e) => {
        window.clearTimeout(t);
        resolve({ error: e instanceof Error ? e : new Error(String(e)) });
      }
    );
  });
}

function afterSyncNotify(ok: boolean): void {
  if (_cloudSyncErr) {
    if (!_cloudFailNotified) {
      _cloudFailNotified = true;
      callOasGlobal(
        "showAlert",
        "Perubahan belum tersimpan ke cloud (koneksi bermasalah). Data aman di perangkat ini dan dikirim otomatis saat aplikasi dibuka lagi dengan koneksi, atau saat kamu menyimpan berikutnya."
      );
    }
  } else if (ok) {
    _cloudFailNotified = false;
  }
}

export function cloudResetRecordsState(): void {
  Object.values(CLOUD_RECORD_KINDS).forEach((def) => def.set([]));
  _cloudReadyFor = null;
}

export function cloudLoadFromCache(cid: string): void {
  Object.entries(CLOUD_RECORD_KINDS).forEach(([kind, def]) =>
    def.set(readCache(cid, kind))
  );
  _cloudReadyFor = null;
}

export function cloudDeleteRecords(kinds: string[]): Promise<string[]> {
  const ks = (kinds || []).filter((k) => Boolean(CLOUD_RECORD_KINDS[k]));
  if (!ks.length) return Promise.resolve([]);
  if (isCloudReadOnly()) return Promise.resolve(ks);

  const clearLocal = (cid: string | null, kind: string) => {
    const def = CLOUD_RECORD_KINDS[kind];
    def.set([]);
    if (!cid) {
      if (def.legacyKey) {
        try {
          localStorage.removeItem(def.legacyKey);
        } catch {
          // ignore
        }
      }
      return;
    }
    cacheLocal(cid, kind, []);
    if (_cloudSnap[cid]) _cloudSnap[cid][kind] = {};
    saveSnapHash(cid, kind);
    try {
      localStorage.setItem(`oas_rec_seen_${cid}`, "1");
      if (def.legacyOnce) localStorage.setItem(seenKey(cid, kind), "1");
    } catch {
      // ignore
    }
  };

  const company = readCurrentCompany();
  if (!company?.id) {
    ks.forEach((k) => clearLocal(null, k));
    return Promise.resolve([]);
  }

  const cid = company.id;
  const db = getDB();
  if (!db) return Promise.resolve(ks);

  const job = _cloudQueue
    .then(async () => {
      const failed: string[] = [];
      for (const kind of ks) {
        const active = readCurrentCompany();
        if (!active || active.id !== cid) {
          failed.push(kind);
          continue;
        }
        const res = await withTimeout(
          db
            .table("company_records")
            .delete()
            .eq("company_id", cid)
            .eq("kind", kind)
        );
        if (res.error) {
          console.warn("[cloud-records] hapus semua gagal:", kind, res.error);
          failed.push(kind);
          continue;
        }
        clearLocal(cid, kind);
      }
      return failed;
    })
    .catch((e) => {
      console.warn("[cloud-records] reset error:", e);
      return ks;
    });

  _cloudQueue = job.then(() => true);
  return job;
}

export async function cloudOfferLocalMigration(cid: string): Promise<void> {
  const company = readCurrentCompany();
  const user = readCurrentUser();
  if (!company || company.id !== cid) return;

  const found: Record<string, unknown[]> = {};
  let usedLegacy = false;
  const onceKinds: string[] = [];

  const pemilik = adalahPemilikBisnis(company, user?.id ?? null);
  const legacyOk =
    pemilik &&
    !localStorage.getItem("oas_rec_legacy_claimed") &&
    !localStorage.getItem(`oas_rec_seen_${cid}`);

  Object.entries(CLOUD_RECORD_KINDS).forEach(([kind, def]) => {
    let cached = readCache(cid, kind);
    const bersih = cached.filter((r) => {
      const id = def.idOf(r as Record<string, unknown>);
      return id !== undefined && id !== null && id !== "";
    });
    if (bersih.length !== cached.length) {
      cached = bersih;
      cacheLocal(cid, kind, bersih);
      if (_cloudReadyFor === cid) {
        def.set(
          (def.get() || []).filter((r) => {
            const id = def.idOf(r as Record<string, unknown>);
            return id !== undefined && id !== null && id !== "";
          })
        );
      }
    }
    if (cached.length) {
      const snap = (_cloudSnap[cid] && _cloudSnap[cid][kind]) || {};
      const fresh = cached.filter((r) => {
        const id = def.idOf(r as Record<string, unknown>);
        return id == null || snap[String(id)] !== JSON.stringify(r);
      });
      if (fresh.length) found[kind] = fresh;
      return;
    }
    if (
      def.legacyKey &&
      pemilik &&
      legacyAllowed(cid, kind, def, legacyOk)
    ) {
      try {
        let arr: unknown = JSON.parse(
          localStorage.getItem(def.legacyKey) || "[]"
        );
        if (def.fromLegacy) arr = def.fromLegacy(arr);
        if (Array.isArray(arr) && arr.length) {
          found[kind] = arr;
          if (def.legacyOnce) onceKinds.push(kind);
          else usedLegacy = true;
        }
      } catch {
        // ignore
      }
    }
  });

  if (!found.produk && legacyOk) {
    try {
      const raw = localStorage.getItem(`oas_data_v2_${cid}`);
      const p = raw && JSON.parse(raw).produkList;
      if (Array.isArray(p) && p.length) found.produk = p;
    } catch {
      // ignore
    }
  }

  if (!Object.keys(found).length) {
    pendingOnce(cid).forEach((k) => localStorage.setItem(seenKey(cid, k), "1"));
    return;
  }

  const sidik = JSON.stringify(
    Object.fromEntries(
      Object.entries(found).map(([k, arr]) => [
        k,
        `${arr.length}:${JSON.stringify(arr).length}`,
      ])
    )
  );
  const kunciBatal = `oas_rec_dismiss_${cid}`;
  if (localStorage.getItem(kunciBatal) === sidik) return;

  callOasGlobal("hideOpSpinner");
  const label: Record<string, string> = {
    invoice: "Invoice",
    bill: "Tagihan pembelian",
    pembayaran: "Pembayaran",
    dok: "Dokumen penjualan/pembelian",
    kontak: "Kontak",
    aset_tetap: "Aset tetap",
    produk: "Produk",
    jurnal_berulang: "Jurnal berulang",
    anggaran: "Anggaran",
    alert: "Alert notifikasi",
    kurs: "Kurs",
    counter: "Penomoran dokumen",
  };

  const confirmFn = (
    window as unknown as {
      showCustomConfirmGeneral?: (opts: unknown) => Promise<boolean>;
    }
  ).showCustomConfirmGeneral;

  const ok = confirmFn
    ? await confirmFn({
        icon: '<i class="ti ti-cloud-upload"></i>',
        iconColor: "var(--accent-tint)",
        iconBorder: "var(--border-strong)",
        title: "Unggah Data Lokal ke Cloud?",
        subtitle: "Ditemukan data di perangkat ini yang belum ada di cloud.",
        rows: [
          ...Object.entries(found).map(([k, arr]) => ({
            label: label[k] || k,
            value: `${arr.length} data`,
          })),
          { label: "Tujuan", value: `Bisnis "${company.name}"` },
        ],
        warning: null,
        btnLabel: "Ya, Unggah",
        btnGradient: "var(--accent)",
      })
    : window.confirm(
        `Unggah data lokal yang ditemukan ke bisnis "${company.name}" di cloud?`
      );

  const curCo = readCurrentCompany();
  if (!ok || !curCo || curCo.id !== cid) {
    if (!ok) {
      try {
        localStorage.setItem(kunciBatal, sidik);
      } catch {
        // ignore
      }
    }
    return;
  }
  try {
    localStorage.removeItem(kunciBatal);
  } catch {
    // ignore
  }

  Object.entries(found).forEach(([kind, arr]) =>
    CLOUD_RECORD_KINDS[kind]?.set(arr)
  );
  const synced = await cloudSyncRecords();
  if (synced) {
    if (usedLegacy) localStorage.setItem("oas_rec_legacy_claimed", cid);
    onceKinds.forEach((k) =>
      localStorage.setItem(`oas_rec_legacy_claimed_${k}`, cid)
    );
    pendingOnce(cid).forEach((k) => localStorage.setItem(seenKey(cid, k), "1"));
    localStorage.setItem(`oas_rec_seen_${cid}`, "1");
    callOasGlobal("showAlert", "Data lokal berhasil diunggah ke cloud.");
  } else {
    callOasGlobal(
      "showAlert",
      "Sebagian data belum terunggah ke cloud. Data tetap aman di perangkat; akan dicoba lagi saat menyimpan berikutnya."
    );
  }
}

export async function cloudLoadRecords(): Promise<boolean> {
  const company = readCurrentCompany();
  if (!company?.id) return false;
  const cid = company.id;
  _cloudReadyFor = null;

  const db = getDB();
  if (!db) {
    cloudLoadFromCache(cid);
    return false;
  }

  const rows: Array<{ kind: string; rec_id: string; data: unknown }> = [];
  try {
    for (let from = 0; ; from += CLOUD_REC_PAGE) {
      const { data, error } = await db
        .table("company_records")
        .select("kind,rec_id,data")
        .eq("company_id", cid)
        .order("kind")
        .order("rec_id")
        .range(from, from + CLOUD_REC_PAGE - 1);
      if (error) throw error;
      const chunk = Array.isArray(data)
        ? (data as Array<{ kind: string; rec_id: string; data: unknown }>)
        : [];
      rows.push(...chunk);
      if (chunk.length < CLOUD_REC_PAGE) break;
    }
  } catch (e) {
    console.warn("[cloud-records] gagal memuat:", e);
    cloudLoadFromCache(cid);
    if (!_cloudTableWarned) {
      _cloudTableWarned = true;
      callOasGlobal(
        "showAlert",
        "Data invoice/kontak/aset/produk/jurnal berulang/anggaran/alert/kurs/penomoran belum bisa dimuat dari cloud. Pastikan migrasi SQL <b>001_company_records</b> sudah dijalankan di Supabase. Sementara ini data dibaca dari cache perangkat."
      );
    }
    return false;
  }

  const activeCo = readCurrentCompany();
  if (!activeCo || activeCo.id !== cid) return false;

  const byKind: Record<string, unknown[]> = {};
  rows.forEach((r) => {
    (byKind[r.kind] = byKind[r.kind] || []).push(r.data);
  });

  const unsynced = isCloudReadOnly() ? {} : findUnsynced(cid);
  _cloudSnap[cid] = {};

  Object.entries(CLOUD_RECORD_KINDS).forEach(([kind, def]) => {
    const list = sortNewestFirst(byKind[kind] || []);
    const snap: Record<string, string> = {};
    indexRecords(def, list).forEach((v, id) => {
      snap[id] = v.json;
    });
    _cloudSnap[cid][kind] = snap;
    def.set(unsynced[kind] ? applyUnsynced(def, list, unsynced[kind]) : list);
    saveSnapHash(cid, kind);
  });
  _cloudReadyFor = cid;

  await periksaDanSelesaikanBentrokInvoiceState();

  const bolehTulis = !isCloudReadOnly();
  if (!rows.length) {
    if (bolehTulis) await cloudOfferLocalMigration(cid);
  } else {
    localStorage.setItem(`oas_rec_seen_${cid}`, "1");
    Object.keys(CLOUD_RECORD_KINDS).forEach((k) =>
      cacheLocal(cid, k, CLOUD_RECORD_KINDS[k].get())
    );
    pendingOnce(cid).forEach((k) => {
      if (byKind[k] && byKind[k].length) {
        localStorage.setItem(seenKey(cid, k), "1");
      }
    });
    if (bolehTulis && pendingOnce(cid).length) {
      await cloudOfferLocalMigration(cid);
    }
    const kU = Object.keys(unsynced);
    if (kU.length) {
      const n = kU.reduce(
        (a, k) =>
          a + Object.keys(unsynced[k].up).length + unsynced[k].del.length,
        0
      );
      const okU = await cloudSyncRecords(kU);
      if (okU) {
        callOasGlobal(
          "showAlert",
          `${n} perubahan dari sesi sebelumnya yang belum tersinkron sudah dikirim ke cloud.`
        );
      }
    }
  }
  return true;
}

async function syncNow(cid: string, kinds: string[]): Promise<boolean> {
  const active = readCurrentCompany();
  if (!active || active.id !== cid || _cloudReadyFor !== cid) return false;
  if (isCloudReadOnly()) return true;
  const db = getDB();
  if (!db) return false;

  const snapAll = _cloudSnap[cid] || (_cloudSnap[cid] = {});
  const now = new Date().toISOString();
  let allOk = true;
  _cloudSyncErr = false;

  for (const kind of kinds) {
    const def = CLOUD_RECORD_KINDS[kind];
    if (!def) continue;
    const prev = snapAll[kind] || (snapAll[kind] = {});
    const cur = indexRecords(def, def.get());

    const toUpsert: string[] = [];
    cur.forEach((v, id) => {
      if (prev[id] !== v.json) toUpsert.push(id);
    });
    const toDelete = Object.keys(prev).filter((id) => !cur.has(id));
    let changed = false;

    for (let i = 0; i < toUpsert.length; i += CLOUD_REC_CHUNK) {
      const part = toUpsert.slice(i, i + CLOUD_REC_CHUNK);
      const rows = part.map((id) => ({
        company_id: cid,
        kind,
        rec_id: id,
        data: cur.get(id)?.rec,
        updated_at: now,
      }));
      const res = await withTimeout(
        db
          .table("company_records")
          .upsert(rows, { onConflict: "company_id,kind,rec_id" })
      );
      if (res.error) {
        console.warn("[cloud-records] upsert gagal:", kind, res.error);
        allOk = false;
        _cloudSyncErr = true;
        break;
      }
      part.forEach((id) => {
        const entry = cur.get(id);
        if (entry) prev[id] = entry.json;
      });
      changed = true;
    }

    for (let i = 0; i < toDelete.length; i += CLOUD_REC_CHUNK) {
      const part = toDelete.slice(i, i + CLOUD_REC_CHUNK);
      const res = await withTimeout(
        db
          .table("company_records")
          .delete()
          .eq("company_id", cid)
          .eq("kind", kind)
          .in("rec_id", part)
      );
      if (res.error) {
        console.warn("[cloud-records] delete gagal:", kind, res.error);
        allOk = false;
        _cloudSyncErr = true;
        break;
      }
      part.forEach((id) => {
        delete prev[id];
      });
      changed = true;
    }

    if (changed) saveSnapHash(cid, kind);
  }
  return allOk;
}

export function cloudSyncRecords(kinds?: string[]): Promise<boolean> {
  const company = readCurrentCompany();
  if (!company?.id) return Promise.resolve(true);
  if (isCloudReadOnly()) return Promise.resolve(true);

  const cid = company.id;
  const ks =
    kinds && kinds.length ? kinds : Object.keys(CLOUD_RECORD_KINDS);
  ks.forEach((k) => {
    if (CLOUD_RECORD_KINDS[k]) {
      cacheLocal(cid, k, CLOUD_RECORD_KINDS[k].get());
    }
  });

  _cloudQueue = _cloudQueue
    .then(() => syncNow(cid, ks))
    .catch((e) => {
      console.warn("[cloud-records] sync error:", e);
      _cloudSyncErr = true;
      return false;
    })
    .then((ok) => {
      afterSyncNotify(ok);
      return ok;
    });
  return _cloudQueue;
}
