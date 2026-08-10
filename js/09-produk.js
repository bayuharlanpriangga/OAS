
function openProdukFilterKatPicker() {
  const cardId = document.getElementById('produk-filter-card')?.value || '';
  const card   = multiKartuStock[cardId];
  if(!card) return;
  const kats   = Object.values(card.kategori || {});
  openOptPicker({
    title: 'Filter Kategori',
    options: [
      { value: '', label: 'Semua Kategori', sub: card.nama },
      ...kats.map(k => { const s = getKsSaldoKat(k); return { value: k.id, label: k.nama, sub: `Stok: ${s.totalQty} · HPP: ${fmtRp(s.hppNext)}` }; })
    ],
    currentValue: document.getElementById('produk-filter-kat')?.value || '',
    onSelect: (val, label) => {
      document.getElementById('produk-filter-kat').value = val;
      document.getElementById('produk-filter-kat-label').textContent = label || 'Semua Kategori';
      renderProduk();
    }
  });
}

function renderProduk() {
  const search   = (document.getElementById('produk-search')?.value||'').toLowerCase();
  const tbody    = document.getElementById('produk-tbody');
  const sub      = document.getElementById('produk-count-sub');
  if(!tbody) return;

  const filterCardId = document.getElementById('produk-filter-card')?.value || '';
  const cards = Object.values(multiKartuStock || {});
  const ksList = [];
  cards.forEach(card => {
    if (filterCardId && card.id !== filterCardId) return;
    Object.values(card.kategori || {}).forEach(kat => {
      ksList.push({ ...kat, _cardNama: card.nama, _cardId: card.id });
    });
  });

  if(!ksList.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:40px;">
      <i class="ti ti-package" style="font-size:28px;display:block;margin-bottom:10px;opacity:0.4;"></i>
      Belum ada kartu stock persediaan.<br>
      <span style="font-size:12px;">Tambahkan di menu <b>Persediaan → + Kartu Stock</b> terlebih dahulu.</span>
    </td></tr>`;
    if(sub) sub.textContent = '0 produk terdeteksi dari kartu stock';
    return;
  }

  const filtered = ksList.filter(ks =>
    !search || ks.nama.toLowerCase().includes(search) || (ks._cardNama||'').toLowerCase().includes(search)
  );

  if(sub) sub.textContent = `${ksList.length} produk terdeteksi dari kartu stock persediaan`;

  const metodeLabel = { fifo:'FIFO', lifo:'LIFO', wa:'Weighted Avg', mwa:'Moving WA' };
  const metodeBadge = {
    fifo: 'background:rgba(74,222,128,0.12);color:var(--accent);border:1px solid rgba(74,222,128,0.3);',
    lifo: 'background:rgba(34,211,238,0.12);color:var(--accent2);border:1px solid rgba(34,211,238,0.3);',
    wa:   'background:rgba(245,158,11,0.12);color:var(--accent3);border:1px solid rgba(245,158,11,0.3);',
    mwa:  'background:rgba(245,158,11,0.12);color:var(--accent3);border:1px solid rgba(245,158,11,0.3);',
  };

  if(!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:32px;">Tidak ada produk yang cocok</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(ks => {
    const saldo = getKsSaldo(ks);
    // Harga jual: produkList bisa match by katId atau cardId
    const override   = produkList.find(p => p.ksId === ks.id || p.ksId === ks._cardId);
    const hargaJual  = override?.hargaJual || 0;
    const ppnTarif   = (override?.ppn != null && override.ppn > 0) ? override.ppn : null;
    const akunPend   = override?.akunPend  || '4101';
    const akunHpp    = override?.akunHpp   || '5101';
    const akunPers   = override?.akunPers  || guessAkunPersediaanDefault(`${escapeHtml(ks.nama||'')} ${ks._cardNama||''}`);
    const akunPendNm = akuns.find(a=>a.kode===akunPend)?.nama || akunPend;
    const akunPersNm = akuns.find(a=>a.kode===akunPers)?.nama || akunPers;

    const stokColor  = saldo.totalQty <= 0 ? 'var(--red)' : saldo.totalQty <= 5 ? 'var(--accent3)' : 'var(--accent)';

    // Badge metode: tampilkan semua metode yang punya saldo aktif (multi-konversi tanpa hapus)
    const activeMethods = saldo.allMetodeWithSaldo && saldo.allMetodeWithSaldo.length > 0
      ? saldo.allMetodeWithSaldo
      : [saldo.metode];
    const badgeHtml = activeMethods.map(m => {
      const bs = metodeBadge[m] || '';
      const lbl = metodeLabel[m] || m;
      return `<span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:5px;${bs};white-space:nowrap;">${lbl}</span>`;
    }).join('<span style="color:var(--muted);font-size:9px;margin:0 2px;">+</span>');

    // Peringatan multi-metode
    const multiMetodeWarn = activeMethods.length > 1
      ? `<div style="font-size:9px;color:var(--accent3);margin-top:3px;"><i class="ti ti-alert-triangle" style="font-size:9px;vertical-align:-1px;"></i> ${activeMethods.length} metode aktif</div>`
      : '';

    // Layer detail (hanya FIFO)
    let layerDetail = '';
    if(saldo.metode === 'fifo' && saldo.layers.length > 1) {
      layerDetail = saldo.layers.map(l =>
        `<div style="font-size:10px;color:var(--muted);">${l.qty} unit @ ${fmtRp(l.harga)}</div>`
      ).join('');
    }

    // Badge PPN
    const ppnBadge = ppnTarif != null
      ? `<span style="font-size:9px;font-weight:700;padding:1px 6px;border-radius:4px;background:rgba(250,204,21,0.12);color:#facc15;border:1px solid rgba(250,204,21,0.3);white-space:nowrap;">PPN ${ppnTarif}%</span>`
      : `<span style="font-size:9px;color:var(--muted);">Non-PKP</span>`;

    // Harga jual + harga inkl. PPN jika ada
    let hargaJualCell;
    if(hargaJual) {
      const hargaInkl = ppnTarif != null ? Math.round(hargaJual * (1 + ppnTarif/100)) : null;
      hargaJualCell = `<div style="font-weight:600;">${fmtRp(hargaJual)}</div>`
        + (hargaInkl != null ? `<div style="font-size:10px;color:var(--muted);">incl. PPN: ${fmtRp(hargaInkl)}</div>` : '');
    } else {
      hargaJualCell = '<span style="font-size:11px;color:var(--muted);">Belum diset</span>';
    }

    return `<tr>
      <td style="font-weight:600;font-size:13px;">
        <div style="font-size:10px;color:var(--muted);font-weight:400;margin-bottom:2px;">${ks._cardNama||''}</div>
        ${ks.nama}
        ${ks.deskripsi ? `<div style="font-size:11px;color:var(--muted);font-weight:400;">${ks.deskripsi}</div>` : ''}
      </td>
      <td style="font-size:12px;color:var(--muted);">${ks.satuan||'unit'}</td>
      <td>
        ${badgeHtml}${multiMetodeWarn}
      </td>
      <td style="text-align:right;font-family:var(--mono);font-weight:700;color:${stokColor};">
        ${saldo.totalQty.toLocaleString('id-ID')} <span style="font-size:10px;font-weight:400;color:var(--muted);">${ks.satuan||'unit'}</span>
      </td>
      <td style="text-align:right;font-family:var(--mono);font-size:12px;">
        <div style="color:var(--text);font-weight:600;">${fmtRp(saldo.hppNext)}</div>
        ${layerDetail}
        <div style="font-size:10px;color:var(--muted);">Total: ${fmtRp(saldo.totalNilai)}</div>
      </td>
      <td style="text-align:right;font-family:var(--mono);font-size:13px;color:${hargaJual?'var(--accent)':'var(--muted)'};">
        ${hargaJualCell}
      </td>
      <td style="text-align:center;">${ppnBadge}</td>
      <td style="font-size:11px;color:var(--muted);">
        ${akunPendNm}
        <div style="font-size:10px;color:var(--muted);opacity:.8;margin-top:2px;">Persediaan: ${akunPersNm}</div>
      </td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="openModalEditProdukHarga('${ks.id}','${ks._cardId}')" title="Edit harga jual & akun">
          <i class="ti ti-pencil" style="font-size:12px;"></i> Edit
        </button>
      </td>
    </tr>`;
  }).join('');
}

