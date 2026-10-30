// Tes urutan tabel jurnal lewat klik header (js/33-urut-jurnal.js): Jurnal Umum, Kas, Penjualan, Pembelian,
// beserta pemasangannya di js/07-jurnal-laporan.js dan index.html.
// Jalankan: node tests/urut-jurnal.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const ctx = { console, String, Array, Object, parseInt, Math, JSON, document: { getElementById: () => null }, dirender: [] };
['renderJurnalUmum', 'renderJurnalKas', 'renderJurnalPenjualan', 'renderJurnalPembelian', 'renderBukuBesar'].forEach(f => { ctx[f] = () => ctx.dirender.push(f); });
vm.createContext(ctx); vm.runInContext(rd('js/33-urut-jurnal.js'), ctx);
ctx.globalThis = ctx;
const U = (daftar, urut) => { ctx.__d = daftar; ctx.__u = urut; return vm.runInContext('urutkanJurnalUmum(__d, __u).map(j => j.no).join()', ctx); };
const AWAL = { awal: 'desc', tglAktif: false, tgl: 'desc', no: null, utama: 'tgl' };
// daftar sesuai urutan masuk (index 0 = paling lama dimasukkan); tanggal sengaja tidak searah dengan nomor
const J = [
  { no: 'JRN-003', tanggal: '2026-10-12' }, { no: 'JRN-001', tanggal: '2026-10-30' }, { no: 'JRN-010', tanggal: '2026-10-12' },
  { no: 'JRN-002', tanggal: '2026-10-05' }, { no: 'JRN-021', tanggal: '2026-10-31' }, { no: undefined, tanggal: '2026-10-01' },
];
const copy = JSON.stringify(J);

console.log('[awal] tanpa klik');
ok(U(J, AWAL) === ',JRN-021,JRN-002,JRN-010,JRN-001,JRN-003', 'awal desc: terakhir dimasukkan di atas (sama dengan tampilan lama Umum/Kas)');
ok(U(J, { awal: 'asc' }) === 'JRN-003,JRN-001,JRN-010,JRN-002,JRN-021,', 'awal asc: urutan masuk apa adanya (sama dengan tampilan lama Penjualan/Pembelian)');
ok(U(J) === ',JRN-021,JRN-002,JRN-010,JRN-001,JRN-003', 'tanpa objek urutan: sama dengan awal desc');
ok(JSON.stringify(J) === copy, 'daftar asli tidak diubah (murni)');

console.log('[tanggal]');
ok(U(J, { awal: 'desc', tglAktif: true, tgl: 'desc', no: null }) === 'JRN-021,JRN-001,JRN-010,JRN-003,JRN-002,', 'terbaru di atas; tanggal sama (12 Okt): yang masuk terakhir dulu (010 sebelum 003)');
ok(U(J, { awal: 'desc', tglAktif: true, tgl: 'asc', no: null }) === ',JRN-002,JRN-003,JRN-010,JRN-001,JRN-021', 'terbaru di bawah; tanggal sama: yang masuk lebih dulu di atas (003 sebelum 010)');

console.log('[nomor]');
ok(U(J, { tglAktif: false, no: 'asc' }) === 'JRN-001,JRN-002,JRN-003,JRN-010,JRN-021,', 'kecil ke besar, dibandingkan sebagai angka (010 setelah 003)');
ok(U(J, { tglAktif: false, no: 'desc' }) === 'JRN-021,JRN-010,JRN-003,JRN-002,JRN-001,', 'besar ke kecil');
ok(U(J, { no: 'asc' }).endsWith(',') && U(J, { no: 'desc' }).endsWith(','), 'baris tanpa nomor selalu di akhir, apa pun arahnya');
ok(U([{ no: 'INV-2026-006', tanggal: '2026-10-01' }, { no: 'INV-2026-004', tanggal: '2026-10-02' }, { no: 'INV-2026-012', tanggal: '2026-10-03' }], { no: 'asc' }) === 'INV-2026-004,INV-2026-006,INV-2026-012', 'nomor invoice/faktur: angka di ujung yang dibandingkan');
ok(U([{ no: 'JRN-5' }, { no: 'JRN-12' }, { no: 'JRN-9' }], { no: 'asc' }) === 'JRN-5,JRN-9,JRN-12', 'nomor tanpa nol di depan: 5 < 9 < 12 (bukan urutan teks)');

