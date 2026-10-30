// ═══════════════════════════════════════════════════════════
// PEMBAYARAN — model data dan fungsi murni sisa tagihan (task 5.1, Roadmap.md)
//
// Satu record = satu pembayaran atas satu dokumen (invoice atau bill). Bentuk record: docs/SCHEMA.md §4.5c.
// State pembayaranList disinkron lewat cloud-records (kind `pembayaran`, 22-cloud-records.js).
// Task 5.1: model, state, dan fungsi hitung. Task 5.2: validasi + penyusun record (susunPembayaran), pencatatan
// ke invoice (catatPembayaran), dan penyimpan (simpanPembayaranState); form-nya ada di 32-pembayaran-ui.js.
// Task 5.3: jurnal pembayaran invoice (Dr Kas/Bank, Cr Piutang): buatJurnalPembayaranInvoice, jurnalPembayaranStatus dan
// pembayaranInvoiceBelumJurnal (semuanya murni, di bawah file ini); pemostingannya ada di 32-pembayaran-ui.js.
// Task 5.5: pembayaran bill (Dr Utang Usaha, Cr Kas/Bank) + penghapusan dengan jurnal pembalik.
//
// Sisa tagihan DIHITUNG dari pembayaran, bukan dikurangi di tempat, supaya menghapus atau
// mengoreksi pembayaran tidak membuat sisa tidak sinkron:
//   sisa = total dokumen − dibayarLama − jumlah semua pembayaran dokumen itu
// `dibayarLama` (opsional di invoice/bill, kosong = 0) menampung pembayaran yang dicatat lewat alur lama
// ("Tandai Lunas" di 11-kontak-invoice.js), yang hanya mengurangi sisaTagihan tanpa membuat record.
// Pembayaran pertama di dokumen seperti itu (5.2) mengisinya dengan total − sisaTagihan saat itu,
// supaya sisa lama tidak hidup lagi.
// Field `sisaTagihan` di invoice/bill tetap dibaca banyak tempat (daftar, ekspor, aging); alur bayar
// (5.2, 5.5) mengisinya ulang dari fungsi ini setiap kali pembayaran ditambah atau dihapus.
// Fungsi hitung dan penyusun di sini murni (tanpa DOM, localStorage, atau state); hanya catatPembayaran dan
// simpanPembayaranState yang mengubah state. Diuji di tests/pembayaran.test.js.
// Dimuat setelah 30-aging-hutang.js.
// ═══════════════════════════════════════════════════════════

const PEMBAYARAN_JENIS = ['invoice', 'bill'];

