// Tes jurnal pembayaran invoice (task 5.3): buatJurnalPembayaranInvoice, jurnalPembayaranStatus,
// pembayaranInvoiceBelumJurnal (js/31-pembayaran.js, murni) dan pemostingannya di js/32-pembayaran-ui.js
// (postingJurnalPembayaranInvoice, simpanPembayaranInvoice, jurnalkanPembayaranInvoiceLama, banner),
// beserta pemasangannya di index.html dan file lama.
// postJurnalLegacy dan buatJurnalPembalik memakai kode asli; addJurnal diganti stub bernomor (dengan kunci periode).
// Jalankan: node tests/pembayaran-jurnal.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const utils = rd('js/02-utils.js'), fitur = rd('js/19-fitur-tambahan.js'), auth = rd('js/16-auth-company.js');

function makeEnv(opsi) {
  opsi = opsi || {};
  const ls = {}, alerts = [], form = {}, synced = [], modals = [], audits = [], confirms = [], saves = [];
  const ctx = {
    console, JSON, Date, Math, isFinite, isNaN, Promise, Set, Array, Object, String, Number, setTimeout: () => {},
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
    invoiceList: [], billList: [], currentCompany: opsi.login ? { id: 'c1' } : null,
    akuns: opsi.akuns || [{ kode: '1101', nama: 'Kas', tipe: 'Aset' }, { kode: '1201', nama: 'Piutang Usaha', tipe: 'Aset' }],
    cloudSyncRecords: kinds => { synced.push({ kinds, jurnalNo: vm.runInContext('pembayaranList.map(p => p.jurnalNo)', ctx) }); return Promise.resolve(true); },
    showAlert: m => alerts.push(m), openModal: id => modals.push('open:' + id), closeModal: id => modals.push('close:' + id),
    rp: n => 'Rp' + n, escapeHtml: s => String(s), escapeForJsAttr: s => String(s), upgradeFormPickers: () => {}, fmtDate: s => s, fmtRp: n => 'Rp' + n,
    renderInvoiceList: () => { ctx.__render++; if (ctx.renderPembayaranBelumJurnal) ctx.renderPembayaranBelumJurnal(); }, renderInvoiceKPI: () => {}, __render: 0,
    guardHanyaBaca: () => !!opsi.viewer,
    confirm: m => { confirms.push(m); return opsi.confirm !== false; },
    saveToStorage: () => { saves.push(1); }, markDirty: () => {},
    auditLog: (a, c, d, m) => audits.push({ a, c, d, m }),
    document: { getElementById: id => { if (!(id in form)) form[id] = { value: '', innerHTML: '', textContent: '', classList: { add() {}, remove() {} } }; return form[id]; } },
    jurnalEntries: [], jurnalCounter: 1, periodeKunciSampai: opsi.kunci || '',
  };
  vm.createContext(ctx);
  const run = c => vm.runInContext(c, ctx);
  // JENIS_JURNAL + helper pembalik asli dari 02-utils
  run(utils.match(/const JENIS_JURNAL = \{[\s\S]*?\n\};/)[0]);
  run(['const _REV_KET_RE[^\\n]*\\n', 'function getReversalOf[\\s\\S]*?\\n}\\n', 'function isJurnalPembalik[^\\n]*\\n', 'function getReversedMap[\\s\\S]*?\\n}\\n', 'function ketTanpaPrefixPembalik[^\\n]*\\n']
    .map(re => utils.match(new RegExp(re))[0]).join('\n'));
  // kunci periode: isPeriodeTerkunci + guardPeriode asli (guardPeriode menampilkan alert lewat showAlert)
  run(utils.match(/function isPeriodeTerkunci[\s\S]*?\n}\n/)[0] + utils.match(/function guardPeriode[\s\S]*?\n}\n/)[0] + '\nclass PeriodeTerkunciError extends Error {}\n');
  // addJurnal stub (nomor + kunci periode), postJurnalLegacy dan buatJurnalPembalik asli
  run(`function addJurnal(entry, opsi) {
    if (!(opsi && opsi.abaikanKunci) && isPeriodeTerkunci(entry.tanggal)) { guardPeriode(entry.tanggal, 'diposting'); throw new PeriodeTerkunciError('terkunci'); }
    entry.no = 'JRN-' + String(jurnalCounter++).padStart(3, '0'); jurnalEntries.push(entry);
  }`);
  run(auth.match(/function postJurnalLegacy[\s\S]*?\n}\n/)[0]);
  run(fitur.match(/function buatJurnalPembalik[\s\S]*?\n}\n/)[0]);
  run(rd('js/31-pembayaran.js'));
  run(rd('js/32-pembayaran-ui.js'));
  return { ctx, ls, alerts, form, synced, modals, audits, confirms, saves, run };
}

