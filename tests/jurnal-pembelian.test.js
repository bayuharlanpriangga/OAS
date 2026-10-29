// Tes task 4.6b (Roadmap.md): laporan pembelian ikut membaca jurnal bill (jenis 'Tagihan Pembelian').
// Mencakup adalahJurnalPembelian, jurnalPembelianAktif, ringkasJurnalPembelian (02-utils.js), tampilan
// Jurnal Pembelian (07-jurnal-laporan.js), recalcKontakTotalTrx (11-kontak-invoice.js), dan pemasangan di
// dashboard/ekspor (pemeriksaan teks). Jalankan: node tests/jurnal-pembelian.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const utils = rd('js/02-utils.js');
const fn = (src, n) => src.match(new RegExp('function ' + n + '[\\s\\S]*?\\n}\\n'))[0];
const satuBaris = (src, n) => src.match(new RegExp('function ' + n + '[^\\n]*\\n'))[0];

const ls = { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); } };
const ctx = { localStorage: ls, console };
vm.createContext(ctx);
vm.runInContext([
  utils.match(/const JENIS_JURNAL = \{[\s\S]*?\n\};/)[0],
  utils.match(/const _REV_KET_RE[^\n]*\n/)[0],
  fn(utils, 'getReversalOf'), satuBaris(utils, 'isJurnalPembalik'), fn(utils, 'getReversedMap'), satuBaris(utils, 'isJurnalDibalik'), satuBaris(utils, 'ketTanpaPrefixPembalik'),
  satuBaris(utils, 'adalahJurnalPembelian'), fn(utils, 'jurnalPembelianAktif'), fn(utils, 'ringkasJurnalPembelian'),
  'var jurnalEntries = [];'
].join('\n'), ctx);
// jurnal bill asli (buatJurnalBill) dan pembalik asli (buatJurnalPembalik), supaya bentuk datanya sama dengan aplikasi
vm.runInContext(rd('js/28-bill.js'), ctx);
const f19 = rd('js/19-fitur-tambahan.js');
const run = c => vm.runInContext(c, ctx);
let jrn = 1;
const nomor = () => 'JRN-' + String(jrn++).padStart(3, '0');
ctx.addJurnal = e => { e.no = nomor(); ctx.jurnalEntries.push(e); };
Object.assign(ctx, { guardPeriode: () => true, fmtDate: d => d, markDirty() {}, jurnalCounter: 1, PeriodeTerkunciError: class extends Error {} });
vm.runInContext(f19.match(/function buatJurnalPembalik[\s\S]*?\n}\n/)[0], ctx);

const bill = (o) => Object.assign({ id: 'B1', noBill: 'BILL-2026-001', supplier: 'PT Maju', tanggal: '2026-10-01', status: 'diterima', akunUtang: '2101',
  items: [{ nama: 'Kertas', qty: 2, harga: 50000, akun: '1301' }], ppn: 11000, ppnTarif: 11 }, o || {});
const jurnalBill = (o) => { ctx.__b = bill(o); const r = run('buatJurnalBill(__b, {akunPpnMasukan:"1502"})'); const e = r.jurnal; e.ket = e.keterangan; e.no = nomor(); delete e.ref; return e; };
const pembelian = (no, kredit, ref) => ({ no, tanggal: '2026-10-02', jenis: 'Pembelian', ket: 'Pembelian persediaan', ref,
  lines: [{ akun: '1301', debit: 100000, kredit: 0 }, { akun: '1502', debit: 11000, kredit: 0, ket: 'PPN Masukan 11%' }, { akun: kredit, debit: 0, kredit: 111000 }] });

console.log('[adalahJurnalPembelian]');
ok(run('adalahJurnalPembelian({jenis:"Pembelian"})') === true, 'Pembelian: ya');
ok(run('adalahJurnalPembelian({jenis:"Tagihan Pembelian"})') === true && run('adalahJurnalPembelian({jenis:JENIS_JURNAL.BILL})') === true, 'Tagihan Pembelian (bill): ya');
ok(['Penjualan', 'Manual', 'Invoice & Piutang', 'Kas', 'Pembelian ', ''].every(j => run('adalahJurnalPembelian({jenis:' + JSON.stringify(j) + '})') === false), 'jenis lain: tidak (termasuk "Pembelian " dengan spasi)');
ok(run('adalahJurnalPembelian(null)') === false && run('adalahJurnalPembelian()') === false && run('adalahJurnalPembelian({})') === false, 'null/undefined/kosong tidak error');

