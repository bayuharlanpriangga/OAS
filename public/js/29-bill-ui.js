// ═══════════════════════════════════════════════════════════
// TAGIHAN PEMBELIAN (BILL) — form input dan daftar (task 4.3 dan 4.4, Roadmap.md)
//
// Form di #modal-bill (hitung total langsung), simpan ke billList lewat 28-bill.js
// (cloud untuk bisnis login, localStorage untuk mode tamu), dan daftar di #bill-body.
// Jurnal (task 4.6): bill 'diterima' langsung membuat jurnal utang lewat buatJurnalBill (28-bill.js) dan
// jalur postJurnalLegacy (kunci periode, nomor JRN, sync cloud, audit); nomor jurnalnya disimpan di bill.jurnalNo.
// Bill diterima lama tanpa jurnal punya tombol "Buat Jurnal"; hapus bill yang sudah dijurnal membuat jurnal pembalik.
// Edit draft (task 4.6c): tombol pensil di daftar membuka form yang sama (editBill); simpan mengganti draft di tempat
// (perbaruiBill), dan "Simpan & Diterima" dari draft membuat jurnal lewat jalur yang sama dengan bill baru.
// Pola mengikuti form invoice (19-fitur-tambahan.js, 11-kontak-invoice.js).
// Fungsi hitung, validasi, dan penyimpan ada di 28-bill.js. Dimuat setelah 28-bill.js.
// ═══════════════════════════════════════════════════════════
let _billItems = [];
let _billEditId = null;   // id draft yang sedang diedit di form; null = tagihan baru (task 4.6c)

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

// Isi tombol picker akun satu baris (sama dengan tampilan Akun Utang Usaha).
function _billAkunBtnHtml(kode) {
  const a = akuns.find(x => x.kode === kode);
  return a ? `<span class="picker-kode-badge">${escapeHtml(a.kode)}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(a.nama)}</span>` : 'Pilih Akun...';
}

// Picker akun mengisi input hidden per baris tanpa memicu event, jadi nilainya dibaca di sini
// sebelum baris dirender ulang (tambah/hapus item) dan sebelum simpan.
function _billSinkronAkun() {
  _billItems.forEach((it, i) => {
    const h = document.getElementById('bill-akun-' + i);
    if (h && h.value) it.akun = h.value;
  });
}

// Tiap item disusun bertumpuk (nama, lalu qty + harga, lalu akun) supaya muat di layar sempit
// tanpa meluber ke samping. minmax(0, ...) mencegah input melebarkan kolom.
function renderBillItems() {
  const el = document.getElementById('bill-items-list'); if (!el) return;
  el.innerHTML = _billItems.map((it, i) => `
    <div style="margin-bottom:12px;padding-bottom:12px;border-bottom:1px dashed var(--border);">
      <div style="display:grid;grid-template-columns:minmax(0,1fr) 32px;gap:8px;align-items:center;">
        <input type="text" value="${escapeHtml(it.nama)}" placeholder="Nama barang / jasa" oninput="_billItems[${i}].nama=this.value" style="min-width:0;width:100%;box-sizing:border-box;">
        <button type="button" onclick="hapusItemBill(${i})" style="padding:0;">✕</button>
      </div>
      <div style="display:grid;grid-template-columns:minmax(0,84px) minmax(0,1fr);gap:8px;margin-top:6px;">
        <input type="number" value="${it.qty}" min="1" placeholder="Qty" oninput="_billItems[${i}].qty=+this.value;hitungTotalBillForm()" style="min-width:0;width:100%;box-sizing:border-box;text-align:center;">
        <input type="number" value="${it.harga}" placeholder="Harga satuan" oninput="_billItems[${i}].harga=+this.value;hitungTotalBillForm()" style="min-width:0;width:100%;box-sizing:border-box;">
      </div>
      <input type="hidden" id="bill-akun-${i}" value="${escapeHtml(it.akun || '')}">
      <button class="form-picker-btn${it.akun ? ' has-value' : ''}" type="button" id="bill-akun-btn-${i}" style="margin-top:6px;" onclick="openSimplePicker('bill-akun-${i}','bill-akun-btn-${i}','beli')">${_billAkunBtnHtml(it.akun)}</button>
    </div>`).join('');
  hitungTotalBillForm();
}

