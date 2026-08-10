function openModalKontak(editId=null){
  try {
    const f=editId?kontakList.find(k=>k.id===editId):null;
    const setVal=(id,v)=>{const el=document.getElementById(id);if(el){el.value=v||'';if(el.tagName==='SELECT')el.dispatchEvent(new Event('change',{bubbles:true}));}};
    ['kontak-edit-id','kontak-nama','kontak-telp','kontak-email','kontak-alamat','kontak-npwp','kontak-pic','kontak-catatan'].forEach(id=>setVal(id,''));
    setVal('kontak-edit-id', editId||'');
    if(f){setVal('kontak-nama',f.nama);setVal('kontak-telp',f.telp);setVal('kontak-email',f.email);setVal('kontak-alamat',f.alamat);setVal('kontak-npwp',f.npwp);setVal('kontak-pic',f.pic);setVal('kontak-catatan',f.catatan);const tp=document.getElementById('kontak-tipe');if(tp){tp.value=f.tipe||'pelanggan';tp.dispatchEvent(new Event('change',{bubbles:true}));}}
    openModal('modal-kontak');
    setTimeout(upgradeFormPickers,80);
  } catch(e){ console.error('openModalKontak:',e); }
}
function simpanKontak(){const nama=document.getElementById('kontak-nama').value.trim();if(!nama){showAlert('Nama kontak wajib diisi.');return;}const editId=document.getElementById('kontak-edit-id').value;const kontak={id:editId||'KTK_'+Date.now(),nama,tipe:document.getElementById('kontak-tipe').value,telp:document.getElementById('kontak-telp').value.trim(),email:document.getElementById('kontak-email').value.trim(),alamat:document.getElementById('kontak-alamat').value.trim(),npwp:document.getElementById('kontak-npwp').value.trim(),pic:document.getElementById('kontak-pic').value.trim(),catatan:document.getElementById('kontak-catatan').value.trim(),createdAt:editId?(kontakList.find(k=>k.id===editId)?.createdAt||new Date().toISOString()):new Date().toISOString()};if(editId){const idx=kontakList.findIndex(k=>k.id===editId);if(idx>=0)kontakList[idx]=kontak;}else kontakList.unshift(kontak);saveFiturBaru();closeModal('modal-kontak');renderKontak();renderKontakKPI();showAlert(`Kontak "${nama}" berhasil disimpan!`);}
function hapusKontak(id){if(!confirm('Hapus kontak ini?'))return;kontakList=kontakList.filter(k=>k.id!==id);saveFiturBaru();renderKontak();renderKontakKPI();showAlert('Kontak dihapus.');}
function lihatDetailKontak(id){const k=kontakList.find(c=>c.id===id);if(!k)return;const totalInvoice=invoiceList.filter(i=>i.pelanggan===k.nama).reduce((s,i)=>s+i.total,0);const totalTrxJurnal=jurnalEntries.filter(j=>j.kontakId===id).reduce((s,j)=>{const t=(j.lines||[]).filter(l=>l.debit>0).reduce((a,l)=>a+l.debit,0);return s+t;},0);const totalKeseluruhan=totalInvoice+(k.totalTrx||0);const tipeLabel={pelanggan:'Pelanggan',supplier:'Supplier',keduanya:'Keduanya'}[k.tipe]||k.tipe;document.getElementById('kontak-detail-title').textContent=k.nama;document.getElementById('kontak-detail-body').innerHTML=`<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;"><div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Tipe</div><div>${escapeHtml(tipeLabel)}</div></div><div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Telepon</div><div>${escapeHtml(k.telp||'—')}</div></div><div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Email</div><div>${escapeHtml(k.email||'—')}</div></div><div><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">NPWP</div><div style="font-family:var(--mono);font-size:12px;">${escapeHtml(k.npwp||'—')}</div></div>${k.alamat?`<div style="grid-column:1/-1;"><div style="font-size:10px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em;margin-bottom:4px;">Alamat</div><div>${k.alamat}</div></div>`:''}</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px;">${totalInvoice?`<div style="background:var(--surface2);border-radius:10px;padding:12px 14px;"><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Total Invoice</div><div style="font-size:15px;font-weight:600;color:var(--accent);">${rp(totalInvoice)}</div></div>`:''}<div style="background:var(--surface2);border-radius:10px;padding:12px 14px;"><div style="font-size:11px;color:var(--muted);margin-bottom:4px;">Total Transaksi</div><div style="font-size:15px;font-weight:600;color:var(--accent2);">${rp((k.totalTrx||0))}</div></div>${(k.totalPenjualan||0)>0?`<div style="background:var(--surface2);border-radius:10px;padding:10px 12px;"><div style="font-size:10px;color:var(--muted);margin-bottom:2px;">Penjualan</div><div style="font-size:13px;font-weight:600;color:var(--accent);">${rp(k.totalPenjualan)}</div></div>`:''} ${(k.totalPembelian||0)>0?`<div style="background:var(--surface2);border-radius:10px;padding:10px 12px;"><div style="font-size:10px;color:var(--muted);margin-bottom:2px;">Pembelian</div><div style="font-size:13px;font-weight:600;color:var(--accent3);">${rp(k.totalPembelian)}</div></div>`:''}</div><div style="display:flex;gap:8px;margin-top:4px;"><button class="btn btn-ghost btn-sm" onclick="closeModal('modal-kontak-detail');openModalKontak('${id}')"><i class="ti ti-pencil ti-btn"></i> Edit</button><button class="btn btn-danger btn-sm" onclick="closeModal('modal-kontak-detail');hapusKontak('${id}')"><i class="ti ti-trash ti-btn"></i> Hapus</button></div>`;openModal('modal-kontak-detail');}
function renderKontakKPI(){const el=document.getElementById('kontak-kpi');if(!el)return;const pelanggan=kontakList.filter(k=>k.tipe==='pelanggan'||k.tipe==='keduanya').length;const supplier=kontakList.filter(k=>k.tipe==='supplier'||k.tipe==='keduanya').length;const kpis=[{label:'Total Kontak',val:kontakList.length+' kontak',icon:'users',clr:'var(--accent2)'},{label:'Pelanggan',val:pelanggan+' kontak',icon:'user-check',clr:'var(--accent)'},{label:'Supplier',val:supplier+' kontak',icon:'building-warehouse',clr:'var(--accent3)'}];el.innerHTML=kpis.map(k=>`<div style="flex:1;min-width:120px;background:var(--surface);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;"><div style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:5px;"><i class="ti ti-${k.icon}"></i> ${escapeHtml(k.label)}</div><div style="font-size:15px;font-weight:600;color:${k.clr};margin-top:4px;">${k.val}</div></div>`).join('');}
function renderKontak(){const tbody=document.getElementById('kontak-tbody');if(!tbody)return;const search=(document.getElementById('kontak-search')?.value||'').toLowerCase();const list=kontakList.filter(k=>{const matchTipe=_kontakFilter==='semua'||k.tipe===_kontakFilter||k.tipe==='keduanya';const matchSearch=!search||k.nama.toLowerCase().includes(search)||k.telp?.includes(search)||k.email?.toLowerCase().includes(search);return matchTipe&&matchSearch;});if(!list.length){tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px;">Belum ada kontak</td></tr>`;return;}const tipeMap={pelanggan:`<span style="background:var(--accent)22;color:var(--accent);padding:2px 8px;border-radius:6px;font-size:11px;">Pelanggan</span>`,supplier:`<span style="background:var(--accent3)22;color:var(--accent3);padding:2px 8px;border-radius:6px;font-size:11px;">Supplier</span>`,keduanya:`<span style="background:var(--accent2)22;color:var(--accent2);padding:2px 8px;border-radius:6px;font-size:11px;">Keduanya</span>`};tbody.innerHTML=list.map(k=>{const totalInvoice=invoiceList.filter(i=>i.pelanggan===k.nama).reduce((s,i)=>s+i.total,0);const totalDirect=k.totalTrx||0;const totalAll=totalInvoice+totalDirect;return `<tr><td style="font-weight:500;cursor:pointer;" onclick="lihatDetailKontak('${k.id}')">${escapeHtml(k.nama)}</td><td>${tipeMap[k.tipe]||k.tipe}</td><td style="font-size:12px;color:var(--muted)">${escapeHtml(k.telp||'—')}</td><td style="font-size:12px;color:var(--muted)">${escapeHtml(k.email||'—')}</td><td style="font-size:12px;color:var(--muted);max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(k.alamat||'—')}</td><td style="text-align:right;font-family:var(--mono);color:${totalAll?'var(--accent)':'var(--muted)'};">${totalAll?rp(totalAll):'—'}</td><td style="display:flex;gap:4px;"><button class="btn btn-ghost btn-sm" onclick="lihatDetailKontak('${k.id}')" title="Lihat"><i class="ti ti-eye"></i></button><button class="btn btn-ghost btn-sm" onclick="openModalKontak('${k.id}')" title="Edit"><i class="ti ti-pencil"></i></button><button class="btn btn-danger btn-sm" onclick="hapusKontak('${k.id}')" title="Hapus"><i class="ti ti-trash"></i></button></td></tr>`;}).join('');}


// ══════════════════════════════════════════════════════════════
// KONTAK — UPDATE TOTAL TRANSAKSI & POPULATE PICKERS
// ══════════════════════════════════════════════════════════════

/** Tambah jumlah ke totalTrx kontak dan simpan */
function updateKontakTotalTrx(kontakId, jumlah, jenisTrx) {
  if (!kontakId) return;
  const idx = kontakList.findIndex(k => k.id === kontakId);
  if (idx < 0) return;
  if (!kontakList[idx].totalTrx) kontakList[idx].totalTrx = 0;
  if (!kontakList[idx].totalPenjualan) kontakList[idx].totalPenjualan = 0;
  if (!kontakList[idx].totalPembelian) kontakList[idx].totalPembelian = 0;
  kontakList[idx].totalTrx += jumlah;
  if (jenisTrx === 'penjualan') kontakList[idx].totalPenjualan += jumlah;
  if (jenisTrx === 'pembelian') kontakList[idx].totalPembelian += jumlah;
  saveFiturBaru();
}

/** Recalculate semua totalTrx dari jurnalEntries (untuk sync ulang) */
function recalcKontakTotalTrx() {
  kontakList.forEach(k => { k.totalTrx = 0; k.totalPenjualan = 0; k.totalPembelian = 0; });
  jurnalEntries.forEach(j => {
    if (!j.kontakId) return;
    const idx = kontakList.findIndex(k => k.id === j.kontakId);
    if (idx < 0) return;
    const total = (j.lines || []).filter(l => l.debit > 0).reduce((s, l) => s + l.debit, 0);
    if (!kontakList[idx].totalTrx) kontakList[idx].totalTrx = 0;
    if (!kontakList[idx].totalPenjualan) kontakList[idx].totalPenjualan = 0;
    if (!kontakList[idx].totalPembelian) kontakList[idx].totalPembelian = 0;
    kontakList[idx].totalTrx += total;
    if (j.jenis === 'Penjualan') kontakList[idx].totalPenjualan += total;
    if (j.jenis === 'Pembelian') kontakList[idx].totalPembelian += total;
  });
}

/** Buka kontak picker (bottom sheet sama seperti akun picker) — semua kontak tampil, tidak filter tipe */
let _kontakPickerHiddenId = null;
let _kontakPickerBtnId = null;

function openKontakPicker(hiddenInputId, btnId) {
  _kontakPickerHiddenId = hiddenInputId;
  _kontakPickerBtnId = btnId;
  const currentVal = document.getElementById(hiddenInputId)?.value || '';
  document.getElementById('kontak-picker-search').value = '';
  renderKontakPickerList('', currentVal);
  document.getElementById('kontak-picker-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => document.getElementById('kontak-picker-search').focus(), 200);
}

function renderKontakPickerList(query, selectedId) {
  const q = query.toLowerCase();
  const list = document.getElementById('kontak-picker-list');
  const filtered = kontakList.filter(k =>
    !q || k.nama.toLowerCase().includes(q) ||
    (k.telp && k.telp.includes(q)) ||
    (k.email && k.email.toLowerCase().includes(q))
  );
  const tipeLabel = { pelanggan: 'Pelanggan', supplier: 'Supplier', keduanya: 'Keduanya' };
  const tipeColor = { pelanggan: 'var(--accent)', supplier: 'var(--accent3)', keduanya: 'var(--accent2)' };
  if (!filtered.length) {
    list.innerHTML = `<div style="text-align:center;padding:32px 16px;color:var(--muted);font-size:13px;">
      <i class="ti ti-users" style="font-size:24px;display:block;margin:0 auto 8px;opacity:0.4;"></i>
      ${q ? 'Kontak tidak ditemukan' : 'Belum ada kontak'}
    </div>`;
    return;
  }
  list.innerHTML = filtered.map(k => {
    const isSel = k.id === selectedId;
    const tl = tipeLabel[k.tipe] || k.tipe;
    const tc = tipeColor[k.tipe] || 'var(--muted)';
    return `<div class="akun-picker-item${isSel?' selected':''}" onclick="selectKontakPicker('${escapeForJsAttr(k.id)}','${escapeForJsAttr(k.nama)}','${escapeForJsAttr(k.tipe)}')">
      <span style="display:flex;flex-direction:column;flex:1;min-width:0;">
        <span style="font-weight:500;font-size:13px;">${escapeHtml(k.nama)}</span>
        <span style="font-size:11px;color:var(--muted);margin-top:1px;">${k.telp||k.email||'—'}</span>
      </span>
      <span style="font-size:10px;font-weight:600;padding:2px 7px;border-radius:5px;background:${escapeHtml(tc)}22;color:${escapeHtml(tc)};flex-shrink:0;">${tl}</span>
    </div>`;
  }).join('');
}

function selectKontakPicker(id, nama, tipe) {
  if (!_kontakPickerHiddenId) return;
  const hidden = document.getElementById(_kontakPickerHiddenId);
  const btn = document.getElementById(_kontakPickerBtnId);
  if (hidden) hidden.value = id;
  if (btn) {
    btn.classList.add('has-value');
    const tipeColor = { pelanggan: 'var(--accent)', supplier: 'var(--accent3)', keduanya: 'var(--accent2)' };
    const tc = tipeColor[tipe] || 'var(--muted)';
    btn.innerHTML = `<i class="ti ti-user" style="font-size:13px;width:13px;height:13px;vertical-align:-1px;color:${escapeHtml(tc)};margin-right:5px;"></i><span style="flex:1;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(nama)}</span>`;
  }
  _kontakPickerHiddenId = null;
  _kontakPickerBtnId = null;
  document.getElementById('kontak-picker-backdrop').classList.remove('open');
  document.body.style.overflow = '';
}

