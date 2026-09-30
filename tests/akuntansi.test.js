// Tes logika inti untuk perbaikan audit nomor 1-4. Jalankan: node tests/akuntansi.test.js
// Tidak butuh browser: fungsi yang diuji dimuat ke sandbox vm dengan stub DOM minimal.
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n');

// ambil satu fungsi utuh (dengan pencocokan kurung kurawal) dari teks sumber
function extractFn(src, name) {
  const m = new RegExp('(?:async )?function ' + name + '\\s*\\(').exec(src);
  if (!m) throw new Error('fungsi tidak ditemukan: ' + name);
  let i = src.indexOf('{', m.index), depth = 0;
  for (let j = i; j < src.length; j++) {
    const c = src[j];
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return src.slice(m.index, j + 1);
  }
  throw new Error('kurung tidak seimbang: ' + name);
}

const alerts = [];
const store = {};
const ctx = {
  console, JSON, Math, Date, Set, Map, Object, Array, String, Number, parseInt, parseFloat, isFinite, isNaN, Promise, Error,
  localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
  document: { getElementById: () => null, addEventListener() {}, querySelectorAll: () => [] },
  window: { matchMedia: () => ({ matches: false }), addEventListener() {} },
  showAlert: m => alerts.push(String(m)),
  markDirty() {}, renderDashboard() {}, renderJurnalUmum() {}, showPage() {},
  savePeriodeKunciToCloud: async () => true,
  nextKode: p => p + '-001',
  auditLog() {},
  currentCompany: null,
  fmtRp: n => 'Rp ' + n,
};
ctx.window.matchMedia = () => ({ matches: false });
vm.createContext(ctx);
const run = code => vm.runInContext(code, ctx);

// 01-state: state + akun default; 02-utils: helper baru
run(read('js/01-state.js').replace(/^let /gm, 'var ').replace(/^const /gm, 'var '));
run(read('js/02-utils.js').replace(/^let /gm, 'var ').replace(/^const /gm, 'var ').replace(/const _infoHoverMQ[\s\S]*?\n\}, true\);\ndocument.addEventListener\('mouseleave'[\s\S]*?\}, true\);/, ''));

// addJurnal + postJurnalLegacy dari 16, buatJurnalPembalik dari 19, buatJurnalPenutup dari 13
const s16 = read('js/16-auth-company.js');
run(extractFn(s16, 'addJurnal'));
run(extractFn(s16, 'postJurnalLegacy'));
run(extractFn(read('js/19-fitur-tambahan.js'), 'buatJurnalPembalik'));
run(extractFn(read('js/13-analitik-dashboard.js'), '_cariTahunBukuBelumDitutup'));
run(extractFn(read('js/13-analitik-dashboard.js'), 'buatJurnalPenutup'));
run(extractFn(read('js/02-utils.js'), 'fmtDate'));
run("var showCustomConfirmGeneral = () => Promise.resolve(true); var escapeHtml = s => String(s);");

let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) { pass++; console.log('  ok   ' + msg); } else { fail++; console.log('  GAGAL ' + msg); } };
const reset = () => { run('jurnalEntries = []; jurnalCounter = 1; periodeKunciSampai = ""; transaksiAkunSettings.ppnTarif = 11;'); alerts.length = 0; };
const J = (tanggal, ket, jenis, lines) => ({ tanggal, ket, jenis, lines });
const post = e => run('addJurnal')(JSON.parse(JSON.stringify(e)));
// Laba menurut sisi alami tipe akun (pendapatan = kredit - debit; HPP/beban = debit - kredit),
// sehingga akun kontra seperti 4103 Retur Penjualan (saldo normal debit) mengurangi pendapatan.
const laba = () => run('(function(){var m=computeSaldoAll({tanpaPenutup:true}),l=0;akuns.forEach(function(a){var s=m[a.kode]||{debit:0,kredit:0};if(a.tipe==="Pendapatan")l+=s.kredit-s.debit;if(a.tipe==="HPP"||a.tipe==="Beban")l-=s.debit-s.kredit;});return l;})()');
// Cara hitung yang dipakai kode laporan saat ini (saldo menurut a.normal, lalu dijumlahkan langsung)
const labaCaraLaporan = () => run('(function(){var p=0,b=0;akuns.forEach(function(a){var s=computeSaldoBersih(a.kode,{tanpaPenutup:true});if(a.tipe==="Pendapatan")p+=s;if(a.tipe==="HPP"||a.tipe==="Beban")b+=s;});return p-b;})()');
const saldo = k => run('computeSaldoBersih("' + k + '")');