const inv = o => Object.assign({ id: 'INV_1', noInvoice: 'INV-2026-001', pelanggan: 'PT Maju', tanggal: '2026-10-01', total: 100000, sisaTagihan: 100000, status: 'terkirim', akunPiutang: '1201' }, o);
const pay = o => Object.assign({ id: 'PAY_1', jenis: 'invoice', dokId: 'INV_1', noDok: 'INV-2026-001', tanggal: '2026-10-05', jumlah: 40000, akunKas: '1101', createdAt: '2026-10-05T03:00:00.000Z' }, o);
const base = makeEnv();
const B = (p, i, o) => { base.ctx.__p = p; base.ctx.__i = i; base.ctx.__o = o; return base.run('buatJurnalPembayaranInvoice(__p, __i, __o)'); };
const ST = (p, i, jur, dp) => { base.ctx.__p = p; base.ctx.__i = i; base.ctx.__j = jur; base.ctx.__dp = dp; return base.run('jurnalPembayaranStatus(__p, __i, __j, __dp)'); };
const BJ = (dp, di, jur) => { base.ctx.__dp = dp; base.ctx.__di = di; base.ctx.__j = jur; return base.run('pembayaranInvoiceBelumJurnal(__dp, __di, __j)'); };
// jurnal pembayaran seperti hasil posting (no, jenis, ket, tanggal, lines)
const jur = o => Object.assign({ no: 'JRN-010', tanggal: '2026-10-05', jenis: 'Invoice & Piutang', ket: 'Pembayaran INV-2026-001 — PT Maju',
  lines: [{ akun: '1101', debit: 40000, kredit: 0 }, { akun: '1201', debit: 0, kredit: 40000 }] }, o);

console.log('[buatJurnalPembayaranInvoice] jurnal sah');
let r = B(pay(), inv());
ok(r.ok && r.jurnal.tanggal === '2026-10-05' && r.jurnal.jenis === 'Invoice & Piutang' && r.jurnal.jenis === base.run('JENIS_JURNAL.INVOICE'), 'ok: tanggal = tanggal pembayaran, jenis = JENIS_JURNAL.INVOICE');
ok(r.jurnal.keterangan === 'Pembayaran INV-2026-001 — PT Maju' && r.jurnal.ref === 'INV-2026-001', 'keterangan "Pembayaran <noInvoice> — <pelanggan>", ref = nomor invoice');
ok(r.jurnal.lines.length === 2 && r.jurnal.lines[0].akun === '1101' && r.jurnal.lines[0].debit === 40000 && r.jurnal.lines[0].kredit === 0, 'baris 1: Debit akun kas/bank pembayaran');
ok(r.jurnal.lines[1].akun === '1201' && r.jurnal.lines[1].debit === 0 && r.jurnal.lines[1].kredit === 40000, 'baris 2: Kredit akun piutang invoice');
ok(r.jurnal.lines.reduce((s, l) => s + l.debit, 0) === r.jurnal.lines.reduce((s, l) => s + l.kredit, 0), 'jurnal seimbang');
ok(!('no' in r.jurnal) && !('id' in r.jurnal), 'belum bernomor/ber-id (nomor dari addJurnal)');
r = B(pay({ akunKas: '1102' }), inv({ akunPiutang: '1203' }));
ok(r.ok && r.jurnal.lines[0].akun === '1102' && r.jurnal.lines[1].akun === '1203', 'akun kas dari pembayaran dan akun piutang dari invoice dipakai apa adanya');
r = B(pay(), inv({ akunPiutang: '' }), { akunPiutang: '1201' });
ok(r.ok && r.jurnal.lines[1].akun === '1201', 'invoice tanpa akunPiutang: pakai cadangan opsi.akunPiutang');
r = B(pay(), inv({ akunPiutang: undefined }), { akunPiutang: '1201' });
ok(r.ok && r.jurnal.lines[1].akun === '1201', 'akunPiutang undefined: pakai cadangan');
r = B(pay({ jumlah: 0.1 + 0.2 }), inv());
ok(r.ok && r.jurnal.lines[0].debit === 0.3 && r.jurnal.lines[1].kredit === 0.3, 'jumlah desimal dibulatkan ke sen, kedua sisi sama');
r = B(pay({ jumlah: 100000 }), inv());
ok(r.ok && r.jurnal.lines[0].debit === 100000, 'pelunasan penuh');

