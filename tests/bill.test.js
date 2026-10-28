// Tes js/28-bill.js (hitung total, nomor, susun record, penyimpan) dan js/29-bill-ui.js (simpan, daftar, hapus)
// beserta keterkaitannya dengan index.html dan file lama (tasks 4.3-4.4).
// Jalankan: node tests/bill.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const utils = rd('js/02-utils.js');
const ppnSrc = utils.match(/const PPN_TARIF_STANDAR[^\n]*\n/)[0] + utils.match(/function hitungPpn[\s\S]*?\n}\n/)[0];
const ls = { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); } };
const ctx = { localStorage: ls, console };
vm.createContext(ctx);
vm.runInContext(ppnSrc, ctx);
const pen = rd('js/23-penomoran.js');
vm.runInContext(['parseNomor', 'nomorBerikut', 'counterSetelahPakai'].map(n => pen.match(new RegExp('function ' + n + '[\\s\\S]*?\\n}\\n'))[0]).join('\n') + '\nlet counterList = [];', ctx);
vm.runInContext(utils.match(/function escapeHtml[\s\S]*?\n}\n/)[0] + utils.match(/function escapeForJsAttr[\s\S]*?\n}\n/)[0], ctx);
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

console.log('[nomorBillBerikut] memakai counter (task 4.4)');
run('billList=[]; counterList=[{id:"BILL-2026",jenis:"BILL",tahun:2026,terakhir:7}]');
ok(run('nomorBillBerikut(2026)') === 'BILL-2026-008', 'bill terakhir dihapus: nomor tidak dipakai lagi (counter 7 -> 008)');
ok(run('billList=[{noBill:"BILL-2026-012"}]; nomorBillBerikut(2026)') === 'BILL-2026-013', 'bill ada lebih tinggi dari counter: ikut yang tertinggi');
ok(run('counterList=[{id:"INV-2026",jenis:"INV",tahun:2026,terakhir:50}]; billList=[]; nomorBillBerikut(2026)') === 'BILL-2026-001', 'counter INV tidak mempengaruhi BILL');
run('counterList=[]; billList=[]');

console.log('[susunBill] validasi dan bentuk record');
const form = (o) => Object.assign({ noBill: 'bill-2026-001', supplier: ' PT Maju ', tanggal: '2026-10-01', jatuhTempo: '2026-10-31', deskripsi: ' beli ',
  items: [{ nama: ' Kertas ', qty: 2, harga: 50000, akun: '1301' }, { nama: '', qty: 1, harga: 0, akun: '1301' }, { nama: 'x', qty: 0, harga: 500, akun: '1301' }],
  ppnAktif: true, ppnTarif: 11, akunUtang: '2101', status: 'diterima' }, o || {});