console.log('[keduanya aktif: yang terakhir diklik jadi utama]');
ok(U(J, { tglAktif: true, tgl: 'desc', no: 'asc', utama: 'tgl' }) === 'JRN-021,JRN-001,JRN-003,JRN-010,JRN-002,', 'tanggal utama: tanggal sama diurutkan nomor kecil ke besar (003, 010)');
ok(U(J, { tglAktif: true, tgl: 'desc', no: 'asc', utama: 'no' }) === 'JRN-001,JRN-002,JRN-003,JRN-010,JRN-021,', 'nomor utama: urut nomor, tanggal tidak mengubah apa pun');
ok(U(J, { tglAktif: true, tgl: 'asc', no: 'desc', utama: 'tgl' }) === ',JRN-002,JRN-010,JRN-003,JRN-001,JRN-021', 'tanggal asc utama + nomor desc: tanggal sama (12 Okt) 010 sebelum 003');
ok(U([{ no: 'JRN-100', tanggal: '2026-10-01T10:00:00' }, { no: 'JRN-099', tanggal: '2026-10-01' }], { tglAktif: true, tgl: 'asc', no: 'asc', utama: 'tgl' }) === 'JRN-099,JRN-100', 'tanggal bercap waktu dibandingkan per hari');
ok(U(null, {}) === '' && U([], {}) === '', 'daftar kosong atau bukan array: aman');

console.log('[klik header per tabel]');
const klik = (t, k) => { vm.runInContext("ubahUrutJurnal('" + t + "','" + k + "')", ctx); return JSON.parse(vm.runInContext('JSON.stringify(_urutJurnal)', ctx))[t]; };
const st = t => JSON.parse(vm.runInContext('JSON.stringify(_urutJurnal)', ctx))[t];
ok(['umum', 'kas'].every(t => st(t).awal === 'desc' && st(t).tgl === 'desc') && ['jual', 'beli', 'bb'].every(t => st(t).awal === 'asc' && st(t).tgl === 'asc'), 'awal: Umum/Kas terbaru di atas; Penjualan/Pembelian/Buku Besar terlama di atas (seperti tampilan lama)');
let s = klik('umum', 'tgl'); ok(s.tglAktif && s.tgl === 'asc' && s.utama === 'tgl', 'Umum: klik Tanggal -> terbaru pindah ke bawah');
s = klik('umum', 'tgl'); ok(s.tglAktif && s.tgl === 'desc', 'Umum: klik kedua -> terbaru kembali di atas (masih aktif)');
s = klik('umum', 'tgl'); ok(!s.tglAktif && s.tgl === 'desc', 'Umum: klik ketiga -> tanggal mati (urutan awal, tidak aktif)');
s = klik('umum', 'tgl'); ok(s.tglAktif && s.tgl === 'asc', 'Umum: klik keempat -> mulai putaran baru (terbaru di bawah)');
s = klik('umum', 'tgl'); s = klik('umum', 'tgl');
s = klik('jual', 'tgl'); ok(s.tglAktif && s.tgl === 'desc', 'Penjualan: klik pertama langsung membalik (terbaru di atas)');
s = klik('jual', 'tgl'); ok(s.tglAktif && s.tgl === 'asc', 'Penjualan: klik kedua kembali ke terlama di atas (masih aktif)');
s = klik('jual', 'tgl'); ok(!s.tglAktif && s.tgl === 'asc', 'Penjualan: klik ketiga mematikan tanggal');
s = klik('kas', 'no'); ok(s.no === 'asc' && s.utama === 'no', 'Kas: klik No. Jurnal -> kecil ke besar, jadi utama');
s = klik('kas', 'no'); ok(s.no === 'desc', 'Kas: klik lagi -> besar ke kecil');
s = klik('kas', 'tgl'); ok(s.utama === 'tgl' && s.no === 'desc', 'Kas: klik Tanggal saat nomor aktif -> tanggal jadi utama, nomor jadi pembanding');
s = klik('kas', 'no'); ok(s.no === null && s.utama === 'tgl', 'Kas: klik nomor yang sedang besar-ke-kecil -> nomor mati (acak), tanggal tetap utama');
s = klik('kas', 'no'); ok(s.no === 'asc' && s.utama === 'no', 'Kas: klik nomor lagi -> kecil ke besar, nomor yang terakhir diklik jadi utama');
s = klik('beli', 'no'); ok(s.no === 'asc', 'Pembelian: klik No. Faktur -> kecil ke besar');
s = klik('bb', 'tgl'); ok(s.tglAktif && s.tgl === 'desc', 'Buku Besar: klik pertama Tanggal membalik urutan awal (terlama di atas -> terbaru di atas)');
s = klik('bb', 'no'); ok(s.no === 'asc' && s.utama === 'no', 'Buku Besar: klik No. Jurnal -> kecil ke besar, jadi utama');
ok(st('umum').no === null && st('beli').tglAktif === false && st('jual').no === null && st('bb').tgl === 'desc' && st('kas').tgl !== undefined, 'urutan tiap tabel terpisah (klik satu tabel tidak mengubah yang lain)');
ctx.dirender.length = 0; klik('beli', 'tgl'); klik('jual', 'no'); klik('kas', 'tgl'); klik('umum', 'no'); klik('bb', 'tgl');
ok(ctx.dirender.join() === 'renderJurnalPembelian,renderJurnalPenjualan,renderJurnalKas,renderJurnalUmum,renderBukuBesar', 'tiap klik menggambar ulang tabel yang benar');
ctx.dirender.length = 0; klik('lain', 'tgl'); klik('umum', 'lain');
ok(ctx.dirender.length === 0, 'tabel atau kolom tidak dikenal diabaikan');

