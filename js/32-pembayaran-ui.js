// ═══════════════════════════════════════════════════════════
// FORM BAYAR INVOICE (task 5.2, Roadmap.md)
//
// Modal `#modal-bayar-inv`: tanggal, jumlah (boleh sebagian), akun kas/bank, metode, catatan, dan riwayat
// pembayaran invoice itu. Validasi dan penyusunan record ada di susunPembayaran (31-pembayaran.js, murni);
// file ini hanya membaca form, memanggilnya, lalu mencatat hasilnya lewat catatPembayaran.
// Task 5.3: tiap pembayaran dijurnal (Dr Kas/Bank, Cr Piutang) lewat postJurnalLegacy (kunci periode, nomor JRN, sync
// cloud, audit log), sama seperti jurnal bill (29-bill-ui.js). Jurnal dibuat LEBIH DULU; bila gagal (mis. periode
// terkunci) pembayaran tidak dicatat, jadi tidak ada pembayaran baru tanpa jurnal. Nomor jurnal disimpan di
// pembayaran.jurnalNo. Record lama dari 5.2 (tanpa jurnalNo) dijurnalkan lewat jurnalkanPembayaranInvoiceLama
// (tombol di banner halaman Invoice). Tombol lama "Lunas" kini membuka form yang sama (11-kontak-invoice.js).
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
  // Jurnal dulu (5.3): gagal = tidak ada yang dicatat. Hasilnya mengisi hasil.pembayaran.jurnalNo sebelum disimpan.
  const pj = postingJurnalPembayaranInvoice(hasil.pembayaran, inv, { baru: true });
  if (!pj.ok) { if (pj.pesan) _bayarPeringatan(pj.pesan); return; }
  catatPembayaran(inv, hasil);
  _bayarInvId = null; // proses sinkron: klik ganda berikutnya tidak menemukan invoice, jadi tidak mencatat dua kali
  closeModal('modal-bayar-inv');
  renderInvoiceList(); renderInvoiceKPI();
  try { if (typeof auditLog === 'function') auditLog('create', 'invoice', `Pembayaran invoice ${inv.noInvoice} — ${rp(hasil.pembayaran.jumlah)}${hasil.lunas ? ' (lunas)' : ''}`, { ref: inv.noInvoice }); } catch (e) {}
  showAlert(`✓ Pembayaran ${rp(hasil.pembayaran.jumlah)} untuk ${escapeHtml(inv.noInvoice)} dicatat. ${hasil.lunas ? 'Invoice LUNAS.' : 'Sisa tagihan ' + rp(hasil.sisaBaru) + '.'}<br><span style="font-size:12px;color:var(--muted);">Jurnal ${escapeHtml(pj.jurnalNo)} dibuat (Kas bertambah, Piutang berkurang).</span>`);
  if (typeof cekNotifikasi === 'function') cekNotifikasi();
}

function _bayarPeringatan(pesan) {
  showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ' + escapeHtml(pesan));
}

// Posting jurnal satu pembayaran invoice (efek samping). pembayaran.jurnalNo diisi bila berhasil.
// opsi.baru = true: pembayaran baru disusun, jadi tidak perlu mencari jurnal lama yang cocok.
// opsi.tanpaGuard = true: pemanggil sudah memastikan periode tidak terkunci (jurnalkan massal), jadi tidak ada alert.
// Mengembalikan { ok:true, jurnalNo, sudahAda? } atau { ok:false, pesan? } (tanpa pesan = sudah ada alert, mis. periode terkunci).
function postingJurnalPembayaranInvoice(pembayaran, inv, opsi) {
  opsi = opsi || {};
  if (!opsi.baru) {
    const st = jurnalPembayaranStatus(pembayaran, inv, jurnalEntries, pembayaranList);
    if (st.status === 'aktif') { pembayaran.jurnalNo = st.jurnal.no; return { ok: true, jurnalNo: st.jurnal.no, sudahAda: true }; }
  }
  if (!opsi.tanpaGuard && !guardPeriode(pembayaran.tanggal, 'diposting')) return { ok: false };
  // Cadangan bila invoice tidak menyimpan akunPiutang: 1201, atau akun pertama yang namanya memuat "piutang".
  const daftarAkun = (typeof akuns !== 'undefined' && Array.isArray(akuns)) ? akuns : [];
  const piutang = daftarAkun.find(a => a && a.kode === '1201') || daftarAkun.find(a => a && String(a.nama || '').toLowerCase().includes('piutang')) || null;
  const r = buatJurnalPembayaranInvoice(pembayaran, inv, { akunPiutang: piutang ? piutang.kode : '' });
  if (!r.ok) return { ok: false, pesan: r.pesan };
  const entry = postJurnalLegacy(r.jurnal);
  if (!entry) return { ok: false };
  pembayaran.jurnalNo = entry.no;
  if (typeof saveToStorage === 'function') saveToStorage(false);
  return { ok: true, jurnalNo: entry.no };
}

