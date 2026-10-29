// Tes hapus pembayaran invoice (task 5.3b): susunHapusPembayaran, terapkanHapusPembayaran (js/31-pembayaran.js, murni
// kecuali terapkan) dan pemasangannya di js/32-pembayaran-ui.js, js/11-kontak-invoice.js, index.html.
// Jalankan: node tests/pembayaran-hapus.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const ls = {};
const ctx = { console, JSON, Math, Promise, localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } }, currentCompany: null, invoiceList: [], billList: [] };
vm.createContext(ctx);
vm.runInContext(rd('js/31-pembayaran.js'), ctx);
const run = c => vm.runInContext(c, ctx);

const inv = o => Object.assign({ id: 'INV_1', noInvoice: 'INV-2026-001', pelanggan: 'MOE', tanggal: '2026-10-12', total: 100000, sisaTagihan: 100000, status: 'terkirim' }, o);
const bay = o => Object.assign({ id: 'PAY_A', jenis: 'invoice', dokId: 'INV_1', noDok: 'INV-2026-001', tanggal: '2026-10-15', jumlah: 30000, akunKas: '1101', createdAt: 'x', jurnalNo: 'JRN-001' }, o);
const jrn = o => Object.assign({ no: 'JRN-001', tanggal: '2026-10-15', jenis: 'Invoice & Piutang', ket: 'Pembayaran INV-2026-001 — MOE', lines: [{ akun: '1101', debit: 30000, kredit: 0 }, { akun: '1201', debit: 0, kredit: 30000 }] }, o);
const H = (id, dok, daftar, jr) => { ctx.__a = [id, dok, daftar, jr || []]; return run('susunHapusPembayaran(...__a)'); };

console.log('[susunHapusPembayaran] penolakan');
ok(H('PAY_X', inv({}), [bay({})]).ok === false, 'id tidak ada: ditolak');
ok(H('PAY_B', inv({}), [bay({ id: 'PAY_B', jenis: 'bill' })]).ok === false, 'pembayaran bill ditolak (dikerjakan 5.5)');
ok(H('PAY_A', inv({}), null).ok === false, 'daftar bukan array: ditolak, tidak error');

console.log('[susunHapusPembayaran] sisa dan status dihitung ulang');
let d = [bay({ jumlah: 30000 })];
let r = H('PAY_A', inv({ sisaTagihan: 70000 }), d, [jrn({})]);
ok(r.ok && r.sisaBaru === 100000, 'satu-satunya pembayaran 30.000 dihapus: sisa kembali 100.000');
ok(r.daftarBaru.length === 0 && d.length === 1, 'daftarBaru tanpa record itu; daftar asli tidak diubah (murni)');
ok(r.statusBaru === 'terkirim', 'invoice terkirim tetap terkirim');
d = [bay({ id: 'PAY_B', jumlah: 40000, jurnalNo: 'JRN-002' }), bay({ jumlah: 60000 })];
r = H('PAY_B', inv({ sisaTagihan: 0, status: 'lunas' }), d);
ok(r.ok && r.sisaBaru === 40000, 'invoice lunas, hapus pembayaran 40.000: sisa 40.000');
ok(r.statusBaru === 'terkirim', 'invoice lunas yang jadi bersisa kembali berstatus terkirim');
r = H('PAY_A', inv({ sisaTagihan: 0, status: 'lunas' }), [bay({ jumlah: 100000 }), bay({ id: 'PAY_Z', jumlah: 0.0 })]);
ok(r.sisaBaru === 100000 && r.statusBaru === 'terkirim', 'lunas satu pembayaran penuh dihapus: sisa = total');

console.log('[susunHapusPembayaran] pelunasan alur lama tidak hilang');
r = H('PAY_A', inv({ sisaTagihan: 0, status: 'lunas' }), [bay({ jumlah: 70000 })]);
ok(r.dibayarLama === 30000 && r.sisaBaru === 70000, 'dibayar lama 30.000 (tanpa record) + record 70.000 dihapus: sisa 70.000, dibayarLama tetap 30.000');
ctx.__dok = inv({ sisaTagihan: 0, status: 'lunas' });
r = H('PAY_A', ctx.__dok, [bay({ jumlah: 70000 })]);
ok(ctx.__dok.sisaTagihan === 0 && ctx.__dok.status === 'lunas', 'invoice asli tidak diubah oleh susun (murni)');

