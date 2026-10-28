// Tes js/23-penomoran.js. Jalankan: node tests/penomoran.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', '23-penomoran.js'), 'utf8');
const ctx = { localStorage: { getItem: () => null, setItem() {} } }; vm.createContext(ctx); vm.runInContext(src, ctx);
const nb = (...a) => vm.runInContext('nomorBerikut', ctx)(...a);
const csp = (...a) => vm.runInContext('counterSetelahPakai', ctx)(...a);
const pn = (...a) => vm.runInContext('parseNomor', ctx)(...a);
const sbn = (...a) => vm.runInContext('selesaikanBentrokNomorInvoice', ctx)(...a);

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };
const eq = (a, b, m) => ok(a === b, m + (a === b ? '' : ' (dapat ' + JSON.stringify(a) + ', mau ' + JSON.stringify(b) + ')'));
// Error dari konteks vm berbeda realm, jadi instanceof tidak bisa dipakai: cek namanya.
const melempar = (fn, m) => { let t = false; try { fn(); } catch (e) { t = !!e && e.name === 'TypeError'; } ok(t, m); };

(async () => {

console.log('[1] dasar');
eq(nb('INV', 2026, []), 'INV-2026-001', 'daftar kosong -> 001');
eq(nb('INV', 2026, null), 'INV-2026-001', 'null dianggap kosong');
eq(nb('INV', 2026, undefined), 'INV-2026-001', 'undefined dianggap kosong');
eq(nb('INV', 2026, ['INV-2026-001']), 'INV-2026-002', 'lanjut dari 001');
eq(nb('INV', 2026, ['INV-2026-001', 'INV-2026-002', 'INV-2026-003']), 'INV-2026-004', 'lanjut dari 003');

console.log('[2] pakai nomor terbesar, bukan jumlah');
eq(nb('INV', 2026, ['INV-2026-001', 'INV-2026-003']), 'INV-2026-004', 'ada lubang (002 dihapus): tidak bentrok dengan 003');
eq(nb('INV', 2026, ['INV-2026-007']), 'INV-2026-008', 'satu dokumen bernomor 007 -> 008');
eq(nb('INV', 2026, ['INV-2026-003', 'INV-2026-001', 'INV-2026-002']), 'INV-2026-004', 'urutan array tidak berpengaruh');

console.log('[3] terpisah per jenis dan per tahun');
eq(nb('INV', 2026, ['INV-2025-050', 'INV-2025-051']), 'INV-2026-001', 'tahun baru mulai dari 001');
eq(nb('INV', 2025, ['INV-2025-050', 'INV-2026-009']), 'INV-2025-051', 'tahun lain tidak ikut dihitung');
eq(nb('BILL', 2026, ['INV-2026-009']), 'BILL-2026-001', 'jenis lain tidak ikut dihitung');
eq(nb('PO', 2026, ['PO-2026-001', 'POS-2026-005']), 'PO-2026-002', 'awalan mirip (POS) tidak tercampur dengan PO');

console.log('[4] digit dan batas');
eq(nb('INV', 2026, ['INV-2026-009']), 'INV-2026-010', '009 -> 010');
eq(nb('INV', 2026, ['INV-2026-099']), 'INV-2026-100', '099 -> 100');
eq(nb('INV', 2026, ['INV-2026-999']), 'INV-2026-1000', '999 -> 1000 (tidak dipotong)');
eq(nb('INV', 2026, ['INV-2026-1000']), 'INV-2026-1001', '1000 -> 1001');
eq(nb('INV', 2026, ['INV-2026-0005']), 'INV-2026-006', 'nomor 4 digit berawalan nol dibaca sebagai 5');

console.log('[5] masukan kotor diabaikan');
eq(nb('INV', 2026, ['', null, undefined, 42, {}, [], 'ngawur', 'INV-2026-', 'INV-2026-abc', 'INV-2026-1a']), 'INV-2026-001', 'nilai non-nomor tidak merusak hasil');
eq(nb('INV', 2026, ['INV-001', 'INV-2026']), 'INV-2026-001', 'format lama tanpa tahun diabaikan');
eq(nb('INV', 2026, ['INV-2026-002-REV', 'INV-2026-001']), 'INV-2026-002', 'nomor bersufiks tidak dihitung');
eq(nb('INV', 2026, ['inv-2026-004']), 'INV-2026-005', 'huruf kecil tetap dikenali');
eq(nb('inv', 2026, ['INV-2026-004']), 'INV-2026-005', 'jenis huruf kecil dinormalkan ke kapital');
eq(nb('INV', 2026, ['  INV-2026-004  ']), 'INV-2026-005', 'spasi di tepi diabaikan');
eq(nb('INV', 2026, 'INV-2026-004'), 'INV-2026-001', 'bukan array dianggap kosong');

console.log('[6] tidak mengubah masukan');
{
  const daftar = ['INV-2026-001', 'INV-2026-002'];
  const salinan = JSON.stringify(daftar);
  nb('INV', 2026, daftar);
  eq(JSON.stringify(daftar), salinan, 'array masukan tidak berubah');
  eq(nb('INV', 2026, daftar), nb('INV', 2026, daftar), 'dua panggilan beruntun hasilnya sama (murni)');
}

console.log('[7] validasi argumen');
melempar(() => nb('', 2026, []), 'jenis kosong -> TypeError');
melempar(() => nb('IN V', 2026, []), 'jenis berspasi -> TypeError');
melempar(() => nb('INV-X', 2026, []), 'jenis bertanda hubung -> TypeError');
melempar(() => nb(null, 2026, []), 'jenis bukan string -> TypeError');
melempar(() => nb('INV', '2026', []), 'tahun string -> TypeError');
melempar(() => nb('INV', 26, []), 'tahun 2 digit -> TypeError');
melempar(() => nb('INV', 2026.5, []), 'tahun pecahan -> TypeError');
melempar(() => nb('INV', NaN, []), 'tahun NaN -> TypeError');

console.log('[8] parseNomor');
ok(JSON.stringify(pn('inv-2026-007')) === JSON.stringify({ jenis: 'INV', tahun: 2026, urut: 7 }), 'nomor valid diurai');
ok(pn('INV-2026') === null && pn('INV-26-001') === null && pn('') === null && pn(5) === null && pn('INV-2026-1234567890') === null, 'format lain / terlalu panjang -> null');

console.log('[9] counter sebagai batas bawah');
eq(nb('INV', 2026, [], [{ id: 'INV-2026', terakhir: 5 }]), 'INV-2026-006', 'daftar kosong tapi counter 5 -> 006 (invoice terakhir sudah dihapus)');
eq(nb('INV', 2026, ['INV-2026-008'], [{ id: 'INV-2026', terakhir: 5 }]), 'INV-2026-009', 'daftar lebih tinggi dari counter -> pakai daftar');
eq(nb('INV', 2026, ['INV-2026-002'], [{ id: 'INV-2025', terakhir: 90 }, { id: 'BILL-2026', terakhir: 90 }]), 'INV-2026-003', 'counter jenis/tahun lain diabaikan');
eq(nb('INV', 2026, [], [null, {}, { id: 'INV-2026', terakhir: 'x' }]), 'INV-2026-001', 'record counter rusak diabaikan');
eq(nb('INV', 2026, [], 'bukan array'), 'INV-2026-001', 'counter bukan array dianggap kosong');

console.log('[10] counterSetelahPakai');
{
  const awal = [{ id: 'INV-2026', jenis: 'INV', tahun: 2026, terakhir: 3 }];
  const snap = JSON.stringify(awal);
  const naik = csp(awal, 'INV-2026-004');
  ok(naik !== awal && naik[0].terakhir === 4, 'nomor lebih tinggi menaikkan counter (array baru)');
  eq(JSON.stringify(awal), snap, 'array masukan tidak diubah');
  ok(csp(awal, 'INV-2026-002') === awal, 'nomor lebih rendah: referensi sama (tidak turun)');
  ok(csp(awal, 'INV-2026-003') === awal, 'nomor sama: referensi sama');
  ok(csp(awal, 'bebas') === awal && csp(awal, '') === awal && csp(awal, null) === awal, 'nomor tak berformat diabaikan');
  const baru = csp(awal, 'INV-2027-001');
  ok(baru.length === 2 && baru[1].id === 'INV-2027' && baru[1].terakhir === 1, 'tahun baru menambah record');
  ok(csp([], 'bill-2026-012')[0].id === 'BILL-2026', 'jenis dinormalkan kapital');
  ok(csp(undefined, 'INV-2026-001').length === 1, 'counterList undefined diperlakukan kosong');
  eq(nb('INV', 2026, [], csp(awal, 'INV-2026-010')), 'INV-2026-011', 'alur: pakai nomor 010, lalu hapus invoice -> berikutnya 011 (tidak 004)');
}

console.log('[11] pembungkus invoice');
{
  const c2 = { localStorage: { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); } }, invoiceList: [] };
  vm.createContext(c2); vm.runInContext(src, c2);
  const run = code => vm.runInContext(code, c2);
  const thn = new Date().getFullYear();
  eq(run('nomorInvoiceBerikut()'), 'INV-' + thn + '-001', 'tanpa invoice -> 001 tahun ini');
  run('invoiceList = [{ noInvoice: "INV-2026-001" }, { noInvoice: "INV-2026-002" }, { noInvoice: "bebas" }]');
  eq(run('nomorInvoiceBerikut(2026)'), 'INV-2026-003', 'dari daftar invoice');
  ok(run('catatNomorInvoice("INV-2026-002")') === true, 'catat: counter naik dari kosong');
  ok(run('catatNomorInvoice("INV-2026-002")') === false, 'catat nomor sama: tidak berubah');
  ok(run('catatNomorInvoice("manual-abc")') === false, 'catat nomor bebas: diabaikan');
  eq(JSON.parse(c2.localStorage._s['oas_counter'])[0].terakhir, 2, 'mode tamu: counter ditulis ke localStorage');
  run('invoiceList = []');
  eq(run('nomorInvoiceBerikut(2026)'), 'INV-2026-003', 'semua invoice dihapus: nomor tidak mundur');
  // bisnis login: sinkron lewat cloudSyncRecords
  const calls = [];
  c2.currentCompany = { id: 'c1' }; c2.cloudSyncRecords = k => { calls.push(k.join()); return Promise.resolve(true); };
  ok(run('catatNomorInvoice("INV-2026-005")') === true && calls.join() === 'counter', 'bisnis login: memanggil cloudSyncRecords([counter])');
  eq(c2.localStorage._s['oas_counter'] && JSON.parse(c2.localStorage._s['oas_counter'])[0].terakhir, 2, 'bisnis login: key global tidak ikut ditulis');
}