console.log('[buatJurnalPembayaranInvoice] penolakan');
const tolak = (p, i, o, pola, ket) => { const x = B(p, i, o); ok(x.ok === false && pola.test(x.pesan) && !x.jurnal, ket + ' -> "' + x.pesan + '"'); };
tolak(pay(), inv({ akunPiutang: '' }), {}, /akun piutang/, 'tanpa akun piutang dan tanpa cadangan');
tolak(pay(), inv({ akunPiutang: '   ' }), { akunPiutang: ' ' }, /akun piutang/, 'akun piutang spasi');
tolak(pay({ akunKas: '1201' }), inv(), {}, /tidak boleh sama/, 'akun kas sama dengan akun piutang');
tolak(pay({ akunKas: '' }), inv(), {}, /Akun kas/, 'akun kas kosong');
tolak(pay({ akunKas: 5 }), inv(), {}, /Akun kas/, 'akun kas bukan teks');
tolak(pay({ jumlah: 0 }), inv(), {}, /Jumlah pembayaran/, 'jumlah 0');
tolak(pay({ jumlah: -1 }), inv(), {}, /Jumlah pembayaran/, 'jumlah negatif');
tolak(pay({ jumlah: NaN }), inv(), {}, /Jumlah pembayaran/, 'jumlah NaN');
tolak(pay({ jumlah: '40000' }), inv(), {}, /Jumlah pembayaran/, 'jumlah string');
tolak(pay({ jumlah: 0.004 }), inv(), {}, /Jumlah pembayaran/, 'jumlah yang dibulatkan jadi 0');
tolak(pay({ tanggal: '' }), inv(), {}, /Tanggal pembayaran/, 'tanggal kosong');
tolak(pay({ tanggal: '2026-02-30' }), inv(), {}, /Tanggal pembayaran/, 'tanggal tidak ada di kalender');
tolak(pay({ jenis: 'bill' }), inv(), {}, /tidak valid/, 'pembayaran jenis bill (milik 5.5, bukan jurnal invoice)');
tolak(pay({ dokId: 'INV_LAIN' }), inv(), {}, /bukan milik/, 'pembayaran milik invoice lain');
tolak(null, inv(), {}, /tidak valid/, 'pembayaran null');
tolak(pay(), null, {}, /tidak ditemukan/, 'invoice null');
ok(B(undefined, undefined, undefined).ok === false, 'semua undefined: ditolak tanpa melempar error');

console.log('[buatJurnalPembayaranInvoice] murni');
{
  const p0 = pay(), i0 = inv(), o0 = { akunPiutang: '1201' }, sp = JSON.stringify(p0), si = JSON.stringify(i0), so = JSON.stringify(o0);
  B(p0, i0, o0);
  ok(JSON.stringify(p0) === sp && JSON.stringify(i0) === si && JSON.stringify(o0) === so, 'pembayaran, invoice, dan opsi tidak berubah');
  ok(!('jurnalNo' in p0), 'tidak mengisi jurnalNo (itu tugas pemostingan)');
}

