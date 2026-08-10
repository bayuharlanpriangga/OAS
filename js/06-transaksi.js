
function renderFilteredPickerList(query, selectedKode, filterFn) {
  const q = query.toLowerCase();
  const base = filterFn ? akuns.filter(filterFn) : akuns;
  const filtered = base.filter(a =>
    !q || a.kode.includes(q) || a.nama.toLowerCase().includes(q) || a.tipe.toLowerCase().includes(q)
  );
  const list = document.getElementById('akun-picker-list');
  if(!filtered.length) {
    list.innerHTML = `<div id="akun-picker-empty"><i class="ti ti-mood-empty" style="font-size:20px;display:block;margin:0 auto 6px;"></i> Akun tidak ditemukan</div>`;
    return;
  }
  const groups = {};
  filtered.forEach(a => { if(!groups[a.tipe]) groups[a.tipe]=[]; groups[a.tipe].push(a); });
  const tipeColor = t => ({Aset:'aset',Liabilitas:'liabilitas',Ekuitas:'ekuitas',Pendapatan:'pendapatan',Beban:'beban',HPP:'beban'})[t]||'beban';
  let html = '';
  Object.entries(groups).forEach(([tipe,items]) => {
    html += `<div class="akun-picker-group-label">${tipe}</div>`;
    items.forEach(a => {
      const sel = a.kode===selectedKode ? ' selected' : '';
      html += `<div class="akun-picker-item${sel}" onclick="selectSimplePicker('${escapeForJsAttr(a.kode)}','${escapeForJsAttr(a.nama)}')">
        <span class="akun-picker-kode">${a.kode}</span>
        <span class="akun-picker-nama">${a.nama}</span>
        <span class="akun-picker-tipe ${tipeColor(a.tipe)}">${tipe}</span>
      </div>`;
    });
  });
  list.innerHTML = html;
}

function selectSimplePicker(kode, nama) {
  // Cek apakah ini simple picker (form) atau manual line picker
  if(_simplePickerHiddenId) {
    const hidden = document.getElementById(_simplePickerHiddenId);
    const btn = document.getElementById(_simplePickerBtnId);
    if(hidden) hidden.value = kode;
    if(btn) {
      btn.classList.add('has-value');
      // Buku besar picker has different inner HTML (opt-picker style)
      if(_simplePickerHiddenId === 'bb-akun-filter-val') {
        btn.innerHTML = `<span class="picker-kode-badge" style="font-family:var(--mono);font-size:11px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 6px;margin-right:6px;">${escapeHtml(kode)}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(nama)}</span><span class="opt-picker-arrow">▾</span>`;
      } else {
        btn.classList.add('has-value');
        btn.innerHTML = `<span class="picker-kode-badge">${escapeHtml(kode)}</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(nama)}</span>`;
      }
    }
    const isBukuBesar = _simplePickerHiddenId === 'bb-akun-filter-val';
    _simplePickerHiddenId = null;
    _simplePickerBtnId = null;
    _simplePickerFilter = null;
    document.getElementById('akun-picker-backdrop').classList.remove('open');
    // Trigger buku besar render after picker closes
    if(isBukuBesar) setTimeout(renderBukuBesar, 50);
  } else {
    // Delegate ke picker manual line
    selectAkunFromPicker(kode, nama);
    return;
  }
}

function initTransaksiForm() {
  // tanggal tidak auto-fill — user wajib pilih sendiri
  populateAkunSelect('kas-akun-lawan', a => !['1101','1102'].includes(a.kode));
  populateAkunSelect('beli-akun', a => ['Beban','Aset','HPP'].includes(a.tipe));

  // Pastikan beli-produk-row selalu visible (bisa tersembunyi jika akun non-persediaan dipilih sebelumnya)
  const produkRow = document.getElementById('beli-produk-row');
  if(produkRow) produkRow.style.display = '';

  // Pastikan akun default beli sudah menunjuk ke persediaan (1301) supaya produk picker tampil
  const beliAkunEl = document.getElementById('beli-akun');
  if(beliAkunEl && !['1301','1302','1303','1304'].includes(beliAkunEl.value)) {
    beliAkunEl.value = '1301';
    const beliAkunLbl = document.getElementById('beli-akun-label');
    if(beliAkunLbl) beliAkunLbl.textContent = 'Persediaan Barang Dagangan';
  }

  initManualLines();
}

// KAS
function previewKas() {
  const jenis = document.getElementById('kas-jenis').value;
  const akunKode = document.getElementById('kas-akun-lawan').value;
  const akunNama = akuns.find(a=>a.kode===akunKode)?.nama||'';
  const jumlah = parseFloat(document.getElementById('kas-jumlah').value)||0;
  const prev = document.getElementById('kas-preview');
  if(!jumlah) { prev.style.display='none'; return; }
  const lines = jenis==='masuk'
    ? [{akun:'Kas',d:jumlah,k:0},{akun:akunNama,d:0,k:jumlah}]
    : [{akun:akunNama,d:jumlah,k:0},{akun:'Kas',d:0,k:jumlah}];
  prev.style.display='block';
  prev.innerHTML = `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;font-size:12.5px;">
    <div style="font-weight:600;margin-bottom:8px;color:var(--accent2);">Preview Jurnal</div>
    ${lines.map(l=>`<div style="display:flex;justify-content:space-between;padding:4px 0;font-family:var(--mono);">
      <span style="${l.d?'':'padding-left:24px'}">${l.akun}</span>
      <span style="color:var(--accent)">${l.d?fmtRp(l.d):''}</span>
      <span style="color:var(--red)">${l.k?fmtRp(l.k):''}</span>
    </div>`).join('')}
  </div>`;
}

function simpanKas() {
  const tanggal = document.getElementById('kas-tanggal').value;
  const jenis = document.getElementById('kas-jenis').value;
  const akunKode = document.getElementById('kas-akun-lawan').value;
  const jumlah = parseFloat(document.getElementById('kas-jumlah').value)||0;
  const ket = document.getElementById('kas-ket').value || (jenis==='masuk'?'Penerimaan Kas':'Pengeluaran Kas');
  if(!tanggal) { showAlert('Pilih tanggal terlebih dahulu!'); return; }
  if(!jumlah) { showAlert('Isi jumlah transaksi terlebih dahulu!'); return; }
  if(!akunKode) { showAlert('Pilih akun lawan terlebih dahulu!'); return; }
  const lines = jenis==='masuk'
    ? [{akun:'1101',ket:'Kas masuk',debit:jumlah,kredit:0},{akun:akunKode,ket,debit:0,kredit:jumlah}]
    : [{akun:akunKode,ket,debit:jumlah,kredit:0},{akun:'1101',ket:'Kas keluar',debit:0,kredit:jumlah}];
  addJurnal({tanggal,ket,jenis:'Kas',lines});
  document.getElementById('kas-jumlah').value='';
  document.getElementById('kas-ket').value='';
  document.getElementById('kas-preview').style.display='none';
  // Reset picker button
  const btn = document.getElementById('kas-akun-lawan-btn');
  if(btn){ btn.classList.remove('has-value'); btn.textContent = 'Pilih Akun...'; }
  document.getElementById('kas-akun-lawan').value = '';
  showAlert('✓ Jurnal Kas berhasil disimpan!');
}

// PENJUALAN
function getAkunPendapatanDefault() {
  // Auto-detect dari tipe bisnis currentCompany
  const tipe = currentCompany?.type || currentCompany?.tipe || '';
  if (tipe === 'jasa') return { kode: '4102', nama: 'Penjualan Jasa' };
  if (tipe === 'dagang') return { kode: '4101', nama: 'Penjualan Barang' };
  if (tipe === 'properti') return { kode: '4106', nama: 'Pendapatan Properti / Sewa' };
  if (tipe === 'manufaktur') return { kode: '4101', nama: 'Penjualan Barang' };
  return null; // umum = user pilih sendiri
}

const _jualAkunOptions = [
  { value: '4101', label: 'Penjualan Barang', sub: 'Akun 4101 · Penjualan Barang',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>` },
  { value: '4102', label: 'Penjualan Jasa',   sub: 'Akun 4102 · Penjualan Jasa',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/></svg>` },
  { value: '4105', label: 'Manufaktur',       sub: 'Akun 4105 · Penjualan Produk Manufaktur',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>` },
  { value: '4106', label: 'Properti',         sub: 'Akun 4106 · Pendapatan Properti / Sewa',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
  { value: '4107', label: 'Bahan Baku',        sub: 'Akun 4107 · Penjualan Bahan Baku',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>` },
  { value: '4202', label: 'Pendapatan Sewa',  sub: 'Akun 4202 · Pendapatan Sewa',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>` },
  { value: '4205', label: 'Pendapatan Lainnya', sub: 'Akun 4205 · Pendapatan Non-Operasional Lainnya',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>` },
];

