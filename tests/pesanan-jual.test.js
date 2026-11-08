// Tes js/37-pesanan-jual.js (task 7.3): penawaran disetujui -> pesanan penjualan (salin item, tautkan ref), penawaran jadi selesai.
// Jalankan: node tests/pesanan-jual.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

const els = {};
const el = id => (els[id] = els[id] || { id, value: '', textContent: '', innerHTML: '', style: {}, classList: { open: false } });
const alerts = [];
let konfirmasi = true, hanyaBaca = false, sync = 0;
const ctx = {
  console, document: { getElementById: id => el(id) },
  showAlert: m => alerts.push(m), openModal() {}, closeModal() {}, confirm: () => konfirmasi,
  rp: v => 'Rp ' + Number(v).toLocaleString('id-ID'),
  localStorage: { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); } },
  kontakList: [], counterList: [], guardHanyaBaca: () => hanyaBaca
};
vm.createContext(ctx);
const utils = rd('js/02-utils.js'), pen = rd('js/23-penomoran.js');
vm.runInContext(utils.match(/function escapeHtml[\s\S]*?\n}\n/)[0] + utils.match(/function escapeForJsAttr[\s\S]*?\n}\n/)[0], ctx);
vm.runInContext(['parseNomor', 'nomorBerikut', 'counterSetelahPakai'].map(n => pen.match(new RegExp('function ' + n + '[\\s\\S]*?\\n}\\n'))[0]).join('\n'), ctx);
vm.runInContext(rd('js/35-dok.js').replace(/^(const|let) /gm, 'var '), ctx);
vm.runInContext(rd('js/36-penawaran-ui.js').replace(/^(const|let) /gm, 'var '), ctx);
vm.runInContext(rd('js/37-pesanan-jual.js'), ctx);
const run = c => vm.runInContext(c, ctx);
const J = o => JSON.parse(JSON.stringify(o));

const pnw = (o) => Object.assign({ id: 'P1', jenis: 'penawaran', no: 'QUO-2026-001', tanggal: '2026-11-01', kontak: 'PT Maju', status: 'disetujui',
  items: [{ nama: 'Kopi', qty: 2, harga: 5000, satuan: 'kg' }, { nama: 'Gula', qty: 1, harga: 12000 }], catatan: 'Kirim cepat', ppnTarif: 11,
  berlakuSampai: '2026-11-15', riwayat: [{ dari: 'terkirim', ke: 'disetujui' }], createdAt: '2026-11-01T00:00:00Z' }, o);
const opsi = (o) => Object.assign({ id: 'DOK_1', tanggal: '2026-11-08', createdAt: '2026-11-08T01:00:00Z', waktu: '2026-11-08T01:00:00Z', counterList: [] }, o);
const buat = (p, d, o) => { const dd = (d || []).slice(); if (p && !dd.some(x => x.id === p.id)) dd.unshift(p); // di aplikasi penawaran selalu ada di dokList
  ctx.__p = p; ctx.__d = dd; ctx.__o = opsi(o); return J(run('pesananDariPenawaran(__p, __d, __o)')); };

console.log('[1] pesananDariPenawaran: hasil');
{
  const r = buat(pnw(), [pnw()]);
  ok(r.ok, 'penawaran disetujui -> ok');
  const s = r.pesanan;
  ok(s.jenis === 'pesanan_jual' && s.status === 'draft' && s.no === 'SO-2026-001', 'pesanan: jenis pesanan_jual, draft, nomor SO-2026-001');
  ok(s.kontak === 'PT Maju' && s.tanggal === '2026-11-08' && s.id === 'DOK_1', 'kontak disalin, tanggal = hari pembuatan, id dari opsi');
  ok(s.items.length === 2 && s.items[0].nama === 'Kopi' && s.items[0].qty === 2 && s.items[0].harga === 5000 && s.items[0].satuan === 'kg' && s.items[1].nama === 'Gula', 'item disalin lengkap');
  ok(s.ppnTarif === 11 && s.catatan === 'Kirim cepat', 'PPN dan catatan ikut');
  ok(s.refJenis === 'penawaran' && s.refId === 'P1' && s.refNo === 'QUO-2026-001', 'ref asal tertaut (jenis, id, nomor)');
  ok(s.berlakuSampai === undefined, 'masa berlaku penawaran tidak ikut');
  ok(r.penawaran.status === 'selesai' && r.penawaran.riwayat.length === 2 && r.penawaran.riwayat[1].dari === 'disetujui' && r.penawaran.riwayat[1].ke === 'selesai' && r.penawaran.riwayat[1].waktu === '2026-11-08T01:00:00Z', 'penawaran jadi selesai + riwayat berwaktu');
  ok(run('hitungTotalDok').length >= 0 && J(run('hitungTotalDok(__p)')).total === 22000 + 2420, 'total penawaran 24.420 (sanity)');
}