function tambahItemBill() {
  _billSinkronAkun();
  const akun = (akuns.find(a => a.kode === '1301') || _billAkunBeli()[0] || {}).kode || '';
  _billItems.push({ nama: '', qty: 1, harga: 0, akun });
  renderBillItems();
}

function hapusItemBill(i) {
  _billSinkronAkun();
  _billItems.splice(i, 1);
  renderBillItems();
}

// Isi picker Akun Utang Usaha (input hidden + tombol) dari kode akun; kode kosong/tak dikenal = belum dipilih.
function _billSetAkunUtang(kode) {
  const a = akuns.find(x => x.kode === kode);
  const h = document.getElementById('bill-akun-utang'), btn = document.getElementById('bill-akun-utang-btn');
  if (h) h.value = a ? a.kode : '';
  if (!btn) return;
  if (a) { btn.innerHTML = `<span class="picker-kode-badge">${escapeHtml(a.kode)}</span> ${escapeHtml(a.nama)}`; btn.classList.add('has-value'); }
  else { btn.textContent = 'Pilih Akun...'; btn.classList.remove('has-value'); }
}

// Isi form dari objek f (bentuk formDariBill) lalu buka modal. Dipakai tagihan baru dan edit draft.
function _billBukaForm(f, judul) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
  set('bill-no', f.noBill); set('bill-tgl', f.tanggal); set('bill-jatuh-tempo', f.jatuhTempo);
  set('bill-supplier', f.supplier); set('bill-deskripsi', f.deskripsi);
  const ppn = document.getElementById('bill-ppn-check'); if (ppn) ppn.checked = !!f.ppnAktif;
  set('bill-ppn-tarif', String(f.ppnTarif));
  const jdl = document.getElementById('bill-modal-judul'); if (jdl) jdl.textContent = judul;
  // Saran nama supplier dari Kontak
  const dl = document.getElementById('bill-supplier-list');
  if (dl) dl.innerHTML = kontakList.filter(k => k.tipe === 'supplier' || k.tipe === 'keduanya')
    .map(k => `<option value="${escapeHtml(k.nama)}"></option>`).join('');
  _billSetAkunUtang(f.akunUtang);
  _billItems = f.items.map(it => ({ ...it }));
  if (_billItems.length) renderBillItems(); else tambahItemBill();
  openModal('modal-bill');
  setTimeout(upgradeFormPickers, 80);
}

function openModalBill() {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Tagihan pembelian')) return;
  _billEditId = null;
  const tgl = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  // Akun Utang Usaha default
  const utang = akuns.find(a => a.kode === '2101') || akuns.find(a => a.tipe === 'Liabilitas' && a.nama.toLowerCase().includes('utang usaha'));
  _billBukaForm({ noBill: nomorBillBerikut(), tanggal: tgl, jatuhTempo: due, supplier: '', deskripsi: '',
    ppnAktif: false, ppnTarif: PPN_TARIF_STANDAR, akunUtang: utang ? utang.kode : '', items: [] }, 'Buat Tagihan Pembelian');
}

// Buka draft di form yang sama untuk diedit (task 4.6c). Hanya status draft; yang lain tidak punya tombolnya.
function editBill(id) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Tagihan pembelian')) return;
  const b = billList.find(x => x && x.id === id); if (!b) return;
  if (!bisaEditBill(b)) { showAlert('Hanya tagihan berstatus Draft yang bisa diedit. Koreksi tagihan lain dengan menghapusnya (jurnal dibalik) lalu membuat ulang.'); return; }
  _billEditId = b.id;
  _billBukaForm(formDariBill(b), 'Edit Tagihan ' + b.noBill);
}