// Jurnalkan semua pembayaran invoice yang belum pernah dijurnal (record dari 5.2). Yang jurnalnya sengaja dibalik tidak disentuh.
// Yang bertanggal di periode terkunci dilewati dan disebut di ringkasan (tanggal tidak diganti diam-diam).
function jurnalkanPembayaranInvoiceLama() {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const antre = pembayaranInvoiceBelumJurnal(pembayaranList, invoiceList, jurnalEntries);
  if (!antre.length) { showAlert('Semua pembayaran invoice sudah dijurnal.'); return; }
  const terkunci = x => typeof isPeriodeTerkunci === 'function' && isPeriodeTerkunci(x.pembayaran.tanggal);
  const bisa = antre.filter(x => !terkunci(x)), dilewati = antre.length - bisa.length;
  if (!bisa.length) { _bayarPeringatan(`${dilewati} pembayaran bertanggal di periode yang sudah dikunci${typeof periodeKunciSampai !== 'undefined' && periodeKunciSampai ? ' (sampai ' + periodeKunciSampai + ')' : ''}, jadi belum bisa dijurnal. Buka kunci periode di Settings > Transaksi > Kunci Periode, lalu coba lagi.`); return; }
  const total = bisa.reduce((s, x) => s + x.pembayaran.jumlah, 0);
  if (!confirm(`Buat jurnal untuk ${bisa.length} pembayaran invoice (total ${rp(total)})? Tiap jurnal bertanggal sama dengan tanggal pembayarannya: Kas/Bank di debit, Piutang di kredit.` + (dilewati ? `\n\n${dilewati} pembayaran di periode terkunci dilewati.` : ''))) return;
  let dibuat = 0, tertaut = 0; const gagal = [];
  bisa.forEach(x => {
    const r = postingJurnalPembayaranInvoice(x.pembayaran, x.invoice, { tanpaGuard: true });
    if (!r.ok) gagal.push(x.invoice.noInvoice + (r.pesan ? ' (' + r.pesan + ')' : ''));
    else if (r.sudahAda) tertaut++; else dibuat++;
  });
  simpanPembayaranState('invoice');
  renderInvoiceList();
  showAlert(`✓ ${dibuat} jurnal pembayaran dibuat` + (tertaut ? `, ${tertaut} ditautkan ke jurnal yang sudah ada` : '') + '.'
    + (dilewati ? `<br><span style="font-size:12px;">${dilewati} pembayaran di periode terkunci dilewati.</span>` : '')
    + (gagal.length ? `<br><span style="font-size:12px;">Gagal: ${escapeHtml(gagal.join('; '))}.</span>` : ''));
}

// Banner di halaman Invoice (#inv-belum-jurnal): muncul hanya bila ada pembayaran yang belum dijurnal.
function renderPembayaranBelumJurnal() {
  const el = document.getElementById('inv-belum-jurnal'); if (!el) return;
  const n = pembayaranInvoiceBelumJurnal(pembayaranList, invoiceList, jurnalEntries).length;
  el.innerHTML = n ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 14px;margin-bottom:16px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:10px;font-size:12px;color:var(--accent3);"><span><i class="ti ti-alert-triangle" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${n} pembayaran invoice belum dijurnal, jadi Kas dan Piutang di buku besar belum berubah.</span><button class="btn btn-ghost btn-sm" onclick="jurnalkanPembayaranInvoiceLama()">Buat Jurnal</button></div>` : '';
}
