// Tes js/35-dok.js (model dokumen generik, fungsi transisi status, penomoran) + pemasangannya (task 6.3).
// Jalankan: node tests/dok.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const pen = rd('js/23-penomoran.js');
const ctx = { console };
vm.createContext(ctx);
vm.runInContext(['parseNomor', 'nomorBerikut'].map(n => pen.match(new RegExp('function ' + n + '[\\s\\S]*?\\n}\\n'))[0]).join('\n'), ctx);
vm.runInContext(rd('js/35-dok.js').replace(/^const /gm, 'var '), ctx);
const run = c => vm.runInContext(c, ctx);
const J = o => JSON.parse(JSON.stringify(o)); // lepas dari realm vm
const call = (fn, ...a) => { a.forEach((v, i) => { ctx['__a' + i] = v; }); return J(run(fn + '(' + a.map((_, i) => '__a' + i).join(',') + ')')); };

const form = o => Object.assign({ id: 'DOK_1', jenis: 'pesanan_jual', no: 'so-2026-001', tanggal: '2026-10-20', kontak: ' PT Maju ', items: [{ nama: 'Kopi', qty: 2, harga: 5000 }], createdAt: '2026-10-20T01:00:00.000Z' }, o);

console.log('[1] tabel jenis dan alur status');
{
  const jenis = Object.keys(J(run('DOK_JENIS')));
  ok(['penawaran', 'pesanan_jual', 'surat_jalan', 'pesanan_beli', 'penerimaan', 'retur_jual', 'retur_beli'].every(j => jenis.includes(j)) && jenis.length === 7, 'tujuh jenis dokumen alur dagang');
  const D = J(run('DOK_JENIS'));
  const awalan = jenis.map(j => D[j].awalan);
  ok(new Set(awalan).size === awalan.length && awalan.every(a => /^[A-Z0-9]+$/.test(a)), 'awalan nomor unik dan huruf/angka saja (syarat nomorBerikut)');
  ok(jenis.every(j => Array.isArray(D[j].transisi.draft) && D[j].transisi.draft.includes('batal')), 'setiap jenis dimulai dari draft dan draft boleh dibatalkan');
  // semua status tujuan harus punya entri sendiri (tidak ada status gantung) dan semua status terjangkau dari draft
  const gantung = [], tak = [];
  jenis.forEach(j => {
    const T = D[j].transisi, terjangkau = new Set(['draft']), antre = ['draft'];
    while (antre.length) { const s = antre.pop(); (T[s] || []).forEach(n => { if (!(n in T)) gantung.push(j + ':' + n); if (!terjangkau.has(n)) { terjangkau.add(n); antre.push(n); } }); }
    Object.keys(T).forEach(s => { if (!terjangkau.has(s)) tak.push(j + ':' + s); });
  });
  ok(gantung.length === 0, 'tidak ada status tujuan tanpa definisi' + (gantung.length ? ': ' + gantung : ''));
  ok(tak.length === 0, 'tidak ada status yang tidak terjangkau dari draft' + (tak.length ? ': ' + tak : ''));
  ok(call('dokStatusBerikut', 'pesanan_jual', 'draft').join() === 'dikonfirmasi,batal', 'dokStatusBerikut pesanan_jual dari draft');
  ok(call('dokStatusBerikut', 'pesanan_jual', 'selesai').length === 0, 'status akhir tidak punya tujuan');
  ok(call('dokStatusBerikut', 'lain', 'draft').length === 0 && call('dokStatusBerikut', 'pesanan_jual', 'ngawur').length === 0, 'jenis atau status tidak dikenal -> []');
  const x = run('dokStatusBerikut("pesanan_jual","draft")'); x.push('akal'); ok(call('dokStatusBerikut', 'pesanan_jual', 'draft').length === 2, 'hasil berupa salinan, tabel tidak bisa diubah dari luar');
}

