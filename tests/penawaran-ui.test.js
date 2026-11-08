// Tes js/36-penawaran-ui.js (form 7.1, simpan + daftar + hapus 7.2) dan penyimpan dok di js/35-dok.js + pemasangannya.
// Penawaran tidak membuat jurnal: tes juga menjaga batas itu.
// Jalankan: node tests/penawaran-ui.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

// ── DOM tiruan minimal ──
const els = {};
const el = id => (els[id] = els[id] || { id, value: '', textContent: '', innerHTML: '', style: {}, classList: { open: false } });
const alerts = [];
const dibuka = [], tertutup = [];
let konfirmasi = true;
const ctx = {
  console,
  document: { getElementById: id => el(id) },
  showAlert: m => alerts.push(m),
  openModal: id => dibuka.push(id),
  closeModal: id => tertutup.push(id),
  confirm: () => konfirmasi,
  rp: v => 'Rp ' + Number(v).toLocaleString('id-ID'),
  localStorage: { _s: {}, getItem(k) { return k in this._s ? this._s[k] : null; }, setItem(k, v) { this._s[k] = String(v); } },
  kontakList: [],
  counterList: [],
  guardHanyaBaca: () => false
};
vm.createContext(ctx);
const utils = rd('js/02-utils.js'), pen = rd('js/23-penomoran.js');
vm.runInContext(utils.match(/function escapeHtml[\s\S]*?\n}\n/)[0] + utils.match(/function escapeForJsAttr[\s\S]*?\n}\n/)[0], ctx);
vm.runInContext(['parseNomor', 'nomorBerikut', 'counterSetelahPakai'].map(n => pen.match(new RegExp('function ' + n + '[\\s\\S]*?\\n}\\n'))[0]).join('\n'), ctx);
vm.runInContext(rd('js/35-dok.js').replace(/^const /gm, 'var '), ctx);
vm.runInContext(rd('js/36-penawaran-ui.js'), ctx);
const run = c => vm.runInContext(c, ctx);
const J = o => JSON.parse(JSON.stringify(o));

console.log('[1] fungsi murni');
{
  ok(run('nomorPenawaranBerikut(2026, [], [])') === 'QUO-2026-001', 'nomor pertama QUO-2026-001');
  ok(run("nomorPenawaranBerikut(2026, [{no:'QUO-2026-001'},{no:'QUO-2026-002'},{no:'SO-2026-009'}], [])") === 'QUO-2026-003', 'melanjutkan nomor tertinggi; nomor jenis lain tidak ikut');
  ok(run("nomorPenawaranBerikut(2026, [], [{id:'QUO-2026',terakhir:5}])") === 'QUO-2026-006', 'counter jadi batas bawah');
  ok(/^QUO-\d{4}-001$/.test(run('nomorPenawaranBerikut(undefined, [], [])')), 'tahun kosong memakai tahun berjalan');
  const f0 = J(run("formPenawaranBaru('2026-11-08', 'QUO-2026-001')"));
  ok(f0.no === 'QUO-2026-001' && f0.tanggal === '2026-11-08' && f0.kontak === '' && Array.isArray(f0.items) && f0.items.length === 0, 'formPenawaranBaru: isi awal');

  const form = o => Object.assign({ no: 'quo-2026-001', tanggal: '2026-11-08', kontak: ' PT Maju ', catatan: '', items: [{ nama: 'Kopi', qty: 2, harga: 5000, satuan: 'kg' }] }, o);
  const cek = (f, daftar) => { ctx.__f = f; ctx.__d = daftar || []; return J(run('periksaFormPenawaran(__f, __d)')); };
  let r = cek(form());
  ok(r.ok && r.dok.jenis === 'penawaran' && r.dok.status === 'draft' && r.dok.no === 'QUO-2026-001' && r.dok.kontak === 'PT Maju', 'form valid: jenis penawaran, draft, nomor kapital, nama dirapikan');
  ok(!cek(form({ kontak: '  ' })).ok, 'pelanggan kosong ditolak');
  ok(!cek(form({ no: '' })).ok, 'nomor kosong ditolak');
  ok(!cek(form({ tanggal: '2026-02-31' })).ok, 'tanggal tidak valid ditolak');
  ok(!cek(form({ items: [] })).ok && !cek(form({ items: [{ nama: '', qty: 1, harga: 0 }] })).ok, 'tanpa item bernama ditolak');
  ok(!cek(form({ items: [{ nama: 'Kopi', qty: 0, harga: 100 }] })).ok, 'qty 0 pada item bernama ditolak');
  ok(!cek(form({ items: [{ nama: 'Kopi', qty: 1, harga: -5 }] })).ok, 'harga negatif ditolak');
  ok(!cek(form(), [{ id: 'D1', jenis: 'penawaran', no: 'QUO-2026-001' }]).ok, 'nomor kembar dalam penawaran ditolak');
  ok(cek(form(), [{ id: 'D2', jenis: 'pesanan_jual', no: 'QUO-2026-001' }]).ok, 'nomor sama di jenis lain tidak dianggap kembar');
  const daftar = [{ id: 'D1', jenis: 'penawaran', no: 'QUO-2026-009' }]; const salin = JSON.stringify(daftar);
  cek(form(), daftar); ok(JSON.stringify(daftar) === salin, 'periksaFormPenawaran tidak mengubah daftar');
}

