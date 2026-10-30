// Tes js/34-kartu-kontak.js (Kartu Piutang 6.1, Kartu Hutang 6.2) + pemasangannya.
// Jalankan: node tests/kartu-kontak.test.js
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
vm.runInContext(rd('js/31-pembayaran.js').replace(/^const /gm, 'var '), ctx);
vm.runInContext(rd('js/34-kartu-kontak.js').replace(/^const /gm, 'var '), ctx);
const run = c => vm.runInContext(c, ctx);
const K = (jenis, kontak, dok, bay, opsi) => { ctx.__d = dok; ctx.__b = bay; ctx.__o = opsi; return run('susunKartuKontak(' + JSON.stringify(jenis) + ',' + JSON.stringify(kontak) + ',__d,__b,__o)'); };

const inv = o => Object.assign({ id: 'I_' + o.noInvoice, pelanggan: 'PT Maju', tanggal: '2026-09-01', jatuhTempo: '2026-10-01', total: 1000000, sisaTagihan: 1000000, status: 'terkirim' }, o);
const bay = o => Object.assign({ id: 'P_' + Math.random().toString(36).slice(2), jenis: 'invoice', tanggal: '2026-09-10', jumlah: 100000, akunKas: '1101' }, o);

console.log('[1] kartu piutang: baris, urutan, saldo berjalan');
{
  const i1 = inv({ noInvoice: 'INV-1', total: 1000000, sisaTagihan: 600000, status: 'sebagian', tanggal: '2026-09-01' });
  const i2 = inv({ noInvoice: 'INV-2', pelanggan: 'pt maju ', total: 500000, sisaTagihan: 500000, tanggal: '2026-09-15' });
  const daftar = [
    i1, i2,
    inv({ noInvoice: 'INV-3', status: 'draft' }),                       // draft: tidak ikut
    inv({ noInvoice: 'INV-4', pelanggan: 'CV Lain' }),                  // kontak lain
  ];
  const pay = [bay({ dokId: 'I_INV-1', tanggal: '2026-09-10', jumlah: 300000, metode: 'Transfer' }), bay({ dokId: 'I_INV-1', tanggal: '2026-09-20', jumlah: 100000 }),
    bay({ dokId: 'I_HILANG', jumlah: 999 }),                              // yatim: dokumennya tidak ada
    bay({ dokId: 'I_INV-4', jumlah: 50 })];                                // milik kontak lain
  const h = K('piutang', 'PT Maju', daftar, pay);
  ok(h.baris.length === 4, 'hanya invoice non-draft milik kontak + pembayarannya (4 baris), yatim dan kontak lain tidak ikut');
  ok(h.baris.map(r => r.no + ':' + r.tipe).join(',') === 'INV-1:dokumen,INV-1:bayar,INV-2:dokumen,INV-1:bayar', 'urut tanggal; lintas dokumen bergabung di satu kartu');
  ok(h.baris.map(r => r.saldo).join(',') === '1000000,700000,1200000,1100000', 'saldo berjalan');
  ok(h.saldoAkhir === 1100000 && h.total.tambah === 1500000 && h.total.kurang === 400000, 'total periode dan saldo akhir');
  ok(h.baris[1].ket === 'Pembayaran · Transfer', 'keterangan pembayaran memuat metode');
  ok(K('piutang', 'PT MAJU', daftar, pay).saldoAkhir === 1100000, 'nama kontak dicocokkan tanpa beda huruf besar/kecil dan spasi');
  // saldo akhir = jumlah sisaTagihan() semua dokumen (sama dengan angka di Umur Piutang)
  ctx.__b = pay;
  const sisa = d => { ctx.__x = d; return run('sisaTagihan(__x, __b, "invoice")'); };
  ok(h.saldoAkhir === sisa(i1) + sisa(i2), 'saldo akhir = Σ sisaTagihan() dokumen kontak');
}

console.log('[2] pembayaran alur lama (dibayarLama / Tandai Lunas tanpa record)');
{
  const lunasLama = inv({ noInvoice: 'INV-5', total: 800000, sisaTagihan: 0, status: 'lunas' });   // dibayar lewat alur lama, tanpa record
  const h = K('piutang', 'PT Maju', [lunasLama], []);
  ok(h.baris.length === 2 && h.baris[1].tipe === 'lama' && h.baris[1].kurang === 800000 && h.saldoAkhir === 0, 'invoice lunas tanpa record: baris "alur lama" membuat saldo 0');
  const campur = inv({ noInvoice: 'INV-6', total: 1000000, sisaTagihan: 400000, status: 'sebagian', dibayarLama: 200000 });
  const h2 = K('piutang', 'PT Maju', [campur], [bay({ dokId: 'I_INV-6', jumlah: 400000 })]);
  ok(h2.saldoAkhir === 400000 && h2.baris.some(r => r.tipe === 'lama' && r.kurang === 200000), 'dibayarLama + record: saldo akhir = sisaTagihan');
}

