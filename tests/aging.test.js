// Tes js/24-aging.js. Jalankan: node tests/aging.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', '24-aging.js'), 'utf8');
const ctx = {}; vm.createContext(ctx); vm.runInContext(src, ctx);
const ha = (...a) => vm.runInContext('hitungAging', ctx)(...a);
const bk = (...a) => vm.runInContext('bucketAging', ctx)(...a);

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };
const eq = (a, b, m) => ok(a === b, m + (a === b ? '' : ' (dapat ' + JSON.stringify(a) + ', mau ' + JSON.stringify(b) + ')'));
const melempar = (fn, m) => { let t = false; try { fn(); } catch (e) { t = !!e && e.name === 'TypeError'; } ok(t, m); };
const inv = (o) => Object.assign({ noInvoice: 'INV-2026-001', pelanggan: 'A', tanggal: '2026-01-01', jatuhTempo: '2026-10-12', sisaTagihan: 100, status: 'terkirim' }, o);
const ACUAN = '2026-10-12';

console.log('[1] batas bucket');
eq(bk(-5), 'lancar', 'umur -5 -> lancar');
eq(bk(0), 'lancar', 'umur 0 -> lancar');
eq(bk(1), 'b0_30', 'umur 1 -> 0-30');
eq(bk(30), 'b0_30', 'umur 30 -> 0-30');
eq(bk(31), 'b31_60', 'umur 31 -> 31-60');
eq(bk(60), 'b31_60', 'umur 60 -> 31-60');
eq(bk(61), 'b61_90', 'umur 61 -> 61-90');
eq(bk(90), 'b61_90', 'umur 90 -> 61-90');
eq(bk(91), 'b90plus', 'umur 91 -> >90');

console.log('[2] hitung dari tanggal');
let r = ha([inv({ jatuhTempo: '2026-10-12' }), inv({ jatuhTempo: '2026-10-11' }), inv({ jatuhTempo: '2026-09-12' }), inv({ jatuhTempo: '2026-09-11' }), inv({ jatuhTempo: '2026-07-14' }), inv({ jatuhTempo: '2026-07-13' }), inv({ jatuhTempo: '2026-01-01' }), inv({ jatuhTempo: '2026-11-30' })], ACUAN);
eq(r.total.lancar, 200, 'jatuh tempo hari ini + masa depan -> lancar');
eq(r.total.b0_30, 200, 'telat 1 dan 30 hari -> 0-30');
eq(r.total.b31_60, 100, 'telat 31 hari -> 31-60');
eq(r.total.b61_90, 100, 'telat 90 hari -> 61-90');
eq(r.total.b90plus, 200, 'telat 91 hari dan 284 hari -> >90');
eq(r.total.total, 800, 'total keseluruhan');

console.log('[3] yang dikecualikan');
r = ha([inv({ status: 'lunas' }), inv({ status: 'draft' }), inv({ sisaTagihan: 0 }), inv({ sisaTagihan: -5 }), inv({ sisaTagihan: undefined }), null, 'x'], ACUAN);
eq(r.total.total, 0, 'lunas/draft/sisa<=0/sampah tidak dihitung');
eq(r.perKontak.length, 0, 'tidak ada kontak');
eq(r.tidakValid.length, 0, 'bukan tidakValid');

console.log('[4] sisa parsial dipakai, bukan total');
r = ha([inv({ total: 1000, sisaTagihan: 250, jatuhTempo: '2026-09-01' })], ACUAN);
eq(r.total.b31_60, 250, 'memakai sisaTagihan');

console.log('[5] per kontak');
r = ha([inv({ pelanggan: 'Budi', jatuhTempo: '2026-10-01', sisaTagihan: 10 }), inv({ pelanggan: 'Ani', jatuhTempo: '2026-06-01', sisaTagihan: 20 }), inv({ pelanggan: 'Budi', jatuhTempo: '2026-08-01', sisaTagihan: 30, noInvoice: 'INV-2026-002' })], ACUAN);
eq(r.perKontak.length, 2, 'dua kontak');
eq(r.perKontak[0].kontak, 'Ani', 'urut nama');
eq(r.perKontak[1].total, 40, 'total Budi');
eq(r.perKontak[1].b0_30, 10, 'Budi 0-30');
eq(r.perKontak[1].b61_90, 30, 'Budi 61-90');
eq(r.perKontak[1].dokumen.length, 2, 'Budi punya 2 dokumen');
eq(r.perKontak[1].dokumen[1].no, 'INV-2026-002', 'nomor dokumen terbawa');
eq(r.perKontak[1].dokumen[1].umur, 72, 'umur dokumen terbawa');
eq(r.total.total, 60, 'total semua kontak');
eq(ha([{ supplier: 'PT X', jatuhTempo: '2026-10-01', sisaTagihan: 5, status: 'terkirim', noBill: 'BILL-1' }], ACUAN).perKontak[0].kontak, 'PT X', 'bill: field supplier');
eq(ha([{ jatuhTempo: '2026-10-01', sisaTagihan: 5 }], ACUAN).perKontak[0].kontak, '(Tanpa nama)', 'tanpa nama');

console.log('[6] tanggal tidak valid');
r = ha([inv({ jatuhTempo: '', tanggal: '2026-09-12' })], ACUAN);
eq(r.total.b0_30, 100, 'jatuhTempo kosong -> pakai tanggal');
r = ha([inv({ jatuhTempo: 'abc', tanggal: '' }), inv({ jatuhTempo: '2026-02-30', tanggal: undefined })], ACUAN);
eq(r.tidakValid.length, 2, 'tanggal tak valid masuk tidakValid (termasuk 30 Feb)');
eq(r.total.total, 0, 'tidak ikut dihitung');
eq(ha([inv({ jatuhTempo: '2026-09-12T10:00:00.000Z' })], ACUAN).total.b0_30, 100, 'ISO datetime diterima');

console.log('[7] input & murni');
eq(ha(null, ACUAN).total.total, 0, 'null dianggap kosong');
eq(ha(undefined, ACUAN).perKontak.length, 0, 'undefined dianggap kosong');
melempar(() => ha([], 'kemarin'), 'tanggalAcuan salah -> TypeError');
melempar(() => ha([]), 'tanggalAcuan kosong -> TypeError');
const asli = [inv({ jatuhTempo: '2026-06-01' })]; const salinan = JSON.stringify(asli);
ha(asli, ACUAN); eq(JSON.stringify(asli), salinan, 'input tidak diubah');
eq(ha([inv({ jatuhTempo: '2026-03-01' })], '2026-03-01').total.lancar, 100, 'acuan = jatuh tempo -> lancar (lintas tahun/bulan aman)');
eq(ha([inv({ jatuhTempo: '2025-12-31' })], '2026-01-02').total.b0_30, 100, 'lintas tahun: telat 2 hari');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