console.log('[jurnalPembayaranStatus]');
ok(ST(pay(), inv(), [], []).status === 'belum' && ST(pay(), inv(), [], []).jurnal === null, 'tanpa jurnal: belum');
ok(ST(pay(), inv(), null, null).status === 'belum', 'daftar jurnal null: belum, tanpa error');
let s = ST(pay({ jurnalNo: 'JRN-010' }), inv(), [jur()], []);
ok(s.status === 'aktif' && s.jurnal.no === 'JRN-010', 'jurnalNo cocok: aktif');
s = ST(pay({ jurnalNo: 'JRN-010' }), inv(), [jur({ ket: 'Pembayaran INV-2026-999 — PT Lain' })], []);
ok(s.status === 'belum', 'nomor jurnal sama tetapi ket beda invoice (nomor berulang setelah Reset Data): belum');
s = ST(pay({ jurnalNo: 'JRN-010' }), inv(), [jur({ jenis: 'Manual' })], []);
ok(s.status === 'belum', 'jenis jurnal lain tidak dianggap jurnal pembayaran');
s = ST(pay(), inv(), [jur()], [pay()]);
ok(s.status === 'aktif' && s.jurnal.no === 'JRN-010', 'tanpa jurnalNo: ditautkan lewat ket + tanggal + akun kas + jumlah');
ok(ST(pay(), inv(), [jur({ tanggal: '2026-10-06' })], []).status === 'belum', 'tanggal jurnal beda: tidak ditautkan');
ok(ST(pay(), inv(), [jur({ lines: [{ akun: '1101', debit: 39999, kredit: 0 }, { akun: '1201', debit: 0, kredit: 39999 }] })], []).status === 'belum', 'jumlah beda: tidak ditautkan');
ok(ST(pay(), inv(), [jur({ lines: [{ akun: '1102', debit: 40000, kredit: 0 }, { akun: '1201', debit: 0, kredit: 40000 }] })], []).status === 'belum', 'akun kas beda: tidak ditautkan');
// dua pembayaran identik (tanggal, jumlah, akun sama): satu jurnal tidak boleh dipakai dua pembayaran
const pA = pay({ id: 'PAY_A', jurnalNo: 'JRN-010' }), pB = pay({ id: 'PAY_B' });
ok(ST(pB, inv(), [jur()], [pA, pB]).status === 'belum', 'jurnal yang sudah dipakai pembayaran lain tidak ditautkan ke pembayaran kedua');
ok(ST(pA, inv(), [jur()], [pA, pB]).status === 'aktif', 'pembayaran pemilik jurnalNo tetap aktif');
ok(ST(pB, inv(), [jur(), jur({ no: 'JRN-011' })], [pA, pB]).jurnal.no === 'JRN-011', 'dua jurnal identik: pembayaran kedua mendapat jurnal yang belum terpakai');
ok(ST(pay({ jurnalNo: 'JRN-010' }), inv({ noInvoice: 'INV-2026-001', pelanggan: 'PT Maju' }), [jur({ ket: 'Pembayaran INV-2026-001 — PT Maju — koreksi' })], []).status === 'aktif', 'ket dengan akhiran tambahan tetap cocok (startsWith)');
ok(ST(pay({ jenis: 'bill' }), inv(), [jur()], []).status === 'belum' && ST(pay(), null, [jur()], []).status === 'belum', 'pembayaran bill atau invoice null: belum');
// jurnal pembalik: pakai buatJurnalPembalik asli
{
  const e = makeEnv();
  e.run("invoiceList.push({ id:'INV_1', noInvoice:'INV-2026-001', pelanggan:'PT Maju', tanggal:'2026-10-01', total:100000, sisaTagihan:100000, status:'terkirim', akunPiutang:'1201' })");
  e.ctx.__p = pay(); e.ctx.__i = e.run('invoiceList[0]');
  const asal = e.run('postJurnalLegacy(buatJurnalPembayaranInvoice(__p, __i).jurnal)');
  e.ctx.__p.jurnalNo = asal.no;
  ok(e.run('jurnalPembayaranStatus(__p, __i, jurnalEntries, [__p]).status') === 'aktif', 'jurnal hasil postJurnalLegacy: aktif');
  e.ctx.__a = e.run('jurnalEntries[0]');
  const pbl = e.run('buatJurnalPembalik(__a, {tanggal:"2026-10-20", alasan:"salah input"})');
  ok(pbl && pbl.jenis === 'Invoice & Piutang' && pbl.lines[0].akun === '1201' && pbl.lines[0].debit === 40000, 'jurnal pembalik asli: jenis diwarisi, Piutang di debit');
  const st = e.run('jurnalPembayaranStatus(__p, __i, jurnalEntries, [__p])');
  ok(st.status === 'dibalik' && st.jurnal.no === asal.no, 'jurnal asal sudah dibalik: status dibalik (pembalik tidak dianggap jurnal pembayaran)');
  const tanpaAsal = e.run('jurnalPembayaranStatus(Object.assign({}, __p, {jurnalNo: undefined}), __i, jurnalEntries.filter(j => !j.reversalOf), [])');
  ok(tanpaAsal.status === 'aktif', 'sanity: tanpa pembalik dalam daftar, jurnal asal kembali aktif');
  ok(e.run('pembayaranInvoiceBelumJurnal([__p], invoiceList, jurnalEntries).length') === 0, 'pembayaran yang jurnalnya sengaja dibalik tidak masuk daftar "belum dijurnal"');
}

console.log('[pembayaranInvoiceBelumJurnal]');
{
  const i1 = inv(), i2 = inv({ id: 'INV_2', noInvoice: 'INV-2026-002' });
  const p1 = pay({ id: 'P1', jurnalNo: 'JRN-010' }), p2 = pay({ id: 'P2', dokId: 'INV_2', noDok: 'INV-2026-002', jumlah: 5000 });
  let x = BJ([p1, p2], [i1, i2], [jur()]);
  ok(x.length === 1 && x[0].pembayaran.id === 'P2' && x[0].invoice.id === 'INV_2', 'yang sudah punya jurnal aktif dilewati; yang belum diikutkan bersama invoicenya');
  ok(BJ([p1], [i1], [jur()]).length === 0, 'semua sudah dijurnal: kosong');
  ok(BJ([pay({ id: 'P3', dokId: 'HILANG' })], [i1], []).length === 0, 'pembayaran milik invoice yang sudah dihapus dilewati');
  ok(BJ([pay({ jenis: 'bill', dokId: 'INV_1' })], [i1], []).length === 0, 'pembayaran bill tidak ikut');
  ok(BJ([null, 'x', {}, pay({ jumlah: 0 }), pay({ jumlah: 'a' })], [i1], []).length === 0, 'record rusak dilewati tanpa error');
  ok(BJ([p1, p2], [i1, i2], []).map(a => a.pembayaran.id).join() === 'P1,P2', 'urutan mengikuti daftar pembayaran');
  ok(BJ(null, null, null).length === 0, 'argumen null: kosong');
}