function closeKontakPicker() {
  _kontakPickerHiddenId = null;
  _kontakPickerBtnId = null;
  document.getElementById('kontak-picker-backdrop')?.classList.remove('open');
  document.body.style.overflow = '';
}

function onJualKontakChange() { /* placeholder */ }
function refreshKontakPickers() { /* tidak diperlukan lagi — picker on-demand */ }

// ══════════════════════════════════════════════════════════════
// MULTI-USER SYSTEM (Supabase-backed) — v2 dengan Share Link & CRUD Permissions
// ══════════════════════════════════════════════════════════════

// Modul + aksi CRUD yang bisa diatur per user
const MODULES_CRUD = {
  dashboard:    { label: 'Dashboard',          icon: 'ti-layout-dashboard' },
  transaksi:    { label: 'Input Transaksi',     icon: 'ti-credit-card' },
  jurnal:       { label: 'Jurnal',              icon: 'ti-book' },
  'laba-rugi':  { label: 'Laba Rugi',           icon: 'ti-trending-up' },
  neraca:       { label: 'Neraca',              icon: 'ti-building-bank' },
  'arus-kas':   { label: 'Arus Kas',            icon: 'ti-cash' },
  akun:         { label: 'Chart of Accounts',   icon: 'ti-clipboard-list' },
  kontak:       { label: 'Kontak',              icon: 'ti-users' },
  invoice:      { label: 'Invoice & Piutang',   icon: 'ti-receipt' },
  anggaran:     { label: 'Anggaran',            icon: 'ti-chart-bar' },
  pajak:        { label: 'Pajak',               icon: 'ti-percent' },
  rekonsiliasi: { label: 'Rekonsiliasi Bank',   icon: 'ti-refresh' },
  analitik:     { label: 'Analitik & Tren',     icon: 'ti-chart-area' },
  'ai-assistant':{ label: 'AI Assisten',        icon: 'ti-robot' },
  export:       { label: 'Export Laporan',      icon: 'ti-upload' },
  reset:        { label: 'Reset Data',          icon: 'ti-trash', danger: true },
};
const CRUD_ACTIONS = ['read','create','update','delete'];
const CRUD_LABELS  = { read:'Lihat', create:'Buat', update:'Edit', delete:'Hapus' };