console.log('[12] selesaikanBentrokNomorInvoice (bentrok offline HP & laptop)');
{
  // Tanpa invoice kembar
  const unik = [
    { id: '1', noInvoice: 'INV-2026-001', createdAt: '2026-10-12T08:00:00Z' },
    { id: '2', noInvoice: 'INV-2026-002', createdAt: '2026-10-12T08:05:00Z' }
  ];
  const rUnik = sbn(unik, []);
  ok(rUnik.bentrok.length === 0, 'tanpa kembar: tidak ada bentrok');
  eq(rUnik.invoices, unik, 'tanpa kembar: referensi array dipertahankan');

  // Skenario 10: HP dan laptop offline membuat invoice dengan nomor sama (INV-2026-002)
  const bentrok2 = [
    { id: 'inv_hp', noInvoice: 'INV-2026-002', pelanggan: 'Pelanggan HP', createdAt: '2026-10-12T08:00:00Z' },
    { id: 'inv_lap', noInvoice: 'INV-2026-002', pelanggan: 'Pelanggan Laptop', createdAt: '2026-10-12T08:01:00Z' }
  ];
  const r2 = sbn(bentrok2, [{ id: 'INV-2026', jenis: 'INV', tahun: 2026, terakhir: 2 }]);
  ok(r2.bentrok.length === 1, 'terdeteksi 1 invoice bentrok');
  eq(r2.bentrok[0].id, 'inv_lap', 'invoice yang lebih baru (laptop) yang disesuaikan');
  eq(r2.bentrok[0].noLama, 'INV-2026-002', 'catat nomor lama 002');
  eq(r2.bentrok[0].noBaru, 'INV-2026-003', 'nomor baru otomatis 003');
  eq(r2.invoices[0].noInvoice, 'INV-2026-002', 'invoice pertama (HP) tetap 002');
  eq(r2.invoices[1].noInvoice, 'INV-2026-003', 'invoice kedua (Laptop) berubah ke 003');
  eq(r2.counterList.find(c => c.id === 'INV-2026').terakhir, 3, 'counter naik ke 3');

  // Tiga invoice kembar sekaligus
  const bentrok3 = [
    { id: 'a', noInvoice: 'INV-2026-005', createdAt: '2026-10-12T08:00:00Z' },
    { id: 'b', noInvoice: 'INV-2026-005', createdAt: '2026-10-12T08:02:00Z' },
    { id: 'c', noInvoice: 'INV-2026-005', createdAt: '2026-10-12T08:03:00Z' }
  ];
  const r3 = sbn(bentrok3, [{ id: 'INV-2026', jenis: 'INV', tahun: 2026, terakhir: 5 }]);
  ok(r3.bentrok.length === 2, 'tiga kembar: 2 disesuaikan');
  eq(r3.invoices[0].noInvoice, 'INV-2026-005', 'pertama tetap 005');
  eq(r3.invoices[1].noInvoice, 'INV-2026-006', 'kedua jadi 006');
  eq(r3.invoices[2].noInvoice, 'INV-2026-007', 'ketiga jadi 007');
  eq(r3.counterList.find(c => c.id === 'INV-2026').terakhir, 7, 'counter naik ke 7');
}

