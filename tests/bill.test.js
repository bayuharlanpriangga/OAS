// Tes js/28-bill.js (hitung total, nomor, susun record, penyimpan, jurnal bill) dan js/29-bill-ui.js (simpan, daftar, hapus)
// beserta keterkaitannya dengan index.html dan file lama (tasks 4.3-4.6c).
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
vm.runInContext(utils.match(/const JENIS_JURNAL = \{[\s\S]*?\n\};/)[0] + '\nvar akuns = [];\n' + utils.match(/function _tarifPpnJurnal[\s\S]*?\n}\n/)[0] + utils.match(/function ppnDariJurnal[\s\S]*?\n}\n/)[0], ctx);
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
// stub jurnal (task 4.6): jurnal dipasang lewat postJurnalLegacy, dibalik lewat buatJurnalPembalik asli
let periodeOk = true, jrnSeq = 1, tersimpan = 0;
const utilsSrc = rd('js/02-utils.js');
vm.runInContext(['const _REV_KET_RE[^\\n]*\\n', 'function getReversalOf[\\s\\S]*?\\n}\\n', 'function isJurnalPembalik[^\\n]*\\n', 'function getReversedMap[\\s\\S]*?\\n}\\n', 'function ketTanpaPrefixPembalik[^\\n]*\\n']
  .map(re => utilsSrc.match(new RegExp(re))[0]).join('\n') + '\nclass PeriodeTerkunciError extends Error {}\nvar jurnalEntries = [];', ctx);
