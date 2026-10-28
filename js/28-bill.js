// ═══════════════════════════════════════════════════════════
// TAGIHAN PEMBELIAN (BILL) — state dan model data (task 4.1, Roadmap.md)
//
// Bill = tagihan dari supplier yang belum dibayar (padanan invoice di sisi pembelian).
// Bentuk record: lihat docs/SCHEMA.md §4.5b.
//
// State billList. Bisnis login: dimuat/disimpan lewat cloud-records (kind `bill`,
// 22-cloud-records.js). Mode tamu: key localStorage `oas_bill` (mulai dipakai di 4.4).
// Modul ini sengaja baru berisi state; halaman, form, simpan, dan jurnal menyusul di 4.2-4.6.
// ═══════════════════════════════════════════════════════════
let billList = (() => {
  try { const a = JSON.parse(localStorage.getItem('oas_bill') || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
})();
