// ═══════════════════════════════════════════════════════════
// PESANAN PENJUALAN — halaman + daftar + ubah status (task 7.3b, Roadmap.md)
//
// Halaman #page-pesanan-jual menampilkan dokumen jenis `pesanan_jual` (model 35-dok.js) yang dibuat dari penawaran
// disetujui (37-pesanan-jual.js). Dari daftar: Konfirmasi (draft → dikonfirmasi), Batal, dan hapus (hanya draft/batal).
// Status `sebagian` dan `selesai` TIDAK punya tombol manual: diisi otomatis oleh pembuatan faktur (7.5) dan qty terkirim (7.6).
// Pesanan belum bisa dibuat langsung (tanpa penawaran) dan belum bisa diedit. Tidak menjurnal, tidak menyentuh stok.
// Pola mengikuti daftar penawaran (36-penawaran-ui.js). Dimuat setelah 37-pesanan-jual.js.
//
// Fungsi murni (tanpa DOM/state), diuji di tests/pesanan-jual-ui.test.js:
//   aksiStatusPesanan(status)     tombol status yang tampil: [{ ke, label, konfirmasi }]
//   bolehHapusPesanan(pesanan)    { ok } atau { ok:false, pesan } — hanya draft atau batal
// ═══════════════════════════════════════════════════════════
const PESANAN_AKSI = { dikonfirmasi: 'Konfirmasi', batal: 'Batal' };
const PESANAN_WARNA = { draft: 'var(--muted)', dikonfirmasi: 'var(--accent2)', sebagian: 'var(--accent3)', selesai: 'var(--accent)', batal: 'var(--muted)' };

// Tujuan diambil dari alur DOK_JENIS lewat dokStatusBerikut; hanya yang punya tombol manual. Batal minta konfirmasi (final).
function aksiStatusPesanan(status) {
  return dokStatusBerikut('pesanan_jual', status).filter(ke => PESANAN_AKSI[ke])
    .map(ke => ({ ke, label: PESANAN_AKSI[ke], konfirmasi: ke === 'batal' }));
}

// Pesanan yang sudah dikonfirmasi/diproses harus dibatalkan dulu sebelum dihapus; yang selesai tidak bisa dihapus.
function bolehHapusPesanan(p) {
  if (!p || typeof p !== 'object') return { ok: false, pesan: 'Pesanan tidak ditemukan.' };
  if (p.status === 'draft' || p.status === 'batal') return { ok: true };
  return { ok: false, pesan: 'Pesanan ' + p.no + ' berstatus ' + p.status + ' dan tidak bisa dihapus. ' +
    (p.status === 'selesai' ? 'Pesanan selesai sudah final.' : 'Batalkan dulu bila memang tidak jadi.') };
}

function _psnAlertPeringatan(pesan) {
  showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ' + escapeHtml(pesan));
}

function renderPesananList() {
  const el = document.getElementById('pesanan-jual-body'); if (!el) return;
  const daftar = dokList.filter(d => d && d.jenis === 'pesanan_jual');
  if (!daftar.length) {
    el.style.cssText = 'padding:24px 16px;text-align:center;color:var(--muted);font-size:13px;';
    el.innerHTML = 'Belum ada pesanan penjualan. Buat dari penawaran yang sudah disetujui.';
    return;
  }
  el.style.cssText = '';
  el.innerHTML = `<div class="table-scroll"><table id="pesanan-jual-table">
    <thead><tr><th>No. Pesanan</th><th>Pelanggan</th><th>Tanggal</th><th>Dari Penawaran</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${daftar.map(d => {
      const s = d.status || 'draft';
      const w = PESANAN_WARNA[s] || 'var(--muted)';
      const tombol = aksiStatusPesanan(s).map(a =>
        `<button class="btn btn-sm${a.ke === 'dikonfirmasi' ? ' btn-primary' : ''}" style="margin-right:4px;" onclick="ubahStatusPesanan('${escapeForJsAttr(d.id)}','${a.ke}')">${a.label}</button>`).join('');
      return `<tr>
        <td style="font-family:var(--mono);font-size:12px;font-weight:600">${escapeHtml(d.no)}</td>
        <td>${escapeHtml(d.kontak)}</td>
        <td style="font-size:12px">${escapeHtml(d.tanggal)}</td>
        <td style="font-family:var(--mono);font-size:12px">${escapeHtml(d.refNo || '-')}</td>
        <td class="debit" style="font-family:var(--mono)">${rp(hitungTotalDok(d).total)}</td>
        <td><span style="background:${w}22;color:${w};padding:2px 8px;border-radius:6px;font-size:11px;">${escapeHtml(s.charAt(0).toUpperCase() + s.slice(1))}</span></td>
        <td style="white-space:nowrap;">${tombol}<button class="btn btn-danger btn-sm" title="Hapus" onclick="hapusPesanan('${escapeForJsAttr(d.id)}')"><i class="ti ti-trash" style="font-size:14px;"></i></button></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

// Ubah status lewat transisiDok (alur tidak bisa dilompati). Gagal = tidak ada yang berubah.
function ubahStatusPesanan(id, statusBaru) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pesanan Penjualan')) return;
  const d = dokList.find(x => x && x.id === id && x.jenis === 'pesanan_jual'); if (!d) return;
  const aksi = aksiStatusPesanan(d.status).find(a => a.ke === statusBaru);
  if (!aksi) { _psnAlertPeringatan('Pesanan ' + d.no + ' berstatus ' + d.status + ' tidak bisa diubah menjadi ' + statusBaru + '.'); return; }
  if (aksi.konfirmasi && !confirm(aksi.label + ' pesanan ' + d.no + ' (' + d.kontak + ')? Status ' + statusBaru + ' tidak bisa diubah lagi.')) return;
  const r = transisiDok(d, statusBaru, { waktu: new Date().toISOString() });
  if (!r.ok) { _psnAlertPeringatan(r.pesan); return; }
  perbaruiDok(r.dok);
  renderPesananList();
  showAlert('✓ Pesanan ' + escapeHtml(d.no) + ' kini berstatus ' + escapeHtml(statusBaru) + '.');
}

function hapusPesanan(id) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pesanan Penjualan')) return;
  const d = dokList.find(x => x && x.id === id && x.jenis === 'pesanan_jual'); if (!d) return;
  const b = bolehHapusPesanan(d);
  if (!b.ok) { _psnAlertPeringatan(b.pesan); return; }
  if (!confirm('Hapus pesanan ' + d.no + ' (' + d.kontak + ')?')) return;
  hapusDokById(id);
  renderPesananList();
  if (typeof renderPenawaranList === 'function') renderPenawaranList();
  showAlert('✓ Pesanan dihapus');
}
