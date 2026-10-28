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

// ── Fungsi murni ───────────────────────────────────────────

// Hitung subtotal, PPN, dan total bill dari daftar item. Memakai hitungPpn (02-utils.js).
// items     : [{ qty, harga }]; nilai bukan angka / negatif dianggap 0
// ppnAktif  : true bila bill memakai PPN Masukan
// tarifPct  : tarif PPN dalam persen (mis. 11); kosong = tarif standar
// Mengembalikan { subtotal, ppn, total }.
function hitungTotalBill(items, ppnAktif, tarifPct) {
  const angka = v => (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;
  const subtotal = (Array.isArray(items) ? items : []).reduce((s, it) => s + angka(it && it.qty) * angka(it && it.harga), 0);
  const ppn = ppnAktif ? hitungPpn(subtotal, tarifPct) : 0;
  return { subtotal, ppn, total: subtotal + ppn };
}

// Nomor bill berikutnya (BILL-<tahun>-<urut>). Counter bill menyusul di task 4.4.
function nomorBillBerikut(tahun) {
  const y = Number.isInteger(tahun) ? tahun : new Date().getFullYear();
  return nomorBerikut('BILL', y, billList.map(b => b && b.noBill), []);
}
