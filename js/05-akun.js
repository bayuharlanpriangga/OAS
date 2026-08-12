
// SIMPLE PICKER untuk form kas & pembelian
let _simplePickerHiddenId = null;
let _simplePickerBtnId = null;
let _simplePickerFilter = null;

const PICKER_FILTERS = {
  'kas':  a => !['1101','1102','1103','1104'].includes(a.kode),
  'beli': a => ['Beban','Aset','HPP'].includes(a.tipe),
  'persediaan': a => a.tipe === 'Aset' && (a.nama.toLowerCase().includes('persediaan') || a.kode.startsWith('13')),
};

// Tebak akun persediaan default berdasarkan nama produk/kartu — hanya dipakai
// sebagai saran awal saat field akunPers belum pernah diset user. User tetap
// bisa mengganti manual lewat picker "Akun Persediaan" di Master Produk.
function guessAkunPersediaanDefault(namaGabungan) {
  const n = (namaGabungan || '').toLowerCase();
  if (n.includes('barang jadi') || n.includes('finished')) return '1304';
  if (n.includes('dalam proses') || n.includes('wip')) return '1303';
  if (n.includes('bahan baku') || n.includes('raw material')) return '1302';
  return '1301';
}

function openSimplePicker(hiddenInputId, btnId, mode) {
  _simplePickerHiddenId = hiddenInputId;
  _simplePickerBtnId = btnId;
  _simplePickerFilter = PICKER_FILTERS[mode] || null;
  document.getElementById('akun-picker-search').value = '';
  const currentVal = document.getElementById(hiddenInputId)?.value || '';
  renderFilteredPickerList('', currentVal, _simplePickerFilter);
  document.getElementById('akun-picker-backdrop').classList.add('open');
  setTimeout(()=>document.getElementById('akun-picker-search').focus(), 200);
}

// AKUN
function tipeBadge(t){
  if(t==='Aset') return 'badge-green';
  if(t==='Liabilitas') return 'badge-red';
  if(t==='Ekuitas') return 'badge-blue';
  if(t==='Pendapatan') return 'badge-blue';
  if(t==='HPP') return 'badge-yellow';
  return 'badge-yellow';
}

