// Tes js/31-pembayaran.js (model pembayaran + fungsi murni sisa tagihan, task 5.1) dan pemasangannya.
// Jalankan: node tests/pembayaran.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const ctx = { console };
vm.createContext(ctx);
vm.runInContext(rd('js/31-pembayaran.js'), ctx);
const run = c => vm.runInContext(c, ctx);
const inv = (o) => Object.assign({ id: 'INV_1', noInvoice: 'INV-2026-001', total: 100000, sisaTagihan: 100000, status: 'terkirim' }, o);
const bay = (o) => Object.assign({ id: 'PAY_' + Math.random().toString(36).slice(2), jenis: 'invoice', dokId: 'INV_1', tanggal: '2026-10-05', jumlah: 10000, akunKas: '1101' }, o);
ctx.__inv = inv({});
const S = (dok, daftar, jenis) => { ctx.__d = dok; ctx.__l = daftar; return run('sisaTagihan(__d, __l, ' + JSON.stringify(jenis === undefined ? 'invoice' : jenis) + ')'); };
const T = (dok, daftar, jenis) => { ctx.__d = dok; ctx.__l = daftar; return run('totalDibayar(__d, __l, ' + JSON.stringify(jenis === undefined ? 'invoice' : jenis) + ')'); };

console.log('[sisaTagihan] dasar');
ok(S(inv({}), []) === 100000, 'tanpa pembayaran: sisa = total');
ok(S(inv({}), [bay({ jumlah: 30000 })]) === 70000, 'satu pembayaran sebagian: 100.000 - 30.000 = 70.000');
ok(S(inv({}), [bay({ jumlah: 30000 }), bay({ jumlah: 20000 })]) === 50000, 'dua pembayaran dijumlahkan');
ok(S(inv({}), [bay({ jumlah: 100000 })]) === 0, 'dibayar penuh: sisa 0');
ok(S(inv({}), [bay({ jumlah: 70000 }), bay({ jumlah: 30000 })]) === 0, 'dibayar penuh bertahap: sisa 0');
ok(S(inv({}), [bay({ jumlah: 150000 })]) === 0, 'kelebihan bayar tidak menghasilkan sisa negatif');
ok(T(inv({}), [bay({ jumlah: 30000 }), bay({ jumlah: 20000 })]) === 50000, 'totalDibayar = jumlah semua pembayaran');

console.log('[sisaTagihan] pembayaran yang diabaikan');
const dok = inv({});
ok(S(dok, [bay({ jumlah: 25000 }), bay({ dokId: 'INV_LAIN', jumlah: 99000 })]) === 75000, 'pembayaran dokumen lain tidak ikut');
ok(S(dok, [bay({ jenis: 'bill', jumlah: 99000 })]) === 100000, 'pembayaran berjenis bill dengan dokId sama tidak ikut menurunkan invoice (id invoice dan bill bisa kebetulan sama)');
ok(S(dok, [bay({ jumlah: 0 }), bay({ jumlah: -5000 }), bay({ jumlah: NaN }), bay({ jumlah: Infinity }), bay({ jumlah: '5000' }), bay({ jumlah: null }), bay({ jumlah: undefined })]) === 100000, 'jumlah 0, negatif, NaN, Infinity, string, null, undefined diabaikan');
ok(S(dok, [null, undefined, 5, 'x', [], bay({ jumlah: 10000 })]) === 90000, 'elemen sampah dalam daftar dilewati');
ok(S(dok, null) === 100000 && S(dok, undefined) === 100000 && S(dok, 'x') === 100000 && S(dok, {}) === 100000, 'daftar bukan array = tanpa pembayaran');
ok(S(dok, [bay({ dokId: 1, jumlah: 10000 })], 'invoice') === 100000, 'dokId angka tidak cocok dengan id string lain');
ok(S(inv({ id: 7 }), [bay({ dokId: '7', jumlah: 10000 })]) === 90000, 'id angka dan dokId string yang sama dianggap cocok (id dari cloud bisa berupa string)');
ok(S(dok, [bay({ jumlah: 10000, tanggal: undefined, akunKas: undefined })]) === 90000, 'tanggal/akun kas tidak memengaruhi hitungan (divalidasi saat simpan, 5.2)');