console.log('[2] pesananDariPenawaran: murni dan salinan dalam');
{
  const p = pnw(), d = [p]; const sp = JSON.stringify(p), sd = JSON.stringify(d);
  ctx.__p = p; ctx.__d = d; ctx.__o = opsi();
  const r = run('pesananDariPenawaran(__p, __d, __o)');
  ok(JSON.stringify(p) === sp && JSON.stringify(d) === sd, 'penawaran dan daftar tidak diubah');
  r.pesanan.items[0].qty = 99;
  ok(p.items[0].qty === 2, 'mengubah item pesanan tidak mengubah penawaran');
  ok(r.penawaran !== p && p.status === 'disetujui', 'penawaran hasil = objek baru, aslinya tetap disetujui');
}

console.log('[3] pesananDariPenawaran: penolakan');
{
  for (const st of ['draft', 'terkirim', 'ditolak', 'selesai', 'batal']) {
    const r = buat(pnw({ status: st }), []);
    ok(!r.ok && r.pesan.includes(st), 'status ' + st + ' ditolak, pesan menyebut status');
  }
  ok(!buat(null, []).ok && !buat(undefined, []).ok, 'penawaran kosong ditolak');
  ok(!buat({ id: 'X', jenis: 'pesanan_jual', status: 'disetujui' }, []).ok, 'bukan jenis penawaran ditolak');
  const sudah = { id: 'S1', jenis: 'pesanan_jual', no: 'SO-2026-001', refJenis: 'penawaran', refId: 'P1', status: 'draft' };
  const r = buat(pnw(), [pnw(), sudah]);
  ok(!r.ok && r.pesan.includes('SO-2026-001'), 'sudah punya pesanan aktif ditolak, pesan menyebut nomor pesanan');
  ok(buat(pnw(), [pnw(), Object.assign({}, sudah, { status: 'batal' })], { id: 'DOK_2' }).ok, 'pesanan lama yang batal tidak menghalangi');
  ok(!buat(pnw(), [], { tanggal: '' }).ok && !buat(pnw(), [], { tanggal: 'kemarin' }).ok, 'tanggal pesanan tidak valid ditolak');
  ok(!buat(pnw({ items: [] }), []).ok, 'penawaran tanpa item (rusak) ditolak oleh susunDok');
  ok(!buat(pnw(), [], { id: '' }).ok, 'id kosong ditolak');
}

console.log('[4] penomoran');
{
  const d = [{ id: 'A', jenis: 'pesanan_jual', no: 'SO-2026-004', status: 'selesai' }, { id: 'B', jenis: 'penawaran', no: 'QUO-2026-009' }];
  ok(buat(pnw(), d).pesanan.no === 'SO-2026-005', 'melanjutkan nomor SO tertinggi; nomor QUO tidak ikut');
  ok(buat(pnw(), [], { counterList: [{ id: 'SO-2026', terakhir: 7 }] }).pesanan.no === 'SO-2026-008', 'counter jadi batas bawah');
  ok(buat(pnw(), [], { tanggal: '2027-01-02' }).pesanan.no === 'SO-2027-001', 'tahun diambil dari tanggal pesanan');
}

console.log('[5] pesananDariRef');
{
  ctx.__d = [{ id: 'S1', jenis: 'pesanan_jual', no: 'SO-1', refJenis: 'penawaran', refId: 'P1', status: 'batal' }, { id: 'S2', jenis: 'pesanan_jual', no: 'SO-2', refJenis: 'penawaran', refId: 'P1', status: 'draft' }, { id: 'S3', jenis: 'pesanan_jual', no: 'SO-3', refJenis: 'penawaran', refId: 'P2', status: 'draft' }];
  ok(J(run("pesananDariRef(__d, 'P1')")).no === 'SO-2', 'mengabaikan pesanan batal, mengembalikan yang aktif');
  ok(run("pesananDariRef(__d, 'P9')") === null && run("pesananDariRef(null, 'P1')") === null, 'tidak ada -> null; daftar rusak aman');
}

