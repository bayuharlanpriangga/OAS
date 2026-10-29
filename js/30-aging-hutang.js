// ═══════════════════════════════════════════════════════════
// UMUR HUTANG — utang usaha belum lunas per supplier (task 4.7).
//
// Memakai hitungAging (24-aging.js, task 2.1) dan penyusun tampilan di 25-aging-ui.js dengan jenis 'hutang',
// jadi bucket, perhitungan umur, tabel/kartu, CSV, dan cetak sama persis dengan Umur Piutang.
// Data: billList (28-bill.js). Yang masuk hanya bill berstatus `diterima` dengan sisaTagihan > 0
// dan jurnalnya belum dibalik (lihat billUntukAging). Draft dan lunas tidak dihitung (aturan hitungAging).
// billUntukAging murni dan diuji di tests/aging-hutang.test.js; render/ekspor/cetak menyentuh browser.
// Dipanggil dari showPage('umur-hutang') (04-navigasi-tema.js). Dimuat setelah 29-bill-ui.js.
// ═══════════════════════════════════════════════════════════

// Bill yang dihitung sebagai utang: status `diterima` dan jurnal tidak berstatus 'dibalik'.
// Bill `diterima` yang belum dijurnal ('belum') tetap dihitung: tagihannya sah dan masih harus dibayar,
// dan tombol Buat Jurnal di Tagihan Pembelian yang akan melengkapi jurnalnya.
// Bill yang jurnalnya sudah dibalik manual dari Jurnal Umum ('dibalik') tidak lagi menjadi utang,
// jadi tidak ikut (konsisten dengan hapusBill dan jurnalPembelianAktif).
// daftarBill/daftarJurnal bukan array -> []. Mengembalikan array record bill asli (tidak disalin).
function billUntukAging(daftarBill, daftarJurnal) {
  const bills = (Array.isArray(daftarBill) ? daftarBill : []).filter(b => b && typeof b === 'object');
  const jurnal = Array.isArray(daftarJurnal) ? daftarJurnal : [];
  return bills.filter(b => b.status === 'diterima' && jurnalBillStatus(b, jurnal, bills).status !== 'dibalik');
}

function _agingHutangHasil() {
  return _agingHasilSaatIni(billUntukAging(billList, jurnalEntries), 'aging-hutang-acuan');
}

const _AGING_HUTANG_P = 'h';

function renderAgingHutang() {
  const el = document.getElementById('aging-hutang-body'); if (!el) return;
  el.removeAttribute('style');
  Object.keys(_agingBuka).forEach(k => { if (k.charAt(0) === _AGING_HUTANG_P) delete _agingBuka[k]; });
  el.innerHTML = agingPiutangHtml(_agingHutangHasil(), 'hutang');
}

function exportAgingHutangCSV() {
  const hasil = _agingHutangHasil();
  if (!hasil.perKontak.length) { showAlert('Tidak ada utang belum lunas untuk diekspor.'); return; }
  const blob = new Blob(['﻿' + agingCsv(hasil, 'hutang')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'umur-hutang-' + hasil.tanggalAcuan + '.csv';
  a.click(); URL.revokeObjectURL(url);
  if (typeof auditLog === 'function') auditLog('export', 'system', 'Export umur hutang CSV — ' + hasil.perKontak.length + ' supplier');
}

function cetakAgingHutang() {
  const hasil = _agingHutangHasil();
  if (!hasil.perKontak.length) { showAlert('Tidak ada utang belum lunas untuk dicetak.'); return; }
  const profil = JSON.parse(localStorage.getItem('oas_profil') || localStorage.getItem('oas_profil_v1') || '{}');
  const nama = profil.nama || (typeof currentCompany !== 'undefined' && currentCompany && currentCompany.name) || 'Perusahaan';
  const win = window.open('', '_blank');
  if (!win) { showAlert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.'); return; }
  win.document.write(agingCetakHtml(hasil, nama, 'hutang')); win.document.close();
  setTimeout(() => win.print(), 500);
}