console.log('[13] integrasi periksaDanSelesaikanBentrokInvoice');
{
  const c3 = {
    localStorage: { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); } },
    escapeHtml: s => s,
    invoiceList: [
      { id: 'i1', noInvoice: 'INV-2026-001', pelanggan: 'Klien A', createdAt: '2026-10-12T07:00:00Z' },
      { id: 'i2', noInvoice: 'INV-2026-001', pelanggan: 'Klien B', createdAt: '2026-10-12T07:10:00Z' }
    ],
    counterList: [{ id: 'INV-2026', jenis: 'INV', tahun: 2026, terakhir: 1 }],
    jurnalEntries: [
      { id: 'j1', ket: 'Invoice INV-2026-001 — Klien A' },
      { id: 'j2', ket: 'Invoice INV-2026-001 — Klien B' }
    ],
    showAlert: () => {}
  };
  vm.createContext(c3);
  vm.runInContext(src, c3);
  const syncCalls = [];
  c3.currentCompany = { id: 'c1' };
  c3.cloudSyncRecords = k => { syncCalls.push(k.join()); return Promise.resolve(true); };

  // Jalankan periksaDanSelesaikanBentrokInvoice
  await vm.runInContext('periksaDanSelesaikanBentrokInvoice()', c3);
  ok(c3.invoiceList[0].noInvoice === 'INV-2026-001', 'integrasi: invoice 1 tetap 001');
  ok(c3.invoiceList[1].noInvoice === 'INV-2026-002', 'integrasi: invoice 2 disesuaikan jadi 002');
  ok(c3.jurnalEntries[1].ket.includes('INV-2026-002'), 'integrasi: jurnal invoice 2 ikut diperbarui ke 002');
  ok(c3.jurnalEntries[0].ket.includes('INV-2026-001'), 'integrasi: jurnal invoice 1 tetap 001');
  ok(syncCalls.includes('invoice,counter'), 'integrasi: sync ke cloud dipanggil untuk invoice dan counter');
}