console.log('[tanggal dimatikan]');
vm.runInContext("_urutJurnal.kas = { awal: 'desc', tglAktif: false, tgl: 'desc', no: null, utama: 'tgl' };", ctx);
klik('kas', 'tgl'); klik('kas', 'no');
s = klik('kas', 'tgl'); s = klik('kas', 'tgl');
ok(s.tglAktif === false && s.no === 'asc' && s.utama === 'no', 'Kas: tanggal dimatikan saat nomor aktif -> hanya nomor yang berlaku, jadi utama');
ok(U(J, { awal: 'desc', tglAktif: false, tgl: 'desc', no: null, utama: 'tgl' }) === U(J, AWAL), 'tanggal mati = urutan awal tabel (tidak ada urutan tersisa)');
ok(U(J, { awal: 'desc', tglAktif: false, tgl: 'desc', no: 'asc', utama: 'no' }) === 'JRN-001,JRN-002,JRN-003,JRN-010,JRN-021,', 'tanggal mati + nomor aktif: murni urut nomor');

console.log('[urutkanBarisJurnal]');
const baris = [{ tanggal: '2026-10-01', no: 'A-1', html: '<tr>1</tr>' }, { tanggal: '2026-10-03', no: 'A-3', html: '<tr>3</tr>' }, { tanggal: '2026-10-02', no: 'A-2', html: '<tr>2</tr>' }];
ctx.__b = baris;
vm.runInContext("_urutJurnal.kas = { awal: 'desc', tglAktif: false, tgl: 'desc', no: null, utama: 'tgl' }; _urutJurnal.jual = { awal: 'asc', tglAktif: false, tgl: 'asc', no: null, utama: 'tgl' };", ctx);
ok(vm.runInContext("urutkanBarisJurnal('kas', __b)", ctx) === '<tr>2</tr><tr>3</tr><tr>1</tr>', 'Kas tanpa klik: urutan masuk dibalik (terakhir dimasukkan di atas)');
ok(vm.runInContext("urutkanBarisJurnal('jual', __b)", ctx) === '<tr>1</tr><tr>3</tr><tr>2</tr>', 'Penjualan tanpa klik: urutan masuk apa adanya');

console.log('[pemasangan]');
const idx = rd('index.html'), j07 = rd('js/07-jurnal-laporan.js'), css = rd('css/components.css');
['umum', 'kas', 'jual', 'beli'].forEach(t => {
  ok(new RegExp('id="urut-' + t + '-tgl"[^>]*onclick="ubahUrutJurnal\\(\'' + t + '\',\'tgl\'\\)"').test(idx) && new RegExp('id="urut-' + t + '-no"[^>]*onclick="ubahUrutJurnal\\(\'' + t + '\',\'no\'\\)"').test(idx), 'header Tanggal dan nomor tabel ' + t + ' bisa diklik');
  ok(new RegExp("perbaruiIndikatorUrutJurnal\\('" + t + "'\\)").test(j07), 'renderer ' + t + ' memperbarui panah');
});
ok(/urutkanBarisJurnal\('bb', rows\)/.test(j07) && /id="urut-bb-tgl"[^>]*onclick="ubahUrutJurnal\('bb','tgl'\)"/.test(j07) && /id="urut-bb-no"[^>]*onclick="ubahUrutJurnal\('bb','no'\)"/.test(j07) && /perbaruiIndikatorUrutJurnal\('bb'\)/.test(j07), 'Buku Besar: header dibuat dengan klik urutan, baris lewat urutkanBarisJurnal, panah diperbarui setelah header dibuat ulang');
ok(/urutkanJurnalUmum\(filtered, _urutJurnal\.umum\)/.test(j07) && /urutkanBarisJurnal\('kas', rows\)/.test(j07) && /urutkanBarisJurnal\('jual', rows\)/.test(j07) && /urutkanBarisJurnal\('beli', rows\)/.test(j07), 'keempat renderer memakai fungsi urut');
ok(idx.indexOf('js/33-urut-jurnal.js') > idx.indexOf('js/32-pembayaran-ui.js') && idx.indexOf('js/33-urut-jurnal.js') < idx.indexOf('js/99-init.js'), 'script dimuat sebelum 99-init');
ok(/th\.th-sort/.test(css), 'gaya header yang bisa diklik');
console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal'); process.exit(fail ? 1 : 0);