console.log('[jurnalPembelianAktif] jurnal dibalik + pembaliknya tidak dihitung');
const jP1 = pembelian('JRN-901', '1101', 'PO-001');
const jB1 = jurnalBill();                       // bill 1, kemudian dibalik (dihapus)
ctx.jurnalEntries.push(jP1, jB1);
const aktif0 = run('jurnalPembelianAktif()').map(j => j.no);
ok(aktif0.length === 2 && aktif0.includes('JRN-901') && aktif0.includes(jB1.no), 'bill diterima ikut terbaca bersama pembelian produk');
ctx.__asal = ctx.jurnalEntries.find(j => j.no === jB1.no);
const pb = run('buatJurnalPembalik(__asal, {tanggal:"2026-10-29", alasan:"Tagihan BILL-2026-001 dihapus"})');
ok(pb && pb.jenis === 'Tagihan Pembelian' && pb.reversalOf === jB1.no, 'pembalik asli mewarisi jenis Tagihan Pembelian (itulah sebabnya perlu disaring)');
const aktif1 = run('jurnalPembelianAktif()').map(j => j.no);
ok(aktif1.join() === 'JRN-901', 'bill yang dihapus (asal + pembalik) tidak lagi terhitung; pembelian produk tetap');
const jB2 = jurnalBill({ id: 'B2', noBill: 'BILL-2026-002', supplier: 'CV Sinar' });
ctx.jurnalEntries.push(jB2);
ok(run('jurnalPembelianAktif()').map(j => j.no).join() === 'JRN-901,' + jB2.no, 'bill kedua yang masih aktif terbaca');
// pembalik yang datang dari cloud: tidak ada reversalOf, hanya awalan ket
ctx.jurnalEntries.push(Object.assign(pembelian('JRN-950', '2101', 'PO-009')), { no: 'JRN-951', tanggal: '2026-10-05', jenis: 'Pembelian', ket: '[Pembalik JRN-950] Pembelian persediaan', lines: [{ akun: '2101', debit: 111000, kredit: 0 }, { akun: '1301', debit: 0, kredit: 100000 }, { akun: '1502', debit: 0, kredit: 11000 }] });
ok(!run('jurnalPembelianAktif()').some(j => j.no === 'JRN-950' || j.no === 'JRN-951'), 'pembalik dikenali dari awalan ket saja (data cloud): pasangan dibuang');
ctx.jurnalEntries.push({ no: 'JRN-960', tanggal: '2026-10-06', jenis: 'Penjualan', ket: 'x', lines: [] });
ok(!run('jurnalPembelianAktif()').some(j => j.no === 'JRN-960'), 'jenis lain tidak ikut');
ctx.__sub = [jP1, jB2];
ok(run('jurnalPembelianAktif(__sub)').length === 2 && run('jurnalPembelianAktif([])').length === 0, 'daftar yang diberikan dipakai (bukan semua jurnal)');
ok(run('jurnalPembelianAktif(null)').length === run('jurnalPembelianAktif()').length, 'null = semua jurnal');