function openJualAkunPicker() {
  const hidden = document.getElementById('jual-akun-pendapatan');
  const btn    = document.getElementById('jual-akun-pendapatan-btn');
  openOptPicker({
    title: 'Pilih Jenis Penjualan',
    options: _jualAkunOptions,
    currentValue: hidden ? hidden.value : '4101',
    btnEl: btn,
    onSelect: function(value, label) {
      if (hidden) hidden.value = value;
      const lblEl = document.getElementById('jual-akun-pendapatan-label');
      if (lblEl) lblEl.textContent = label;
      if (btn) btn.dataset.value = value;
      // Sembunyikan/tampilkan kolom produk & HPP sesuai jenis
      onJualJenisChange(value);
    }
  });
}

function initJualAkunPendapatan() {
  const hidden = document.getElementById('jual-akun-pendapatan');
  const lbl    = document.getElementById('jual-akun-auto-label');
  if (!hidden) return;
  const def = getAkunPendapatanDefault();
  if (def) {
    hidden.value = def.kode;
    const opt = _jualAkunOptions.find(o => o.value === def.kode);
    const lblEl = document.getElementById('jual-akun-pendapatan-label');
    if (lblEl && opt) lblEl.textContent = opt.label;
  }
}


function previewJual() {
  const jumlah = parseFloat(document.getElementById('jual-jumlah').value)||0;
  const metode = document.getElementById('jual-metode').value;
  const akunPend = document.getElementById('jual-akun-pendapatan')?.value||'4101';
  const akunNama = akuns.find(a=>a.kode===akunPend)?.nama||'Penjualan';
  const debNama  = metode==='tunai'?'Kas':'Piutang Usaha';
  const hpp = parseFloat(document.getElementById('jual-hpp').value)||0;
  const prev = document.getElementById('jual-preview');
  if(!jumlah) { if(prev) prev.style.display='none'; return; }
  const lines = [
    {akun:debNama, d:jumlah, k:0},
    {akun:akunNama, d:0, k:jumlah},
  ];
  if(hpp>0) { lines.push({akun:'HPP - Harga Pokok Penjualan',d:hpp,k:0}); lines.push({akun:'Persediaan Barang Dagangan',d:0,k:hpp}); }
  if(prev) {
    prev.style.display='block';
    prev.innerHTML = `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;font-size:12.5px;margin-bottom:0;">
      <div style="font-weight:600;margin-bottom:8px;color:var(--accent2);">Preview Jurnal</div>
      ${lines.map(l=>`<div style="display:flex;justify-content:space-between;padding:4px 0;font-family:var(--mono);">
        <span style="${l.d?'':'padding-left:24px'}">${l.akun}</span>
        <span style="color:var(--accent)">${l.d?fmtRp(l.d):''}</span>
        <span style="color:var(--red)">${l.k?fmtRp(l.k):''}</span>
      </div>`).join('')}
    </div>`;
  }
}

// ═══ TRANSAKSI PEMBELIAN — FUNGSI PENDUKUNG ═══════════════════════

// ── Mode Produksi Barang Jadi: daftar bahan baku multi-pilih ──
let _beliBahanBakuRows = []; // [{rowId, katId, katLabel, qty}]
let _beliBahanBakuRowSeq = 1;

/** Toggle antara mode pembelian normal vs mode produksi Barang Jadi (multi bahan baku) */
function _toggleBeliBarangJadiMode(isBarangJadi) {
  const bbWrap       = document.getElementById('beli-bahanbaku-wrap');
  const hargaGroup   = document.getElementById('beli-harga-group');
  const produkLblTxt = document.getElementById('beli-produk-label-text');
  if(bbWrap)     bbWrap.style.display     = isBarangJadi ? '' : 'none';
  if(hargaGroup) hargaGroup.style.display = isBarangJadi ? 'none' : '';
  if(produkLblTxt) produkLblTxt.textContent = isBarangJadi ? 'Produk Barang Jadi (Hasil Produksi)' : 'Produk';
  if(isBarangJadi) {
    if(!_beliBahanBakuRows.length) addBeliBahanBakuRow();
    else renderBeliBahanBakuList();
  } else {
    _beliBahanBakuRows = [];
  }
}

/** Picker jenis pembelian (akun target) */
function openBeliAkunPicker() {
  openOptPicker({
    title: 'Pilih Jenis Pembelian',
    options: _beliAkunOptions.map(o => ({ value: o.value, label: o.label, icon: o.icon, sub: o.sub })),
    currentValue: document.getElementById('beli-akun')?.value || '1301',
    onSelect: (val, label) => {
      document.getElementById('beli-akun').value = val;
      const lbl = document.getElementById('beli-akun-label');
      if(lbl) lbl.textContent = label;
      // Jika akun bukan persediaan, sembunyikan produk picker
      // Cek berdasarkan tipe akun di akuns[] — lebih fleksibel dari hardcode kode
      const akunObj = akuns.find(a => a.kode === val);
      const isPersediaan = akunObj
        ? (akunObj.tipe === 'Persediaan' || akunObj.tipe === 'Aset Lancar' || ['1301','1302','1303','1304'].includes(val))
        : ['1301','1302','1303','1304'].includes(val);
      const produkRow = document.getElementById('beli-produk-row');
      if(produkRow) produkRow.style.display = isPersediaan ? '' : 'none';
      if(!isPersediaan) {
        const beliProdukId = document.getElementById('beli-produk-id');
        if(beliProdukId) beliProdukId.value = '';
        const beliProdukBtn = document.getElementById('beli-produk-btn');
        const beliProdukLbl = document.getElementById('beli-produk-label');
        if(beliProdukBtn) { beliProdukLbl.textContent = 'Pilih produk...'; beliProdukLbl.style.color='var(--muted)'; }
        // Update label jumlah kembali ke mode normal
        const jLabel = document.getElementById('beli-jumlah-label');
        if(jLabel) jLabel.textContent = 'Jumlah Pembelian (Rp) *';
        const hint = document.getElementById('beli-total-hint');
        if(hint) hint.style.display='none';
      } else {
        const jLabel = document.getElementById('beli-jumlah-label');
        if(jLabel) jLabel.textContent = 'Harga per Unit (Rp)';
      }
      // Jenis Pembelian = Barang Jadi (1304) → mode produksi multi bahan baku
      _toggleBeliBarangJadiMode(val === '1304');
    }
  });
}

/** Tambah baris bahan baku baru (mode produksi Barang Jadi) */
function addBeliBahanBakuRow() {
  _beliBahanBakuRows.push({ rowId: 'bb'+(_beliBahanBakuRowSeq++), katId:'', katLabel:'', qty:1 });
  renderBeliBahanBakuList();
}

/** Hapus baris bahan baku */
function removeBeliBahanBakuRow(rowId) {
  _beliBahanBakuRows = _beliBahanBakuRows.filter(r => r.rowId !== rowId);
  if(!_beliBahanBakuRows.length) addBeliBahanBakuRow();
  else renderBeliBahanBakuList();
}

/** Picker 2-level bahan baku untuk satu baris produksi */
function openBeliBahanBakuPicker(rowId) {
  const allCards = Object.values(multiKartuStock || {});
  if(!allCards.length) { showAlert('Belum ada kartu stock. Tambahkan di menu Persediaan.'); return; }
  const row = _beliBahanBakuRows.find(r => r.rowId === rowId);
  if(!row) return;

  const _pickLevel2 = (card) => {
    const kats = Object.values(card.kategori || {});
    if(!kats.length) { showAlert('Kartu stock ini belum punya barang.'); return; }
    openOptPicker({
      title: 'Pilih Bahan Baku — ' + card.nama,
      options: kats.map(kat => {
        const saldo = getKsSaldo(kat);
        const metodeLabel = {fifo:'FIFO',lifo:'LIFO',wa:'WA',mwa:'MWA'};
        return { value: kat.id, label: kat.nama,
          sub: `${metodeLabel[saldo.metode]||'FIFO'} · Stok: ${saldo.totalQty} ${card.satuan||'unit'} · HPP: ${fmtRp(saldo.hppNext)}/unit` };
      }),
      currentValue: row.katId,
      onSelect: (katId, label) => {
        row.katId = katId; row.katLabel = label;
        renderBeliBahanBakuList();
      }
    });
  };

  if(allCards.length === 1) { _pickLevel2(allCards[0]); return; }

  openOptPicker({
    title: 'Pilih Kartu Stock',
    options: allCards.map(card => {
      const s = getCardSaldo(card);
      return { value: card.id, label: card.nama,
        sub: `${Object.keys(card.kategori||{}).length} barang · Stok: ${s.totalQty} ${card.satuan||'unit'}` };
    }),
    currentValue: '',
    onSelect: (cardId) => {
      const card = multiKartuStock[cardId]; if(!card) return;
      _pickLevel2(card);
    }
  });
}