console.log('[3] urutan pada tanggal sama dan periode');
{
  const i = inv({ noInvoice: 'INV-7', tanggal: '2026-09-10', total: 100000, sisaTagihan: 0, status: 'lunas' });
  const h = K('piutang', 'PT Maju', [i], [bay({ dokId: 'I_INV-7', tanggal: '2026-09-10', jumlah: 100000 })]);
  ok(h.baris[0].tipe === 'dokumen' && h.baris[1].tipe === 'bayar' && h.baris[1].saldo === 0, 'tanggal sama: invoice dulu, baru pembayarannya (saldo tidak minus)');

  const daftar = [inv({ noInvoice: 'A', tanggal: '2026-08-01', total: 500000, sisaTagihan: 200000, status: 'sebagian' }), inv({ noInvoice: 'B', tanggal: '2026-10-05', total: 300000, sisaTagihan: 300000 })];
  const pay = [bay({ dokId: 'I_A', tanggal: '2026-08-20', jumlah: 300000 })];
  const p = K('piutang', 'PT Maju', daftar, pay, { dari: '2026-09-01', sampai: '2026-10-31' });
  ok(p.saldoAwal === 200000 && p.baris.length === 1 && p.baris[0].no === 'B' && p.baris[0].saldo === 500000, 'dari: mutasi sebelumnya jadi saldoAwal dan saldo berjalan melanjutkan');
  ok(p.saldoAkhir === 500000, 'saldoAkhir = saldoAwal + tambah - kurang');
  const q = K('piutang', 'PT Maju', daftar, pay, { sampai: '2026-08-31' });
  ok(q.baris.length === 2 && q.saldoAkhir === 200000, 'sampai: mutasi sesudahnya dibuang');
  ok(K('piutang', 'PT Maju', daftar, pay, { dari: 'bukan-tanggal' }).baris.length === 3, 'tanggal periode tidak valid diabaikan');
}

console.log('[4] data rusak tidak merusak kartu');
{
  const h = K('piutang', 'PT Maju', [inv({ noInvoice: 'X', total: 'abc' }), inv({ noInvoice: 'Y', tanggal: '' }), null, 5, inv({ noInvoice: 'Z', total: 100, sisaTagihan: 100 })], [null, bay({ dokId: 'I_Z', jumlah: 'x' })]);
  ok(h.tidakValid === 2 && h.baris.length === 1, 'dokumen tanpa total/tanggal valid dilewati dan dihitung di tidakValid; pembayaran rusak diabaikan');
  ok(K('piutang', 'PT Maju', null, null).baris.length === 0, 'masukan bukan array -> kartu kosong');
  let err = null; try { K('lain', 'x', [], []); } catch (e) { err = e; }
  ok(err && err.name === 'TypeError', 'jenis tidak dikenal -> TypeError');
  const d = [inv({ noInvoice: 'Z', total: 100, sisaTagihan: 100 })]; const salin = JSON.stringify(d);
  K('piutang', 'PT Maju', d, []); ok(JSON.stringify(d) === salin, 'tidak mengubah dokumen masukan');
}

