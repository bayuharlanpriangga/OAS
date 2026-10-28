// ═══════════════════════════════════════════════════════════
// CLOUD RECORDS — sinkron invoice, bill, kontak, aset tetap, produk, jurnal berulang,
// anggaran, alert notifikasi, kurs, dan counter penomoran ke Supabase (tabel company_records), terpisah per bisnis.
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

// Nilai awal sama dengan kursData di 01-state.js.
function _cloudKursDefault() { return { USD:1, IDR:16200, SGD:12100, EUR:18300, MYR:3500, JPY:107, updatedAt:null }; }
function _cloudKursFromList(list) {
  const r = Array.isArray(list) && list[0];
  if (!r || typeof r !== 'object') return _cloudKursDefault();
  const { id, ...rest } = r;
  return rest;
}
// Data lama hanya dianggap ada kalau kurs pernah disimpan user (updatedAt terisi).
function _cloudKursLegacy(raw) {
  return (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.updatedAt) ? [{ id: 'kurs', ...raw }] : [];
}

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
  alert:           { get: () => notifAlerts,        set: v => { notifAlerts = v; },        idOf: r => r && r.id, legacyKey: 'oas_alerts',   legacyOnce: true },
  // kurs: kursData adalah SATU objek ({USD:1, IDR:..., updatedAt}), bukan array.
  // Disimpan sebagai satu record ber-id 'kurs', hanya kalau pernah disimpan user
  // (updatedAt terisi). Tanpa record = default, dan default tidak ikut ditulis ke cloud.
  kurs:            { get: () => (kursData && kursData.updatedAt ? [{ id: 'kurs', ...kursData }] : []), set: v => { kursData = _cloudKursFromList(v); },
                     idOf: r => r && r.id, legacyKey: 'oas_kurs', legacyOnce: true, fromLegacy: _cloudKursLegacy },
  // bill: tagihan pembelian dari supplier (task 4.1). State-nya (billList) ada di 28-bill.js.
  // Belum ada data lama di key global, jadi tidak ada migrasi.
  bill:            { get: () => billList,           set: v => { billList = v; },           idOf: r => r && r.id, legacyKey: null },
  // counter: nomor tertinggi yang pernah dipakai per jenis+tahun ({ id:'INV-2026', terakhir:7 }).
  // State-nya (counterList) dan logikanya ada di 23-penomoran.js.
  counter:         { get: () => counterList,        set: v => { counterList = v; },        idOf: r => r && r.id, legacyKey: 'oas_counter', legacyOnce: true,
                     // Counter hanya boleh naik: saat bentrok dengan versi cloud, ambil yang lebih tinggi.
                     mergeRec: (c, l) => (c && l && c.terakhir > l.terakhir) ? c : l },
};

const CLOUD_REC_PAGE  = 1000; // batas default Supabase per request
const CLOUD_REC_CHUNK = 200;  // jumlah baris per upsert/delete

let _cloudSnap = {};          // companyId -> kind -> { recId: json terakhir yang tersinkron }
let _cloudQueue = Promise.resolve(true);
let _cloudReadyFor = null;    // companyId yang sudah selesai dimuat dari cloud
let _cloudTableWarned = false;

// Viewer hanya baca (task 3.5): tidak menulis ke cloud maupun cache, dan perubahan lokal lama
// (mis. dari sebelum perannya diturunkan) tidak diterapkan lagi di atas data cloud.
function _cloudReadOnly() { return typeof isReadOnly === 'function' && isReadOnly(); }

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