// Baca isi form menjadi objek untuk susunBill (28-bill.js).
function _billBacaForm(status) {
  _billSinkronAkun();
  const v = id => (document.getElementById(id) || {}).value || '';
  return {
    noBill: v('bill-no'), supplier: v('bill-supplier'), tanggal: v('bill-tgl'), jatuhTempo: v('bill-jatuh-tempo'),
    deskripsi: v('bill-deskripsi'), items: _billItems.map(it => ({ ...it })),
    ppnAktif: !!document.getElementById('bill-ppn-check')?.checked, ppnTarif: _billPpnTarif(),
    akunUtang: v('bill-akun-utang'), status
  };
}

// Posting jurnal satu bill (efek samping). bill.jurnalNo diisi bila berhasil.
// opsi.baru = true: bill baru disusun, jadi tidak perlu mencari jurnal lama yang cocok.
// Mengembalikan { ok:true, jurnalNo, sudahAda? } atau { ok:false, pesan? } (tanpa pesan = sudah ada alert,
// mis. periode terkunci).
function postingJurnalBill(bill, opsi) {
  if (!(opsi && opsi.baru)) {
    const st = jurnalBillStatus(bill, jurnalEntries, billList);
    if (st.status === 'aktif') { bill.jurnalNo = st.jurnal.no; return { ok: true, jurnalNo: st.jurnal.no, sudahAda: true }; }
  }
  if (!guardPeriode(bill.tanggal, 'diposting')) return { ok: false };
  const r = buatJurnalBill(bill, { akunPpnMasukan: cariAkunPpnMasukan(akuns) });
  if (!r.ok) return { ok: false, pesan: r.pesan };
  // Kaitkan kontakId bila supplier cocok dengan kontak yang ada (task 4.6b)
  if (bill.supplier && typeof kontakList !== 'undefined' && Array.isArray(kontakList)) {
    const k = kontakList.find(x => x && x.nama && x.nama.trim().toLowerCase() === bill.supplier.trim().toLowerCase());
    if (k) r.jurnal.kontakId = k.id;
  }
  const entry = postJurnalLegacy(r.jurnal);
  if (!entry) return { ok: false };
  bill.jurnalNo = entry.no;
  if (typeof saveToStorage === 'function') saveToStorage(false);
  return { ok: true, jurnalNo: entry.no };
}

function _billAlertPeringatan(pesan) {
  showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ' + escapeHtml(pesan));
}

function simpanBill(status) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Tagihan pembelian')) return;
  // Mode edit (task 4.6c): draft lama harus masih ada dan masih draft (bisa berubah lewat tab/perangkat lain).
  const lama = _billEditId ? billList.find(b => b && b.id === _billEditId) : null;
  if (_billEditId && !bisaEditBill(lama)) { _billAlertPeringatan('Tagihan ini sudah tidak ada atau bukan draft lagi. Tutup form, lalu buka ulang dari daftar.'); return; }
  const f = _billBacaForm(status);
  if (lama) { f.id = lama.id; f.createdAt = lama.createdAt; }
  // Nomor milik draft yang sedang diedit tidak dihitung kembar dengan dirinya sendiri.
  const r = susunBill(f, billList.filter(b => b !== lama).map(b => b && b.noBill));
  if (!r.ok) { _billAlertPeringatan(r.pesan); return; }
  let jurnalNo = '';
  if (status === 'diterima') {
    // Jurnal dibuat lebih dulu; bila gagal (periode terkunci, dll.) bill tidak disimpan setengah jadi.
    const p = postingJurnalBill(r.bill, { baru: true });
    if (!p.ok) { if (p.pesan) _billAlertPeringatan(p.pesan); return; }
    jurnalNo = p.jurnalNo;
  }
  if (lama) perbaruiBill(Object.assign({}, lama, r.bill)); else tambahBill(r.bill);
  _billEditId = null;
  closeModal('modal-bill');
  renderBillList();
  showAlert('✓ Tagihan ' + escapeHtml(r.bill.noBill) + (lama ? ' diperbarui dan disimpan sebagai ' : ' disimpan sebagai ') + (status === 'draft' ? 'draft' : 'diterima') + '.'
    + (jurnalNo ? '<br><span style="font-size:12px;color:var(--muted);">Jurnal utang ' + escapeHtml(jurnalNo) + ' dibuat.</span>' : ''));
}