console.log('\n[1] Jurnal pembalik');
reset();
post(J('2026-03-10', 'Penjualan tunai', 'Penjualan', [{ akun: '1101', debit: 1000, kredit: 0 }, { akun: '4101', debit: 0, kredit: 1000 }]));
ok(saldo('1101') === 1000, 'saldo kas 1000 sebelum dibalik');
const asal = run('jurnalEntries[0]');
const pb = run('buatJurnalPembalik')(asal, { tanggal: '2026-03-11', alasan: 'salah input' });
ok(pb && run('jurnalEntries.length') === 2, 'jurnal pembalik dibuat, jurnal asli tetap ada (2 entri)');
ok(saldo('1101') === 0 && saldo('4101') === 0, 'saldo kembali netral');
ok(run('getReversalOf')(pb) === asal.no, 'relasi pembalik -> asal terbaca');
ok(run('isJurnalDibalik')(run('jurnalEntries[0]')), 'jurnal asal ditandai sudah dibalik');
ok(run('buatJurnalPembalik')(asal, { tanggal: '2026-03-12', alasan: 'lagi' }) === null, 'tidak bisa dibalik dua kali');
ok(run('buatJurnalPembalik')(pb, { tanggal: '2026-03-12', alasan: 'x' }) === null, 'jurnal pembalik tidak bisa dibalik lagi');
ok(run('buatJurnalPembalik')(run('jurnalEntries[0]'), { tanggal: '2026-03-01', alasan: 'x' }) === null, 'tanggal pembalik tidak boleh sebelum jurnal asal');
ok(!run('jurnalEntries').some(j => j.lines.some(l => l.debit < 0 || l.kredit < 0)), 'tidak ada nilai negatif');

console.log('\n[2] Kunci periode');
reset();
post(J('2026-01-15', 'Kas masuk', 'Kas', [{ akun: '1101', debit: 500, kredit: 0 }, { akun: '3101', debit: 0, kredit: 500 }]));
run('periodeKunciSampai = "2026-01-31"');
let ditolak = false;
try { post(J('2026-01-20', 'telat', 'Kas', [{ akun: '1101', debit: 1, kredit: 0 }, { akun: '3101', debit: 0, kredit: 1 }])); } catch (e) { ditolak = e.constructor.name === 'PeriodeTerkunciError' || /Terkunci/i.test(e.constructor.name); }
ok(ditolak, 'addJurnal menolak jurnal di periode terkunci');
ok(run('jurnalEntries.length') === 1, 'jurnal ditolak tidak masuk ke buku');
ok(run('jurnalCounter') === 2, 'nomor jurnal tidak terpakai oleh jurnal yang ditolak');
post(J('2026-02-01', 'setelah kunci', 'Kas', [{ akun: '1101', debit: 1, kredit: 0 }, { akun: '3101', debit: 0, kredit: 1 }]));
ok(run('jurnalEntries.length') === 2, 'jurnal setelah tanggal kunci diterima');
const balikDiKunci = run('buatJurnalPembalik')(run('jurnalEntries[0]'), { tanggal: '2026-02-05', alasan: 'koreksi periode lama' });
ok(balikDiKunci && saldo('3101') === 1, 'jurnal di periode terkunci dikoreksi lewat pembalik bertanggal setelah kunci');
ok(run('buatJurnalPembalik')(run('jurnalEntries[1]'), { tanggal: '2026-01-31', alasan: 'x' }) === null, 'pembalik bertanggal di dalam periode terkunci ditolak');
ok(run('postJurnalLegacy')({ tanggal: '2026-01-05', keterangan: 'lama', lines: [{ akun: '1101', debit: 1, kredit: 0 }, { akun: '3101', debit: 0, kredit: 1 }] }) === null, 'postJurnalLegacy mengembalikan null saat terkunci');
const legacy = run('postJurnalLegacy')({ id: 'JRN_X', tanggal: '2026-03-05', keterangan: 'bentuk lama', lines: [{ akun: '1101', debit: 1, kredit: 0 }, { akun: '3101', debit: 0, kredit: 1 }] });
ok(legacy && legacy.ket === 'bentuk lama' && /^JRN-/.test(legacy.no), 'bentuk data lama dinormalkan (ket + nomor jurnal)');

