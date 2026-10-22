// Tes sinkron company_records (js/22-cloud-records.js). Jalankan: node tests/cloud-records.test.js
// Memakai DB palsu di memori + stub localStorage, tanpa browser/Supabase.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', '22-cloud-records.js'), 'utf8');
const srcBisnis = fs.readFileSync(path.join(__dirname, '..', 'js', '26-daftar-bisnis.js'), 'utf8'); // adalahPemilikBisnis

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

// peran: peran user di bisnis aktif ('owner' = bisnis milik sendiri; selain itu bisnis milik orang lain).
function makeEnv({ failLoad = false, failWrite = false, confirmAnswer = true, peran = 'owner' } = {}) {
  const net = { failLoad, failWrite, hang: false }; // bisa diubah di tengah tes untuk simulasi offline
  const store = [];            // baris company_records
  const calls = { upsert: [], delete: [] };
  const ls = {}; const localStorage = {
    getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: k => { delete ls[k]; }
  };
  const table = () => {
    const q = { f: [], op: 'select', rows: null, inIds: null };
    const b = {
      select() { return b; }, order() { return b; },
      eq(k, v) { q.f.push([k, v]); return b; },
      in(k, v) { q.inIds = v; return b; },
      range(a, z) { q.range = [a, z]; return b; },
      upsert(rows) { q.op = 'upsert'; q.rows = rows; return b; },
      delete() { q.op = 'delete'; return b; },
      then(res) {
        const match = r => q.f.every(([k, v]) => r[k] === v) && (!q.inIds || q.inIds.includes(r.rec_id));
        if (q.op === 'select') {
          if (net.failLoad) return res({ data: null, error: new Error('relation does not exist') });
          let rows = store.filter(match); if (q.range) rows = rows.slice(q.range[0], q.range[1] + 1);
          return res({ data: rows, error: null });
        }
        if (net.hang) return; // koneksi menggantung: tidak pernah selesai
        if (net.failWrite) return res({ data: null, error: new Error('boom') });
        if (q.op === 'upsert') {
          calls.upsert.push(q.rows.map(r => r.rec_id));
          q.rows.forEach(r => { const i = store.findIndex(x => x.company_id === r.company_id && x.kind === r.kind && x.rec_id === r.rec_id); if (i >= 0) store[i] = r; else store.push(r); });
        } else {
          calls.delete.push(q.inIds);
          for (let i = store.length - 1; i >= 0; i--) if (match(store[i])) store.splice(i, 1);
        }
        return res({ data: null, error: null });
      }
    };
    return b;
  };
  const alerts = [], confirms = [];
  const ctx = {
    console, localStorage, DB: { table }, setTimeout, clearTimeout,
    showAlert: m => alerts.push(m), showCustomConfirmGeneral: async o => { confirms.push(o); return confirmAnswer; },
    hideOpSpinner() {}, currentUser: { id: 'u-me' },
    currentCompany: { id: 'c1', name: 'Toko A', user_id: peran === 'owner' ? 'u-me' : 'u-lain', _role: peran },
  };
  vm.createContext(ctx);
  // list global di 01-state.js adalah `let`; di sini disediakan lewat script yang sama
  vm.runInContext('let invoiceList=[],kontakList=[],asetTetapList=[],produkList=[],jurnalBerulangList=[],anggaranList=[],notifAlerts=[],counterList=[],kursData={USD:1,IDR:16200,SGD:12100,EUR:18300,MYR:3500,JPY:107,updatedAt:null};', ctx);
  vm.runInContext(srcBisnis, ctx);
  ctx.isReadOnly = () => vm.runInContext('bisnisHanyaBaca', ctx)(ctx.currentCompany, ctx.currentUser.id, null); // sama dengan isReadOnly() di 18
  vm.runInContext(src, ctx);
  const run = code => vm.runInContext(code, ctx);
  return { ctx, run, store, calls, ls, alerts, net, confirms };
}