/**
 * Modal edit — hanya harga jual & akun. HPP read-only dari kartu stock.
 */
function openModalEditProdukHarga(katId, cardId) {
  const card = cardId ? multiKartuStock[cardId] : null;
  const ks   = card?.kategori?.[katId] || multiKartuStock[katId]; // fallback legacy
  if(!ks) return;
  const override = produkList.find(p => p.ksId === katId);
  const saldo    = getKsSaldo(ks);
  const metodeLabel = { fifo:'FIFO', lifo:'LIFO', wa:'Weighted Average', mwa:'Moving WA' };

  document.getElementById('modal-produk-title').textContent = `Edit: ${ks.nama}`;
  document.getElementById('produk-edit-id').value    = katId;
  document.getElementById('produk-nama').value       = ks.nama;
  document.getElementById('produk-satuan').value     = ks.satuan||'unit';
  document.getElementById('produk-harga-jual').value = override?.hargaJual || '';
  const ppnEl = document.getElementById('produk-ppn');
  if(ppnEl) ppnEl.value = override?.ppn != null ? override.ppn : '';

  // Akun buttons
  const akunPend = override?.akunPend || '4101';
  const akunHpp  = override?.akunHpp  || '5101';
  const akunPers = override?.akunPers || guessAkunPersediaanDefault(`${ks.nama||''} ${card?.nama||''}`);
  document.getElementById('produk-akun-pend').value = akunPend;
  document.getElementById('produk-akun-hpp').value  = akunHpp;
  const persEl = document.getElementById('produk-akun-pers');
  if(persEl) persEl.value = akunPers;
  const pendBtn = document.getElementById('produk-akun-pend-btn');
  const hppBtn  = document.getElementById('produk-akun-hpp-btn');
  const persBtn = document.getElementById('produk-akun-pers-btn');
  if(pendBtn) pendBtn.textContent = akuns.find(a=>a.kode===akunPend)?.nama || 'Pilih Akun...';
  if(hppBtn)  hppBtn.textContent  = akuns.find(a=>a.kode===akunHpp)?.nama  || 'Pilih Akun...';
  if(persBtn) persBtn.textContent = akuns.find(a=>a.kode===akunPers)?.nama || 'Pilih Akun...';

  // Update read-only HPP info
  const hppInfo = document.getElementById('produk-hpp-readonly');
  if(hppInfo) {
    hppInfo.innerHTML = `
      <div style="background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;">
        <div style="font-size:11px;color:var(--muted);margin-bottom:4px;">HPP (otomatis dari kartu stock — <b>${metodeLabel[saldo.metode]||saldo.metode}</b>)</div>
        <div style="font-family:var(--mono);font-size:15px;font-weight:700;color:var(--text);">${fmtRp(saldo.hppNext)} / unit</div>
        <div style="font-size:11px;color:var(--muted);margin-top:3px;">Stok: ${saldo.totalQty} ${escapeHtml(ks.satuan||'unit')} · Total nilai: ${fmtRp(saldo.totalNilai)}</div>
        ${saldo.metode==='fifo' && saldo.layers.length > 1 ?
          `<div style="margin-top:6px;font-size:10px;color:var(--accent2);">Layer FIFO: ` +
          saldo.layers.map(l=>`${l.qty}×${fmtRp(l.harga)}`).join(' + ') + `</div>` : ''}
      </div>`;
  }
  openModal('modal-produk');
}

