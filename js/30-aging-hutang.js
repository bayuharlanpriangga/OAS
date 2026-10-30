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

// Pembelian kredit lama yang hanya ada sebagai jurnal (jenis 'Pembelian', kredit akun Utang 21xx) dan belum punya
// record bill (task 4.7). Jurnal yang sudah punya record bill, APA PUN statusnya (termasuk lunas/sebagian), tidak
// ikut: kalau tidak, pembelian kredit yang sudah dibayar muncul lagi sebagai utang penuh (temuan 6.2).
// Murni. Mengembalikan array record seperti bill { id, noBill, supplier, tanggal, jatuhTempo, total, sisaTagihan, status, jurnalNo }.
function pembelianKreditTanpaBill(daftarBill, daftarJurnal) {
  const bills = (Array.isArray(daftarBill) ? daftarBill : []).filter(b => b && typeof b === 'object');
  const jurnal = Array.isArray(daftarJurnal) ? daftarJurnal : [];
  const noBillSet = new Set();
  bills.forEach(b => {
    if (b.noBill) noBillSet.add(String(b.noBill).toLowerCase());
    if (b.jurnalNo) noBillSet.add(String(b.jurnalNo).toLowerCase());
  });
  const extraKredit = [];
  jurnal.forEach(j => {
    if (!j || j.jenis !== 'Pembelian') return;
    if (typeof isJurnalPembalik === 'function' && isJurnalPembalik(j)) return;
    if (typeof isJurnalDibalik === 'function' && isJurnalDibalik(j, jurnal)) return;
    if (j.no && noBillSet.has(j.no.toLowerCase())) return;
    if (j.ref && noBillSet.has(j.ref.toLowerCase())) return;

    const lines = Array.isArray(j.lines) ? j.lines : [];
    const utangLine = lines.find(l => l && l.kredit > 0 && String(l.akun).startsWith('21'));
    if (!utangLine) return;

    let sup = 'Supplier Umum';
    if (j.kontakId && typeof kontakList !== 'undefined' && Array.isArray(kontakList)) {
      const k = kontakList.find(x => x && x.id === j.kontakId);
      if (k && k.nama) sup = k.nama;
    }
    if (sup === 'Supplier Umum' && j.ket) {
      const parts = j.ket.split('—');
      if (parts.length > 1 && parts[1].trim()) sup = parts[1].trim();
    }

    extraKredit.push({
      id: 'jrn_kredit_' + (j._id || j.no),
      noBill: j.ref || j.no,
      supplier: sup,
      tanggal: j.tanggal,
      jatuhTempo: j.tanggal,
      total: utangLine.kredit,
      sisaTagihan: utangLine.kredit,
      status: 'diterima',
      jurnalNo: j.no
    });
  });

  return extraKredit;
}

// Bill yang dihitung sebagai utang: status `diterima` atau `sebagian` (task 5.4) dan jurnal tidak berstatus 'dibalik'.
// Bill `diterima` yang belum dijurnal ('belum') tetap dihitung: tagihannya sah dan masih harus dibayar,
// dan tombol Buat Jurnal di Tagihan Pembelian yang akan melengkapi jurnalnya.
// Bill yang jurnalnya sudah dibalik manual dari Jurnal Umum ('dibalik') tidak lagi menjadi utang,
// jadi tidak ikut (konsisten dengan hapusBill dan jurnalPembelianAktif).
// daftarBill/daftarJurnal bukan array -> []. Mengembalikan array record bill asli (tidak disalin).
function billUntukAging(daftarBill, daftarJurnal) {
  const bills = (Array.isArray(daftarBill) ? daftarBill : []).filter(b => b && typeof b === 'object');
  const jurnal = Array.isArray(daftarJurnal) ? daftarJurnal : [];
  const aktifBills = bills.filter(b => (b.status === 'diterima' || b.status === 'sebagian') && jurnalBillStatus(b, jurnal, bills).status !== 'dibalik');

  const extraKredit = pembelianKreditTanpaBill(bills, jurnal);
  return extraKredit.length ? aktifBills.concat(extraKredit) : aktifBills;
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