/** Update qty pada satu baris bahan baku */
function onBeliBahanBakuQtyChange(rowId, val) {
  const row = _beliBahanBakuRows.find(r => r.rowId === rowId);
  if(row) row.qty = parseFloat(val)||0;
  _updateBeliBahanBakuTotal();
}

/** Render daftar baris bahan baku ke DOM */
function renderBeliBahanBakuList() {
  const list = document.getElementById('beli-bahanbaku-list');
  if(!list) return;
  if(!_beliBahanBakuRows.length) {
    list.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:8px 0;">Belum ada bahan baku dipilih.</div>`;
  } else {
    list.innerHTML = _beliBahanBakuRows.map(row => {
      const found   = row.katId ? _findKatById(row.katId) : null;
      const saldo   = found ? getKsSaldo(found.kat) : null;
      const subInfo = saldo ? `Stok: ${saldo.totalQty} · HPP: ${fmtRp(saldo.hppNext)}/unit` : '';
      return `<div style="display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;">
        <div style="flex:1;">
          <button class="opt-picker-btn" type="button" onclick="openBeliBahanBakuPicker('${row.rowId}')">
            <span class="opt-picker-label" style="color:${row.katId?'var(--text)':'var(--muted)'};">${row.katLabel || 'Pilih bahan baku...'}</span>
            <span class="opt-picker-arrow">▾</span>
          </button>
          ${subInfo ? `<div style="font-size:10.5px;color:var(--muted);margin-top:2px;">${subInfo}</div>` : ''}
        </div>
        <div style="width:90px;">
          <input type="number" placeholder="Qty" value="${row.qty||''}" min="0" inputmode="numeric"
            onkeydown="blockNonNumeric(event)" onpaste="sanitizePaste(event,this)"
            oninput="onBeliBahanBakuQtyChange('${row.rowId}', this.value)" style="width:100%;">
        </div>
        <button type="button" onclick="removeBeliBahanBakuRow('${row.rowId}')"
          style="background:none;border:none;cursor:pointer;padding:8px 4px;margin-top:2px;">
          <i class="ti ti-trash" style="font-size:15px;color:var(--red);"></i>
        </button>
      </div>`;
    }).join('');
  }
  _updateBeliBahanBakuTotal();
}

/** Hitung total HPP dari seluruh bahan baku yang dipakai + update hint */
function _updateBeliBahanBakuTotal() {
  const hint    = document.getElementById('beli-bahanbaku-total-hint');
  const qtyJadi = parseFloat(document.getElementById('beli-produk-qty')?.value)||1;
  let total = 0, allValid = _beliBahanBakuRows.length > 0;
  _beliBahanBakuRows.forEach(row => {
    if(!row.katId || !row.qty) { allValid = false; return; }
    const found = _findKatById(row.katId);
    if(!found) { allValid = false; return; }
    const saldo = getKsSaldo(found.kat);
    total += (row.qty||0) * (saldo.hppNext||0);
  });
  if(hint) {
    if(total > 0) {
      hint.style.display = '';
      const perUnit = qtyJadi > 0 ? total/qtyJadi : total;
      hint.innerHTML = `Total HPP Bahan Baku: <b>${fmtRp(total)}</b> &nbsp;→&nbsp; HPP per unit Barang Jadi: <b>${fmtRp(perUnit)}</b>`;
    } else {
      hint.style.display = 'none';
    }
  }
  return { total, allValid };
}

/** Picker produk 2-level untuk pembelian (semua kartu stock, tidak filter lock) */
function openBeliProdukPicker() {
  const allCards = Object.values(multiKartuStock || {});
  if(!allCards.length) { showAlert('Belum ada kartu stock. Tambahkan di menu Persediaan.'); return; }

  const cur = document.getElementById('beli-produk-id')?.value || '';
  const _pickLevel2Beli = (card) => {
    const kats = Object.values(card.kategori || {});
    if(!kats.length) { showAlert('Kartu stock ini belum punya barang.'); return; }
    if(kats.length === 1) { _applyBeliProduk(kats[0].id, kats[0].nama); return; }
    openOptPicker({
      title: 'Pilih Barang — ' + card.nama,
      options: kats.map(kat => {
        const saldo = getKsSaldo(kat);
        const metodeLabel = {fifo:'FIFO',lifo:'LIFO',wa:'WA',mwa:'MWA'};
        return { value: kat.id, label: kat.nama,
          sub: `${metodeLabel[saldo.metode]||'FIFO'} · Stok: ${saldo.totalQty} ${card.satuan||'unit'}` };
      }),
      currentValue: cur,
      onSelect: (katId, label) => { _applyBeliProduk(katId, label); }
    });
  };

  if(allCards.length === 1) { _pickLevel2Beli(allCards[0]); return; }

  openOptPicker({
    title: 'Pilih Kartu Stock',
    options: allCards.map(card => {
      const s = getCardSaldo(card);
      return { value: card.id, label: card.nama,
        sub: `${Object.keys(card.kategori||{}).length} barang · Stok: ${s.totalQty} ${card.satuan||'unit'}` };
    }),
    currentValue: '',
    onSelect: (cardId) => {
      const card = multiKartuStock[cardId]; if(!card) return;
      _pickLevel2Beli(card);
    }
  });
}

/** Apply produk yang dipilih ke form pembelian */
function _applyBeliProduk(katId, label) {
  const found = _findKatById(katId);
  if(!found) return;
  const { kat, card } = found;
  document.getElementById('beli-produk-id').value = katId;
  const lbl = document.getElementById('beli-produk-label');
  if(lbl) { lbl.textContent = label || kat.nama; lbl.style.color = 'var(--text)'; }

  // Set akun jenis pembelian otomatis sesuai jenis kartu stock (jika bisa dideteksi)
  const saldo = getKsSaldo(kat);
  const metodeLabel = {fifo:'FIFO',lifo:'LIFO',wa:'Weighted Average',mwa:'Moving Average'};
  // Update label jumlah
  const jLabel = document.getElementById('beli-jumlah-label');
  if(jLabel) jLabel.textContent = 'Harga per Unit (Rp)';

  // Isi keterangan otomatis
  const ketEl = document.getElementById('beli-ket');
  if(ketEl && !ketEl.value) ketEl.value = 'Pembelian ' + (label || kat.nama);

  _updateBeliTotalHint();
}

/** Update hint total saat qty atau harga berubah */
function _updateBeliTotalHint() {
  const qty    = parseFloat(document.getElementById('beli-produk-qty')?.value)||1;
  const harga  = parseFloat(document.getElementById('beli-jumlah')?.value)||0;
  const total  = qty * harga;
  const hint   = document.getElementById('beli-total-hint');
  if(hint) {
    hint.style.display = total > 0 ? '' : 'none';
    hint.textContent   = total > 0 ? `= Total: ${fmtRp(total)}` : '';
  }
}

function onBeliQtyChange()    { _updateBeliTotalHint(); _updateBeliBahanBakuTotal(); }
function onBeliJumlahChange() { _updateBeliTotalHint(); }

/** Build jurnal lines untuk pembelian */
function _getBeliJurnalLines(akunKode, totalBeli, metode, ket) {
  const krAkun = metode === 'tunai' ? '1101' : '2101';
  const krNama = metode === 'tunai' ? 'Kas' : 'Utang Usaha';
  const akunNama = akuns.find(a=>a.kode===akunKode)?.nama || akunKode;
  return [
    { akun: akunKode, ket, debit: totalBeli, kredit: 0 },
    { akun: krAkun,   ket: krNama, debit: 0, kredit: totalBeli },
  ];
}

