// Tes js/39-pesanan-invoice.js (task 7.4): pesananKeInvoice murni, belum dipasang ke UI/alur simpan.
// Jalankan: node tests/pesanan-invoice.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const ctx = { console, JENIS_JURNAL: { INVOICE: 'Invoice & Piutang' }, akunPpnKeluaranKode: () => '2301' };
vm.createContext(ctx);
const utils = rd('js/02-utils.js'), inv = rd('js/11-kontak-invoice.js');
vm.runInContext(utils.match(/const PPN_TARIF_STANDAR[^\n]*\n/)[0].replace(/^const /, 'var ') + utils.match(/function hitungPpn[\s\S]*?\n}\n/)[0], ctx);
vm.runInContext(inv.match(/function _entryJurnalKirimInvoice[\s\S]*?\n}\n/)[0], ctx); // untuk uji kecocokan dengan jurnal invoice asli
vm.runInContext(rd('js/39-pesanan-invoice.js'), ctx);
const J = o => JSON.parse(JSON.stringify(o));
const pesanan = o => Object.assign({ id: 'S1', jenis: 'pesanan_jual', no: 'SO-2026-001', tanggal: '2026-11-08', kontak: ' PT Maju ', status: 'dikonfirmasi',
  items: [{ nama: 'Kopi', qty: 2, harga: 5000, satuan: 'kg' }, { nama: 'Gula', qty: 1, harga: 12000 }], catatan: 'Kirim cepat', ppnTarif: 11, refJenis: 'penawaran', refId: 'P1', refNo: 'QUO-2026-001', createdAt: 'x' }, o);
const opsi = o => Object.assign({ id: 'INV_1', noInvoice: 'inv-2026-001', tanggal: '2026-11-10', createdAt: '2026-11-10T01:00:00Z', akunPiutang: '1201', akunPend: '4101', daftarInvoice: [] }, o);
const buat = (p, o) => { ctx.__p = p; ctx.__o = opsi(o); return J(vm.runInContext('pesananKeInvoice(__p, __o)', ctx)); };

console.log('[1] hasil: bentuk invoice');
{
  const r = buat(pesanan()); const i = r.invoice;
  ok(r.ok, 'pesanan dikonfirmasi -> ok');
  ok(i.id === 'INV_1' && i.noInvoice === 'INV-2026-001' && i.pelanggan === 'PT Maju', 'id, nomor (kapital), pelanggan (dirapikan)');
  ok(i.tanggal === '2026-11-10' && i.jatuhTempo === '2026-12-10', 'tanggal dari opsi, jatuh tempo default +30 hari');
  ok(i.items.length === 2 && i.items[0].nama === 'Kopi' && i.items[0].qty === 2 && i.items[0].harga === 5000 && i.items[1].nama === 'Gula', 'item disalin');
  ok(i.items[0].satuan === undefined && Object.keys(i.items[0]).sort().join() === 'harga,nama,qty', 'item invoice hanya nama, qty, harga (bentuk invoice lama)');
  ok(i.subtotal === 22000 && i.ppn === 2420 && i.ppnTarif === 11 && i.total === 24420 && i.sisaTagihan === 24420, 'subtotal 22.000 + PPN 11% = 24.420; sisa = total');
  ok(i.status === 'draft', 'status draft (belum dijurnal)');
  ok(i.akunPiutang === '1201' && i.akunPend === '4101' && i.createdAt === '2026-11-10T01:00:00Z', 'akun dan waktu pembuatan dari opsi');
  ok(i.deskripsi === 'Kirim cepat', 'deskripsi dari catatan pesanan');
  ok(buat(pesanan({ catatan: undefined })).invoice.deskripsi === 'Pesanan SO-2026-001', 'tanpa catatan: deskripsi menyebut nomor pesanan');
  ok(i.refJenis === 'pesanan_jual' && i.refId === 'S1' && i.refNo === 'SO-2026-001', 'tertaut ke pesanan asal');
  const kunci = ['id', 'noInvoice', 'pelanggan', 'tanggal', 'jatuhTempo', 'deskripsi', 'items', 'subtotal', 'ppn', 'ppnTarif', 'total', 'sisaTagihan', 'status', 'akunPiutang', 'akunPend', 'createdAt'];
  ok(kunci.every(k => k in i), 'semua field invoice SCHEMA §4.5 ada');
}

