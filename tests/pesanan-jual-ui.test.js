// Tes js/38-pesanan-jual-ui.js (task 7.3b): halaman + daftar + ubah status + hapus pesanan penjualan.
// Jalankan: node tests/pesanan-jual-ui.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const els = {};
const el = id => (els[id] = els[id] || { id, value: '', textContent: '', innerHTML: '', style: {}, classList: { open: false } });
const alerts = [];
let konfirmasi = true, hanyaBaca = false, simpan = 0;
const ctx = {
  console, document: { getElementById: id => el(id) },
  showAlert: m => alerts.push(m), confirm: () => konfirmasi,
  rp: v => 'Rp ' + Number(v).toLocaleString('id-ID'),
  localStorage: { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); } },
  kontakList: [], counterList: [], guardHanyaBaca: () => hanyaBaca
};
vm.createContext(ctx);
const utils = rd('js/02-utils.js'), pen = rd('js/23-penomoran.js');
vm.runInContext(utils.match(/function escapeHtml[\s\S]*?\n}\n/)[0] + utils.match(/function escapeForJsAttr[\s\S]*?\n}\n/)[0], ctx);
vm.runInContext(['parseNomor', 'nomorBerikut', 'counterSetelahPakai'].map(n => pen.match(new RegExp('function ' + n + '[\\s\\S]*?\\n}\\n'))[0]).join('\n'), ctx);
for (const f of ['js/35-dok.js', 'js/36-penawaran-ui.js']) vm.runInContext(rd(f).replace(/^(const|let) /gm, 'var '), ctx);
vm.runInContext(rd('js/37-pesanan-jual.js'), ctx);
vm.runInContext(rd('js/38-pesanan-jual-ui.js').replace(/^(const|let) /gm, 'var '), ctx);
ctx.simpanDokState = () => { simpan++; return Promise.resolve(true); };
const run = c => vm.runInContext(c, ctx);
const J = o => JSON.parse(JSON.stringify(o));
const pesanan = o => Object.assign({ id: 'S1', jenis: 'pesanan_jual', no: 'SO-2026-001', tanggal: '2026-11-08', kontak: 'PT Maju', status: 'draft', refJenis: 'penawaran', refId: 'P1', refNo: 'QUO-2026-001',
  items: [{ nama: 'Kopi', qty: 2, harga: 5000 }], ppnTarif: 11, createdAt: 'x' }, o);

console.log('[1] aksiStatusPesanan');
{
  const a = st => J(run(`aksiStatusPesanan('${st}')`));
  ok(a('draft').map(x => x.ke).join() === 'dikonfirmasi,batal', 'draft: Konfirmasi dan Batal');
  ok(a('draft')[0].label === 'Konfirmasi' && a('draft')[0].konfirmasi === false && a('draft')[1].konfirmasi === true, 'Batal minta konfirmasi, Konfirmasi tidak');
  ok(a('dikonfirmasi').map(x => x.ke).join() === 'batal', 'dikonfirmasi: hanya Batal (sebagian/selesai otomatis, bukan manual)');
  ok(a('sebagian').map(x => x.ke).join() === 'batal', 'sebagian: hanya Batal');
  ok(a('selesai').length === 0 && a('batal').length === 0 && a('ngawur').length === 0, 'final dan status asing: tanpa tombol');
}

console.log('[2] bolehHapusPesanan');
{
  const b = o => { ctx.__p = o; return J(run('bolehHapusPesanan(__p)')); };
  ok(b(pesanan()).ok && b(pesanan({ status: 'batal' })).ok, 'draft dan batal boleh dihapus');
  ok(!b(pesanan({ status: 'dikonfirmasi' })).ok && b(pesanan({ status: 'dikonfirmasi' })).pesan.includes('Batalkan'), 'dikonfirmasi ditolak, pesan menyuruh batalkan dulu');
  ok(!b(pesanan({ status: 'sebagian' })).ok && !b(pesanan({ status: 'selesai' })).ok, 'sebagian dan selesai ditolak');
  ok(!b(null).ok, 'null ditolak');
}

console.log('[3] renderPesananList');
{
  ctx.dokList = [];
  run('renderPesananList()');
  ok(el('pesanan-jual-body').innerHTML.includes('Belum ada pesanan penjualan'), 'kosong: pesan petunjuk');
  ctx.dokList = [pesanan(), pesanan({ id: 'S2', no: 'SO-2026-002', status: 'dikonfirmasi' }), { id: 'P1', jenis: 'penawaran', no: 'QUO-2026-001', kontak: 'X', status: 'selesai', items: [] }];
  run('renderPesananList()');
  const h = el('pesanan-jual-body').innerHTML;
  ok(h.includes('SO-2026-001') && h.includes('SO-2026-002') && h.includes('QUO-2026-001'), 'daftar memuat pesanan, kolom Dari Penawaran menampilkan refNo');
  ok((h.match(/<tr>/g) || []).length === 3, 'hanya 2 pesanan + 1 baris header yang tampil (penawaran tidak tercampur)');
  ok(h.includes("ubahStatusPesanan('S1','dikonfirmasi')") && !h.includes("ubahStatusPesanan('S2','dikonfirmasi')"), 'tombol Konfirmasi hanya untuk draft');
  ok(h.includes('Rp 11.100'), 'total termasuk PPN (2 x 5.000 + 11%)');
  ok(h.includes('Dikonfirmasi'), 'badge status berhuruf kapital awal');
}