console.log('[UI] simpan pembayaran memposting jurnal');
function envDenganInvoice(opsi, invOverride) {
  const e = makeEnv(opsi);
  e.ctx.__inv = inv(invOverride);
  e.run('invoiceList.push(__inv)');
  e.run("openModalBayarInvoice('INV_1')");
  e.ctx.document.getElementById('bayar-inv-tgl').value = '2026-10-05'; e.ctx.document.getElementById('bayar-inv-jumlah').value = '30000';
  e.ctx.document.getElementById('bayar-inv-akun').value = '1101';   // viewer: form tidak dibuka, jadi isi manual
  return e;
}
{
  const e = envDenganInvoice();
  e.run('simpanPembayaranInvoice()');
  const j = e.run('jurnalEntries');
  ok(j.length === 1 && j[0].no === 'JRN-001' && j[0].jenis === 'Invoice & Piutang' && j[0].tanggal === '2026-10-05', 'bayar 30.000: tepat 1 jurnal bernomor JRN-001, bertanggal pembayaran');
  ok(j[0].lines[0].akun === '1101' && j[0].lines[0].debit === 30000 && j[0].lines[1].akun === '1201' && j[0].lines[1].kredit === 30000, 'Dr 1101 Kas 30.000 / Cr 1201 Piutang 30.000');
  ok(e.run('pembayaranList.length') === 1 && e.run('pembayaranList[0].jurnalNo') === 'JRN-001', 'record pembayaran menyimpan jurnalNo');
  ok(e.run('invoiceList[0].sisaTagihan') === 70000 && e.run('invoiceList[0].status') === 'terkirim', 'sisa invoice 70.000, status tetap terkirim');
  ok(/JRN-001/.test(e.alerts[e.alerts.length - 1]) && /Sisa tagihan Rp70000/.test(e.alerts[e.alerts.length - 1]), 'alert menyebut nomor jurnal dan sisa');
  ok(e.audits.some(a => a.c === 'invoice' && /Pembayaran invoice INV-2026-001/.test(a.d) && a.m.ref === 'INV-2026-001'), 'audit log mencatat pembayaran invoice');
  ok(e.saves.length >= 1, 'saveToStorage dipanggil setelah jurnal (jurnal ikut tersimpan)');
  e.run('simpanPembayaranInvoice()');
  ok(e.run('jurnalEntries.length') === 1 && e.run('pembayaranList.length') === 1, 'klik ganda: tetap 1 jurnal dan 1 pembayaran');
  // pelunasan sisa
  e.run("openModalBayarInvoice('INV_1')");
  e.form['bayar-inv-tgl'].value = '2026-10-06';
  e.run('simpanPembayaranInvoice()');
  ok(e.run('invoiceList[0].status') === 'lunas' && e.run('jurnalEntries.length') === 2 && e.run('pembayaranList.map(p => p.jurnalNo).join()') === 'JRN-002,JRN-001', 'pelunasan: invoice lunas, jurnal kedua JRN-002, tiap record punya jurnalNo-nya sendiri');
  const dr = e.run('jurnalEntries.reduce((s, j) => s + j.lines.filter(l => l.akun === "1101").reduce((a, l) => a + l.debit, 0), 0)');
  const cr = e.run('jurnalEntries.reduce((s, j) => s + j.lines.filter(l => l.akun === "1201").reduce((a, l) => a + l.kredit, 0), 0)');
  ok(dr === 100000 && cr === 100000, 'total Kas debit = total Piutang kredit = 100.000 (piutang invoice terlunasi di buku besar)');
  ok(e.run('pembayaranInvoiceBelumJurnal(pembayaranList, invoiceList, jurnalEntries).length') === 0, 'setelah dua pembayaran: tidak ada yang belum dijurnal');
}
{
  // bisnis login: jurnalNo sudah terisi saat record disinkron ke cloud
  const e = envDenganInvoice({ login: true });
  e.run('simpanPembayaranInvoice()');
  ok(e.synced.length === 1 && e.synced[0].kinds.join() === 'invoice,pembayaran' && e.synced[0].jurnalNo[0] === 'JRN-001', 'bisnis login: sinkron invoice,pembayaran membawa jurnalNo');
}
{
  // periode terkunci: tidak ada yang berubah, modal tetap terbuka
  const e = envDenganInvoice({ kunci: '2026-10-31' });
  e.run('simpanPembayaranInvoice()');
  ok(e.run('jurnalEntries.length') === 0 && e.run('pembayaranList.length') === 0 && e.run('invoiceList[0].sisaTagihan') === 100000, 'periode terkunci: tidak ada jurnal, tidak ada pembayaran, sisa invoice utuh');
  ok(/dikunci/.test(e.alerts[e.alerts.length - 1]) && !e.modals.includes('close:modal-bayar-inv') && e.ctx.__render === 0, 'alert menyebut periode dikunci, modal tetap terbuka, daftar tidak dirender ulang');
  e.form['bayar-inv-tgl'].value = '2026-11-02'; e.run('simpanPembayaranInvoice()');
  ok(e.run('jurnalEntries.length') === 1 && e.run('pembayaranList.length') === 1, 'tanggal setelah kunci: berhasil di percobaan berikutnya');
}
{
  // akun piutang tidak bisa ditentukan: pesan jelas, tidak ada yang tercatat
  const e = envDenganInvoice({ akuns: [{ kode: '1101', nama: 'Kas', tipe: 'Aset' }] }, { akunPiutang: '' });
  e.run('simpanPembayaranInvoice()');
  ok(e.run('jurnalEntries.length') === 0 && e.run('pembayaranList.length') === 0 && /akun piutang/.test(e.alerts[e.alerts.length - 1]), 'tanpa akun piutang sama sekali: ditolak dengan pesan, tanpa jurnal dan tanpa pembayaran');
  const e2 = envDenganInvoice({ akuns: [{ kode: '1101', nama: 'Kas', tipe: 'Aset' }, { kode: '1250', nama: 'Piutang Dagang', tipe: 'Aset' }] }, { akunPiutang: '' });
  e2.run('simpanPembayaranInvoice()');
  ok(e2.run('jurnalEntries[0].lines[1].akun') === '1250', 'invoice tanpa akunPiutang: dipakai akun pertama yang namanya memuat "piutang"');
  const e3 = envDenganInvoice({}, { akunPiutang: '' });
  e3.run('simpanPembayaranInvoice()');
  ok(e3.run('jurnalEntries[0].lines[1].akun') === '1201', 'invoice tanpa akunPiutang: dipakai 1201 bila ada');
}
{
  // akun kas sama dengan akun piutang: ditolak di jurnal, bukan menghasilkan jurnal nol
  const e = envDenganInvoice();
  e.form['bayar-inv-akun'].value = '1201'; e.run('simpanPembayaranInvoice()');
  ok(e.run('jurnalEntries.length') === 0 && e.run('pembayaranList.length') === 0 && /tidak boleh sama/.test(e.alerts[e.alerts.length - 1]), 'akun kas = akun piutang: ditolak, tidak ada jurnal maupun pembayaran');
}
{
  // validasi form tetap lebih dulu: pembayaran tidak sah tidak menyentuh jurnal
  const e = envDenganInvoice();
  e.form['bayar-inv-jumlah'].value = '999999'; e.run('simpanPembayaranInvoice()');
  ok(e.run('jurnalEntries.length') === 0 && /melebihi sisa/.test(e.alerts[e.alerts.length - 1]), 'jumlah berlebih: ditolak sebelum jurnal dibuat');
}
{
  const e = envDenganInvoice({ viewer: true });
  e.run("_bayarInvId = 'INV_1'"); e.run('simpanPembayaranInvoice()');
  ok(e.run('jurnalEntries.length') === 0 && e.run('pembayaranList.length') === 0, 'viewer: tidak ada jurnal dan tidak ada pembayaran');
}
{
  // satu tombol untuk semua jalur: invoice lama yang sebagian dibayar lewat alur lama tetap konsisten
  const e = makeEnv();
  e.ctx.__inv = inv({ sisaTagihan: 60000 }); e.run('invoiceList.push(__inv)');   // 40.000 sudah dibayar lewat "Tandai Lunas" lama (jurnalnya sudah ada)
  e.run("openModalBayarInvoice('INV_1')");
  ok(e.form['bayar-inv-jumlah'].value === 60000, 'invoice lama: jumlah default = sisa tersimpan 60.000 (tombol Lunas = bayar sisa sekali klik)');
  e.form['bayar-inv-tgl'].value = '2026-10-05'; e.run('simpanPembayaranInvoice()');
  ok(e.run('invoiceList[0].status') === 'lunas' && e.run('jurnalEntries[0].lines[0].debit') === 60000 && e.run('invoiceList[0].dibayarLama') === 40000, 'jurnal hanya untuk 60.000 yang dibayar sekarang (40.000 lama sudah dijurnal alur lama)');
}