console.log('[sisaTagihan] bill dan jenis');
const bil = { id: 'BILL_1', noBill: 'BILL-2026-001', total: 111000, sisaTagihan: 111000, status: 'diterima' };
ok(S(bil, [bay({ jenis: 'bill', dokId: 'BILL_1', jumlah: 11000 })], 'bill') === 100000, 'bill: dibayar sebagian');
ok(S(bil, [bay({ jenis: 'invoice', dokId: 'BILL_1', jumlah: 11000 })], 'bill') === 111000, 'bill tidak terpengaruh pembayaran berjenis invoice');
ok(S(bil, [bay({ jenis: 'bill', dokId: 'BILL_1', jumlah: 11000 })], 'ngawur') === 111000 && S(bil, [], undefined) === 111000, 'jenis tidak dikenal: pembayaran tidak dihitung, sisa = total');
ok(run('PEMBAYARAN_JENIS.join()') === 'invoice,bill', 'jenis dokumen yang dikenal: invoice dan bill');

console.log('[sisaTagihan] dibayarLama (pembayaran alur lama tanpa record)');
ok(S(inv({ dibayarLama: 40000 }), []) === 60000, 'dibayarLama 40.000 tanpa record: sisa 60.000');
ok(S(inv({ dibayarLama: 40000 }), [bay({ jumlah: 25000 })]) === 35000, 'dibayarLama + pembayaran baru: 100.000 - 40.000 - 25.000');
ok(T(inv({ dibayarLama: 40000 }), [bay({ jumlah: 25000 })]) === 65000, 'totalDibayar ikut menghitung dibayarLama');
ok(S(inv({ dibayarLama: 150000 }), []) === 0, 'dibayarLama melebihi total: sisa 0, bukan minus');
ok(S(inv({ dibayarLama: -5000 }), []) === 100000 && S(inv({ dibayarLama: NaN }), []) === 100000 && S(inv({ dibayarLama: '5000' }), []) === 100000 && S(inv({ dibayarLama: null }), []) === 100000, 'dibayarLama negatif/NaN/string/null dianggap 0');
// invoice yang dibayar sebagian lewat alur lama: sisaTagihan tersimpan 60.000, total 100.000
const lama = inv({ sisaTagihan: 60000 });
ok(S(lama, []) === 100000, 'TANPA dibayarLama, invoice lama yang sudah dibayar sebagian tampak belum dibayar (itu sebabnya 5.2 wajib mengisi dibayarLama)');
const lamaDiisi = Object.assign({}, lama, { dibayarLama: lama.total - lama.sisaTagihan });
ok(S(lamaDiisi, []) === 60000 && S(lamaDiisi, [bay({ jumlah: 60000 })]) === 0, 'dengan dibayarLama = total - sisaTagihan, sisa lama terjaga lalu bisa dilunasi');

console.log('[sisaTagihan] pembulatan dan dokumen tidak valid');
ok(S(inv({ total: 0.3 }), [bay({ jumlah: 0.1 }), bay({ jumlah: 0.2 })]) === 0, '0,1 + 0,2 melunasi 0,3 (tanpa sisa float 5,5e-17)');
ok(T(inv({}), [bay({ jumlah: 0.1 }), bay({ jumlah: 0.2 })]) === 0.3, 'totalDibayar 0,1 + 0,2 tepat 0,3');
ok(S(inv({ total: 100.1 }), [bay({ jumlah: 50.05 })]) === 50.05, 'desimal sen dipertahankan');
ok(S(inv({ total: 1000 }), [bay({ jumlah: 333.33 }), bay({ jumlah: 333.33 }), bay({ jumlah: 333.34 })]) === 0, 'tiga cicilan desimal melunasi tepat');
ok(S(null, []) === 0 && S(undefined, []) === 0 && S('x', []) === 0 && S(5, []) === 0, 'dokumen bukan objek: 0');
ok(S({ id: 'I' }, []) === 0 && S({ id: 'I', total: NaN }, []) === 0 && S({ id: 'I', total: '100' }, []) === 0 && S({ id: 'I', total: Infinity }, []) === 0, 'dokumen tanpa total angka hingga: 0');
ok(T(null, []) === 0, 'totalDibayar dokumen null = 0');
ok(S({ total: 5000 }, [bay({ dokId: undefined, jumlah: 1000 })]) === 5000, 'dokumen tanpa id tidak pernah cocok dengan pembayaran apa pun');
ok(S(dok, []) === 100000 && dok.total === 100000 && dok.sisaTagihan === 100000, 'fungsi tidak mengubah dokumen');
const daftarAsli = [bay({ jumlah: 10000 })]; const salin = JSON.stringify(daftarAsli);
S(dok, daftarAsli); ok(JSON.stringify(daftarAsli) === salin, 'fungsi tidak mengubah daftar pembayaran');