console.log('[4] ubahStatusPesanan');
{
  ctx.dokList = [pesanan()]; simpan = 0; alerts.length = 0;
  run("ubahStatusPesanan('S1','dikonfirmasi')");
  let d = J(run('dokList'))[0];
  ok(d.status === 'dikonfirmasi' && d.riwayat.length === 1 && d.riwayat[0].dari === 'draft' && d.riwayat[0].ke === 'dikonfirmasi' && d.riwayat[0].waktu, 'draft -> dikonfirmasi, riwayat berwaktu');
  ok(simpan === 1 && alerts.some(a => a.includes('dikonfirmasi')), 'disimpan sekali dan ada alert');
  run("ubahStatusPesanan('S1','selesai')");
  ok(J(run('dokList'))[0].status === 'dikonfirmasi' && alerts.some(a => a.includes('tidak bisa diubah')), 'selesai manual ditolak (diisi otomatis oleh 7.5)');
  konfirmasi = false; simpan = 0;
  run("ubahStatusPesanan('S1','batal')");
  ok(J(run('dokList'))[0].status === 'dikonfirmasi' && simpan === 0, 'batal di konfirmasi: tidak ada perubahan');
  konfirmasi = true;
  run("ubahStatusPesanan('S1','batal')");
  ok(J(run('dokList'))[0].status === 'batal', 'Batal disetujui -> batal');
  run("ubahStatusPesanan('S1','dikonfirmasi')");
  ok(J(run('dokList'))[0].status === 'batal', 'status final tidak bisa diubah lagi');
  hanyaBaca = true; ctx.dokList = [pesanan()]; simpan = 0;
  run("ubahStatusPesanan('S1','dikonfirmasi')");
  ok(J(run('dokList'))[0].status === 'draft' && simpan === 0, 'viewer diblokir');
  hanyaBaca = false;
  run("ubahStatusPesanan('TIDAK_ADA','batal')"); ok(true, 'id tidak ada: tidak error');
}

console.log('[5] hapusPesanan');
{
  ctx.dokList = [pesanan(), pesanan({ id: 'S2', no: 'SO-2026-002', status: 'dikonfirmasi' })]; alerts.length = 0;
  run("hapusPesanan('S2')");
  ok(run('dokList.length') === 2 && alerts.some(a => a.includes('tidak bisa dihapus')), 'dikonfirmasi tidak bisa dihapus');
  konfirmasi = false; run("hapusPesanan('S1')");
  ok(run('dokList.length') === 2, 'batal di konfirmasi: tidak terhapus');
  konfirmasi = true; run("hapusPesanan('S1')");
  ok(run('dokList.length') === 1 && J(run('dokList'))[0].id === 'S2', 'draft terhapus, pesanan lain utuh');
  hanyaBaca = true; run("hapusPesanan('S2')");
  ok(run('dokList.length') === 1, 'viewer diblokir'); hanyaBaca = false;
}

console.log('[6] pemasangan');
{
  const html = rd('index.html'), nav = rd('js/04-navigasi-tema.js'), bis = rd('js/26-daftar-bisnis.js'), sto = rd('js/15-storage.js');
  ok(/js\/38-pesanan-jual-ui\.js/.test(html) && html.indexOf('37-pesanan-jual.js') < html.indexOf('38-pesanan-jual-ui.js'), 'index.html memuat modul 38 setelah 37');
  ok(html.includes('id="page-pesanan-jual"') && html.includes('id="pesanan-jual-body"') && html.includes("showPage('pesanan-jual')"), 'halaman, body, dan kartu navigasi ada');
  ok(/'pesanan-jual':\['Pesanan Penjualan'/.test(nav) && nav.includes("if(id==='pesanan-jual') renderPesananList();"), 'judul halaman dan render saat dibuka');
  ok(bis.includes("'pesanan-jual': 'invoice'"), 'izin modul mengikuti Invoice');
  ok(sto.includes("'renderPesananList'"), 'daftar dirender ulang setelah Reset Data');
  ok(!/addJurnal|postJurnalLegacy|kartuStock|mutasiStok/.test(rd('js/38-pesanan-jual-ui.js')), 'tidak menyentuh jurnal atau stok');
}

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