console.log('[ringkasJurnalPembelian]');
let rs = run('ringkasJurnalPembelian(jurnalEntries.find(j=>j.no===' + JSON.stringify(jB2.no) + '))');
ok(rs.debit.length === 2 && rs.debit[0].akun === '1301' && rs.debit[1].akun === '1502', 'bill: semua baris debit, termasuk PPN Masukan');
ok(rs.totalDebit === 111000 && rs.kredit === 111000 && rs.tunai === false, 'bill: total debit = kredit = total tagihan, bukan tunai');
ok(rs.no === 'BILL-2026-002', 'bill: nomor dokumen dibaca dari ket (ref tidak tersimpan ke cloud)');
ctx.__j = jurnalBill({ id: 'B3', noBill: 'BILL-2026-003', akunUtang: '2102' }); rs = run('ringkasJurnalPembelian(__j)');
ok(rs.kredit === 111000 && rs.debit.length === 2, 'bill dengan akun utang bukan 2101: kredit tetap terbaca (bukan 0)');
ctx.__j = jurnalBill({ id: 'B9', noBill: 'BILL-2026-009', ppn: 0, ppnTarif: 0, items: [{ nama: 'Setoran', qty: 1, harga: 70000, akun: '1101' }, { nama: 'ATK', qty: 1, harga: 30000, akun: '6101' }] }); rs = run('ringkasJurnalPembelian(__j)');
ok(rs.debit.length === 2 && rs.totalDebit === 100000 && rs.kredit === 100000, 'bill dengan item berakun Kas (1101, boleh dipilih di form): baris debit-nya tetap tampil dan totalnya benar');
rs = run('ringkasJurnalPembelian(jurnalEntries.find(j=>j.no==="JRN-901"))');
ok(rs.debit.length === 2 && rs.totalDebit === 111000 && rs.kredit === 111000 && rs.tunai === true && rs.no === 'PO-001', 'pembelian tunai (Kas): ref dipakai, tunai, PPN ikut tampil sebagai debit');
ctx.__j = pembelian('JRN-902', '2101', ''); rs = run('ringkasJurnalPembelian(__j)');
ok(rs.tunai === false && rs.kredit === 111000 && rs.no === 'JRN-902', 'pembelian kredit (Utang): bukan tunai; tanpa ref memakai nomor jurnal');
ctx.__j = { no: 'JRN-903', jenis: 'Pembelian', lines: [{ akun: '1101', debit: 50, kredit: 0 }, { akun: '1301', debit: 0, kredit: 50 }] }; rs = run('ringkasJurnalPembelian(__j)');
ok(rs.debit.length === 0 && rs.kredit === 0, 'pembelian lama tanpa debit non-Kas/Utang: tidak ada baris debit (perilaku lama: dilewati)');
ok(run('ringkasJurnalPembelian(null).debit.length') === 0 && run('ringkasJurnalPembelian({}).no') === '' && run('ringkasJurnalPembelian({jenis:"Tagihan Pembelian",lines:null}).kredit') === 0, 'null/kosong tidak error');
ctx.__j = jurnalBill({ id: 'B4', noBill: 'BILL-2026-004' }); const sblm = JSON.stringify(ctx.__j); run('ringkasJurnalPembelian(__j)');
ok(JSON.stringify(ctx.__j) === sblm, 'masukan tidak diubah');

console.log('[renderJurnalPembelian] tampilan (stub DOM)');
const els = {}; const el = id => els[id] || (els[id] = { value: '', innerHTML: '' });
Object.assign(ctx, {
  document: { getElementById: el }, fmtRp: n => 'Rp' + (n || 0).toLocaleString('id-ID'), emptyState: m => m,
  akunNamaTampil: k => ({ '1301': 'Persediaan', '1502': 'PPN Masukan', '6101': 'Beban ATK' }[k] || k)
});
vm.runInContext(fn(rd('js/07-jurnal-laporan.js'), 'renderJurnalPembelian'), ctx);
ctx.jurnalEntries.length = 0;
const jR1 = pembelian('JRN-010', '1101', 'PO-001');
const jRB = jurnalBill({ id: 'B5', noBill: 'BILL-2026-005', supplier: 'PT Sentosa' });
const jRX = jurnalBill({ id: 'B6', noBill: 'BILL-2026-006', supplier: 'CV Hapus' });
ctx.jurnalEntries.push(jR1, jRB, jRX);
ctx.__asal = jRX; run('buatJurnalPembalik(__asal, {tanggal:"2026-10-29", alasan:"dihapus"})');
el('filter-jb').value = ''; run('renderJurnalPembelian()');
let h = el('jurnal-pembelian-body').innerHTML;
ok((h.match(/<tr>/g) || []).length === 2, 'tampil 2 baris: pembelian produk + bill aktif (bill yang dibalik tidak tampil)');
ok(h.includes('BILL-2026-005') && h.includes('PT Sentosa') && !h.includes('CV Hapus') && !h.includes('BILL-2026-006'), 'bill aktif tampil dengan nomor dan supplier; bill yang dihapus tidak');
ok(h.includes('Persediaan — <span class="debit">Rp100.000</span><br>PPN Masukan — <span class="debit">Rp11.000</span>'), 'bill: baris debit Persediaan dan PPN Masukan tampil keduanya');
ok(h.includes('class="kredit">Rp111.000'), 'kolom kredit = total tagihan');
ok(/badge-yellow">Kredit/.test(h) && /badge-green">Tunai/.test(h), 'bill = Kredit, pembelian Kas = Tunai');
el('filter-jb').value = 'bill-2026-005'; run('renderJurnalPembelian()');
ok((el('jurnal-pembelian-body').innerHTML.match(/<tr>/g) || []).length === 1, 'cari nomor bill: ketemu');
el('filter-jb').value = 'po-001'; run('renderJurnalPembelian()');
ok(/PO-001/.test(el('jurnal-pembelian-body').innerHTML) && !/BILL-2026-005/.test(el('jurnal-pembelian-body').innerHTML), 'cari nomor faktur pembelian produk: tetap jalan');
el('filter-jb').value = 'tidak-ada'; run('renderJurnalPembelian()');
ok(/Tidak ada pembelian sesuai pencarian/.test(el('jurnal-pembelian-body').innerHTML), 'tanpa hasil: pesan kosong');
ctx.jurnalEntries.length = 0; el('filter-jb').value = ''; run('renderJurnalPembelian()');
ok(/Belum ada pembelian/.test(el('jurnal-pembelian-body').innerHTML), 'tanpa jurnal: pesan belum ada pembelian');