function previewBeli() {
  const qty          = parseFloat(document.getElementById('beli-produk-qty')?.value)||1;
  const produkId     = document.getElementById('beli-produk-id')?.value;
  const akunKode     = document.getElementById('beli-akun')?.value || '1301';
  const ket          = document.getElementById('beli-ket')?.value || 'Pembelian';
  const prev         = document.getElementById('beli-preview');

  // ── MODE PRODUKSI: Barang Jadi dari penjumlahan HPP multi bahan baku ──
  if(akunKode === '1304' && _beliBahanBakuRows.length) {
    const { total, allValid } = _updateBeliBahanBakuTotal();
    if(!allValid || !total) { if(prev) prev.style.display='none'; showAlert('Lengkapi semua bahan baku (pilih barang & isi qty) terlebih dahulu!'); return; }
    if(!produkId) { if(prev) prev.style.display='none'; showAlert('Pilih produk Barang Jadi yang diproduksi terlebih dahulu!'); return; }
    const perUnit = qty > 0 ? total/qty : total;
    const found   = _findKatById(produkId);
    const lines   = [
      { akun: '1304', ket, debit: total, kredit: 0 },
      { akun: '1302', ket: 'Pemakaian bahan baku produksi', debit: 0, kredit: total },
    ];
    if(prev) {
      prev.style.display = 'block';
      const bbInfo = _beliBahanBakuRows.map(row => {
        const f = row.katId ? _findKatById(row.katId) : null;
        const s = f ? getKsSaldo(f.kat) : null;
        return `<div style="display:flex;justify-content:space-between;">
          <span>${escapeHtml(row.katLabel)||'-'} × ${row.qty}</span><span>${fmtRp((row.qty||0)*(s?.hppNext||0))}</span>
        </div>`;
      }).join('');
      prev.innerHTML = `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;font-size:12.5px;">
        <div style="font-weight:600;margin-bottom:8px;color:var(--accent2);">Preview Jurnal — Produksi Barang Jadi</div>
        <div style="font-size:11px;color:var(--accent2);margin-bottom:8px;padding:6px 8px;background:rgba(34,211,238,0.06);border-radius:6px;">
          <i class="ti ti-package" style="font-size:12px;vertical-align:-2px;margin-right:4px;"></i>
          <b>${found ? escapeHtml(found.kat.nama) : 'Produk'}</b> · ${qty} unit @ ${fmtRp(perUnit)} = <b>${fmtRp(total)}</b>
          <div style="color:var(--muted);margin-top:4px;">Bahan baku dipakai:</div>
          ${bbInfo}
        </div>
        ${lines.map(l => {
          const a = akuns.find(x=>x.kode===l.akun);
          return `<div style="display:flex;gap:8px;margin-bottom:4px;font-family:var(--mono);">
            <span style="color:var(--muted);min-width:50px;">${escapeHtml(l.akun)}</span>
            <span style="flex:1;">${escapeHtml(a?.nama||l.akun)}</span>
            ${l.debit  ? `<span style="color:var(--accent);min-width:80px;text-align:right;">Dr ${fmtRp(l.debit)}</span>`  : '<span style="min-width:80px;"></span>'}
            ${l.kredit ? `<span style="color:var(--red);min-width:80px;text-align:right;">Kr ${fmtRp(l.kredit)}</span>` : '<span style="min-width:80px;"></span>'}
          </div>`;
        }).join('')}
      </div>`;
    }
    return;
  }

  // ── MODE NORMAL ──
  const metode       = document.getElementById('beli-metode')?.value || 'tunai';
  const hargaPerUnit = parseFloat(document.getElementById('beli-jumlah')?.value)||0;
  if(!hargaPerUnit) { if(prev) prev.style.display='none'; showAlert('Isi harga per unit terlebih dahulu!'); return; }

  const totalBeli = produkId ? hargaPerUnit * qty : hargaPerUnit;
  const lines     = _getBeliJurnalLines(akunKode, totalBeli, metode, ket);

  if(prev) {
    prev.style.display = 'block';
    const found = produkId ? _findKatById(produkId) : null;
    const saldoInfo = found ? (() => {
      const s = getKsSaldo(found.kat);
      const mLabel = {fifo:'FIFO',lifo:'LIFO',wa:'WA',mwa:'MWA'};
      return `<div style="font-size:11px;color:var(--accent2);margin-bottom:8px;padding:6px 8px;background:rgba(34,211,238,0.06);border-radius:6px;">
        <i class="ti ti-package" style="font-size:12px;vertical-align:-2px;margin-right:4px;"></i>
        <b>${escapeHtml(found.kat.nama)}</b> · ${mLabel[s.metode]||'FIFO'} · ${qty} unit @ ${fmtRp(hargaPerUnit)} = <b>${fmtRp(totalBeli)}</b>
        <br><span style="color:var(--muted);">Stok saat ini: ${s.totalQty} → setelah: ${s.totalQty + qty}</span>
      </div>` })() : '';
    prev.innerHTML = `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:12px 14px;font-size:12.5px;">
      <div style="font-weight:600;margin-bottom:8px;color:var(--accent2);">Preview Jurnal</div>
      ${saldoInfo}
      ${lines.map(l => {
        const a = akuns.find(x=>x.kode===l.akun);
        return `<div style="display:flex;gap:8px;margin-bottom:4px;font-family:var(--mono);">
          <span style="color:var(--muted);min-width:50px;">${l.akun}</span>
          <span style="flex:1;">${a?.nama||l.akun}</span>
          ${l.debit  ? `<span style="color:var(--accent);min-width:80px;text-align:right;">Dr ${fmtRp(l.debit)}</span>`  : '<span style="min-width:80px;"></span>'}
          ${l.kredit ? `<span style="color:var(--red);min-width:80px;text-align:right;">Kr ${fmtRp(l.kredit)}</span>` : '<span style="min-width:80px;"></span>'}
        </div>`;
      }).join('')}
    </div>`;
  }
}

