// ═══════════════════════════════════════════════════════════
// TAGIHAN PEMBELIAN (BILL) — form input dan daftar (task 4.3 dan 4.4, Roadmap.md)
//
// Form di #modal-bill (hitung total langsung), simpan ke billList lewat 28-bill.js
// (cloud untuk bisnis login, localStorage untuk mode tamu), dan daftar di #bill-body.
// Belum ada jurnal: status 'diterima' belum membuat jurnal utang (task 4.5-4.6).
// Pola mengikuti form invoice (19-fitur-tambahan.js, 11-kontak-invoice.js).
// Fungsi hitung, validasi, dan penyimpan ada di 28-bill.js. Dimuat setelah 28-bill.js.
// ═══════════════════════════════════════════════════════════
let _billItems = [];

function _billAkunBeli() { return akuns.filter(a => PICKER_FILTERS.beli(a)); }

function _billPpnTarif() {
  const v = parseFloat(document.getElementById('bill-ppn-tarif')?.value);
  return isNaN(v) ? PPN_TARIF_STANDAR : v;
}

function hitungTotalBillForm() {
  const h = hitungTotalBill(_billItems, !!document.getElementById('bill-ppn-check')?.checked, _billPpnTarif());
  const fmt = v => v.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 });
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = fmt(v); };
  set('bill-subtotal', h.subtotal); set('bill-ppn-val', h.ppn); set('bill-total', h.total);
  return h;
}

function renderBillItems() {
  const el = document.getElementById('bill-items-list'); if (!el) return;
  const opsi = _billAkunBeli();
  el.innerHTML = _billItems.map((it, i) => `
    <div style="margin-bottom:10px;">
      <div style="display:grid;grid-template-columns:1fr 72px 120px 32px;gap:8px;align-items:center;">
        <input type="text" value="${escapeHtml(it.nama)}" placeholder="Nama barang / jasa" oninput="_billItems[${i}].nama=this.value">
        <input type="number" value="${it.qty}" min="1" oninput="_billItems[${i}].qty=+this.value;hitungTotalBillForm()" style="text-align:center;">
        <input type="number" value="${it.harga}" placeholder="0" oninput="_billItems[${i}].harga=+this.value;hitungTotalBillForm()">
        <button type="button" onclick="_billItems.splice(${i},1);renderBillItems()">✕</button>
      </div>
      <select onchange="_billItems[${i}].akun=this.value" style="margin-top:6px;width:100%;">
        ${opsi.map(a => `<option value="${escapeHtml(a.kode)}"${a.kode === it.akun ? ' selected' : ''}>${escapeHtml(a.kode)} · ${escapeHtml(a.nama)}</option>`).join('')}
      </select>
    </div>`).join('');
  hitungTotalBillForm();
  setTimeout(upgradeFormPickers, 50);
}

function tambahItemBill() {
  const akun = (akuns.find(a => a.kode === '1301') || _billAkunBeli()[0] || {}).kode || '';
  _billItems.push({ nama: '', qty: 1, harga: 0, akun });
  renderBillItems();
}

function openModalBill() {
  const tgl = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  document.getElementById('bill-no').value = nomorBillBerikut();
  document.getElementById('bill-tgl').value = tgl;
  document.getElementById('bill-jatuh-tempo').value = due;
  document.getElementById('bill-supplier').value = '';
  document.getElementById('bill-deskripsi').value = '';
  document.getElementById('bill-ppn-check').checked = false;
  document.getElementById('bill-ppn-tarif').value = String(PPN_TARIF_STANDAR);
  // Saran nama supplier dari Kontak
  const dl = document.getElementById('bill-supplier-list');
  if (dl) dl.innerHTML = kontakList.filter(k => k.tipe === 'supplier' || k.tipe === 'keduanya')
    .map(k => `<option value="${escapeHtml(k.nama)}"></option>`).join('');
  // Akun Utang Usaha default
  const utang = akuns.find(a => a.kode === '2101') || akuns.find(a => a.tipe === 'Liabilitas' && a.nama.toLowerCase().includes('utang usaha'));
  const h = document.getElementById('bill-akun-utang'), btn = document.getElementById('bill-akun-utang-btn');
  if (h) h.value = utang ? utang.kode : '';
  if (btn) {
    if (utang) { btn.innerHTML = `<span class="picker-kode-badge">${escapeHtml(utang.kode)}</span> ${escapeHtml(utang.nama)}`; btn.classList.add('has-value'); }
    else { btn.textContent = 'Pilih Akun...'; btn.classList.remove('has-value'); }
  }
  _billItems = [];
  tambahItemBill();
  openModal('modal-bill');
  setTimeout(upgradeFormPickers, 80);
}

