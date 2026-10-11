// Tes sinkron company_records (js/22-cloud-records.js). Jalankan: node tests/cloud-records.test.js
// Memakai DB palsu di memori + stub localStorage, tanpa browser/Supabase.
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', '22-cloud-records.js'), 'utf8');

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

function makeEnv({ failLoad = false, failWrite = false, confirmAnswer = true } = {}) {
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
          if (failLoad) return res({ data: null, error: new Error('relation does not exist') });
          let rows = store.filter(match); if (q.range) rows = rows.slice(q.range[0], q.range[1] + 1);
          return res({ data: rows, error: null });
        }
        if (failWrite) return res({ data: null, error: new Error('boom') });
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
  const alerts = [];
  const ctx = {
    console, localStorage, DB: { table },
    showAlert: m => alerts.push(m), showCustomConfirmGeneral: async () => confirmAnswer,
    hideOpSpinner() {}, currentCompany: { id: 'c1', name: 'Toko A' },
  };
  vm.createContext(ctx);
  // list global di 01-state.js adalah `let`; di sini disediakan lewat script yang sama
  vm.runInContext('let invoiceList=[],kontakList=[],asetTetapList=[],produkList=[],jurnalBerulangList=[],anggaranList=[],notifAlerts=[],kursData={USD:1,IDR:16200,SGD:12100,EUR:18300,MYR:3500,JPY:107,updatedAt:null};', ctx);
  vm.runInContext(src, ctx);
  const run = code => vm.runInContext(code, ctx);
  return { ctx, run, store, calls, ls, alerts };
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

  console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
  process.exit(fail ? 1 : 0);
})();