function simpanPenjualan() {
  const tanggal = document.getElementById('jual-tanggal').value;
  const inv = document.getElementById('jual-inv').value || autoNo('INV');
  const metode = document.getElementById('jual-metode').value;
  let jumlah = parseFloat(document.getElementById('jual-jumlah').value)||0;
  // Jika mode jasa/non-barang, baca dari manual input
  if(!jumlah) {
    const manInp = document.getElementById('jual-jumlah-manual');
    if(manInp) jumlah = parseFloat(manInp.value)||0;
  }
  const hpp = parseFloat(document.getElementById('jual-hpp').value)||0; // dihitung otomatis dari kartu stock
  const ket = document.getElementById('jual-ket').value || `Penjualan ${inv}`;
  const kontakId = document.getElementById('jual-kontak-id')?.value || '';
  // Ambil akun pendapatan dari pilihan user
  const akunPendapatanKode = document.getElementById('jual-akun-pendapatan')?.value || '4101';
  const _jualOpt = _jualAkunOptions?.find(o => o.value === akunPendapatanKode);
  const akunPendapatanNama = _jualOpt ? _jualOpt.label : 'Penjualan';

  if(!tanggal) { showAlert('Pilih tanggal terlebih dahulu!'); return; }
  // Jika jenis penjualan barang/manufaktur, produk wajib dipilih
  const _jualKsId = document.getElementById('jual-produk-id')?.value;
  const _jualAkunPend = document.getElementById('jual-akun-pendapatan')?.value || '4101';
  const _isProdukJenis = (_jualAkunPend === '4101' || _jualAkunPend === '4105' || _jualAkunPend === '4107');
  if(_isProdukJenis && !_jualKsId) {
    showAlert('Pilih produk terlebih dahulu!');
    return;
  }
  if(!jumlah) {
    if(_isProdukJenis && _jualKsId) {
      showAlert('Harga jual belum diset — atur di Master Produk terlebih dahulu.');
    } else {
      showAlert('Isi jumlah penjualan terlebih dahulu!');
    }
    return;
  }
  const debAkun = metode==='tunai'?'1101':'1201';
  const debNama = metode==='tunai'?'Kas masuk':'Piutang usaha';
  addJurnal({tanggal,ket,jenis:'Penjualan',ref:inv,kontakId,lines:[
    {akun:debAkun,ket:debNama,debit:jumlah,kredit:0},
    {akun:akunPendapatanKode,ket:akunPendapatanNama,debit:0,kredit:jumlah},
  ]});
  // Auto-deduct stok & hitung HPP multi-layer (FIFO/LIFO/WA) dari kartu stock
  const _ksIdJual = document.getElementById('jual-produk-id')?.value;
  const _qtyJual  = parseFloat(document.getElementById('jual-produk-qty')?.value)||1;
  if(_ksIdJual) {
    const _foundJual = _findKatById(_ksIdJual);
    if(_foundJual) {
      activeKartuStockId = _foundJual.card.id;
      activeKategoriId = _ksIdJual;
    }
    const hppResult = deductKartuStockOnSale(_ksIdJual, _qtyJual, tanggal, ket);
    const hppReal = hppResult ? hppResult.hppBatch : (hpp || 0);
    if(hppReal > 0) {
      const overrideProduk = produkList.find(p => p.ksId === _ksIdJual);
      const akunHpp  = overrideProduk?.akunHpp  || '5101';
      const akunPers = overrideProduk?.akunPers
        || guessAkunPersediaanDefault(`${_foundJual?.kat?.nama||''} ${_foundJual?.card?.nama||''}`);
      addJurnal({ tanggal, ket: 'HPP ' + ket, jenis: 'Penjualan', ref: inv, kontakId, lines: [
        { akun: akunHpp,  ket: 'HPP', debit: hppReal, kredit: 0 },
        { akun: akunPers, ket: 'Persediaan keluar', debit: 0, kredit: hppReal },
      ]});
    }
    // ── Auto-jurnal PPN jika produk ber-PPN di master produk ──
    const _ppnProduk = produkList.find(p => p.ksId === _ksIdJual);
    if(_ppnProduk?.ppn != null && _ppnProduk.ppn > 0) {
      const _ppnNominal = Math.round(jumlah * _ppnProduk.ppn / 100);
      const _akunPpnOut = akuns.find(a=>a.kode==='2301') ? '2301'
        : akuns.find(a=>a.nama.toLowerCase().includes('ppn')&&a.tipe==='Liabilitas')?.kode || '2301';
      addJurnal({ tanggal, ket: `PPN Keluaran ${_ppnProduk.ppn}% — ${ket}`, jenis: 'PPN',
        ref: inv, kontakId, _ppnTarif: _ppnProduk.ppn, _ksId: _ksIdJual,
        lines: [
          { akun: metode==='tunai'?'1101':'1201', ket: 'Kas/Piutang PPN', debit: _ppnNominal, kredit: 0 },
          { akun: _akunPpnOut, ket: `Utang PPN Keluaran ${_ppnProduk.ppn}%`, debit: 0, kredit: _ppnNominal },
        ]
      });
    }
    if(_foundJual) {
      kartuStockTab = getKsSaldo(_foundJual.kat).metode || 'fifo';
      syncKartuStockDataFromKategori();
      if(typeof renderKartuStock === 'function') renderKartuStock();
      if(typeof renderKartuStockSelector === 'function') renderKartuStockSelector();
      _ksJustWroteDirectly = false;
    }
  } else if(hpp > 0) {
    // Fallback: tidak ada produk dipilih, pakai hpp manual dari form
    addJurnal({tanggal, ket:'HPP '+ket, jenis:'Penjualan', ref:inv, kontakId, lines:[
      {akun:'5101', ket:'HPP', debit:hpp, kredit:0},
      {akun:'1301', ket:'Persediaan', debit:0, kredit:hpp},
    ]});
  }
  // Update total transaksi di kontak jika dipilih
  if(kontakId) updateKontakTotalTrx(kontakId, jumlah, 'penjualan');
  ['jual-inv','jual-jumlah','jual-hpp','jual-ket'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  const _manReset = document.getElementById('jual-jumlah-manual');
  if(_manReset) _manReset.value = '';
  // Reset display box harga jual
  const _dispTxt = document.getElementById('jual-harga-display-text');
  if(_dispTxt) { _dispTxt.style.color = 'var(--muted)'; _dispTxt.innerHTML = '—'; }

  document.getElementById('jual-kontak-id').value = '';
  const jualKontakBtn = document.getElementById('jual-kontak-btn');
  if(jualKontakBtn){ jualKontakBtn.classList.remove('has-value'); jualKontakBtn.textContent = 'Pilih kontak...'; }
  const jualProdukId  = document.getElementById('jual-produk-id');
  const jualProdukLbl = document.getElementById('jual-produk-label');
  const jualProdukQty = document.getElementById('jual-produk-qty');
  if(jualProdukId)  jualProdukId.value = '';
  if(jualProdukLbl) { jualProdukLbl.textContent = 'Pilih produk...'; jualProdukLbl.style.color = 'var(--muted)'; }
  if(jualProdukQty) jualProdukQty.value = '1';
  if(typeof _toggleJualJumlahRow === 'function') _toggleJualJumlahRow(true);
  const _prevJual = document.getElementById('jual-preview'); if(_prevJual) _prevJual.style.display='none';
  showAlert('✓ Jurnal Penjualan berhasil disimpan!');
}

// PEMBELIAN
function simpanPembelian() {
  const tanggal      = document.getElementById('beli-tanggal')?.value;
  const faktur       = document.getElementById('beli-faktur')?.value || autoNo('PO');
  const metode       = document.getElementById('beli-metode')?.value || 'tunai';
  const hargaPerUnit = parseFloat(document.getElementById('beli-jumlah')?.value)||0;
  const qty          = parseFloat(document.getElementById('beli-produk-qty')?.value)||1;
  const akunKode     = document.getElementById('beli-akun')?.value || '1301';
  const produkId     = document.getElementById('beli-produk-id')?.value || '';
  const ket          = document.getElementById('beli-ket')?.value || `Pembelian ${faktur}`;
  const kontakId     = document.getElementById('beli-kontak-id')?.value || '';

  if(!tanggal) { showAlert('Pilih tanggal terlebih dahulu!'); return; }

  // ── MODE PRODUKSI: Barang Jadi dari penjumlahan HPP multi bahan baku ──
  if(akunKode === '1304' && _beliBahanBakuRows.length) {
    if(!produkId) { showAlert('Pilih produk Barang Jadi yang diproduksi terlebih dahulu!'); return; }
    const invalidRow = _beliBahanBakuRows.find(r => !r.katId || !r.qty || r.qty<=0);
    if(invalidRow) { showAlert('Lengkapi semua baris bahan baku (pilih barang & isi qty)!'); return; }
    // Cek stok cukup untuk setiap bahan baku sebelum diproses
    // (qty digabung per katId dulu, karena bahan baku yang sama bisa muncul di beberapa baris)
    const _kebutuhanPerKat = {};
    for(const row of _beliBahanBakuRows) {
      _kebutuhanPerKat[row.katId] = (_kebutuhanPerKat[row.katId] || 0) + row.qty;
    }
    for(const katId in _kebutuhanPerKat) {
      const totalQtyDibutuhkan = _kebutuhanPerKat[katId];
      const found = _findKatById(katId);
      const saldo = found ? getKsSaldo(found.kat) : null;
      if(!saldo || saldo.totalQty < totalQtyDibutuhkan) {
        const rowLabel = _beliBahanBakuRows.find(r => r.katId === katId)?.katLabel || katId;
        showAlert(`Stok "${rowLabel}" tidak cukup! Dibutuhkan: ${totalQtyDibutuhkan}, Tersedia: ${saldo?saldo.totalQty:0}`);
        return;
      }
    }

    // Kurangi stok tiap bahan baku (sesuai metode FIFO/LIFO/WA/MWA masing-masing) & jumlahkan HPP-nya
    let totalHpp = 0;
    _beliBahanBakuRows.forEach(row => {
      const result = deductKartuStockOnSale(row.katId, row.qty, tanggal, `Pemakaian bahan baku — ${ket}`);
      totalHpp += result.hppBatch || 0;
    });
    const hargaPerUnitJadi = qty > 0 ? totalHpp / qty : totalHpp;

    // Jurnal transfer biaya: Debit Persediaan Barang Jadi, Kredit Persediaan Bahan Baku
    addJurnal({ tanggal, ket, jenis:'Produksi', ref: faktur, kontakId, lines: [
      { akun: '1304', ket, debit: totalHpp, kredit: 0 },
      { akun: '1302', ket: 'Pemakaian bahan baku produksi', debit: 0, kredit: totalHpp },
    ]});

    // Tambahkan Barang Jadi ke kartu stock dengan HPP = penjumlahan HPP bahan baku
    const foundJadi = _findKatById(produkId);
    if(foundJadi) {
      activeKartuStockId = foundJadi.card.id;
      activeKategoriId = produkId;
      addKartuStockOnBuy(produkId, qty, hargaPerUnitJadi, tanggal, ket);
      kartuStockTab = getKsSaldo(foundJadi.kat).metode || 'fifo';
      syncKartuStockDataFromKategori();
      if(typeof renderKartuStock === 'function') { try { renderKartuStock(); } catch(e) {} }
      if(typeof renderKartuStockSelector === 'function') { try { renderKartuStockSelector(); } catch(e) {} }
      _ksJustWroteDirectly = false;
    }

    if(kontakId) updateKontakTotalTrx(kontakId, totalHpp, 'pembelian');

    // ── Reset form ──
    _beliBahanBakuRows = [];
    ['beli-faktur','beli-ket'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
    const _beliQtyReset = document.getElementById('beli-produk-qty'); if(_beliQtyReset) _beliQtyReset.value = '1';
    document.getElementById('beli-kontak-id').value = '';
    const _beliKontakBtnReset = document.getElementById('beli-kontak-btn');
    if(_beliKontakBtnReset) { _beliKontakBtnReset.classList.remove('has-value'); _beliKontakBtnReset.textContent = 'Pilih kontak...'; }
    const _beliProdukIdReset  = document.getElementById('beli-produk-id');
    const _beliProdukLblReset = document.getElementById('beli-produk-label');
    if(_beliProdukIdReset)  _beliProdukIdReset.value = '';
    if(_beliProdukLblReset) { _beliProdukLblReset.textContent = 'Pilih produk...'; _beliProdukLblReset.style.color = 'var(--muted)'; }
    renderBeliBahanBakuList();
    const _prevBeliReset = document.getElementById('beli-preview'); if(_prevBeliReset) _prevBeliReset.style.display='none';

    renderDashboard();
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Produksi Barang Jadi berhasil disimpan & kartu stock diperbarui!');
    return;
  }

  // Jika akun adalah persediaan, produk wajib dipilih
  const _isPersediaanAkun = ['1301','1302','1303','1304'].includes(akunKode) ||
    (akuns.find(a=>a.kode===akunKode)?.tipe === 'Persediaan') ||
    (akuns.find(a=>a.kode===akunKode)?.tipe === 'Aset Lancar');
  if(_isPersediaanAkun && !produkId) {
    showAlert('Pilih produk terlebih dahulu!');
    return;
  }
  if(!hargaPerUnit) { showAlert('Isi harga per unit terlebih dahulu!'); return; }

  // Total = harga × qty (jika ada produk), atau langsung harga (jika tanpa produk)
  const totalBeli = produkId ? hargaPerUnit * qty : hargaPerUnit;

  // Build jurnal lines
  const lines = _getBeliJurnalLines(akunKode, totalBeli, metode, ket);

  addJurnal({ tanggal, ket, jenis:'Pembelian', ref: faktur, kontakId, lines });

  // ── Auto-jurnal PPN Masukan jika produk ber-PPN di master produk ──
  if(produkId) {
    const _ppnProdukBeli = produkList.find(p => p.ksId === produkId);
    if(_ppnProdukBeli?.ppn != null && _ppnProdukBeli.ppn > 0) {
      const _ppnNominalBeli = Math.round(totalBeli * _ppnProdukBeli.ppn / 100);
      const _akunPpnIn = akuns.find(a=>a.kode==='1502') ? '1502'
        : akuns.find(a=>a.nama.toLowerCase().includes('ppn masukan'))?.kode || '1502';
      const _akunKasHutang = metode === 'tunai' ? '1101' : '2101';
      addJurnal({ tanggal, ket: `PPN Masukan ${_ppnProdukBeli.ppn}% — ${ket}`, jenis: 'PPN',
        ref: faktur, kontakId, _ppnTarif: _ppnProdukBeli.ppn, _ksId: produkId,
        lines: [
          { akun: _akunPpnIn,      ket: `PPN Masukan ${_ppnProdukBeli.ppn}%`, debit: _ppnNominalBeli, kredit: 0 },
          { akun: _akunKasHutang,  ket: 'Kas/Utang PPN Masukan',              debit: 0, kredit: _ppnNominalBeli },
        ]
      });
    }
  }

  // ── Auto-update kartu stock jika produk dipilih ──────────────
  if(produkId) {
    const found = _findKatById(produkId);
    if(found) {
      const { kat, card } = found;
      activeKartuStockId = card.id;
      activeKategoriId = produkId;
      addKartuStockOnBuy(produkId, qty, hargaPerUnit, tanggal, ket);
      kartuStockTab = getKsSaldo(kat).metode || 'fifo';
      syncKartuStockDataFromKategori();
      if(typeof renderKartuStock === 'function') {
        try { renderKartuStock(); } catch(e) {}
      }
      if(typeof renderKartuStockSelector === 'function') {
        try { renderKartuStockSelector(); } catch(e) {}
      }
      _ksJustWroteDirectly = false;
    }
  }

  // Update total di kontak
  if(kontakId) updateKontakTotalTrx(kontakId, totalBeli, 'pembelian');

  // ── Reset form ───────────────────────────────────────────────
  ['beli-faktur','beli-jumlah','beli-ket'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  const beliQty = document.getElementById('beli-produk-qty');
  if(beliQty) beliQty.value = '1';
  document.getElementById('beli-kontak-id').value = '';
  const beliKontakBtn = document.getElementById('beli-kontak-btn');
  if(beliKontakBtn) { beliKontakBtn.classList.remove('has-value'); beliKontakBtn.textContent = 'Pilih kontak...'; }
  // Reset produk picker
  const beliProdukId  = document.getElementById('beli-produk-id');
  const beliProdukLbl = document.getElementById('beli-produk-label');
  if(beliProdukId)  beliProdukId.value = '';
  if(beliProdukLbl) { beliProdukLbl.textContent = 'Pilih produk...'; beliProdukLbl.style.color = 'var(--muted)'; }
  // Reset akun ke default persediaan agar produk row tetap terlihat
  const beliAkunEl  = document.getElementById('beli-akun');
  const beliAkunLbl = document.getElementById('beli-akun-label');
  if(beliAkunEl)  beliAkunEl.value = '1301';
  if(beliAkunLbl) beliAkunLbl.textContent = 'Persediaan Barang Dagangan';
  // Pastikan produk row tetap visible setelah reset
  const produkRowReset = document.getElementById('beli-produk-row');
  if(produkRowReset) produkRowReset.style.display = '';
  // Reset hint
  const hint = document.getElementById('beli-total-hint');
  if(hint) hint.style.display = 'none';
  const _prevBeli = document.getElementById('beli-preview');
  if(_prevBeli) _prevBeli.style.display = 'none';

  renderDashboard();
  showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Jurnal Pembelian berhasil disimpan' + (produkId ? ' & kartu stock diperbarui!' : '!'));
}

// MANUAL
let manualLineId = 0;
function initManualLines() {
  document.getElementById('manual-lines').innerHTML='';
  manualLineId=0;
  addManualLine(); addManualLine();
}
function addManualLine() {
  const id = manualLineId++;
  const div = document.createElement('div');
  div.className='jurnal-line-row'; div.id=`ml-${id}`;
  const akunOpts = akuns.map(a=>`<option value="${escapeHtml(a.kode)}">${escapeHtml(a.kode)} - ${escapeHtml(a.nama)}</option>`).join('');
  const firstAkun = akuns[0];
  div.innerHTML=`
    <select onchange="syncAkunTrigger(this)">${akunOpts}</select>
    <button class="akun-trigger-btn" type="button" onclick="openAkunPicker(this)" data-line-id="ml-${id}">${firstAkun?escapeHtml(firstAkun.kode+' - '+firstAkun.nama):'Pilih Akun...'}</button>
    <input type="text" placeholder="Keterangan">
    <input type="number" placeholder="0" oninput="updateBalance()">
    <input type="number" placeholder="0" oninput="updateBalance()">
    <button class="remove-line" onclick="removeLine('ml-${id}')">✕</button>`;
  document.getElementById('manual-lines').appendChild(div);
}
function removeLine(id) {
  document.getElementById(id)?.remove();
  updateBalance();
}
function updateBalance() {
  let td=0,tk=0;
  document.querySelectorAll('#manual-lines .jurnal-line-row').forEach(row=>{
    const ins = row.querySelectorAll('input[type=number]');
    td+=parseFloat(ins[0]?.value)||0;
    tk+=parseFloat(ins[1]?.value)||0;
  });
  const bal = document.getElementById('manual-balance');
  const ok = Math.abs(td-tk)<0.01;
  bal.innerHTML=`Total Debit: <span style="color:var(--accent)">${fmtRp(td)}</span> &nbsp;|&nbsp; Total Kredit: <span style="color:var(--red)">${fmtRp(tk)}</span> &nbsp;|&nbsp; <span style="color:${ok?'var(--accent)':'var(--red)'};">${ok?'✓ Balance':'✗ Tidak Balance'}</span>`;
}
function simpanManual() {
  const tanggal = document.getElementById('man-tanggal').value;
  const ket = document.getElementById('man-ket').value || 'Jurnal Manual';
  const lines=[];
  document.querySelectorAll('#manual-lines .jurnal-line-row').forEach(row=>{
    const sel=row.querySelector('select');
    const inps=row.querySelectorAll('input');
    const d=parseFloat(inps[1]?.value)||0;
    const k=parseFloat(inps[2]?.value)||0;
    if(d||k) lines.push({akun:sel.value,ket:inps[0].value,debit:d,kredit:k});
  });
  if(!tanggal){showAlert('Pilih tanggal terlebih dahulu!');return;}
  if(lines.length<2){showAlert('Lengkapi data jurnal!');return;}
  const td=lines.reduce((s,l)=>s+l.debit,0);
  const tk=lines.reduce((s,l)=>s+l.kredit,0);
  if(Math.abs(td-tk)>0.01){showAlert('Jurnal tidak balance!');return;}
  addJurnal({tanggal,ket,jenis:'Manual',lines});
  document.getElementById('man-ket').value='';
  initManualLines();
  showAlert('✓ Jurnal Manual berhasil disimpan!');
}

// LEDGER CALC
function getSaldoAkun(kode) {
  let d=0,k=0;
  jurnalEntries.forEach(j=>j.lines.forEach(l=>{
    if(l.akun===kode){d+=l.debit||0;k+=l.kredit||0;}
  }));
  const akun = akuns.find(a=>a.kode===kode);
  return akun?.normal==='D' ? d-k : k-d;
}

// ── Handle jenis penjualan: sembunyikan produk saat bukan penjualan barang ──
function onJualJenisChange(value) {
  const isProduk = (value === '4101' || value === '4105' || value === '4107'); // Barang, Manufaktur & Bahan Baku pakai produk picker
  const produkRow = document.getElementById('jual-produk-row');
  if(produkRow) produkRow.style.display = isProduk ? '' : 'none';

  if(isProduk) {
    // Mode barang: display-only, reset ke "-"
    _setJualJumlahMode(true);
    const _dt = document.getElementById('jual-harga-display-text');
    if(_dt) { _dt.style.color = 'var(--muted)'; _dt.innerHTML = '—'; }
    const _hv = document.getElementById('jual-jumlah'); if(_hv) _hv.value = '0';
  } else {
    // Jasa/Properti/dll — reset produk, aktifkan manual input
    const idEl  = document.getElementById('jual-produk-id');
    const lblEl = document.getElementById('jual-produk-label');
    const hppEl = document.getElementById('jual-hpp');
    if(idEl)  idEl.value  = '';
    if(lblEl) { lblEl.textContent = 'Pilih produk...'; lblEl.style.color = 'var(--muted)'; }
    if(hppEl) hppEl.value = '0';
    _setJualJumlahMode(false);
  }
}

function _toggleJualJumlahRow(show) {
  // Row selalu visible. Tetap ada untuk kompatibilitas.
  const group = document.getElementById('jual-jumlah-group');
  if(group) group.style.display = '';
}

/** Aktifkan mode display-only (produk barang) atau editable (jasa/dll) */
function _setJualJumlahMode(isDisplayOnly) {
  const displayBox  = document.getElementById('jual-harga-display');
  const hiddenInput = document.getElementById('jual-jumlah');
  const label       = document.querySelector('#jual-jumlah-group label');
  const manualInput = document.getElementById('jual-jumlah-manual');

  if(isDisplayOnly) {
    // Mode barang: tampilkan display box, sembunyikan manual input
    if(displayBox)  displayBox.style.display  = 'flex';
    if(manualInput) manualInput.style.display = 'none';
    if(label) label.textContent = 'Harga Jual';
  } else {
    // Mode jasa/dll: sembunyikan display box, tampilkan manual input
    if(displayBox)  displayBox.style.display  = 'none';
    const _dt = document.getElementById('jual-harga-display-text');
    if(_dt) { _dt.style.color='var(--muted)'; _dt.innerHTML='—'; }
    const _hw = document.getElementById('jual-harga-warning'); if(_hw) _hw.remove();
    if(hiddenInput) hiddenInput.value = '0';
    // Buat manual input kalau belum ada
    if(!manualInput) {
      const inp = document.createElement('input');
      inp.type = 'number'; inp.id = 'jual-jumlah-manual';
      inp.placeholder = '0'; inp.inputMode = 'numeric';
      inp.style.cssText = 'width:100%;';
      inp.addEventListener('input', function() {
        const hv = document.getElementById('jual-jumlah');
        if(hv) hv.value = this.value;
      });
      const group = document.getElementById('jual-jumlah-group');
      if(group) group.appendChild(inp);
    } else {
      manualInput.style.display = '';
    }
    if(label) label.textContent = 'Jumlah Penjualan (Rp)';
  }
}

// ══════════════════════════════════════════════════════════
// PRIORITAS 2 — MODE CEPAT / SIMPEL (tanpa tahu debit/kredit)
// ══════════════════════════════════════════════════════════

let _simpelTipe = 'masuk';
let _simpelJenisPenjualan = '4101'; // akun pendapatan untuk tipe jual
let _simpelJenisPembelian = '1301'; // akun persediaan untuk tipe beli

const _beliAkunOptions = [
  { value: '1301', label: 'Persediaan Barang Dagangan', sub: 'Akun 1301 · Stok barang untuk dijual',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>` },
  { value: '1302', label: 'Persediaan Bahan Baku', sub: 'Akun 1302 · Bahan mentah untuk produksi',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>` },
  { value: '1303', label: 'Barang Dalam Proses', sub: 'Akun 1303 · Persediaan WIP / setengah jadi',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>` },
  { value: '1304', label: 'Persediaan Barang Jadi', sub: 'Akun 1304 · Produk siap jual dari manufaktur',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>` },
  { value: '1401', label: 'Perlengkapan Kantor', sub: 'Akun 1401 · Supplies / ATK kantor',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>` },
  { value: '5101', label: 'HPP / Beban Pembelian', sub: 'Akun 5101 · Langsung ke beban HPP',
    icon: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>` },
];

function openSimpelJenisPembelianPicker() {
  openOptPicker({
    title: 'Pilih Jenis Pembelian',
    options: _beliAkunOptions.map(o => ({ value: o.value, label: o.label, icon: o.icon, sub: o.sub })),
    currentValue: _simpelJenisPembelian,
    onSelect: (val, label) => {
      _simpelJenisPembelian = val;
      const lbl = document.getElementById('simpel-jenis-pembelian-label');
      if(lbl) lbl.textContent = label;
    }
  });
}

const _simpelTipeOptions = [
  { value:'masuk',  label:'Uang Masuk',  icon:'<i class="ti ti-arrow-up-circle" style="font-size:14px;vertical-align:-2px;margin-right:6px;color:var(--accent);"></i>',  sub:'Penerimaan kas, modal, piutang' },
  { value:'keluar', label:'Uang Keluar', icon:'<i class="ti ti-arrow-down-circle" style="font-size:14px;vertical-align:-2px;margin-right:6px;color:var(--red);"></i>',    sub:'Pengeluaran kas, beban operasional' },
];

function _updateSimpelJumlahLabel() {
  const lbl   = document.getElementById('simpel-jumlah-label');
  const hint  = document.getElementById('simpel-total-hint');
  const katId = document.getElementById('simpel-produk-id')?.value;
  const isBeli = _simpelTipe === 'beli';
  const hasProduk = isBeli && katId;

  if(lbl) lbl.textContent = hasProduk ? 'Harga per Unit (Rp)' : 'Jumlah (Rp)';

  // Update total hint
  if(hasProduk && hint) {
    const qty    = parseFloat(document.getElementById('simpel-qty')?.value)||1;
    const harga  = parseFloat(document.getElementById('simpel-jumlah')?.value)||0;
    const total  = harga * qty;
    hint.style.display = total > 0 ? '' : 'none';
    hint.textContent   = total > 0 ? `= Total: ${fmtRp(total)}` : '';
  } else if(hint) {
    hint.style.display = 'none';
  }
}

function openSimpelJenisPenjualanPicker() {
  // Pakai openOptPicker dengan opsi identik seperti picker di tab Penjualan
  openOptPicker({
    title: 'Pilih Jenis Penjualan',
    options: _jualAkunOptions.map(o => ({
      value: o.value,
      label: o.label,
      icon: o.icon,   // icon hanya di dalam sheet
      sub: o.sub,
    })),
    currentValue: _simpelJenisPenjualan,
    onSelect: (val, label) => {
      _simpelJenisPenjualan = val;
      const lbl = document.getElementById('simpel-jenis-penjualan-label');
      if(lbl) lbl.textContent = label; // tanpa icon di label luar
      // Tampilkan/sembunyikan produk picker sesuai jenis
      const isProduk = (val === '4101' || val === '4105' || val === '4107');
      const wrap = document.getElementById('simpel-produk-wrap');
      if(wrap) wrap.style.display = isProduk ? 'grid' : 'none';
    }
  });
}

function openSimpelTipePicker() {
  openOptPicker({
    title: 'Jenis Transaksi',
    options: _simpelTipeOptions.map(o => ({
      value: o.value,
      label: o.label,
      icon: o.icon,   // icon hanya tampil di dalam sheet
      sub: o.sub,
    })),
    currentValue: _simpelTipe,
    onSelect: (val, label) => {
      setSimpelTipe(val);
    }
  });
}

function setSimpelTipe(tipe) {
  _simpelTipe = tipe;
  const opt = _simpelTipeOptions.find(o => o.value === tipe);
  const lbl = document.getElementById('simpel-tipe-label');
  if(lbl && opt) lbl.textContent = opt.label;

  const ketMap = {
    masuk:  'Contoh: Terima modal, Penerimaan piutang...',
    keluar: 'Contoh: Bayar listrik, Gaji karyawan...',
  };
  const ketEl = document.getElementById('simpel-ket');
  if(ketEl) ketEl.placeholder = ketMap[tipe] || '';
  document.getElementById('simpel-jurnal-preview').style.display = 'none';
}

function getSimpelJurnalLines(tipe, jumlah, ketEl) {
  const ket = ketEl || 'Transaksi';
  if(tipe === 'masuk') {
    return [
      { akun:'1101', ket, debit: jumlah, kredit: 0 },
      { akun:'3101', ket: 'Modal / Penerimaan', debit: 0, kredit: jumlah },
    ];
  }
  if(tipe === 'keluar') {
    const akunBeban = akuns.find(a=>a.tipe==='Beban'&&a.kode==='6101')
                   || akuns.find(a=>a.tipe==='Beban')
                   || {kode:'6101'};
    return [
      { akun: akunBeban.kode, ket, debit: jumlah, kredit: 0 },
      { akun:'1101', ket, debit: 0, kredit: jumlah },
    ];
  }
  return [];
}

function previewSimpel() {
  const ket    = document.getElementById('simpel-ket')?.value.trim() || 'Transaksi';
  const jumlah = parseFloat(document.getElementById('simpel-jumlah')?.value)||0;
  if(!jumlah) { showAlert('Isi jumlah terlebih dahulu!'); return; }
  const lines = getSimpelJurnalLines(_simpelTipe, jumlah, ket);
  const el = document.getElementById('simpel-jurnal-preview');
  el.style.display = 'block';
  el.innerHTML = `<div style="font-size:11px;color:var(--accent2);font-weight:700;margin-bottom:8px;letter-spacing:0.06em;">JURNAL YANG AKAN DIBUAT:</div>` +
    lines.map(l => {
      const a = akuns.find(x=>x.kode===l.akun);
      return `<div style="display:flex;gap:8px;margin-bottom:4px;">
        <span style="color:var(--muted);min-width:80px;">${l.akun}</span>
        <span style="flex:1;color:var(--text);">${a?.nama||l.akun}</span>
        ${l.debit  ? `<span style="color:var(--accent);min-width:80px;text-align:right;">Dr ${fmtRp(l.debit)}</span>` : '<span style="min-width:80px;"></span>'}
        ${l.kredit ? `<span style="color:var(--red);min-width:80px;text-align:right;">Kr ${fmtRp(l.kredit)}</span>` : '<span style="min-width:80px;"></span>'}
      </div>`;
    }).join('');
}

function simpanSimpel() {
  const tanggal = document.getElementById('simpel-tanggal')?.value;
  const jumlah  = parseFloat(document.getElementById('simpel-jumlah')?.value)||0;
  const ket     = document.getElementById('simpel-ket')?.value.trim();

  if(!tanggal) { showAlert('Pilih tanggal terlebih dahulu!'); return; }
  if(!jumlah)  { showAlert('Isi jumlah terlebih dahulu!'); return; }
  if(!ket)     { showAlert('Isi keterangan!'); return; }

  const lines = getSimpelJurnalLines(_simpelTipe, jumlah, ket);
  if(!lines.length) { showAlert('Tipe transaksi tidak valid'); return; }

  showOpSpinner('Menyimpan transaksi...', ket);
  setTimeout(() => {
    addJurnal({ tanggal, ket, jenis: 'Kas', lines });
    document.getElementById('simpel-jumlah').value = '';
    document.getElementById('simpel-ket').value    = '';
    document.getElementById('simpel-jurnal-preview').style.display = 'none';
    hideOpSpinner();
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Transaksi berhasil disimpan!');
    renderDashboard();
  }, 400);
}

// ══════════════════════════════════════════════════════════
// PRIORITAS 3 — BEBAN USAHA DI DASHBOARD
// ══════════════════════════════════════════════════════════

function renderDashBebanPajak() {
  const fmtS = v => {
    if(Math.abs(v)>=1e9) return 'Rp '+(v/1e9).toFixed(1)+' M';
    if(Math.abs(v)>=1e6) return 'Rp '+(v/1e6).toFixed(1)+' jt';
    return fmtRp(v);
  };

  // ── BEBAN USAHA ──
  const bebanEl  = document.getElementById('dash-beban-content');
  const bebanSub = document.getElementById('dash-beban-sub');
  if(bebanEl) {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const fromStr = `${y}-${String(m+1).padStart(2,'0')}-01`;
    const toStr   = new Date(y, m+1, 0).toISOString().split('T')[0];

    const bebanAkuns = akuns.filter(a => a.tipe==='Beban'||a.tipe==='HPP');
    let totalBeban = 0;
    const rows = [];
    bebanAkuns.forEach(a => {
      // Hitung beban bulan ini saja
      let d = 0;
      jurnalEntries.filter(j => j.tanggal >= fromStr && j.tanggal <= toStr).forEach(j =>
        j.lines.forEach(l => { if(l.akun===a.kode) d += l.debit||0; })
      );
      if(!d) return;
      totalBeban += d;
      rows.push({ nama: a.nama, kode: a.kode, val: d, tipe: a.tipe });
    });
    rows.sort((a,b) => b.val - a.val);

    if(!rows.length) {
      bebanEl.innerHTML = emptyState('Belum ada beban', 'Tambah transaksi baru untuk memulai');
      if(bebanSub) bebanSub.textContent = 'Belum ada pengeluaran tercatat';
    } else {
      if(bebanSub) bebanSub.textContent = `${rows.length} akun · ${now.toLocaleDateString('id-ID',{month:'long'})}`;
      bebanEl.innerHTML = `
        <div style="padding:10px 16px 4px;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 12px;background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.15);border-radius:8px;margin-bottom:6px;">
            <span style="font-size:12px;color:var(--muted);font-weight:600;">TOTAL BEBAN BLN INI</span>
            <span style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--red);">${fmtRp(totalBeban)}</span>
          </div>
        </div>
        <table style="width:100%;"><tbody>
          ${rows.map(r => {
            const pct = Math.round((r.val/totalBeban)*100);
            return `<tr style="border-bottom:1px solid var(--border);">
              <td style="padding:7px 16px;">
                <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px;">
                  <span style="font-size:12px;font-weight:500;">${r.nama}</span>
                  <span style="font-family:var(--mono);font-size:12px;color:var(--red);">${fmtS(r.val)}</span>
                </div>
                <div style="height:3px;background:var(--border);border-radius:2px;">
                  <div style="height:100%;width:${pct}%;background:var(--red);border-radius:2px;opacity:0.7;"></div>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody></table>`;
    }
  }

  // ── REKAP PAJAK MINI DI DASHBOARD ──
  const pajakEl  = document.getElementById('dash-pajak-rekap');
  const pajakSub = document.getElementById('dash-pajak-sub');
  if(pajakEl) {
    const now2 = new Date();
    const y2 = now2.getFullYear(), m2 = now2.getMonth();
    const fromStr2 = `${y2}-${String(m2+1).padStart(2,'0')}-01`;
    const toStr2   = new Date(y2, m2+1, 0).toISOString().split('T')[0];

    const penjBln = jurnalEntries.filter(j => j.jenis==='Penjualan' && j.tanggal>=fromStr2 && j.tanggal<=toStr2);
    const beliBln = jurnalEntries.filter(j => j.jenis==='Pembelian' && j.tanggal>=fromStr2 && j.tanggal<=toStr2);

    const totalPenj = penjBln.reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const a=akuns.find(x=>x.kode===l.akun);return ss+(a?.tipe==='Pendapatan'?l.kredit:0);},0),0);
    const totalBeli = beliBln.reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const a=akuns.find(x=>x.kode===l.akun);return ss+(['HPP','Beban'].includes(a?.tipe)?l.debit:0);},0),0);
    const ppnKeluar = totalPenj * 0.12;
    const ppnMasuk  = totalBeli * 0.12;
    const kurangBayar = Math.max(0, ppnKeluar - ppnMasuk);

    if(pajakSub) pajakSub.textContent = `${now2.toLocaleDateString('id-ID',{month:'long',year:'numeric'})}`;

    pajakEl.innerHTML = `
      <div style="padding:10px 16px 12px;display:flex;flex-direction:column;gap:8px;">
        ${[
          ['PPN Keluaran (12% × Penjualan)', ppnKeluar, 'var(--red)'],
          ['PPN Masukan (12% × Pembelian)', ppnMasuk, 'var(--accent)'],
          ['PPN Kurang Bayar', kurangBayar, kurangBayar>0?'var(--accent3)':'var(--muted)'],
        ].map(([l,v,clr])=>`
          <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 10px;background:var(--surface2);border-radius:8px;">
            <span style="font-size:12px;color:var(--muted);">${l}</span>
            <span style="font-family:var(--mono);font-size:13px;font-weight:700;color:${clr};">${fmtRp(v)}</span>
          </div>`).join('')}
        <button onclick="showPage('pajak')" style="width:100%;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:7px;padding:7px;font-size:12px;font-weight:600;color:var(--accent3);cursor:pointer;font-family:var(--sans);margin-top:2px;">
          <i class="ti ti-receipt-tax ti-inline"></i> Lihat Rekap Lengkap & Cetak
        </button>
      </div>`;
  }
}
