// Task 5.6: alokasi satu penerimaan ke beberapa invoice (fungsi murni).
// Jalankan: node tests/alokasi-pembayaran.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/31-pembayaran.js'), 'utf8');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(src, ctx);
const run = (f, invoices, daftar) => {
  ctx.__f = f; ctx.__invoices = invoices; ctx.__daftar = daftar || [];
  return vm.runInContext('susunAlokasiPembayaran(__f, __invoices, __daftar)', ctx);
};
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };
const inv = (id, o) => Object.assign({ id, noInvoice: 'INV-' + id, total: 100000, sisaTagihan: 100000, status: 'terkirim', tanggal: '2026-10-01' }, o || {});
const base = (o) => Object.assign({ id: 'RCV_001', createdAt: '2026-10-30T06:00:00.000Z', tanggal: '2026-10-30', jumlah: 150000, akunKas: '1101', alokasi: [{ dokId: 'I1', jumlah: 90000 }, { dokId: 'I2', jumlah: 60000 }] }, o || {});

console.log('[alokasi pembayaran] sukses dan hasil');
let r = run(base(), [inv('I1'), inv('I2')]);
ok(r.ok, 'satu penerimaan berhasil dialokasikan ke dua invoice');
ok(r.pembayaran.length === 2 && r.pembayaran[0].jumlah === 90000 && r.pembayaran[1].jumlah === 60000, 'menghasilkan record pembayaran per invoice dengan nominal sesuai alokasi');
ok(r.pembayaran.every(p => p.jenis === 'invoice' && p.akunKas === '1101' && p.tanggal === '2026-10-30'), 'setiap record mempertahankan jenis, akun kas, dan tanggal transaksi');
ok(r.pembayaran[0].grupId === 'RCV_001' && r.pembayaran[1].grupId === 'RCV_001', 'semua record terhubung melalui grupId batch yang sama');
ok(r.pembayaran[0].id === 'RCV_001_1' && r.pembayaran[1].id === 'RCV_001_2', 'ID record turunan deterministik dan unik');
ok(r.perubahan.length === 2 && r.perubahan[0].sisaBaru === 10000 && r.perubahan[1].sisaBaru === 40000 && !r.perubahan[0].lunas, 'mengembalikan perubahan sisa per invoice tanpa mengubah invoice');
ok(r.totalDialokasikan === 150000, 'totalDialokasikan sama dengan jumlah penerimaan');

console.log('[validasi batch]');
ok(!run(base({ jumlah: 149999 }), [inv('I1'), inv('I2')]).ok, 'menolak total alokasi yang tidak sama dengan jumlah penerimaan');
ok(!run(base({ alokasi: [] }), [inv('I1'), inv('I2')]).ok, 'menolak batch tanpa alokasi');
ok(run(base({ alokasi: [{ dokId: 'I1', jumlah: 150000 }] }), [inv('I1', { total: 200000, sisaTagihan: 200000 })]).ok, 'penerimaan boleh dialokasikan ke satu invoice');
ok(!run(base({ alokasi: [{ dokId: 'I1', jumlah: 90000 }, { dokId: 'I1', jumlah: 60000 }] }), [inv('I1')]).ok, 'menolak invoice duplikat dalam satu batch');
ok(!run(base({ alokasi: [{ dokId: 'MISSING', jumlah: 150000 }] }), [inv('I1')]).ok, 'menolak invoice yang tidak ditemukan');
ok(!run(base({ alokasi: [{ dokId: 'I1', jumlah: 0 }, { dokId: 'I2', jumlah: 150000 }] }), [inv('I1'), inv('I2')]).ok, 'menolak nominal alokasi nol');
ok(!run(base({ alokasi: [{ dokId: 'I1', jumlah: -1 }, { dokId: 'I2', jumlah: 150001 }] }), [inv('I1'), inv('I2')]).ok, 'menolak nominal alokasi negatif');
ok(!run(base({ alokasi: [{ dokId: 'I1', jumlah: 100001 }, { dokId: 'I2', jumlah: 49999 }] }), [inv('I1'), inv('I2')]).ok, 'menolak alokasi melebihi sisa invoice meski total batch cocok');
ok(!run(base(), [inv('I1'), inv('I2', { status: 'draft' })]).ok, 'seluruh batch ditolak bila salah satu invoice belum boleh dibayar');
ok(!run(base({ akunKas: '' }), [inv('I1'), inv('I2')]).ok, 'akun kas wajib diisi');
ok(!run(base({ tanggal: '2026-09-30' }), [inv('I1'), inv('I2')]).ok, 'tanggal pembayaran tidak boleh sebelum tanggal invoice');
ok(!run(base({ id: '' }), [inv('I1'), inv('I2')]).ok, 'ID batch wajib diisi');
ok(!run(base({ jumlah: NaN }), [inv('I1'), inv('I2')]).ok, 'menolak jumlah batch bukan angka hingga');
ok(!run(base(), [inv('I1'), inv('I2')], [{ id: 'RCV_001_2' }]).ok, 'menolak benturan ID record pembayaran turunan');

console.log('[pembulatan dan kemurnian]');
r = run(base({ jumlah: 0.3, alokasi: [{ dokId: 'I1', jumlah: 0.1 }, { dokId: 'I2', jumlah: 0.2 }] }), [inv('I1', { total: 1, sisaTagihan: 1 }), inv('I2', { total: 1, sisaTagihan: 1 })]);
ok(r.ok && r.totalDialokasikan === 0.3, 'pembulatan sen menangani 0,1 + 0,2');
const docs = [inv('I1'), inv('I2')], docsBefore = JSON.stringify(docs), list = [], listBefore = JSON.stringify(list);
run(base(), docs, list);
ok(JSON.stringify(docs) === docsBefore, 'fungsi tidak mengubah daftar invoice');
ok(JSON.stringify(list) === listBefore, 'fungsi tidak mengubah daftar pembayaran yang ada');
ok(!run(base(), null).ok, 'daftar invoice bukan array ditolak dengan aman');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
