// ═══════════════════════════════════════════════════════════
// PENOMORAN — pembuat nomor dokumen berurutan per jenis dan per tahun.
//
// Format: <JENIS>-<TAHUN>-<URUTAN min. 3 digit>, contoh INV-2026-001.
// Urutan diambil dari nomor TERBESAR yang pernah dipakai, bukan dari jumlah
// dokumen (length+1). Dua pengaman:
//  1. Nomor terbesar di daftar dokumen yang ada, jadi menghapus dokumen di
//     tengah tidak membuat nomor berikutnya bentrok.
//  2. "Counter" per jenis+tahun (kind `counter` di company_records) yang mencatat
//     nomor tertinggi yang pernah disimpan, jadi menghapus dokumen TERAKHIR
//     tidak membuat nomornya dipakai lagi. Counter hanya naik, tidak pernah turun.
//
// Bagian 1 = fungsi murni (tanpa state/DOM/localStorage), diuji di
// tests/penomoran.test.js. Bagian 2 = pembungkus ke state aplikasi (invoice).
// Counter dinaikkan saat dokumen DISIMPAN, bukan saat form dibuka, supaya form
// yang dibatalkan tidak membuang nomor.
// Dimuat setelah 22-cloud-records.js.
// ═══════════════════════════════════════════════════════════

// ── 1. Fungsi murni ────────────────────────────────────────

// 'inv-2026-007' -> { jenis:'INV', tahun:2026, urut:7 }. Selain format itu -> null.
function parseNomor(no) {
  const m = typeof no === 'string' && no.trim().toUpperCase().match(/^([A-Z0-9]+)-(\d{4})-(\d{1,9})$/);
  return m ? { jenis: m[1], tahun: parseInt(m[2], 10), urut: parseInt(m[3], 10) } : null;
}

// jenis        : awalan dokumen, huruf/angka saja, mis. 'INV', 'BILL', 'PO'
// tahun        : bilangan bulat 4 digit (mis. 2026)
// daftarNomor  : array nomor yang sudah ada (string). Nomor jenis/tahun lain atau format
//                lama diabaikan. null/undefined = kosong.
// counterList  : (opsional) array record counter { id:'INV-2026', terakhir:N }. Dipakai
//                sebagai batas bawah: hasil tidak pernah <= counter.terakhir.
// Mengembalikan string nomor berikutnya. Melempar TypeError kalau jenis/tahun tidak valid.
function nomorBerikut(jenis, tahun, daftarNomor, counterList) {
  if (typeof jenis !== 'string' || !/^[A-Za-z0-9]+$/.test(jenis)) {
    throw new TypeError('nomorBerikut: jenis harus berupa huruf/angka tanpa spasi atau tanda hubung');
  }
  if (!Number.isInteger(tahun) || tahun < 1000 || tahun > 9999) {
    throw new TypeError('nomorBerikut: tahun harus bilangan bulat 4 digit');
  }
  const J = jenis.toUpperCase();
  let maks = 0;
  (Array.isArray(daftarNomor) ? daftarNomor : []).forEach(no => {
    const p = parseNomor(no);
    if (p && p.jenis === J && p.tahun === tahun && p.urut > maks) maks = p.urut;
  });
  const id = J + '-' + tahun;
  (Array.isArray(counterList) ? counterList : []).forEach(r => {
    if (r && r.id === id && Number.isInteger(r.terakhir) && r.terakhir > maks) maks = r.terakhir;
  });
  return id + '-' + String(maks + 1).padStart(3, '0');
}

// Counter setelah `nomor` dipakai. Murni: tidak mengubah counterList.
// Mengembalikan counterList YANG SAMA (referensi sama) bila tidak ada yang perlu naik
// (nomor tidak berformat, atau counter sudah >= urutannya); selain itu array baru.
function counterSetelahPakai(counterList, nomor) {
  const p = parseNomor(nomor);
  if (!p) return counterList;
  const list = Array.isArray(counterList) ? counterList : [];
  const id = p.jenis + '-' + p.tahun;
  const i = list.findIndex(r => r && r.id === id);
  if (i >= 0 && Number.isInteger(list[i].terakhir) && list[i].terakhir >= p.urut) return counterList;
  const rec = { id, jenis: p.jenis, tahun: p.tahun, terakhir: p.urut };
  const hasil = list.slice();
  if (i >= 0) hasil[i] = rec; else hasil.push(rec);
  return hasil;
}

// ── 2. Pemasangan ke state aplikasi ────────────────────────

// State counter. Bisnis login: dimuat/disimpan lewat cloud-records (kind `counter`).
// Mode tamu: key localStorage `oas_counter`.
let counterList = (() => {
  try { const a = JSON.parse(localStorage.getItem('oas_counter') || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
})();

// Nomor invoice berikutnya untuk tahun tertentu (default: tahun ini).
function nomorInvoiceBerikut(tahun) {
  const y = Number.isInteger(tahun) ? tahun : new Date().getFullYear();
  return nomorBerikut('INV', y, invoiceList.map(i => i && i.noInvoice), counterList);
}

// Panggil SETELAH invoice disimpan. Menaikkan counter bila nomornya lebih tinggi.
// Nomor yang diketik manual dengan format lain diabaikan. Mengembalikan true bila counter naik.
function catatNomorInvoice(nomor) {
  const baru = counterSetelahPakai(counterList, nomor);
  if (baru === counterList) return false;
  counterList = baru;
  if (typeof currentCompany !== 'undefined' && currentCompany && typeof cloudSyncRecords === 'function') {
    cloudSyncRecords(['counter']);
  } else {
    try { localStorage.setItem('oas_counter', JSON.stringify(counterList)); } catch (e) {}
  }
  return true;
}
