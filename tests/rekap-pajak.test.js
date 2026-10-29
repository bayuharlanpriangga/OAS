// Tes _hitungRekapPajak (js/13-analitik-dashboard.js): penghasilan bruto, biaya, dan laba konsisten (laba = bruto - biaya)
// dan mencakup semua jenis jurnal, bukan hanya "Penjualan". Jalankan: node tests/rekap-pajak.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js/13-analitik-dashboard.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const fn = src.match(/function _hitungRekapPajak\(bln\) \{[\s\S]*?\n\}\n/)[0];
const akuns = [{ kode: '1101', tipe: 'Aset' }, { kode: '1201', tipe: 'Aset' }, { kode: '4101', tipe: 'Pendapatan' }, { kode: '5101', tipe: 'HPP' }, { kode: '6101', tipe: 'Beban' }, { kode: '2301', tipe: 'Liabilitas' }];
const ctx = { Date, Math, akuns, jurnalEntries: [], isJurnalPenutup: j => j.jenis === 'Penutup',
  rekapPpnJurnal: () => ({ keluaran: 0, masukan: 0, dppKeluaran: 0, dppMasukan: 0, rowsKeluaran: [], rowsMasukan: [] }) };
vm.createContext(ctx); vm.runInContext(fn, ctx);
const H = bln => vm.runInContext('_hitungRekapPajak(' + JSON.stringify(bln) + ')', ctx);
const J = (tanggal, jenis, lines) => ({ tanggal, jenis, lines });

ctx.jurnalEntries = [
  J('2026-10-05', 'Penjualan', [{ akun: '1101', debit: 50000, kredit: 0 }, { akun: '4101', debit: 0, kredit: 50000 }]),
  J('2026-10-12', 'Invoice & Piutang', [{ akun: '1201', debit: 112121, kredit: 0 }, { akun: '4101', debit: 0, kredit: 101010 }, { akun: '2301', debit: 0, kredit: 11111 }]),
  J('2026-10-15', 'Pengeluaran', [{ akun: '6101', debit: 20000, kredit: 0 }, { akun: '1101', debit: 0, kredit: 20000 }]),
  J('2026-10-20', 'Pembelian', [{ akun: '5101', debit: 10000, kredit: 0 }, { akun: '1101', debit: 0, kredit: 10000 }]),
  J('2026-10-31', 'Penutup', [{ akun: '4101', debit: 151010, kredit: 0 }, { akun: '6101', debit: 0, kredit: 30000 }]),
  J('2026-09-30', 'Penjualan', [{ akun: '1101', debit: 99999, kredit: 0 }, { akun: '4101', debit: 0, kredit: 99999 }]),
];
const r = H('2026-10');
ok(r.bruto === 151010, 'bruto = penjualan 50.000 + invoice 101.010 (invoice ikut, PPN tidak)');
ok(r.biaya === 30000, 'biaya = beban 20.000 + HPP 10.000 (dari semua jenis jurnal)');
ok(r.laba === r.bruto - r.biaya && r.laba === 121010, 'laba = bruto - biaya');
ok(Math.abs(r.pphBadan - 121010 * 0.22) < 0.001, 'PPh badan = 22% dari laba');
ok(r.bruto === 151010, 'jurnal penutup dan bulan lain tidak ikut');
ctx.jurnalEntries.push(J('2026-10-21', 'Pembelian', [{ akun: '1101', debit: 10000, kredit: 0 }, { akun: '5101', debit: 0, kredit: 10000 }]));
ok(H('2026-10').biaya === 20000, 'jurnal pembalik (debit/kredit ditukar) meniadakan jurnal asalnya');
ctx.jurnalEntries = [J('2026-10-01', 'Manual', [{ akun: '6101', debit: 5000, kredit: 0 }, { akun: '1101', debit: 0, kredit: 5000 }])];
ok(H('2026-10').bruto === 0 && H('2026-10').laba === -5000 && H('2026-10').pphBadan === 0, 'rugi: laba negatif, PPh badan 0 (tidak negatif)');
ok(H('') === null && H('abc') === null, 'bulan kosong/tidak valid: null');
ok(/_hitungRekapPajak\(bln\)/.test(src.match(/function renderRekapSiapSetor[\s\S]*?\n\}/)[0]) && /_hitungRekapPajak\(bln\)/.test(src.match(/function exportRekapPajakPDF[\s\S]*?\n\}/)[0]), 'layar dan PDF memakai fungsi hitung yang sama');
console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal'); process.exit(fail ? 1 : 0);