console.log('[5] kartu hutang (bill, pembayaran bill, pembelian kredit lama)');
{
  const bill = o => Object.assign({ id: 'B_' + o.noBill, supplier: 'PT Supplier', tanggal: '2026-09-01', jatuhTempo: '2026-10-01', total: 1000000, sisaTagihan: 1000000, status: 'diterima' }, o);
  const jBill = (no, noBill, sup, tgl) => ({ no, jenis: 'Tagihan Pembelian', tanggal: tgl || '2026-09-01', ket: 'Tagihan ' + noBill + ' — ' + sup, lines: [] });
  const bills = [
    bill({ noBill: 'BILL-1', total: 1000000, sisaTagihan: 600000, status: 'sebagian', jurnalNo: 'JRN-1' }),
    bill({ noBill: 'BILL-2', total: 400000, sisaTagihan: 0, status: 'lunas', jurnalNo: 'JRN-2', tanggal: '2026-09-05' }),
    bill({ noBill: 'BILL-3', status: 'draft' }),                                  // draft: tidak ikut
    bill({ noBill: 'BILL-4', jurnalNo: 'JRN-4', total: 777 }),                     // jurnal dibalik: tidak ikut
    bill({ noBill: 'BILL-5', supplier: 'CV Lain' })
  ];
  const jurnal = [jBill('JRN-1', 'BILL-1', 'PT Supplier'), jBill('JRN-2', 'BILL-2', 'PT Supplier'), jBill('JRN-4', 'BILL-4', 'PT Supplier'),
    { no: 'JRN-9', jenis: 'Tagihan Pembelian', tanggal: '2026-09-02', ket: '[Pembalik JRN-4] Tagihan BILL-4 — PT Supplier', lines: [] },
    // pembelian kredit lama tanpa bill (hanya jurnal)
    { no: 'JRN-20', jenis: 'Pembelian', tanggal: '2026-09-03', ket: 'Beli barang — PT Supplier', lines: [{ akun: '1301', debit: 250000, kredit: 0 }, { akun: '2101', debit: 0, kredit: 250000 }] },
    // pembelian kredit yang sudah punya bill lunas (jurnalNo cocok): tidak boleh muncul lagi lewat jurnalnya
    { no: 'JRN-21', jenis: 'Pembelian', tanggal: '2026-09-04', ket: 'Beli stok — PT Supplier', lines: [{ akun: '1301', debit: 90000, kredit: 0 }, { akun: '2101', debit: 0, kredit: 90000 }] }
  ];
  bills.push(bill({ noBill: 'BILL-6', total: 90000, sisaTagihan: 0, status: 'lunas', jurnalNo: 'JRN-21', tanggal: '2026-09-04' }));
  ctx.__bills = bills; ctx.__jurnal = jurnal;
  const dok = run('dokumenHutangKartu(__bills, __jurnal)');
  ok(dok.length === 5 && !dok.some(b => b.noBill === 'BILL-3' || b.noBill === 'BILL-4'), 'dokumenHutangKartu: draft dan bill berjurnal dibalik tidak ikut');
  ok(dok.filter(b => /jrn_kredit/.test(b.id)).length === 1, 'pembelian kredit lama tanpa bill ikut; yang sudah punya bill (walau lunas) tidak dihitung dua kali');

  const pay = [bay({ jenis: 'bill', dokId: 'B_BILL-1', tanggal: '2026-09-12', jumlah: 400000 }), bay({ jenis: 'bill', dokId: 'B_BILL-2', tanggal: '2026-09-06', jumlah: 400000 }),
    bay({ jenis: 'bill', dokId: 'B_BILL-6', tanggal: '2026-09-07', jumlah: 90000 })];
  const h = K('hutang', 'PT Supplier', dok, pay);
  ok(h.jenis === 'hutang' && h.saldoAkhir === 600000 + 250000, 'saldo akhir hutang = bill sebagian (600.000) + pembelian kredit lama (250.000)');
  ok(h.baris.every(r => r.tambah > 0 || r.kurang > 0) && h.baris[0].saldo === 1000000, 'baris pertama: tagihan menambah saldo');
  ok(!K('hutang', 'CV Lain', dok, pay).baris.some(r => r.no === 'BILL-1'), 'kartu supplier lain tidak memuat tagihan supplier ini');
  // konsisten dengan Umur Hutang
  const aging = run('hitungAging(billUntukAging(__bills, __jurnal), "2026-12-31")');
  const pk = aging.perKontak.find(k => k.kontak === 'PT Supplier');
  ok(pk && pk.total === h.saldoAkhir, 'saldo akhir kartu hutang = total Umur Hutang supplier itu');
  ok(JSON.stringify(run('daftarKontakKartu("hutang", dokumenHutangKartu(__bills, __jurnal))')) === JSON.stringify(['CV Lain', 'PT Supplier']), 'daftarKontakKartu hutang: nama unik urut abjad');
}

console.log('[6] daftarKontakKartu piutang dan HTML');
{
  ctx.__i = [inv({ noInvoice: '1', pelanggan: 'Budi' }), inv({ noInvoice: '2', pelanggan: 'budi' }), inv({ noInvoice: '3', pelanggan: 'Ani' }), inv({ noInvoice: '4', pelanggan: 'Dodi', status: 'draft' }), inv({ noInvoice: '5', pelanggan: '  ' })];
  ok(JSON.stringify(run('daftarKontakKartu("piutang", __i)')) === JSON.stringify(['Ani', 'Budi']), 'nama unik tanpa beda huruf, urut abjad; draft dan nama kosong dilewati');
  ok(JSON.stringify(run('daftarKontakKartu("lain", __i)')) === '[]', 'jenis tidak dikenal -> []');

  const h = K('piutang', 'PT <b>Maju</b>', [inv({ noInvoice: 'I<1>', pelanggan: 'PT <b>Maju</b>', total: 100, sisaTagihan: 100 })], [], { dari: '2026-01-01' });
  ctx.__h = h;
  const html = run('kartuKontakHtml(__h)');
  ok(html.includes('Saldo awal') && html.includes('Total periode') && html.includes('<table id="kartu-piutang-table">'), 'HTML memuat saldo awal bila ada periode, total periode, dan id tabel');
  ok(!html.includes('<b>Maju') && html.includes('&lt;'), 'teks pengguna di-escape');
  ctx.__k = K('hutang', 'Siapa', [], []);
  ok(/Belum ada tagihan untuk Siapa/.test(run('kartuKontakHtml(__k)')), 'kartu kosong menampilkan pesan');
}