console.log('[13] counterTanpaJenis dan resetCounterJenis (Reset Data khusus satu jenis, task 4.4)');
{
  const ctj = (...a) => vm.runInContext('counterTanpaJenis', ctx)(...a);
  const list = [
    { id: 'INV-2026', jenis: 'INV', tahun: 2026, terakhir: 5 },
    { id: 'BILL-2026', jenis: 'BILL', tahun: 2026, terakhir: 3 },
    { id: 'BILL-2027', jenis: 'BILL', tahun: 2027, terakhir: 1 }
  ];
  const snap = JSON.stringify(list);
  const r = ctj(list, 'BILL');
  ok(r.length === 1 && r[0].id === 'INV-2026', 'semua tahun jenis BILL dibuang, INV tetap');
  eq(JSON.stringify(list), snap, 'array masukan tidak diubah');
  ok(ctj(list, 'PO') === list, 'jenis yang tidak ada: referensi sama');
  ok(ctj(list, 'bill').length === 1, 'jenis tidak peka huruf besar/kecil');
  ok(ctj(list, '') === list && ctj(list, null) === list, 'jenis kosong: tidak ada yang dibuang');
  ok(ctj(null, 'BILL') === null && ctj(undefined, 'BILL') === undefined, 'counterList null/undefined tidak error');
  ok(ctj([{ id: 'BILLX-2026', terakhir: 1 }], 'BILL').length === 1, 'jenis BILLX tidak ikut terbuang saat membuang BILL (cocok per awalan lengkap)');

  const c4 = { localStorage: { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); } } };
  vm.createContext(c4); vm.runInContext(src, c4);
  vm.runInContext('counterList = ' + JSON.stringify(list), c4);
  ok(vm.runInContext('resetCounterJenis("BILL")', c4) === true, 'mode tamu: ada yang dibuang -> true');
  eq(JSON.parse(c4.localStorage._s['oas_counter']).map(x => x.id).join(), 'INV-2026', 'mode tamu: counter INV tersimpan, BILL hilang');
  ok(vm.runInContext('resetCounterJenis("BILL")', c4) === false, 'ulang: tidak ada yang dibuang -> false');
  const calls = [];
  c4.currentCompany = { id: 'c1' }; c4.cloudSyncRecords = k => { calls.push(k.join()); return Promise.resolve(true); };
  vm.runInContext('counterList = ' + JSON.stringify(list), c4);
  vm.runInContext('resetCounterJenis("BILL")', c4);
  eq(calls.join('|'), 'counter', 'bisnis login: sinkron lewat cloudSyncRecords([counter])');
}

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
})();