/** Buat default permissions: semua modul, semua CRUD = true (kecuali reset = false) */
function makeDefaultPerms(isAdmin = false) {
  const p = {};
  Object.keys(MODULES_CRUD).forEach(mod => {
    p[mod] = {};
    CRUD_ACTIONS.forEach(act => {
      p[mod][act] = mod === 'reset' ? isAdmin : true;
    });
  });
  return p;
}

function renderInvoiceItems() {
  const el = document.getElementById('inv-items-list'); if(!el) return;
  el.innerHTML = _invItems.map((it,i)=>`
    <div style="display:grid;grid-template-columns:1fr 72px 120px 32px;gap:8px;margin-bottom:8px;align-items:center;">
      <input type="text" value="${escapeHtml(it.nama)}" placeholder="Nama item / jasa" oninput="_invItems[${i}].nama=this.value">
      <input type="number" value="${it.qty}" min="1" oninput="_invItems[${i}].qty=+this.value;hitungTotalInvoice()" style="text-align:center;">
      <input type="number" value="${it.harga}" placeholder="0" oninput="_invItems[${i}].harga=+this.value;hitungTotalInvoice()">
      <button onclick="_invItems.splice(${i},1);renderInvoiceItems();hitungTotalInvoice()">✕</button>
    </div>`).join('');
  hitungTotalInvoice();
}

