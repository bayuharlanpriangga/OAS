// ═══════════════════════════════════════════════════════════
// PENAWARAN — form input (task 7.1) dan simpan + daftar (task 7.2, Roadmap.md)
//
// Form di #modal-penawaran (jenis dokumen `penawaran` dari model 35-dok.js): nomor, tanggal, pelanggan, item
// (nama, qty, satuan, harga), catatan, dan total langsung. Simpan (7.2): isi form disusun lewat susunDok, penawaran
// baru berstatus draft masuk dokList lewat tambahDok (35-dok.js: cloud untuk bisnis login, localStorage untuk mode tamu),
// daftar di #penawaran-body, hapus lewat hapusPenawaran. Belum ada jurnal (penawaran memang tidak menjurnal), belum ada
// ubah status dan belum ada edit draft.
// Pola mengikuti form bill (29-bill-ui.js). Dimuat setelah 35-dok.js.
//
// Field PPN dan masa berlaku adalah field opsional model dok (ppnTarif, berlakuSampai; ditambahkan di 7.1).
// Fungsi murni (tanpa DOM/state), diuji di tests/penawaran-ui.test.js:
//   berlakuDefaultPenawaran(tanggal)                    tanggal + 14 hari
//   nomorPenawaranBerikut(tahun, daftar, counterList)   nomor QUO-<tahun>-NNN dari model dok
//   formPenawaranBaru(tanggal, no)                      isi awal form
//   susunPenawaranBaru(f, daftar, id, createdAt)        { ok, dok } atau { ok:false, pesan } (susunDok, jenis penawaran)
//   periksaFormPenawaran(f, daftar)                     sama, dengan id/waktu sementara (hanya memeriksa)
// ═══════════════════════════════════════════════════════════
let _pnwItems = [];

function nomorPenawaranBerikut(tahun, daftar, counterList) {
  const y = Number.isInteger(tahun) ? tahun : new Date().getFullYear();
  return nomorDokBerikut('penawaran', y, daftar, counterList);
}

// Masa berlaku default 14 hari dari tanggal penawaran (boleh diubah atau dikosongkan di form).
function berlakuDefaultPenawaran(tanggal) {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(tanggal || '') ? new Date(tanggal + 'T00:00:00Z') : null;
  if (!d || isNaN(d.getTime())) return '';
  d.setUTCDate(d.getUTCDate() + 14);
  return d.toISOString().slice(0, 10);
}

function formPenawaranBaru(tanggal, no) {
  return { no: no || '', tanggal: tanggal || '', kontak: '', catatan: '', berlakuSampai: berlakuDefaultPenawaran(tanggal), ppnAktif: false, ppnTarif: 11, items: [] };
}

function susunPenawaranBaru(f, daftar, id, createdAt) {
  return susunDok(Object.assign({}, f, { id, jenis: 'penawaran', createdAt }), daftar);
}

function periksaFormPenawaran(f, daftar) {
  return susunPenawaranBaru(f, daftar, 'PNW_PERIKSA', 'periksa');
}

function _pnwRp(v) { return v.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }); }

function _pnwPpnTarif() {
  if (!document.getElementById('pnw-ppn-check')?.checked) return 0;
  const v = parseFloat(document.getElementById('pnw-ppn-tarif')?.value);
  return isNaN(v) ? (typeof PPN_TARIF_STANDAR !== 'undefined' ? PPN_TARIF_STANDAR : 11) : v;
}

function hitungTotalPenawaranForm() {
  const h = hitungTotalDok({ items: _pnwItems, ppnTarif: _pnwPpnTarif() });
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = _pnwRp(v); };
  set('pnw-subtotal', h.subtotal); set('pnw-ppn-val', h.ppn); set('pnw-total', h.total);
  return h;
}

// Tiap item disusun bertumpuk (nama, lalu qty + satuan + harga) supaya muat di layar sempit.
function renderPenawaranItems() {
  const el = document.getElementById('pnw-items-list'); if (!el) return;
  el.innerHTML = _pnwItems.map((it, i) => `
    <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px dashed var(--border);">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 32px;gap:8px;align-items:center;">
        <input type="text" value="${escapeHtml(it.nama)}" placeholder="Nama barang / jasa" oninput="_pnwItems[${i}].nama=this.value" style="min-width:0;width:100%;box-sizing:border-box;">
        <button type="button" onclick="hapusItemPenawaran(${i})" style="padding:0;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,72px) minmax(0,84px) minmax(0,1fr);gap:8px;margin-top:6px;">
        <input type="number" value="${it.qty}" min="1" placeholder="Qty" oninput="_pnwItems[${i}].qty=+this.value;hitungTotalPenawaranForm()" style="min-width:0;width:100%;box-sizing:border-box;text-align:center;">
        <input type="text" value="${escapeHtml(it.satuan || '')}" placeholder="Satuan" oninput="_pnwItems[${i}].satuan=this.value" style="min-width:0;width:100%;box-sizing:border-box;">
        <input type="number" value="${it.harga}" placeholder="Harga satuan" oninput="_pnwItems[${i}].harga=+this.value;hitungTotalPenawaranForm()" style="min-width:0;width:100%;box-sizing:border-box;">
      </div>
    </div>`).join('');
  hitungTotalPenawaranForm();
}