// State. Bisnis login: dimuat/disimpan lewat cloud-records (kind `pembayaran`). Mode tamu: key localStorage `oas_pembayaran`.
let pembayaranList = (() => {
  try { const a = JSON.parse(localStorage.getItem('oas_pembayaran') || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
})();

// Pembulatan ke sen supaya jumlah desimal tidak meninggalkan sisa 0,0000001 (float).
function _bayarBulat(n) { return Math.round(n * 100) / 100; }

// Pembayaran yang sah untuk satu dokumen: jenis dan dokId cocok, jumlah angka hingga dan > 0.
// Record rusak, jenis lain, atau milik dokumen lain (termasuk dokumen yang sudah dihapus) diabaikan.
function pembayaranDokumen(daftar, jenis, dokId) {
  if (!PEMBAYARAN_JENIS.includes(jenis) || dokId === undefined || dokId === null || dokId === '') return [];
  return (Array.isArray(daftar) ? daftar : []).filter(p =>
    p && typeof p === 'object' && p.jenis === jenis && String(p.dokId) === String(dokId) &&
    typeof p.jumlah === 'number' && isFinite(p.jumlah) && p.jumlah > 0);
}

// Total yang sudah dibayar: dibayarLama (>= 0) + jumlah semua pembayaran dokumen.
function totalDibayar(dok, daftar, jenis) {
  if (!dok || typeof dok !== 'object') return 0;
  const lama = (typeof dok.dibayarLama === 'number' && isFinite(dok.dibayarLama) && dok.dibayarLama > 0) ? dok.dibayarLama : 0;
  const baru = pembayaranDokumen(daftar, jenis, dok.id).reduce((s, p) => s + p.jumlah, 0);
  return _bayarBulat(lama + baru);
}

// Sisa tagihan dokumen (invoice: jenis 'invoice'; bill: 'bill'). Tidak pernah negatif: kelebihan bayar
// tidak dikembalikan sebagai angka minus (5.2 menolak pembayaran yang melebihi sisa).
// dok tanpa total angka hingga -> 0.
function sisaTagihan(dok, daftar, jenis) {
  if (!dok || typeof dok !== 'object' || typeof dok.total !== 'number' || !isFinite(dok.total)) return 0;
  return Math.max(0, _bayarBulat(dok.total - totalDibayar(dok, daftar, jenis)));
}

// ── Task 5.2: catat pembayaran ─────────────────────────────

// Status dokumen yang boleh dibayar. Draft belum punya piutang/utang; lunas tidak punya sisa.
const PEMBAYARAN_STATUS_BOLEH = { invoice: ['terkirim'], bill: ['diterima'] };
// Dokumen yang sudah berstatus sebagian tetap boleh menerima cicilan berikutnya.
const PEMBAYARAN_STATUS_LANJUT = { invoice: ['terkirim', 'sebagian'], bill: ['diterima', 'sebagian'] };

function _bayarTanggalValid(s) {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

// Nilai dibayarLama yang harus dipegang dokumen SEBELUM pembayaran baru dicatat. Pembayaran lewat alur lama
// ("Tandai Lunas") hanya menurunkan sisaTagihan tanpa record, jadi bagian yang sudah dibayar menurut
// sisaTagihan tersimpan tetapi tidak terwakili record dianggap dibayarLama:
//   dibayarLama = max(dibayarLama yang ada, total - sisaTagihan tersimpan - jumlah semua record)
// Ini juga menangani invoice yang sebagian dibayar lewat record, lalu sisanya lewat "Tandai Lunas" (kedua tombol
// hidup berdampingan sampai 5.3). Tanpa record, hasilnya total - sisaTagihan (aturan 5.1). Tidak pernah melebihi total.
function dibayarLamaTurunan(dok, daftar, jenis) {
  if (!dok || typeof dok !== 'object' || typeof dok.total !== 'number' || !isFinite(dok.total)) return 0;
  const lama = (typeof dok.dibayarLama === 'number' && isFinite(dok.dibayarLama) && dok.dibayarLama > 0) ? dok.dibayarLama : 0;
  if (typeof dok.sisaTagihan !== 'number' || !isFinite(dok.sisaTagihan)) return _bayarBulat(Math.min(dok.total, lama));
  const catat = pembayaranDokumen(daftar, jenis, dok.id).reduce((s, p) => s + p.jumlah, 0);
  const tersirat = _bayarBulat(dok.total - Math.max(0, dok.sisaTagihan) - catat);
  return _bayarBulat(Math.min(dok.total, Math.max(lama, tersirat > 0 ? tersirat : 0)));
}

// Validasi isi form lalu susun record pembayaran (murni: tidak mengubah dok maupun daftar).
// f    : { id, createdAt, tanggal 'YYYY-MM-DD', jumlah (angka), akunKas, metode?, catatan? }
// dok  : invoice (jenis 'invoice') atau bill (jenis 'bill'); jenis kosong = 'invoice'
// Aturan: dokumen berstatus boleh dibayar (PEMBAYARAN_STATUS_BOLEH) dan masih bersisa; tanggal valid dan tidak
// sebelum tanggal dokumen; jumlah > 0 dan tidak melebihi sisa (dibulatkan ke sen); akun kas terisi; id tidak kembar.
// Mengembalikan { ok:true, pembayaran, dibayarLama, sisaBaru, lunas } atau { ok:false, pesan }.
// `dibayarLama` dan `sisaBaru` adalah nilai baru untuk dokumen; yang menuliskannya ke dokumen adalah catatPembayaran.
function susunPembayaran(f, dok, daftar, jenis) {
  const gagal = pesan => ({ ok: false, pesan });
  f = f || {};
  jenis = jenis || 'invoice';
  if (!PEMBAYARAN_JENIS.includes(jenis)) return gagal('Jenis dokumen tidak dikenal.');
  const label = jenis === 'bill' ? 'Tagihan' : 'Invoice';
  if (!dok || typeof dok !== 'object' || dok.id === undefined || dok.id === null || dok.id === '') return gagal(label + ' yang dibayar tidak ditemukan.');
  if (typeof dok.total !== 'number' || !isFinite(dok.total) || dok.total <= 0) return gagal('Total ' + label.toLowerCase() + ' tidak valid.');
  if (!PEMBAYARAN_STATUS_LANJUT[jenis].includes(dok.status)) {
    if (dok.status === 'lunas') return gagal(label + ' ini sudah lunas.');
    if (dok.status === 'draft') return gagal(label + ' ini masih draft, belum bisa dibayar.');
    return gagal('Status ' + label.toLowerCase() + ' ini tidak bisa dibayar.');
  }

  const tanggal = typeof f.tanggal === 'string' ? f.tanggal.trim() : '';
  if (!_bayarTanggalValid(tanggal)) return gagal('Isi tanggal pembayaran yang valid.');
  if (_bayarTanggalValid(dok.tanggal) && tanggal < dok.tanggal) return gagal('Tanggal pembayaran tidak boleh sebelum tanggal ' + label.toLowerCase() + ' (' + dok.tanggal + ').');

  const akunKas = typeof f.akunKas === 'string' ? f.akunKas.trim() : '';
  if (!akunKas) return gagal('Pilih akun kas/bank.');

  const id = typeof f.id === 'string' ? f.id.trim() : '';
  if (!id) return gagal('ID pembayaran kosong.');
  if ((Array.isArray(daftar) ? daftar : []).some(p => p && p.id === id)) return gagal('ID pembayaran sudah dipakai.');
  const createdAt = typeof f.createdAt === 'string' ? f.createdAt : '';
  if (!createdAt) return gagal('Waktu pembuatan pembayaran kosong.');

  if (typeof f.jumlah !== 'number' || !isFinite(f.jumlah)) return gagal('Isi jumlah pembayaran.');
  const jumlah = _bayarBulat(f.jumlah);
  if (jumlah <= 0) return gagal('Jumlah pembayaran harus lebih dari 0.');

  const lama = dibayarLamaTurunan(dok, daftar, jenis);
  const sisa = sisaTagihan(Object.assign({}, dok, { dibayarLama: lama }), daftar, jenis);
  if (sisa <= 0) return gagal(label + ' ini sudah tidak punya sisa tagihan.');
  if (jumlah > sisa) return gagal('Jumlah melebihi sisa tagihan (Rp ' + sisa.toLocaleString('id-ID') + ').');

  const pembayaran = { id, jenis, dokId: dok.id, noDok: String(dok.noInvoice || dok.noBill || ''), tanggal, jumlah, akunKas };
  const metode = typeof f.metode === 'string' ? f.metode.trim() : '';
  const catatan = typeof f.catatan === 'string' ? f.catatan.trim() : '';
  if (metode) pembayaran.metode = metode;
  if (catatan) pembayaran.catatan = catatan;
  pembayaran.createdAt = createdAt;
  const sisaBaru = _bayarBulat(sisa - jumlah);
  return { ok: true, pembayaran, dibayarLama: lama, sisaBaru, lunas: sisaBaru <= 0 };
}

// Simpan state pembayaran dan dokumen yang berubah. Bisnis login: satu antrean sinkron untuk invoice + pembayaran
// (jenis 'bill': bill + pembayaran). Mode tamu: localStorage `oas_pembayaran` + `oas_invoices`/`oas_bill`.
function simpanPembayaranState(jenis) {
  const kindDok = jenis === 'bill' ? 'bill' : 'invoice';
  if (typeof currentCompany !== 'undefined' && currentCompany && typeof cloudSyncRecords === 'function') {
    return cloudSyncRecords([kindDok, 'pembayaran']);
  }
  try {
    localStorage.setItem('oas_pembayaran', JSON.stringify(pembayaranList));
    if (kindDok === 'bill') localStorage.setItem('oas_bill', JSON.stringify(billList));
    else localStorage.setItem('oas_invoices', JSON.stringify(invoiceList));
  } catch (e) { return Promise.resolve(false); }
  return Promise.resolve(true);
}

// ── Task 5.4: status invoice otomatis ──────────────────────

// Status invoice/bill turunan dari total pembayaran (murni).
// Invoice: 'draft' = belum terkirim (tidak berubah), 'terkirim' = belum dibayar, 'sebagian' = dibayar sebagian,
//          'lunas' = sisa 0, 'jatuh-tempo' = dikomputasi di tempat pemakai (bukan disimpan, hanya untuk filter/badge).
// Bill: 'draft' = belum diterima (tidak berubah), 'diterima' = belum lunas, 'sebagian', 'lunas'.
// Fungsi ini hanya dipanggil untuk invoice/bill yang sudah terkirim/diterima, jadi tidak mengubah draft ke lain.
// Mengembalikan status baru atau status asal (dok.status) bila belum terkirim/diterima atau total tidak valid.
function statusDariPembayaran(dok, daftar, jenis) {
  if (!dok || typeof dok !== 'object') return '';
  jenis = jenis || 'invoice';
  const asal = (typeof dok.status === 'string' ? dok.status : '').trim();
  const boleh = PEMBAYARAN_STATUS_BOLEH[jenis];
  if (!boleh || !boleh.includes(asal)) return asal; // draft atau status lain: tidak berubah
  
  const total = (typeof dok.total === 'number' && isFinite(dok.total)) ? dok.total : 0;
  if (total <= 0) return asal; // total tidak valid: tidak mengubah status
  
  const sisa = sisaTagihan(dok, daftar, jenis);
  
  if (sisa <= 0) return 'lunas';
  const dibayar = totalDibayar(dok, daftar, jenis);
  if (dibayar > 0 && sisa < total) return 'sebagian';
  return asal; // belum dibayar: tetap terkirim/diterima
}

// Pasang hasil susunPembayaran yang ok ke state: tambah record (terbaru di atas), isi ulang dibayarLama dan
// sisaTagihan dokumen dari hasil hitung, lalu simpan. Status dokumen ditentukan lewat statusDariPembayaran (5.4):
// sisa 0 -> 'lunas', dibayar sebagian -> 'sebagian', belum dibayar -> tetap 'terkirim'/'diterima' (atau draft, tidak berubah).
// jurnalNo diisi pemanggil SEBELUM fungsi ini (invoice: postingJurnalPembayaranInvoice di 32-pembayaran-ui.js, 5.3;
// bill: 5.5); record lama dari 5.2 tanpa jurnalNo dijurnalkan belakangan lewat jurnalkanPembayaranInvoiceLama.
function catatPembayaran(dok, hasil) {
  if (!dok || !hasil || !hasil.ok) return Promise.resolve(false);
  pembayaranList.unshift(hasil.pembayaran);
  if (hasil.dibayarLama > 0) dok.dibayarLama = hasil.dibayarLama;
  dok.sisaTagihan = hasil.sisaBaru;
  dok.status = statusDariPembayaran(dok, pembayaranList, hasil.pembayaran.jenis);
  return simpanPembayaranState(hasil.pembayaran.jenis);
}

// ── Task 5.3: jurnal pembayaran invoice ────────────────────

// Jenis jurnal pembayaran invoice = jenis jurnal invoice (JENIS_JURNAL.INVOICE, 02-utils.js), sama dengan jurnal
// pelunasan alur lama, supaya badge dan laporan yang sudah ada tidak berubah.
function _bayarJenisJurnal() {
  return (typeof JENIS_JURNAL !== 'undefined' && JENIS_JURNAL.INVOICE) ? JENIS_JURNAL.INVOICE : 'Invoice & Piutang';
}

// Awal keterangan jurnal pembayaran: "Pembayaran <noInvoice> — <pelanggan>". Dipakai pembuat jurnal dan penaut.
function _bayarKetJurnal(pembayaran, inv) {
  const no = String((inv && inv.noInvoice) || (pembayaran && pembayaran.noDok) || '').trim();
  return 'Pembayaran ' + no + ' — ' + String((inv && inv.pelanggan) || '').trim();
}

// Susun jurnal satu pembayaran invoice (murni): Dr akun kas/bank pembayaran, Cr akun piutang invoice, sebesar jumlah
// pembayaran (dibulatkan ke sen, sama seperti sisaTagihan). Tanggal jurnal = tanggal pembayaran.
// opsi.akunPiutang: cadangan bila invoice tidak menyimpan akunPiutang (mis. invoice lama dari AI).
// Mengembalikan { ok:true, jurnal } (belum bernomor; nomor diisi addJurnal) atau { ok:false, pesan }.
// Tidak memeriksa kunci periode dan tidak memposting; itu tugas postingJurnalPembayaranInvoice.
function buatJurnalPembayaranInvoice(pembayaran, inv, opsi) {
  const gagal = pesan => ({ ok: false, pesan });
  const teks = v => (typeof v === 'string' ? v.trim() : '');
  if (!pembayaran || typeof pembayaran !== 'object' || pembayaran.jenis !== 'invoice') return gagal('Pembayaran invoice tidak valid.');
  if (!inv || typeof inv !== 'object') return gagal('Invoice untuk pembayaran ini tidak ditemukan.');
  if (String(pembayaran.dokId) !== String(inv.id)) return gagal('Pembayaran ini bukan milik invoice tersebut.');
  const jumlah = (typeof pembayaran.jumlah === 'number' && isFinite(pembayaran.jumlah)) ? _bayarBulat(pembayaran.jumlah) : 0;
  if (jumlah <= 0) return gagal('Jumlah pembayaran tidak valid.');
  const tanggal = teks(pembayaran.tanggal);
  if (!_bayarTanggalValid(tanggal)) return gagal('Tanggal pembayaran tidak valid.');
  const akunKas = teks(pembayaran.akunKas);
  if (!akunKas) return gagal('Akun kas/bank pembayaran kosong.');
  const akunPiutang = teks(inv.akunPiutang) || teks(opsi && opsi.akunPiutang);
  if (!akunPiutang) return gagal('Invoice ini tidak punya akun piutang, jurnal pembayaran tidak bisa dibuat.');
  if (akunKas === akunPiutang) return gagal('Akun kas/bank dan akun piutang tidak boleh sama.');
  const no = teks(inv.noInvoice) || teks(pembayaran.noDok);
  const pelanggan = teks(inv.pelanggan);
  return {
    ok: true,
    jurnal: {
      tanggal,
      jenis: _bayarJenisJurnal(),
      keterangan: _bayarKetJurnal(pembayaran, inv),
      ref: no,
      lines: [
        { akun: akunKas, ket: 'Penerimaan ' + no, debit: jumlah, kredit: 0 },
        { akun: akunPiutang, ket: 'Pelunasan piutang' + (pelanggan ? ' — ' + pelanggan : ''), debit: 0, kredit: jumlah }
      ]
    }
  };
}

// Status jurnal satu pembayaran invoice, dibaca dari daftar jurnal (murni).
//   'belum'  : belum punya jurnal (record dari 5.2, atau jurnalnya sudah tidak ada)
//   'aktif'  : jurnal ada dan belum dibalik
//   'dibalik': jurnal ada tetapi sudah dibalik (jurnal pembalik)
// Penaut: pembayaran.jurnalNo (nomor JRN-xxx) bila cocok dengan jurnal berjenis invoice yang ketnya diawali
// "Pembayaran <noInvoice> — <pelanggan>". Tanpa jurnalNo (atau nomor berulang setelah Reset Data), dicari dari
// ket + tanggal + akun kas + jumlah, dengan melewati jurnal yang nomornya sudah dipakai pembayaran lain.
// `id` dan `ref` jurnal tidak ikut tersimpan ke cloud, jadi penaut tidak memakainya (pola jurnalBillStatus).
// Jurnal pembalik (jenisnya diwarisi dari jurnal asal) tidak dihitung sebagai jurnal pembayaran.
// Mengembalikan { status, jurnal }.
function jurnalPembayaranStatus(pembayaran, inv, daftarJurnal, daftarPembayaran) {
  if (!pembayaran || typeof pembayaran !== 'object' || pembayaran.jenis !== 'invoice' || !inv || typeof inv !== 'object') return { status: 'belum', jurnal: null };
  const js = (Array.isArray(daftarJurnal) ? daftarJurnal : []).filter(j => j && typeof j === 'object');
  const ketJ = j => String(j.ket || j.keterangan || '');
  const pembalikDari = j => {
    if (j.reversalOf) return String(j.reversalOf);
    const m = /^\[Pembalik ([^\]]+)\]/.exec(ketJ(j));
    return m ? m[1].trim() : '';
  };
  const jenis = _bayarJenisJurnal();
  const asal = js.filter(j => j.jenis === jenis && !pembalikDari(j));
  const awal = _bayarKetJurnal(pembayaran, inv);
  const jumlah = (typeof pembayaran.jumlah === 'number' && isFinite(pembayaran.jumlah)) ? _bayarBulat(pembayaran.jumlah) : NaN;
  const dibalik = j => js.some(x => pembalikDari(x) === j.no);
  const isiCocok = j => String(j.tanggal || '').slice(0, 10) === pembayaran.tanggal
    && (Array.isArray(j.lines) ? j.lines : []).some(l => l && l.akun === pembayaran.akunKas && _bayarBulat(l.debit || 0) === jumlah);
  let jurnal = null;
  if (pembayaran.jurnalNo) jurnal = asal.find(j => j.no === pembayaran.jurnalNo && ketJ(j).startsWith(awal)) || null;
  if (!jurnal) {
    const dipakaiLain = new Set((Array.isArray(daftarPembayaran) ? daftarPembayaran : [])
      .filter(p => p && p !== pembayaran && p.id !== pembayaran.id && p.jurnalNo).map(p => p.jurnalNo));
    const cocok = asal.filter(j => ketJ(j).startsWith(awal) && isiCocok(j) && !dipakaiLain.has(j.no));
    jurnal = cocok.find(j => !dibalik(j)) || cocok[0] || null;
  }
  if (!jurnal) return { status: 'belum', jurnal: null };
  return { status: dibalik(jurnal) ? 'dibalik' : 'aktif', jurnal };
}

// Pembayaran invoice yang belum pernah dijurnal (murni): record dari 5.2 (sebelum jurnal ada) atau yang jurnalnya
// sudah tidak ada. Yang jurnalnya sengaja DIBALIK tidak ikut (status 'dibalik'): membuatnya lagi secara massal bisa
// membatalkan koreksi pengguna. Pembayaran milik invoice yang sudah dihapus dilewati (tidak ada piutang yang dikredit).
// Mengembalikan [{ pembayaran, invoice }] sesuai urutan daftar pembayaran.
function pembayaranInvoiceBelumJurnal(daftarPembayaran, daftarInvoice, daftarJurnal) {
  const invs = Array.isArray(daftarInvoice) ? daftarInvoice : [];
  const semua = Array.isArray(daftarPembayaran) ? daftarPembayaran : [];
  const hasil = [];
  semua.forEach(p => {
    if (!p || typeof p !== 'object' || p.jenis !== 'invoice') return;
    if (!(typeof p.jumlah === 'number' && isFinite(p.jumlah) && p.jumlah > 0)) return;
    const inv = invs.find(i => i && String(i.id) === String(p.dokId));
    if (!inv) return;
    if (jurnalPembayaranStatus(p, inv, daftarJurnal, semua).status !== 'belum') return;
    hasil.push({ pembayaran: p, invoice: inv });
  });
  return hasil;
}

// ── Task 5.5: jurnal pembayaran bill ───────────────────────
function buatJurnalPembayaranBill(pembayaran, bill) {
  const gagal = pesan => ({ ok: false, pesan });
  const teks = v => typeof v === 'string' ? v.trim() : '';
  if (!pembayaran || pembayaran.jenis !== 'bill') return gagal('Pembayaran tagihan tidak valid.');
  if (!bill || String(pembayaran.dokId) !== String(bill.id)) return gagal('Tagihan untuk pembayaran ini tidak ditemukan.');
  const jumlah = typeof pembayaran.jumlah === 'number' && isFinite(pembayaran.jumlah) ? _bayarBulat(pembayaran.jumlah) : 0;
  if (jumlah <= 0) return gagal('Jumlah pembayaran tidak valid.');
  if (!_bayarTanggalValid(teks(pembayaran.tanggal))) return gagal('Tanggal pembayaran tidak valid.');
  const akunKas = teks(pembayaran.akunKas), akunUtang = teks(bill.akunUtang);
  if (!akunKas) return gagal('Akun kas/bank pembayaran kosong.');
  if (!akunUtang) return gagal('Tagihan ini tidak punya akun utang usaha.');
  if (akunKas === akunUtang) return gagal('Akun kas/bank dan akun utang tidak boleh sama.');
  const no = teks(bill.noBill) || teks(pembayaran.noDok), supplier = teks(bill.supplier);
  return { ok: true, jurnal: {
    tanggal: pembayaran.tanggal, jenis: (typeof JENIS_JURNAL !== 'undefined' && JENIS_JURNAL.BILL) || 'Tagihan Pembelian',
    keterangan: 'Pembayaran Tagihan ' + no + ' — ' + supplier, ref: no,
    lines: [
      { akun: akunUtang, ket: 'Pembayaran utang ' + no, debit: jumlah, kredit: 0 },
      { akun: akunKas, ket: 'Pengeluaran pembayaran ' + no, debit: 0, kredit: jumlah }
    ]
  }};
}

function jurnalPembayaranBillStatus(pembayaran, bill, daftarJurnal, daftarPembayaran) {
  if (!pembayaran || pembayaran.jenis !== 'bill' || !bill) return { status: 'belum', jurnal: null };
  const jenis = (typeof JENIS_JURNAL !== 'undefined' && JENIS_JURNAL.BILL) || 'Tagihan Pembelian';
  const js = (Array.isArray(daftarJurnal) ? daftarJurnal : []).filter(j => j && j.jenis === jenis);
  const ketAwal = 'Pembayaran Tagihan ' + String(bill.noBill || pembayaran.noDok || '').trim() + ' — ' + String(bill.supplier || '').trim();
  const pembalikDari = j => j.reversalOf ? String(j.reversalOf) : ((/^\[Pembalik ([^\]]+)\]/.exec(String(j.ket || j.keterangan || '')) || [])[1] || '');
  const asal = js.filter(j => !pembalikDari(j));
  const dibalik = j => js.some(x => pembalikDari(x) === j.no);
  const jumlah = _bayarBulat(Number(pembayaran.jumlah) || 0);
  const cocokIsi = j => String(j.tanggal || '').slice(0,10) === pembayaran.tanggal && (j.lines || []).some(l => l && l.akun === pembayaran.akunKas && _bayarBulat(l.kredit || 0) === jumlah);
  let jurnal = pembayaran.jurnalNo ? asal.find(j => j.no === pembayaran.jurnalNo && String(j.ket || j.keterangan || '').startsWith(ketAwal)) : null;
  if (!jurnal) {
    const dipakai = new Set((Array.isArray(daftarPembayaran) ? daftarPembayaran : []).filter(x => x && x !== pembayaran && x.id !== pembayaran.id && x.jurnalNo).map(x => x.jurnalNo));
    const temuan = asal.filter(j => String(j.ket || j.keterangan || '').startsWith(ketAwal) && cocokIsi(j) && !dipakai.has(j.no));
    jurnal = temuan.find(j => !dibalik(j)) || temuan[0] || null;
  }
  return jurnal ? { status: dibalik(jurnal) ? 'dibalik' : 'aktif', jurnal } : { status: 'belum', jurnal: null };
}

// ── Task 5.3b: hapus pembayaran invoice ────────────────────

// Susun penghapusan satu pembayaran invoice (murni: tidak mengubah dok, daftar, maupun jurnal).
// id           : id record pembayaran
// dok          : invoice pemilik pembayaran (null/undefined = invoice sudah dihapus: record yatim, hanya dibuang)
// daftar       : pembayaranList; daftarJurnal: jurnalEntries (untuk status jurnal pembayaran itu)
// Hasil { ok:true, pembayaran, daftarBaru, dibayarLama, sisaBaru, statusBaru, jurnalStatus, jurnal } atau { ok:false, pesan }.
//   jurnalStatus 'aktif'  : jurnal pembayaran masih berlaku, pemanggil wajib membaliknya (jurnal pembalik) sebelum menerapkan.
//   jurnalStatus 'belum'  : record 5.2 tanpa jurnal; 'dibalik': jurnalnya sudah dibalik manual. Keduanya cukup dibuang recordnya.
//   dibayarLama dihitung dari daftar SEBELUM record dibuang (dibayarLamaTurunan), jadi pelunasan lewat alur lama tidak hilang.
//   statusBaru: diturunkan dari statusDariPembayaran (5.4): 'lunas' -> 'terkirim'/'sebagian', atau status asal bila tidak berubah.
function susunHapusPembayaran(id, dok, daftar, daftarJurnal) {
  const gagal = pesan => ({ ok: false, pesan });
  const semua = Array.isArray(daftar) ? daftar : [];
  const p = semua.find(x => x && typeof x === 'object' && String(x.id) === String(id));
  if (!p) return gagal('Pembayaran tidak ditemukan.');
  if (!PEMBAYARAN_JENIS.includes(p.jenis)) return gagal('Jenis pembayaran tidak dikenal.');
  const jenis = p.jenis;
  const daftarBaru = semua.filter(x => x !== p);
  if (!dok || typeof dok !== 'object' || String(dok.id) !== String(p.dokId)) {
    return { ok: true, pembayaran: p, daftarBaru, dibayarLama: 0, sisaBaru: 0, statusBaru: undefined, jurnalStatus: 'belum', jurnal: null, yatim: true };
  }
  const dibayarLama = dibayarLamaTurunan(dok, semua, jenis);
  const sisaBaru = sisaTagihan(Object.assign({}, dok, { dibayarLama }), daftarBaru, jenis);
  const dokBaru = Object.assign({}, dok, { dibayarLama, sisaTagihan: sisaBaru });
  const statusBaru = statusDariPembayaran(dokBaru, daftarBaru, jenis);
  const st = jenis === 'bill' ? jurnalPembayaranBillStatus(p, dok, daftarJurnal, semua) : jurnalPembayaranStatus(p, dok, daftarJurnal, semua);
  return { ok: true, pembayaran: p, daftarBaru, dibayarLama, sisaBaru, statusBaru, jurnalStatus: st.status, jurnal: st.jurnal, yatim: false };
}

// Terapkan hasil susunHapusPembayaran yang ok ke state: buang record, isi ulang dibayarLama/sisaTagihan/status invoice, simpan.
function terapkanHapusPembayaran(dok, hasil) {
  if (!hasil || !hasil.ok) return Promise.resolve(false);
  pembayaranList = hasil.daftarBaru;
  if (dok && !hasil.yatim) {
    if (hasil.dibayarLama > 0) dok.dibayarLama = hasil.dibayarLama;
    dok.sisaTagihan = hasil.sisaBaru;
    if (hasil.statusBaru) dok.status = hasil.statusBaru;
  }
  return simpanPembayaranState(hasil.pembayaran.jenis);
}