console.log('[2] perilaku form (DOM tiruan)');
{
  ctx.kontakList = [{ nama: 'PT Maju', tipe: 'pelanggan' }, { nama: 'CV Dua', tipe: 'keduanya' }, { nama: 'Supplier X', tipe: 'supplier' }];
  run('dokList = [];');
  run('openModalPenawaran()');
  ok(/^QUO-\d{4}-001$/.test(el('pnw-no').value) && /^\d{4}-\d{2}-\d{2}$/.test(el('pnw-tgl').value), 'buka form: nomor otomatis dan tanggal hari ini terisi');
  ok(dibuka.includes('modal-penawaran'), 'modal-penawaran dibuka');
  ok(run('_pnwItems.length') === 1 && run('_pnwItems[0].nama') === '' && run('_pnwItems[0].qty') === 1, 'dimulai dengan satu baris item kosong');
  const dl = el('pnw-kontak-list').innerHTML;
  ok(dl.includes('PT Maju') && dl.includes('CV Dua') && !dl.includes('Supplier X'), 'saran nama: pelanggan dan keduanya, supplier tidak ikut');

  run("_pnwItems[0].nama = 'Kopi'; _pnwItems[0].qty = 2; _pnwItems[0].harga = 5000; hitungTotalPenawaranForm();");
  ok(/10\.000/.test(el('pnw-total').textContent), 'total langsung: 2 × 5.000 = 10.000');
  run('tambahItemPenawaran()');
  run("_pnwItems[1].nama = 'Gula'; _pnwItems[1].qty = 3; _pnwItems[1].harga = 1000; hitungTotalPenawaranForm();");
  ok(run('_pnwItems.length') === 2 && /13\.000/.test(el('pnw-total').textContent), 'tambah item: total 13.000');
  ok(el('pnw-items-list').innerHTML.includes('oninput="_pnwItems[1].nama=this.value"'), 'baris item dirender dengan handler per indeks');
  run('hapusItemPenawaran(0)');
  ok(run('_pnwItems.length') === 1 && run('_pnwItems[0].nama') === 'Gula' && /3\.000/.test(el('pnw-total').textContent), 'hapus item: total dihitung ulang');

  // nama item dengan karakter HTML tidak merusak markup
  run("_pnwItems[0].nama = '<b>\"x\"</b>'; renderPenawaranItems();");
  ok(!el('pnw-items-list').innerHTML.includes('<b>"x"</b>'), 'nama item di-escape di HTML');

  // simpan
  alerts.length = 0; tertutup.length = 0;
  el('pnw-kontak').value = '';
  run("_pnwItems = [{nama:'Kopi',qty:1,satuan:'',harga:1000}]");
  run('simpanPenawaran()');
  ok(alerts.length === 1 && /pelanggan|kontak/i.test(alerts[0]), 'form tidak valid: pesan kesalahan ditampilkan');
  ok(run('dokList.length') === 0 && tertutup.length === 0, 'form tidak valid: tidak tersimpan dan modal tetap terbuka');
  el('pnw-kontak').value = 'PT Maju';
  alerts.length = 0;
  run('simpanPenawaran()');
  ok(alerts.length === 1 && /disimpan/.test(alerts[0]) && /1\.000/.test(alerts[0]), 'form valid: pemberitahuan disimpan dengan total');
  ok(run('dokList.length') === 1 && run('dokList[0].jenis') === 'penawaran' && run('dokList[0].status') === 'draft' && run('dokList[0].kontak') === 'PT Maju', 'penawaran masuk dokList sebagai draft');
  ok(/^DOK_\d+$/.test(run('dokList[0].id')) && !isNaN(Date.parse(run('dokList[0].createdAt'))), 'id DOK_<ms> dan createdAt ISO terisi');
  ok(tertutup.includes('modal-penawaran'), 'modal ditutup setelah simpan');
  ok(run('counterList').some(c => c.id === 'QUO-2026' || /^QUO-\d{4}$/.test(c.id)) && J(run('counterList')).find(c => /^QUO-/.test(c.id)).terakhir === 1, 'counter QUO naik ke 1');
  ok(JSON.parse(ctx.localStorage._s['oas_dok']).length === 1 && JSON.parse(ctx.localStorage._s['oas_counter']).length >= 1, 'mode tamu: oas_dok dan oas_counter tersimpan');
  ok(/QUO-\d{4}-001/.test(el('penawaran-body').innerHTML) && /PT Maju/.test(el('penawaran-body').innerHTML), 'daftar dirender ulang setelah simpan');
  // nomor berikutnya melanjutkan
  run('openModalPenawaran()');
  ok(/-002$/.test(el('pnw-no').value), 'form berikutnya: nomor 002');

  // viewer diblokir
  ctx.guardHanyaBaca = () => true;
  alerts.length = 0; dibuka.length = 0;
  run('openModalPenawaran()'); run('simpanPenawaran()');
  ok(dibuka.length === 0 && alerts.length === 0, 'viewer: form tidak terbuka dan tidak memeriksa');
  ctx.guardHanyaBaca = () => false;
}

