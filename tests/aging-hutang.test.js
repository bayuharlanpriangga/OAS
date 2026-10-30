// Tes js/30-aging-hutang.js (Umur Hutang, task 4.7) + jenis 'hutang' di js/25-aging-ui.js + pemasangannya.
// Jalankan: node tests/aging-hutang.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const utils = rd('js/02-utils.js'), widgets = rd('js/03-widgets.js'), pen = rd('js/23-penomoran.js');
const ls = { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); } };
const ctx = { localStorage: ls, console };
vm.createContext(ctx);
vm.runInContext(utils.match(/const PPN_TARIF_STANDAR[^\n]*\n/)[0] + utils.match(/function hitungPpn[\s\S]*?\n}\n/)[0], ctx);
vm.runInContext(utils.match(/const JENIS_JURNAL = \{[\s\S]*?\n\};/)[0] + '\nvar akuns = [];\n' + utils.match(/function _tarifPpnJurnal[\s\S]*?\n}\n/)[0] + utils.match(/function ppnDariJurnal[\s\S]*?\n}\n/)[0], ctx);
vm.runInContext(['parseNomor', 'nomorBerikut', 'counterSetelahPakai'].map(n => pen.match(new RegExp('function ' + n + '[\\s\\S]*?\\n}\\n'))[0]).join('\n') + '\nlet counterList = [];', ctx);
vm.runInContext(utils.match(/function escapeHtml[\s\S]*?\n}\n/)[0] + utils.match(/function escapeForJsAttr[\s\S]*?\n}\n/)[0] + widgets.match(/const rp = n => .*;/)[0], ctx);
vm.runInContext(rd('js/24-aging.js').replace(/^const /gm, 'var '), ctx);
vm.runInContext(rd('js/25-aging-ui.js').replace(/^const /gm, 'var '), ctx);
vm.runInContext(rd('js/28-bill.js'), ctx);
vm.runInContext(rd('js/30-aging-hutang.js').replace(/^const /gm, 'var '), ctx);
const run = c => vm.runInContext(c, ctx);

// Jurnal bill: asal (aktif) dan pembaliknya. Penaut: bill.jurnalNo + ket "Tagihan <noBill> — <supplier>".
const jBill = (no, noBill, sup, tgl) => ({ no, jenis: 'Tagihan Pembelian', tanggal: tgl || '2026-09-01', ket: 'Tagihan ' + noBill + ' — ' + sup, lines: [] });
const bill = (o) => Object.assign({ id: 'B_' + o.noBill, supplier: 'PT Maju', tanggal: '2026-09-01', jatuhTempo: '2026-10-01', total: 1000000, sisaTagihan: 1000000, status: 'diterima' }, o);
ctx.__bills = [
  bill({ noBill: 'BILL-1', supplier: 'PT Maju <b>', jatuhTempo: '2026-10-01', sisaTagihan: 1500000, jurnalNo: 'JRN-1' }),            // aktif, 11 hari lewat per 12/10
  bill({ noBill: 'BILL-2', supplier: 'PT Maju <b>', jatuhTempo: '2026-02-01', sisaTagihan: 500000, jurnalNo: 'JRN-2' }),              // aktif, >90
  bill({ noBill: 'BILL-3', supplier: 'CV Abadi', jatuhTempo: '2026-11-01', sisaTagihan: 250000 }),                                    // belum dijurnal, belum JT
  bill({ noBill: 'BILL-4', supplier: 'CV Abadi', status: 'draft', sisaTagihan: 999 }),                                                 // draft: tidak ikut
  bill({ noBill: 'BILL-5', supplier: 'CV Abadi', status: 'lunas', sisaTagihan: 0 }),                                                  // lunas: tidak ikut
  bill({ noBill: 'BILL-6', supplier: 'UD Balik', sisaTagihan: 777, jurnalNo: 'JRN-6' })                                              // jurnal dibalik: tidak ikut
];
ctx.__jurnal = [
  jBill('JRN-1', 'BILL-1', 'PT Maju <b>'), jBill('JRN-2', 'BILL-2', 'PT Maju <b>'),
  jBill('JRN-6', 'BILL-6', 'UD Balik'),
  { no: 'JRN-7', jenis: 'Tagihan Pembelian', tanggal: '2026-09-02', ket: '[Pembalik JRN-6] Tagihan BILL-6 — UD Balik', lines: [] }
];