ctx.__f = form(); ctx.__nos = ['BILL-2026-000'];
let r = run('susunBill(__f, __nos)');
ok(r.ok && r.bill.noBill === 'BILL-2026-001' && r.bill.supplier === 'PT Maju' && r.bill.deskripsi === 'beli', 'valid: nomor dikapitalkan, teks dirapikan');
ok(r.bill.items.length === 1 && r.bill.items[0].nama === 'Kertas' && r.bill.items[0].akun === '1301', 'baris kosong (qty atau harga 0) dibuang');
ok(r.bill.subtotal === 100000 && r.bill.ppn === 11000 && r.bill.total === 111000 && r.bill.sisaTagihan === 111000, 'total dan sisaTagihan awal = total');
ok(r.bill.ppnTarif === 11 && r.bill.status === 'diterima' && r.bill.akunUtang === '2101', 'ppnTarif, status, akunUtang tersimpan');
ok(/^BILL_\d+$/.test(r.bill.id) && !isNaN(Date.parse(r.bill.createdAt)), 'id BILL_<timestamp> dan createdAt ISO dibuat otomatis');
ok(JSON.stringify(Object.keys(r.bill).sort()) === JSON.stringify(['akunUtang','createdAt','deskripsi','id','items','jatuhTempo','noBill','ppn','ppnTarif','sisaTagihan','status','subtotal','supplier','tanggal','total']), 'bentuk record sesuai SCHEMA 4.5b (+ ppnTarif)');
ctx.__f = form({ ppnAktif: false }); r = run('susunBill(__f, [])');
ok(r.ok && r.bill.ppn === 0 && r.bill.ppnTarif === 0 && r.bill.total === 100000, 'tanpa PPN: ppn dan ppnTarif 0');
ctx.__f = form({ ppnTarif: undefined }); r = run('susunBill(__f, [])');
ok(r.ok && r.bill.ppn === 11000 && r.bill.ppnTarif === 11, 'PPN tanpa tarif: tarif standar');
ctx.__f = form({ id: 'BILL_9', createdAt: '2026-01-01T00:00:00.000Z' }); r = run('susunBill(__f, [])');
ok(r.ok && r.bill.id === 'BILL_9' && r.bill.createdAt === '2026-01-01T00:00:00.000Z', 'id dan createdAt yang diberikan dipertahankan');
const gagal = (o, nos, kata, m) => { ctx.__f = form(o); ctx.__nos = nos || []; const x = run('susunBill(__f, __nos)'); ok(x.ok === false && x.pesan.toLowerCase().includes(kata), m + (x.ok ? ' (malah lolos)' : '')); };
gagal({ supplier: '  ' }, [], 'supplier', 'supplier kosong ditolak');
gagal({ noBill: '' }, [], 'nomor', 'nomor kosong ditolak');
gagal({}, ['bill-2026-001'], 'sudah dipakai', 'nomor kembar ditolak (tidak peka huruf besar/kecil)');
gagal({ tanggal: '' }, [], 'tanggal', 'tanggal kosong ditolak');
gagal({ tanggal: '01/10/2026' }, [], 'tanggal', 'format tanggal salah ditolak');
gagal({ jatuhTempo: '2026-09-30' }, [], 'jatuh tempo', 'jatuh tempo sebelum tanggal ditolak');
gagal({ items: [] }, [], 'item', 'tanpa item ditolak');
gagal({ items: [{ nama: 'a', qty: 0, harga: 100, akun: '1301' }, null] }, [], 'item', 'semua baris kosong ditolak');
gagal({ items: [{ qty: '2', harga: 100, akun: '1301' }] }, [], 'item', 'qty berupa teks tidak dihitung');
gagal({ status: 'lunas' }, [], 'status', 'status lain dari draft/diterima ditolak');
gagal({ akunUtang: '' }, [], 'utang', 'diterima tanpa akun utang ditolak');
gagal({ items: [{ nama: 'a', qty: 1, harga: 100, akun: '' }] }, [], 'akun', 'diterima dengan item tanpa akun ditolak');
ctx.__f = form({ status: 'draft', akunUtang: '', items: [{ nama: 'a', qty: 1, harga: 100, akun: '' }] }); r = run('susunBill(__f, [])');
ok(r.ok && r.bill.status === 'draft' && r.bill.akunUtang === '', 'draft boleh belum punya akun');
ok(run('susunBill(null, null)').ok === false && run('susunBill()').ok === false, 'masukan null/undefined tidak error');
ctx.__f = form(); const sebelum = JSON.stringify(ctx.__f); run('susunBill(__f, [])');
ok(JSON.stringify(ctx.__f) === sebelum, 'masukan tidak diubah');