function renderAkun() {
  const body = document.getElementById('akun-body');
  const search = (document.getElementById('coa-search')?.value || '').toLowerCase();
  const filterTipe = document.getElementById('coa-filter-tipe')?.value || '';
  const filterKat = document.getElementById('coa-filter-kat')?.value || '';
  const grouped = document.getElementById('coa-group-tipe')?.checked !== false;
  const saldoMap = computeSaldoAll ? computeSaldoAll() : {};

  // Update category filter options
  const katSel = document.getElementById('coa-filter-kat');
  if(katSel && katSel.options.length <= 1) {
    const kats = [...new Set(akuns.map(a=>a.kat).filter(Boolean))].sort();
    kats.forEach(k => { const o=document.createElement('option'); o.value=k; o.textContent=k; katSel.appendChild(o); });
  }

  let filtered = akuns.filter(a => {
    if(filterTipe && a.tipe !== filterTipe) return false;
    if(filterKat && a.kat !== filterKat) return false;
    if(search && !a.nama.toLowerCase().includes(search) && !a.kode.includes(search)) return false;
    return true;
  });

  // Update count subtitle
  const subEl = document.getElementById('coa-count-sub');
  if(subEl) subEl.textContent = `${filtered.length} dari ${akuns.length} akun ditampilkan`;

  // Stats bar
  const statsEl = document.getElementById('coa-stats');
  if(statsEl) {
    const tipes = ['Aset','Liabilitas','Ekuitas','Pendapatan','HPP','Beban'];
    const colors = ['badge-green','badge-red','badge-blue','badge-blue','badge-yellow','badge-yellow'];
    statsEl.innerHTML = tipes.map((t,i) => {
      const n = akuns.filter(a=>a.tipe===t).length;
      return `<span class="badge ${colors[i]}" style="cursor:pointer;padding:4px 10px;font-size:11px;" 
        onclick="document.getElementById('coa-filter-tipe').value='${t}';renderAkun()">
        ${t} (${n})</span>`;
    }).join('') + `<span class="badge badge-gray" style="cursor:pointer;padding:4px 10px;font-size:11px;"
      onclick="document.getElementById('coa-filter-tipe').value='';renderAkun()">Semua (${akuns.length})</span>`;
  }

  if(!body) return;

  let html = '';
  if(grouped && !filterTipe && !search && !filterKat) {
    // Grouped by type
    const tipeOrder = ['Aset','Liabilitas','Ekuitas','Pendapatan','HPP','Beban'];
    const tipeLabels = {
      'Aset':'<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> ASET',
      'Liabilitas':'<i class="ti ti-clipboard-list ti-inline"></i> LIABILITAS',
      'Ekuitas':'💎 EKUITAS',
      'Pendapatan':'💰 PENDAPATAN',
      'HPP':'<i class="ti ti-package" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> HARGA POKOK PENJUALAN',
      'Beban':'💸 BEBAN'
    };
    tipeOrder.forEach(tipe => {
      const group = filtered.filter(a => a.tipe === tipe);
      if(!group.length) return;
      // Group header
      html += `<tr style="background:var(--surface2);">
        <td colspan="7" style="padding:8px 16px;font-size:11px;font-weight:800;color:var(--muted);letter-spacing:0.08em;text-transform:uppercase;border-bottom:1px solid var(--border);">
          <span class="badge ${tipeBadge(tipe)}" style="margin-right:8px;">${tipe}</span>
          ${tipeLabels[tipe]} <span style="margin-left:8px;font-weight:400;">(${group.length} akun)</span>
        </td>
      </tr>`;
      // Sub-group by kategori
      const kats = [...new Set(group.map(a=>a.kat))];
      kats.forEach(kat => {
        const katGroup = group.filter(a=>a.kat===kat);
        if(kats.length > 1) {
          html += `<tr><td colspan="7" style="padding:5px 16px 3px 32px;font-size:10px;color:var(--muted);font-weight:600;letter-spacing:0.06em;text-transform:uppercase;background:rgba(255,255,255,0.02);">── ${kat}</td></tr>`;
        }
        katGroup.forEach(a => {
          html += buildAkunRow(a, saldoMap);
        });
      });
    });
  } else {
    filtered.forEach(a => { html += buildAkunRow(a, saldoMap); });
  }

  body.innerHTML = html || `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted);">Tidak ada akun ditemukan</td></tr>`;
}

function buildAkunRow(a, saldoMap) {
  const s = saldoMap[a.kode] || {debit:0, kredit:0};
  const saldo = a.normal==='D' ? s.debit-s.kredit : s.kredit-s.debit;
  const saldoColor = saldo > 0 ? 'var(--accent)' : saldo < 0 ? 'var(--red)' : 'var(--muted)';
  const isContra = a.kat === 'Kontra' || a.kat === 'Kontra HPP';
  return `<tr style="${isContra?'opacity:0.75;':''}">
    <td style="font-family:var(--mono);font-size:12px;color:var(--muted);">${a.kode}</td>
    <td style="font-size:13px;${isContra?'padding-left:28px;font-style:italic;':''}">
      ${isContra?'<span style="color:var(--muted);margin-right:4px;font-size:10px;">↳</span>':''}${a.nama}
    </td>
    <td><span class="badge ${tipeBadge(a.tipe)}" style="font-size:10px;">${a.tipe}</span></td>
    <td style="color:var(--muted);font-size:11.5px;">${a.kat || a.kategori || '—'}</td>
    <td><span class="badge ${a.normal==='D'?'badge-blue':'badge-red'}" style="font-size:10px;">${a.normal==='D'?'Debit':'Kredit'}</span></td>
    <td style="text-align:right;font-family:var(--mono);font-size:12px;color:${saldoColor};">${saldo?'Rp '+Math.abs(saldo).toLocaleString('id-ID'):'—'}</td>
    <td style="text-align:center;">
      <button onclick="hapusAkun('${a.kode}')" title="Hapus akun" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;padding:2px 5px;border-radius:4px;opacity:0.5;" onmouseover="this.style.opacity='1';this.style.color='var(--red)'" onmouseout="this.style.opacity='0.5';this.style.color='var(--muted)'"><i class="ti ti-trash" style="font-size:14px;"></i></button>
    </td>
  </tr>`;
}