console.log('[recalcKontakTotalTrx] total pembelian per kontak');
vm.runInContext(fn(rd('js/11-kontak-invoice.js'), 'recalcKontakTotalTrx'), ctx);
run('var kontakList = [{id:"K1",nama:"PT Maju"},{id:"K2",nama:"CV Lain"}]');
ctx.jurnalEntries.length = 0;
const jK1 = Object.assign(pembelian('JRN-020', '1101', 'PO-020'), { kontakId: 'K1' });
const jK2 = Object.assign(jurnalBill({ id: 'B7', noBill: 'BILL-2026-007' }), { kontakId: 'K1' });
const jK3 = Object.assign(jurnalBill({ id: 'B8', noBill: 'BILL-2026-008' }), { kontakId: 'K2' });
const jKJ = { no: 'JRN-021', tanggal: '2026-10-02', jenis: 'Penjualan', ket: 'x', kontakId: 'K2', lines: [{ akun: '1101', debit: 5000, kredit: 0 }, { akun: '4101', debit: 0, kredit: 5000 }] };
ctx.jurnalEntries.push(jK1, jK2, jK3, jKJ);
run('recalcKontakTotalTrx()');
ok(run('kontakList[0].totalPembelian') === 222000 && run('kontakList[0].totalPenjualan') === 0, 'pembelian produk + jurnal bill dengan kontakId dihitung sebagai pembelian');
ok(run('kontakList[1].totalPembelian') === 111000 && run('kontakList[1].totalPenjualan') === 5000, 'kontak lain: pembelian dan penjualan terpisah');
ctx.__asal = jK3; run('buatJurnalPembalik(__asal, {tanggal:"2026-10-29", alasan:"dihapus"})');
run('recalcKontakTotalTrx()');
ok(run('kontakList[1].totalPembelian') === 0, 'bill yang dibalik: total pembelian kembali 0 (pembalik tidak menambah lagi)');

console.log('[pemasangan] semua pembaca jenis Pembelian memakai helper');
const files = fs.readdirSync(path.join(__dirname, '..', 'js')).filter(f => f.endsWith('.js'));
const sisa = files.filter(f => /\.jenis\s*===?\s*'Pembelian'/.test(rd('js/' + f)));
ok(sisa.join() === '02-utils.js', 'tidak ada lagi `jenis === \'Pembelian\'` di luar helper (02-utils.js): ' + (sisa.join() || '-'));
ok((rd('js/14-export.js').match(/jurnalPembelianAktif\(\)/g) || []).length === 2 && (rd('js/14-export.js').match(/ringkasJurnalPembelian\(j\)/g) || []).length === 2, '14-export.js: Excel dan PDF memakai helper');
ok(/jurnalPembelianAktif\(\)\.filter\(j => j\.tanggal>=fromStr/.test(rd('js/13-analitik-dashboard.js')), '13-analitik-dashboard.js: rekap Siap Setor memakai helper dengan filter tanggal');
ok(/const totalPembelian=jurnalPembelianAktif\(\)/.test(f19), '19-fitur-tambahan.js: total pembelian pajak memakai helper');
ok(/jurnalPembelianAktif\(\)\.forEach/.test(rd('js/07-jurnal-laporan.js')) && /j===JENIS_JURNAL\.BILL\) return 'badge-yellow'/.test(rd('js/07-jurnal-laporan.js')), '07-jurnal-laporan.js: Jurnal Pembelian memakai helper; badge bill kuning seperti Pembelian');
ok(!/\b(jurnalEntries|postJurnal|addJurnal)/.test(rd('js/28-bill.js')), '28-bill.js tetap murni (tidak menyentuh jurnal langsung)');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
