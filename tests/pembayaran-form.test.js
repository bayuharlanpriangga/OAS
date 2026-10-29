// Tes form bayar invoice (task 5.2): susunPembayaran, dibayarLamaTurunan, catatPembayaran, simpanPembayaranState
// (js/31-pembayaran.js) dan alur UI js/32-pembayaran-ui.js + pemasangannya.
// Jalankan: node tests/pembayaran-form.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

// ── Lingkungan: modul 31 + 32 dengan DOM/penyimpanan palsu ──
function makeEnv(opsi) {
  opsi = opsi || {};
  const ls = {}, alerts = [], form = {}, synced = [], modals = [];
  const ctx = {
    console, JSON, Date, Math, isFinite, isNaN, Promise, setTimeout: () => {},
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    invoiceList: [], billList: [], akuns: [{ kode: '1101', nama: 'Kas', tipe: 'Aset' }], currentCompany: opsi.login ? { id: 'c1' } : null,
    cloudSyncRecords: kinds => { synced.push(kinds); return Promise.resolve(true); },
    showAlert: m => alerts.push(m), openModal: id => modals.push('open:' + id), closeModal: id => modals.push('close:' + id),
    rp: n => 'Rp' + n, escapeHtml: s => String(s), upgradeFormPickers: () => {},
    renderInvoiceList: () => { ctx.__render++; }, renderInvoiceKPI: () => {}, __render: 0,
    guardHanyaBaca: () => !!opsi.viewer,
    document: { getElementById: id => { if (!(id in form)) form[id] = { value: '', innerHTML: '', textContent: '', classList: { add() {}, remove() {} } }; return form[id]; } },
  };
  vm.createContext(ctx);
  vm.runInContext(rd('js/31-pembayaran.js'), ctx);
  vm.runInContext(rd('js/32-pembayaran-ui.js'), ctx);
  return { ctx, ls, alerts, form, synced, modals, run: c => vm.runInContext(c, ctx) };
}
const inv = o => Object.assign({ id: 'INV_1', noInvoice: 'INV-2026-001', tanggal: '2026-10-01', total: 100000, sisaTagihan: 100000, status: 'terkirim' }, o);
const F = o => Object.assign({ id: 'PAY_100', createdAt: '2026-10-05T03:00:00.000Z', tanggal: '2026-10-05', jumlah: 40000, akunKas: '1101' }, o);
const base = makeEnv();
const S = (f, dok, daftar, jenis) => { base.ctx.__f = f; base.ctx.__d = dok; base.ctx.__l = daftar; return base.run('susunPembayaran(__f, __d, __l' + (jenis ? ', ' + JSON.stringify(jenis) : '') + ')'); };
const L = (dok, daftar) => { base.ctx.__d = dok; base.ctx.__l = daftar; return base.run('dibayarLamaTurunan(__d, __l, "invoice")'); };
const payRec = o => Object.assign({ id: 'PAY_X', jenis: 'invoice', dokId: 'INV_1', tanggal: '2026-10-02', jumlah: 10000, akunKas: '1101' }, o);

console.log('[susunPembayaran] pembayaran sah');
let r = S(F(), inv(), []);
ok(r.ok && r.pembayaran.jumlah === 40000 && r.sisaBaru === 60000 && r.lunas === false, 'cicilan 40.000 dari 100.000: ok, sisa 60.000, belum lunas');
ok(r.pembayaran.jenis === 'invoice' && r.pembayaran.dokId === 'INV_1' && r.pembayaran.noDok === 'INV-2026-001' && r.pembayaran.akunKas === '1101' && r.pembayaran.tanggal === '2026-10-05', 'record: jenis, dokId (id, bukan nomor), noDok, akun kas, tanggal');
ok(r.pembayaran.id === 'PAY_100' && r.pembayaran.createdAt === '2026-10-05T03:00:00.000Z' && !('jurnalNo' in r.pembayaran), 'record: id/createdAt dari form, belum ada jurnalNo (jurnal di 5.3)');
ok(!('metode' in r.pembayaran) && !('catatan' in r.pembayaran), 'metode/catatan kosong tidak ikut disimpan');
r = S(F({ metode: '  Transfer ', catatan: ' DP ' }), inv(), []);
ok(r.pembayaran.metode === 'Transfer' && r.pembayaran.catatan === 'DP', 'metode dan catatan di-trim lalu disimpan');
r = S(F({ jumlah: 100000 }), inv(), []);
ok(r.ok && r.sisaBaru === 0 && r.lunas === true, 'bayar penuh: sisa 0 dan lunas');
r = S(F({ jumlah: 60000 }), inv({ sisaTagihan: 60000 }), [payRec({ jumlah: 40000 })]);
ok(r.ok && r.sisaBaru === 0 && r.lunas, 'cicilan kedua melunasi sisa (record sebelumnya ikut dihitung)');
r = S(F({ jumlah: 0.1 + 0.2 }), inv({ total: 0.3, sisaTagihan: 0.3 }), []);
ok(r.ok && r.lunas && r.pembayaran.jumlah === 0.3, 'jumlah desimal dibulatkan ke sen dan melunasi tepat');
r = S(F(), inv({ tanggal: '2026-10-05' }), []);
ok(r.ok, 'tanggal bayar sama dengan tanggal invoice boleh');