console.log('[6b] render ke halaman (DOM tiruan)');
{
  const el = {}; ['kontak', 'dari', 'sampai', 'body'].forEach(k => ['piutang', 'hutang'].forEach(j => { el['kartu-' + j + '-' + k] = { value: '', innerHTML: '' }; }));
  ctx.document = { getElementById: id => el[id] || null };
  vm.runInContext('var invoiceList = [], jurnalEntries = []; billList = [];', ctx);
  run('renderKartuPiutang(); renderKartuHutang();');
  ok(/Belum ada invoice untuk ditampilkan/.test(el['kartu-piutang-body'].innerHTML) && /Belum ada tagihan untuk ditampilkan/.test(el['kartu-hutang-body'].innerHTML), 'tanpa data: pesan kosong, tidak error');
  run('invoiceList = [{ id: "I1", noInvoice: "INV-1", pelanggan: "Budi", tanggal: "2026-09-01", total: 1000, sisaTagihan: 1000, status: "terkirim" }, { id: "I2", noInvoice: "INV-2", pelanggan: "Ani", tanggal: "2026-09-02", total: 500, sisaTagihan: 500, status: "terkirim" }]');
  run('renderKartuPiutang()');
  ok(el['kartu-piutang-kontak'].innerHTML.includes('value="Ani" selected') && el['kartu-piutang-body'].innerHTML.includes('INV-2'), 'kontak pertama (urut abjad) dipilih otomatis dan kartunya tampil');
  el['kartu-piutang-kontak'].value = 'Budi'; run('renderKartuPiutang()');
  ok(el['kartu-piutang-kontak'].innerHTML.includes('value="Budi" selected') && el['kartu-piutang-body'].innerHTML.includes('INV-1') && !el['kartu-piutang-body'].innerHTML.includes('INV-2'), 'pilihan kontak dipertahankan saat render ulang');
  el['kartu-piutang-dari'].value = '2026-12-01'; run('renderKartuPiutang()');
  ok(el['kartu-piutang-body'].innerHTML.includes('Saldo awal'), 'filter dari-tanggal dibaca dari input');
  run('billList = [{ id: "B1", noBill: "BILL-1", supplier: "PT S", tanggal: "2026-09-01", total: 700, sisaTagihan: 700, status: "diterima" }]');
  run('renderKartuHutang()');
  ok(el['kartu-hutang-body'].innerHTML.includes('BILL-1') && el['kartu-hutang-body'].innerHTML.includes('kartu-hutang-table'), 'kartu hutang tampil dari billList');
  delete ctx.document;
}

console.log('[7] pemasangan');
{
  const idx = rd('index.html'), nav = rd('js/04-navigasi-tema.js'), db = rd('js/26-daftar-bisnis.js'), src = rd('js/34-kartu-kontak.js');
  ['kartu-piutang', 'kartu-hutang'].forEach(j => {
    ok(idx.includes('id="page-' + j + '"') && idx.includes("showPage('" + j + "')"), j + ': halaman dan kartu navigasi ada di index.html');
    ok(new RegExp("'" + j + "':\\['").test(nav), j + ': judul di pageTitles');
    ok(nav.includes("if(id==='" + j + "') renderKartu"), j + ': showPage memanggil render');
    ok(new RegExp("'" + j + "': 'invoice'").test(db), j + ': izin modul mengikuti Invoice');
  });
  const ids = [...src.matchAll(/C\.id \+ '-(body|kontak)'/g)].length;
  ok(ids === 2, 'render memakai id body dan kontak');
  ['kontak', 'dari', 'sampai', 'body'].forEach(s => ['piutang', 'hutang'].forEach(j => ok(idx.includes('id="kartu-' + j + '-' + s + '"'), 'id kartu-' + j + '-' + s + ' ada di index.html')));
  ok(/js\/34-kartu-kontak\.js/.test(idx) && idx.indexOf('js/31-pembayaran.js') < idx.indexOf('js/34-kartu-kontak.js'), 'script dimuat setelah 31-pembayaran.js');
  ok(!/localStorage|document\./.test(src.split('// ── Render ke halaman')[0].replace(/\/\/.*$/gm, '')), 'bagian murni tidak menyentuh DOM atau localStorage');
}

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