console.log('[1] billUntukAging');
const dipilih = run('billUntukAging(__bills, __jurnal)');
ok(dipilih.map(b => b.noBill).join() === 'BILL-1,BILL-2,BILL-3', 'hanya diterima yang jurnalnya tidak dibalik: BILL-1, BILL-2, BILL-3');
ok(!dipilih.some(b => b.status === 'draft' || b.status === 'lunas'), 'draft dan lunas tidak ikut');
ok(dipilih.some(b => b.noBill === 'BILL-3'), 'diterima yang belum dijurnal tetap dihitung');
ok(!dipilih.some(b => b.noBill === 'BILL-6'), 'bill yang jurnalnya dibalik tidak dihitung');
ok(dipilih[0] === run('__bills[0]'), 'mengembalikan record asli, bukan salinan');
ok(run('billUntukAging(null, null).length') === 0 && run('billUntukAging(undefined, [])').length === 0, 'daftar bukan array -> []');
ok(run('billUntukAging([null, 5, "x", {status:"diterima",noBill:"B",supplier:"S"}], undefined).length') === 1, 'elemen sampah dilewati, jurnal kosong tidak error');
ok(run('billUntukAging(__bills, null).length') === 4, 'tanpa daftar jurnal semua diterima dihitung (tidak ada yang bisa dinyatakan dibalik)');

console.log('[2] hitungAging atas bill');
const h = run('hitungAging(billUntukAging(__bills, __jurnal), "2026-10-12")');
ok(h.perKontak.map(k => k.kontak).join('|') === 'CV Abadi|PT Maju <b>', 'dikelompokkan per supplier, urut nama');
ok(h.total.total === 2250000 && h.total.lancar === 250000 && h.total.b0_30 === 1500000 && h.total.b90plus === 500000, 'total 2.250.000: belum JT 250rb, 1-30 hari 1,5jt, >90 hari 500rb');
ok(h.perKontak[1].dokumen.some(d => d.no === 'BILL-2' && d.umur === 253), 'nomor tagihan (noBill) dan umur terbaca di rincian');
ok(h.tidakValid.length === 0, 'tidak ada yang tidak valid');
const sebagian = run('hitungAging(billUntukAging([{noBill:"B",supplier:"S",status:"diterima",jatuhTempo:"2026-10-01",total:1000,sisaTagihan:400}], []), "2026-10-12")');
ok(sebagian.total.total === 400, 'pembayaran sebagian: yang dihitung sisaTagihan, bukan total');