function hapusAkun(kode) {
  const a = akuns.find(x=>x.kode===kode);
  if(!a) return;
  // Check if used in journals
  const usedIn = jurnalEntries.filter(j=>j.lines.some(l=>l.akun===kode)).length;
  if(usedIn > 0) {
    showAlert(`❌ Akun "${a.nama}" tidak bisa dihapus — dipakai di ${usedIn} jurnal.`);
    return;
  }
  showCustomConfirmGeneral({
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--red)"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>',
    iconColor: 'rgba(248,113,113,0.15)',
    iconBorder: 'rgba(248,113,113,0.3)',
    title: 'Hapus Akun?',
    subtitle: `Akun <b>${a.kode} — ${a.nama}</b> akan dihapus permanen`,
    rows: [
      { label: 'Kode', value: a.kode, color: 'var(--muted)' },
      { label: 'Nama', value: a.nama, color: 'var(--text)' },
      { label: 'Tipe', value: a.tipe, color: 'var(--accent2)' },
    ],
    warning: '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Aksi ini tidak bisa dibatalkan.',
    btnLabel: '[Hapus] Ya, Hapus Akun',
    btnGradient: 'linear-gradient(135deg,#f87171,#dc2626)',
  }).then(ok => {
    if(!ok) return;
    akuns = akuns.filter(x=>x.kode!==kode);
    renderAkun();
    markDirty();
    showAlert(`✓ Akun ${a.kode} - ${a.nama} dihapus`);
  });
}

function openModalAkun(){document.getElementById('modal-akun').classList.add('open');setTimeout(upgradeFormPickers,80);}
function closeModal(id){document.getElementById(id).classList.remove('open');}

// AKUN PICKER BOTTOM SHEET
let _pickerTriggerBtn = null;

function openAkunPicker(triggerBtn) {
  _simplePickerHiddenId = null; // reset simple picker state
  _simplePickerBtnId = null;
  _simplePickerFilter = null;
  _pickerTriggerBtn = triggerBtn;
  const row = triggerBtn.closest('.jurnal-line-row');
  const sel = row.querySelector('select');
  document.getElementById('akun-picker-search').value = '';
  renderAkunPickerList('', sel?.value || '');
  document.getElementById('akun-picker-backdrop').classList.add('open');
  setTimeout(()=>document.getElementById('akun-picker-search').focus(), 200);
}

function closeAkunPicker(e) {
  if(e && e.target !== document.getElementById('akun-picker-backdrop')) return;
  document.getElementById('akun-picker-backdrop').classList.remove('open');
  _pickerTriggerBtn = null;
  _simplePickerHiddenId = null;
  _simplePickerBtnId = null;
  _simplePickerFilter = null;
}

function filterAkunPicker(q) {
  if(_simplePickerHiddenId) {
    // Mode simple picker (form kas/pembelian)
    const currentVal = document.getElementById(_simplePickerHiddenId)?.value || '';
    renderFilteredPickerList(q, currentVal, _simplePickerFilter);
  } else if(_pickerTriggerBtn) {
    // Mode manual line picker
    const row = _pickerTriggerBtn?.closest('.jurnal-line-row');
    const sel = row?.querySelector('select');
    renderAkunPickerList(q, sel?.value || '');
  }
}