// Tombol "Buat Jurnal" untuk bill diterima yang belum punya jurnal aktif (mis. bill dari task 4.4).
function buatJurnalUntukBill(id) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Tagihan pembelian')) return;
  const b = billList.find(x => x && x.id === id); if (!b) return;
  const st = jurnalBillStatus(b, jurnalEntries, billList);
  if (st.status === 'aktif') { showAlert('Tagihan ' + escapeHtml(b.noBill) + ' sudah punya jurnal ' + escapeHtml(st.jurnal.no) + '.'); return; }
  if (b.status !== 'diterima') { showAlert('Hanya tagihan berstatus Diterima yang bisa dijurnal.'); return; }
  if (!confirm('Buat jurnal utang untuk tagihan ' + b.noBill + ' (' + b.supplier + ') sebesar ' + rp(b.total) + ', bertanggal ' + b.tanggal + '?')) return;
  const p = postingJurnalBill(b);
  if (!p.ok) { if (p.pesan) _billAlertPeringatan(p.pesan); return; }
  simpanBillState();   // simpan jurnalNo di record bill
  renderBillList();
  showAlert('✓ Jurnal ' + escapeHtml(p.jurnalNo) + (p.sudahAda ? ' sudah ada dan kini tertaut ke tagihan ' : ' dibuat untuk tagihan ') + escapeHtml(b.noBill) + '.');
}

// Info jurnal di bawah badge status, dan tombol Buat Jurnal untuk bill diterima tanpa jurnal aktif.
function _billInfoJurnal(b) {
  const st = jurnalBillStatus(b, jurnalEntries, billList);
  const gaya = 'font-size:10px;color:var(--muted);font-family:var(--mono);margin-top:2px;';
  if (st.status === 'aktif') return `<div style="${gaya}">${escapeHtml(st.jurnal.no)}</div>`;
  if (st.status === 'dibalik') return `<div style="${gaya}">${escapeHtml(st.jurnal.no)} (dibalik)</div>`;
  if (st.status === 'belum' && b.status === 'diterima') return `<div style="${gaya}">belum dijurnal</div>`;
  return '';
}
function _billTombolJurnal(b) {
  if (b.status !== 'diterima') return '';
  const st = jurnalBillStatus(b, jurnalEntries, billList);
  if (st.status === 'aktif') return '';
  return `<button class="btn btn-sm" title="Buat jurnal utang" style="margin-right:4px;" onclick="buatJurnalUntukBill('${escapeForJsAttr(b.id)}')">Buat Jurnal</button>`;
}

