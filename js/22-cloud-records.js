// ═══════════════════════════════════════════════════════════
// CLOUD RECORDS — sinkron invoice, kontak, aset tetap, produk, jurnal berulang,
// dan anggaran ke Supabase (tabel company_records), terpisah per bisnis.
//
// Kenapa ada: sebelumnya data ini hanya di localStorage dengan key
// global, jadi tidak ikut ke perangkat lain, tercampur antar bisnis, dan
// hilang kalau cache browser dibersihkan. Skema tabel: lihat
// docs/migrations/001_company_records.sql.
//
// Cara kerja:
//  - Saat bisnis dipilih, cloudLoadRecords() memuat semua record bisnis itu.
//  - Setiap simpan, cloudSyncRecords() membandingkan list sekarang dengan
//    snapshot terakhir yang tersinkron, lalu hanya meng-upsert yang berubah
//    dan menghapus yang sudah dibuang. Jadi hapus invoice di app ikut
//    terhapus di cloud, dan record lain tidak ditulis ulang.
//  - Setiap simpan juga menulis cache lokal per bisnis
//    (oas_rec_<kind>_<companyId>) supaya data tidak hilang kalau cloud gagal.
//  - Mode tamu tidak memakai modul ini; tetap pakai localStorage lama.
//
// Dimuat setelah 16-auth-company.js dan 19-fitur-tambahan.js.
// ═══════════════════════════════════════════════════════════

const CLOUD_RECORD_KINDS = {
  invoice:    { get: () => invoiceList,   set: v => { invoiceList = v; },   idOf: r => r && r.id,    legacyKey: 'oas_invoices' },
  kontak:     { get: () => kontakList,    set: v => { kontakList = v; },    idOf: r => r && r.id,    legacyKey: 'oas_kontak' },
  aset_tetap: { get: () => asetTetapList, set: v => { asetTetapList = v; }, idOf: r => r && r.id,    legacyKey: 'oas_aset_tetap' },
  produk:     { get: () => produkList,    set: v => { produkList = v; },    idOf: r => r && r.ksId,  legacyKey: null },
  // legacyOnce: kind yang ditambah belakangan. Data lama di key global ditawarkan
  // SEKALI per kind per bisnis (flag oas_rec_seen_<cid>_<kind>), walau bisnis itu
  // sudah punya record kind lain di cloud. Tanpa ini data lama tampak hilang.
  jurnal_berulang: { get: () => jurnalBerulangList, set: v => { jurnalBerulangList = v; }, idOf: r => r && r.id, legacyKey: 'oas_jb',       legacyOnce: true },
  anggaran:        { get: () => anggaranList,       set: v => { anggaranList = v; },       idOf: r => r && r.id, legacyKey: 'oas_anggaran', legacyOnce: true },
};

const CLOUD_REC_PAGE  = 1000; // batas default Supabase per request
const CLOUD_REC_CHUNK = 200;  // jumlah baris per upsert/delete

let _cloudSnap = {};          // companyId -> kind -> { recId: json terakhir yang tersinkron }
let _cloudQueue = Promise.resolve(true);
let _cloudReadyFor = null;    // companyId yang sudah selesai dimuat dari cloud
let _cloudTableWarned = false;

function _cloudCacheKey(cid, kind) { return 'oas_rec_' + kind + '_' + cid; }

function _cloudCacheLocal(cid, kind, list) {
  try { localStorage.setItem(_cloudCacheKey(cid, kind), JSON.stringify(list || [])); } catch (e) {}
}