console.log('[susunPembayaran] penolakan');
const tolak = (f, dok, daftar, pola, ket) => { const x = S(f, dok, daftar); ok(x.ok === false && pola.test(x.pesan), ket + ' -> "' + x.pesan + '"'); };
tolak(F({ jumlah: 100001 }), inv(), [], /melebihi sisa/, 'jumlah melebihi sisa');
tolak(F({ jumlah: 70000 }), inv({ sisaTagihan: 60000 }), [payRec({ jumlah: 40000 })], /melebihi sisa/, 'melebihi sisa setelah cicilan sebelumnya');
tolak(F({ jumlah: 0 }), inv(), [], /lebih dari 0/, 'jumlah 0');
tolak(F({ jumlah: -5 }), inv(), [], /lebih dari 0/, 'jumlah negatif');
tolak(F({ jumlah: 0.004 }), inv(), [], /lebih dari 0/, 'jumlah yang dibulatkan jadi 0');
tolak(F({ jumlah: NaN }), inv(), [], /Isi jumlah/, 'jumlah NaN (form kosong)');
tolak(F({ jumlah: '40000' }), inv(), [], /Isi jumlah/, 'jumlah berupa string');
tolak(F({ jumlah: Infinity }), inv(), [], /Isi jumlah/, 'jumlah Infinity');
tolak(F({ tanggal: '' }), inv(), [], /tanggal pembayaran/, 'tanggal kosong');
tolak(F({ tanggal: '2026-02-30' }), inv(), [], /tanggal pembayaran/, 'tanggal tidak ada di kalender');
tolak(F({ tanggal: '05/10/2026' }), inv(), [], /tanggal pembayaran/, 'format tanggal salah');
tolak(F({ tanggal: '2026-09-30' }), inv(), [], /sebelum tanggal invoice/, 'tanggal bayar sebelum tanggal invoice');
tolak(F({ akunKas: '' }), inv(), [], /akun kas/, 'akun kas kosong');
tolak(F({ akunKas: '   ' }), inv(), [], /akun kas/, 'akun kas spasi');
tolak(F({ id: '' }), inv(), [], /ID pembayaran/, 'id kosong');
tolak(F({ id: 'PAY_DUP' }), inv(), [payRec({ id: 'PAY_DUP' })], /sudah dipakai/, 'id kembar');
tolak(F({ createdAt: '' }), inv(), [], /Waktu pembuatan/, 'createdAt kosong');
tolak(F(), inv({ status: 'draft' }), [], /masih draft/, 'invoice draft');
tolak(F(), inv({ status: 'lunas', sisaTagihan: 0 }), [], /sudah lunas/, 'invoice lunas');
tolak(F(), inv({ status: 'aneh' }), [], /tidak bisa dibayar/, 'status tidak dikenal');
tolak(F(), inv({ total: 0 }), [], /tidak valid/, 'total 0');
tolak(F(), inv({ total: '100' }), [], /tidak valid/, 'total bukan angka');
tolak(F(), null, [], /tidak ditemukan/, 'dokumen null');
tolak(F(), inv({ id: '' }), [], /tidak ditemukan/, 'dokumen tanpa id');
tolak(F(), inv({ sisaTagihan: 0 }), [], /tidak punya sisa/, 'terkirim tetapi sisa 0 (tersimpan)');
ok(S(F(), inv(), [], 'ngawur').ok === false && /Jenis dokumen/.test(S(F(), inv(), [], 'ngawur').pesan), 'jenis dokumen tidak dikenal ditolak');
ok(S(null, inv(), []).ok === false && S(undefined, inv(), []).ok === false, 'form null/undefined ditolak tanpa melempar error');
ok(S(F(), inv({ status: 'terkirim' }), null).ok === true, 'daftar null dianggap kosong');

