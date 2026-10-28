// Tes js/25-aging-ui.js (bagian murni). Jalankan: node tests/aging-ui.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const baca = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
// escapeHtml & rp disalin dari kode asli (02-utils.js, 03-widgets.js) lewat potongan sumbernya.
const utils = baca('02-utils.js'), widgets = baca('03-widgets.js');
const esc = utils.match(/function escapeHtml\(str\) \{[\s\S]*?\n\}/)[0];
const rpSrc = widgets.match(/const rp = n => .*;/)[0];
const ctx = {}; vm.createContext(ctx);
vm.runInContext(esc + '\n' + rpSrc + '\n' + baca('24-aging.js').replace(/^const /gm, 'var ') + '\n' + baca('25-aging-ui.js').replace(/^const /gm, 'var '), ctx);
const run = c => vm.runInContext(c, ctx);
ctx.__d = [
  { noInvoice: 'INV-1', pelanggan: 'Budi <b>', tanggal: '2026-08-01', jatuhTempo: '2026-10-01', sisaTagihan: 1500000, status: 'terkirim' },
  { noInvoice: 'INV-2', pelanggan: 'Budi <b>', tanggal: '2026-01-01', jatuhTempo: '2026-02-01', sisaTagihan: 500000, status: 'terkirim' },
  { noInvoice: 'INV-3', pelanggan: 'Ani', tanggal: '2026-09-01', jatuhTempo: '2026-11-01', sisaTagihan: 250000, status: 'terkirim' },
  { noInvoice: 'INV-4', pelanggan: 'Ani', tanggal: 'x', jatuhTempo: 'y', sisaTagihan: 9, status: 'terkirim' }
];
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

console.log('[1] HTML tabel');
const html = run('agingPiutangHtml(hitungAging(__d, "2026-10-12"))');
ok(html.includes('Budi &lt;b&gt;') && !html.includes('Budi <b>'), 'nama pelanggan di-escape');
ok(html.indexOf('>Ani<') < html.indexOf('Budi'), 'urut nama pelanggan');
ok(html.includes('Rp 2.250.000'), 'total semua = 2.250.000 (1.500.000 + 500.000 + 250.000)');
ok(html.includes('Rp 500.000'), 'bucket >90 hari Budi tampil');
ok(html.includes('telat 253 hari') && html.includes('belum jatuh tempo'), 'rincian dokumen: umur & belum jatuh tempo');
ok(html.includes('1 invoice tidak ikut dihitung'), 'peringatan tanggal tidak valid');
ok((html.match(/toggleAgingDetail\(/g) || []).length === 4, 'satu klik per pelanggan di tabel dan satu di kartu');
ok(html.includes('class="table-scroll aging-tabel"') && html.includes('class="aging-kartu"'), 'tabel (desktop) dan kartu (HP) sama-sama dirender');
ok(html.includes('Total piutang') && html.includes('Lewat jatuh tempo') && html.includes('Rp 2.000.000'), 'ringkasan: total piutang dan yang sudah lewat jatuh tempo (2.000.000)');
const kartuAni = html.slice(html.indexOf('aging-kartu-item'), html.indexOf('aging-kartu-item', html.indexOf('aging-kartu-item') + 5));
ok(kartuAni.includes('Belum JT') && !kartuAni.includes('1–30 hari') && !kartuAni.includes('&gt;90'), 'kartu hanya menampilkan kelompok umur yang ada isinya');
ok(!html.includes('Umur dihitung dari jatuh tempo'), 'teks penjelasan panjang sudah dihapus');
ok(html.includes('aging-kdet-0') && html.includes('aging-det-0'), 'rincian invoice tersedia di kartu dan tabel');

console.log('[2] kosong');
const kosong = run('agingPiutangHtml(hitungAging([], "2026-10-12"))');
ok(kosong.includes('Tidak ada piutang belum lunas') && !kosong.includes('<table id="aging-piutang-table"'), 'pesan kosong, tanpa tabel');
ok(!kosong.includes('aging-ringkas') && !kosong.includes('aging-kartu'), 'kosong: tanpa ringkasan dan kartu');

console.log('[3] tanggal lokal');
ok(/^\d{4}-\d{2}-\d{2}$/.test(run('agingHariIni()')), 'agingHariIni berformat YYYY-MM-DD');

console.log('[4] CSV');
const csv = run('agingCsv(hitungAging(__d, "2026-10-12"))');
const L = csv.split('\n');
ok(L[0] === '"UMUR PIUTANG per 2026-10-12"', 'judul + tanggal acuan');
ok(L[1] === '"Pelanggan","Belum JT","1–30 hari","31–60 hari","61–90 hari",">90 hari","Total"', 'header ringkasan');
ok(L[2] === '"Ani","250000","0","0","0","0","250000"', 'baris Ani: angka mentah');
ok(L[3] === '"Budi <b>","1500000","0","0","0","500000","2000000"'.replace('"1500000","0","0","0","500000"', '"0","1500000","0","0","500000"'), 'baris Budi: 1.500.000 di 1–30 dan 500.000 di >90');
ok(L[4] === '"TOTAL","250000","1500000","0","0","500000","2250000"', 'baris total');
ok(L.includes('"RINCIAN INVOICE"') && L.includes('"Budi <b>","INV-2","2026-02-01","253",">90 hari","500000"'), 'rincian per invoice');
ok(L.filter(x => x.startsWith('"Budi')).length === 3, 'Budi: 1 ringkasan + 2 rincian');
const inj = run('agingCsv(hitungAging([{pelanggan:"=HYPERLINK(1)",jatuhTempo:"2026-10-01",sisaTagihan:5,status:"terkirim",noInvoice:"A\\"B"}], "2026-10-12"))');
ok(inj.includes('"\'=HYPERLINK(1)"'), 'awalan = diberi apostrof (anti rumus)');
ok(inj.includes('"A""B"'), 'tanda kutip digandakan');

console.log('[5] cetak');
const cetak = run('agingCetakHtml(hitungAging(__d, "2026-10-12"), "PT <Maju>")');
ok(cetak.startsWith('<!DOCTYPE html>') && cetak.includes('PT &lt;Maju&gt;'), 'dokumen lengkap, nama perusahaan di-escape');
ok(cetak.includes('per 12/10/2026'), 'tanggal acuan DD/MM/YYYY');
ok(cetak.includes('Budi &lt;b&gt;') && !cetak.includes('Budi <b>'), 'nama pelanggan di-escape');
ok(cetak.includes('Rincian Invoice') && cetak.includes('INV-2') && cetak.includes('253 hari'), 'rincian ikut tercetak');
ok(cetak.includes('2.250.000'), 'total tercetak');
ok(!run('agingCetakHtml(hitungAging([], "2026-10-12"), "X")').includes('Rincian Invoice'), 'kosong: tanpa tabel');

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