function _cloudReadCache(cid, kind) {
  try {
    const arr = JSON.parse(localStorage.getItem(_cloudCacheKey(cid, kind)) || '[]');
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function _cloudSeenKey(cid, kind) { return 'oas_rec_seen_' + cid + '_' + kind; }

// Kind legacyOnce yang belum pernah diputuskan untuk bisnis ini.
function _cloudPendingOnce(cid) {
  return Object.keys(CLOUD_RECORD_KINDS).filter(k =>
    CLOUD_RECORD_KINDS[k].legacyOnce && !localStorage.getItem(_cloudSeenKey(cid, k)));
}

// Boleh menawarkan data lama (key global) untuk kind ini ke bisnis ini?
function _cloudLegacyAllowed(cid, kind, def, legacyOk) {
  if (!def.legacyOnce) return legacyOk;
  return !localStorage.getItem(_cloudSeenKey(cid, kind)) && !localStorage.getItem('oas_rec_legacy_claimed_' + kind);
}

// id -> { rec, json }. Record tanpa id dilewati; id ganda: yang terakhir menang.
function _cloudIndex(def, list) {
  const idx = new Map();
  (list || []).forEach(r => {
    const id = def.idOf(r);
    if (id === undefined || id === null || id === '') {
      console.warn('[cloud-records] record tanpa id dilewati', r);
      return;
    }
    idx.set(String(id), { rec: r, json: JSON.stringify(r) });
  });
  return idx;
}

// Urutan tampil: terbaru di atas bila ada createdAt (sama seperti unshift di app).
function _cloudSortNewestFirst(list) {
  return list
    .map((r, i) => ({ r, i }))
    .sort((a, b) => {
      const ca = (a.r && a.r.createdAt) || '', cb = (b.r && b.r.createdAt) || '';
      if (ca === cb) return a.i - b.i;
      return ca < cb ? 1 : -1;
    })
    .map(x => x.r);
}

function cloudResetRecordsState() {
  Object.values(CLOUD_RECORD_KINDS).forEach(def => def.set([]));
  _cloudReadyFor = null;
}

function _cloudLoadFromCache(cid) {
  Object.entries(CLOUD_RECORD_KINDS).forEach(([kind, def]) => def.set(_cloudReadCache(cid, kind)));
  _cloudReadyFor = null; // belum aman menulis ke cloud: data lokal bisa lebih lama dari cloud
}

async function cloudLoadRecords() {
  if (!currentCompany) return false;
  const cid = currentCompany.id;
  _cloudReadyFor = null;

  const rows = [];
  try {
    for (let from = 0; ; from += CLOUD_REC_PAGE) {
      const { data, error } = await DB.table('company_records')
        .select('kind,rec_id,data')
        .eq('company_id', cid)
        .order('kind').order('rec_id')
        .range(from, from + CLOUD_REC_PAGE - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < CLOUD_REC_PAGE) break;
    }
  } catch (e) {
    console.warn('[cloud-records] gagal memuat:', e);
    _cloudLoadFromCache(cid);
    if (!_cloudTableWarned) {
      _cloudTableWarned = true;
      showAlert('⚠️ Data invoice/kontak/aset/produk/jurnal berulang/anggaran belum bisa dimuat dari cloud. Pastikan migrasi SQL <b>001_company_records</b> sudah dijalankan di Supabase. Sementara ini data dibaca dari cache perangkat.');
    }
    return false;
  }
  if (!currentCompany || currentCompany.id !== cid) return false; // user sudah pindah bisnis

  const byKind = {};
  rows.forEach(r => { (byKind[r.kind] = byKind[r.kind] || []).push(r.data); });

  _cloudSnap[cid] = {};
  Object.entries(CLOUD_RECORD_KINDS).forEach(([kind, def]) => {
    const list = _cloudSortNewestFirst(byKind[kind] || []);
    def.set(list);
    const snap = {};
    _cloudIndex(def, list).forEach((v, id) => { snap[id] = v.json; });
    _cloudSnap[cid][kind] = snap;
  });
  _cloudReadyFor = cid;

  // Cloud kosong: mungkin bisnis baru, atau data lama masih di perangkat ini.
  if (!rows.length) await cloudOfferLocalMigration(cid);
  else {
    localStorage.setItem('oas_rec_seen_' + cid, '1');
    Object.keys(CLOUD_RECORD_KINDS).forEach(k => _cloudCacheLocal(cid, k, CLOUD_RECORD_KINDS[k].get()));
    // Kind legacyOnce yang sudah punya record di cloud dianggap beres; sisanya
    // mungkin masih punya data lama di perangkat ini.
    _cloudPendingOnce(cid).forEach(k => { if (byKind[k] && byKind[k].length) localStorage.setItem(_cloudSeenKey(cid, k), '1'); });
    if (_cloudPendingOnce(cid).length) await cloudOfferLocalMigration(cid);
  }
  return true;
}

// Cari data lokal yang belum ada di cloud, lalu tawarkan untuk mengunggahnya.
// Sumber: (1) cache bisnis ini dari sesi saat cloud gagal, (2) key global lama.
// Data lama global hanya boleh dipindah ke SATU bisnis, supaya tidak
// tercampur ke bisnis lain.
async function cloudOfferLocalMigration(cid) {
  const found = {};
  let usedLegacy = false;
  const onceKinds = []; // kind legacyOnce yang datanya ikut diunggah
  // Data lama (key global / payload lokal) hanya ditawarkan kalau bisnis ini belum
  // pernah punya data di cloud dan data global belum dipindah ke bisnis lain.
  // Tanpa ini, record yang sengaja dihapus bisa muncul lagi dari data lama.
  const legacyOk = !localStorage.getItem('oas_rec_legacy_claimed') && !localStorage.getItem('oas_rec_seen_' + cid);

  Object.entries(CLOUD_RECORD_KINDS).forEach(([kind, def]) => {
    const cached = _cloudReadCache(cid, kind);
    if (cached.length) { found[kind] = cached; return; }
    if (def.legacyKey && _cloudLegacyAllowed(cid, kind, def, legacyOk)) {
      try {
        const arr = JSON.parse(localStorage.getItem(def.legacyKey) || '[]');
        if (Array.isArray(arr) && arr.length) {
          found[kind] = arr;
          if (def.legacyOnce) onceKinds.push(kind); else usedLegacy = true;
        }
      } catch (e) {}
    }
  });
  if (!found.produk && legacyOk) {
    try {
      const raw = localStorage.getItem('oas_data_v2_' + cid);
      const p = raw && JSON.parse(raw).produkList;
      if (Array.isArray(p) && p.length) found.produk = p;
    } catch (e) {}
  }
  if (!Object.keys(found).length) {
    // Tidak ada yang perlu dipindah: tandai selesai agar data lama tidak muncul lagi nanti.
    _cloudPendingOnce(cid).forEach(k => localStorage.setItem(_cloudSeenKey(cid, k), '1'));
    return;
  }

  if (typeof hideOpSpinner === 'function') hideOpSpinner(); // spinner jangan menutupi dialog
  const label = { invoice: 'Invoice', kontak: 'Kontak', aset_tetap: 'Aset tetap', produk: 'Produk', jurnal_berulang: 'Jurnal berulang', anggaran: 'Anggaran' };
  const ok = await showCustomConfirmGeneral({
    icon: '☁️', iconColor: 'rgba(34,211,238,0.12)', iconBorder: 'rgba(34,211,238,0.3)',
    title: 'Unggah Data Lokal ke Cloud?',
    subtitle: 'Ditemukan data di perangkat ini yang belum ada di cloud.',
    rows: [
      ...Object.entries(found).map(([k, arr]) => ({ label: label[k], value: arr.length + ' data' })),
      { label: 'Tujuan', value: 'Bisnis "' + currentCompany.name + '"' }
    ],
    warning: null,
    btnLabel: '☁️ Ya, Unggah',
    btnGradient: 'linear-gradient(135deg,#22d3ee,#4ade80)'
  });
  if (!ok || !currentCompany || currentCompany.id !== cid) return; // batal: data lokal tidak disentuh

  Object.entries(found).forEach(([kind, arr]) => CLOUD_RECORD_KINDS[kind].set(arr));
  const synced = await cloudSyncRecords();
  if (synced) {
    if (usedLegacy) localStorage.setItem('oas_rec_legacy_claimed', cid);
    onceKinds.forEach(k => localStorage.setItem('oas_rec_legacy_claimed_' + k, cid));
    _cloudPendingOnce(cid).forEach(k => localStorage.setItem(_cloudSeenKey(cid, k), '1'));
    localStorage.setItem('oas_rec_seen_' + cid, '1');
    showAlert('✓ Data lokal berhasil diunggah ke cloud.');
  } else {
    showAlert('⚠️ Sebagian data belum terunggah ke cloud. Data tetap aman di perangkat; akan dicoba lagi saat menyimpan berikutnya.');
  }
}

// Sinkron ke cloud. kinds = array nama kind; kosong = semua. Mengembalikan Promise<boolean>.
function cloudSyncRecords(kinds) {
  if (!currentCompany) return Promise.resolve(true); // mode tamu: pakai localStorage lama
  const cid = currentCompany.id;
  const ks = (kinds && kinds.length) ? kinds : Object.keys(CLOUD_RECORD_KINDS);
  ks.forEach(k => { if (CLOUD_RECORD_KINDS[k]) _cloudCacheLocal(cid, k, CLOUD_RECORD_KINDS[k].get()); });
  _cloudQueue = _cloudQueue
    .then(() => _cloudSyncNow(cid, ks))
    .catch(e => { console.warn('[cloud-records] sync error:', e); return false; });
  return _cloudQueue;
}

async function _cloudSyncNow(cid, kinds) {
  // Jangan tulis kalau user sudah pindah bisnis, atau data cloud belum dimuat
  // (data lokal bisa lebih lama dari cloud dan akan menimpanya).
  if (!currentCompany || currentCompany.id !== cid || _cloudReadyFor !== cid) return false;

  const snapAll = _cloudSnap[cid] || (_cloudSnap[cid] = {});
  const now = new Date().toISOString();
  let allOk = true;

  for (const kind of kinds) {
    const def = CLOUD_RECORD_KINDS[kind];
    if (!def) continue;
    const prev = snapAll[kind] || (snapAll[kind] = {});
    const cur = _cloudIndex(def, def.get());

    const toUpsert = [];
    cur.forEach((v, id) => { if (prev[id] !== v.json) toUpsert.push(id); });
    const toDelete = Object.keys(prev).filter(id => !cur.has(id));

    for (let i = 0; i < toUpsert.length; i += CLOUD_REC_CHUNK) {
      const part = toUpsert.slice(i, i + CLOUD_REC_CHUNK);
      const rows = part.map(id => ({
        company_id: cid, kind, rec_id: id, data: cur.get(id).rec, updated_at: now
      }));
      const { error } = await DB.table('company_records').upsert(rows, { onConflict: 'company_id,kind,rec_id' });
      if (error) { console.warn('[cloud-records] upsert gagal:', kind, error); allOk = false; break; }
      part.forEach(id => { prev[id] = cur.get(id).json; });
    }

    for (let i = 0; i < toDelete.length; i += CLOUD_REC_CHUNK) {
      const part = toDelete.slice(i, i + CLOUD_REC_CHUNK);
      const { error } = await DB.table('company_records')
        .delete().eq('company_id', cid).eq('kind', kind).in('rec_id', part);
      if (error) { console.warn('[cloud-records] delete gagal:', kind, error); allOk = false; break; }
      part.forEach(id => { delete prev[id]; });
    }
  }
  return allOk;
}