console.log('[3] pemasangan ke index.html dan file lama');
{
  const idx = rd('index.html'), ui = rd('js/36-penawaran-ui.js'), nav = rd('js/04-navigasi-tema.js'), mod = rd('js/26-daftar-bisnis.js');
  const ids = new Set();
  for (const m of ui.matchAll(/getElementById\('([^']+)'\)/g)) ids.add(m[1]);
  for (const m of ui.matchAll(/\bset\('([^']+)'/g)) ids.add(m[1]);
  ids.delete('pnw-items-list'); ids.add('pnw-items-list');
  const hilang = [...ids].filter(i => !idx.includes('id="' + i + '"'));
  ok(hilang.length === 0, 'semua id yang dipakai modul ada di index.html' + (hilang.length ? ': ' + hilang : ''));
  ok(idx.includes('id="modal-penawaran"') && idx.includes('id="page-penawaran"') && idx.includes('id="penawaran-body"'), 'modal, halaman, dan isi halaman ada');
  ok(idx.includes("showPage('penawaran')") && idx.includes('data-page="penawaran"'), 'kartu navigasi Penawaran');
  ok(idx.includes('openModalPenawaran()') && idx.includes('simpanPenawaran()') && idx.includes('tambahItemPenawaran()'), 'tombol terhubung ke fungsi');
  ok(idx.includes('js/36-penawaran-ui.js') && idx.indexOf('js/35-dok.js') < idx.indexOf('js/36-penawaran-ui.js'), 'script dimuat setelah 35-dok.js');
  ok(/'penawaran':\['Penawaran'/.test(nav), 'judul halaman di pageTitles');
  ok(/penawaran: 'invoice'/.test(mod), 'izin modul mengikuti Invoice');
  const iconTersedia = rd('css/icons.css').includes('ti-file-text');
  ok(iconTersedia, 'ikon ti-file-text tersedia di icons.css');
  // batas: penawaran tidak menjurnal; simpan hanya lewat penyimpan model (tambahDok/hapusDokById), bukan langsung ke storage/cloud
  const kode = ui.replace(/^\s*\/\/.*$/gm, '');
  ok(!/postJurnalLegacy|addJurnal|buatJurnal|saveFiturBaru|cloudSyncRecords|localStorage|dokList\.(push|unshift|splice)/.test(kode), 'modul UI tidak membuat jurnal dan tidak menyimpan langsung (lewat tambahDok/hapusDokById)');
  ok(/tambahDok\(/.test(kode) && /hapusDokById\(/.test(kode), 'simpan dan hapus lewat penyimpan model');
  ok(/if\(id==='penawaran'\) renderPenawaranList\(\);/.test(nav), 'showPage(penawaran) merender daftar');
  ok(/'renderPenawaranList'/.test(rd('js/15-storage.js')), 'doResetAll merender ulang daftar penawaran');
  ok(/Simpan Draft/.test(idx) && !/Periksa Isi/.test(idx), 'tombol form bernama Simpan Draft');
}

console.log('[4] PPN dan masa berlaku (model dok + form)');
{
  const form = o => Object.assign({ id: 'D9', jenis: 'penawaran', no: 'QUO-2026-001', tanggal: '2026-11-08', kontak: 'PT Maju', createdAt: 'x', items: [{ nama: 'Kopi', qty: 2, harga: 5000 }] }, o);
  const susun = (f, d) => { ctx.__f = f; ctx.__d = d || []; return J(run('susunDok(__f, __d)')); };
  const hit = d => { ctx.__x = d; return J(run('hitungTotalDok(__x)')); };
  let r = susun(form({ ppnTarif: 11, berlakuSampai: '2026-11-22' }));
  ok(r.ok && r.dok.ppnTarif === 11 && r.dok.berlakuSampai === '2026-11-22', 'ppnTarif dan berlakuSampai disimpan di record');
  r = susun(form());
  ok(r.ok && !('ppnTarif' in r.dok) && !('berlakuSampai' in r.dok), 'tanpa PPN/masa berlaku: field tidak dibuat (record lama tetap sama)');
  ok(susun(form({ ppnTarif: 0, berlakuSampai: '' })).ok && !('ppnTarif' in susun(form({ ppnTarif: 0 })).dok), 'ppnTarif 0 = tanpa PPN');
  ok(!susun(form({ ppnTarif: -1 })).ok && !susun(form({ ppnTarif: 101 })).ok && !susun(form({ ppnTarif: 'x' })).ok, 'tarif PPN tidak valid ditolak');
  ok(!susun(form({ berlakuSampai: '2026-11-07' })).ok, 'berlaku sampai sebelum tanggal ditolak');
  ok(susun(form({ berlakuSampai: '2026-11-08' })).ok, 'berlaku sampai sama dengan tanggal boleh');
  ok(!susun(form({ berlakuSampai: '2026-02-31' })).ok, 'tanggal berlaku tidak valid ditolak');
  let h = hit({ items: [{ qty: 2, harga: 50000 }], ppnTarif: 11 });
  ok(h.subtotal === 100000 && h.ppn === 11000 && h.total === 111000, 'hitungTotalDok: PPN 11%');
  h = hit({ items: [{ qty: 3, harga: 3333 }], ppnTarif: 11 });
  ok(h.ppn === Math.round(9999 * 0.11) && Number.isInteger(h.ppn), 'PPN dibulatkan ke rupiah (sama dengan hitungPpn)');
  h = hit({ items: [{ qty: 2, harga: 50000 }] });
  ok(h.ppn === 0 && h.total === 100000, 'tanpa ppnTarif: total = subtotal');
  ok(hit(null).total === 0, 'dok kosong -> 0');
  ok(run("berlakuDefaultPenawaran('2026-11-08')") === '2026-11-22' && run("berlakuDefaultPenawaran('2026-12-25')") === '2027-01-08' && run("berlakuDefaultPenawaran('')") === '', 'masa berlaku default +14 hari (lintas bulan/tahun)');

  // form: centang PPN mengubah total dan ikut terbaca
  run('openModalPenawaran()');
  ok(el('pnw-berlaku').value === run("berlakuDefaultPenawaran(document.getElementById('pnw-tgl').value)"), 'buka form: masa berlaku terisi default');
  run("_pnwItems = [{nama:'Kopi',qty:2,satuan:'',harga:50000}]; hitungTotalPenawaranForm();");
  ok(/100\.000/.test(el('pnw-total').textContent) && /0/.test(el('pnw-ppn-val').textContent), 'PPN tidak dicentang: total 100.000');
  el('pnw-ppn-check').checked = true; el('pnw-ppn-tarif').value = '11';
  run('hitungTotalPenawaranForm()');
  ok(/111\.000/.test(el('pnw-total').textContent) && /11\.000/.test(el('pnw-ppn-val').textContent) && /100\.000/.test(el('pnw-subtotal').textContent), 'PPN 11% dicentang: PPN 11.000, total 111.000');
  el('pnw-kontak').value = 'PT Maju';
  const f = J(run('_pnwBacaForm()'));
  ok(f.ppnTarif === 11 && f.berlakuSampai === el('pnw-berlaku').value, '_pnwBacaForm membawa ppnTarif dan berlakuSampai');
  el('pnw-ppn-check').checked = false;
  ok(J(run('_pnwBacaForm()')).ppnTarif === 0, 'PPN tidak dicentang: ppnTarif 0');
  el('pnw-ppn-check').checked = true;
  alerts.length = 0; run('simpanPenawaran()');
  ok(alerts.length === 1 && /111\.000/.test(alerts[0]), 'pemberitahuan simpan menyebut total termasuk PPN');
  run('dokList = []');
  el('pnw-berlaku').value = '2000-01-01';
  alerts.length = 0; run('simpanPenawaran()');
  ok(alerts.length === 1 && /berlaku/i.test(alerts[0]), 'masa berlaku sebelum tanggal: pesan kesalahan');
  const idx = rd('index.html');
  ok(['pnw-berlaku', 'pnw-ppn-check', 'pnw-ppn-tarif', 'pnw-subtotal', 'pnw-ppn-val'].every(i => idx.includes('id="' + i + '"')), 'id baru ada di index.html');
}

console.log('[5] penyimpan dok, daftar, hapus');
{
  const J2 = o => JSON.parse(JSON.stringify(o));
  ok(run("idDokBaru([], 1700000000000)") === 'DOK_1700000000000', 'idDokBaru: DOK_<ms>');
  ok(run("idDokBaru([{id:'DOK_1700000000000'}], 1700000000000)") === 'DOK_1700000000000_2' && run("idDokBaru([{id:'DOK_1'},{id:'DOK_1_2'}], 1)") === 'DOK_1_3', 'idDokBaru: id kembar diberi akhiran');
  ok(run("idDokBaru(null, 5)") === 'DOK_5', 'idDokBaru: daftar kosong/null');

  // daftar: hanya jenis penawaran, status dan masa berlaku lewat
  run("dokList = [{id:'A',jenis:'penawaran',no:'QUO-2026-001',kontak:'PT <Maju>',tanggal:'2020-01-01',berlakuSampai:'2020-01-15',status:'draft',items:[{nama:'x',qty:1,harga:1000}],ppnTarif:11},{id:'B',jenis:'pesanan_jual',no:'SO-2026-001',kontak:'Lain',tanggal:'2026-01-01',status:'draft',items:[{nama:'x',qty:1,harga:1}]},{id:'C',jenis:'penawaran',no:'QUO-2026-002',kontak:'CV Dua',tanggal:'2026-11-08',status:'ditolak',items:[{nama:'y',qty:2,harga:500}]}]");
  run('renderPenawaranList()');
  let h = el('penawaran-body').innerHTML;
  ok(h.includes('QUO-2026-001') && h.includes('QUO-2026-002') && !h.includes('SO-2026-001'), 'daftar hanya menampilkan jenis penawaran');
  ok(h.includes('PT &lt;Maju&gt;') && !h.includes('PT <Maju>'), 'nama pelanggan di-escape');
  ok(/1\.110/.test(h) && /1\.000/.test(h), 'total di daftar memakai PPN (1.000 + 11% = 1.110)');
  ok(/color:var\(--red\);font-weight:600;">2020-01-15/.test(h), 'masa berlaku yang lewat (draft) ditandai merah');
  ok(/Ditolak/.test(h) && /Draft/.test(h), 'badge status');
  ok(h.includes("hapusPenawaran('A')") && h.includes("hapusPenawaran('C')"), 'tombol hapus per baris');
  run('dokList = []; renderPenawaranList()');
  ok(/Belum ada penawaran/.test(el('penawaran-body').innerHTML), 'daftar kosong: pesan kosong');

  // hapus
  run("dokList = [{id:'A',jenis:'penawaran',no:'QUO-2026-001',kontak:'PT Maju',status:'draft',items:[]},{id:'B',jenis:'pesanan_jual',no:'SO-2026-001',kontak:'X',status:'draft',items:[]}]");
  konfirmasi = false; alerts.length = 0;
  run("hapusPenawaran('A')");
  ok(run('dokList.length') === 2 && alerts.length === 0, 'hapus dibatalkan di konfirmasi: tidak ada yang berubah');
  konfirmasi = true;
  run("hapusPenawaran('B')");
  ok(run('dokList.length') === 2, 'hapusPenawaran tidak menghapus dokumen jenis lain');
  ctx.counterList = [{ id: 'QUO-2026', jenis: 'QUO', tahun: 2026, terakhir: 7 }];
  run("hapusPenawaran('A')");
  ok(run('dokList.length') === 1 && run('dokList[0].id') === 'B' && alerts.some(a => /dihapus/.test(a)), 'hapus: penawaran terhapus dan pemberitahuan tampil');
  ok(J2(run('counterList'))[0].terakhir === 7, 'hapus tidak menurunkan counter (nomor tidak dipakai ulang)');
  ok(JSON.parse(ctx.localStorage._s['oas_dok']).length === 1, 'hapus: mode tamu menulis ulang oas_dok');
  ok(run("hapusDokById('tidak-ada')") === false, 'hapusDokById: id tidak ada -> false');

  // viewer diblokir
  run("dokList = [{id:'A',jenis:'penawaran',no:'QUO-2026-001',kontak:'PT Maju',status:'draft',items:[]}]");
  ctx.guardHanyaBaca = () => true;
  run("hapusPenawaran('A')");
  ok(run('dokList.length') === 1, 'viewer: tidak bisa menghapus');
  ctx.guardHanyaBaca = () => false;

  // bisnis login: lewat cloudSyncRecords(['dok','counter'])
  const dikirim = [];
  ctx.currentCompany = { id: 'c1' };
  ctx.cloudSyncRecords = k => { dikirim.push(k); return Promise.resolve(true); };
  run("tambahDok({id:'N',jenis:'penawaran',no:'QUO-2026-009',kontak:'K',status:'draft',items:[]})");
  ok(dikirim.length === 1 && dikirim[0].join() === 'dok,counter', 'bisnis login: sinkron kind dok dan counter dalam satu antrean');
  ok(J2(run('counterList')).find(c => c.id === 'QUO-2026').terakhir === 9, 'tambahDok menaikkan counter ke nomor dokumen');
  delete ctx.currentCompany; delete ctx.cloudSyncRecords;
  // muat awal mode tamu dari oas_dok
  const ctx2 = { console, localStorage: { getItem: k => k === 'oas_dok' ? JSON.stringify([{ id: 'Z' }]) : null } };
  vm.createContext(ctx2);
  vm.runInContext(rd('js/35-dok.js'), ctx2);
  ok(vm.runInContext('dokList.length', ctx2) === 1, 'dokList dimuat dari oas_dok saat mode tamu');
  const ctx3 = { console, localStorage: { getItem: () => '{rusak' } };
  vm.createContext(ctx3); vm.runInContext(rd('js/35-dok.js'), ctx3);
  ok(vm.runInContext('dokList.length', ctx3) === 0, 'oas_dok rusak -> daftar kosong, tidak error');
}

console.log('[6] ubah status penawaran (7.2b)');
{
  const J2 = o => JSON.parse(JSON.stringify(o));
  const aksi = st => J2(run("aksiStatusPenawaran('" + st + "')")).map(a => a.ke).join();
  ok(aksi('draft') === 'terkirim,batal', 'draft: Kirim, Batal');
  ok(aksi('terkirim') === 'disetujui,ditolak,batal', 'terkirim: Setujui, Tolak, Batal');
  ok(aksi('disetujui') === 'batal', "disetujui: hanya Batal ('selesai' diisi otomatis oleh 7.3, tanpa tombol manual)");
  ok(aksi('ditolak') === '' && aksi('selesai') === '' && aksi('batal') === '' && aksi('ngawur') === '', 'status final/tidak dikenal: tanpa tombol');
  ok(J2(run("aksiStatusPenawaran('draft')")).every(a => a.konfirmasi === (a.ke === 'batal')) && J2(run("aksiStatusPenawaran('terkirim')")).find(a => a.ke === 'ditolak').konfirmasi === true && J2(run("aksiStatusPenawaran('terkirim')")).find(a => a.ke === 'disetujui').konfirmasi === false, 'konfirmasi hanya untuk Tolak dan Batal');

  run("dokList = [{id:'X',jenis:'pesanan_jual',no:'SO-2026-001',kontak:'Lain',status:'draft',items:[]},{id:'A',jenis:'penawaran',no:'QUO-2026-001',kontak:'PT Maju',tanggal:'2026-11-08',status:'draft',items:[{nama:'x',qty:1,harga:1000}]},{id:'B',jenis:'penawaran',no:'QUO-2026-002',kontak:'CV Dua',tanggal:'2026-11-08',status:'draft',items:[{nama:'y',qty:1,harga:500}]}]");
  run('renderPenawaranList()');
  let h = el('penawaran-body').innerHTML;
  ok(h.includes("ubahStatusPenawaran('A','terkirim')") && h.includes("ubahStatusPenawaran('A','batal')"), 'daftar: tombol Kirim dan Batal untuk draft');
  ok(!h.includes("ubahStatusPenawaran('X'"), 'dokumen jenis lain tidak punya tombol penawaran');

  alerts.length = 0;
  run("ubahStatusPenawaran('A','terkirim')");
  let a = J2(run("dokList.find(d => d.id==='A')"));
  ok(a.status === 'terkirim' && a.riwayat.length === 1 && a.riwayat[0].dari === 'draft' && a.riwayat[0].ke === 'terkirim' && !isNaN(Date.parse(a.riwayat[0].waktu)), 'draft -> terkirim: status berubah, riwayat berwaktu tercatat');
  ok(run("dokList.map(d => d.id).join()") === 'X,A,B', 'posisi dokumen di daftar tidak berubah');
  ok(JSON.parse(ctx.localStorage._s['oas_dok']).find(d => d.id === 'A').status === 'terkirim', 'mode tamu: perubahan tersimpan di oas_dok');
  ok(alerts.length === 1 && /terkirim/.test(alerts[0]), 'pemberitahuan tampil');
  h = el('penawaran-body').innerHTML;
  ok(h.includes("ubahStatusPenawaran('A','disetujui')") && h.includes("ubahStatusPenawaran('A','ditolak')") && !h.includes("ubahStatusPenawaran('A','terkirim')"), 'daftar dirender ulang dengan tombol status baru');

  alerts.length = 0;
  run("ubahStatusPenawaran('B','disetujui')");
  ok(run("dokList.find(d => d.id==='B').status") === 'draft' && alerts.length === 1 && /tidak bisa/.test(alerts[0]), 'lompat draft -> disetujui ditolak, status tetap');
  run("ubahStatusPenawaran('A','selesai')");
  ok(run("dokList.find(d => d.id==='A').status") === 'terkirim', "'selesai' tidak bisa diset manual");
  run("ubahStatusPenawaran('X','batal')");
  ok(run("dokList.find(d => d.id==='X').status") === 'draft', 'dokumen jenis lain tidak bisa diubah lewat fungsi penawaran');
  run("ubahStatusPenawaran('tidak-ada','batal')");

  konfirmasi = false;
  run("ubahStatusPenawaran('A','ditolak')");
  ok(run("dokList.find(d => d.id==='A').status") === 'terkirim', 'Tolak dibatalkan di konfirmasi: status tetap');
  konfirmasi = true;
  run("ubahStatusPenawaran('A','disetujui')");
  run("ubahStatusPenawaran('A','batal')");
  a = J2(run("dokList.find(d => d.id==='A')"));
  ok(a.status === 'batal' && a.riwayat.map(r => r.ke).join() === 'terkirim,disetujui,batal', 'alur penuh draft -> terkirim -> disetujui -> batal tercatat di riwayat');
  run("ubahStatusPenawaran('A','terkirim')");
  ok(run("dokList.find(d => d.id==='A').status") === 'batal', 'status final tidak bisa diubah lagi');
  ok(/Batal/.test(el('penawaran-body').innerHTML), 'badge status Batal tampil');

  ctx.guardHanyaBaca = () => true;
  run("ubahStatusPenawaran('B','terkirim')");
  ok(run("dokList.find(d => d.id==='B').status") === 'draft', 'viewer: tidak bisa mengubah status');
  ctx.guardHanyaBaca = () => false;

  const dikirim = [];
  ctx.currentCompany = { id: 'c1' }; ctx.cloudSyncRecords = k => { dikirim.push(k.join()); return Promise.resolve(true); };
  run("ubahStatusPenawaran('B','terkirim')");
  ok(dikirim.length === 1 && /^dok/.test(dikirim[0]), 'bisnis login: perubahan status disinkron ke cloud (kind dok)');
  delete ctx.currentCompany; delete ctx.cloudSyncRecords;
  ok(run("perbaruiDok({id:'tidak-ada'})") === false && run('perbaruiDok(null)') === false, 'perbaruiDok: id tidak ada / bukan objek -> false');
  const kode = rd('js/36-penawaran-ui.js').replace(/^\s*\/\/.*$/gm, '');
  ok(/transisiDok\(/.test(kode) && !/postJurnalLegacy|addJurnal|buatJurnal/.test(kode), 'status lewat transisiDok; tetap tanpa jurnal');
}

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
