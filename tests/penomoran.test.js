// Tes js/23-penomoran.js. Jalankan: node tests/penomoran.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', '23-penomoran.js'), 'utf8');
const ctx = { localStorage: { getItem: () => null, setItem() {} } }; vm.createContext(ctx); vm.runInContext(src, ctx);
const nb = (...a) => vm.runInContext('nomorBerikut', ctx)(...a);
const csp = (...a) => vm.runInContext('counterSetelahPakai', ctx)(...a);
const pn = (...a) => vm.runInContext('parseNomor', ctx)(...a);

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };
const eq = (a, b, m) => ok(a === b, m + (a === b ? '' : ' (dapat ' + JSON.stringify(a) + ', mau ' + JSON.stringify(b) + ')'));
// Error dari konteks vm berbeda realm, jadi instanceof tidak bisa dipakai: cek namanya.
const melempar = (fn, m) => { let t = false; try { fn(); } catch (e) { t = !!e && e.name === 'TypeError'; } ok(t, m); };

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

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