console.log('[2] transisiDok');
{
  const dok = { id: 'D1', jenis: 'pesanan_jual', status: 'draft', no: 'SO-2026-001' };
  const salin = JSON.stringify(dok);
  const r = call('transisiDok', dok, 'dikonfirmasi', { waktu: '2026-10-21T02:00:00.000Z' });
  ok(r.ok && r.dok.status === 'dikonfirmasi' && r.dok.riwayat.length === 1 && r.dok.riwayat[0].dari === 'draft' && r.dok.riwayat[0].ke === 'dikonfirmasi' && r.dok.riwayat[0].waktu === '2026-10-21T02:00:00.000Z', 'transisi sah: status baru + riwayat dengan waktu');
  ok(JSON.stringify(dok) === salin, 'dok asli tidak diubah');
  const r2 = call('transisiDok', r.dok, 'selesai');
  ok(r2.ok && r2.dok.riwayat.length === 2 && !('waktu' in r2.dok.riwayat[1]), 'riwayat bertambah; tanpa opsi.waktu entri tidak berwaktu');
  const g = call('transisiDok', dok, 'selesai');
  ok(!g.ok && /dikonfirmasi, batal/.test(g.pesan), 'lompat status ditolak, pesan menyebut tujuan yang boleh');
  const f = call('transisiDok', r2.dok, 'batal');
  ok(!f.ok && /final/.test(f.pesan), 'status akhir tidak bisa diubah, pesan menyebut final');
  ok(!call('transisiDok', null, 'x').ok && !call('transisiDok', { jenis: 'lain', status: 'draft' }, 'x').ok && !call('transisiDok', { jenis: 'penawaran', status: 'ngawur' }, 'x').ok, 'dok kosong, jenis tak dikenal, atau status tak dikenal ditolak');
  ok(call('transisiDok', { id: 'D2', jenis: 'penerimaan', status: 'draft' }, 'diterima').ok, 'jenis lain memakai alurnya sendiri (penerimaan: draft -> diterima)');
  ok(!call('transisiDok', { id: 'D2', jenis: 'penerimaan', status: 'draft' }, 'dikirim').ok, 'status milik jenis lain ditolak');
  const rr = call('transisiDok', { jenis: 'penawaran', status: 'draft', riwayat: 'rusak' }, 'terkirim');
  ok(rr.ok && rr.dok.riwayat.length === 1, 'riwayat lama yang rusak (bukan array) tidak membuat gagal');
}

console.log('[3] nomorDokBerikut dan totalDok');
{
  ok(call('nomorDokBerikut', 'pesanan_jual', 2026, []) === 'SO-2026-001', 'nomor pertama pesanan penjualan');
  const daftar = [{ no: 'SO-2026-004' }, { no: 'SJ-2026-009' }, { no: 'SO-2025-099' }, null];
  ok(call('nomorDokBerikut', 'pesanan_jual', 2026, daftar) === 'SO-2026-005', 'memakai nomor tertinggi jenis+tahun yang sama; jenis/tahun lain tidak ikut');
  ok(call('nomorDokBerikut', 'surat_jalan', 2026, daftar) === 'SJ-2026-010', 'jenis lain punya urutan sendiri');
  ok(call('nomorDokBerikut', 'pesanan_jual', 2026, [], [{ id: 'SO-2026', terakhir: 7 }]) === 'SO-2026-008', 'counter menjadi batas bawah (menghapus dokumen terakhir tidak memakai ulang nomor)');
  let err = null; try { call('nomorDokBerikut', 'lain', 2026, []); } catch (e) { err = e; }
  ok(err && err.name === 'TypeError', 'jenis tidak dikenal -> TypeError');
  ok(call('totalDok', { items: [{ qty: 2, harga: 5000 }, { qty: 0.5, harga: 1001 }] }) === 10500.5, 'totalDok = Σ qty × harga');
  ok(call('totalDok', { items: [{ qty: 'x', harga: 5 }, null, { qty: 3 }, { qty: -1, harga: 5 }] }) === 0 && call('totalDok', null) === 0 && call('totalDok', {}) === 0, 'nilai rusak/negatif dan dokumen kosong -> 0');
  ok(call('totalDok', { items: [{ qty: 3, harga: 0.1 }] }) === 0.3, 'dibulatkan ke sen (0,1 × 3 = 0,3)');
}