console.log('[2] PPN dan pembulatan');
{
  const n = buat(pesanan({ ppnTarif: undefined })).invoice;
  ok(n.ppn === 0 && n.ppnTarif === 0 && n.total === 22000, 'tanpa PPN: ppn 0, ppnTarif 0');
  ok(buat(pesanan({ ppnTarif: 0 })).invoice.ppn === 0, 'ppnTarif 0 = tanpa PPN');
  ok(buat(pesanan({ ppnTarif: 12 })).invoice.ppn === 2640, 'tarif 12%');
  const d = buat(pesanan({ items: [{ nama: 'A', qty: 3, harga: 3333 }] })).invoice;
  ok(d.subtotal === 9999 && d.ppn === 1100 && d.total === 11099, 'PPN dibulatkan ke rupiah seperti hitungPpn');
  const q = buat(pesanan({ items: [{ nama: 'A', qty: 0.5, harga: 1001 }], ppnTarif: undefined })).invoice;
  ok(q.subtotal === 500.5, 'qty desimal tidak dibulatkan diam-diam');
}

console.log('[3] kecocokan dengan jurnal invoice asli');
{
  ctx.__i = buat(pesanan()).invoice;
  const e = J(vm.runInContext('_entryJurnalKirimInvoice(__i)', ctx));
  const dr = e.lines.reduce((s, l) => s + l.debit, 0), kr = e.lines.reduce((s, l) => s + l.kredit, 0);
  ok(dr === kr && dr === 24420, 'jurnal kirim dari invoice hasil seimbang (Dr = Kr = total)');
  ok(e.lines.length === 3 && e.lines[0].akun === '1201' && e.lines[1].akun === '4101' && e.lines[1].kredit === 22000 && e.lines[2].kredit === 2420, 'Dr Piutang, Cr Pendapatan (DPP), Cr PPN Keluaran');
  ok(e.keterangan === 'Invoice INV-2026-001 — PT Maju', 'keterangan jurnal memakai nomor dan pelanggan');
}

console.log('[4] jatuh tempo, tanggal, nomor');
{
  ok(buat(pesanan(), { jatuhTempo: '2026-11-25' }).invoice.jatuhTempo === '2026-11-25', 'jatuh tempo dari opsi dipakai');
  ok(buat(pesanan(), { tanggal: '2026-12-15' }).invoice.jatuhTempo === '2027-01-14', 'default +30 hari melewati pergantian tahun');
  ok(buat(pesanan(), { tanggal: '2026-01-31' }).invoice.jatuhTempo === '2026-03-02', 'default +30 hari melewati akhir bulan');
  ok(!buat(pesanan(), { jatuhTempo: '2026-11-01' }).ok, 'jatuh tempo sebelum tanggal ditolak');
  ok(!buat(pesanan(), { jatuhTempo: '2026-02-30' }).ok, 'jatuh tempo tidak valid ditolak');
  ok(!buat(pesanan(), { tanggal: '' }).ok && !buat(pesanan(), { tanggal: '2026-02-31' }).ok && !buat(pesanan(), { tanggal: '10/11/2026' }).ok, 'tanggal kosong/tidak valid ditolak');
  ok(!buat(pesanan(), { noInvoice: '  ' }).ok && !buat(pesanan(), { id: '' }).ok, 'nomor atau id kosong ditolak');
  const r = buat(pesanan(), { daftarInvoice: [{ id: 'X', noInvoice: 'INV-2026-001' }] });
  ok(!r.ok && r.pesan.includes('INV-2026-001'), 'nomor kembar ditolak (tanpa beda huruf besar/kecil), pesan menyebut nomor');
  ok(!buat(pesanan(), { daftarInvoice: [{ id: 'INV_1', noInvoice: 'INV-2026-009' }] }).ok, 'id kembar ditolak');
  ok(buat(pesanan(), { daftarInvoice: [{ id: 'X', noInvoice: 'INV-2026-002' }, null] }).ok, 'nomor lain dan entri rusak di daftar tidak mengganggu');
}