console.log('[postingJurnalPembayaranInvoice] pemostingan langsung');
{
  const e = makeEnv();
  e.ctx.__inv = inv(); e.run('invoiceList.push(__inv)');
  e.ctx.__p = pay(); e.run('pembayaranList.push(__p)');
  let x = e.run('postingJurnalPembayaranInvoice(__p, invoiceList[0])');
  ok(x.ok && x.jurnalNo === 'JRN-001' && !x.sudahAda && e.run('__p.jurnalNo') === 'JRN-001', 'pembayaran lama tanpa jurnalNo: jurnal dibuat dan jurnalNo terisi');
  e.run('__p.jurnalNo = undefined');
  x = e.run('postingJurnalPembayaranInvoice(__p, invoiceList[0])');
  ok(x.ok && x.sudahAda && x.jurnalNo === 'JRN-001' && e.run('jurnalEntries.length') === 1 && e.run('__p.jurnalNo') === 'JRN-001', 'jurnalNo hilang tetapi jurnal ada: ditautkan ulang, tidak digandakan');
}

console.log('[jurnalkanPembayaranInvoiceLama] record dari 5.2 tanpa jurnalNo');
function envLama(opsi) {
  const e = makeEnv(opsi);
  e.run(`invoiceList.push({ id:'INV_1', noInvoice:'INV-2026-001', pelanggan:'PT Maju', tanggal:'2026-09-01', total:100000, sisaTagihan:40000, status:'terkirim', akunPiutang:'1201' },
         { id:'INV_2', noInvoice:'INV-2026-002', pelanggan:'CV Baru', tanggal:'2026-09-01', total:50000, sisaTagihan:0, status:'lunas', akunPiutang:'1201' })`);
  e.run(`pembayaranList.push(
    { id:'P1', jenis:'invoice', dokId:'INV_1', noDok:'INV-2026-001', tanggal:'2026-09-10', jumlah:20000, akunKas:'1101', createdAt:'a' },
    { id:'P2', jenis:'invoice', dokId:'INV_1', noDok:'INV-2026-001', tanggal:'2026-10-05', jumlah:40000, akunKas:'1101', createdAt:'b' },
    { id:'P3', jenis:'invoice', dokId:'INV_2', noDok:'INV-2026-002', tanggal:'2026-10-06', jumlah:50000, akunKas:'1102', createdAt:'c' })`);
  return e;
}
{
  const e = envLama({ kunci: '2026-09-30' });
  e.run('renderPembayaranBelumJurnal()');
  ok(/3 pembayaran invoice belum dijurnal/.test(e.form['inv-belum-jurnal'].innerHTML) && /jurnalkanPembayaranInvoiceLama\(\)/.test(e.form['inv-belum-jurnal'].innerHTML), 'banner: menyebut 3 pembayaran belum dijurnal + tombol Buat Jurnal');
  e.run('jurnalkanPembayaranInvoiceLama()');
  ok(e.confirms.length === 1 && /2 pembayaran invoice/.test(e.confirms[0]) && /1 pembayaran di periode terkunci dilewati/.test(e.confirms[0]), 'konfirmasi menyebut 2 yang dijurnal dan 1 yang dilewati (periode terkunci)');
  ok(e.run('jurnalEntries.length') === 2 && e.run('pembayaranList.filter(p => p.jurnalNo).map(p => p.id).sort().join()') === 'P2,P3', 'P2 dan P3 dijurnal; P1 (periode terkunci) dibiarkan tanpa jurnal');
  ok(e.run('jurnalEntries.map(j => j.tanggal).join()') === '2026-10-05,2026-10-06' && e.run('jurnalEntries[1].lines[0].akun') === '1102', 'tiap jurnal bertanggal pembayarannya dan memakai akun kas pembayarannya');
  ok(e.run('invoiceList[0].sisaTagihan') === 40000 && e.run('invoiceList[1].status') === 'lunas', 'sisa dan status invoice tidak berubah (hanya jurnal yang ditambahkan)');
  ok(/2 jurnal pembayaran dibuat/.test(e.alerts[e.alerts.length - 1]) && /1 pembayaran di periode terkunci dilewati/.test(e.alerts[e.alerts.length - 1]), 'ringkasan: 2 dibuat, 1 dilewati');
  ok(/1 pembayaran invoice belum dijurnal/.test(e.form['inv-belum-jurnal'].innerHTML), 'banner diperbarui: sisa 1 pembayaran belum dijurnal');
  const jml = e.run('jurnalEntries.length');
  e.run('jurnalkanPembayaranInvoiceLama()');
  ok(e.run('jurnalEntries.length') === jml && /periode yang sudah dikunci/.test(e.alerts[e.alerts.length - 1]) && e.confirms.length === 1, 'dijalankan lagi: yang tersisa hanya periode terkunci, tidak ada jurnal baru, tidak ada konfirmasi');
  e.ctx.periodeKunciSampai = '';
  e.run('jurnalkanPembayaranInvoiceLama()');
  ok(e.run('jurnalEntries.length') === jml + 1 && e.run('pembayaranList.every(p => p.jurnalNo)') && e.run('pembayaranList.find(p => p.id === "P1").jurnalNo') === 'JRN-003', 'kunci dibuka: P1 ikut dijurnal (JRN-003)');
  e.run('renderPembayaranBelumJurnal()');
  ok(e.form['inv-belum-jurnal'].innerHTML === '', 'semua sudah dijurnal: banner kosong');
  e.run('jurnalkanPembayaranInvoiceLama()');
  ok(/sudah dijurnal/.test(e.alerts[e.alerts.length - 1]) && e.run('jurnalEntries.length') === jml + 1, 'tidak ada lagi yang perlu dijurnal: alert, tidak ada jurnal ganda');
}
{
  const e = envLama({ confirm: false });
  e.run('jurnalkanPembayaranInvoiceLama()');
  ok(e.run('jurnalEntries.length') === 0 && e.run('pembayaranList.every(p => !p.jurnalNo)'), 'konfirmasi ditolak: tidak ada yang dijurnal');
}
{
  const e = envLama({ login: true });
  e.run('jurnalkanPembayaranInvoiceLama()');
  ok(e.synced.length === 1 && e.synced[0].kinds.join() === 'invoice,pembayaran' && e.synced[0].jurnalNo.every(Boolean), 'bisnis login: jurnalNo disinkron ke cloud lewat satu antrean invoice,pembayaran');
}
{
  const e = envLama({ viewer: true });
  e.run('jurnalkanPembayaranInvoiceLama()');
  ok(e.run('jurnalEntries.length') === 0 && e.confirms.length === 0, 'viewer: diblokir');
  const e2 = makeEnv(); e2.run('renderPembayaranBelumJurnal()');
  ok(e2.form['inv-belum-jurnal'].innerHTML === '', 'tanpa pembayaran sama sekali: banner kosong');
  const e3 = makeEnv(); e3.run('document.getElementById = () => null'); 
  let galat = null; try { e3.run('renderPembayaranBelumJurnal()'); } catch (x) { galat = x; }
  ok(galat === null, 'elemen banner tidak ada di halaman: tidak melempar error');
}
{
  // invoice dihapus: pembayarannya yatim dan tidak dijurnalkan (tidak ada piutang yang dikredit)
  const e = envLama();
  e.run("invoiceList = invoiceList.filter(i => i.id !== 'INV_1')");
  e.run('jurnalkanPembayaranInvoiceLama()');
  ok(e.run('jurnalEntries.length') === 1 && e.run('jurnalEntries[0].ref') === 'INV-2026-002', 'pembayaran milik invoice yang dihapus dilewati; hanya P3 yang dijurnal');
}