function simpanProduk() {
  const ksId     = document.getElementById('produk-edit-id').value;
  const hargaJual= parseFloat(document.getElementById('produk-harga-jual').value)||0;
  const akunPend = document.getElementById('produk-akun-pend').value||'4101';
  const akunHpp  = document.getElementById('produk-akun-hpp').value||'5101';
  const akunPers = document.getElementById('produk-akun-pers')?.value||'1301';
  const _ppnRaw  = document.getElementById('produk-ppn')?.value;
  const ppn      = (_ppnRaw !== '' && _ppnRaw != null) ? parseFloat(_ppnRaw) : null;
  let ks = null;
  Object.values(multiKartuStock).forEach(card => {
    if (card.id === ksId) ks = card;
    if (card.kategori?.[ksId]) ks = card.kategori[ksId];
  });
  if(!ks) { showAlert('Kartu stock tidak ditemukan!'); return; }
  showOpSpinner('Menyimpan pengaturan produk...', ks.nama);
  closeModal('modal-produk');
  setTimeout(() => {
    try {
      const idx = produkList.findIndex(p => p.ksId === ksId);
      const data = { ksId, hargaJual, akunPend, akunHpp, akunPers, ppn };
      if(idx >= 0) produkList[idx] = { ...produkList[idx], ...data };
      else produkList.push(data);
      saveToStorage(false);
      renderProduk();
      showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Produk <b>${ks.nama}</b> berhasil diperbarui!`);
    } catch(e) { console.error(e); } finally { hideOpSpinner(); }
  }, 350);
}

function hapusProduk(id) {
  // Tidak dipakai lagi — produk tidak bisa dihapus manual, ikut kartu stock
}

// Produk Picker (untuk Mode Cepat)
let _produkPickerCallback = null;
function openProdukPicker() {
  // Filter kartu stock yang tidak di-lock dari transaksi
  const allCards  = Object.values(multiKartuStock || {});
  const cards     = allCards.filter(c => !c.lockedFromTrx);
  if(!allCards.length && !produkList.length) {
    showAlert('Belum ada produk. Tambahkan di Master Produk terlebih dahulu.');
    return;
  }
  if(!cards.length) {
    showAlert('Tidak ada produk tersedia. Aktifkan kartu stock di menu Persediaan (klik ikon gembok).');
    return;
  }
  // Level 1: pilih kartu stock (hanya yang tidak terkunci)
  if(cards.length === 1) {
    const card = cards[0];
    const kats = Object.values(card.kategori || {});
    if(!kats.length) { showAlert('Kartu stock belum punya barang.'); return; }
    if(kats.length === 1) { _applySimpelKategori(kats[0].id, kats[0].nama); return; }
    openOptPicker({
      title: 'Pilih Barang — ' + card.nama,
      options: kats.map(kat => {
        const override = produkList.find(p => p.ksId === kat.id);
        const hJual = override?.hargaJual || 0;
        return { value: kat.id, label: kat.nama, sub: `Harga: ${hJual ? fmtRp(hJual) : 'Belum diset'}` };
      }),
      currentValue: document.getElementById('simpel-produk-id')?.value||'',
      onSelect: (katId, label) => { _applySimpelKategori(katId, label); }
    });
    return;
  }
  openOptPicker({
    title: 'Pilih Kartu Stock',
    options: cards.map(card => ({
      value: card.id, label: card.nama,
      sub: `${Object.keys(card.kategori||{}).length} barang`,
    })),
    currentValue: '',
    onSelect: (cardId) => {
      const card = multiKartuStock[cardId]; if(!card) return;
      const kats = Object.values(card.kategori || {});
      if(!kats.length) { showAlert('Kartu stock ini belum punya barang.'); return; }
      if(kats.length === 1) { _applySimpelKategori(kats[0].id, kats[0].nama); return; }
      openOptPicker({
        title: 'Pilih Barang — ' + card.nama,
        options: kats.map(kat => {
          const override = produkList.find(p => p.ksId === kat.id);
          const hJual = override?.hargaJual || 0;
          return { value: kat.id, label: kat.nama, sub: `Harga: ${hJual ? fmtRp(hJual) : 'Belum diset'}` };
        }),
        currentValue: document.getElementById('simpel-produk-id')?.value||'',
        onSelect: (katId, label) => { _applySimpelKategori(katId, label); }
      });
    }
  });
}

function _applySimpelKategori(katId, label) {
  const found    = _findKatById(katId);
  const override = produkList.find(p => p.ksId === katId);
  document.getElementById('simpel-produk-id').value = katId;
  document.getElementById('simpel-produk-btn').textContent = label || found?.kat?.nama || katId;
  const qty = parseFloat(document.getElementById('simpel-qty')?.value)||1;
  if(_simpelTipe === 'jual') {
    // Warning jika harga jual belum diset di master produk
    if(!override?.hargaJual) {
      showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Harga jual belum diset untuk produk ini. Silakan set harga di Master Produk terlebih dahulu.');
    }
    // Tidak perlu isi simpel-jumlah — harga diambil dari master produk saat simpan
  } else if(_simpelTipe === 'beli') {
    document.getElementById('simpel-jumlah').value = '';
  }
  if(!document.getElementById('simpel-ket').value)
    document.getElementById('simpel-ket').value = found?.kat?.nama || label || '';
  _updateSimpelJumlahLabel();
}
function onSimpelQtyChange() {
  const katId = document.getElementById('simpel-produk-id')?.value;
  if(!katId) return;
  if(_simpelTipe === 'jual') {
    // Jual: auto-fill total dari harga jual × qty
    const override = produkList.find(p => p.ksId === katId);
    if(!override?.hargaJual) return;
    const qty = parseFloat(document.getElementById('simpel-qty')?.value)||1;
    document.getElementById('simpel-jumlah').value = override.hargaJual * qty;
  } else if(_simpelTipe === 'beli') {
    // Beli: jumlah = harga/unit, tampilkan total hint
    _updateSimpelJumlahLabel();
  }
}