function renderAkunPickerList(query, selectedKode) {
  const q = query.toLowerCase();
  const filtered = akuns.filter(a =>
    !q || a.kode.includes(q) || a.nama.toLowerCase().includes(q) || a.tipe.toLowerCase().includes(q)
  );
  const list = document.getElementById('akun-picker-list');
  if(!filtered.length) {
    list.innerHTML = `<div id="akun-picker-empty"><i class="ti ti-mood-empty" style="font-size:20px;display:block;margin:0 auto 6px;"></i> Akun tidak ditemukan<br><small>Coba kata kunci lain</small></div>`;
    return;
  }
  // Group by tipe
  const groups = {};
  filtered.forEach(a => {
    if(!groups[a.tipe]) groups[a.tipe]=[];
    groups[a.tipe].push(a);
  });
  const tipeColor = t => ({Aset:'aset',Liabilitas:'liabilitas',Ekuitas:'ekuitas',Pendapatan:'pendapatan',Beban:'beban',HPP:'beban'})[t]||'beban';
  let html = '';
  Object.entries(groups).forEach(([tipe,items]) => {
    html += `<div class="akun-picker-group-label">${tipe}</div>`;
    items.forEach(a => {
      const sel = a.kode===selectedKode ? ' selected' : '';
      html += `<div class="akun-picker-item${sel}" onclick="_simplePickerHiddenId?selectSimplePicker('${escapeForJsAttr(a.kode)}','${escapeForJsAttr(a.nama)}'):selectAkunFromPicker('${escapeForJsAttr(a.kode)}','${escapeForJsAttr(a.nama)}')">
        <span class="akun-picker-kode">${a.kode}</span>
        <span class="akun-picker-nama">${a.nama}</span>
        <span class="akun-picker-tipe ${tipeColor(a.tipe)}">${tipe}</span>
      </div>`;
    });
  });
  list.innerHTML = html;
}

function selectAkunFromPicker(kode, nama) {
  if(!_pickerTriggerBtn) return;
  const row = _pickerTriggerBtn.closest('.jurnal-line-row');
  if(!row) return;
  const sel = row.querySelector('select');
  if(sel) sel.value = kode;
  _pickerTriggerBtn.textContent = kode + ' — ' + nama;
  document.getElementById('akun-picker-backdrop').classList.remove('open');
  _pickerTriggerBtn = null;
}

function syncAkunTrigger(sel) {
  const row = sel.closest('.jurnal-line-row');
  const btn = row?.querySelector('.akun-trigger-btn');
  if(!btn) return;
  const a = akuns.find(x=>x.kode===sel.value);
  if(a) btn.textContent = a.kode + ' — ' + a.nama;
}
function simpanAkun(){
  const kode=document.getElementById('new-akun-kode').value.trim();
  const nama=document.getElementById('new-akun-nama').value.trim();
  const tipe=document.getElementById('new-akun-tipe').value;
  const kat=document.getElementById('new-akun-kat').value.trim();
  if(!kode||!nama){showAlert('Kode dan nama akun wajib diisi!');return;}
  if(akuns.find(a=>a.kode===kode)){showAlert('Kode akun sudah ada!');return;}
  const normal=['Aset','Beban','HPP'].includes(tipe)?'D':'K';
  akuns.push({kode,nama,tipe,kat,normal});
  akuns.sort((a,b)=>a.kode.localeCompare(b.kode));
  closeModal('modal-akun');
  renderAkun();
  showAlert('✓ Akun berhasil ditambahkan!');
  ['new-akun-kode','new-akun-nama','new-akun-kat'].forEach(id=>document.getElementById(id).value='');
}

// EXPORT SYSTEM
let exportFmt = 'excel';
let excelTemplate = 'data'; // 'data' or 'formula'
let exportLogoDataUrl = null; // base64 logo for PDF

function openExportModal() {
  document.getElementById('exp-status').style.display = 'none';
  document.getElementById('exp-btn').disabled = false;
  document.getElementById('exp-btn').innerHTML = '<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Export Sekarang';
  // Reset format ke excel setiap kali modal dibuka agar state konsisten
  exportFmt = 'excel';
  ['excel','pdf','csv'].forEach(f => {
    document.getElementById('exp-opt-'+f)?.classList.toggle('exp-fmt-active', f === 'excel');
  });
  // Pre-fill from profil
  const _p = typeof getProfil === 'function' ? getProfil() : {};
  const namaEl = document.getElementById('exp-nama-perusahaan');
  const periodeEl = document.getElementById('exp-periode');
  if(namaEl && !namaEl.value && _p.nama) namaEl.value = _p.nama;
  if(periodeEl && !periodeEl.value) periodeEl.value = new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'});
  document.getElementById('modal-export').classList.add('open');
  updateExportSections();
  _pvUpdateExportModalBadge();
}

