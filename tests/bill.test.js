// Tes js/28-bill.js (hitung total, nomor) dan keterkaitan form js/29-bill-ui.js dengan index.html.
// Jalankan: node tests/bill.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const utils = rd('js/02-utils.js');
const ppnSrc = utils.match(/const PPN_TARIF_STANDAR[^\n]*\n/)[0] + utils.match(/function hitungPpn[\s\S]*?\n}\n/)[0];
const ctx = { localStorage: { getItem: () => null }, console };
vm.createContext(ctx);
vm.runInContext(ppnSrc, ctx);
vm.runInContext(rd('js/23-penomoran.js').match(/function parseNomor[\s\S]*?\n}\n/)[0] + rd('js/23-penomoran.js').match(/function nomorBerikut[\s\S]*?\n}\n/)[0], ctx);
vm.runInContext(rd('js/28-bill.js'), ctx);
const run = c => vm.runInContext(c, ctx);

console.log('[hitungTotalBill]');
let h = run('hitungTotalBill([{qty:2,harga:50000},{qty:1,harga:25000}], false)');
ok(h.subtotal === 125000 && h.ppn === 0 && h.total === 125000, 'tanpa PPN: total = subtotal');
h = run('hitungTotalBill([{qty:2,harga:50000}], true, 11)');
ok(h.subtotal === 100000 && h.ppn === 11000 && h.total === 111000, 'PPN 11%');
h = run('hitungTotalBill([{qty:1,harga:100000}], true, 12)');
ok(h.ppn === 12000, 'PPN 12%');
h = run('hitungTotalBill([{qty:3,harga:3333}], true, 11)');
ok(h.ppn === Math.round(9999 * 0.11) && Number.isInteger(h.ppn), 'PPN dibulatkan ke rupiah');
h = run('hitungTotalBill([], true, 11)');
ok(h.subtotal === 0 && h.ppn === 0 && h.total === 0, 'tanpa item = 0');
h = run('hitungTotalBill(null, true)');
ok(h.total === 0, 'items null tidak error');
h = run('hitungTotalBill([{qty:NaN,harga:100},{qty:-2,harga:100},{qty:"2",harga:100},null,{qty:1,harga:500}], false)');
ok(h.subtotal === 500, 'qty/harga bukan angka atau negatif dianggap 0');
h = run('hitungTotalBill([{qty:1,harga:100000}], true)');
ok(h.ppn === run('hitungPpn(100000)'), 'tarif kosong memakai tarif standar');

console.log('[nomorBillBerikut]');
ok(run('billList=[]; nomorBillBerikut(2026)') === 'BILL-2026-001', 'daftar kosong -> 001');
ok(run('billList=[{noBill:"BILL-2026-004"},{noBill:"BILL-2026-002"},{noBill:"INV-2026-009"}]; nomorBillBerikut(2026)') === 'BILL-2026-005', 'ambil terbesar jenis BILL saja');
ok(run('nomorBillBerikut(2027)') === 'BILL-2027-001', 'tahun lain mulai lagi dari 001');

console.log('[form] id di 29-bill-ui.js ada di index.html');
const html = rd('index.html'), ui = rd('js/29-bill-ui.js');
const ids = [...new Set([...ui.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]))];
ids.forEach(id => ok(html.includes('id="' + id + '"'), '#' + id));
ok(/<script defer src="js\/28-bill\.js"><\/script>\s*<script defer src="js\/29-bill-ui\.js">/.test(html), 'urutan script 28 lalu 29');
ok(html.includes('onclick="openModalBill()"') && html.includes("openSimplePicker('bill-akun-utang'"), 'tombol buka form dan picker akun utang terpasang');
ok(!/\b(billList\.push|cloudSyncRecords|jurnalEntries)/.test(ui), 'form belum menyimpan dan belum membuat jurnal (4.3)');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