// ── Pengaman perubahan yang belum tersinkron ───────────────
// Cache lokal (oas_rec_<kind>_<cid>) ditulis setiap ada perubahan, tapi cloud baru
// menerimanya setelah sync sukses. Kalau halaman dimuat ulang sebelum itu (mis. saat
// offline), memuat dari cloud dulu menimpa cache dan perubahan hilang.
// Solusinya: tiap kali cloud terkonfirmasi (selesai dimuat / sync sukses) kita simpan
// hash per record di oas_rec_snaph_<cid>. Saat memuat, record di cache yang hash-nya
// beda (baru/berubah) atau yang ada di snapshot tapi tak ada di cache (dihapus) dianggap
// belum tersinkron: diterapkan di atas data cloud, lalu dikirim ulang.
function _cloudHash(str) { // FNV-1a 32 bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
function _cloudSnapHashKey(cid) { return 'oas_rec_snaph_' + cid; }
function _cloudSnapHashRead(cid) {
  try { const o = JSON.parse(localStorage.getItem(_cloudSnapHashKey(cid)) || '{}'); return (o && typeof o === 'object') ? o : {}; }
  catch (e) { return {}; }
}
function _cloudSnapHashSave(cid, kind) {
  const snap = (_cloudSnap[cid] && _cloudSnap[cid][kind]) || {};
  const h = {};
  Object.keys(snap).forEach(id => { h[id] = _cloudHash(snap[id]); });
  const all = _cloudSnapHashRead(cid);
  all[kind] = h;
  try { localStorage.setItem(_cloudSnapHashKey(cid), JSON.stringify(all)); } catch (e) {}
}
// { kind: { up: { id: rec }, del: [id] } } untuk kind yang punya perubahan belum tersinkron.
function _cloudUnsynced(cid) {
  const hashes = _cloudSnapHashRead(cid), out = {};
  Object.entries(CLOUD_RECORD_KINDS).forEach(([kind, def]) => {
    const h = hashes[kind];
    if (!h) return; // belum pernah terkonfirmasi di perangkat ini: tidak bisa dibandingkan
    const cache = _cloudIndex(def, _cloudReadCache(cid, kind));
    const up = {}, del = []; let n = 0;
    cache.forEach((v, id) => { if (h[id] !== _cloudHash(v.json)) { up[id] = v.rec; n++; } });
    Object.keys(h).forEach(id => { if (!cache.has(id)) { del.push(id); n++; } });
    if (n) out[kind] = { up, del };
  });
  return out;
}
// Data cloud + perubahan lokal yang belum terkirim (lokal menang untuk id yang sama).
function _cloudApplyUnsynced(def, cloudList, u) {
  const map = new Map();
  _cloudIndex(def, cloudList).forEach((v, id) => map.set(id, v.rec));
  u.del.forEach(id => map.delete(id));
  Object.keys(u.up).forEach(id => {
    map.set(id, (map.has(id) && def.mergeRec) ? def.mergeRec(map.get(id), u.up[id]) : u.up[id]);
  });
  return _cloudSortNewestFirst(Array.from(map.values()));
}

// Request yang menggantung (koneksi putus tanpa error) jangan memblokir antrean sync.
let CLOUD_REQ_TIMEOUT = 20000; // let: tes memperpendek
function _cloudWithTimeout(p) {
  return new Promise(resolve => {
    const t = setTimeout(() => resolve({ error: new Error('timeout') }), CLOUD_REQ_TIMEOUT);
    Promise.resolve(p).then(r => { clearTimeout(t); resolve(r); }, e => { clearTimeout(t); resolve({ error: e }); });
  });
}

// Beri tahu user (sekali per rentetan gagal) kalau perubahan belum sampai ke cloud.
let _cloudSyncErr = false, _cloudFailNotified = false;
function _cloudAfterSync(ok) {
  if (_cloudSyncErr) {
    if (!_cloudFailNotified) {
      _cloudFailNotified = true;
      if (typeof showAlert === 'function') showAlert('⚠️ Perubahan belum tersimpan ke cloud (koneksi bermasalah). Data aman di perangkat ini dan dikirim otomatis saat aplikasi dibuka lagi dengan koneksi, atau saat kamu menyimpan berikutnya.');
    }
  } else if (ok) _cloudFailNotified = false;
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

// Hapus SEMUA record dari kind yang dipilih (dipakai Reset Data, task 1.5).
// Urutan per kind: hapus di cloud dulu; state, snapshot, dan cache lokal baru
// dikosongkan kalau cloud berhasil. Jadi kalau jaringan putus, data tidak tampak
// hilang padahal masih ada di cloud. Antre di _cloudQueue supaya sync yang sedang
// jalan tidak menulis ulang record yang baru dihapus.
// Mode tamu: kosongkan state + key localStorage lama saja.
// Mengembalikan Promise<string[]> berisi kind yang GAGAL dihapus (kosong = semua sukses).
function cloudDeleteRecords(kinds) {
  const ks = (kinds || []).filter(k => CLOUD_RECORD_KINDS[k]);
  if (!ks.length) return Promise.resolve([]);
  if (_cloudReadOnly()) return Promise.resolve(ks); // viewer: semua dianggap gagal dihapus
  const clearLocal = (cid, kind) => {
    const def = CLOUD_RECORD_KINDS[kind];
    def.set([]);
    if (!cid) { if (def.legacyKey) { try { localStorage.removeItem(def.legacyKey); } catch (e) {} } return; }
    _cloudCacheLocal(cid, kind, []);
    if (_cloudSnap[cid]) _cloudSnap[cid][kind] = {};
    _cloudSnapHashSave(cid, kind);
    // Data lama di key global jangan ditawarkan lagi sebagai "data lokal belum terunggah".
    try {
      localStorage.setItem('oas_rec_seen_' + cid, '1');
      if (def.legacyOnce) localStorage.setItem(_cloudSeenKey(cid, kind), '1');
    } catch (e) {}
  };
  if (!currentCompany) { ks.forEach(k => clearLocal(null, k)); return Promise.resolve([]); }
  const cid = currentCompany.id;
  const job = _cloudQueue.then(async () => {
    const failed = [];
    for (const kind of ks) {
      if (!currentCompany || currentCompany.id !== cid) { failed.push(kind); continue; }
      const { error } = await _cloudWithTimeout(DB.table('company_records').delete().eq('company_id', cid).eq('kind', kind));
      if (error) { console.warn('[cloud-records] hapus semua gagal:', kind, error); failed.push(kind); continue; }
      clearLocal(cid, kind);
    }
    return failed;
  }).catch(e => { console.warn('[cloud-records] reset error:', e); return ks; });
  _cloudQueue = job.then(() => true); // antrean sync berikutnya tetap jalan apa pun hasilnya
  return job;
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
      showAlert('⚠️ Data invoice/kontak/aset/produk/jurnal berulang/anggaran/alert/kurs/penomoran belum bisa dimuat dari cloud. Pastikan migrasi SQL <b>001_company_records</b> sudah dijalankan di Supabase. Sementara ini data dibaca dari cache perangkat.');
    }
    return false;
  }
  if (!currentCompany || currentCompany.id !== cid) return false; // user sudah pindah bisnis

  const byKind = {};
  rows.forEach(r => { (byKind[r.kind] = byKind[r.kind] || []).push(r.data); });
  // Hitung SEBELUM cache ditimpa data cloud di bawah.
  const unsynced = _cloudReadOnly() ? {} : _cloudUnsynced(cid);

  _cloudSnap[cid] = {};
  Object.entries(CLOUD_RECORD_KINDS).forEach(([kind, def]) => {
    const list = _cloudSortNewestFirst(byKind[kind] || []);
    const snap = {};
    _cloudIndex(def, list).forEach((v, id) => { snap[id] = v.json; });
    _cloudSnap[cid][kind] = snap; // snapshot = isi cloud; selisih dengan state akan dikirim ulang
    def.set(unsynced[kind] ? _cloudApplyUnsynced(def, list, unsynced[kind]) : list);
    _cloudSnapHashSave(cid, kind);
  });
  _cloudReadyFor = cid;

  // Selesaikan bentrok nomor invoice bila ada transaksi offline bersamaan yang memakai nomor kembar
  if (typeof periksaDanSelesaikanBentrokInvoice === 'function') {
    await periksaDanSelesaikanBentrokInvoice();
  }

  // Cloud kosong: mungkin bisnis baru, atau data lama masih di perangkat ini.
  const bolehTulis = !_cloudReadOnly();
  if (!rows.length) { if (bolehTulis) await cloudOfferLocalMigration(cid); }
  else {
    localStorage.setItem('oas_rec_seen_' + cid, '1');
    Object.keys(CLOUD_RECORD_KINDS).forEach(k => _cloudCacheLocal(cid, k, CLOUD_RECORD_KINDS[k].get()));
    // Kind legacyOnce yang sudah punya record di cloud dianggap beres; sisanya
    // mungkin masih punya data lama di perangkat ini.
    _cloudPendingOnce(cid).forEach(k => { if (byKind[k] && byKind[k].length) localStorage.setItem(_cloudSeenKey(cid, k), '1'); });
    if (bolehTulis && _cloudPendingOnce(cid).length) await cloudOfferLocalMigration(cid);
    // Perubahan dari sesi sebelumnya yang belum sempat terkirim (offline / halaman ditutup).
    const kU = Object.keys(unsynced);
    if (kU.length) {
      const n = kU.reduce((a, k) => a + Object.keys(unsynced[k].up).length + unsynced[k].del.length, 0);
      const okU = await cloudSyncRecords(kU);
      if (okU && typeof showAlert === 'function') showAlert('✓ ' + n + ' perubahan dari sesi sebelumnya yang belum tersinkron sudah dikirim ke cloud.');
    }
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
  // Data lama di key global itu milik user sendiri: hanya boleh dipindah ke bisnis MILIKNYA.
  // Di bisnis tempat dia menjadi anggota, data pribadi tidak ditawarkan (task 3.4).
  const pemilik = typeof adalahPemilikBisnis !== 'function'
    || adalahPemilikBisnis(currentCompany, typeof currentUser !== 'undefined' && currentUser ? currentUser.id : null);
  const legacyOk = pemilik && !localStorage.getItem('oas_rec_legacy_claimed') && !localStorage.getItem('oas_rec_seen_' + cid);

  Object.entries(CLOUD_RECORD_KINDS).forEach(([kind, def]) => {
    const cached = _cloudReadCache(cid, kind);
    if (cached.length) {
      // Cache bisnis ini baru saja ditulis dari data cloud, jadi sebagian besar identik dengan
      // cloud. Tawarkan hanya yang baru/berbeda dari snapshot cloud; kalau tidak, dialog
      // "unggah data lokal" muncul untuk data yang sebenarnya sudah ada di cloud.
      const snap = (_cloudSnap[cid] && _cloudSnap[cid][kind]) || {};
      const fresh = cached.filter(r => { const id = def.idOf(r); return id == null || snap[String(id)] !== JSON.stringify(r); });
      if (fresh.length) found[kind] = fresh;
      return;
    }
    if (def.legacyKey && pemilik && _cloudLegacyAllowed(cid, kind, def, legacyOk)) {
      try {
        let arr = JSON.parse(localStorage.getItem(def.legacyKey) || '[]');
        if (def.fromLegacy) arr = def.fromLegacy(arr);
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
  const label = { invoice: 'Invoice', kontak: 'Kontak', aset_tetap: 'Aset tetap', produk: 'Produk', jurnal_berulang: 'Jurnal berulang', anggaran: 'Anggaran', alert: 'Alert notifikasi', kurs: 'Kurs', counter: 'Penomoran dokumen' };
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
  if (_cloudReadOnly()) return Promise.resolve(true); // viewer: tidak ada yang ditulis (ke cloud maupun cache)
  const cid = currentCompany.id;
  const ks = (kinds && kinds.length) ? kinds : Object.keys(CLOUD_RECORD_KINDS);
  ks.forEach(k => { if (CLOUD_RECORD_KINDS[k]) _cloudCacheLocal(cid, k, CLOUD_RECORD_KINDS[k].get()); });
  _cloudQueue = _cloudQueue
    .then(() => _cloudSyncNow(cid, ks))
    .catch(e => { console.warn('[cloud-records] sync error:', e); _cloudSyncErr = true; return false; })
    .then(ok => { _cloudAfterSync(ok); return ok; });
  return _cloudQueue;
}

async function _cloudSyncNow(cid, kinds) {
  // Jangan tulis kalau user sudah pindah bisnis, atau data cloud belum dimuat
  // (data lokal bisa lebih lama dari cloud dan akan menimpanya).
  if (!currentCompany || currentCompany.id !== cid || _cloudReadyFor !== cid) return false;
  if (_cloudReadOnly()) return true; // jaga-jaga: antrean lama saat peran berubah

  const snapAll = _cloudSnap[cid] || (_cloudSnap[cid] = {});
  const now = new Date().toISOString();
  let allOk = true;
  _cloudSyncErr = false;

  for (const kind of kinds) {
    const def = CLOUD_RECORD_KINDS[kind];
    if (!def) continue;
    const prev = snapAll[kind] || (snapAll[kind] = {});
    const cur = _cloudIndex(def, def.get());

    const toUpsert = [];
    cur.forEach((v, id) => { if (prev[id] !== v.json) toUpsert.push(id); });
    const toDelete = Object.keys(prev).filter(id => !cur.has(id));
    let changed = false;

    for (let i = 0; i < toUpsert.length; i += CLOUD_REC_CHUNK) {
      const part = toUpsert.slice(i, i + CLOUD_REC_CHUNK);
      const rows = part.map(id => ({
        company_id: cid, kind, rec_id: id, data: cur.get(id).rec, updated_at: now
      }));
      const { error } = await _cloudWithTimeout(DB.table('company_records').upsert(rows, { onConflict: 'company_id,kind,rec_id' }));
      if (error) { console.warn('[cloud-records] upsert gagal:', kind, error); allOk = false; _cloudSyncErr = true; break; }
      part.forEach(id => { prev[id] = cur.get(id).json; });
      changed = true;
    }

    for (let i = 0; i < toDelete.length; i += CLOUD_REC_CHUNK) {
      const part = toDelete.slice(i, i + CLOUD_REC_CHUNK);
      const { error } = await _cloudWithTimeout(DB.table('company_records')
        .delete().eq('company_id', cid).eq('kind', kind).in('rec_id', part));
      if (error) { console.warn('[cloud-records] delete gagal:', kind, error); allOk = false; _cloudSyncErr = true; break; }
      part.forEach(id => { delete prev[id]; });
      changed = true;
    }
    if (changed) _cloudSnapHashSave(cid, kind); // simpan keadaan cloud terakhir yang terkonfirmasi
  }
  return allOk;
}