console.log('[4] susunDok');
{
  const r = call('susunDok', form({ catatan: ' kirim pagi ', items: [{ nama: ' Kopi ', qty: 2, harga: 5000, satuan: ' kg ' }, { nama: '', qty: 0 }, null] }), []);
  ok(r.ok, 'form valid diterima' + (r.ok ? '' : ': ' + r.pesan));
  ok(r.dok.no === 'SO-2026-001' && r.dok.kontak === 'PT Maju' && r.dok.status === 'draft' && r.dok.catatan === 'kirim pagi', 'nomor dibuat kapital, teks dirapikan, status awal draft');
  ok(r.dok.items.length === 1 && r.dok.items[0].nama === 'Kopi' && r.dok.items[0].satuan === 'kg', 'baris kosong dibuang, nama item dirapikan');
  ok(!('refJenis' in r.dok) && !('refId' in r.dok), 'tanpa ref: field ref tidak dibuat');
  ok(call('susunDok', form({ items: [{ nama: 'Jasa', qty: 1 }] }), []).dok.items[0].harga === 0, 'harga kosong = 0 (mis. surat jalan tanpa harga)');

  const gagal = (f, daftar, re, m) => { const x = call('susunDok', f, daftar || []); ok(!x.ok && re.test(x.pesan), m + (x.ok ? ' (malah diterima)' : ' -> ' + x.pesan)); };
  gagal(form({ jenis: 'lain' }), [], /Jenis/, 'jenis tak dikenal');
  gagal(form({ id: '' }), [], /ID/, 'id kosong');
  gagal(form({ no: '  ' }), [], /nomor/i, 'nomor kosong');
  gagal(form({ tanggal: '2026-02-30' }), [], /tanggal/i, 'tanggal tidak ada di kalender');
  gagal(form({ tanggal: '20/10/2026' }), [], /tanggal/i, 'format tanggal salah');
  gagal(form({ kontak: '' }), [], /kontak/i, 'kontak kosong');
  gagal(form({ createdAt: '' }), [], /Waktu/, 'waktu pembuatan kosong');
  gagal(form({ items: [] }), [], /minimal 1 item/, 'tanpa item');
  gagal(form({ items: [{ nama: 'A', qty: 0 }] }), [], /lebih dari 0/, 'qty 0 pada item bernama');
  gagal(form({ items: [{ nama: '', qty: 2 }] }), [], /nama item/, 'item tanpa nama');
  gagal(form({ items: [{ nama: 'A', qty: 1, harga: -5 }] }), [], /Harga/, 'harga negatif');
  gagal(form({ items: [{ nama: 'A', qty: 1, harga: 'x' }] }), [], /Harga/, 'harga bukan angka');
  gagal(form({ id: 'DOK_2' }), [{ id: 'DOK_X', jenis: 'pesanan_jual', no: 'SO-2026-001' }], /sudah dipakai/, 'nomor kembar dalam jenis yang sama (tanpa beda huruf besar/kecil)');
  gagal(form(), [{ id: 'DOK_1', jenis: 'penawaran', no: 'QUO-1' }], /ID/, 'id kembar');
  ok(call('susunDok', form({ id: 'DOK_2' }), [{ id: 'DOK_X', jenis: 'surat_jalan', no: 'SO-2026-001' }]).ok, 'nomor sama di jenis lain tidak bentrok');
  ok(!call('susunDok', null, []).ok, 'form kosong ditolak');

  console.log('[4b] ref asal');
  const asal = { id: 'PNW_1', jenis: 'penawaran', no: 'QUO-2026-001', status: 'disetujui' };
  const a = call('susunDok', form({ id: 'DOK_2', no: 'SO-2026-002', refJenis: 'penawaran', refId: 'PNW_1', refNo: 'QUO-2026-001' }), [asal]);
  ok(a.ok && a.dok.refJenis === 'penawaran' && a.dok.refId === 'PNW_1' && a.dok.refNo === 'QUO-2026-001', 'ref ke dokumen model ini yang ada di daftar diterima');
  gagal(form({ id: 'DOK_2', refJenis: 'penawaran', refId: 'HILANG' }), [asal], /asal tidak ditemukan/, 'ref ke dokumen yang tidak ada');
  gagal(form({ id: 'DOK_2', refJenis: 'penawaran' }), [asal], /jenis dan id/, 'ref tidak lengkap (tanpa id)');
  gagal(form({ id: 'DOK_2', refId: 'PNW_1' }), [asal], /jenis dan id/, 'ref tidak lengkap (tanpa jenis)');
  gagal(form({ id: 'DOK_2', refJenis: 'ngawur', refId: 'X' }), [asal], /tidak dikenal/, 'jenis ref tidak dikenal');
  gagal(form({ id: 'PNW_9', jenis: 'penawaran', no: 'QUO-2026-009', refJenis: 'penawaran', refId: 'PNW_9' }), [], /dirinya sendiri/, 'menunjuk dirinya sendiri');
  ok(call('susunDok', form({ id: 'DOK_3', jenis: 'retur_jual', no: 'RJ-2026-001', refJenis: 'invoice', refId: 'INV_77' }), []).ok, 'ref ke invoice (record lama, di luar dokList) diterima tanpa dicek keberadaannya');
  ok(call('susunDok', form({ id: 'DOK_4', jenis: 'pesanan_beli', no: 'PO-2026-001', refJenis: 'bill', refId: 'BILL_1' }), []).ok, 'ref ke bill diterima');
  const d = [{ id: 'DOK_X', jenis: 'penawaran', no: 'QUO-1' }]; const salin = JSON.stringify(d);
  call('susunDok', form({ id: 'DOK_5', no: 'SO-2026-005' }), d); ok(JSON.stringify(d) === salin, 'tidak mengubah daftar masukan');
}