console.log('[5] penolakan');
{
  for (const st of ['draft', 'selesai', 'batal']) {
    const r = buat(pesanan({ status: st })); ok(!r.ok && r.pesan.includes(st), 'status ' + st + ' ditolak, pesan menyebut status');
  }
  const sb = buat(pesanan({ status: 'sebagian' })); ok(!sb.ok && sb.pesan.includes('sebagian'), 'status sebagian ditolak dulu (menunggu qty terkirim, 7.6)');
  ok(!buat(null).ok && !buat(undefined).ok && !buat({ jenis: 'penawaran', status: 'dikonfirmasi' }).ok, 'bukan pesanan penjualan ditolak');
  ok(!buat(pesanan({ akunPiutang: '' }), { akunPiutang: '' }).ok && !buat(pesanan(), { akunPend: ' ' }).ok, 'akun piutang/pendapatan kosong ditolak');
  ok(!buat(pesanan({ kontak: '  ' })).ok, 'tanpa pelanggan ditolak');
  ok(!buat(pesanan({ items: [] })).ok && !buat(pesanan({ items: undefined })).ok, 'tanpa item ditolak');
  ok(!buat(pesanan({ items: [{ nama: '', qty: 1, harga: 10 }] })).ok, 'item tanpa nama ditolak');
  ok(!buat(pesanan({ items: [{ nama: 'A', qty: 0, harga: 10 }] })).ok, 'qty 0 ditolak');
  ok(!buat(pesanan({ items: [{ nama: 'A', qty: 1, harga: -5 }] })).ok, 'harga negatif ditolak');
  const nol = buat(pesanan({ items: [{ nama: 'A', qty: 1, harga: 0 }] }));
  ok(!nol.ok && nol.pesan.includes('Rp 0'), 'total Rp 0 ditolak dengan pesan jelas');
  ok(!buat(pesanan(), { createdAt: '' }).ok, 'waktu pembuatan kosong ditolak');
}

console.log('[6] murni dan batas task');
{
  const p = pesanan(), d = [{ id: 'X', noInvoice: 'INV-2026-007' }]; const sp = JSON.stringify(p), sd = JSON.stringify(d);
  ctx.__p = p; ctx.__o = opsi({ daftarInvoice: d });
  const r = vm.runInContext('pesananKeInvoice(__p, __o)', ctx);
  ok(JSON.stringify(p) === sp && JSON.stringify(d) === sd, 'pesanan dan daftar tidak diubah');
  r.invoice.items[0].qty = 99;
  ok(p.items[0].qty === 2, 'item invoice salinan: mengubahnya tidak mengubah pesanan');
  ok(p.status === 'dikonfirmasi', 'status pesanan tidak diubah (menandai terpenuhi = task 7.5)');
  const src = rd('js/39-pesanan-invoice.js');
  ok(!/document\.|localStorage|invoiceList|dokList|Date\.now|new Date\(\)|addJurnal|postJurnalLegacy|simpanFiturBaru|saveFiturBaru/.test(src), 'murni: tanpa DOM, state, jam, jurnal, atau simpan');
  const lain = fs.readdirSync(path.join(__dirname, '..', 'js')).filter(f => f !== '39-pesanan-invoice.js');
  ok(lain.every(f => !/pesananKeInvoice/.test(rd('js/' + f))), 'belum dipanggil dari file js lain (dipasang di 7.5)');
  ok(/js\/39-pesanan-invoice\.js/.test(rd('index.html')), 'index.html memuat js/39-pesanan-invoice.js');
}

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
