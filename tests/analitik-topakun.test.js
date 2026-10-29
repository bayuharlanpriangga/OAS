// Tes anDrawTopAkun (13-analitik-dashboard.js): grafik Top Akun tidak boleh error saat semua saldo akun 0
// (mis. satu-satunya jurnal adalah bill yang sudah dihapus: jurnal asal + pembaliknya meniadakan).
// createLinearGradient asli melempar TypeError untuk nilai non-finite, jadi stub-nya meniru itu.
// Jalankan: node tests/analitik-topakun.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', '13-analitik-dashboard.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const bars = [];
const g2d = {
  scale() {}, clearRect() {}, beginPath() {}, fill() {}, fillText() {}, roundRect(x, y, w, h) { bars.push({ x, y, w, h }); },
  createLinearGradient(...a) { if (a.some(v => !Number.isFinite(v))) throw new TypeError("Failed to execute 'createLinearGradient' on 'CanvasRenderingContext2D': The provided double value is non-finite."); return { addColorStop() {} }; }
};
const canvas = { parentElement: { offsetWidth: 400 }, style: {}, getContext: () => g2d };
const ctx = { document: { getElementById: () => canvas }, window: { devicePixelRatio: 1 }, anBaseHeight: () => 220, anFmtShort: v => String(v) };
vm.createContext(ctx);
vm.runInContext(src.match(/function anDrawTopAkun[\s\S]*?\n}\n/)[0], ctx);
const akuns = [{ kode: '1301', nama: 'Persediaan', normal: 'D', tipe: 'Aset' }, { kode: '2101', nama: 'Utang Usaha', normal: 'K', tipe: 'Liabilitas' }];
const jalankan = (entries) => { ctx.akuns = akuns; ctx.jurnalEntries = entries; bars.length = 0; let err = null; try { vm.runInContext("anDrawTopAkun('c', '#000', '#111')", ctx); } catch (e) { err = e; } return err; };
const j = (d1, k1, d2, k2) => ({ lines: [{ akun: '1301', debit: d1, kredit: k1 }, { akun: '2101', debit: d2, kredit: k2 }] });

console.log('[anDrawTopAkun]');
let e = jalankan([j(111000, 0, 0, 111000), j(0, 111000, 111000, 0)]);
ok(e === null && bars.length === 0, 'semua saldo 0 (jurnal bill + pembaliknya): tidak error, tidak ada batang');
e = jalankan([]);
ok(e === null && bars.length === 0, 'tanpa jurnal: tidak error');
e = jalankan([j(111000, 0, 0, 111000)]);
ok(e === null && bars.length === 2 && bars.every(b => Number.isFinite(b.w) && b.w > 0), 'ada saldo: 2 batang dengan lebar valid');
ctx.akuns = [...akuns, { kode: '3101', nama: 'Modal', normal: 'K', tipe: 'Ekuitas' }];
ctx.jurnalEntries = [{ lines: [{ akun: '1301', debit: 100, kredit: 0 }, { akun: '2101', debit: 0, kredit: 60 }, { akun: '3101', debit: 0, kredit: 40 }] }]; bars.length = 0;
e = null; try { vm.runInContext("anDrawTopAkun('c', '#000', '#111')", ctx); } catch (x) { e = x; }
ok(e === null && bars.length === 3 && bars[0].w > bars[1].w && bars[1].w > bars[2].w, 'tiga akun beda saldo: batang terurut dari terbesar ke terkecil');
ctx.akuns = [...akuns, { kode: '1302', nama: 'Kosong', normal: 'D', tipe: 'Aset' }];
ctx.jurnalEntries = [j(100, 0, 0, 100), { lines: [{ akun: '1302', debit: 10, kredit: 10 }] }]; bars.length = 0;
vm.runInContext("anDrawTopAkun('c', '#000', '#111')", ctx);
ok(bars.length === 2, 'akun bersaldo 0 di antara akun lain tidak digambar');
console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