console.log('[susunPembayaran] bill (dipakai 5.5)');
r = S(F({ dokId: 'x' }), { id: 'BILL_1', noBill: 'BILL-2026-001', tanggal: '2026-10-01', total: 111000, sisaTagihan: 111000, status: 'diterima' }, [], 'bill');
ok(r.ok && r.pembayaran.jenis === 'bill' && r.pembayaran.noDok === 'BILL-2026-001' && r.pembayaran.dokId === 'BILL_1', 'bill diterima bisa dibayar: jenis bill, noDok dari noBill');
r = S(F(), { id: 'BILL_1', total: 1000, sisaTagihan: 1000, status: 'draft' }, [], 'bill');
ok(!r.ok && /Tagihan/.test(r.pesan), 'bill draft ditolak dengan sebutan "Tagihan"');

console.log('[dibayarLamaTurunan] invoice yang dibayar lewat alur lama');
ok(L(inv({ sisaTagihan: 60000 }), []) === 40000, 'tanpa record: total - sisaTagihan (aturan 5.1) = 40.000');
ok(L(inv({}), []) === 0, 'belum ada pembayaran: 0');
ok(L(inv({ sisaTagihan: 40000, dibayarLama: 60000 }), []) === 60000, 'dibayarLama yang sudah ada dipertahankan');
ok(L(inv({ sisaTagihan: 50000 }), [payRec({ jumlah: 30000 })]) === 20000, 'record 30.000 + "Tandai Lunas" 20.000 sesudahnya: bagian tanpa record = 20.000');
ok(L(inv({ sisaTagihan: 70000, dibayarLama: 0 }), [payRec({ jumlah: 30000 })]) === 0, 'sisa tersimpan sesuai record: tidak ada dibayarLama tambahan');
ok(L(inv({ sisaTagihan: -5 }), []) === 100000, 'sisaTagihan negatif dijepit 0: dibayarLama maksimal total');
ok(L(inv({ sisaTagihan: 'x', dibayarLama: 25000 }), []) === 25000 && L(inv({ sisaTagihan: undefined }), []) === 0, 'sisaTagihan bukan angka: pakai dibayarLama yang ada');
ok(L(inv({ sisaTagihan: 150000 }), []) === 0, 'sisaTagihan > total tidak menghasilkan dibayarLama minus');
ok(L(null, []) === 0 && L({ id: 'x' }, []) === 0, 'dokumen tidak valid: 0');
r = S(F({ jumlah: 60000 }), inv({ sisaTagihan: 60000 }), []);
ok(r.ok && r.dibayarLama === 40000 && r.sisaBaru === 0, 'invoice lama sisa 60.000: bayar 60.000 melunasi, dibayarLama 40.000 terjaga (sisa lama tidak hidup lagi)');
r = S(F({ jumlah: 70000 }), inv({ sisaTagihan: 60000 }), []);
ok(!r.ok && /melebihi sisa tagihan \(Rp 60/.test(r.pesan), 'invoice lama: batas bayar adalah sisaTagihan tersimpan (60.000), bukan total');

console.log('[susunPembayaran] tidak mengubah masukan');
const d0 = inv({ sisaTagihan: 60000 }), l0 = [payRec({})], f0 = F();
const sd = JSON.stringify(d0), sl = JSON.stringify(l0), sf = JSON.stringify(f0);
S(f0, d0, l0);
ok(JSON.stringify(d0) === sd && JSON.stringify(l0) === sl && JSON.stringify(f0) === sf, 'dokumen, daftar, dan form tidak berubah');

console.log('[catatPembayaran] state dan penyimpanan');
{
  const e = makeEnv();
  e.run("invoiceList.push({ id:'INV_1', noInvoice:'INV-2026-001', tanggal:'2026-10-01', total:100000, sisaTagihan:100000, status:'terkirim' })");
  e.ctx.__f = F();
  const h = e.run('susunPembayaran(__f, invoiceList[0], pembayaranList, "invoice")');
  e.ctx.__h = h;
  e.run('catatPembayaran(invoiceList[0], __h)');
  ok(e.run('pembayaranList.length') === 1 && e.run('pembayaranList[0].id') === 'PAY_100', 'record masuk pembayaranList');
  ok(e.run('invoiceList[0].sisaTagihan') === 60000 && e.run('invoiceList[0].status') === 'terkirim' && e.run('invoiceList[0].dibayarLama') === undefined, 'sebagian: sisaTagihan 60.000, status tetap terkirim, dibayarLama tidak ditambahkan saat 0');
  ok(JSON.parse(e.ls['oas_pembayaran']).length === 1 && JSON.parse(e.ls['oas_invoices'])[0].sisaTagihan === 60000, 'mode tamu: oas_pembayaran dan oas_invoices ditulis');
  ok(!('oas_bill' in e.ls), 'pembayaran invoice tidak menulis oas_bill');
  // cicilan kedua melunasi
  e.ctx.__f = F({ id: 'PAY_101', jumlah: 60000 });
  e.ctx.__h = e.run('susunPembayaran(__f, invoiceList[0], pembayaranList, "invoice")');
  e.run('catatPembayaran(invoiceList[0], __h)');
  ok(e.run('invoiceList[0].sisaTagihan') === 0 && e.run('invoiceList[0].status') === 'lunas', 'lunas: sisa 0 dan status lunas (parity alur lama; status turunan lengkap di 5.4)');
  ok(e.run('pembayaranList[0].id') === 'PAY_101' && e.run('pembayaranList.length') === 2, 'record terbaru di atas');
  ok(e.run('sisaTagihan(invoiceList[0], pembayaranList, "invoice")') === 0, 'sisaTagihan() murni konsisten dengan field sisaTagihan setelah dua pembayaran');
  // hasil gagal tidak mengubah apa pun
  const n = e.run('pembayaranList.length');
  e.ctx.__h = { ok: false, pesan: 'x' };
  e.run('catatPembayaran(invoiceList[0], __h)');
  ok(e.run('pembayaranList.length') === n, 'hasil tidak ok tidak mencatat apa pun');
}
{
  const e = makeEnv();
  e.run("invoiceList.push({ id:'INV_1', noInvoice:'A', tanggal:'2026-10-01', total:100000, sisaTagihan:60000, status:'terkirim' })");   // dibayar 40.000 lewat alur lama
  e.ctx.__f = F({ jumlah: 20000 });
  e.ctx.__h = e.run('susunPembayaran(__f, invoiceList[0], pembayaranList, "invoice")');
  e.run('catatPembayaran(invoiceList[0], __h)');
  ok(e.run('invoiceList[0].dibayarLama') === 40000 && e.run('invoiceList[0].sisaTagihan') === 40000, 'invoice lama: dibayarLama 40.000 diisi, sisa 40.000');
  ok(e.run('sisaTagihan(invoiceList[0], pembayaranList, "invoice")') === 40000, 'sisaTagihan() murni = field sisaTagihan (sisa lama tidak hidup lagi)');
}
{
  const e = makeEnv({ login: true });
  e.run("invoiceList.push({ id:'INV_1', noInvoice:'A', tanggal:'2026-10-01', total:100000, sisaTagihan:100000, status:'terkirim' })");
  e.ctx.__f = F();
  e.ctx.__h = e.run('susunPembayaran(__f, invoiceList[0], pembayaranList, "invoice")');
  e.run('catatPembayaran(invoiceList[0], __h)');
  ok(e.synced.length === 1 && e.synced[0].join() === 'invoice,pembayaran', 'bisnis login: satu sinkron cloud untuk invoice + pembayaran');
  ok(!('oas_pembayaran' in e.ls) && !('oas_invoices' in e.ls), 'bisnis login: key mode tamu tidak ditulis');
}
{
  const e = makeEnv();
  e.ls['oas_pembayaran'] = JSON.stringify([payRec({})]);
  const e2 = makeEnv(); e2.ctx.localStorage.setItem('oas_pembayaran', JSON.stringify([payRec({})]));
  ok(JSON.parse(e.ls['oas_pembayaran']).length === 1, 'sanity ls');
  const lsRusak = { getItem: () => '{rusak', setItem() {} };
  const c = { console, localStorage: lsRusak }; vm.createContext(c); vm.runInContext(rd('js/31-pembayaran.js'), c);
  ok(vm.runInContext('Array.isArray(pembayaranList) && pembayaranList.length === 0', c), 'oas_pembayaran rusak: pembayaranList kosong, tanpa error');
  const c2 = { console, localStorage: { getItem: () => JSON.stringify([payRec({})]), setItem() {} } }; vm.createContext(c2); vm.runInContext(rd('js/31-pembayaran.js'), c2);
  ok(vm.runInContext('pembayaranList.length', c2) === 1, 'mode tamu: pembayaranList dimuat dari oas_pembayaran');
}

console.log('[UI] alur form bayar');
{
  const e = makeEnv();
  e.run("invoiceList.push({ id:'INV_1', noInvoice:'INV-2026-001', tanggal:'2026-10-01', total:100000, sisaTagihan:100000, status:'terkirim' })");
  e.run("openModalBayarInvoice('INV_1')");
  ok(e.modals.includes('open:modal-bayar-inv') && e.form['bayar-inv-jumlah'].value === 100000 && e.form['bayar-inv-akun'].value === '1101', 'buka form: jumlah default = sisa, akun kas default 1101');
  ok(/INV-2026-001/.test(e.form['bayar-inv-judul'].textContent) && /Sisa tagihan/.test(e.form['bayar-inv-ringkas'].innerHTML), 'judul memuat nomor invoice; ringkasan memuat sisa');
  e.form['bayar-inv-jumlah'].value = '30000'; e.form['bayar-inv-tgl'].value = '2026-10-05'; e.form['bayar-inv-metode'].value = 'Transfer';
  e.run('simpanPembayaranInvoice()');
  ok(e.run('pembayaranList.length') === 1 && e.run('invoiceList[0].sisaTagihan') === 70000, 'simpan: 1 record, sisa invoice 70.000');
  ok(e.modals.includes('close:modal-bayar-inv') && e.ctx.__render === 1 && /belum dibuat/.test(e.alerts[e.alerts.length - 1]), 'modal tutup, daftar dirender ulang, alert menyebut jurnal belum dibuat');
  e.run('simpanPembayaranInvoice()');
  ok(e.run('pembayaranList.length') === 1, 'klik simpan kedua (klik ganda) tidak mencatat dua kali');
  // buka lagi: riwayat tampil
  e.run("openModalBayarInvoice('INV_1')");
  ok(/belum dijurnal/.test(e.form['bayar-inv-ringkas'].innerHTML) && /Transfer/.test(e.form['bayar-inv-ringkas'].innerHTML) && e.form['bayar-inv-jumlah'].value === 70000, 'form berikutnya: riwayat menandai "belum dijurnal", jumlah default = sisa 70.000');
  // validasi lewat UI
  e.form['bayar-inv-jumlah'].value = '999999'; e.run('simpanPembayaranInvoice()');
  ok(/melebihi sisa/.test(e.alerts[e.alerts.length - 1]) && e.run('pembayaranList.length') === 1 && e.run('invoiceList[0].sisaTagihan') === 70000, 'jumlah berlebih: alert, tidak ada yang berubah, modal tetap terbuka');
  e.form['bayar-inv-jumlah'].value = ''; e.run('simpanPembayaranInvoice()');
  ok(/Isi jumlah/.test(e.alerts[e.alerts.length - 1]), 'jumlah kosong: alert "Isi jumlah"');
  e.form['bayar-inv-jumlah'].value = '70000'; e.form['bayar-inv-akun'].value = ''; e.run('simpanPembayaranInvoice()');
  ok(/akun kas/.test(e.alerts[e.alerts.length - 1]) && e.run('pembayaranList.length') === 1, 'akun kas kosong: ditolak');
  e.form['bayar-inv-akun'].value = '1101'; e.run('simpanPembayaranInvoice()');
  ok(e.run('invoiceList[0].status') === 'lunas' && /LUNAS/.test(e.alerts[e.alerts.length - 1]), 'bayar sisa: invoice lunas, alert menyebut LUNAS');
  e.run("openModalBayarInvoice('INV_1')");
  ok(/sudah lunas/.test(e.alerts[e.alerts.length - 1]), 'invoice lunas: form tidak dibuka');
}
{
  const e = makeEnv();
  e.run("invoiceList.push({ id:'INV_D', noInvoice:'D', tanggal:'2026-10-01', total:5000, sisaTagihan:5000, status:'draft' })");
  e.run("openModalBayarInvoice('INV_D')");
  ok(!e.modals.includes('open:modal-bayar-inv') && /draft/.test(e.alerts[0]), 'invoice draft: form tidak dibuka, ada alert');
  e.run("openModalBayarInvoice('TIDAK_ADA')");
  ok(!e.modals.includes('open:modal-bayar-inv'), 'id tidak ada: tidak melempar error dan tidak membuka form');
}
{
  const e = makeEnv({ viewer: true });
  e.run("invoiceList.push({ id:'INV_1', noInvoice:'A', tanggal:'2026-10-01', total:5000, sisaTagihan:5000, status:'terkirim' })");
  e.run("openModalBayarInvoice('INV_1')");
  ok(!e.modals.includes('open:modal-bayar-inv'), 'viewer: form tidak dibuka');
  e.run("_bayarInvId = 'INV_1'"); e.form['bayar-inv-jumlah'] = { value: '5000' }; e.form['bayar-inv-akun'] = { value: '1101' }; e.form['bayar-inv-tgl'] = { value: '2026-10-05' };
  e.run('simpanPembayaranInvoice()');
  ok(e.run('pembayaranList.length') === 0 && e.run('invoiceList[0].sisaTagihan') === 5000, 'viewer: simpan diblokir, tidak ada yang berubah');
}
{
  const e = makeEnv();
  e.run("invoiceList.push({ id:'INV_1', noInvoice:'A', tanggal:'2026-12-01', total:5000, sisaTagihan:5000, status:'terkirim' })");
  e.run("openModalBayarInvoice('INV_1')");
  ok(e.form['bayar-inv-tgl'].value >= '2026-12-01', 'invoice bertanggal masa depan: tanggal bayar default tidak lebih awal dari tanggal invoice');
}

console.log('[pemasangan]');
const idx = rd('index.html'), ui = rd('js/32-pembayaran-ui.js'), inv11 = rd('js/11-kontak-invoice.js'), sch = rd('docs/SCHEMA.md');
const idDipakai = [...ui.matchAll(/(?:_bayarSet|getElementById)\('(bayar-inv-[a-z-]+)'/g)].map(m => m[1]).concat([...ui.matchAll(/\(\(document\.getElementById\(id\)/g)].length ? ['bayar-inv-tgl', 'bayar-inv-jumlah', 'bayar-inv-akun', 'bayar-inv-metode', 'bayar-inv-catatan'] : []);
ok(idDipakai.length >= 5 && [...new Set(idDipakai)].every(i => idx.includes('id="' + i + '"')), 'semua id form bayar yang dipakai 32-pembayaran-ui.js ada di index.html: ' + [...new Set(idDipakai)].join(', '));
ok(idx.includes('id="modal-bayar-inv"') && idx.includes('id="bayar-inv-ringkas"') && idx.includes('id="bayar-inv-judul"') && idx.includes('id="bayar-inv-akun-btn"'), 'modal, ringkasan, judul, dan tombol picker akun ada');
ok(idx.includes('onclick="simpanPembayaranInvoice()"') && idx.includes("openSimplePicker('bayar-inv-akun','bayar-inv-akun-btn','kas')"), 'tombol simpan dan picker akun kas terhubung');
const urut = f => idx.indexOf('src="js/' + f + '"');
ok(urut('31-pembayaran.js') > 0 && urut('31-pembayaran.js') < urut('32-pembayaran-ui.js') && urut('32-pembayaran-ui.js') < urut('99-init.js'), 'urutan script: 31, lalu 32, sebelum 99-init');
ok(inv11.includes("openModalBayarInvoice('${i.id}')") && /i\.status==='terkirim'&&i\.sisaTagihan>0\?`<button[^`]*openModalBayarInvoice/.test(inv11), 'tombol Bayar di daftar invoice hanya untuk invoice terkirim yang masih bersisa');
ok(inv11.includes('openModalLunasInvoice') && inv11.includes('konfirmasiLunasInvoice'), 'alur lama "Lunas" tidak dihapus (penyatuan di 5.3)');
ok(!/pembayaranList|susunPembayaran|catatPembayaran|sisaTagihan\(/.test(inv11), '11-kontak-invoice.js hanya punya hook tombol (tidak memakai state pembayaran)');
ok(!/jurnalEntries|addJurnal|postJurnal/.test(ui + rd('js/31-pembayaran.js').replace(/\/\/.*$/gm, '')), 'belum ada jurnal (batas task 5.2)');
ok(sch.includes('oas_pembayaran') && sch.includes('susunPembayaran'), 'SCHEMA.md memuat oas_pembayaran dan susunPembayaran');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