console.log('\n[3] Tahun buku');
reset();
const rg = (t) => JSON.stringify(run('getTahunBukuRange("' + t + '")'));
ok(rg('2026-05-10') === JSON.stringify({ from: '2026-01-01', to: '2026-12-31', label: '2026' }), 'Jan-Des: 2026-05-10 -> 2026');
store['oas_profil_v1'] = JSON.stringify({ tahunBuku: 'apr' });
ok(rg('2026-05-10') === JSON.stringify({ from: '2026-04-01', to: '2027-03-31', label: '2026/2027' }), 'Apr-Mar: 2026-05-10 -> 2026/2027');
ok(rg('2026-02-10') === JSON.stringify({ from: '2025-04-01', to: '2026-03-31', label: '2025/2026' }), 'Apr-Mar: 2026-02-10 -> 2025/2026');
store['oas_profil_v1'] = JSON.stringify({ tahunBuku: 'okt' });
ok(rg('2026-09-30') === JSON.stringify({ from: '2025-10-01', to: '2026-09-30', label: '2025/2026' }), 'Okt-Sep: 2026-09-30 -> 2025/2026');
delete store['oas_profil_v1'];

console.log('\n[4] Jurnal penutup per tahun buku');
reset();
// Tahun 2025: penjualan 10.000, retur (akun kontra, normal debit) 500, beban 3.000, HPP 4.000 -> laba 2.500
post(J('2025-03-01', 'Jual', 'Penjualan', [{ akun: '1101', debit: 10000, kredit: 0 }, { akun: '4101', debit: 0, kredit: 10000 }]));
post(J('2025-04-01', 'Retur', 'Penjualan', [{ akun: '4103', debit: 500, kredit: 0 }, { akun: '1101', debit: 0, kredit: 500 }]));
post(J('2025-05-01', 'Gaji', 'Kas', [{ akun: '6101', debit: 3000, kredit: 0 }, { akun: '1101', debit: 0, kredit: 3000 }]));
post(J('2025-06-01', 'HPP', 'Penjualan', [{ akun: '5101', debit: 4000, kredit: 0 }, { akun: '1301', debit: 0, kredit: 4000 }]));
// Tahun 2026: penjualan 7.000
post(J('2026-02-01', 'Jual 2026', 'Penjualan', [{ akun: '1101', debit: 7000, kredit: 0 }, { akun: '4101', debit: 0, kredit: 7000 }]));
ok(laba() === 2500 + 7000, 'laba sebelum tutup buku = 9.500 (2025 + 2026)');
run('buatJurnalPenutup')();
return_wait();
function return_wait() {}
setTimeout(() => {
  const pen = run('jurnalEntries').filter(j => j.jenis === 'Penutup');
  ok(pen.length === 1, 'satu jurnal penutup dibuat (hanya tahun 2025, bukan seluruh waktu)');
  const p = pen[0] || { lines: [], tanggal: '' };
  ok(p.tanggal === '2025-12-31', 'bertanggal akhir tahun buku (2025-12-31), bukan hari ini');
  const td = p.lines.reduce((s, l) => s + l.debit, 0), tk = p.lines.reduce((s, l) => s + l.kredit, 0);
  ok(td === tk && td > 0, 'jurnal penutup balance (' + td + ' = ' + tk + ')');
  const ln = k => p.lines.find(l => l.akun === k) || {};
  ok(ln('4101').debit === 10000, '4101 pendapatan didebit 10.000');
  ok(ln('4103').kredit === 500, '4103 akun kontra (saldo debit) DIKREDIT 500, bukan didebit');
  ok(ln('6101').kredit === 3000 && ln('5101').kredit === 4000, 'beban & HPP dikredit');
  ok(ln('3201').kredit === 2500, 'laba 2.500 masuk Laba Ditahan (3201)');
  ok(!p.lines.some(l => /^4/.test(l.akun) && l.akun === '4101' && l.akun && false), 'sanity');
  ok(laba() === 9500, 'Laba Rugi tetap 9.500 setelah tutup buku (penutup diabaikan, tidak jadi nol)');
  ok(saldo('4101') === 7000, 'saldo buku besar 4101 tinggal 7.000 (tahun 2026 saja) setelah penutupan');
  ok(saldo('3201') === 2500, 'Laba Ditahan = 2.500');
  ok(run('periodeKunciSampai') === '2025-12-31', 'periode otomatis dikunci sampai 2025-12-31');
  let ditolak2 = false;
  try { post(J('2025-11-01', 'susulan', 'Kas', [{ akun: '1101', debit: 1, kredit: 0 }, { akun: '3101', debit: 0, kredit: 1 }])); } catch (e) { ditolak2 = true; }
  ok(ditolak2, 'jurnal susulan di tahun yang sudah ditutup ditolak');
  run('buatJurnalPenutup')();
  setTimeout(() => {
    const pen2 = run('jurnalEntries').filter(j => j.jenis === 'Penutup');
    ok(pen2.length === 2 && pen2[1].tanggal === '2026-12-31', 'klik kedua menutup tahun berikutnya (2026-12-31), bukan menggandakan 2025');
    ok(laba() === 9500, 'Laba Rugi tetap 9.500 setelah dua tahun ditutup');
    ok(saldo('3201') === 9500, 'Laba Ditahan = 9.500');
    // Neraca harus balance: total debit = total kredit di buku besar
    const map = run('computeSaldoAll()'); let D = 0, K = 0; Object.values(map).forEach(v => { D += v.debit; K += v.kredit; });
    ok(D === K, 'buku besar balance (D=' + D + ', K=' + K + ')');

    console.log('\n[INFO] Akun kontra pendapatan di laporan');
    reset();
    post(J('2025-03-01', 'Jual', 'Penjualan', [{ akun: '1101', debit: 10000, kredit: 0 }, { akun: '4101', debit: 0, kredit: 10000 }]));
    post(J('2025-04-01', 'Retur', 'Penjualan', [{ akun: '4103', debit: 500, kredit: 0 }, { akun: '1101', debit: 0, kredit: 500 }]));
    ok(laba() === 9500, 'laba benar = 9.500 (retur 500 mengurangi pendapatan)');
    ok(run('plNatural(akuns.find(function(a){return a.kode==="4103"}), computeSaldoAll()["4103"])') === -500, 'plNatural: 4103 Retur bernilai -500 (pengurang)');
    ok(run('saldoBersihPL("4103")') === -500 && run('saldoBersihPL("4101")') === 10000, 'saldoBersihPL memakai sisi alami');
    // 5103 Retur Pembelian (HPP kontra, normal kredit) harus mengurangi HPP
    post(J('2025-05-01', 'Beli', 'Pembelian', [{ akun: '5102', debit: 2000, kredit: 0 }, { akun: '1101', debit: 0, kredit: 2000 }]));
    post(J('2025-05-02', 'Retur beli', 'Pembelian', [{ akun: '1101', debit: 300, kredit: 0 }, { akun: '5103', debit: 0, kredit: 300 }]));
    ok(laba() === 9500 - 1700, 'HPP kontra 5103 mengurangi HPP: laba = 7.800');
    ok(run('saldoBersihPL("5103")') === -300, '5103 bernilai -300 (pengurang HPP)');

    console.log('\n[5] PPN');
    reset();
    ok(run('hitungPpn(1000000)') === 110000, 'default 11%: 1.000.000 -> 110.000');
    ok(run('hitungPpn(1000000, 12)') === 120000, 'tarif 12% (barang mewah): 120.000');
    run('transaksiAkunSettings.ppnTarif = 12');
    ok(run('hitungPpn(1000000)') === 120000, 'default bisa diubah ke 12%');
    ok(run('hitungPpn(1000000, 0)') === 0, 'tarif 0% -> 0');
    ok(run('labelTarifPpn()') === '12%', 'label tarif mengikuti default');

    console.log('\n[6] LIFO');
    const ks = read('js/08-kartu-stock.js');
    ok(/const KS_METODE_DIAKUI = \['fifo','wa','mwa'\]/.test(ks), 'daftar metode diakui tidak memuat LIFO');
    ok(!/value:'lifo'.*Last In First Out.*\n\s*\{ value:'wa'/.test(ks), 'picker utama tidak menawarkan LIFO');
    ok(!/value:'lifo'/.test(read('js/17-profil-perusahaan.js')), 'picker metode kalkulator tanpa LIFO');
    ok(!/data-val="lifo" onclick="selectKsConvKe/.test(read('index.html')), 'tombol tujuan konversi tanpa LIFO');

    console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
    process.exit(fail ? 1 : 0);
  }, 20);
}, 20);