(async () => {
  console.log('[1] muat & sync diff');
  {
    const e = makeEnv();
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'INV_1', data: { id: 'INV_1', createdAt: '2026-01-01' } });
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'INV_2', data: { id: 'INV_2', createdAt: '2026-02-01' } });
    e.store.push({ company_id: 'c2', kind: 'invoice', rec_id: 'INV_X', data: { id: 'INV_X' } });
    await e.run('cloudLoadRecords()');
    ok(e.run('invoiceList.length') === 2, 'hanya record bisnis aktif yang dimuat (c2 tidak bocor)');
    ok(e.run('invoiceList[0].id') === 'INV_2', 'urutan terbaru di atas');
    e.run("invoiceList.push({id:'INV_3'}); kontakList.push({id:'KTK_1'}); produkList.push({ksId:'ks9',hargaJual:5})");
    await e.run('cloudSyncRecords()');
    ok(e.calls.upsert.flat().sort().join() === 'INV_3,KTK_1,ks9', 'hanya record baru yang di-upsert, bukan semua');
    e.calls.upsert.length = 0;
    await e.run('cloudSyncRecords()');
    ok(e.calls.upsert.length === 0 && e.calls.delete.length === 0, 'tanpa perubahan = tanpa tulis ke cloud');
    e.run("invoiceList[0].total = 99; invoiceList = invoiceList.filter(i => i.id !== 'INV_1')");
    await e.run('cloudSyncRecords()');
    ok(e.calls.upsert.flat().join() === 'INV_2', 'record yang diubah di-upsert');
    ok(e.calls.delete.flat().join() === 'INV_1', 'record yang dihapus di app ikut terhapus di cloud');
    ok(e.store.filter(r => r.company_id === 'c2').length === 1, 'data bisnis lain tidak tersentuh');
    ok(!!e.ls['oas_rec_invoice_c1'], 'cache lokal per bisnis ditulis');
  }

  console.log('[2] pengaman');
  {
    const e = makeEnv({ failLoad: true });
    e.ls['oas_rec_invoice_c1'] = JSON.stringify([{ id: 'INV_A' }]);
    const loaded = await e.run('cloudLoadRecords()');
    ok(loaded === false && e.run('invoiceList.length') === 1, 'cloud gagal dimuat -> pakai cache bisnis, tidak kosong');
    e.run("invoiceList.push({id:'INV_B'})");
    const synced = await e.run('cloudSyncRecords()');
    ok(synced === false && e.store.length === 0, 'cloud belum termuat -> tidak menimpa cloud dengan data lokal');
    ok(e.alerts.length === 1, 'user diberi tahu (sekali) untuk menjalankan migrasi SQL');
  }
  {
    const e = makeEnv({ failWrite: true });
    await e.run('cloudLoadRecords()');
    e.run("invoiceList.push({id:'INV_A'})");
    ok((await e.run('cloudSyncRecords()')) === false, 'gagal tulis dilaporkan false (indikator error muncul)');
    ok(!!e.ls['oas_rec_invoice_c1'], 'data tetap ada di cache saat cloud gagal');
  }

  console.log('[3] migrasi data lokal');
  {
    const e = makeEnv();
    e.ls['oas_invoices'] = JSON.stringify([{ id: 'INV_old' }]);
    e.ls['oas_kontak'] = JSON.stringify([{ id: 'KTK_old' }]);
    await e.run('cloudLoadRecords()');
    ok(e.store.map(r => r.rec_id).sort().join() === 'INV_old,KTK_old', 'data global lama diunggah ke bisnis setelah dikonfirmasi');
    ok(e.ls['oas_rec_legacy_claimed'] === 'c1', 'data lama ditandai sudah dipindah ke satu bisnis');
    e.run("currentCompany = { id: 'c2', name: 'Toko B' }");
    await e.run('cloudResetRecordsState(); cloudLoadRecords()');
    ok(!e.store.some(r => r.company_id === 'c2'), 'bisnis kedua tidak ditawari data lama yang sama');
  }
  {
    const e = makeEnv({ confirmAnswer: false });
    e.ls['oas_invoices'] = JSON.stringify([{ id: 'INV_old' }]);
    await e.run('cloudLoadRecords()');
    ok(e.store.length === 0 && e.ls['oas_invoices'] !== undefined, 'dibatalkan -> tidak ada yang diunggah, data lama utuh');
  }
  {
    const e = makeEnv();
    e.ls['oas_invoices'] = JSON.stringify([{ id: 'INV_old' }]);
    await e.run('cloudLoadRecords()');
    e.run('invoiceList = []');
    await e.run('cloudSyncRecords()');
    await e.run('cloudResetRecordsState(); cloudLoadRecords()');
    ok(e.run('invoiceList.length') === 0, 'invoice yang sudah dihapus tidak hidup lagi dari data lama');
  }

  console.log('[4] jurnal berulang & anggaran');
  {
    const e = makeEnv();
    e.store.push({ company_id: 'c1', kind: 'jurnal_berulang', rec_id: 'jb_1', data: { id: 'jb_1', createdAt: '2026-01-01' } });
    e.store.push({ company_id: 'c1', kind: 'jurnal_berulang', rec_id: 'jb_2', data: { id: 'jb_2', createdAt: '2026-02-01' } });
    e.store.push({ company_id: 'c1', kind: 'anggaran', rec_id: 'ang_1', data: { id: 'ang_1', akunKode: '6201', periode: '2026-10', nominal: 5 } });
    e.store.push({ company_id: 'c2', kind: 'anggaran', rec_id: 'ang_X', data: { id: 'ang_X' } });
    await e.run('cloudLoadRecords()');
    ok(e.run('jurnalBerulangList.length') === 2 && e.run('anggaranList.length') === 1, 'jurnal berulang & anggaran dimuat per bisnis (c2 tidak bocor)');
    ok(e.run('jurnalBerulangList[0].id') === 'jb_2', 'jurnal berulang: terbaru di atas');
    e.run("jurnalBerulangList.unshift({id:'jb_3',createdAt:'2026-03-01'}); anggaranList[0].nominal = 9");
    await e.run("cloudSyncRecords(['jurnal_berulang','anggaran'])");
    ok(e.calls.upsert.flat().sort().join() === 'ang_1,jb_3', 'hanya yang baru/berubah di-upsert');
    e.run("anggaranList = []; jurnalBerulangList = jurnalBerulangList.filter(j => j.id !== 'jb_1')");
    await e.run("cloudSyncRecords(['jurnal_berulang','anggaran'])");
    ok(e.calls.delete.flat().sort().join() === 'ang_1,jb_1', 'hapus di app ikut terhapus di cloud');
    ok(e.store.some(r => r.company_id === 'c2' && r.rec_id === 'ang_X'), 'data bisnis lain tidak tersentuh');
    ok(!!e.ls['oas_rec_anggaran_c1'] && !!e.ls['oas_rec_jurnal_berulang_c1'], 'cache lokal per bisnis ditulis');
    ok(e.run("cloudResetRecordsState(), jurnalBerulangList.length + anggaranList.length") === 0, 'reset state ikut mengosongkan kedua list');
  }
  {
    // cloud kosong + data lama di key global -> diunggah setelah konfirmasi
    const e = makeEnv();
    e.ls['oas_jb'] = JSON.stringify([{ id: 'jb_old' }]);
    e.ls['oas_anggaran'] = JSON.stringify([{ id: 'ang_old' }]);
    await e.run('cloudLoadRecords()');
    ok(e.store.map(r => r.rec_id).sort().join() === 'ang_old,jb_old', 'data lama jurnal berulang & anggaran ikut dimigrasi');
  }
  {
    // bisnis sudah punya invoice di cloud (sinkron lama), data lama jb/anggaran masih lokal
    const e = makeEnv();
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'INV_1', data: { id: 'INV_1' } });
    e.ls['oas_rec_seen_c1'] = '1';
    e.ls['oas_jb'] = JSON.stringify([{ id: 'jb_old' }]);
    await e.run('cloudLoadRecords()');
    ok(e.store.some(r => r.kind === 'jurnal_berulang' && r.rec_id === 'jb_old'), 'bisnis lama yang sudah sinkron tetap ditawari data lama kind baru');
    ok(e.run('jurnalBerulangList.length') === 1, 'data lama tidak "hilang" dari tampilan');
    e.run('jurnalBerulangList = []');
    await e.run('cloudSyncRecords()');
    await e.run('cloudResetRecordsState(); cloudLoadRecords()');
    ok(e.run('jurnalBerulangList.length') === 0, 'yang sudah dihapus tidak hidup lagi dari data lama');
  }
  {
    // tidak ada data lama -> ditandai selesai, data lama yang muncul belakangan tidak dimigrasi
    const e = makeEnv();
    await e.run('cloudLoadRecords()');
    ok(e.ls['oas_rec_seen_c1_anggaran'] === '1', 'tanpa data lama: kind ditandai selesai');
    e.ls['oas_anggaran'] = JSON.stringify([{ id: 'ang_late' }]);
    await e.run('cloudResetRecordsState(); cloudLoadRecords()');
    ok(!e.store.some(r => r.rec_id === 'ang_late'), 'data lama yang muncul belakangan tidak dimigrasi');
  }
  {
    // data lama hanya boleh pindah ke SATU bisnis
    const e = makeEnv();
    e.ls['oas_anggaran'] = JSON.stringify([{ id: 'ang_old' }]);
    await e.run('cloudLoadRecords()');
    e.run("currentCompany = { id: 'c2', name: 'Toko B' }");
    await e.run('cloudResetRecordsState(); cloudLoadRecords()');
    ok(!e.store.some(r => r.company_id === 'c2'), 'bisnis kedua tidak ditawari anggaran lama yang sama');
  }
  {
    // dibatalkan -> tidak ada yang diunggah, data lama utuh
    const e = makeEnv({ confirmAnswer: false });
    e.ls['oas_jb'] = JSON.stringify([{ id: 'jb_old' }]);
    await e.run('cloudLoadRecords()');
    ok(e.store.length === 0 && !!e.ls['oas_jb'], 'dibatalkan: tidak ada yang diunggah, data lama utuh');
  }

  console.log('[5] alert & kurs');
  {
    const e = makeEnv();
    e.store.push({ company_id: 'c1', kind: 'alert', rec_id: 'alert_1', data: { id: 'alert_1', nama: 'Kas', createdAt: '2026-01-01' } });
    e.store.push({ company_id: 'c2', kind: 'alert', rec_id: 'alert_X', data: { id: 'alert_X' } });
    e.store.push({ company_id: 'c1', kind: 'kurs', rec_id: 'kurs', data: { id: 'kurs', USD: 1, IDR: 15000, updatedAt: '2026-10-01' } });
    await e.run('cloudLoadRecords()');
    ok(e.run('notifAlerts.length') === 1, 'alert dimuat per bisnis (c2 tidak bocor)');
    ok(e.run('kursData.IDR') === 15000 && e.run("'id' in kursData") === false, 'kurs dimuat sebagai objek, tanpa field id');
    e.run("notifAlerts.push({id:'alert_2'}); kursData.IDR = 15500");
    await e.run("cloudSyncRecords(['alert','kurs'])");
    ok(e.calls.upsert.flat().sort().join() === 'alert_2,kurs', 'alert baru dan kurs yang berubah di-upsert');
    e.calls.upsert.length = 0;
    await e.run("cloudSyncRecords(['alert','kurs'])");
    ok(e.calls.upsert.length === 0, 'kurs tidak berubah = tanpa tulis');
    ok(e.store.find(r => r.kind === 'kurs').data.IDR === 15500, 'nilai kurs terbaru tersimpan di cloud');
    e.run("notifAlerts = notifAlerts.filter(a => a.id !== 'alert_1')");
    await e.run("cloudSyncRecords(['alert'])");
    ok(e.calls.delete.flat().join() === 'alert_1', 'hapus alert ikut terhapus di cloud');
    e.run('cloudResetRecordsState()');
    ok(e.run('kursData.IDR') === 16200 && e.run('kursData.updatedAt') === null && e.run('notifAlerts.length') === 0, 'reset state: kurs kembali default, alert kosong');
  }
  {
    // bisnis tanpa record kurs -> pakai default, bukan objek kosong
    const e = makeEnv();
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'INV_1', data: { id: 'INV_1' } });
    e.ls['oas_rec_seen_c1'] = '1';
    await e.run('cloudLoadRecords()');
    ok(e.run('kursData.IDR') === 16200 && e.run('kursData.USD') === 1, 'tanpa record kurs di cloud -> default dipakai');
  }
  {
    // migrasi data lama: kurs yang pernah disimpan + alert
    const e = makeEnv();
    e.ls['oas_kurs'] = JSON.stringify({ USD: 1, IDR: 14000, updatedAt: '2026-09-01' });
    e.ls['oas_alerts'] = JSON.stringify([{ id: 'alert_old' }]);
    await e.run('cloudLoadRecords()');
    ok(e.store.map(r => r.rec_id).sort().join() === 'alert_old,kurs', 'kurs & alert lama ikut dimigrasi');
    ok(e.run('kursData.IDR') === 14000, 'kurs lama tampil setelah migrasi');
  }
  {
    // kurs lama yang tidak pernah diubah user (updatedAt null) tidak perlu diunggah
    const e = makeEnv();
    e.ls['oas_kurs'] = JSON.stringify({ USD: 1, IDR: 16200, updatedAt: null });
    await e.run('cloudLoadRecords()');
    ok(e.store.length === 0, 'kurs default tidak ditawarkan untuk diunggah');
  }

  console.log('[reset] hapus semua record per kind (task 1.5)');
  const seed = e => {
    e.store.push(
      { company_id: 'c1', kind: 'invoice', rec_id: 'I1', data: { id: 'I1' } },
      { company_id: 'c1', kind: 'invoice', rec_id: 'I2', data: { id: 'I2' } },
      { company_id: 'c1', kind: 'kontak',  rec_id: 'K1', data: { id: 'K1' } },
      { company_id: 'c1', kind: 'produk',  rec_id: 'P1', data: { ksId: 'P1' } },
      { company_id: 'c1', kind: 'kurs',    rec_id: 'kurs', data: { id: 'kurs', USD: 1, IDR: 15000, updatedAt: '2026-10-01' } },
      { company_id: 'c2', kind: 'invoice', rec_id: 'X1', data: { id: 'X1' } }   // bisnis lain
    );
    e.ls['oas_rec_seen_c1'] = '1';
  };
  {
    const e = makeEnv(); seed(e);
    await e.run('cloudLoadRecords()');
    const failed = await e.run('cloudDeleteRecords(["invoice","kontak"])');
    ok(failed.length === 0, 'reset sukses: tidak ada kind gagal');
    ok(e.store.filter(r => r.company_id === 'c1').map(r => r.kind).sort().join() === 'kurs,produk', 'hanya kind terpilih terhapus di cloud');
    ok(e.store.some(r => r.company_id === 'c2' && r.rec_id === 'X1'), 'bisnis lain tidak tersentuh');
    ok(e.run('invoiceList.length') === 0 && e.run('kontakList.length') === 0 && e.run('produkList.length') === 1, 'state kind terpilih kosong, kind lain utuh');
    ok(JSON.parse(e.ls['oas_rec_invoice_c1']).length === 0, 'cache lokal kind terpilih dikosongkan');
    const before = e.calls.delete.length;
    await e.run('cloudSyncRecords()');
    ok(e.calls.delete.length === before && e.calls.upsert.length === 0, 'sync sesudah reset tidak mengirim hapus/upsert ulang (snapshot ikut bersih)');
    await e.run('cloudLoadRecords()');
    ok(e.run('invoiceList.length') === 0, 'muat ulang dari cloud: invoice tetap kosong');
  }
  {
    // kurs kembali ke default, bukan objek kosong
    const e = makeEnv(); seed(e);
    await e.run('cloudLoadRecords()');
    ok(e.run('kursData.IDR') === 15000, 'kurs tersimpan dimuat');
    await e.run('cloudDeleteRecords(["kurs"])');
    ok(e.run('kursData.IDR') === 16200 && e.run('kursData.updatedAt') === null, 'reset kurs -> default');
  }
  {
    // cloud gagal: data tetap ada di state, kind gagal dilaporkan
    const e2 = makeEnv({ failWrite: true }); seed(e2);
    await e2.run('cloudLoadRecords()');
    const failed = await e2.run('cloudDeleteRecords(["invoice","kontak"])');
    ok(failed.join() === 'invoice,kontak', 'cloud gagal: semua kind dilaporkan gagal');
    ok(e2.run('invoiceList.length') === 2 && e2.run('kontakList.length') === 1, 'cloud gagal: state tidak dikosongkan');
    ok(e2.store.filter(r => r.company_id === 'c1').length === 5, 'cloud gagal: baris di cloud tetap');
  }
  {
    // data lama di key global tidak boleh muncul lagi sebagai "data lokal belum terunggah"
    const e = makeEnv(); seed(e);
    e.ls['oas_invoices'] = JSON.stringify([{ id: 'OLD' }]);
    e.ls['oas_alerts'] = JSON.stringify([{ id: 'alert_old' }]);
    await e.run('cloudLoadRecords()');
    await e.run('cloudDeleteRecords(["invoice","alert"])');
    await e.run('cloudLoadRecords()');
    ok(!e.store.some(r => r.rec_id === 'OLD' || r.rec_id === 'alert_old'), 'data lama tidak ikut terunggah ulang setelah reset');
  }
  {
    // mode tamu: state + key localStorage lama dibersihkan
    const e = makeEnv();
    e.run('currentCompany = null');
    e.ls['oas_invoices'] = JSON.stringify([{ id: 'G1' }]);
    e.run('invoiceList = [{ id: "G1" }]');
    const failed = await e.run('cloudDeleteRecords(["invoice"])');
    ok(failed.length === 0 && e.run('invoiceList.length') === 0 && !('oas_invoices' in e.ls), 'mode tamu: state dan key lama dibersihkan');
  }
  {
    const e = makeEnv();
    ok((await e.run('cloudDeleteRecords([])')).length === 0 && (await e.run('cloudDeleteRecords(["ngawur"])')).length === 0, 'daftar kosong / kind tidak dikenal diabaikan');
    ok(e.calls.delete.length === 0, 'tidak ada panggilan hapus untuk input kosong');
  }

  console.log('[counter] kind counter penomoran (task 1.8)');
  {
    const e = makeEnv();
    e.store.push({ company_id: 'c1', kind: 'counter', rec_id: 'INV-2026', data: { id: 'INV-2026', jenis: 'INV', tahun: 2026, terakhir: 7 } });
    e.ls['oas_rec_seen_c1'] = '1';
    await e.run('cloudLoadRecords()');
    ok(e.run('counterList.length') === 1 && e.run('counterList[0].terakhir') === 7, 'counter dimuat dari cloud');
    e.run('counterList = [{ id: "INV-2026", jenis: "INV", tahun: 2026, terakhir: 9 }]');
    await e.run('cloudSyncRecords(["counter"])');
    ok(e.store.find(r => r.kind === 'counter').data.terakhir === 9, 'counter yang naik tersimpan ke cloud (upsert)');
    ok(JSON.parse(e.ls['oas_rec_counter_c1'])[0].terakhir === 9, 'cache lokal counter ikut ditulis');
    await e.run('cloudDeleteRecords(["counter"])');
    ok(!e.store.some(r => r.kind === 'counter') && e.run('counterList.length') === 0, 'reset counter menghapus di cloud dan state');
  }
  {
    // data lama (mode tamu) ikut ditawarkan sekali, seperti kind legacyOnce lain
    const e = makeEnv();
    e.ls['oas_counter'] = JSON.stringify([{ id: 'INV-2026', jenis: 'INV', tahun: 2026, terakhir: 4 }]);
    await e.run('cloudLoadRecords()');
    ok(e.store.some(r => r.kind === 'counter' && r.rec_id === 'INV-2026'), 'counter lama diunggah lewat migrasi');
  }

  console.log('[offline] perubahan yang belum tersinkron tidak hilang saat dimuat ulang (temuan uji 1.2)');
  // "Muat ulang halaman": state di memori hilang, localStorage tetap, lalu muat dari cloud lagi.
  const reload = e => e.run('invoiceList=[]; kontakList=[]; counterList=[]; _cloudSnap={}; _cloudReadyFor=null; _cloudSyncErr=false; _cloudFailNotified=false');
  const seedOnline = async () => {
    const e = makeEnv();
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'I1', data: { id: 'I1', createdAt: '2026-01-01', total: 10 } });
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'I2', data: { id: 'I2', createdAt: '2026-01-02', total: 20 } });
    await e.run('cloudLoadRecords()');
    return e;
  };
  {
    // skenario persis dari uji: invoice dibuat saat offline, lalu halaman di-refresh setelah online
    const e = await seedOnline();
    e.net.failWrite = true;
    e.run("invoiceList.unshift({ id: 'I3', createdAt: '2026-01-03', total: 30 })");
    ok((await e.run('cloudSyncRecords(["invoice"])')) === false, 'offline: sync gagal');
    ok(e.alerts.length === 1 && /belum tersimpan ke cloud/.test(e.alerts[0]), 'offline: user diberi tahu perubahan belum tersimpan');
    await e.run('cloudSyncRecords(["invoice"])');
    ok(e.alerts.length === 1, 'gagal berulang: peringatan hanya sekali');
    e.net.failWrite = false;
    reload(e); e.alerts.length = 0;
    await e.run('cloudLoadRecords()');
    ok(e.run('invoiceList.map(i => i.id).join()') === 'I3,I2,I1', 'refresh online: invoice offline TIDAK hilang');
    ok(e.store.some(r => r.kind === 'invoice' && r.rec_id === 'I3'), 'invoice offline terkirim ke cloud saat dimuat');
    ok(e.alerts.length === 1 && /1 perubahan/.test(e.alerts[0]), 'user diberi tahu 1 perubahan terkirim');
    reload(e); e.alerts.length = 0; e.calls.upsert.length = 0; e.calls.delete.length = 0;
    await e.run('cloudLoadRecords()');
    ok(e.run('invoiceList.length') === 3 && e.calls.upsert.length === 0 && e.alerts.length === 0, 'muat ulang berikutnya: tidak ada kiriman/peringatan lagi');
  }
  {
    // hapus + ubah saat offline
    const e = await seedOnline();
    e.net.failWrite = true;
    e.run("invoiceList = invoiceList.filter(i => i.id !== 'I1'); invoiceList.find(i => i.id === 'I2').total = 99");
    await e.run('cloudSyncRecords(["invoice"])');
    e.net.failWrite = false; reload(e);
    await e.run('cloudLoadRecords()');
    ok(e.run('invoiceList.map(i => i.id).join()') === 'I2' && e.run('invoiceList[0].total') === 99, 'hapus & ubah offline dipertahankan setelah refresh');
    ok(!e.store.some(r => r.rec_id === 'I1') && e.store.find(r => r.rec_id === 'I2').data.total === 99, 'cloud ikut terhapus/terubah');
  }
  {
    // aplikasi di-reload saat offline (cloud gagal dimuat), user menambah data, baru online
    const e = await seedOnline();
    e.net.failLoad = true; e.net.failWrite = true; reload(e);
    await e.run('cloudLoadRecords()');
    e.run("invoiceList.unshift({ id: 'I4', createdAt: '2026-01-04', total: 40 })");
    await e.run('cloudSyncRecords(["invoice"])'); // ditolak: cloud belum termuat, tapi cache tetap ditulis
    e.net.failLoad = false; e.net.failWrite = false; reload(e);
    await e.run('cloudLoadRecords()');
    ok(e.run('invoiceList.map(i => i.id).join()') === 'I4,I2,I1' && e.store.some(r => r.rec_id === 'I4'), 'data yang dibuat saat app dibuka offline juga selamat');
  }
  {
    // perangkat lain menambah record sementara perangkat ini menyimpan offline: dua-duanya ada
    const e = await seedOnline();
    e.net.failWrite = true;
    e.run("invoiceList.unshift({ id: 'I5', createdAt: '2026-01-05' })");
    await e.run('cloudSyncRecords(["invoice"])');
    e.net.failWrite = false;
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'I6', data: { id: 'I6', createdAt: '2026-01-06' } }); // dari perangkat lain
    reload(e);
    await e.run('cloudLoadRecords()');
    ok(['I1', 'I2', 'I5', 'I6'].every(id => e.run('invoiceList').some(i => i.id === id)), 'record perangkat lain tidak ditimpa, perubahan lokal tetap ada');
    ok(e.store.filter(r => r.kind === 'invoice').length === 4, 'cloud berisi gabungan keduanya');
  }
  {
    // counter hanya naik: nilai cloud lebih tinggi menang atas catatan lokal yang tertinggal
    const e = makeEnv();
    e.store.push({ company_id: 'c1', kind: 'counter', rec_id: 'INV-2026', data: { id: 'INV-2026', jenis: 'INV', tahun: 2026, terakhir: 3 } });
    await e.run('cloudLoadRecords()');
    e.net.failWrite = true;
    e.run('counterList = [{ id: "INV-2026", jenis: "INV", tahun: 2026, terakhir: 4 }]');
    await e.run('cloudSyncRecords(["counter"])');
    e.net.failWrite = false;
    e.store.find(r => r.kind === 'counter').data.terakhir = 9; // perangkat lain sudah sampai 9
    reload(e);
    await e.run('cloudLoadRecords()');
    ok(e.run('counterList[0].terakhir') === 9 && e.store.find(r => r.kind === 'counter').data.terakhir === 9, 'counter: nilai cloud yang lebih tinggi tidak diturunkan');
  }
  {
    // tidak ada false positive: tanpa perubahan, muat ulang berkali-kali tidak mengirim apa pun
    const e = await seedOnline();
    for (let i = 0; i < 3; i++) { reload(e); e.alerts.length = 0; e.calls.upsert.length = 0; await e.run('cloudLoadRecords()'); }
    ok(e.calls.upsert.length === 0 && e.calls.delete.length === 0 && e.alerts.length === 0, 'tanpa perubahan: tidak ada kiriman maupun peringatan');
    // dan setelah sync sukses, tidak dianggap belum tersinkron
    e.run("invoiceList.unshift({ id: 'I7', createdAt: '2026-02-01' })");
    await e.run('cloudSyncRecords(["invoice"])');
    reload(e); e.alerts.length = 0; e.calls.upsert.length = 0;
    await e.run('cloudLoadRecords()');
    ok(e.calls.upsert.length === 0 && e.alerts.length === 0 && e.run('invoiceList.length') === 3, 'sync sukses lalu refresh: bersih');
  }
  {
    // request menggantung (koneksi putus tanpa error) tidak memblokir antrean selamanya
    const e = await seedOnline();
    e.run('CLOUD_REQ_TIMEOUT = 40');
    e.net.hang = true;
    e.run("invoiceList.unshift({ id: 'I8', createdAt: '2026-03-01' })");
    const t0 = Date.now();
    const res = await e.run('cloudSyncRecords(["invoice"])');
    ok(res === false && Date.now() - t0 < 2000, 'request menggantung dianggap gagal setelah timeout');
    e.net.hang = false;
    ok((await e.run('cloudSyncRecords(["invoice"])')) === true && e.store.some(r => r.rec_id === 'I8'), 'antrean lanjut: sync berikutnya berhasil mengirim');
  }
  {
    // reset data (task 1.5) tidak meninggalkan "perubahan belum tersinkron" palsu
    const e = await seedOnline();
    await e.run('cloudDeleteRecords(["invoice"])');
    reload(e); e.alerts.length = 0;
    await e.run('cloudLoadRecords()');
    ok(e.run('invoiceList.length') === 0 && e.alerts.length === 0 && e.store.filter(r => r.kind === 'invoice').length === 0, 'setelah reset invoice + refresh: tetap kosong, tanpa peringatan');
  }

  console.log('[dialog] dialog "Unggah Data Lokal" tidak muncul untuk data yang sudah ada di cloud (temuan uji 1.2, no. 5)');
  {
    // browser kedua: cloud sudah berisi invoice, tapi kind lain (alert, anggaran, dst.) belum pernah ada di cloud
    const e = makeEnv();
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'I1', data: { id: 'I1', total: 1 } });
    e.store.push({ company_id: 'c1', kind: 'kontak', rec_id: 'K1', data: { id: 'K1' } });
    await e.run('cloudLoadRecords()');
    ok(e.confirms.length === 0 && e.alerts.length === 0, 'browser baru login ke bisnis yang datanya sudah di cloud: tidak ada dialog unggah');
    e.run("invoiceList = []; kontakList = []; _cloudSnap = {}; _cloudReadyFor = null");
    await e.run('cloudLoadRecords()');
    ok(e.confirms.length === 0, 'muat ulang: tetap tidak ada dialog');
  }
  {
    // data lokal yang BENAR-BENAR baru (dari cache sesi gagal / key lama) tetap ditawarkan
    const e = makeEnv();
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'I1', data: { id: 'I1', total: 1 } });
    e.ls['oas_alerts'] = JSON.stringify([{ id: 'alert_old' }]);
    await e.run('cloudLoadRecords()');
    ok(e.confirms.length === 1 && e.confirms[0].rows.some(r => r.label === 'Alert notifikasi'), 'data lama yang benar-benar belum di cloud tetap ditawarkan');
    ok(!e.confirms[0].rows.some(r => r.label === 'Invoice'), 'invoice yang sudah di cloud tidak ikut terdaftar di dialog');
  }

  console.log('[5] bisnis anggota (task 3.4)');
  for (const peran of ['viewer', 'member', 'admin']) {
    const e = makeEnv({ peran });
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'INV_1', data: { id: 'INV_1', createdAt: '2026-01-01' } });
    e.store.push({ company_id: 'c1', kind: 'kontak', rec_id: 'K1', data: { id: 'K1' } });
    e.store.push({ company_id: 'c1', kind: 'produk', rec_id: 'ks1', data: { ksId: 'ks1' } });
    e.store.push({ company_id: 'c1', kind: 'counter', rec_id: 'INV-2026', data: { id: 'INV-2026', terakhir: 5 } });
    // data lokal MILIK USER SENDIRI (key global lama) -- tidak boleh ikut masuk ke bisnis orang lain
    e.ls['oas_invoices'] = JSON.stringify([{ id: 'INV_PRIBADI' }]);
    e.ls['oas_alerts'] = JSON.stringify([{ id: 'alert_pribadi' }]);
    e.ls['oas_anggaran'] = JSON.stringify([{ id: 'ang_pribadi' }]);
    const loaded = await e.run('cloudLoadRecords()');
    ok(loaded === true, peran + ': record bisnis anggota termuat dari cloud');
    ok(e.run('invoiceList.map(i=>i.id).join()') === 'INV_1' && e.run('kontakList.length') === 1 && e.run('produkList.length') === 1, peran + ': invoice, kontak, produk masuk ke state');
    ok(e.run('counterList.length') === 1, peran + ': counter penomoran ikut dimuat');
    ok(e.confirms.length === 0, peran + ': data lokal pribadi TIDAK ditawarkan ke bisnis orang lain');
    ok(!e.store.some(r => /pribadi/i.test(r.rec_id)), peran + ': data pribadi tidak terunggah ke bisnis orang lain');
    ok(!e.ls['oas_rec_legacy_claimed_alert'] && !e.ls['oas_rec_legacy_claimed_anggaran'] && !e.ls['oas_rec_legacy_claimed'], peran + ': data lama global tidak ditandai sudah dipindah (masih bisa dipakai bisnis sendiri)');
  }
  {
    // cloud bisnis anggota kosong: dulu langsung menawarkan data pribadi ke bisnis tsb
    const e = makeEnv({ peran: 'member' });
    e.ls['oas_invoices'] = JSON.stringify([{ id: 'INV_PRIBADI' }]);
    e.ls['oas_kontak'] = JSON.stringify([{ id: 'K_PRIBADI' }]);
    e.ls['oas_jb'] = JSON.stringify([{ id: 'jb_pribadi' }]);
    await e.run('cloudLoadRecords()');
    ok(e.confirms.length === 0 && e.store.length === 0, 'cloud bisnis anggota kosong: tidak ada tawaran unggah data pribadi');
    ok(e.run('invoiceList.length') === 0, 'state bisnis anggota kosong, tidak terisi data pribadi');
  }
  {
    // pemilik tetap mendapat tawaran seperti biasa (tidak ada regresi)
    const e = makeEnv({ peran: 'owner' });
    e.ls['oas_invoices'] = JSON.stringify([{ id: 'INV_old' }]);
    await e.run('cloudLoadRecords()');
    ok(e.store.some(r => r.rec_id === 'INV_old'), 'pemilik: data lama tetap diunggah ke bisnis sendiri');
  }
  {
    // cache perubahan milik bisnis anggota itu sendiri (offline) tetap diselamatkan lewat jalur unsynced
    const e = makeEnv({ peran: 'member' });
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'INV_1', data: { id: 'INV_1', createdAt: '2026-01-01' } });
    await e.run('cloudLoadRecords()');
    e.run("invoiceList.unshift({id:'INV_OFF', createdAt:'2026-03-01'})");
    e.run("_cloudCacheLocal('c1','invoice',invoiceList)"); // simulasi simpan saat offline: cache terisi, cloud belum
    e.run('cloudResetRecordsState()');
    await e.run('cloudLoadRecords()');
    ok(e.store.some(r => r.rec_id === 'INV_OFF'), 'member: perubahan offline di bisnis anggota tetap terkirim');
  }

  console.log('[6] viewer hanya baca (task 3.5)');
  {
    const e = makeEnv({ peran: 'viewer' });
    e.store.push({ company_id: 'c1', kind: 'invoice', rec_id: 'INV_1', data: { id: 'INV_1', createdAt: '2026-01-01' } });
    // sisa perubahan lokal dari sebelum perannya jadi viewer: tidak boleh diterapkan/dikirim lagi
    e.ls['oas_rec_invoice_c1'] = JSON.stringify([{ id: 'INV_1', createdAt: '2026-01-01' }, { id: 'INV_LAMA' }]);
    e.ls['oas_rec_snaph_c1'] = JSON.stringify({ invoice: { INV_1: 'x' } });
    await e.run('cloudLoadRecords()');
    ok(e.run('invoiceList.map(i=>i.id).join()') === 'INV_1', 'viewer: state murni dari cloud, perubahan lokal lama tidak diterapkan');
    ok(!e.store.some(r => r.rec_id === 'INV_LAMA') && e.calls.upsert.length === 0, 'viewer: tidak ada kiriman ke cloud saat memuat');
    e.run("invoiceList.unshift({id:'INV_VIEWER', createdAt:'2026-05-01'}); kontakList.push({id:'K_V'})");
    const r = await e.run('cloudSyncRecords()');
    ok(r === true, 'viewer: cloudSyncRecords tidak dianggap gagal (tidak memunculkan peringatan sinkron)');
    ok(e.calls.upsert.length === 0 && e.calls.delete.length === 0 && !e.store.some(x => /VIEWER|K_V/.test(x.rec_id)), 'viewer: tidak ada upsert/delete ke cloud');
    ok(!/INV_VIEWER/.test(e.ls['oas_rec_invoice_c1'] || ''), 'viewer: perubahan tidak ditulis ke cache lokal');
    ok(e.alerts.length === 0, 'viewer: tidak ada alert gagal sinkron');
    const gagal = await e.run("cloudDeleteRecords(['invoice'])");
    ok(gagal.join() === 'invoice' && e.store.some(x => x.rec_id === 'INV_1'), 'viewer: hapus semua record ditolak, data cloud utuh');
  }
  {
    // member tetap bisa menulis di bisnis anggota (tidak ada regresi)
    const e = makeEnv({ peran: 'member' });
    await e.run('cloudLoadRecords()');
    e.run("invoiceList.push({id:'INV_M'})");
    await e.run('cloudSyncRecords()');
    ok(e.store.some(x => x.rec_id === 'INV_M' && x.company_id === 'c1'), 'member: tetap menulis ke bisnis anggota');
  }

  console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
  process.exit(fail ? 1 : 0);
})();