console.log('[6] buatPesananDariPenawaran (state + simpan)');
{
  ctx.dokList = [pnw(), pnw({ id: 'P2', no: 'QUO-2026-002', status: 'terkirim' })];
  ctx.counterList = [];
  let simpan = 0; ctx.simpanDokState = () => { simpan++; return Promise.resolve(true); };
  const r = J(run("buatPesananDariPenawaran('P1')"));
  const dl = J(run('dokList')), cl = J(run('counterList'));
  ok(r.ok && simpan === 1, 'berhasil dan disimpan satu kali saja');
  ok(dl.length === 3 && dl[0].jenis === 'pesanan_jual' && dl[0].refId === 'P1', 'pesanan baru di atas daftar');
  ok(dl.find(d => d.id === 'P1').status === 'selesai' && dl.find(d => d.id === 'P2').status === 'terkirim', 'hanya penawaran asal yang jadi selesai');
  ok(cl.some(c => c.id === 'SO-2026' && c.terakhir === 1), 'counter SO naik');
  const lagi = J(run("buatPesananDariPenawaran('P1')"));
  ok(!lagi.ok && J(run('dokList')).length === 3 && simpan === 1, 'klik kedua ditolak: tidak ada pesanan ganda, tidak simpan lagi');
  ok(!J(run("buatPesananDariPenawaran('P2')")).ok && simpan === 1, 'penawaran belum disetujui ditolak, tidak simpan');
  ok(!J(run("buatPesananDariPenawaran('TIDAK_ADA')")).ok, 'id tidak ada ditolak');
  hanyaBaca = true; ctx.dokList = [pnw()]; simpan = 0;
  ok(!J(run("buatPesananDariPenawaran('P1')")).ok && simpan === 0 && J(run('dokList')).length === 1, 'viewer diblokir, tidak ada perubahan');
  hanyaBaca = false;
}

console.log('[7] pemasangan di UI penawaran');
{
  ctx.dokList = [pnw(), pnw({ id: 'P2', no: 'QUO-2026-002', status: 'terkirim' })];
  ctx.simpanDokState = () => Promise.resolve(true); ctx.counterList = [];
  run('renderPenawaranList()');
  let h = el('penawaran-body').innerHTML;
  ok(h.includes("buatPesananPenawaran('P1')") && !h.includes("buatPesananPenawaran('P2')"), 'tombol Buat Pesanan hanya untuk penawaran disetujui');
  run("buatPesananPenawaran('P1')");
  h = el('penawaran-body').innerHTML;
  ok(!h.includes('buatPesananPenawaran') && h.includes('→ SO-2026-001'), 'setelah dibuat: tombol hilang, nomor pesanan tampil di baris penawaran');
  ok(alerts.some(a => a.includes('SO-2026-001') && a.includes('QUO-2026-001')), 'alert menyebut nomor pesanan dan penawaran');
  const n = run('dokList.length'); alerts.length = 0;
  run("hapusPenawaran('P1')");
  ok(run('dokList.length') === n && alerts.some(a => a.includes('tidak bisa dihapus')), 'hapus penawaran yang sudah dirujuk pesanan ditolak');
  run("hapusPenawaran('P2')");
  ok(run('dokList.length') === n - 1, 'penawaran tanpa pesanan tetap bisa dihapus');
  konfirmasi = false; ctx.dokList = [pnw()]; run("buatPesananPenawaran('P1')");
  ok(run('dokList.length') === 1 && run('dokList[0].status') === 'disetujui', 'batal di konfirmasi: tidak ada perubahan');
  konfirmasi = true;
  ok(/js\/37-pesanan-jual\.js/.test(rd('index.html')), 'index.html memuat js/37-pesanan-jual.js');
  const s37 = rd('js/37-pesanan-jual.js');
  ok(!/addJurnal|postJurnalLegacy|kartuStock|mutasiStok/.test(s37), 'modul tidak menyentuh jurnal atau stok (batas task 7.3)');
}

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
