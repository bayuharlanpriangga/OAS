// ═══════════════════════════════════════════════════════════
// PEMBAYARAN — model data dan fungsi murni sisa tagihan (task 5.1, Roadmap.md)
//
// Satu record = satu pembayaran atas satu dokumen (invoice atau bill). Bentuk record: docs/SCHEMA.md §4.5c.
// State pembayaranList disinkron lewat cloud-records (kind `pembayaran`, 22-cloud-records.js).
// Task 5.1: model, state, dan fungsi hitung. Task 5.2: validasi + penyusun record (susunPembayaran), pencatatan
// ke invoice (catatPembayaran), dan penyimpan (simpanPembayaranState); form-nya ada di 32-pembayaran-ui.js.
// Belum ada jurnal (invoice: 5.3), status turunan (5.4), atau pembayaran bill (5.5).
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
  if (!PEMBAYARAN_STATUS_BOLEH[jenis].includes(dok.status)) {
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

// Pasang hasil susunPembayaran yang ok ke state: tambah record (terbaru di atas), isi ulang dibayarLama dan
// sisaTagihan dokumen dari hasil hitung, lalu simpan. Dokumen yang lunas (sisa 0) berstatus 'lunas', sama seperti
// alur lama; status turunan selengkapnya (belum/sebagian/jatuh tempo) dikerjakan di 5.4.
// Tanpa jurnal: record belum punya jurnalNo (diisi 5.3 untuk invoice, 5.5 untuk bill).
function catatPembayaran(dok, hasil) {
  if (!dok || !hasil || !hasil.ok) return Promise.resolve(false);
  pembayaranList.unshift(hasil.pembayaran);
  if (hasil.dibayarLama > 0) dok.dibayarLama = hasil.dibayarLama;
  dok.sisaTagihan = hasil.sisaBaru;
  if (hasil.lunas) dok.status = 'lunas';
  return simpanPembayaranState(hasil.pembayaran.jenis);
}