console.log('[5] pemasangan');
{
  const idx = rd('index.html'), cr = rd('js/22-cloud-records.js'), src = rd('js/35-dok.js');
  ok(/dok:\s+\{ get: \(\) => dokList,\s+set: v => \{ dokList = v; \},\s+idOf: r => r && r\.id, legacyKey: null \}/.test(cr), 'kind dok di CLOUD_RECORD_KINDS (tanpa key mode tamu)');
  ok(/dok: 'Dokumen penjualan\/pembelian'/.test(cr), 'label dialog migrasi untuk kind dok');
  ok(/data-reset="dok" data-label="[^"]+"/.test(idx), 'checkbox Dokumen di modal Reset Data');
  ok(idx.includes('js/35-dok.js') && idx.indexOf('js/34-kartu-kontak.js') < idx.indexOf('js/35-dok.js') && idx.indexOf('js/23-penomoran.js') < idx.indexOf('js/35-dok.js'), 'script dimuat setelah 23-penomoran.js dan 34-kartu-kontak.js');
  ok(!/localStorage|document\.|window\./.test(src.replace(/\/\/.*$/gm, '')), 'file tidak menyentuh DOM atau localStorage');
  const sto = rd('js/15-storage.js');
  ok(/kinds\.includes\('dok'\) && !kinds\.includes\('invoice'\)[^\n]*resetCounterJenis\(DOK_JENIS\[j\]\.awalan\)/.test(sto), 'doResetAll: reset Dokumen membuang counter semua awalan dokumen');
  // perilaku nyata: counter dokumen terbuang, counter INV/BILL tetap
  {
    const pc = { console, localStorage: { setItem() {}, getItem() { return null; } } };
    vm.createContext(pc);
    vm.runInContext(['counterTanpaJenis', 'resetCounterJenis'].map(n => pen.match(new RegExp('function ' + n + '[\\s\\S]*?\\n}\\n'))[0]).join('\n') + '\nlet counterList = [{id:"SO-2026",terakhir:3},{id:"SJ-2026",terakhir:1},{id:"INV-2026",terakhir:9},{id:"BILL-2026",terakhir:2},{id:"GRN-2025",terakhir:4}];', pc);
    vm.runInContext(rd('js/35-dok.js').replace(/^const /gm, 'var ') + '\nObject.keys(DOK_JENIS).forEach(j => resetCounterJenis(DOK_JENIS[j].awalan));', pc);
    ok(J(vm.runInContext('counterList', pc)).map(r => r.id).join() === 'INV-2026,BILL-2026', 'counter SO/SJ/GRN terbuang (semua tahun); INV dan BILL tetap');
  }
  const penPakai = [...rd('js/23-penomoran.js').matchAll(/nomorBerikut\(/g)].length;
  ok(penPakai >= 1, 'nomorBerikut (23-penomoran.js) tersedia untuk nomorDokBerikut');
}

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
