// ═══════════════════════════════════════════════════════════
// TAGIHAN PEMBELIAN (BILL) — form input (task 4.3, Roadmap.md)
//
// Hanya tampilan: form di #modal-bill dan hitung total langsung. Tombol simpan belum
// menyimpan apa pun (simpan + daftar: task 4.4, jurnal: 4.5-4.6).
// Pola mengikuti form invoice (19-fitur-tambahan.js, 11-kontak-invoice.js).
// Fungsi hitung ada di 28-bill.js. Dimuat setelah 28-bill.js.
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

// Sementara: form belum menyimpan (task 4.4).
function simpanBill(status) {
  showAlert('Penyimpanan tagihan pembelian belum tersedia (task 4.4).');
}