// Baca isi form menjadi objek untuk susunBill (28-bill.js).
function _billBacaForm(status) {
  const v = id => (document.getElementById(id) || {}).value || '';
  return {
    noBill: v('bill-no'), supplier: v('bill-supplier'), tanggal: v('bill-tgl'), jatuhTempo: v('bill-jatuh-tempo'),
    deskripsi: v('bill-deskripsi'), items: _billItems.map(it => ({ ...it })),
    ppnAktif: !!document.getElementById('bill-ppn-check')?.checked, ppnTarif: _billPpnTarif(),
    akunUtang: v('bill-akun-utang'), status
  };
}

function simpanBill(status) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Tagihan pembelian')) return;
  const r = susunBill(_billBacaForm(status), billList.map(b => b && b.noBill));
  if (!r.ok) { showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ' + escapeHtml(r.pesan)); return; }
  tambahBill(r.bill);
  closeModal('modal-bill');
  renderBillList();
  showAlert('✓ Tagihan ' + escapeHtml(r.bill.noBill) + ' disimpan sebagai ' + (status === 'draft' ? 'draft' : 'diterima') + '.'
    + (status === 'diterima' ? '<br><span style="font-size:12px;color:var(--muted);">Jurnal utang belum dibuat otomatis (menyusul di task 4.6).</span>' : ''));
}

function renderBillList() {
  const el = document.getElementById('bill-body'); if (!el) return;
  if (!billList.length) {
    el.style.cssText = 'padding:24px 16px;text-align:center;color:var(--muted);font-size:13px;';
    el.innerHTML = 'Belum ada tagihan pembelian.';
    return;
  }
  el.style.cssText = '';
  const hariIni = new Date().toISOString().split('T')[0];
  const warna = { draft: 'var(--muted)', diterima: 'var(--accent2)', lunas: 'var(--accent)', 'jatuh-tempo': 'var(--red)' };
  el.innerHTML = `<div class="table-scroll"><table id="bill-table">
    <thead><tr><th>No. Tagihan</th><th>Supplier</th><th>Tanggal</th><th>Jatuh Tempo</th><th>Total</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${billList.map(b => {
      const jt = b.status === 'diterima' && b.jatuhTempo && b.jatuhTempo < hariIni && b.sisaTagihan > 0;
      const s = jt ? 'jatuh-tempo' : (b.status || 'draft');
      const badge = `<span style="background:${warna[s]}22;color:${warna[s]};padding:2px 8px;border-radius:6px;font-size:11px;">${s === 'jatuh-tempo' ? 'Jatuh Tempo' : escapeHtml(s.charAt(0).toUpperCase() + s.slice(1))}</span>`;
      return `<tr>
        <td style="font-family:var(--mono);font-size:12px;font-weight:600">${escapeHtml(b.noBill)}</td>
        <td>${escapeHtml(b.supplier)}</td>
        <td style="font-size:12px">${escapeHtml(b.tanggal)}</td>
        <td style="font-size:12px;${jt ? 'color:var(--red);font-weight:600;' : ''}">${escapeHtml(b.jatuhTempo || '-')}</td>
        <td class="debit" style="font-family:var(--mono)">${rp(b.total)}</td>
        <td style="font-family:var(--mono);color:${b.sisaTagihan > 0 ? 'var(--accent3)' : 'var(--accent)'}">${rp(b.sisaTagihan)}</td>
        <td>${badge}</td>
        <td><button class="btn btn-danger btn-sm" onclick="hapusBill('${escapeForJsAttr(b.id)}')"><i class="ti ti-trash" style="font-size:14px;"></i></button></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function hapusBill(id) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Tagihan pembelian')) return;
  const b = billList.find(x => x && x.id === id); if (!b) return;
  if (!confirm('Hapus tagihan ' + b.noBill + ' (' + b.supplier + ')?')) return;
  hapusBillById(id);
  renderBillList();
  showAlert('✓ Tagihan dihapus');
}