function getDefaultAkuns() {
  // Return the full comprehensive akun list
  return [
    {kode:'1101',nama:'Kas',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1102',nama:'Bank BCA',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1103',nama:'Bank Mandiri',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1104',nama:'Kas Kecil (Petty Cash)',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1201',nama:'Piutang Usaha',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1202',nama:'Piutang Lain-lain',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1203',nama:'Cadangan Kerugian Piutang',tipe:'Aset',kat:'Kontra',normal:'K'},
    {kode:'1301',nama:'Persediaan Barang Dagangan',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1302',nama:'Persediaan Bahan Baku',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1303',nama:'Persediaan Barang Dalam Proses',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1304',nama:'Persediaan Barang Jadi',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1401',nama:'Perlengkapan Kantor',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1402',nama:'Perlengkapan Toko',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1501',nama:'Uang Muka Pembelian',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1502',nama:'PPN Masukan (Pajak Dibayar Dimuka)',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1503',nama:'PPh Dibayar Dimuka (Uang Muka Pajak)',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1601',nama:'Biaya Dibayar Dimuka',tipe:'Aset',kat:'Lancar',normal:'D'},
    {kode:'1701',nama:'Tanah',tipe:'Aset',kat:'Tetap',normal:'D'},
    {kode:'1702',nama:'Bangunan',tipe:'Aset',kat:'Tetap',normal:'D'},
    {kode:'1703',nama:'Akumulasi Penyusutan Bangunan',tipe:'Aset',kat:'Kontra',normal:'K'},
    {kode:'1711',nama:'Kendaraan',tipe:'Aset',kat:'Tetap',normal:'D'},
    {kode:'1712',nama:'Akumulasi Penyusutan Kendaraan',tipe:'Aset',kat:'Kontra',normal:'K'},
    {kode:'1721',nama:'Peralatan Kantor',tipe:'Aset',kat:'Tetap',normal:'D'},
    {kode:'1722',nama:'Akumulasi Penyusutan Peralatan Kantor',tipe:'Aset',kat:'Kontra',normal:'K'},
    {kode:'1731',nama:'Mesin & Alat Produksi',tipe:'Aset',kat:'Tetap',normal:'D'},
    {kode:'1732',nama:'Akumulasi Penyusutan Mesin',tipe:'Aset',kat:'Kontra',normal:'K'},
    {kode:'1741',nama:'Inventaris & Furnitur',tipe:'Aset',kat:'Tetap',normal:'D'},
    {kode:'1742',nama:'Akumulasi Penyusutan Inventaris',tipe:'Aset',kat:'Kontra',normal:'K'},
    {kode:'1751',nama:'Komputer & Laptop',tipe:'Aset',kat:'Tetap',normal:'D'},
    {kode:'1752',nama:'Akumulasi Penyusutan Komputer',tipe:'Aset',kat:'Kontra',normal:'K'},
    {kode:'1801',nama:'Aset Tidak Berwujud (Goodwill/Lisensi)',tipe:'Aset',kat:'Tidak Berwujud',normal:'D'},
    {kode:'1802',nama:'Amortisasi Aset Tidak Berwujud',tipe:'Aset',kat:'Kontra',normal:'K'},
    {kode:'1901',nama:'Investasi Jangka Panjang',tipe:'Aset',kat:'Investasi',normal:'D'},
    {kode:'2101',nama:'Utang Usaha',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2102',nama:'Utang Lain-lain',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2201',nama:'Utang Gaji',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2202',nama:'Utang Bonus & THR',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2301',nama:'Utang PPN Keluaran',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2302',nama:'Utang PPh 21 (Karyawan)',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2303',nama:'Utang PPh 23 (Hutang ke Negara)',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2304',nama:'Utang PPh Badan (Pasal 29)',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2401',nama:'Pendapatan Diterima di Muka',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2402',nama:'Uang Muka Pelanggan',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2501',nama:'Utang Bunga',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2502',nama:'Biaya yang Masih Harus Dibayar',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2601',nama:'Utang Dividen',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2701',nama:'Utang BPJS Kesehatan',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2702',nama:'Utang BPJS Ketenagakerjaan',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
    {kode:'2801',nama:'Utang Bank Jangka Panjang',tipe:'Liabilitas',kat:'Jk Panjang',normal:'K'},
    {kode:'2802',nama:'Utang Leasing',tipe:'Liabilitas',kat:'Jk Panjang',normal:'K'},
    {kode:'2803',nama:'Utang Obligasi',tipe:'Liabilitas',kat:'Jk Panjang',normal:'K'},
    {kode:'3101',nama:'Modal Pemilik / Modal Disetor',tipe:'Ekuitas',kat:'Modal',normal:'K'},
    {kode:'3102',nama:'Prive / Pengambilan Pribadi',tipe:'Ekuitas',kat:'Modal',normal:'D'},
    {kode:'3201',nama:'Laba Ditahan',tipe:'Ekuitas',kat:'Laba',normal:'K'},
    {kode:'3202',nama:'Laba Tahun Berjalan',tipe:'Ekuitas',kat:'Laba',normal:'K'},
    {kode:'4101',nama:'Penjualan Barang',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
    {kode:'4102',nama:'Penjualan Jasa',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
    {kode:'4105',nama:'Penjualan Produk Manufaktur',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
    {kode:'4106',nama:'Pendapatan Properti / Sewa',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
    {kode:'4107',nama:'Penjualan Bahan Baku',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
    {kode:'4103',nama:'Retur & Potongan Penjualan',tipe:'Pendapatan',kat:'Kontra',normal:'D'},
    {kode:'4104',nama:'Diskon Penjualan',tipe:'Pendapatan',kat:'Kontra',normal:'D'},
    {kode:'4201',nama:'Pendapatan Komisi',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
    {kode:'4202',nama:'Pendapatan Sewa',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
    {kode:'4203',nama:'Pendapatan Bunga',tipe:'Pendapatan',kat:'Non-Operasional',normal:'K'},
    {kode:'4204',nama:'Pendapatan Dividen',tipe:'Pendapatan',kat:'Non-Operasional',normal:'K'},
    {kode:'4205',nama:'Pendapatan Non-Operasional Lainnya',tipe:'Pendapatan',kat:'Non-Operasional',normal:'K'},
    {kode:'4301',nama:'Keuntungan Penjualan Aset',tipe:'Pendapatan',kat:'Non-Operasional',normal:'K'},
    {kode:'5101',nama:'HPP - Harga Pokok Penjualan',tipe:'HPP',kat:'HPP',normal:'D'},
    {kode:'5102',nama:'Pembelian Barang Dagangan',tipe:'HPP',kat:'HPP',normal:'D'},
    {kode:'5103',nama:'Retur & Potongan Pembelian',tipe:'HPP',kat:'Kontra HPP',normal:'K'},
    {kode:'5104',nama:'Biaya Angkut Pembelian',tipe:'HPP',kat:'HPP',normal:'D'},
    {kode:'5201',nama:'Biaya Bahan Baku Langsung',tipe:'HPP',kat:'Produksi',normal:'D'},
    {kode:'5202',nama:'Biaya Tenaga Kerja Langsung',tipe:'HPP',kat:'Produksi',normal:'D'},
    {kode:'5203',nama:'Biaya Overhead Pabrik',tipe:'HPP',kat:'Produksi',normal:'D'},
    {kode:'6101',nama:'Beban Gaji & Upah',tipe:'Beban',kat:'SDM',normal:'D'},
    {kode:'6102',nama:'Beban Lembur',tipe:'Beban',kat:'SDM',normal:'D'},
    {kode:'6103',nama:'Beban THR & Bonus',tipe:'Beban',kat:'SDM',normal:'D'},
    {kode:'6104',nama:'Beban BPJS Kesehatan (Pemberi Kerja)',tipe:'Beban',kat:'SDM',normal:'D'},
    {kode:'6105',nama:'Beban BPJS Ketenagakerjaan',tipe:'Beban',kat:'SDM',normal:'D'},
    {kode:'6106',nama:'Beban Pelatihan & Pengembangan',tipe:'Beban',kat:'SDM',normal:'D'},
    {kode:'6201',nama:'Beban Sewa Gedung & Tempat',tipe:'Beban',kat:'Operasional',normal:'D'},
    {kode:'6202',nama:'Beban Listrik & Air',tipe:'Beban',kat:'Operasional',normal:'D'},
    {kode:'6203',nama:'Beban Telepon & Internet',tipe:'Beban',kat:'Operasional',normal:'D'},
    {kode:'6204',nama:'Beban Bahan Bakar & Transportasi',tipe:'Beban',kat:'Operasional',normal:'D'},
    {kode:'6205',nama:'Beban Perlengkapan Kantor',tipe:'Beban',kat:'Operasional',normal:'D'},
    {kode:'6206',nama:'Beban Pemeliharaan & Perbaikan',tipe:'Beban',kat:'Operasional',normal:'D'},
    {kode:'6207',nama:'Beban Kebersihan & Keamanan',tipe:'Beban',kat:'Operasional',normal:'D'},
    {kode:'6301',nama:'Beban Penyusutan Bangunan',tipe:'Beban',kat:'Penyusutan',normal:'D'},
    {kode:'6302',nama:'Beban Penyusutan Kendaraan',tipe:'Beban',kat:'Penyusutan',normal:'D'},
    {kode:'6303',nama:'Beban Penyusutan Peralatan Kantor',tipe:'Beban',kat:'Penyusutan',normal:'D'},
    {kode:'6304',nama:'Beban Penyusutan Mesin',tipe:'Beban',kat:'Penyusutan',normal:'D'},
    {kode:'6305',nama:'Beban Penyusutan Komputer',tipe:'Beban',kat:'Penyusutan',normal:'D'},
    {kode:'6306',nama:'Beban Amortisasi Aset Tak Berwujud',tipe:'Beban',kat:'Penyusutan',normal:'D'},
    {kode:'6401',nama:'Beban Iklan & Promosi',tipe:'Beban',kat:'Pemasaran',normal:'D'},
    {kode:'6402',nama:'Beban Komisi Penjualan',tipe:'Beban',kat:'Pemasaran',normal:'D'},
    {kode:'6403',nama:'Beban Pengiriman & Ongkos Kirim',tipe:'Beban',kat:'Pemasaran',normal:'D'},
    {kode:'6501',nama:'Beban Administrasi & Umum',tipe:'Beban',kat:'Administrasi',normal:'D'},
    {kode:'6502',nama:'Beban Perjalanan Dinas',tipe:'Beban',kat:'Administrasi',normal:'D'},
    {kode:'6503',nama:'Beban Konsultan & Profesional',tipe:'Beban',kat:'Administrasi',normal:'D'},
    {kode:'6504',nama:'Beban Asuransi',tipe:'Beban',kat:'Administrasi',normal:'D'},
    {kode:'6505',nama:'Beban Perizinan & Legalitas',tipe:'Beban',kat:'Administrasi',normal:'D'},
    {kode:'6601',nama:'Beban Bunga Pinjaman',tipe:'Beban',kat:'Non-Operasional',normal:'D'},
    {kode:'6602',nama:'Beban Administrasi Bank',tipe:'Beban',kat:'Non-Operasional',normal:'D'},
    {kode:'6603',nama:'Kerugian Penjualan Aset',tipe:'Beban',kat:'Non-Operasional',normal:'D'},
    {kode:'6604',nama:'Beban Pajak (PPh Badan)',tipe:'Beban',kat:'Non-Operasional',normal:'D'},
    {kode:'6701',nama:'Beban Lain-lain',tipe:'Beban',kat:'Lain-lain',normal:'D'},
  ];
}

// BACK BUTTON NAVIGATION — DIPINDAH ke 04-navigasi-tema.js (dipakai di sana,
// dan 04 load SEBELUM file ini, jadi deklarasinya harus ada di 04, bukan di sini)