vm.runInContext(rd('js/19-fitur-tambahan.js').match(/function buatJurnalPembalik[\s\S]*?\n}\n/)[0], ctx);
Object.assign(ctx, {
  guardPeriode: () => { if (!periodeOk) alerts.push('Periode dikunci'); return periodeOk; },
  postJurnalLegacy: e => { if (!periodeOk) return null; e.no = 'JRN-' + String(jrnSeq++).padStart(3, '0'); e.ket = e.keterangan; ctx.jurnalEntries.push(e); return e; },
  addJurnal: e => { e.no = 'JRN-' + String(jrnSeq++).padStart(3, '0'); ctx.jurnalEntries.push(e); },
  saveToStorage: () => { tersimpan++; }, fmtDate: d => d, markDirty() {}, jurnalCounter: 1
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
ok(closed.join() === 'modal-bill' && /BILL-2026-001/.test(alerts[0]) && /JRN-001/.test(alerts[0]), 'modal ditutup; pesan menyebut nomor jurnal yang dibuat');
ok(/PT Maju/.test(el('bill-body').innerHTML), 'daftar langsung diperbarui');
el('bill-no').value = 'BILL-2026-002'; alerts.length = 0; run('simpanBill("draft")');
ok(run('billList[0].status') === 'draft' && !/JRN-/.test(alerts[0]) && run('jurnalEntries.length') === 1 && !run('billList[0].jurnalNo'), 'Simpan Draft: status draft, tidak membuat jurnal');
el('bill-no').value = 'BILL-2026-002'; alerts.length = 0; run('simpanBill("draft")');
ok(run('billList.length') === 2 && /sudah dipakai/.test(alerts[0]), 'nomor kembar ditolak');

console.log('[jurnalBillStatus] dan tanggalPembalikBill (murni)');
const bX = { id: 'B1', noBill: 'BILL-2026-001', supplier: 'PT Maju', status: 'diterima', tanggal: '2026-10-01' };
const jX = (o) => Object.assign({ no: 'JRN-005', jenis: 'Tagihan Pembelian', ket: 'Tagihan BILL-2026-001 — PT Maju', tanggal: '2026-10-01', lines: [] }, o || {});
const st = (b, js, bs) => { ctx.__sb = b; ctx.__sj = js; ctx.__ss = bs; return run('jurnalBillStatus(__sb, __sj, __ss)'); };
ok(st({ ...bX, status: 'draft' }, [jX()]).status === 'tanpa' && st(null, []).status === 'tanpa', 'draft / null: tanpa jurnal');
ok(st(bX, []).status === 'belum' && st(bX, null).status === 'belum' && st(bX, [null, 5, 'x']).status === 'belum', 'diterima tanpa jurnal: belum (daftar kosong/null/sampah tidak error)');
ok(st(bX, [jX()]).status === 'aktif' && st(bX, [jX()]).jurnal.no === 'JRN-005', 'jurnal cocok dari ket: aktif');
ok(st({ ...bX, jurnalNo: 'JRN-005' }, [jX()]).status === 'aktif', 'jurnalNo cocok: aktif');
ok(st({ ...bX, jurnalNo: 'JRN-005' }, [jX({ jenis: 'Pembelian' })]).status === 'belum', 'jenis lain (Pembelian) tidak dianggap jurnal bill');
ok(st({ ...bX, jurnalNo: 'JRN-001' }, [jX({ no: 'JRN-001', ket: 'Tagihan BILL-2026-999 — PT Lain' })]).status === 'belum', 'nomor jurnal sama tetapi ket beda bill (nomor berulang setelah reset): belum');
ok(st(bX, [jX({ ket: 'Tagihan BILL-2026-001 — PT Lain' })]).status === 'belum', 'nomor bill sama tetapi supplier beda: belum');
ok(st(bX, [jX()], [{ id: 'B2', jurnalNo: 'JRN-005' }]).status === 'belum', 'jurnal sudah dipakai bill lain: tidak ditautkan lewat ket');
ok(st(bX, [jX()], [bX]).status === 'aktif', 'bill itu sendiri di daftarBill tidak menghalangi');
const pb = jX({ no: 'JRN-006', ket: '[Pembalik JRN-005] Tagihan BILL-2026-001 — PT Maju', reversalOf: 'JRN-005' });
ok(st(bX, [jX(), pb]).status === 'dibalik' && st(bX, [jX(), pb]).jurnal.no === 'JRN-005', 'ada jurnal pembalik: dibalik (jurnal pembalik tidak dihitung sebagai jurnal bill)');
const pb2 = jX({ no: 'JRN-006', ket: '[Pembalik JRN-005] Tagihan BILL-2026-001 — PT Maju' });
ok(st(bX, [jX(), pb2]).status === 'dibalik', 'pembalik dikenali dari awalan ket saja (data dari cloud tanpa reversalOf)');
const jBaru = jX({ no: 'JRN-010' });
ok(st(bX, [jX(), pb, jBaru]).status === 'aktif' && st(bX, [jX(), pb, jBaru]).jurnal.no === 'JRN-010', 'dibalik lalu dijurnal ulang: yang aktif dipilih');
ok(st({ ...bX, status: 'lunas' }, [jX()]).status === 'aktif', 'bill lunas tetap bisa punya jurnal aktif');
ok(run("tanggalPembalikBill('2026-10-01','2026-10-29')") === '2026-10-29' && run("tanggalPembalikBill('2026-11-05','2026-10-29')") === '2026-11-05' && run("tanggalPembalikBill('','2026-10-29')") === '2026-10-29' && run("tanggalPembalikBill(undefined,'2026-10-29')") === '2026-10-29', 'tanggalPembalikBill: hari ini, kecuali jurnal bertanggal lebih akhir');

console.log('[jurnal bill] simpan, Buat Jurnal, dan hapus (stub DOM + buatJurnalPembalik asli)');
const resetForm = (no) => {
  run('billList=[]; counterList=[]; jurnalEntries=[]; _billItems=[{nama:"Kertas",qty:2,harga:50000,akun:"1301"}]'); jrnSeq = 1; tersimpan = 0;
  el('bill-no').value = no; el('bill-supplier').value = 'PT Maju'; el('bill-tgl').value = '2026-10-01'; el('bill-jatuh-tempo').value = '2026-10-31';
  el('bill-akun-utang').value = '2101'; el('bill-ppn-check').checked = true; el('bill-ppn-tarif').value = '11';
  alerts.length = 0; closed.length = 0; periodeOk = true; viewer = false; confirmAns = true;
};
resetForm('BILL-2026-001');
run('simpanBill("diterima")');
ok(run('jurnalEntries.length') === 1 && run('billList[0].jurnalNo') === 'JRN-001', 'simpan diterima: 1 jurnal dibuat, bill.jurnalNo = JRN-001');
const jr = run('jurnalEntries[0]');
ok(jr.jenis === 'Tagihan Pembelian' && jr.lines.length === 3 && jr.lines[2].akun === '2101' && jr.lines[2].kredit === 111000, 'jurnal: Dr 1301 + Dr PPN Masukan, Cr 2101 = 111.000');
ok(jr.lines.reduce((x, l) => x + l.debit, 0) === jr.lines.reduce((x, l) => x + l.kredit, 0), 'jurnal seimbang');
ok(jr.ket === 'Tagihan BILL-2026-001 — PT Maju' && tersimpan === 1, 'ket dari keterangan (dibaca postJurnalLegacy) dan saveToStorage dipanggil');
ok(run('jurnalBillStatus(billList[0], jurnalEntries, billList).status') === 'aktif' && /JRN-001/.test(el('bill-body').innerHTML) && !/Buat Jurnal/.test(el('bill-body').innerHTML), 'daftar menampilkan JRN-001 tanpa tombol Buat Jurnal');

resetForm('BILL-2026-001'); periodeOk = false;
run('simpanBill("diterima")');
ok(run('billList.length') === 0 && run('jurnalEntries.length') === 0 && closed.length === 0 && alerts.some(a => /dikunci/.test(a)), 'periode terkunci: bill tidak tersimpan setengah jadi, modal tetap terbuka');

resetForm('BILL-2026-001'); viewer = true;
run('simpanBill("diterima")');
ok(run('billList.length') === 0 && run('jurnalEntries.length') === 0, 'viewer: tidak ada bill dan tidak ada jurnal');

resetForm('BILL-2026-001'); el('bill-ppn-check').checked = false; el('bill-akun-utang').value = '';
run('simpanBill("diterima")');
ok(run('billList.length') === 0 && run('jurnalEntries.length') === 0 && /Utang Usaha/.test(alerts[0]), 'akun utang kosong: ditolak sebelum jurnal');

// bill diterima lama (dari task 4.4) tanpa jurnal
resetForm('BILL-2026-001');
ctx.__lama = { id: 'BILL_LAMA', noBill: 'BILL-2026-001', supplier: 'PT Maju', tanggal: '2026-10-01', jatuhTempo: '2026-10-31', status: 'diterima', akunUtang: '2101',
  items: [{ nama: 'Kertas', qty: 2, harga: 50000, akun: '1301' }], subtotal: 100000, ppn: 11000, ppnTarif: 11, total: 111000, sisaTagihan: 111000 };
run('billList=[__lama]; renderBillList()');
ok(/Buat Jurnal/.test(el('bill-body').innerHTML) && /belum dijurnal/.test(el('bill-body').innerHTML), 'bill diterima tanpa jurnal: tombol Buat Jurnal + keterangan belum dijurnal');
confirmAns = false; run('buatJurnalUntukBill("BILL_LAMA")');
ok(run('jurnalEntries.length') === 0, 'konfirmasi dibatalkan: tidak ada jurnal');
confirmAns = true; viewer = true; run('buatJurnalUntukBill("BILL_LAMA")');
ok(run('jurnalEntries.length') === 0, 'viewer: Buat Jurnal diblokir');
viewer = false; periodeOk = false; run('buatJurnalUntukBill("BILL_LAMA")');
ok(run('jurnalEntries.length') === 0 && !run('billList[0].jurnalNo'), 'periode terkunci: tidak ada jurnal, jurnalNo kosong');
periodeOk = true; alerts.length = 0; ls._s = {};
run('buatJurnalUntukBill("BILL_LAMA")');
ok(run('jurnalEntries.length') === 1 && run('billList[0].jurnalNo') === 'JRN-001' && /JRN-001/.test(alerts[0]), 'Buat Jurnal: jurnal dibuat dan jurnalNo tersimpan di bill');
ok(JSON.parse(ls._s['oas_bill'])[0].jurnalNo === 'JRN-001', 'jurnalNo ikut tertulis ke penyimpanan (mode tamu: oas_bill)');
alerts.length = 0; run('buatJurnalUntukBill("BILL_LAMA")');
ok(run('jurnalEntries.length') === 1 && /sudah punya jurnal/.test(alerts[0]), 'dipanggil lagi: tidak ada jurnal ganda');
// jurnalNo hilang tetapi jurnal ada (simpan bill gagal tengah jalan): ditautkan ulang, tidak digandakan
run('delete billList[0].jurnalNo'); alerts.length = 0;
run('buatJurnalUntukBill("BILL_LAMA")');
ok(run('jurnalEntries.length') === 1, 'tanpa jurnalNo tetapi jurnal ada: tidak digandakan');
ok(run('billList[0].status') === 'diterima' && !/Buat Jurnal/.test(el('bill-body').innerHTML), 'setelah itu daftar tanpa tombol Buat Jurnal');

// hapus bill yang sudah dijurnal -> jurnal pembalik
alerts.length = 0; confirmAns = false;
run('hapusBill("BILL_LAMA")');
ok(run('billList.length') === 1 && run('jurnalEntries.length') === 1, 'konfirmasi dibatalkan: bill dan jurnal utuh');
confirmAns = true; viewer = true; run('hapusBill("BILL_LAMA")');
ok(run('billList.length') === 1 && run('jurnalEntries.length') === 1, 'viewer: hapus diblokir');
viewer = false; periodeOk = false; run('hapusBill("BILL_LAMA")');
ok(run('billList.length') === 1 && run('jurnalEntries.length') === 1, 'periode terkunci: bill tetap ada, tidak ada pembalik');
periodeOk = true; alerts.length = 0;
run('hapusBill("BILL_LAMA")');
ok(run('billList.length') === 0 && run('jurnalEntries.length') === 2, 'hapus: bill hilang, 1 jurnal pembalik ditambahkan (jurnal asal tidak dihapus)');
const pbl = run('jurnalEntries[1]');
ok(pbl.reversalOf === 'JRN-001' && /^\[Pembalik JRN-001\]/.test(pbl.ket) && /dihapus/.test(pbl.ket), 'pembalik menaut ke JRN-001 dan menyebut alasan');
ok(pbl.lines.length === 3 && pbl.lines[0].akun === '2101' && pbl.lines[0].debit === 111000 && pbl.lines[1].kredit === 100000 && pbl.lines[2].kredit === 11000, 'pembalik: debit/kredit tertukar dan baris debit (Utang Usaha) ditulis paling atas');
ok(pbl.lines.every((l, i, a) => i === 0 || !(l.debit > 0 && !(a[i - 1].debit > 0))), 'pembalik: semua baris debit di atas baris kredit');
ctx.__asalAcak = { no: 'JRN-900', tanggal: '2026-10-01', ket: 'x', jenis: 'Manual', lines: [{ akun: '5101', debit: 10, kredit: 0 }, { akun: '1101', debit: 0, kredit: 30 }, { akun: '5102', debit: 20, kredit: 0 }] };
const pAcak = run('buatJurnalPembalik(__asalAcak, {tanggal:"2026-10-29", alasan:"uji urutan"})');
ok(pAcak.lines.map(l => l.akun).join() === '1101,5101,5102' && pAcak.lines[0].debit === 30 && pAcak.lines[1].kredit === 10, 'pembalik jurnal asal sembarang: debit dulu, urutan relatif tiap kelompok tetap');
ok(run('getReversedMap().get("JRN-001")') === pbl.no, 'peta pembalik mengenali JRN-001 sudah dibalik');
ok(/jurnalnya dibalik/.test(alerts.join()), 'pesan menyebut jurnal dibalik');

// bill tanpa jurnal / draft / jurnal sudah dibalik: hapus biasa tanpa pembalik
resetForm('BILL-2026-001');
run('simpanBill("draft")'); run('hapusBill(billList[0].id)');
ok(run('billList.length') === 0 && run('jurnalEntries.length') === 0, 'draft: hapus biasa, tanpa jurnal pembalik');
resetForm('BILL-2026-001');
run('simpanBill("diterima")');
run('buatJurnalPembalik(jurnalEntries[0], {tanggal:"2026-10-29", alasan:"koreksi manual"})');
run('renderBillList()');
ok(run('jurnalBillStatus(billList[0], jurnalEntries, billList).status') === 'dibalik' && /dibalik/.test(el('bill-body').innerHTML) && /Buat Jurnal/.test(el('bill-body').innerHTML), 'jurnal dibalik manual dari Jurnal Umum: daftar menandai (dibalik) dan boleh dijurnal ulang');
run('hapusBill(billList[0].id)');
ok(run('billList.length') === 0 && run('jurnalEntries.length') === 2, 'hapus bill yang jurnalnya sudah dibalik: tidak membuat pembalik kedua');
// tanggal bill setelah hari ini: tanggal pembalik tidak lebih awal dari jurnal asal
resetForm('BILL-2026-001'); el('bill-tgl').value = '2099-01-01'; el('bill-jatuh-tempo').value = '2099-02-01';
run('simpanBill("diterima")');
run('hapusBill(billList[0].id)');
ok(run('billList.length') === 0 && run('jurnalEntries.length') === 2 && run('jurnalEntries[1].tanggal') === '2099-01-01', 'bill bertanggal masa depan: pembalik bertanggal sama dengan jurnal asal (bukan ditolak)');

console.log('[edit draft] bisaEditBill, formDariBill, perbaruiBill (murni)');
const draftA = () => ({ id: 'D1', noBill: 'BILL-2026-001', supplier: 'PT Lama', tanggal: '2026-10-01', jatuhTempo: '2026-10-31', deskripsi: 'awal',
  items: [{ nama: 'Kertas', qty: 2, harga: 50000, akun: '1301' }], subtotal: 100000, ppn: 11000, ppnTarif: 11, total: 111000, sisaTagihan: 111000,
  status: 'draft', akunUtang: '2101', createdAt: '2026-10-01T03:00:00.000Z' });
ok(run('bisaEditBill({status:"draft"})') === true && run('bisaEditBill({status:"diterima"})') === false && run('bisaEditBill({status:"lunas"})') === false && run('bisaEditBill(null)') === false && run('bisaEditBill()') === false, 'bisaEditBill: hanya draft');
ctx.__d = draftA(); let fm = run('formDariBill(__d)');
ok(fm.id === 'D1' && fm.noBill === 'BILL-2026-001' && fm.supplier === 'PT Lama' && fm.tanggal === '2026-10-01' && fm.jatuhTempo === '2026-10-31' && fm.deskripsi === 'awal' && fm.akunUtang === '2101' && fm.createdAt === '2026-10-01T03:00:00.000Z', 'formDariBill: field dasar terbawa');
ok(fm.ppnAktif === true && fm.ppnTarif === 11 && fm.items.length === 1 && fm.items[0].nama === 'Kertas' && fm.items[0].akun === '1301', 'formDariBill: PPN aktif dengan tarif record, item terbawa');
fm.items[0].qty = 99; ok(ctx.__d.items[0].qty === 2, 'formDariBill: item disalin, record asal tidak ikut berubah');
ctx.__d = { ...draftA(), ppn: 0, ppnTarif: 0, items: [{ nama: 'x', qty: 1, harga: 5 }] }; fm = run('formDariBill(__d)');
ok(fm.ppnAktif === false && fm.ppnTarif === run('PPN_TARIF_STANDAR') && fm.items[0].akun === '', 'formDariBill: tanpa PPN -> ppnAktif false, tarif standar; akun kosong tetap string kosong');
ok(run('formDariBill(null).items.length') === 0 && run('formDariBill().ppnAktif') === false && run('formDariBill({items:[null,5,{nama:"a",qty:1,harga:2}]}).items.length') === 1, 'formDariBill: null/sampah tidak error');
// susunBill dengan id + createdAt dari form edit tidak mengganti keduanya, dan nomor sendiri tidak dianggap kembar
ctx.__f = { ...run('formDariBill(__d)'), status: 'draft' }; ctx.__f.items = [{ nama: 'Kertas', qty: 2, harga: 50000, akun: '1301' }];
ctx.__nos = ['BILL-2026-002'];
r = run('susunBill(__f, __nos)');
ok(r.ok && r.bill.id === 'D1' && r.bill.createdAt === '2026-10-01T03:00:00.000Z', 'susunBill: id dan createdAt dari draft dipertahankan');
run('billList=[]; counterList=[]'); ls._s = {};
ctx.__d1 = draftA(); ctx.__d2 = { ...draftA(), id: 'D2', noBill: 'BILL-2026-002' };
run('billList=[__d1,__d2]');
ctx.__e = { ...draftA(), supplier: 'PT Baru', noBill: 'BILL-2026-007' };
ok(run('perbaruiBill(__e)') === true && run('billList.map(b=>b.id).join()') === 'D1,D2' && run('billList[0].supplier') === 'PT Baru' && run('billList.length') === 2, 'perbaruiBill: diganti di posisi yang sama, jumlah tetap');
ok(JSON.parse(ls._s['oas_bill'])[0].supplier === 'PT Baru' && run('counterList[0].terakhir') === 7, 'perbaruiBill: tersimpan (mode tamu) dan counter naik ke nomor yang diubah');
ok(run('perbaruiBill({id:"X"})') === false && run('perbaruiBill(null)') === false && run('perbaruiBill()') === false && run('billList.length') === 2, 'perbaruiBill: id tidak ada / null -> false, daftar utuh');
const sync2 = []; ctx.currentCompany = { id: 'c1' }; ctx.cloudSyncRecords = k => { sync2.push(k.join()); return Promise.resolve(true); };
run('perbaruiBill(__e)');
ok(sync2.join('|') === 'bill,counter', 'perbaruiBill: bisnis login menyinkron bill + counter');
delete ctx.currentCompany; delete ctx.cloudSyncRecords;

console.log('[edit draft] editBill dan simpanBill mode edit (stub DOM)');
ctx.akuns = [{ kode: '1301', nama: 'Persediaan Barang Dagangan', tipe: 'Aset' }, { kode: '2101', nama: 'Utang Usaha', tipe: 'Liabilitas' }];
ctx.kontakList = []; ctx.setTimeout = () => {}; const dibuka = []; ctx.openModal = id => dibuka.push(id);
el('bill-akun-utang-btn').classList = { add() {}, remove() {} };
const resetEdit = (extra) => {
  ctx.__d1 = draftA(); ctx.__d2 = { ...draftA(), id: 'D2', noBill: 'BILL-2026-002' };
  run(extra ? 'billList=[__d1,__d2]' : 'billList=[__d1]'); run('counterList=[]; jurnalEntries=[]; _billEditId=null; _billItems=[]');
  jrnSeq = 1; tersimpan = 0; alerts.length = 0; closed.length = 0; dibuka.length = 0; periodeOk = true; viewer = false; confirmAns = true; ls._s = {};
};
resetEdit(); viewer = true; run('editBill("D1")');
ok(dibuka.length === 0 && run('_billEditId') === null, 'viewer: edit diblokir');
viewer = false; run('editBill("tidak-ada")');
ok(dibuka.length === 0 && run('_billEditId') === null && alerts.length === 0, 'id tidak ditemukan: tidak terjadi apa-apa');
run('billList[0].status = "diterima"'); run('editBill("D1")');
ok(dibuka.length === 0 && run('_billEditId') === null && /Draft/.test(alerts[0]), 'bill diterima: tidak bisa diedit, ada pesan');
resetEdit(); run('editBill("D1")');
ok(dibuka.join() === 'modal-bill' && run('_billEditId') === 'D1', 'draft: modal dibuka dalam mode edit');
ok(el('bill-no').value === 'BILL-2026-001' && el('bill-supplier').value === 'PT Lama' && el('bill-tgl').value === '2026-10-01' && el('bill-jatuh-tempo').value === '2026-10-31' && el('bill-deskripsi').value === 'awal' && el('bill-akun-utang').value === '2101', 'form terisi dari draft (nomor, supplier, tanggal, jatuh tempo, keterangan, akun utang)');
ok(el('bill-ppn-check').checked === true && el('bill-ppn-tarif').value === '11' && run('_billItems.length') === 1 && run('_billItems[0].nama') === 'Kertas' && /Kertas/.test(el('bill-items-list').innerHTML), 'form terisi: PPN, tarif, dan item');
ok(el('bill-modal-judul').textContent === 'Edit Tagihan BILL-2026-001', 'judul modal menyebut tagihan yang diedit');
ok(run('_billItems[0]') !== run('billList[0].items[0]'), 'item di form adalah salinan (Batal tidak mengubah draft)');

// simpan ulang sebagai draft
el('bill-supplier').value = 'PT Baru'; el('bill-deskripsi').value = 'diubah'; run('_billItems[0].qty = 3');
alerts.length = 0; run('simpanBill("draft")');
ok(run('billList.length') === 1 && run('billList[0].id') === 'D1' && run('billList[0].supplier') === 'PT Baru' && run('billList[0].deskripsi') === 'diubah', 'edit draft -> draft: diganti di tempat, tidak jadi bill kedua');
ok(run('billList[0].total') === 166500 && run('billList[0].sisaTagihan') === 166500 && run('billList[0].status') === 'draft', 'total dan sisa dihitung ulang (3 x 50.000 + PPN 11%)');
ok(run('billList[0].createdAt') === '2026-10-01T03:00:00.000Z' && run('billList[0].noBill') === 'BILL-2026-001', 'createdAt dan nomor yang sama tidak dianggap kembar');
ok(run('jurnalEntries.length') === 0 && !run('billList[0].jurnalNo') && closed.join() === 'modal-bill' && /diperbarui/.test(alerts[0]) && run('_billEditId') === null, 'draft tetap tanpa jurnal; modal ditutup; pesan "diperbarui"; mode edit selesai');
ok(JSON.parse(ls._s['oas_bill'])[0].supplier === 'PT Baru', 'perubahan tertulis ke penyimpanan');

// draft -> diterima: inilah jalan draft ke jurnal
resetEdit(); run('editBill("D1")'); alerts.length = 0;
run('simpanBill("diterima")');
ok(run('billList.length') === 1 && run('billList[0].id') === 'D1' && run('billList[0].status') === 'diterima' && run('billList[0].jurnalNo') === 'JRN-001', 'draft -> Diterima: bill yang sama berstatus diterima dan bernomor jurnal');
ok(run('jurnalEntries.length') === 1 && run('jurnalEntries[0].jenis') === 'Tagihan Pembelian' && run('jurnalEntries[0].lines.reduce((x,l)=>x+l.kredit,0)') === 111000, 'tepat 1 jurnal utang dibuat, nilainya total bill');
ok(run('billList[0].createdAt') === '2026-10-01T03:00:00.000Z' && /JRN-001/.test(alerts[0]) && /diperbarui/.test(alerts[0]), 'createdAt tetap; pesan menyebut jurnal');
ok(run('jurnalBillStatus(billList[0], jurnalEntries, billList).status') === 'aktif' && !/editBill\(/.test(el('bill-body').innerHTML), 'daftar: jurnal aktif dan tombol edit hilang setelah diterima');

// gagal: periode terkunci -> draft utuh, modal tetap terbuka
resetEdit(); run('editBill("D1")'); el('bill-supplier').value = 'PT Baru'; periodeOk = false; alerts.length = 0;
run('simpanBill("diterima")');
ok(run('billList[0].status') === 'draft' && run('billList[0].supplier') === 'PT Lama' && run('jurnalEntries.length') === 0 && closed.length === 0 && run('_billEditId') === 'D1', 'periode terkunci: draft tidak berubah, tanpa jurnal, modal tetap terbuka');
periodeOk = true; run('simpanBill("diterima")');
ok(run('billList[0].status') === 'diterima' && run('billList[0].supplier') === 'PT Baru' && run('jurnalEntries.length') === 1, 'setelah kunci dibuka, simpan ulang berhasil (1 jurnal)');

// validasi
resetEdit(true); run('editBill("D1")'); el('bill-no').value = 'BILL-2026-002'; alerts.length = 0;
run('simpanBill("draft")');
ok(run('billList[0].noBill') === 'BILL-2026-001' && /sudah dipakai/.test(alerts[0]) && closed.length === 0, 'nomor diubah ke nomor bill lain: ditolak, draft utuh');
el('bill-no').value = 'BILL-2026-009'; el('bill-supplier').value = ''; alerts.length = 0; run('simpanBill("draft")');
ok(run('billList[0].noBill') === 'BILL-2026-001' && /supplier/i.test(alerts[0]), 'form tidak valid: draft utuh, ada pesan');
el('bill-supplier').value = 'PT Lama'; run('simpanBill("draft")');
ok(run('billList[0].noBill') === 'BILL-2026-009' && run('billList.length') === 2 && run('billList[1].noBill') === 'BILL-2026-002', 'nomor boleh diganti ke nomor yang belum dipakai');
resetEdit(); run('editBill("D1")'); viewer = true; el('bill-supplier').value = 'PT Baru';
run('simpanBill("draft")');
ok(run('billList[0].supplier') === 'PT Lama', 'viewer: simpan edit diblokir');

// draft berubah di tempat lain saat form terbuka
resetEdit(); run('editBill("D1")'); run('billList[0].status = "diterima"'); alerts.length = 0;
run('simpanBill("draft")');
ok(run('billList[0].status') === 'diterima' && run('billList.length') === 1 && /bukan draft/.test(alerts[0]) && closed.length === 0, 'draft sudah jadi diterima di tempat lain: simpan ditolak, tidak menimpa');
resetEdit(); run('editBill("D1")'); run('billList = []'); alerts.length = 0;
run('simpanBill("draft")');
ok(run('billList.length') === 0 && /tidak ada/.test(alerts[0]), 'draft sudah dihapus di tempat lain: tidak dibuat ulang diam-diam');

// buka form baru setelah edit tidak menimpa draft
resetEdit(); run('editBill("D1")'); run('openModalBill()');
ok(run('_billEditId') === null && el('bill-modal-judul').textContent === 'Buat Tagihan Pembelian' && el('bill-supplier').value === '' && el('bill-no').value === 'BILL-2026-002', 'Buat Tagihan setelah edit: mode edit direset, form kosong, nomor otomatis berikutnya');
run('_billItems[0].harga = 1000'); el('bill-supplier').value = 'PT Lain'; alerts.length = 0; run('simpanBill("draft")');
ok(run('billList.length') === 2 && run('billList.some(b=>b.id==="D1"&&b.supplier==="PT Lama")') && run('billList.some(b=>b.supplier==="PT Lain")'), 'simpan setelah Buat Tagihan: bill baru, draft lama tidak tertimpa');

// daftar: tombol edit hanya untuk draft
resetEdit(); run('renderBillList()');
ok(/editBill\('D1'\)/.test(el('bill-body').innerHTML), 'daftar: draft punya tombol edit');
run('billList[0].status = "diterima"; renderBillList()');
ok(!/editBill\(/.test(el('bill-body').innerHTML), 'daftar: bill diterima tidak punya tombol edit');
run('billList[0].status = "lunas"; renderBillList()');
ok(!/editBill\(/.test(el('bill-body').innerHTML), 'daftar: bill lunas tidak punya tombol edit');

console.log('[item] baris item di layar sempit dan picker akun per baris');
ctx.akuns = [{ kode: '1301', nama: 'Persediaan Barang Dagangan', tipe: 'Aset' }, { kode: '6101', nama: 'Beban ATK', tipe: 'Beban' }];
ctx.PICKER_FILTERS = { beli: a => ['Beban', 'Aset', 'HPP'].includes(a.tipe) };
run('_billItems = []; tambahItemBill(); tambahItemBill()');
const itemHtml = el('bill-items-list').innerHTML;
ok(run('_billItems.length') === 2 && run('_billItems[0].akun') === '1301', 'tambahItemBill: 2 baris, akun default 1301');
ok(!/<select/.test(itemHtml), 'tidak ada <select> bawaan browser di baris item');
ok((itemHtml.match(/openSimplePicker\('bill-akun-\d','bill-akun-btn-\d','beli'\)/g) || []).length === 2, 'tiap baris memakai picker akun (openSimplePicker, filter beli)');
ok(itemHtml.includes('1301') && itemHtml.includes('Persediaan Barang Dagangan'), 'tombol picker menampilkan kode dan nama akun');
ok(!/grid-template-columns:\s*1fr 72px/.test(itemHtml) && (itemHtml.match(/minmax\(0,/g) || []).length >= 4, 'grid memakai minmax(0, ...) agar tidak meluber (tanpa kolom tetap 1fr 72px 120px 32px)');
ok(!/grid-template-columns:\s*1fr 72px 120px/.test(rd('index.html')), 'header kolom lama di index.html sudah dihapus');
// pilihan picker (mengisi input hidden tanpa event) terbaca saat tambah/hapus/simpan
el('bill-akun-0').value = '6101';
run('tambahItemBill()');
ok(run('_billItems[0].akun') === '6101' && run('_billItems.length') === 3, 'pilihan akun baris 1 tidak hilang saat tambah item');
el('bill-akun-1').value = '1301'; el('bill-akun-2').value = '6101';
run('hapusItemBill(1)');
ok(run('_billItems.map(i=>i.akun).join()') === '6101,6101' && run('_billItems.length') === 2, 'hapus baris tengah: akun baris lain tetap benar');
el('bill-akun-0').value = '1301';
ok(run('_billBacaForm("draft").items[0].akun') === '1301', 'simpan membaca akun dari picker');

console.log('[cariAkunPpnMasukan]');
ok(run('cariAkunPpnMasukan([{kode:"1101",nama:"Kas"},{kode:"1502",nama:"PPN Masukan (Pajak Dibayar Dimuka)"}])') === '1502', '1502 dipakai bila ada');
ok(run('cariAkunPpnMasukan([{kode:"1101",nama:"Kas"},{kode:"1599",nama:"Ppn Masukan Khusus"}])') === '1599', 'tanpa 1502: cari akun bernama ppn masukan');
ok(run('cariAkunPpnMasukan([{kode:"1101",nama:"Kas"}])') === '1502' && run('cariAkunPpnMasukan(null)') === '1502', 'tidak ketemu / daftar kosong: default 1502');

console.log('[buatJurnalBill] bentuk jurnal');
const billOk = (o) => Object.assign({ id: 'B1', noBill: 'BILL-2026-001', supplier: 'PT Maju', tanggal: '2026-10-01', status: 'diterima', akunUtang: '2101',
  items: [{ nama: 'Kertas', qty: 2, harga: 50000, akun: '1301' }, { nama: 'Listrik', qty: 1, harga: 25000, akun: '6101' }],
  subtotal: 125000, ppn: 13750, ppnTarif: 11, total: 138750, sisaTagihan: 138750 }, o || {});
const jb = (b, o) => { ctx.__b = b; ctx.__o = o; return run('buatJurnalBill(__b, __o)'); };
const sumD = j => j.lines.reduce((s, l) => s + l.debit, 0), sumK = j => j.lines.reduce((s, l) => s + l.kredit, 0);
r = jb(billOk());
ok(r.ok && r.jurnal.tanggal === '2026-10-01' && r.jurnal.jenis === 'Tagihan Pembelian' && r.jurnal.jenis === run('JENIS_JURNAL.BILL'), 'ok, tanggal dan jenis Tagihan Pembelian');
ok(r.jurnal.keterangan === 'Tagihan BILL-2026-001 — PT Maju' && r.jurnal.ref === 'BILL-2026-001', 'keterangan memuat nomor bill dan supplier');
ok(r.jurnal.lines.length === 4, '2 baris item + PPN + utang');
ok(r.jurnal.lines[0].akun === '1301' && r.jurnal.lines[0].debit === 100000 && r.jurnal.lines[0].kredit === 0, 'Dr 1301 = 100.000');
ok(r.jurnal.lines[1].akun === '6101' && r.jurnal.lines[1].debit === 25000, 'Dr 6101 = 25.000');
ok(r.jurnal.lines[2].akun === '1502' && r.jurnal.lines[2].debit === 13750 && r.jurnal.lines[2].ket === 'PPN Masukan 11%', 'Dr 1502 PPN Masukan 13.750, ket berisi tarif');
ok(r.jurnal.lines[3].akun === '2101' && r.jurnal.lines[3].kredit === 138750 && r.jurnal.lines[3].debit === 0, 'Cr 2101 Utang Usaha = total bill');
ok(sumD(r.jurnal) === sumK(r.jurnal) && sumK(r.jurnal) === 138750, 'seimbang dan sama dengan bill.total');
ok(r.jurnal._ppnTarif === 11, '_ppnTarif terisi');
ok(r.jurnal.lines[0].ket === 'Kertas' && r.jurnal.lines[3].ket.includes('PT Maju'), 'ket baris item = nama item, baris utang memuat supplier');

console.log('[buatJurnalBill] variasi');
r = jb(billOk({ ppn: 0, ppnTarif: 0, total: 125000 }));
ok(r.ok && r.jurnal.lines.length === 3 && !r.jurnal.lines.some(l => l.akun === '1502') && r.jurnal._ppnTarif === undefined && sumK(r.jurnal) === 125000, 'tanpa PPN: tidak ada baris PPN dan _ppnTarif');
r = jb(billOk({ items: [{ nama: 'A', qty: 1, harga: 40000, akun: '1301' }, { nama: 'B', qty: 3, harga: 20000, akun: '1301' }, { nama: 'A', qty: 1, harga: 1000, akun: '1301' }], ppn: 0, ppnTarif: 0 }));
ok(r.ok && r.jurnal.lines.length === 2 && r.jurnal.lines[0].debit === 101000 && r.jurnal.lines[0].ket === 'A, B', 'akun sama digabung, nama item tidak dobel');
r = jb(billOk({ ppn: 15000, ppnTarif: 12 }), { akunPpnMasukan: '1599' });
ok(r.ok && r.jurnal.lines[2].akun === '1599' && r.jurnal.lines[2].ket === 'PPN Masukan 12%' && r.jurnal._ppnTarif === 12, 'akun PPN dari opsi, tarif 12%');
r = jb(billOk({ items: [{ nama: 'x', qty: 0, harga: 500, akun: '1301' }, { nama: 'Kertas', qty: 1, harga: 7000, akun: '1301' }, null, { nama: 'y', qty: 2, harga: 0, akun: '' }], ppn: 0, ppnTarif: 0 }));
ok(r.ok && r.jurnal.lines.length === 2 && r.jurnal.lines[0].debit === 7000, 'item kosong (qty/harga 0) dan null diabaikan, termasuk yang tanpa akun');
ok(jb(billOk({ items: [{ nama: '', qty: 1, harga: 1000, akun: '5101' }], ppn: 0, ppnTarif: 0 })).jurnal.lines[0].ket === 'Pembelian', 'item tanpa nama: ket baris "Pembelian"');

console.log('[buatJurnalBill] pembulatan tetap seimbang');
r = jb(billOk({ items: [{ nama: 'a', qty: 1.5, harga: 3333, akun: '1301' }, { nama: 'b', qty: 1.5, harga: 3333, akun: '6101' }], ppn: 1100, ppnTarif: 11 }));
ok(r.ok && sumD(r.jurnal) === sumK(r.jurnal), 'dua akun masing-masing x.5: tetap seimbang');
ok(r.jurnal.lines.slice(0, 2).reduce((s, l) => s + l.debit, 0) === 9999 && r.jurnal.lines.every(l => Number.isInteger(l.debit) && Number.isInteger(l.kredit)), 'jumlah baris item = pembulatan subtotal (9.999), semua bilangan bulat');
r = jb(billOk({ items: [{ nama: 'a', qty: 1, harga: 10000, akun: '1301' }, { nama: 'b', qty: 3, harga: 3333.4, akun: '6101' }], ppn: 0, ppnTarif: 0 }));
ok(r.ok && sumD(r.jurnal) === sumK(r.jurnal) && sumK(r.jurnal) === Math.round(10000 + 3 * 3333.4), 'harga desimal: total = pembulatan subtotal');

console.log('[buatJurnalBill] penolakan');
ok(!jb(billOk({ status: 'draft' })).ok && /Diterima/.test(jb(billOk({ status: 'draft' })).pesan), 'draft ditolak');
ok(!jb(billOk({ status: 'lunas' })).ok, 'status lunas ditolak (jurnal dibuat saat diterima)');
ok(!jb(billOk({ akunUtang: '' })).ok && /Utang Usaha/.test(jb(billOk({ akunUtang: '  ' })).pesan), 'tanpa akun utang ditolak');
ok(!jb(billOk({ items: [{ nama: 'x', qty: 1, harga: 1000, akun: '' }] })).ok && /akun/.test(jb(billOk({ items: [{ nama: 'x', qty: 1, harga: 1000, akun: '' }] })).pesan), 'item bernilai tanpa akun ditolak');
ok(!jb(billOk({ items: [] })).ok && !jb(billOk({ items: null })).ok && !jb(billOk({ items: [{ qty: 0, harga: 0, akun: '1301' }] })).ok, 'tanpa item bernilai ditolak');
ok(!jb(billOk({ tanggal: '' })).ok && !jb(billOk({ tanggal: '01/10/2026' })).ok, 'tanggal tidak valid ditolak');
ok(!jb(billOk({ ppnTarif: 0 })).ok && /Tarif PPN/.test(jb(billOk({ ppnTarif: 0 })).pesan), 'ada PPN tetapi tarif tidak ada ditolak');
ok(!jb(null).ok && !jb(undefined).ok && !jb('x').ok, 'bill null/undefined/bukan objek ditolak, tidak error');
ok(!jb(billOk({ items: [{ nama: 'a', qty: 1, harga: 0.2, akun: '1301' }], ppn: 0, ppnTarif: 0 })).ok, 'total 0 setelah pembulatan ditolak');

console.log('[buatJurnalBill] cocok dengan rekap pajak dan tidak mengubah input');
r = jb(billOk());
ctx.__j = r.jurnal;
const pj = run('ppnDariJurnal(__j)');
ok(pj && pj.tipe === 'masukan' && pj.ppn === 13750 && pj.dpp === 125000 && pj.tarif === 11, 'ppnDariJurnal membaca PPN Masukan 13.750, DPP 125.000, tarif 11%');
const jSaja = JSON.parse(JSON.stringify(r.jurnal)); delete jSaja._ppnTarif;
ctx.__j2 = jSaja;
ok(run('ppnDariJurnal(__j2)').tarif === 11, 'tarif tetap terbaca dari ket "NN%" saat _ppnTarif tidak ikut tersimpan');
const b0 = billOk(), snap = JSON.stringify(b0);
jb(b0);
ok(JSON.stringify(b0) === snap, 'bill input tidak diubah');
ok(JSON.stringify(jb(b0)) === JSON.stringify(jb(billOk())), 'hasil sama untuk input sama (murni)');
const jnl = rd('js/16-auth-company.js');
ok(/JURNAL_META_KEYS = \[[^\]]*'_ppnTarif'/.test(jnl), 'catatan: _ppnTarif memang kunci meta yang disimpan ke cloud');
ok(/buatJurnalBill\(bill/.test(rd('js/29-bill-ui.js')) && !/buatJurnalBill/.test(rd('js/16-auth-company.js') + rd('js/04-navigasi-tema.js') + rd('js/15-storage.js')), 'buatJurnalBill dipasang hanya di 29-bill-ui.js (tanpa hook ke file lama)');

console.log('[pemasangan] hook ke file lama');
const nav = rd('js/04-navigasi-tema.js'), sto = rd('js/15-storage.js'), cr = rd('js/22-cloud-records.js');
ok(/if\(id==='bill'\)\s*renderBillList\(\)/.test(nav), 'showPage("bill") merender daftar');
ok(sto.includes("resetCounterJenis('BILL')") && sto.includes("'renderBillList'"), 'doResetAll: counter BILL direset dan daftar dirender ulang');
ok(/bill:\s*\{.*legacyKey:\s*'oas_bill'.*legacyOnce:\s*true/.test(cr) && cr.includes("bill: 'Tagihan pembelian'"), 'cloud-records: oas_bill dimigrasi sekali + label dialog');

console.log('[form] id di 29-bill-ui.js ada di index.html');
const html = rd('index.html'), ui = rd('js/29-bill-ui.js');
const ids = [...new Set([...ui.matchAll(/getElementById\('([^']+)'\)/g), ...ui.matchAll(/\bset\('(bill-[^']+)'/g)].map(m => m[1]))];
ids.forEach(id => ok(html.includes('id="' + id + '"'), '#' + id));
ok(/<script defer src="js\/28-bill\.js"><\/script>\s*<script defer src="js\/29-bill-ui\.js">/.test(html), 'urutan script 28 lalu 29');
ok(html.includes('onclick="openModalBill()"') && html.includes("openSimplePicker('bill-akun-utang'"), 'tombol buka form dan picker akun utang terpasang');
ok(!/\b(jurnalEntries|postJurnal|addJurnal)/.test(rd('js/28-bill.js')), '28-bill.js tetap murni: tidak menyentuh jurnal langsung');
ok(/postJurnalLegacy\(r\.jurnal\)/.test(ui) && !/jurnalEntries\.(push|splice)|jurnalEntries\s*=[^=]/.test(ui), '29-bill-ui.js memposting lewat postJurnalLegacy, tanpa push/splice langsung ke jurnal');
ok(!/menyusul di task 4\.4|belum tersedia \(task 4\.4\)/.test(ui), 'placeholder simpanBill 4.3 sudah diganti');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