console.log('[penyimpan] mode tamu dan bisnis login');
run('billList=[]; counterList=[]');
ctx.__b1 = run('susunBill(__f, [])').bill;
ok(typeof run('tambahBill(__b1)').then === 'function', 'tambahBill mengembalikan Promise');
ok(run('billList.length') === 1 && run('billList[0].id') === ctx.__b1.id, 'bill baru ada di paling atas daftar');
ok(run('counterList.length') === 1 && run('counterList[0].id') === 'BILL-2026' && run('counterList[0].terakhir') === 1, 'counter BILL-2026 naik ke 1');
ok(JSON.parse(ls._s['oas_bill']).length === 1 && JSON.parse(ls._s['oas_counter'])[0].terakhir === 1, 'mode tamu: ditulis ke oas_bill dan oas_counter');
ctx.__f2 = form({ noBill: 'BILL-2026-002' }); ctx.__b2 = run('susunBill(__f2, [])').bill; ctx.__b2.id = 'BILL_2';
run('tambahBill(__b2)');
ok(run('billList.map(b=>b.noBill).join()') === 'BILL-2026-002,BILL-2026-001' && run('nomorBillBerikut(2026)') === 'BILL-2026-003', 'urutan terbaru di atas; nomor berikutnya 003');
ok(run('hapusBillById("BILL_2")') === true && run('billList.length') === 1 && JSON.parse(ls._s['oas_bill']).length === 1, 'hapusBillById: terhapus dan tersimpan');
ok(run('nomorBillBerikut(2026)') === 'BILL-2026-003', 'bill terakhir dihapus: nomor 002 tidak dipakai lagi (counter)');
ok(run('hapusBillById("tidak-ada")') === false, 'id tidak ditemukan: false');
// bisnis login
const sync = [];
ctx.currentCompany = { id: 'c1' }; ctx.cloudSyncRecords = k => { sync.push(k.join()); return Promise.resolve(true); };
ls._s = {};
ctx.__f3 = form({ noBill: 'BILL-2026-010' }); ctx.__b3 = run('susunBill(__f3, [])').bill;
run('tambahBill(__b3)');
ok(sync.join('|') === 'bill,counter', 'bisnis login: cloudSyncRecords([bill, counter]) sekali');
ok(!('oas_bill' in ls._s) && !('oas_counter' in ls._s), 'bisnis login: key global tidak ikut ditulis');
run('hapusBillById(__b3.id)');
ok(sync.length === 2 && sync[1] === 'bill,counter', 'hapus di bisnis login ikut disinkron');
delete ctx.currentCompany; delete ctx.cloudSyncRecords;