console.log('[3] tampilan jenis hutang');
const html = run('agingPiutangHtml(hitungAging(billUntukAging(__bills, __jurnal), "2026-10-12"), "hutang")');
ok(html.includes('<table id="aging-hutang-table">') && !html.includes('aging-piutang-table'), 'id tabel hutang');
ok(html.includes('<th>Supplier</th>') && !html.includes('Pelanggan'), 'kolom Supplier, tanpa kata Pelanggan');
ok(html.includes('Total utang') && !html.includes('Total piutang'), 'ringkasan memakai Total utang');
ok(html.includes('Lewat jatuh tempo') && html.includes('Rp 2.250.000') && html.includes('Rp 2.000.000'), 'ringkasan: total 2.250.000, lewat jatuh tempo 2.000.000');
ok(html.includes('PT Maju &lt;b&gt;') && !html.includes('PT Maju <b>'), 'nama supplier di-escape');
ok(html.includes('BILL-2') && html.includes('telat 253 hari') && html.includes('belum jatuh tempo'), 'rincian: nomor tagihan dan umur');
ok(html.includes('title="Klik untuk lihat rincian tagihan"') && !html.includes('rincian invoice'), 'teks rincian: tagihan');
ok((html.match(/toggleAgingDetail\(\d+,'h'\)/g) || []).length === 4, 'klik rincian membawa awalan h (dua supplier x tabel dan kartu)');
ok(html.includes('id="aging-det-h0"') && html.includes('id="aging-kdet-h0"') && html.includes('id="aging-chev-h0"') && html.includes('id="aging-kchev-h0"'), 'semua id rincian berawalan h');
const htmlP = run('agingPiutangHtml(hitungAging([{noInvoice:"I-1",pelanggan:"Budi",jatuhTempo:"2026-10-01",sisaTagihan:5,status:"terkirim"}], "2026-10-12"))');
ok(htmlP.includes('id="aging-det-0"') && htmlP.includes('toggleAgingDetail(0)') && htmlP.includes('<th>Pelanggan</th>') && htmlP.includes('Total piutang'), 'piutang tidak berubah: id tanpa awalan, teks lama');
const idsH = new Set(html.match(/id="[^"]+"/g)), idsP = htmlP.match(/id="[^"]+"/g);
ok(!idsP.some(x => idsH.has(x)), 'id piutang dan hutang tidak bertabrakan (dua halaman ada di DOM bersamaan)');
const kosong = run('agingPiutangHtml(hitungAging([], "2026-10-12"), "hutang")');
ok(kosong.includes('Tidak ada utang belum lunas pada tanggal acuan ini.') && !kosong.includes('<table'), 'kosong: pesan utang, tanpa tabel');
ok(run('agingPiutangHtml(hitungAging([{supplier:"X",jatuhTempo:"x",tanggal:"y",sisaTagihan:5,status:"diterima"}], "2026-10-12"), "hutang")').includes('1 tagihan tidak ikut dihitung'), 'peringatan tanggal tidak valid menyebut tagihan');
ok(run('agingPiutangHtml(hitungAging([], "2026-10-12"), "ngawur")').includes('Tidak ada piutang'), 'jenis tidak dikenal jatuh ke piutang');

console.log('[4] buka/tutup rincian per awalan');
const els = {};
const el = () => ({ style: {} });
['aging-det-0', 'aging-kdet-0', 'aging-chev-0', 'aging-kchev-0', 'aging-det-h0', 'aging-kdet-h0', 'aging-chev-h0', 'aging-kchev-h0'].forEach(i => els[i] = el());
ctx.document = { getElementById: i => els[i] || null };
run("toggleAgingDetail(0, 'h')");
ok(els['aging-det-h0'].style.display === 'table-row' && els['aging-kdet-h0'].style.display === 'block' && els['aging-chev-h0'].style.transform === 'rotate(90deg)', 'hutang terbuka');
ok(!els['aging-det-0'].style.display && !els['aging-chev-0'].style.transform, 'piutang baris 0 tidak ikut terbuka');
run('toggleAgingDetail(0)');
ok(els['aging-det-0'].style.display === 'table-row' && els['aging-det-h0'].style.display === 'table-row', 'piutang dibuka sendiri, hutang tetap terbuka');
run("toggleAgingDetail(0, 'h')");
ok(els['aging-det-h0'].style.display === 'none' && els['aging-det-0'].style.display === 'table-row', 'hutang ditutup, piutang tidak terganggu');

console.log('[5] CSV dan cetak');
const csv = run('agingCsv(hitungAging(billUntukAging(__bills, __jurnal), "2026-10-12"), "hutang")').split('\n');
ok(csv[0] === '"UMUR HUTANG per 2026-10-12"', 'judul CSV');
ok(csv[1] === '"Supplier","Belum JT","1–30 hari","31–60 hari","61–90 hari",">90 hari","Total"', 'header ringkasan memakai Supplier');
ok(csv[2] === '"CV Abadi","250000","0","0","0","0","250000"', 'baris CV Abadi: angka mentah');
ok(csv.includes('"RINCIAN TAGIHAN"') && csv.some(l => l.startsWith('"Supplier","No Tagihan","Jatuh Tempo"')), 'bagian rincian: Tagihan dan No Tagihan');
ok(csv.some(l => l.includes('"BILL-2"') && l.includes('"253"') && l.includes('">90 hari"') && l.includes('"500000"')), 'rincian BILL-2: 253 hari, >90 hari, 500000');
ok(csv.some(l => l.startsWith('"TOTAL"') && l.endsWith('"2250000"')), 'baris total 2250000');
ok(!csv.join('\n').includes('Pelanggan') && !csv.join('\n').includes('INVOICE'), 'CSV tanpa kata Pelanggan/Invoice');
ok(run('agingCsv(hitungAging([{supplier:"=CMD()",jatuhTempo:"2026-10-01",sisaTagihan:5,status:"diterima",noBill:"A"}], "2026-10-12"), "hutang")').includes('"\'=CMD()"'), 'anti rumus tetap berlaku');
const cetak = run('agingCetakHtml(hitungAging(billUntukAging(__bills, __jurnal), "2026-10-12"), "PT <Maju>", "hutang")');
ok(cetak.includes('<title>Umur Hutang 12/10/2026</title>') && cetak.includes('Umur Hutang per 12/10/2026'), 'judul cetak Umur Hutang');
ok(cetak.includes('<th>Supplier</th>') && cetak.includes('<h3>Rincian Tagihan</h3>') && cetak.includes('<th>No Tagihan</th>'), 'tabel cetak memakai Supplier dan Tagihan');
ok(cetak.includes('PT &lt;Maju&gt;') && cetak.includes('PT Maju &lt;b&gt;') && cetak.includes('2.250.000'), 'nama di-escape, total tercetak');
ok(run('agingCetakHtml(hitungAging([], "2026-10-12"), "X", "hutang")').includes('Tidak ada utang belum lunas'), 'cetak kosong menyebut utang');
ok(run('agingCetakHtml(hitungAging([], "2026-10-12"), "X")').includes('Tidak ada piutang belum lunas'), 'cetak tanpa jenis tetap piutang');

console.log('[6] pemasangan (index.html, navigasi, izin)');
const idx = rd('index.html'), nav = rd('js/04-navigasi-tema.js'), dbs = rd('js/26-daftar-bisnis.js'), src30 = rd('js/30-aging-hutang.js');
ok(idx.includes('<div class="page" id="page-umur-hutang">'), 'halaman #page-umur-hutang ada');
ok(idx.includes(`onclick="showPage('umur-hutang')" data-page="umur-hutang"`), 'kartu navigasi Umur Hutang');
const idDipakai = [...src30.matchAll(/getElementById\('([^']+)'\)/g)].map(m => m[1]).concat(['aging-hutang-acuan']);
ok(idDipakai.length >= 2 && idDipakai.every(i => idx.includes('id="' + i + '"')), 'semua id yang dibaca 30-aging-hutang.js ada di index.html: ' + [...new Set(idDipakai)].join(', '));
ok(['renderAgingHutang()', 'exportAgingHutangCSV()', 'cetakAgingHutang()'].every(f => idx.includes('onclick="' + f + '"') || idx.includes('onchange="' + f + '"')), 'tombol dan input halaman memanggil fungsi yang ada');
ok(['renderAgingHutang', 'exportAgingHutangCSV', 'cetakAgingHutang'].every(f => run('typeof ' + f) === 'function'), 'fungsi halaman terdefinisi');
const urut = n => idx.indexOf('src="js/' + n + '"');
ok(urut('24-aging.js') < urut('25-aging-ui.js') && urut('29-bill-ui.js') < urut('30-aging-hutang.js') && urut('30-aging-hutang.js') > 0 && urut('30-aging-hutang.js') < urut('99-init.js'), 'urutan script: 24, 25, 29, lalu 30, sebelum 99-init');
ok(nav.includes("'umur-hutang':['Umur Hutang'") && nav.includes("if(id==='umur-hutang') renderAgingHutang();"), 'pageTitles dan hook showPage');
ok(/'umur-hutang': 'invoice'/.test(dbs), 'izin modul mengikuti Invoice');
ok(!/jenis\s*===\s*'Pembelian'/.test(src30), 'tidak menambah pembaca jenis === Pembelian');
ok(!/umur-hutang|aging-hutang|billUntukAging/.test(rd('js/28-bill.js') + rd('js/29-bill-ui.js') + rd('js/24-aging.js')), 'tidak ada hook ke 24/28/29 (batas task)');

console.log('[temuan 6.2] status sebagian dan pembelian kredit yang sudah punya bill');
{
  const bl = (o) => Object.assign({ id: 'B_' + o.noBill, supplier: 'PT Sebagian', tanggal: '2026-09-01', jatuhTempo: '2026-10-01', total: 1000000, sisaTagihan: 1000000, status: 'diterima' }, o);
  const pk = (no, nilai) => ({ no, jenis: 'Pembelian', tanggal: '2026-09-01', ket: 'Beli — PT Sebagian', lines: [{ akun: '1301', debit: nilai, kredit: 0 }, { akun: '2101', debit: 0, kredit: nilai }] });
  ctx.__bl = [bl({ noBill: 'S-1', status: 'sebagian', sisaTagihan: 400000 }),                                      // dibayar sebagian lewat alur 5.x
              bl({ noBill: 'S-2', status: 'sebagian', sisaTagihan: 300000, jurnalNo: 'JRN-50', total: 500000 }),    // pembelian kredit (jurnal Pembelian) yang dibayar sebagian
              bl({ noBill: 'S-3', status: 'lunas', sisaTagihan: 0, jurnalNo: 'JRN-51', total: 90000 })];            // pembelian kredit yang sudah lunas
  ctx.__jr = [pk('JRN-50', 500000), pk('JRN-51', 90000)];
  const dipilih2 = run('billUntukAging(__bl, __jr)');
  ok(dipilih2.length === 2 && dipilih2.every(b => b.status === 'sebagian'), 'bill sebagian ikut dihitung (dulu hilang dari Umur Hutang)');
  const h2 = run('hitungAging(billUntukAging(__bl, __jr), "2026-10-12")');
  ok(h2.total.total === 700000, 'yang dihitung sisa bill sebagian (400.000 + 300.000); jurnal pembelian yang sudah punya bill tidak muncul lagi sebagai utang penuh');
  ok(run('pembelianKreditTanpaBill(__bl, __jr)').length === 0, 'pembelianKreditTanpaBill: jurnal yang sudah punya bill (sebagian atau lunas) tidak ikut');
  ok(run('pembelianKreditTanpaBill([], __jr)').length === 2, 'pembelianKreditTanpaBill: tanpa bill, kedua jurnal kredit ikut');
}

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