function tambahItemInvoice() { _invItems.push({nama:'',qty:1,harga:0}); renderInvoiceItems(); }

function hitungTotalInvoice() {
  const subtotal = _invItems.reduce((s,it)=>s+it.qty*it.harga,0);
  const ppn = document.getElementById('inv-ppn-check')?.checked ? subtotal*0.12 : 0;
  const total = subtotal + ppn;
  const fmt = v=>v.toLocaleString('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0});
  const sub=document.getElementById('inv-subtotal'); if(sub) sub.textContent=fmt(subtotal);
  const ppnEl=document.getElementById('inv-ppn-val'); if(ppnEl) ppnEl.textContent=fmt(ppn);
  const tot=document.getElementById('inv-total'); if(tot) tot.textContent=fmt(total);
}

function simpanInvoice(status) {
  const pelanggan = document.getElementById('inv-pelanggan').value.trim();
  const nominal = _invItems.reduce((s,it)=>s+it.qty*it.harga,0);
  const ppnCheck = document.getElementById('inv-ppn-check')?.checked;
  const ppn = ppnCheck ? nominal*0.12 : 0;
  const total = nominal + ppn;
  if(!pelanggan || !nominal) { showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lengkapi pelanggan dan minimal 1 item'); return; }
  showOpSpinner('Menyimpan Invoice...', 'Membuat jurnal piutang');
  setTimeout(()=>{
    const inv = {
      id: 'INV_'+Date.now(),
      noInvoice: document.getElementById('inv-no').value,
      pelanggan, tanggal: document.getElementById('inv-tgl').value,
      jatuhTempo: document.getElementById('inv-jatuh-tempo').value,
      deskripsi: document.getElementById('inv-deskripsi').value,
      items: [..._invItems], subtotal: nominal, ppn, total,
      sisaTagihan: total, status,
      akunPiutang: document.getElementById('inv-akun-piutang').value,
      akunPend: document.getElementById('inv-akun-pend').value,
      createdAt: new Date().toISOString()
    };
    if(status === 'terkirim') {
      // Buat jurnal piutang otomatis
      const entry = {
        id:'JRN_INV_'+Date.now(), tanggal:inv.tanggal, jenis:'Manual',
        keterangan:`Invoice ${inv.noInvoice} — ${inv.pelanggan}`,
        lines:[
          {akun:inv.akunPiutang, debit:total, kredit:0},
          {akun:inv.akunPend, debit:0, kredit:nominal},
          ...(ppn>0?[{akun:akuns.find(a=>a.nama.toLowerCase().includes('ppn')&&a.tipe==='Liabilitas')?.kode||inv.akunPend, debit:0, kredit:ppn}]:[])
        ].filter(l=>l.akun)
      };
      jurnalEntries.push(entry);
      saveToStorage(false);
    }
    invoiceList.unshift(inv);
    saveFiturBaru();
    closeModal('modal-invoice');
    renderInvoiceList(); renderInvoiceKPI();
    showAlert(`✓ Invoice ${inv.noInvoice} berhasil disimpan!`);
    hideOpSpinner();
    cekNotifikasi();
  }, 900);
}

function renderInvoiceKPI() {
  const el = document.getElementById('inv-kpi'); if(!el) return;
  const semua = invoiceList;
  const totalTagihan = semua.reduce((s,i)=>s+i.total,0);
  const totalLunas = semua.filter(i=>i.status==='lunas').reduce((s,i)=>s+i.total,0);
  const totalBelum = semua.filter(i=>i.status!=='lunas').reduce((s,i)=>s+i.sisaTagihan,0);
  const jatuhTempo = semua.filter(i=>i.status!=='lunas'&&i.jatuhTempo<new Date().toISOString().split('T')[0]).length;
  const kpis = [
    {label:'Total Invoice',val:rp(totalTagihan),icon:'<i class="ti ti-file-invoice" style="font-size:14px;"></i>',clr:'var(--accent2)'},
    {label:'Sudah Lunas',val:rp(totalLunas),icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>',clr:'var(--accent)'},
    {label:'Belum Lunas',val:rp(totalBelum),icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3);vertical-align:-2px"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',clr:'var(--accent3)'},
    {label:'Jatuh Tempo',val:jatuhTempo+' invoice',icon:'<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>',clr:jatuhTempo?'var(--red)':'var(--muted)'},
  ];
  el.innerHTML = kpis.map(k=>`<div class="stat-card" style="padding:14px 16px;">
    <div style="font-size:22px;margin-bottom:4px;">${k.icon}</div>
    <div class="stat-label">${escapeHtml(k.label)}</div>
    <div style="font-size:16px;font-weight:700;color:${k.clr};font-family:var(--mono);margin-top:4px;">${k.val}</div>
  </div>`).join('');
}

function renderInvoiceList() {
  const tbody = document.getElementById('inv-tbody'); if(!tbody) return;
  const filter = document.getElementById('inv-filter-status')?.value || 'all';
  const today = new Date().toISOString().split('T')[0];
  let list = filter==='all' ? invoiceList : invoiceList.filter(i=>{
    if(filter==='jatuh-tempo') return i.status!=='lunas' && i.jatuhTempo < today;
    return i.status===filter;
  });
  if(!list.length) { tbody.innerHTML=`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px;">Belum ada invoice${filter!=='all'?' dengan filter ini':''}</td></tr>`; return; }
  tbody.innerHTML = list.map(i=>{
    const jt = i.jatuhTempo < today && i.status!=='lunas';
    const statusMap = {draft:'var(--muted)',terkirim:'var(--accent2)',lunas:'var(--accent)','jatuh-tempo':'var(--red)'};
    const s = jt?'jatuh-tempo':i.status;
    const badge = `<span style="background:${statusMap[s]}22;color:${statusMap[s]};padding:2px 8px;border-radius:6px;font-size:11px;text-transform:capitalize;">${s==='jatuh-tempo'?'<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jatuh Tempo':s}</span>`;
    return `<tr>
      <td style="font-family:var(--mono);font-size:12px;font-weight:600">${i.noInvoice}</td>
      <td>${i.pelanggan}</td>
      <td style="font-size:12px">${i.tanggal}</td>
      <td style="font-size:12px;${jt?'color:var(--red);font-weight:600;':''}">${i.jatuhTempo}</td>
      <td class="debit" style="font-family:var(--mono)">${rp(i.total)}</td>
      <td style="font-family:var(--mono);color:${i.sisaTagihan>0?'var(--accent3)':'var(--accent)'}">${rp(i.sisaTagihan)}</td>
      <td>${badge}</td>
      <td style="display:flex;gap:6px;">
        ${i.status!=='lunas'?`<button class="btn btn-ghost btn-sm" onclick="openModalLunasInvoice('${i.id}')"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lunas</button>`:''}
        <button class="btn btn-danger btn-sm" onclick="hapusInvoice('${i.id}')"><i class="ti ti-trash" style="font-size:14px;"></i></button>
      </td>
    </tr>`;
  }).join('');
}

function openModalLunasInvoice(id) {
  const inv = invoiceList.find(i=>i.id===id); if(!inv) return;
  document.getElementById('inv-lunas-id').value = id;
  document.getElementById('inv-lunas-nominal').value = inv.sisaTagihan;
  document.getElementById('inv-lunas-tgl').value = new Date().toISOString().split('T')[0];
  // Set default kas akun
  const kasDefault = akuns.find(a=>a.kode==='1101') || akuns.find(a=>a.tipe==='Aset');
  if(kasDefault) {
    const h=document.getElementById('inv-lunas-akun'); if(h) h.value=kasDefault.kode;
    const btn=document.getElementById('inv-lunas-akun-btn');
    if(btn){btn.innerHTML=`<span class="picker-kode-badge">${escapeHtml(kasDefault.kode)}</span> ${escapeHtml(kasDefault.nama)} <span style="margin-left:auto;color:var(--muted);font-size:10px;">▾</span>`;btn.classList.add('has-value');}
  }
  openModal('modal-inv-lunas');
  setTimeout(upgradeFormPickers, 80);
}

function konfirmasiLunasInvoice() {
  const id = document.getElementById('inv-lunas-id').value;
  const inv = invoiceList.find(i=>i.id===id); if(!inv) return;
  const tgl = document.getElementById('inv-lunas-tgl').value;
  const nominal = parseFloat(document.getElementById('inv-lunas-nominal').value)||0;
  const akunKas = document.getElementById('inv-lunas-akun').value;
  showOpSpinner('Memproses Pembayaran...', 'Membuat jurnal penerimaan kas');
  setTimeout(()=>{
    const entry = {
      id:'JRN_LNS_'+Date.now(), tanggal:tgl, jenis:'Manual',
      keterangan:`Pelunasan ${inv.noInvoice} — ${inv.pelanggan}`,
      lines:[{akun:akunKas,debit:nominal,kredit:0},{akun:inv.akunPiutang,debit:0,kredit:nominal}]
    };
    jurnalEntries.push(entry);
    inv.sisaTagihan = Math.max(0, inv.sisaTagihan - nominal);
    if(inv.sisaTagihan <= 0) inv.status = 'lunas';
    saveFiturBaru(); saveToStorage(false);
    closeModal('modal-inv-lunas');
    renderInvoiceList(); renderInvoiceKPI();
    showAlert(`✓ Pembayaran ${rp(nominal)} dicatat. Invoice ${inv.sisaTagihan<=0?'LUNAS':'sebagian terbayar'}.`);
    hideOpSpinner();
    cekNotifikasi();
  }, 800);
}

function hapusInvoice(id) {
  if(!confirm('Hapus invoice ini?')) return;
  showOpSpinner('Menghapus...','');
  setTimeout(()=>{
    invoiceList = invoiceList.filter(i=>i.id!==id);
    saveFiturBaru(); renderInvoiceList(); renderInvoiceKPI();
    showAlert('✓ Invoice dihapus'); hideOpSpinner();
  }, 400);
}

// ══════════════════════════════════════════════════════════════
// REKONSILIASI BANK
// ══════════════════════════════════════════════════════════════
function handleRekonCSV(input) {
  const file = input.files[0]; if(!file) return;
  document.getElementById('rekon-file-name').textContent = file.name;
  showOpSpinner('Membaca File CSV...', 'Memparse data mutasi bank');
  const reader = new FileReader();
  reader.onload = function(e) {
    const lines = e.target.result.split('\n').filter(l=>l.trim());
    const bank = document.getElementById('rekon-bank').value;
    rekonData.baris = parseCSVBank(lines, bank);
    hideOpSpinner();
    document.getElementById('rekon-summary').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div class="stat-card" style="padding:14px;"><div style="font-size:20px"><i class="ti ti-chart-bar ti-inline"></i></div><div class="stat-label">Total Baris</div><div style="font-size:18px;font-weight:700;color:var(--accent2);font-family:var(--mono);">${rekonData.baris.length}</div></div>
        <div class="stat-card" style="padding:14px;"><div style="font-size:20px">💰</div><div class="stat-label">Total Mutasi</div><div style="font-size:16px;font-weight:700;color:var(--accent);font-family:var(--mono);">${rp(rekonData.baris.reduce((s,b)=>s+Math.abs(b.nominal),0))}</div></div>
      </div>
      <div style="margin-top:12px;padding:10px;background:rgba(74,222,128,0.08);border-radius:8px;font-size:12px;color:var(--accent);"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${rekonData.baris.length} baris siap diproses. Klik "Proses Rekonsiliasi".</div>`;
    showAlert(`✓ File ${file.name} berhasil dibaca: ${rekonData.baris.length} transaksi`);
  };
  reader.readAsText(file);
}