console.log('[daftar] renderBillList, hapusBill, simpanBill (stub DOM)');
const els = {}; const el = id => els[id] || (els[id] = { value: '', checked: false, innerHTML: '', style: {} });
const alerts = []; let confirmAns = true, viewer = false, closed = [];
Object.assign(ctx, {
  document: { getElementById: el }, rp: n => 'Rp ' + (Math.round(n) || 0).toLocaleString('id-ID'),
  showAlert: m => alerts.push(m), closeModal: id => closed.push(id), confirm: () => confirmAns,
  guardHanyaBaca: () => viewer, upgradeFormPickers() {}
});
vm.runInContext(rd('js/29-bill-ui.js'), ctx);
run('billList=[]; counterList=[]'); ls._s = {};
run('renderBillList()');
ok(/Belum ada tagihan/.test(el('bill-body').innerHTML), 'daftar kosong: pesan kosong');
ctx.__x = { id: "BILL_<1>'", noBill: 'BILL-2026-001', supplier: '<script>alert(1)</script>', tanggal: '2026-10-01', jatuhTempo: '2000-01-01', total: 111000, sisaTagihan: 111000, status: 'diterima' };
ctx.__y = { id: 'BILL_Y', noBill: 'BILL-2026-002', supplier: 'PT Lunas', tanggal: '2026-10-02', jatuhTempo: '2000-01-01', total: 5000, sisaTagihan: 0, status: 'lunas' };
ctx.__z = { id: 'BILL_Z', noBill: 'BILL-2026-003', supplier: 'PT Draft', tanggal: '2026-10-03', jatuhTempo: '2000-01-01', total: 1000, sisaTagihan: 1000, status: 'draft' };
run('billList=[__x,__y,__z]; renderBillList()');
const html2 = el('bill-body').innerHTML;
ok(html2.includes('BILL-2026-001') && html2.includes('Rp 111.000') && html2.includes('PT Lunas'), 'daftar menampilkan nomor, total, supplier');
ok(!html2.includes('<script>') && html2.includes('&lt;script&gt;'), 'nama supplier di-escape (XSS)');
ok(html2.includes("hapusBill('BILL_&lt;1&gt;\\&#39;')") && !html2.includes("hapusBill('BILL_<"), 'id di atribut onclick di-escape (kutip dan <>)');
ok((html2.match(/Jatuh Tempo<\/span>/g) || []).length === 1, 'jatuh tempo hanya untuk bill diterima yang belum lunas (lunas dan draft tidak)');
ok((html2.match(/hapusBill\(/g) || []).length === 3 && html2.includes('id="bill-table"'), 'satu baris (dengan tombol hapus) per bill');
// hapusBill
viewer = true; run('hapusBill("BILL_Y")');
ok(run('billList.length') === 3, 'viewer: hapus diblokir');
viewer = false; confirmAns = false; run('hapusBill("BILL_Y")');
ok(run('billList.length') === 3, 'konfirmasi dibatalkan: tidak terhapus');
confirmAns = true; run('hapusBill("BILL_Y")');
ok(run('billList.map(b=>b.id).join()') === "BILL_<1>',BILL_Z" && !el('bill-body').innerHTML.includes('PT Lunas'), 'hapus: hilang dari state dan tampilan');
// simpanBill
run('billList=[]; counterList=[]; _billItems=[{nama:"Kertas",qty:2,harga:50000,akun:"1301"}]');
Object.assign(el('bill-no'), { value: 'BILL-2026-001' }); Object.assign(el('bill-supplier'), { value: 'PT Maju' });
Object.assign(el('bill-tgl'), { value: '2026-10-01' }); Object.assign(el('bill-jatuh-tempo'), { value: '2026-10-31' });
Object.assign(el('bill-akun-utang'), { value: '2101' }); el('bill-ppn-check').checked = true; el('bill-ppn-tarif').value = '11'; el('bill-deskripsi').value = '';
alerts.length = 0; closed.length = 0;
viewer = true; run('simpanBill("diterima")');
ok(run('billList.length') === 0 && closed.length === 0, 'viewer: simpan diblokir');
viewer = false; el('bill-supplier').value = '';
run('simpanBill("diterima")');
ok(run('billList.length') === 0 && closed.length === 0 && alerts.length === 1 && /supplier/i.test(alerts[0]), 'form tidak valid: tidak menyimpan, modal tetap terbuka, ada pesan');
el('bill-supplier').value = 'PT Maju'; alerts.length = 0;
run('simpanBill("diterima")');
ok(run('billList.length') === 1 && run('billList[0].total') === 111000 && run('billList[0].status') === 'diterima', 'Simpan & Diterima: tersimpan dengan total + PPN 11%');
ok(closed.join() === 'modal-bill' && /BILL-2026-001/.test(alerts[0]) && /4\.6/.test(alerts[0]), 'modal ditutup; pesan menyebut jurnal belum dibuat');
ok(/PT Maju/.test(el('bill-body').innerHTML), 'daftar langsung diperbarui');
el('bill-no').value = 'BILL-2026-002'; alerts.length = 0; run('simpanBill("draft")');
ok(run('billList[0].status') === 'draft' && !/4\.6/.test(alerts[0]), 'Simpan Draft: status draft, tanpa catatan jurnal');
el('bill-no').value = 'BILL-2026-002'; alerts.length = 0; run('simpanBill("draft")');
ok(run('billList.length') === 2 && /sudah dipakai/.test(alerts[0]), 'nomor kembar ditolak');

console.log('[pemasangan] hook ke file lama');
const nav = rd('js/04-navigasi-tema.js'), sto = rd('js/15-storage.js'), cr = rd('js/22-cloud-records.js');
ok(/if\(id==='bill'\)\s*renderBillList\(\)/.test(nav), 'showPage("bill") merender daftar');
ok(sto.includes("resetCounterJenis('BILL')") && sto.includes("'renderBillList'"), 'doResetAll: counter BILL direset dan daftar dirender ulang');
ok(/bill:\s*\{.*legacyKey:\s*'oas_bill'.*legacyOnce:\s*true/.test(cr) && cr.includes("bill: 'Tagihan pembelian'"), 'cloud-records: oas_bill dimigrasi sekali + label dialog');

console.log('[form] id di 29-bill-ui.js ada di index.html');
const html = rd('index.html'), ui = rd('js/29-bill-ui.js');
const ids = [...new Set([...ui.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]))];
ids.forEach(id => ok(html.includes('id="' + id + '"'), '#' + id));
ok(/<script defer src="js\/28-bill\.js"><\/script>\s*<script defer src="js\/29-bill-ui\.js">/.test(html), 'urutan script 28 lalu 29');
ok(html.includes('onclick="openModalBill()"') && html.includes("openSimplePicker('bill-akun-utang'"), 'tombol buka form dan picker akun utang terpasang');
ok(!/\b(jurnalEntries|postJurnal|addJurnal|saveToStorage)/.test(ui) && !/\b(jurnalEntries|postJurnal|addJurnal)/.test(rd('js/28-bill.js')), 'simpan bill belum membuat jurnal (jurnal baru di 4.5-4.6)');
ok(!/menyusul di task 4\.4|belum tersedia \(task 4\.4\)/.test(ui), 'placeholder simpanBill 4.3 sudah diganti');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