function tambahItemPenawaran() {
  _pnwItems.push({ nama: '', qty: 1, satuan: '', harga: 0 });
  renderPenawaranItems();
}

function hapusItemPenawaran(i) {
  _pnwItems.splice(i, 1);
  renderPenawaranItems();
}

function openModalPenawaran() {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Penawaran')) return;
  const f = formPenawaranBaru(new Date().toISOString().split('T')[0],
    nomorPenawaranBerikut(undefined, dokList, typeof counterList !== 'undefined' ? counterList : []));
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('pnw-no', f.no); set('pnw-tgl', f.tanggal); set('pnw-kontak', f.kontak); set('pnw-catatan', f.catatan);
  set('pnw-berlaku', f.berlakuSampai); set('pnw-ppn-tarif', String(f.ppnTarif));
  const ppn = document.getElementById('pnw-ppn-check'); if (ppn) ppn.checked = !!f.ppnAktif;
  // Saran nama pelanggan dari Kontak (pelanggan atau keduanya); nama baru tetap boleh diketik, seperti di invoice.
  const dl = document.getElementById('pnw-kontak-list');
  if (dl) dl.innerHTML = kontakList.filter(k => k && (k.tipe === 'pelanggan' || k.tipe === 'keduanya'))
    .map(k => `<option value="${escapeHtml(k.nama)}"></option>`).join('');
  _pnwItems = [];
  tambahItemPenawaran();
  openModal('modal-penawaran');
}

function _pnwBacaForm() {
  const v = id => (document.getElementById(id) || {}).value || '';
  return { no: v('pnw-no'), tanggal: v('pnw-tgl'), kontak: v('pnw-kontak'), catatan: v('pnw-catatan'), berlakuSampai: v('pnw-berlaku'),
    ppnTarif: _pnwPpnTarif(), items: _pnwItems.map(it => ({ ...it })) };
}

function _pnwAlertPeringatan(pesan) {
  showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ' + escapeHtml(pesan));
}

// Simpan penawaran baru sebagai draft. Gagal validasi = tidak ada yang tersimpan dan modal tetap terbuka.
function simpanPenawaran() {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Penawaran')) return;
  const r = susunPenawaranBaru(_pnwBacaForm(), dokList, idDokBaru(dokList, Date.now()), new Date().toISOString());
  if (!r.ok) { _pnwAlertPeringatan(r.pesan); return; }
  tambahDok(r.dok);
  closeModal('modal-penawaran');
  renderPenawaranList();
  showAlert('✓ Penawaran ' + escapeHtml(r.dok.no) + ' disimpan sebagai draft (' + _pnwRp(hitungTotalDok(r.dok).total) + ').');
}

const PENAWARAN_WARNA = { draft: 'var(--muted)', terkirim: 'var(--accent2)', disetujui: 'var(--accent)', ditolak: 'var(--red)', selesai: 'var(--accent)', batal: 'var(--muted)' };

// Daftar penawaran (terbaru di atas, urutan penyimpanan). Masa berlaku merah bila sudah lewat dan penawaran belum diputuskan.
function renderPenawaranList() {
  const el = document.getElementById('penawaran-body'); if (!el) return;
  const daftar = dokList.filter(d => d && d.jenis === 'penawaran');
  if (!daftar.length) {
    el.style.cssText = 'padding:24px 16px;text-align:center;color:var(--muted);font-size:13px;';
    el.innerHTML = 'Belum ada penawaran.';
    return;
  }
  el.style.cssText = '';
  const hariIni = new Date().toISOString().split('T')[0];
  el.innerHTML = `<div class="table-scroll"><table id="penawaran-table">
    <thead><tr><th>No. Penawaran</th><th>Pelanggan</th><th>Tanggal</th><th>Berlaku Sampai</th><th>Total</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${daftar.map(d => {
      const s = d.status || 'draft';
      const lewat = d.berlakuSampai && d.berlakuSampai < hariIni && (s === 'draft' || s === 'terkirim');
      const w = PENAWARAN_WARNA[s] || 'var(--muted)';
      return `<tr>
        <td style="font-family:var(--mono);font-size:12px;font-weight:600">${escapeHtml(d.no)}</td>
        <td>${escapeHtml(d.kontak)}</td>
        <td style="font-size:12px">${escapeHtml(d.tanggal)}</td>
        <td style="font-size:12px;${lewat ? 'color:var(--red);font-weight:600;' : ''}">${escapeHtml(d.berlakuSampai || '-')}</td>
        <td class="debit" style="font-family:var(--mono)">${rp(hitungTotalDok(d).total)}</td>
        <td><span style="background:${w}22;color:${w};padding:2px 8px;border-radius:6px;font-size:11px;">${escapeHtml(s.charAt(0).toUpperCase() + s.slice(1))}</span></td>
        <td style="white-space:nowrap;"><button class="btn btn-danger btn-sm" title="Hapus" onclick="hapusPenawaran('${escapeForJsAttr(d.id)}')"><i class="ti ti-trash" style="font-size:14px;"></i></button></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function hapusPenawaran(id) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Penawaran')) return;
  const d = dokList.find(x => x && x.id === id && x.jenis === 'penawaran'); if (!d) return;
  if (!confirm('Hapus penawaran ' + d.no + ' (' + d.kontak + ')?')) return;
  hapusDokById(id);
  renderPenawaranList();
  showAlert('✓ Penawaran dihapus');
}
