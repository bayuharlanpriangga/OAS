// ═══════════════════════════════════════════════════════════
// FORM BAYAR INVOICE (task 5.2, Roadmap.md)
//
// Modal `#modal-bayar-inv`: tanggal, jumlah (boleh sebagian), akun kas/bank, metode, catatan, dan riwayat
// pembayaran invoice itu. Validasi dan penyusunan record ada di susunPembayaran (31-pembayaran.js, murni);
// file ini hanya membaca form, memanggilnya, lalu mencatat hasilnya lewat catatPembayaran.
// BELUM ADA JURNAL: record disimpan tanpa jurnalNo dan akun Kas/Piutang di buku besar belum berubah.
// Pembuatan jurnal (dan penyatuan dengan tombol lama "Lunas") dikerjakan di 5.3; pembayaran yang belum
// punya jurnalNo ditandai di riwayat supaya 5.3 bisa menjurnalkannya.
// Dimuat setelah 31-pembayaran.js.
// ═══════════════════════════════════════════════════════════

let _bayarInvId = null;

function _bayarSet(id, v) { const el = document.getElementById(id); if (el) el.value = v; }

// Baris ringkasan (total, sudah dibayar, sisa) dan riwayat pembayaran satu invoice, sebagai HTML.
function _bayarInvRingkasHtml(inv) {
  const lama = dibayarLamaTurunan(inv, pembayaranList, 'invoice');
  const sisa = sisaTagihan(Object.assign({}, inv, { dibayarLama: lama }), pembayaranList, 'invoice');
  const baris = (l, v, clr) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:4px;"><span style="color:var(--muted);">${l}</span><span style="font-family:var(--mono);${clr ? 'color:' + clr + ';' : ''}font-weight:600;">${v}</span></div>`;
  const riwayat = pembayaranDokumen(pembayaranList, 'invoice', inv.id).slice().sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
  const itemRiwayat = (t, j, ket) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;padding:4px 0;border-top:1px solid var(--border);"><span>${escapeHtml(t)}${ket ? ` <span style="color:var(--accent3);">· ${escapeHtml(ket)}</span>` : ''}</span><span style="font-family:var(--mono);">${rp(j)}</span></div>`;
  let rw = '';
  if (lama > 0) rw += itemRiwayat('Dibayar sebelumnya (tanpa rincian)', lama, '');
  riwayat.forEach(p => { rw += itemRiwayat(p.tanggal + (p.metode ? ' · ' + p.metode : ''), p.jumlah, p.jurnalNo ? '' : 'belum dijurnal'); });
  return baris('Total invoice', rp(inv.total)) + baris('Sudah dibayar', rp(Math.max(0, inv.total - sisa)), 'var(--accent)') + baris('Sisa tagihan', rp(sisa), 'var(--accent3)')
    + (rw ? `<div style="margin-top:10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;">Riwayat pembayaran</div>${rw}` : '');
}

function openModalBayarInvoice(id) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const inv = invoiceList.find(i => i && i.id === id); if (!inv) return;
  // Pemeriksaan status dan sisa dipakai bersama dengan simpan (susunPembayaran), jadi cukup dites tanpa jumlah di sini.
  if (inv.status !== 'terkirim') { showAlert(inv.status === 'lunas' ? 'Invoice ini sudah lunas.' : 'Invoice draft belum bisa dibayar. Kirim dulu invoicenya.'); return; }
  _bayarInvId = inv.id;
  const lama = dibayarLamaTurunan(inv, pembayaranList, 'invoice');
  const sisa = sisaTagihan(Object.assign({}, inv, { dibayarLama: lama }), pembayaranList, 'invoice');
  const judul = document.getElementById('bayar-inv-judul'); if (judul) judul.textContent = 'Bayar Invoice ' + inv.noInvoice;
  const ringkas = document.getElementById('bayar-inv-ringkas'); if (ringkas) ringkas.innerHTML = _bayarInvRingkasHtml(inv);
  const tgl = new Date().toISOString().split('T')[0];
  _bayarSet('bayar-inv-tgl', (inv.tanggal && tgl < inv.tanggal) ? inv.tanggal : tgl);
  _bayarSet('bayar-inv-jumlah', sisa);
  _bayarSet('bayar-inv-metode', '');
  _bayarSet('bayar-inv-catatan', '');
  const kas = akuns.find(a => a.kode === '1101') || akuns.find(a => a.tipe === 'Aset');
  _bayarSet('bayar-inv-akun', kas ? kas.kode : '');
  const btn = document.getElementById('bayar-inv-akun-btn');
  if (btn) {
    if (kas) { btn.innerHTML = `<span class="picker-kode-badge">${escapeHtml(kas.kode)}</span> ${escapeHtml(kas.nama)}`; btn.classList.add('has-value'); }
    else { btn.textContent = 'Pilih Akun...'; btn.classList.remove('has-value'); }
  }
  openModal('modal-bayar-inv');
  setTimeout(upgradeFormPickers, 80);
}

function simpanPembayaranInvoice() {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const inv = invoiceList.find(i => i && i.id === _bayarInvId);
  if (!inv) { showAlert('Invoice tidak ditemukan. Tutup form lalu coba lagi.'); return; }
  const v = id => (document.getElementById(id) || {}).value || '';
  // Id unik walau dua pembayaran tercatat dalam milidetik yang sama.
  let idBaru = 'PAY_' + Date.now(), n = 1;
  while (pembayaranList.some(p => p && p.id === idBaru)) idBaru = 'PAY_' + Date.now() + '_' + (n++);
  const hasil = susunPembayaran({
    id: idBaru, createdAt: new Date().toISOString(),
    tanggal: v('bayar-inv-tgl'), jumlah: parseFloat(v('bayar-inv-jumlah')), akunKas: v('bayar-inv-akun'),
    metode: v('bayar-inv-metode'), catatan: v('bayar-inv-catatan')
  }, inv, pembayaranList, 'invoice');
  if (!hasil.ok) { showAlert(hasil.pesan); return; }
  catatPembayaran(inv, hasil);
  _bayarInvId = null; // proses sinkron: klik ganda berikutnya tidak menemukan invoice, jadi tidak mencatat dua kali
  closeModal('modal-bayar-inv');
  renderInvoiceList(); renderInvoiceKPI();
  showAlert(`✓ Pembayaran ${rp(hasil.pembayaran.jumlah)} untuk ${escapeHtml(inv.noInvoice)} dicatat. ${hasil.lunas ? 'Invoice LUNAS.' : 'Sisa tagihan ' + rp(hasil.sisaBaru) + '.'}<br><span style="font-size:12px;">Jurnal kas/piutang belum dibuat (menyusul di pembaruan berikutnya).</span>`);
  if (typeof cekNotifikasi === 'function') cekNotifikasi();
}