console.log('[susunHapusPembayaran] status jurnal pembayaran');
r = H('PAY_A', inv({ sisaTagihan: 70000 }), [bay({})], [jrn({})]);
ok(r.jurnalStatus === 'aktif' && r.jurnal && r.jurnal.no === 'JRN-001', 'jurnal masih berlaku: aktif + jurnal diberikan untuk dibalik');
r = H('PAY_A', inv({ sisaTagihan: 70000 }), [bay({ jurnalNo: undefined })], []);
ok(r.jurnalStatus === 'belum' && r.jurnal === null, 'record 5.2 tanpa jurnal: belum, tidak ada yang dibalik');
r = H('PAY_A', inv({ sisaTagihan: 70000 }), [bay({})], [jrn({}), jrn({ no: 'JRN-009', ket: '[Pembalik JRN-001] Pembayaran INV-2026-001 — MOE', reversalOf: 'JRN-001' })]);
ok(r.jurnalStatus === 'dibalik', 'jurnal sudah dibalik manual: dibalik, tidak dibalik dua kali');

console.log('[susunHapusPembayaran] record yatim');
r = H('PAY_A', null, [bay({})]);
ok(r.ok && r.yatim === true && r.daftarBaru.length === 0, 'invoice sudah dihapus: record yatim cukup dibuang');
r = H('PAY_A', inv({ id: 'INV_LAIN' }), [bay({})]);
ok(r.ok && r.yatim === true, 'invoice lain (id tidak cocok) diperlakukan yatim, invoice itu tidak disentuh');

console.log('[terapkanHapusPembayaran]');
ctx.pembayaranList = [bay({ id: 'PAY_B', jumlah: 40000 }), bay({ jumlah: 60000 })];
ctx.__inv2 = inv({ sisaTagihan: 0, status: 'lunas' });
ctx.__h = H('PAY_B', ctx.__inv2, ctx.pembayaranList);
run('terapkanHapusPembayaran(__inv2, __h)');
ok(run('pembayaranList.length') === 1 && run('pembayaranList[0].id') === 'PAY_A', 'record dibuang dari pembayaranList');
ok(ctx.__inv2.sisaTagihan === 40000 && ctx.__inv2.status === 'terkirim', 'sisaTagihan dan status invoice diperbarui');
ok(JSON.parse(ls.oas_pembayaran).length === 1, 'mode tamu: oas_pembayaran tersimpan');
ok(run('terapkanHapusPembayaran(null, { ok:false })') instanceof Promise, 'hasil tidak ok: tidak mengubah apa pun');
ok(run('pembayaranList.length') === 1, 'pembayaranList tidak berubah setelah hasil tidak ok');

console.log('[pemasangan]');
const ui = rd('js/32-pembayaran-ui.js'), idx = rd('index.html'), inv11 = rd('js/11-kontak-invoice.js');
ok(/function hapusPembayaranInvoice/.test(ui) && /buatJurnalPembalik\(hasil\.jurnal/.test(ui), 'UI membalik jurnal lewat buatJurnalPembalik, bukan menghapusnya');
ok(/guardPeriode\(tgl, 'dibuatkan jurnal pembalik'\)/.test(ui), 'periode terkunci diperiksa pada tanggal pembalik');
ok(ui.indexOf('buatJurnalPembalik(hasil.jurnal') < ui.indexOf('terapkanHapusPembayaran(inv, hasil)'), 'jurnal dibalik lebih dulu, baru record dibuang');
ok(/_bayarTombolRiwayat\(i\)/.test(inv11) && /openRiwayatPembayaranInvoice/.test(ui) && !/pembayaranList|pembayaranDokumen\(/.test(inv11), 'tombol Riwayat dipasang di daftar invoice lewat 32-pembayaran-ui.js (11 tidak membaca state pembayaran)');
ok(/id="bayar-inv-form"/.test(idx) && /id="bayar-inv-simpan"/.test(idx), 'form dan tombol simpan bisa disembunyikan (mode riwayat)');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