console.log('[pemasangan]');
const idx = rd('index.html'), ui = rd('js/32-pembayaran-ui.js'), p31 = rd('js/31-pembayaran.js'), inv11 = rd('js/11-kontak-invoice.js'), ks = rd('js/08-kartu-stock.js'), sch = rd('docs/SCHEMA.md');
ok(idx.includes('id="inv-belum-jurnal"') && idx.indexOf('id="inv-belum-jurnal"') < idx.indexOf('id="inv-kpi"') && idx.includes('id="page-invoice"'), 'index.html: placeholder banner #inv-belum-jurnal di halaman Invoice');
ok(!idx.includes('modal-inv-lunas') && !/inv-lunas-/.test(idx) && !idx.includes('konfirmasiLunasInvoice'), 'index.html: modal "Tandai Lunas" lama dihapus (satu jalur bayar)');
ok(!/belum dibuat otomatis/.test(idx) && /jurnal otomatis dibuat/.test(idx), 'catatan di modal bayar tidak lagi bilang jurnal belum dibuat');
ok(/function openModalLunasInvoice\(id\) \{ openModalBayarInvoice\(id\); \}/.test(inv11) && !/konfirmasiLunasInvoice|JRN_LNS_|inv-lunas/.test(inv11), '11-kontak-invoice.js: "Lunas" membuka form bayar; konfirmasiLunasInvoice dan JRN_LNS_ tidak ada lagi');
ok(/function renderInvoiceList\(\) \{\n  const tbody[^\n]*\n  if\(typeof renderPembayaranBelumJurnal === 'function'\) renderPembayaranBelumJurnal\(\);/.test(inv11), '11-kontak-invoice.js: hook banner satu baris di renderInvoiceList');
ok(!/postJurnalLegacy\(\w*[Pp]embayaran|jurnalPembayaranStatus|pembayaranInvoiceBelumJurnal|postingJurnalPembayaran|pembayaranList/.test(inv11.replace(/\/\/.*$/gm, '')), '11-kontak-invoice.js hanya berisi hook (tidak memuat logika jurnal pembayaran)');
ok(!ks.includes('konfirmasiLunasInvoice') && ks.includes("_wrap('simpanInvoice'"), '08-kartu-stock.js: hook audit "Lunas" lama dibuang, hook simpanInvoice utuh');
ok(!/jurnalEntries|addJurnal|postJurnal|document\.|localStorage\.(?!getItem|setItem)/.test(p31.replace(/\/\/.*$/gm, '').replace(/function simpanPembayaranState[\s\S]*?\n}\n/, '')), '31-pembayaran.js: fungsi jurnal tetap murni (tanpa jurnalEntries/postJurnal/DOM)');
ok(/postJurnalLegacy\(r\.jurnal\)/.test(ui) && /guardPeriode\(pembayaran\.tanggal/.test(ui), '32-pembayaran-ui.js memposting lewat postJurnalLegacy dan mengecek guardPeriode');
ok(ui.indexOf('postingJurnalPembayaranInvoice(hasil.pembayaran') < ui.indexOf('catatPembayaran(inv, hasil)'), 'urutan di simpan: jurnal dulu, baru catatPembayaran');
ok(sch.includes('jurnalPembayaranStatus') && sch.includes('buatJurnalPembayaranInvoice'), 'SCHEMA.md memuat buatJurnalPembayaranInvoice dan jurnalPembayaranStatus');
const urut = f => idx.indexOf('src="js/' + f + '"');
ok(urut('02-utils.js') < urut('31-pembayaran.js') && urut('16-auth-company.js') < urut('32-pembayaran-ui.js'), 'urutan script: 02-utils dan 16-auth-company dimuat sebelum 31/32');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
