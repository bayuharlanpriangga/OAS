// ═══════════════════════════════════════════════════════════
// PEMBAYARAN — model data dan fungsi murni sisa tagihan (task 5.1, Roadmap.md)
//
// Satu record = satu pembayaran atas satu dokumen (invoice atau bill). Bentuk record: docs/SCHEMA.md §4.5c.
// State pembayaranList disinkron lewat cloud-records (kind `pembayaran`, 22-cloud-records.js).
// Task 5.1 hanya model, state, dan fungsi hitung. Belum ada form, simpan, jurnal, atau perubahan
// pada invoice/bill (form + simpan: 5.2; jurnal invoice: 5.3; status: 5.4; bill: 5.5).
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
// Fungsi di sini tidak menyentuh DOM, localStorage, atau state dokumen. Diuji di tests/pembayaran.test.js.
// Dimuat setelah 30-aging-hutang.js.
// ═══════════════════════════════════════════════════════════

const PEMBAYARAN_JENIS = ['invoice', 'bill'];

// State. Bisnis login: dimuat/disimpan lewat cloud-records. Penyimpanan mode tamu ditentukan di 5.2.
let pembayaranList = [];

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