// Tombol edit hanya untuk draft (task 4.6c).
function _billTombolEdit(b) {
  if (!bisaEditBill(b)) return '';
  return `<button class="btn btn-sm" title="Edit draft" style="margin-right:4px;" onclick="editBill('${escapeForJsAttr(b.id)}')"><i class="ti ti-pencil" style="font-size:14px;"></i></button>`;
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
  const warna = { draft: 'var(--muted)', diterima: 'var(--accent2)', sebagian: 'var(--accent3)', lunas: 'var(--accent)', 'jatuh-tempo': 'var(--red)' };
  el.innerHTML = `<div class="table-scroll"><table id="bill-table">
    <thead><tr><th>No. Tagihan</th><th>Supplier</th><th>Tanggal</th><th>Jatuh Tempo</th><th>Total</th><th>Sisa</th><th>Status</th><th>Aksi</th></tr></thead>
    <tbody>${billList.map(b => {
      const jt = (b.status === 'diterima' || b.status === 'sebagian') && b.jatuhTempo && b.jatuhTempo < hariIni && b.sisaTagihan > 0;
      const s = jt ? 'jatuh-tempo' : (b.status || 'draft');
      const badge = `<span style="background:${warna[s]}22;color:${warna[s]};padding:2px 8px;border-radius:6px;font-size:11px;">${s === 'jatuh-tempo' ? 'Jatuh Tempo' : escapeHtml(s.charAt(0).toUpperCase() + s.slice(1))}</span>`;
      return `<tr>
        <td style="font-family:var(--mono);font-size:12px;font-weight:600">${escapeHtml(b.noBill)}</td>
        <td>${escapeHtml(b.supplier)}</td>
        <td style="font-size:12px">${escapeHtml(b.tanggal)}</td>
        <td style="font-size:12px;${jt ? 'color:var(--red);font-weight:600;' : ''}">${escapeHtml(b.jatuhTempo || '-')}</td>
        <td class="debit" style="font-family:var(--mono)">${rp(b.total)}</td>
        <td style="font-family:var(--mono);color:${b.sisaTagihan > 0 ? 'var(--accent3)' : 'var(--accent)'}">${rp(b.sisaTagihan)}</td>
        <td>${badge}${_billInfoJurnal(b)}</td>
        <td style="white-space:nowrap;">${_billTombolEdit(b)}${_billTombolJurnal(b)}${b.status === 'diterima' || b.status === 'sebagian' ? `<button class="btn btn-sm btn-primary" style="margin-right:4px;" onclick="openModalBayarBill('${escapeForJsAttr(b.id)}')">Bayar</button>` : ''}${typeof _bayarTombolRiwayatBill === 'function' ? _bayarTombolRiwayatBill(b) : ''}<button class="btn btn-danger btn-sm" onclick="hapusBill('${escapeForJsAttr(b.id)}')"><i class="ti ti-trash" style="font-size:14px;"></i></button></td>
      </tr>`;
    }).join('')}</tbody></table></div>`;
}

function hapusBill(id) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Tagihan pembelian')) return;
  const b = billList.find(x => x && x.id === id); if (!b) return;
  const st = jurnalBillStatus(b, jurnalEntries, billList);
  if (st.status === 'aktif') {
    // Jurnal yang sudah diposting tidak dihapus; dikoreksi lewat jurnal pembalik (lihat buatJurnalPembalik).
    const hariIni = new Date().toISOString().split('T')[0];
    const tgl = tanggalPembalikBill(st.jurnal.tanggal, hariIni);
    if (!confirm('Tagihan ' + b.noBill + ' (' + b.supplier + ') sudah dijurnal (' + st.jurnal.no + '). Menghapusnya membuat jurnal pembalik bertanggal ' + tgl + '. Lanjutkan?')) return;
    if (!guardPeriode(tgl, 'dibuatkan jurnal pembalik')) return;
    let hasil = null;
    try { hasil = buatJurnalPembalik(st.jurnal, { tanggal: tgl, alasan: 'Tagihan ' + b.noBill + ' dihapus' }); }
    catch (e) { if (!(e instanceof PeriodeTerkunciError)) throw e; return; }
    if (!hasil) return;   // alert sudah tampil; tagihan tetap ada
    if (typeof saveToStorage === 'function') saveToStorage(false);
  } else if (!confirm('Hapus tagihan ' + b.noBill + ' (' + b.supplier + ')?')) return;
  hapusBillById(id);
  renderBillList();
  showAlert(st.status === 'aktif' ? '✓ Tagihan dihapus dan jurnalnya dibalik.' : '✓ Tagihan dihapus');
}