console.log('[pembayaranDokumen]');
ctx.__l = [bay({ id: 'A', jumlah: 1 }), bay({ id: 'B', dokId: 'X', jumlah: 2 }), bay({ id: 'C', jenis: 'bill', jumlah: 3 }), bay({ id: 'D', jumlah: -1 }), null];
ok(run('pembayaranDokumen(__l, "invoice", "INV_1").map(p => p.id).join()') === 'A', 'hanya yang sah untuk jenis + dokId');
ok(run('pembayaranDokumen(__l, "bill", "INV_1").map(p => p.id).join()') === 'C', 'jenis bill dengan dokId yang sama dipisah');
ok(run('pembayaranDokumen(__l, "invoice", "")').length === 0 && run('pembayaranDokumen(__l, "invoice", null)').length === 0 && run('pembayaranDokumen(__l, "x", "INV_1")').length === 0 && run('pembayaranDokumen(null, "invoice", "INV_1")').length === 0, 'dokId kosong, jenis tidak dikenal, atau daftar null: []');

console.log('[state dan pemasangan]');
ok(run('Array.isArray(pembayaranList) && pembayaranList.length === 0'), 'pembayaranList mulai kosong');
const cr = rd('js/22-cloud-records.js'), idx = rd('index.html'), sch = rd('docs/SCHEMA.md'), src = rd('js/31-pembayaran.js');
ok(/pembayaran:\s+\{ get: \(\) => pembayaranList,\s+set: v => \{ pembayaranList = v; \},\s+idOf: r => r && r\.id, legacyKey: 'oas_pembayaran', legacyOnce: true \}/.test(cr), 'kind pembayaran terdaftar di CLOUD_RECORD_KINDS (id = r.id, mode tamu oas_pembayaran, legacyOnce sejak 5.2)');
ok(cr.includes("pembayaran: 'Pembayaran'"), 'label dialog migrasi untuk pembayaran (bukan undefined)');
ok(/data-reset="pembayaran" data-label="Pembayaran"/.test(idx), 'checkbox Pembayaran di modal Reset Data');
ok(idx.includes('<script defer src="js/31-pembayaran.js"></script>') && idx.indexOf('src="js/30-aging-hutang.js"') < idx.indexOf('src="js/31-pembayaran.js"') && idx.indexOf('src="js/31-pembayaran.js"') < idx.indexOf('src="js/99-init.js"'), 'script dimuat setelah 30 dan sebelum 99-init');
ok(sch.includes('### 4.5c Pembayaran') && sch.includes('PAY_') && sch.includes('`pembayaran`') && sch.includes('dibayarLama'), 'SCHEMA.md: §4.5c, kind, rec_id PAY_, dibayarLama');
ok(!/document\.|window\.|getElementById/.test(src.replace(/\/\/.*$/gm, '')), 'modul tidak menyentuh DOM (localStorage hanya untuk mode tamu, sejak 5.2)');
ok(!/pembayaranList|sisaTagihan\(|totalDibayar\(|pembayaranDokumen\(/.test(['11-kontak-invoice', '28-bill', '29-bill-ui', '24-aging', '30-aging-hutang', '15-storage'].map(f => rd('js/' + f + '.js')).join('\n')), 'state/fungsi hitung tidak dipakai langsung di invoice/bill/aging/storage (hook invoice hanya openModalBayarInvoice)');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
