// ═══════════════════════════════════════════════════════════
// TEST: Status invoice otomatis dari total pembayaran (task 5.4)
// ═══════════════════════════════════════════════════════════

const fs = require('fs');
const vm = require('vm');
const path = require('path');

// Read the pembayaran file and extract functions
const pembayaranCode = fs.readFileSync(path.join(__dirname, '..', 'js', '31-pembayaran.js'), 'utf8');

const ctx = vm.createContext({
  console,
  Array, Object, String, Number, Math, Date, JSON, isFinite, parseFloat,
  localStorage: { getItem: () => '[]' },
  PEMBAYARAN_JENIS: ['invoice', 'bill'],
  pembayaranList: [],
  invoiceList: []
});

// Extract dan jalankan fungsi yang dibutuhkan
vm.runInContext(pembayaranCode, ctx);

const run = c => vm.runInContext(c, ctx);
const ok = (cond, msg) => { if (!cond) { console.error('✗', msg); process.exitCode = 1; } else console.log('✓', msg); };
const eq = (a, b, m) => ok(a === b, m + (a === b ? '' : ' (dapat ' + JSON.stringify(a) + ', mau ' + JSON.stringify(b) + ')'));

// Helper invoice
const inv = (o) => Object.assign({
  id: 'INV_' + (o.noInvoice || 'X'),
  noInvoice: 'INV-2026-001',
  pelanggan: 'Budi',
  tanggal: '2026-10-01',
  jatuhTempo: '2026-10-31',
  total: 1000000,
  sisaTagihan: 1000000,
  status: 'terkirim'
}, o);

// Helper pembayaran
const bayar = (o) => Object.assign({
  id: 'PAY_' + Math.random(),
  jenis: 'invoice',
  dokId: 'INV_X',
  tanggal: '2026-10-05',
  jumlah: 500000,
  akunKas: '1101',
  metode: 'Transfer',
  jurnalNo: 'JRN-001'
}, o);

console.log('[1] statusDariPembayaran: invoice belum dibayar');
const i1 = inv({ id: 'I1', total: 1000000, status: 'terkirim' });
eq(run('statusDariPembayaran')(i1, [], 'invoice'), 'terkirim', 'belum ada pembayaran: tetap terkirim');

console.log('[2] statusDariPembayaran: invoice dibayar sebagian');
const i2 = inv({ id: 'I2', total: 1000000, status: 'terkirim' });
const p2 = [bayar({ dokId: 'I2', jumlah: 300000 })];
eq(run('statusDariPembayaran')(i2, p2, 'invoice'), 'sebagian', '300rb dari 1jt: sebagian');

const i2b = inv({ id: 'I2b', total: 1000000, status: 'terkirim' });
const p2b = [bayar({ dokId: 'I2b', jumlah: 999999 })];
eq(run('statusDariPembayaran')(i2b, p2b, 'invoice'), 'sebagian', '999.999 dari 1jt: sebagian (bukan lunas)');

console.log('[3] statusDariPembayaran: invoice lunas');
const i3 = inv({ id: 'I3', total: 1000000, status: 'terkirim' });
const p3 = [bayar({ dokId: 'I3', jumlah: 1000000 })];
eq(run('statusDariPembayaran')(i3, p3, 'invoice'), 'lunas', 'dibayar penuh: lunas');

const i3b = inv({ id: 'I3b', total: 1000000, status: 'terkirim' });
const p3b = [bayar({ dokId: 'I3b', jumlah: 1000001 })];
eq(run('statusDariPembayaran')(i3b, p3b, 'invoice'), 'lunas', 'dibayar lebih (edge case): lunas');

console.log('[4] statusDariPembayaran: beberapa pembayaran');
const i4 = inv({ id: 'I4', total: 1000000, status: 'terkirim' });
const p4 = [
  bayar({ dokId: 'I4', jumlah: 300000 }),
  bayar({ dokId: 'I4', jumlah: 300000 }),
  bayar({ dokId: 'I4', jumlah: 300000 })
];
eq(run('statusDariPembayaran')(i4, p4, 'invoice'), 'sebagian', '3x300rb = 900rb dari 1jt: sebagian');

const p4b = [...p4, bayar({ dokId: 'I4', jumlah: 100000 })];
eq(run('statusDariPembayaran')(i4, p4b, 'invoice'), 'lunas', 'total 1jt: lunas');

console.log('[5] statusDariPembayaran: draft tidak berubah');
const i5 = inv({ id: 'I5', total: 1000000, status: 'draft' });
const p5 = [bayar({ dokId: 'I5', jumlah: 1000000 })];
eq(run('statusDariPembayaran')(i5, p5, 'invoice'), 'draft', 'draft tetap draft meski dibayar (tidak boleh bayar draft)');

console.log('[6] statusDariPembayaran: dengan dibayarLama');
const i6 = inv({ id: 'I6', total: 1000000, status: 'terkirim', dibayarLama: 400000 });
const p6 = [bayar({ dokId: 'I6', jumlah: 300000 })];
eq(run('statusDariPembayaran')(i6, p6, 'invoice'), 'sebagian', 'dibayarLama 400rb + 300rb = 700rb dari 1jt: sebagian');

const p6b = [...p6, bayar({ dokId: 'I6', jumlah: 300000 })];
eq(run('statusDariPembayaran')(i6, p6b, 'invoice'), 'lunas', 'dibayarLama 400rb + 600rb = 1jt: lunas');

console.log('[7] statusDariPembayaran: bill');
const b7 = Object.assign({}, inv({ id: 'B7', total: 500000, status: 'diterima' }), { noBill: 'BILL-001', supplier: 'PT Maju' });
const pb7 = [bayar({ jenis: 'bill', dokId: 'B7', jumlah: 200000 })];
eq(run('statusDariPembayaran')(b7, pb7, 'bill'), 'sebagian', 'bill dibayar 200rb dari 500rb: sebagian');

const pb7b = [...pb7, bayar({ jenis: 'bill', dokId: 'B7', jumlah: 300000 })];
eq(run('statusDariPembayaran')(b7, pb7b, 'bill'), 'lunas', 'bill dibayar 500rb: lunas');

console.log('[8] catatPembayaran dan terapkanHapusPembayaran memerlukan fungsi kompleks lain');
console.log('    (diuji manual di browser, atau lewat tests/pembayaran-*.test.js yang sudah ada)');

console.log('[9] edge case: invoice rusak');
eq(run('statusDariPembayaran')(null, [], 'invoice'), '', 'dok null: string kosong');
eq(run('statusDariPembayaran')({}, [], 'invoice'), '', 'dok tanpa status: string kosong');
eq(run('statusDariPembayaran')({ status: 'terkirim' }, [], 'invoice'), 'terkirim', 'dok tanpa total: tetap status asal');

console.log('[10] jenis tidak dikenal');
const i10 = inv({ id: 'I10', total: 1000000, status: 'terkirim' });
eq(run('statusDariPembayaran')(i10, [], 'ngawur'), 'terkirim', 'jenis tidak dikenal: tidak error, kembalikan status asal');

if (process.exitCode) console.error('\n❌ Ada tes yang gagal.');
else console.log('\n✅ Semua tes lulus.');
