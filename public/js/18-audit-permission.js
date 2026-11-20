// Relocated Audit constants & hooks from retired 14-export.js (Domain 4A)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUDIT TRAIL SYSTEM â€” dengan label role multi-user
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

const AUDIT_KEY     = 'oas_audit_trail';
const AUDIT_MAX     = 2000;
const AUDIT_PAGE_SZ = 40;
let   _auditPage       = 0;
let   _auditFilter     = 'all';
let   _auditRoleFilter = null; // null = semua role, string = filter spesifik role
let   _auditBizFilter  = null; // null = semua bisnis, string = companyId spesifik

const AUDIT_COLORS = {
  create:'#4ade80', delete:'#f87171', edit:'#fbbf24',
  auto:'#22d3ee',   login:'#a78bfa',  export:'#fb923c',
  reset:'#ef4444',  info:'#94a3b8',
};

const AUDIT_ROLE_BADGE = {
  owner:  { label:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d=\"M2 20h20M5 20V10l7-6 7 6v10\"/><path d=\"M9 20v-5h6v5\"/></svg> Owner',  style:'background:rgba(250,204,21,0.15);color:#facc15;border:1px solid rgba(250,204,21,0.3);display:inline-flex;align-items:center;gap:4px;' },
  admin:  { label:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d=\"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z\"/></svg> Admin',  style:'background:rgba(34,211,238,0.12);color:var(--accent2);border:1px solid rgba(34,211,238,0.25);display:inline-flex;align-items:center;gap:4px;' },
  member: { label:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 20c0-4 3.6-7 8-7s8 3 8 7\"/></svg> Member', style:'background:rgba(148,163,184,0.12);color:#94a3b8;border:1px solid rgba(148,163,184,0.2);display:inline-flex;align-items:center;gap:4px;' },
  guest:  { label:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 9.9-1\"/></svg> Guest',  style:'background:rgba(148,163,184,0.08);color:#64748b;border:1px solid rgba(148,163,184,0.15);display:inline-flex;align-items:center;gap:4px;' },
  system: { label:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><circle cx=\"12\" cy=\"12\" r=\"3\"/><path d=\"M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z\"/></svg> Sistem', style:'background:rgba(139,92,246,0.12);color:#a78bfa;border:1px solid rgba(139,92,246,0.25);display:inline-flex;align-items:center;gap:4px;' },
  ai:     { label:'<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><rect x=\"3\" y=\"11\" width=\"18\" height=\"10\" rx=\"2\"/><circle cx=\"12\" cy=\"5\" r=\"2\"/><path d=\"M12 7v4M8 16v.01M16 16v.01\"/></svg> AI', style:'background:rgba(74,222,128,0.12);color:#4ade80;border:1px solid rgba(74,222,128,0.3);display:inline-flex;align-items:center;gap:4px;' },
};

// â”€â”€ Determine current actor role â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function _getActorRole() {
  // Guest / local mode
  if (typeof isGuestMode !== 'undefined' && isGuestMode) return 'guest';
  if (typeof currentUser === 'undefined' || !currentUser)  return 'guest';
  // Owner: company creator
  if (typeof currentCompany !== 'undefined' && currentCompany) {
    if (currentCompany.user_id === currentUser.id) return 'owner';
    // Peran anggota di bisnis ini
    if (typeof _currentMemberRole !== 'undefined' && _currentMemberRole === 'admin') return 'admin';
    if (typeof _currentMemberRole !== 'undefined' && _currentMemberRole === 'member') return 'member';
    if (typeof _currentMemberRole !== 'undefined' && _currentMemberRole === 'owner') return 'owner';
    // Fallback saat berada di bisnis orang lain: default ke member (bukan owner/admin)
    return 'member';
  }
  // Fallback: user sudah login tapi company belum dipilih/terisi (masih loading)
  if (currentUser?.id) return 'owner';
  return 'guest';
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUDIT HOOKS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// 1. Delete jurnal â€” patch confirm button after modal opens
function _patchHapusJurnalBtn() {
  const btn=document.getElementById('hapus-jurnal-confirm-btn');
  if(!btn||btn._auditPatched)return;
  btn._auditPatched=true;
  const orig=btn.onclick;
  btn.onclick=async function(){
    const idx=parseInt(document.getElementById('hapus-jurnal-idx')?.value??-1);
    const entry=idx>=0?jurnalEntries[idx]:null;
    if(orig)await orig.call(this);
    if(entry){
      const total=(entry.lines||[]).reduce((s,l)=>s+(l.debit||0),0);
      auditLog('delete','jurnal',
        `Hapus jurnal ${entry.jenis||'Manual'}: ${entry.ket||entry.keterangan||'â€”'} â€” ${fmtRp(total)}`,
        {ref:entry.no||entry.id});
    }
  };
}

// 2. Akun
const _origSimpanAkun2=window.simpanAkun;
window.simpanAkun=function(){
  const kode=document.getElementById('akun-kode')?.value;
  const nama=document.getElementById('akun-nama')?.value;
  const tipe=document.getElementById('akun-tipe')?.value;
  const editId=document.getElementById('akun-edit-id')?.value;
  _origSimpanAkun2?.();
  auditLog(editId?'edit':'create','akun',`${editId?'Edit':'Tambah'} akun: ${kode} â€” ${nama} (${tipe})`,{ref:kode});
};
const _origHapusAkun2=window.hapusAkun;
window.hapusAkun=function(kode){
  const akun=akuns.find(a=>a.kode===kode);
  _origHapusAkun2?.(kode);
  auditLog('delete','akun',`Hapus akun: ${kode} â€” ${akun?.nama||''}`,{ref:kode});
};

// 3. Aset Tetap
const _origSimpanAsetTetap2=window.simpanAsetTetap;
window.simpanAsetTetap=function(){
  const nama=document.getElementById('at-nama')?.value;
  const harga=document.getElementById('at-harga')?.value;
  const editId=document.getElementById('at-edit-id')?.value;
  _origSimpanAsetTetap2?.();
  auditLog(editId?'edit':'create','aset',
    `${editId?'Edit':'Tambah'} aset: ${nama} â€” ${fmtRp(parseFloat(harga)||0)}`,{ref:editId||nama});
};
const _origHapusAset2=window.hapusAset;
window.hapusAset=function(id){
  const aset=typeof asetTetapList!=='undefined'?asetTetapList.find(a=>a.id===id):null;
  _origHapusAset2?.(id);
  auditLog('delete','aset',`Hapus aset: ${aset?.nama||id}`,{ref:id});
};
const _origDisposalAset2=window.disposalAset;
window.disposalAset=function(id){
  const aset=typeof asetTetapList!=='undefined'?asetTetapList.find(a=>a.id===id):null;
  _origDisposalAset2?.(id);
  auditLog('edit','aset',`Disposal aset: ${aset?.nama||id}`,{ref:id});
};

// 4. Produk
const _origSimpanProduk2=window.simpanProduk;
window.simpanProduk=function(){
  const ksId=document.getElementById('produk-edit-id')?.value;
  const hj=document.getElementById('produk-harga-jual')?.value;
  const ppn=document.getElementById('produk-ppn')?.value;
  _origSimpanProduk2?.();
  auditLog('edit','produk',
    `Update produk: harga jual ${fmtRp(parseFloat(hj)||0)}${ppn?', PPN '+ppn+'%':''}`,{ref:ksId});
};

// 5. Kontak
const _origSimpanKontak2=window.simpanKontak;
window.simpanKontak=function(){
  const nama=document.getElementById('kontak-nama')?.value;
  const editId=document.getElementById('kontak-edit-id')?.value;
  _origSimpanKontak2?.();
  auditLog(editId?'edit':'create','kontak',`${editId?'Edit':'Tambah'} kontak: ${nama}`,{ref:editId||nama});
};
const _origHapusKontak2=window.hapusKontak;
window.hapusKontak=function(id){
  const k=typeof kontakList!=='undefined'?kontakList.find(c=>c.id===id):null;
  _origHapusKontak2?.(id);
  auditLog('delete','kontak',`Hapus kontak: ${k?.nama||id}`,{ref:id});
};

// 6. Invoice
const _origSimpanInvoice2=window.simpanInvoice;
window.simpanInvoice=function(){
  const no=document.getElementById('inv-no')?.value;
  _origSimpanInvoice2?.();
  auditLog('create','invoice',`Buat invoice ${no||'baru'}`,{ref:no});
};

// 7. Export
const _origDoExport2=window.doExport;
window.doExport=function(){
  const fmt=typeof exportFmt!=='undefined'?exportFmt:'â€”';
  const nama=document.getElementById('exp-nama-perusahaan')?.value||'â€”';
  _origDoExport2?.();
  auditLog('export','system',`Export laporan ${fmt.toUpperCase()} â€” ${nama}`,{ref:fmt});
};

// 8. Reset
const _origConfirmResetAll2=window.confirmResetAll;
window.confirmResetAll=function(){
  auditLog('reset','system','Membuka konfirmasi Reset Semua Data âš ï¸');
  _origConfirmResetAll2?.();
};

// 9. Transaksi cepat penjualan & pembelian
const _origSimpanPenjualan2=window.simpanPenjualan;
window.simpanPenjualan=function(){
  const inv=document.getElementById('jual-inv')?.value||'';
  const jml=parseFloat(document.getElementById('jual-jumlah')?.value)||0;
  _origSimpanPenjualan2?.();
  auditLog('create','jurnal',`Penjualan${inv?' '+inv:''} â€” ${fmtRp(jml)}`,{ref:inv});
};
const _origSimpanPembelian2=window.simpanPembelian;
window.simpanPembelian=function(){
  const po=document.getElementById('beli-po')?.value||'';
  const jml=parseFloat(document.getElementById('beli-jumlah')?.value)||0;
  _origSimpanPembelian2?.();
  auditLog('create','jurnal',`Pembelian${po?' '+po:''} â€” ${fmtRp(jml)}`,{ref:po});
};

// 10. Auto penyusutan
const _origAtCheck2=window.atCheckAndRunAutoPenyusutan;
window.atCheckAndRunAutoPenyusutan=function(force=false){
  const before=jurnalEntries.length;
  _origAtCheck2?.(force);
  const after=jurnalEntries.length;
  if(after>before){
    const n=typeof asetTetapList!=='undefined'?asetTetapList.filter(a=>a.status==='aktif').length:0;
    auditLog('auto','jurnal',`Penyusutan otomatis${force?' (manual)':''} â€” ${n} aset`,{ref:'AUTO-DEPRE',count:n});
  }
};

// â”€â”€ showPage hook â€” init audit page + patch hapus btn â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _origShowPageAudit=window.showPage;
window.showPage=function(id){
  _origShowPageAudit?.(id);
  if(id==='audit-trail') setTimeout(()=>{initAuditPage();_patchHapusJurnalBtn();},80);
  if(id==='jurnal-umum') setTimeout(_patchHapusJurnalBtn,200);
};

// â”€â”€ Log startup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
window.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>auditLog('info','system','Aplikasi dibuka',{ref:'STARTUP'}),2000);
});


// Relocated from retired 11-kontak-invoice.js (Domain 3A)
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
};

function makeDefaultPerms() {
  const p = {};
  Object.keys(MODULES_CRUD).forEach(mod => { p[mod] = { read: true }; });
  return p;
}

function _getCurrentActorLabel() {
  if (typeof currentUser !== 'undefined' && currentUser?.email) {
    return currentUser.user_metadata?.full_name
        || currentUser.user_metadata?.name
        || currentUser.email;
  }
  if (typeof isGuestMode !== 'undefined' && isGuestMode) return 'Guest (Lokal)';
  return 'Pengguna';
}

// â”€â”€ Core logger â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function auditLog(action, category, description, meta = {}) {
  try {
    const logs      = auditGetAll();
    // meta.aiActed: aksi ini dieksekusi otomatis oleh Orias AI (bukan diketik
    // manual oleh pengguna) â€” dicatat dengan label role "AI" tersendiri supaya
    // bisa dibedakan dari aksi yang dilakukan langsung oleh Owner/Admin/Member.
    const isAI      = !!meta.aiActed;
    const who       = isAI ? 'Orias AI' : _getCurrentActorLabel();
    const role      = isAI ? 'ai' : _getActorRole();
    if (isAI) { meta = {...meta}; delete meta.aiActed; }
    const companyId   = (typeof currentCompany !== 'undefined' && currentCompany?.id)   || null;
    const companyName = (typeof currentCompany !== 'undefined' && currentCompany?.name) || null;
    const entry = {
      id:   'AL_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
      ts:   new Date().toISOString(),
      action, category, description, who, role,
      companyId, companyName,
      meta,
    };
    logs.unshift(entry);
    if (logs.length > AUDIT_MAX) logs.length = AUDIT_MAX;
    localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
  } catch(e) { console.warn('[Audit] Failed:', e); }
}

function auditGetAll() {
  try { return JSON.parse(localStorage.getItem(AUDIT_KEY)||'[]'); } catch { return []; }
}

// â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function renderAuditTrail() {
  if (typeof window.__oasReactAuditRefresh === 'function') { window.__oasReactAuditRefresh(); return; }
  const logs   = auditGetAll();
  const search = (document.getElementById('audit-search')?.value||'').toLowerCase();
  const filtered = logs.filter(e => {
    if (_auditFilter !== 'all' && e.action !== _auditFilter) return false;
    if (_auditRoleFilter !== null && (e.role||'guest') !== _auditRoleFilter) return false;
    // Filter per bisnis: jika _auditBizFilter di-set, hanya tampilkan log bisnis itu
    if (_auditBizFilter !== null && (e.companyId||null) !== _auditBizFilter) return false;
    if (search && !e.description.toLowerCase().includes(search)
               && !e.category.toLowerCase().includes(search)
               && !(e.who||'').toLowerCase().includes(search)
               && !(e.meta?.ref||'').toLowerCase().includes(search)
               && !(e.companyName||'').toLowerCase().includes(search)) return false;
    return true;
  });
  // KPI selalu dihitung dari log bisnis aktif (atau semua jika tidak ada filter)
  const kpiLogs = _auditBizFilter !== null
    ? logs.filter(e => (e.companyId||null) === _auditBizFilter)
    : logs;
  _renderAuditKPI(kpiLogs);
  _renderAuditBizBar(logs);
  const el = document.getElementById('audit-trail-list');
  if (!el) return;
  const slice = filtered.slice(0, (_auditPage+1)*AUDIT_PAGE_SZ);
  if (!slice.length) {
    el.innerHTML = `<div class="at-trail-empty">
      <i class="ti ti-shield-off"></i>
      ${logs.length ? 'Tidak ada aktivitas sesuai filter.' : 'Belum ada aktivitas tercatat.<br><span style="font-size:12px;">Log muncul saat kamu mulai menggunakan aplikasi.</span>'}
    </div>`;
    document.getElementById('audit-load-more').style.display='none';
    return;
  }
  el.innerHTML = slice.map((e,i) => {
    const isLast  = i === slice.length-1;
    const color   = AUDIT_COLORS[e.action] || AUDIT_COLORS.info;
    const timeStr = _auditFmtTime(e.ts);
    const rb      = AUDIT_ROLE_BADGE[e.role||'guest'] || AUDIT_ROLE_BADGE.guest;
    const diffHtml = e.meta?.diff ? _renderDiff(e.meta.diff) : '';
    const metaHtml = e.meta?.ref ? `<div class="at-trail-meta">${e.meta.ref}</div>` : '';
    // Badge nama bisnis â€” tampilkan jika ada dan filter bukan per-bisnis tunggal
    const bizBadge = (e.companyName && _auditBizFilter === null)
      ? `<span style="font-size:10px;color:var(--muted);background:var(--surface2,rgba(255,255,255,0.06));border:0.5px solid var(--border);padding:1px 6px;border-radius:4px;flex-shrink:0;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${e.companyName}"><i class="ti ti-building" style="font-size:9px;vertical-align:-1px;margin-right:2px;"></i>${e.companyName}</span>`
      : '';
    return `<div class="at-trail-row">
      <div class="at-trail-timeline">
        <div class="at-trail-dot" style="background:${color};"></div>
        ${!isLast?'<div class="at-trail-line"></div>':''}
      </div>
      <div class="at-trail-card">
        <div class="at-trail-header">
          <span class="at-trail-action ${e.action}">${_auditActionLabel(e.action)}</span>
          <span class="at-trail-role-badge" style="${rb.style};font-size:10px;font-weight:700;padding:1px 7px;border-radius:5px;flex-shrink:0;">${rb.label}</span>
          ${bizBadge}
          <span class="at-trail-who"><i class="ti ti-user" style="font-size:10px;vertical-align:-1px;margin-right:3px;"></i>${e.who||'â€”'}</span>
          <span class="at-trail-time">${timeStr}</span>
        </div>
        <div class="at-trail-desc">${e.description}</div>
        ${metaHtml}${diffHtml}
      </div>
    </div>`;
  }).join('');
  const lm = document.getElementById('audit-load-more');
  if (lm) lm.style.display = filtered.length > slice.length ? '' : 'none';
}

// Render bar filter per bisnis â€” auto-generate dari log yang ada
function _renderAuditBizBar(logs) {
  // Pill tab bisnis digantikan oleh tombol opt-picker audit-biz-btn
  // Fungsi ini dikosongkan â€” logika show/hide ditangani oleh override di akhir file
}

function auditSetBizFilter(companyId) {
  _auditBizFilter = companyId;
  _auditPage = 0;
  renderAuditTrail();
}

function _renderAuditKPI(logs) {
  const el = document.getElementById('audit-kpi'); if (!el) return;
  const today = new Date().toISOString().slice(0,10);
  const todayLogs = logs.filter(e=>e.ts.startsWith(today));
  // Count by role
  const ownerCount  = logs.filter(e=>e.role==='owner').length;
  const memberCount = logs.filter(e=>e.role==='member'||e.role==='admin').length;
  const aiCount     = logs.filter(e=>e.role==='ai').length;
  const kpis = [
    { label:'Total Log',        val:logs.length.toLocaleString('id-ID'), icon:'shield-check',   clr:'var(--accent2)' },
    { label:'Hari Ini',         val:todayLogs.length,                    icon:'calendar-today', clr:'var(--accent)'  },
    { label:'Aksi Hapus',       val:logs.filter(e=>e.action==='delete').length, icon:'trash',   clr:'var(--red)'     },
    { label:'Oleh Owner',       val:ownerCount,                           icon:'crown',          clr:'#facc15'        },
    { label:'Oleh Tim',         val:memberCount,                          icon:'users',          clr:'var(--accent3)' },
    { label:'Oleh AI',          val:aiCount,                              icon:'robot',          clr:'#4ade80'        },
  ];
  el.innerHTML = kpis.map(k=>
    `<div style="flex:1;min-width:110px;background:var(--surface);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;">
      <div style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:5px;"><i class="ti ti-${k.icon}" style="font-size:12px;"></i>${escapeHtml(k.label)}</div>
      <div style="font-size:16px;font-weight:700;color:${k.clr};margin-top:4px;">${k.val}</div>
    </div>`
  ).join('');
}

function _auditActionLabel(action) {
  return {create:'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" style="vertical-align:-1px"><line x1=\"12\" y1=\"5\" x2=\"12\" y2=\"19\"/><line x1=\"5\" y1=\"12\" x2=\"19\" y2=\"12\"/></svg> Buat',delete:'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><polyline points=\"3 6 5 6 21 6\"/><path d=\"M19 6l-1 14H6L5 6\"/><path d=\"M10 11v6M14 11v6\"/><path d=\"M9 6V4h6v2\"/></svg> Hapus',edit:'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d=\"M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7\"/><path d=\"M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\"/></svg> Edit',
          auto:'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><polygon points=\"13 2 3 14 12 14 11 22 21 10 12 10 13 2\"/></svg> Otomatis',login:'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><rect x=\"3\" y=\"11\" width=\"18\" height=\"11\" rx=\"2\"/><path d=\"M7 11V7a5 5 0 0 1 10 0v4\"/></svg> Sesi',export:'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d=\"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4\"/><polyline points=\"17 8 12 3 7 8\"/><line x1=\"12\" y1=\"3\" x2=\"12\" y2=\"15\"/></svg> Export',
          reset:'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><path d=\"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z\"/><line x1=\"12\" y1=\"9\" x2=\"12\" y2=\"13\"/><line x1=\"12\" y1=\"17\" x2=\"12.01\" y2=\"17\"/></svg> Reset',info:'<svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><circle cx=\"12\" cy=\"12\" r=\"10\"/><line x1=\"12\" y1=\"8\" x2=\"12\" y2=\"12\"/><line x1=\"12\" y1=\"16\" x2=\"12.01\" y2=\"16\"/></svg> Info'}[action]||action;
}

function _auditFmtTime(iso) {
  try {
    const d=new Date(iso),now=new Date(),diff=now-d,min=Math.floor(diff/60000);
    if(min<1) return 'Baru saja';
    if(min<60) return `${min} mnt lalu`;
    const h=Math.floor(min/60);
    if(h<24) return `${h} jam lalu`;
    const dy=Math.floor(h/24);
    if(dy<7) return `${dy} hari lalu`;
    return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})
      +' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  } catch { return iso; }
}

function _renderDiff(diff) {
  if(!diff) return '';
  const rows = Object.entries(diff).map(([f,{old:o,new:n}])=>
    `<div><span style="color:var(--muted);min-width:80px;display:inline-block;">${f}:</span>`+
    `<span class="at-trail-diff-old">${o??'â€”'}</span> â†’ <span class="at-trail-diff-new">${n??'â€”'}</span></div>`
  ).join('');
  return `<div class="at-trail-diff">${rows}</div>`;
}

// â”€â”€ Role filter toggle (label role badges) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function auditToggleRoleFilter(role) {
  // Klik badge yang sama dua kali = reset ke semua
  if (_auditRoleFilter === role) {
    _auditRoleFilter = null;
  } else {
    _auditRoleFilter = role;
  }
  _auditPage = 0;
  // Update visual state semua badge
  document.querySelectorAll('.at-role-filter-badge').forEach(b => {
    b.style.opacity = '1';
    b.style.boxShadow = '';
    b.style.transform = '';
  });
  if (_auditRoleFilter !== null) {
    // Redup badge yang tidak aktif, highlight yang aktif
    document.querySelectorAll('.at-role-filter-badge').forEach(b => {
      if (b.id !== 'audit-role-' + _auditRoleFilter) {
        b.style.opacity = '0.35';
      } else {
        b.style.boxShadow = '0 0 0 2px currentColor';
        b.style.transform = 'scale(1.08)';
      }
    });
  }
  renderAuditTrail();
}

// â”€â”€ Filter & pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function auditSetFilter(f) {
  _auditFilter=f; _auditPage=0;
  document.querySelectorAll('.at-trail-filter-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('audit-f-'+f)?.classList.add('active');
  renderAuditTrail();
}
function auditLoadMore() { _auditPage++; renderAuditTrail(); }

// â”€â”€ Export CSV â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function auditExportCSV() {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    showAlert('â›” Akses ditolak: Audit Trail hanya dapat diekspor oleh Admin atau Pemilik bisnis.');
    return;
  }
  const logs=auditGetAll();
  if(!logs.length){showAlert('Belum ada log audit.');return;}
  const header=['Waktu','Bisnis','Aksi','Kategori','Deskripsi','Oleh','Role','Referensi'];
  const rows=logs.map(e=>[
    new Date(e.ts).toLocaleString('id-ID'),
    e.companyName||'',
    e.action,e.category,e.description,e.who||'',e.role||'',e.meta?.ref||''
  ].map(v=>`"${String(v).replace(/"/g,'""')}"`));
  const csv=[header,...rows].map(r=>r.join(',')).join('\n');
  const blob=new Blob(['ï»¿'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`audit-trail-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();URL.revokeObjectURL(url);
  auditLog('export','system',`Export audit trail CSV â€” ${logs.length} entri`);
}

// â”€â”€ Clear old >90 days â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function auditClearOld() {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    showAlert('â›” Akses ditolak: Hanya Admin atau Pemilik bisnis yang dapat membersihkan log audit.');
    return;
  }
  const cutoff=new Date(Date.now()-90*24*3600*1000).toISOString();
  const logs=auditGetAll(),before=logs.length;
  const fresh=logs.filter(e=>e.ts>=cutoff);
  localStorage.setItem(AUDIT_KEY,JSON.stringify(fresh));
  const removed=before-fresh.length;
  auditLog('info','system',`Membersihkan ${removed} log audit lama (>90 hari)`);
  renderAuditTrail();
  showAlert(`${removed} log lama dihapus.`);
}

// â”€â”€ Init page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function initAuditPage() {
  if (typeof window.__oasReactAuditRefresh === 'function') { window.__oasReactAuditRefresh(); return; }
  _auditPage=0;_auditFilter='all';_auditRoleFilter=null;_auditBizFilter=null;
  document.querySelectorAll('.at-trail-filter-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('audit-f-all')?.classList.add('active');
  document.querySelectorAll('.at-role-filter-badge').forEach(b=>{b.style.opacity='1';b.style.boxShadow='';b.style.transform='';});
  const s=document.getElementById('audit-search');if(s)s.value='';
  renderAuditTrail();
}

// â”€â”€ Login/logout helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function auditLogLogin(email) {
  // Tunggu hingga currentCompany terisi (maks 5 detik) agar role & companyId akurat
  const MAX_WAIT = 5000, INTERVAL = 200;
  let elapsed = 0;
  const tryLog = () => {
    const companyReady = typeof currentCompany !== 'undefined' && currentCompany?.id;
    if (companyReady || elapsed >= MAX_WAIT) {
      auditLog('login','system',`Login: ${email} â€” sesi dimulai`,{ref:email});
    } else {
      elapsed += INTERVAL;
      setTimeout(tryLog, INTERVAL);
    }
  };
  setTimeout(tryLog, INTERVAL);
}
function auditLogLogout(email) {
  auditLog('login','system',`Logout: ${email||'pengguna'}`,{ref:email});
}

let _orgMembers = [];
let _currentMemberRole = null;

async function loadOrgMembers() {
  if (!currentCompany || !_supa) {
    _orgMembers = [];
    _currentMemberRole = null;
    return [];
  }
  try {
    const { data, error } = await DB.table('org_members').select('*').eq('company_id', currentCompany.id);
    if (error) {
      console.error('loadOrgMembers:', error);
      _currentMemberRole = (currentCompany?.user_id && currentUser?.id && currentCompany.user_id === currentUser.id) ? 'owner' : 'member';
      return [];
    }
    _orgMembers = data || [];
    const myId = currentUser?.id;
    const myEmail = (currentUser?.email || '').trim().toLowerCase();
    const me = _orgMembers.find(m =>
      (myId && m.user_id === myId) ||
      (myEmail && m.email && m.email.trim().toLowerCase() === myEmail)
    );
    // Undangan email yang user_id-nya belum terkait diklaim lewat rpc klaim_undangan()
    // (dipanggil di getMyCompanies); update langsung ke org_members ditolak RLS untuk non-admin.
    if (me && !me.user_id && myId) me.user_id = myId;
    // Tentukan peran aktif untuk bisnis ini
    if (currentCompany?.user_id && myId && currentCompany.user_id === myId) {
      _currentMemberRole = 'owner';
    } else if (me) {
      _currentMemberRole = me.role || 'member';
    } else {
      _currentMemberRole = 'member';
    }
    return _orgMembers;
  } catch(e) {
    console.error('loadOrgMembers:', e);
    _currentMemberRole = (currentCompany?.user_id && currentUser?.id && currentCompany.user_id === currentUser.id) ? 'owner' : 'member';
    return [];
  }
}

function isAdmin() {
  if (currentCompany?.user_id && currentUser?.id && currentCompany.user_id === currentUser.id) return true;
  return _currentMemberRole === 'admin' || _currentMemberRole === 'owner';
}

// Viewer = hanya baca (task 3.5). Nilai permissions di org_members tidak boleh melonggarkan ini.
function isReadOnly() {
  return typeof bisnisHanyaBaca === 'function' && bisnisHanyaBaca(currentCompany, currentUser?.id, _currentMemberRole);
}

let _readOnlyNotifTs = 0;
/** Dipanggil di awal fungsi penyimpan. True = diblokir (viewer); user diberi tahu paling sering sekali per 5 detik. */
function guardHanyaBaca(aksi) {
  if (!isReadOnly()) return false;
  // Pemanggil sering sudah menampilkan spinner "Menyimpan..."; tanpa ini spinner nyangkut karena fungsi berhenti di sini.
  if (typeof hideOpSpinner === 'function') hideOpSpinner();
  if (Date.now() - _readOnlyNotifTs > 5000) {
    _readOnlyNotifTs = Date.now();
    if (typeof showAlert === 'function') showAlert('ðŸ”’ Kamu Viewer di bisnis ini, jadi hanya bisa melihat data.' + (aksi ? ' ' + aksi + ' tidak disimpan.' : ''));
  }
  return true;
}

function hasPerm(mod, act = 'read') {
  if (typeof currentCompany === 'undefined' || !currentCompany || typeof currentUser === 'undefined' || !currentUser) return true;
  if (isAdmin()) return true;
  if (isReadOnly() && act !== 'read') return false;
  if (act !== 'read') return true; // izin per modul hanya mengatur Lihat; hak ubah ikut peran
  const myId = currentUser?.id;
  const myEmail = (currentUser?.email || '').trim().toLowerCase();
  const me = _orgMembers.find(m =>
    (myId && m.user_id === myId) ||
    (myEmail && m.email && m.email.trim().toLowerCase() === myEmail)
  );
  if (!me) return false;
  const p = me.permissions || {};
  return p[mod]?.[act] !== false;
}

// Menu yang tidak boleh dibuka tetap tampil tetapi diberi tanda terkunci (redup + tooltip);
// kliknya ditolak oleh showPage()/openExportModal() dengan pesan akses ditolak.
function _setPermLocked(el, locked) {
  el.classList.toggle('perm-locked', !!locked);
  if (locked) { if (el.dataset.permTitle === undefined) el.dataset.permTitle = el.title || ''; el.title = 'Tidak ada izin akses â€” hubungi admin'; }
  else if (el.dataset.permTitle !== undefined) { el.title = el.dataset.permTitle; delete el.dataset.permTitle; }
}

function enforcePermissions() {
  const isAdm = isAdmin();
  const readOnly = typeof isReadOnly === 'function' && isReadOnly();
  if (typeof document !== 'undefined' && document.body) {
    document.body.classList.toggle('role-viewer', !!readOnly);
  }

  const navUserMgmt = document.getElementById('nav-user-mgmt');
  if (navUserMgmt) navUserMgmt.style.display = isAdm ? '' : 'none';

  // Menu sidebar dan tombol Aksi Cepat tetap tampil; yang modulnya tidak boleh dilihat diberi tanda terkunci (admin/owner selalu penuh)
  document.querySelectorAll('[data-page]').forEach(el => {
    const pageId = el.getAttribute('data-page');
    if (pageId === 'audit-trail') {
      _setPermLocked(el, !isAdm);
      return;
    }
    const mod = modulUntukHalaman(pageId);
    if (mod) _setPermLocked(el, !hasPerm(mod, 'read'));
  });
  document.querySelectorAll('.quick-action-btn[onclick*="showPage("]').forEach(btn => {
    const m = /showPage\('([^']+)'\)/.exec(btn.getAttribute('onclick') || '');
    if (m && m[1] === 'audit-trail') {
      _setPermLocked(btn, !isAdm);
      return;
    }
    const mod = m && modulUntukHalaman(m[1]);
    if (mod) _setPermLocked(btn, !hasPerm(mod, 'read'));
  });
  document.querySelectorAll('[onclick*="openExportModal"], [data-oas-action="openExportModal"]').forEach(el => _setPermLocked(el, !hasPerm('export', 'read')));
  // Reset Data khusus admin/owner
  document.querySelectorAll('#storage-reset-btn, [onclick*="resetData"], [onclick*="confirmResetAll"]').forEach(b => { b.style.display = isAdm ? '' : 'none'; });

  // Sembunyikan tombol aksi buat/ubah untuk role Viewer (task 3.5)
  const viewerSelectors = [
    'button[onclick*="openModalInvoice"]',
    'button[onclick*="openModalBill"]',
    'button[onclick*="openModalKontak"]',
    'button[onclick*="openModalAkun"]',
    'button[onclick*="openModalAsetTetap"]',
    'button[onclick*="openModalTambahKS"]',
    'button[onclick*="openModalKelolaSemuaKartuStock"]',
    'button[onclick*="openModalJurnalBerulang"]',
    'button[onclick*="openModalAlertBaru"]',
    'button[onclick*="openModalAnggaran"]',
    'button[onclick*="openModalSaldoAwal"]',
    '#btn-setting-saldo-awal',
    '#coa-trash-btn'
  ];
  document.querySelectorAll(viewerSelectors.join(',')).forEach(b => {
    b.style.display = readOnly ? 'none' : '';
  });
}

// â”€â”€ Share Link / Join Code â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
/** Ambil join code aktif untuk company saat ini; kalau tidak ada/kedaluwarsa, minta database membuatnya. */
async function getOrCreateJoinCode() {
  if (!currentCompany || !_supa) return null;
  const { data: existing } = await DB.table('company_join_codes')
    .select('code,expires_at').eq('company_id', currentCompany.id).maybeSingle();
  if (existing && new Date(existing.expires_at) > new Date()) return existing.code;
  // Kode dibuat di database (acak kuat, berlaku 7 hari) lewat rpc buat_kode_gabung(cid)
  const { data: code, error } = await _supa.rpc('buat_kode_gabung', { cid: currentCompany.id });
  if (error) throw new Error(error.message || 'Gagal membuat kode gabung');
  return code;
}

async function showJoinCodeModal() {
  if (!isAdmin()) { showAlert('Hanya admin yang bisa melihat join code.'); return; }
  const btn = document.getElementById('btn-show-joincode');
  if (btn) { btn.disabled = true; btn.textContent = 'Memuat...'; }
  try {
    const code = await getOrCreateJoinCode();
    const joinLink = `${location.origin}${location.pathname}?join=${code}`;
    document.getElementById('joincode-display').textContent = code || 'â€”';
    document.getElementById('joincode-link').value = joinLink;
    if (btn) { btn.disabled = false; btn.textContent = 'Perbarui Kode'; }
    openModal('modal-joincode');
  } catch(e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Lihat Join Code'; }
    showAlert('Gagal: ' + e.message + '\n\nPastikan tabel company_join_codes sudah dibuat.');
  }
}

async function regenerateJoinCode() {
  const btn = document.getElementById('btn-regen-code');
  btn.disabled = true; btn.textContent = 'Memperbarui...';
  await DB.table('company_join_codes').delete().eq('company_id', currentCompany.id);
  btn.disabled = false; btn.textContent = 'Perbarui Kode';
  await showJoinCodeModal();
}

function copyJoinLink() {
  const val = document.getElementById('joincode-link').value;
  navigator.clipboard.writeText(val).then(() => showAlert('âœ“ Link berhasil disalin!')).catch(() => {
    document.getElementById('joincode-link').select();
    document.execCommand('copy');
    showAlert('âœ“ Link disalin!');
  });
}

/** Cek apakah URL punya ?join=CODE dan proses join */
async function checkJoinCodeInURL() {
  const params = new URLSearchParams(location.search);
  const rawCode = params.get('join');
  if (!rawCode) return; // Tidak ada join code di URL, skip

  const code = rawCode.toUpperCase();
  // Hilangkan dari URL segera
  history.replaceState({}, '', location.pathname);

  if (!currentUser) {
    // Simpan ke sessionStorage HANYA jika ada di URL dan user belum login
    sessionStorage.setItem('oas_pending_join', code);
    showAlert('ðŸ”— Link undangan terdeteksi!\n\nSilakan login terlebih dahulu untuk bergabung ke bisnis ini.');
    setTimeout(() => showAuthModal?.(), 400);
    return;
  }
  await _processJoinCode(code);
}

/** Proses join code setelah user dipastikan sudah login (lewat rpc gabung(kode); peran awal viewer) */
async function _processJoinCode(code) {
  if (!code || !currentUser) return;
  // Hapus dari sessionStorage
  sessionStorage.removeItem('oas_pending_join');
  try {
    // Server memeriksa kode dan kedaluwarsa; bisnis baru terlihat setelah gabung, jadi konfirmasi memakai kodenya.
    if (!confirm(`âœ… Bergabung ke bisnis dengan kode ${code}?\n\nKamu akan ditambahkan sebagai Viewer (hanya bisa melihat). Admin bisa mengubah peran dan izin aksesmu.`)) return;
    const { data: res, error } = await _supa.rpc('gabung', { kode: code });
    if (error) throw new Error(error.message || 'Gagal bergabung');
    const ringkas = ringkasHasilGabung(res);
    if (!ringkas.berhasil) { showAlert(ringkas.pesan); return; }
    showAlert(ringkas.pesan + '<br><br>Klik tombol bisnis di pojok kiri atas untuk memilih bisnis tersebut.');
    // Refresh company list agar bisnis baru muncul
    const companies = await getMyCompanies();
    const newCo = companies.find(c => c.id === res.company_id);
    if (newCo && !currentCompany) {
      await selectCompany(newCo);
      updateUserChip?.();
    }
  } catch(e) {
    console.error('_processJoinCode error:', e);
    showAlert('Error saat bergabung: ' + e.message);
  }
}

// â”€â”€ Modal User Management â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openUserMgmtModal() {
  if (!isAdmin()) { showAlert('Hanya admin yang bisa mengelola tim.'); return; }
  renderUserMgmtList();
  openModal('modal-user-mgmt');
}

async function renderUserMgmtList() {
  const el = document.getElementById('user-mgmt-list');
  const sqlNote = document.getElementById('user-mgmt-sql-note');
  if (!el) return;
  el.innerHTML = '<div style="color:var(--muted);font-size:13px;padding:20px;text-align:center;"><i class="ti ti-loader" style="font-size:20px;display:block;margin:0 auto 8px;animation:spin 1s linear infinite;"></i>Memuat anggota...</div>';

  // Cek apakah tabel org_members sudah ada
  try {
    const { error: tableCheck } = await DB.table('org_members').select('id').limit(1);
    if (tableCheck && (tableCheck.code === '42P01' || tableCheck.message?.includes('does not exist'))) {
      if (sqlNote) sqlNote.style.display = 'block';
      el.innerHTML = `<div style="text-align:center;padding:24px 16px;">
        <i class="ti ti-database-off" style="font-size:32px;display:block;margin:0 auto 12px;opacity:0.3;"></i>
        <div style="font-size:13px;color:var(--muted);">Tabel <code>org_members</code> belum dibuat.<br>Jalankan SQL dari tombol "Lihat SQL" di bawah terlebih dahulu.</div>
      </div>`;
      return;
    }
    if (sqlNote) sqlNote.style.display = 'none';
  } catch(e) { if (sqlNote) sqlNote.style.display = 'block'; }

  await loadOrgMembers();
  if (!_orgMembers.length) {
    el.innerHTML = `<div style="text-align:center;padding:32px 16px;">
      <i class="ti ti-users" style="font-size:32px;display:block;margin:0 auto 12px;opacity:0.3;"></i>
      <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Belum ada anggota tim.<br>Bagikan join code agar user lain bisa bergabung.</div>
      <button class="btn btn-primary btn-sm" onclick="showJoinCodeModal()"><i class="ti ti-link ti-btn"></i> Tampilkan Join Code</button>
    </div>`;
    return;
  }
  el.innerHTML = _orgMembers.map(m => {
    const isMe = m.user_id === currentUser?.id;
    const p = m.permissions || {};
    const modCount = Object.keys(MODULES_CRUD).length;
    const activeCount = Object.keys(MODULES_CRUD).filter(mod => p[mod]?.read !== false).length;
    const roleBadge = m.role === 'admin'
      ? `<span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;background:rgba(245,158,11,0.15);color:var(--accent3);">Admin</span>`
      : m.role === 'viewer'
      ? `<span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;background:rgba(148,163,184,0.15);color:var(--muted);">Viewer</span>`
      : `<span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;background:rgba(34,211,238,0.1);color:var(--accent2);">Member</span>`;
    return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--accent)22;border:1px solid var(--accent)44;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:var(--accent);flex-shrink:0;">
          ${(m.nama||m.email||'?').charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
            <span style="font-weight:600;font-size:14px;">${m.nama||'â€”'}</span>
            ${roleBadge}
            ${isMe?'<span style="font-size:10px;color:var(--accent);background:rgba(74,222,128,0.1);padding:2px 6px;border-radius:4px;font-weight:600;">Saya</span>':''}
          </div>
          <div style="font-size:11px;color:var(--muted);">${m.email||'â€”'}${m.nik?' Â· NIK: '+m.nik:''}${m.jabatan?' Â· '+m.jabatan:''}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;"><i class="ti ti-shield-check" style="font-size:11px;width:11px;height:11px;vertical-align:-1px;"></i> ${activeCount}/${modCount} modul Â· Status: <span style="color:${m.status==='active'?'var(--accent)':'var(--accent3)'}">${m.status==='active'?'Aktif':'Pending'}</span></div>
        </div>
        ${!isMe ? `<div style="display:flex;gap:6px;flex-shrink:0;">
          <button class="btn btn-ghost btn-sm" onclick="openEditMember('${m.id}')"><i class="ti ti-pencil ti-btn"></i> Edit</button>
          <button class="btn btn-danger btn-sm" onclick="removeMember('${m.id}','${m.nama||m.email}')"><i class="ti ti-trash ti-btn"></i></button>
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

async function removeMember(memberId, nama) {
  if (!confirm(`Hapus anggota "${nama}" dari tim?`)) return;
  const { error } = await DB.table('org_members').delete().eq('id', memberId);
  if (error) { showAlert('Gagal hapus: ' + error.message); return; }
  showAlert(`âœ“ "${nama}" dihapus dari tim.`);
  renderUserMgmtList();
}

// â”€â”€ Invite / Edit Member dengan CRUD Permissions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function openInviteModal() {
  if (!isAdmin()) return;
  document.getElementById('invite-email').value = '';
  document.getElementById('invite-nama').value = '';
  document.getElementById('invite-nik').value = '';
  document.getElementById('invite-jabatan').value = '';
  document.getElementById('invite-role').value = 'member';
  renderPermTable('perm-table-invite', makeDefaultPerms());
  // Upgrade role select ke opt-picker dengan icon SVG
  const invRole = document.getElementById('invite-role');
  if (invRole) {
    upgradeSelectToOptPicker(invRole, {
      title: '<i class="ti ti-shield-check" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Pilih Role',
      iconMap: {
        viewer: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted)"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        member: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent2)"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        admin:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent3)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>'
      },
      subMap: {
        viewer: 'Hanya bisa melihat data, tidak bisa mengubah',
        member: 'Akses dibatasi sesuai izin yang diatur',
        admin:  'Akses penuh ke semua fitur & kelola tim'
      }
    });
  }
  openModal('modal-invite-user');
}

async function kirimInvite() {
  const email = document.getElementById('invite-email').value.trim();
  const nama = document.getElementById('invite-nama').value.trim();
  const nik = document.getElementById('invite-nik').value.trim();
  const jabatan = document.getElementById('invite-jabatan').value.trim();
  const role = document.getElementById('invite-role').value;
  if (!email) { showAlert('Email wajib diisi!'); return; }
  const perms = readPermTableValues('perm-table-invite');
  const btn = document.getElementById('btn-kirim-invite');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  try {
    const { error } = await DB.table('org_members').insert({
      company_id: currentCompany.id, email, nama, nik, jabatan, role,
      permissions: perms, invited_by: currentUser.id,
      status: 'pending', created_at: new Date().toISOString()
    });
    btn.disabled = false; btn.textContent = 'Simpan Anggota';
    if (error) { showAlert('Gagal: ' + error.message); return; }
    showAlert(`âœ“ Anggota "${nama||email}" ditambahkan!\n\nMinta mereka buka link join code untuk bergabung.`);
    closeModal('modal-invite-user');
    renderUserMgmtList();
  } catch(e) { btn.disabled=false; btn.textContent='Simpan Anggota'; showAlert('Error: '+e.message); }
}

let _editMemberId = null;
async function openEditMember(memberId) {
  _editMemberId = memberId;
  const m = _orgMembers.find(x => x.id === memberId);
  if (!m) return;
  document.getElementById('edit-member-nama').value = m.nama || '';
  document.getElementById('edit-member-nik').value = m.nik || '';
  document.getElementById('edit-member-jabatan').value = m.jabatan || '';
  document.getElementById('edit-member-role').value = m.role || 'member';
  renderPermTable('perm-table-edit', m.permissions || makeDefaultPerms());
  // Upgrade role select ke opt-picker dengan icon SVG
  const editRole = document.getElementById('edit-member-role');
  if (editRole) {
    upgradeSelectToOptPicker(editRole, {
      title: '<i class="ti ti-shield-check" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Pilih Role',
      iconMap: {
        viewer: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--muted)"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
        member: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent2)"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        admin:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent3)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>'
      },
      subMap: {
        viewer: 'Hanya bisa melihat data, tidak bisa mengubah',
        member: 'Akses dibatasi sesuai izin yang diatur',
        admin:  'Akses penuh ke semua fitur & kelola tim'
      }
    });
  }
  openModal('modal-edit-member');
}

async function simpanEditMember() {
  if (!_editMemberId) return;
  const nama = document.getElementById('edit-member-nama').value.trim();
  const nik = document.getElementById('edit-member-nik').value.trim();
  const jabatan = document.getElementById('edit-member-jabatan').value.trim();
  const role = document.getElementById('edit-member-role').value;
  const perms = readPermTableValues('perm-table-edit');
  const btn = document.getElementById('btn-simpan-edit-member');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  const { error } = await DB.table('org_members').update({ nama, nik, jabatan, role, permissions: perms }).eq('id', _editMemberId);
  btn.disabled = false; btn.textContent = 'Simpan Perubahan';
  if (error) { showAlert('Gagal: ' + error.message); return; }
  showAlert('âœ“ Data anggota berhasil diperbarui!');
  closeModal('modal-edit-member');
  renderUserMgmtList();
  enforcePermissions();
}

// â”€â”€ Permission Table (CRUD per Modul) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Render tabel izin Lihat per modul ke dalam container */
function renderPermTable(containerId, perms) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const p = perms || makeDefaultPerms();
  const semua = Object.keys(MODULES_CRUD).every(mod => p[mod]?.read !== false);
  let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead>
      <tr style="border-bottom:1px solid var(--border);">
        <th style="text-align:left;padding:6px 8px;color:var(--muted);font-weight:600;">Modul</th>
        <th style="text-align:center;padding:6px 8px;color:var(--muted);font-weight:600;min-width:64px;">
          <label style="display:inline-flex;align-items:center;gap:6px;cursor:pointer;">Lihat
            <input type="checkbox" id="${containerId}-semua" ${semua ? 'checked' : ''}
              onchange="toggleAllPerm('${containerId}',this.checked)"
              style="width:15px;height:15px;accent-color:var(--accent2);cursor:pointer;" title="Pilih semua">
          </label>
        </th>
      </tr>
    </thead>
    <tbody>`;
  Object.entries(MODULES_CRUD).forEach(([mod, info]) => {
    html += `<tr style="border-bottom:1px solid var(--border);">
      <td style="padding:7px 8px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <i class="ti ${info.icon}" style="font-size:13px;width:13px;height:13px;color:var(--muted);flex-shrink:0;"></i>
          <span style="color:var(--text);">${info.label}</span>
        </div>
      </td>
      <td style="text-align:center;padding:4px;">
        <input type="checkbox" data-mod="${mod}" class="perm-cb-${containerId}" ${p[mod]?.read !== false ? 'checked' : ''}
          onchange="syncPermAll('${containerId}')"
          style="width:15px;height:15px;accent-color:var(--accent);cursor:pointer;">
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

/** Centang/lepas semua modul */
function toggleAllPerm(containerId, checked) {
  document.querySelectorAll(`.perm-cb-${containerId}`).forEach(cb => cb.checked = checked);
}

/** Sinkronkan kotak "pilih semua" di header setelah satu modul diubah */
function syncPermAll(containerId) {
  const cbs = Array.from(document.querySelectorAll(`.perm-cb-${containerId}`));
  const all = document.getElementById(containerId + '-semua');
  if (all) all.checked = cbs.every(cb => cb.checked);
}

/** Baca nilai dari tabel izin: { modul: { read: bool } } */
function readPermTableValues(containerId) {
  const perms = {};
  Object.keys(MODULES_CRUD).forEach(mod => {
    const cb = document.querySelector(`.perm-cb-${containerId}[data-mod="${mod}"]`);
    perms[mod] = { read: cb ? cb.checked : true };
  });
  return perms;
}

// Hook afterLogin â€” jalankan join code check + load org members
// FIX: Tidak pakai setTimeout agar wrap terjadi SEBELUM auth event pertama
(function _hookAfterLogin() {
  const _origAL = window.afterLogin;
  if (typeof _origAL === 'function') {
    window.afterLogin = async function() {
      // Ambil pending join SEBELUM afterLogin jalan (company belum dipilih)
      const pendingJoin = sessionStorage.getItem('oas_pending_join');
      if (pendingJoin) sessionStorage.removeItem('oas_pending_join');

      await _origAL.apply(this, arguments);

      // FIX: Tunggu lebih lama agar selectCompany & currentCompany sudah terisi
      setTimeout(async () => {
        if (pendingJoin && currentUser) {
          await _processJoinCode(pendingJoin);
        }
        if (currentCompany) {
          await loadOrgMembers();
          enforcePermissions();
          const navBtn = document.getElementById('nav-user-mgmt');
          if (navBtn) navBtn.style.display = isAdmin() ? '' : 'none';
        }
      }, 1200);
    };
  } else {
    // Fallback: jika afterLogin belum ada saat script ini jalan,
    // poll sampai tersedia (maks 3 detik)
    let tries = 0;
    const poll = setInterval(() => {
      tries++;
      if (typeof window.afterLogin === 'function') {
        clearInterval(poll);
        _hookAfterLogin();
      } else if (tries > 30) {
        clearInterval(poll);
        console.warn('[OAS] afterLogin tidak ditemukan setelah 3 detik');
      }
    }, 100);
  }
})();

// Cek join code di URL â€” HANYA jika ada ?join= parameter
if (new URLSearchParams(location.search).has('join')) {
  checkJoinCodeInURL();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DETEKSI JURNAL PENYESUAIAN OTOMATIS â€” FIXED
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let _autoDetectResults = [];

function openJoinWithCodeModal() {
  closeSidebar?.();
  const inp = document.getElementById('join-code-input');
  if (inp) { inp.value = ''; inp.style.borderColor = 'var(--border)'; }
  const st = document.getElementById('join-code-status');
  if (st) st.innerHTML = '';
  const btn = document.getElementById('btn-proses-join');
  if (btn) {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-login" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Bergabung';
  }
  openModal('modal-join-with-code');
  setTimeout(() => inp?.focus(), 300);
}

async function prosesJoinCode() {
  const inp = document.getElementById('join-code-input');
  const st = document.getElementById('join-code-status');
  const btn = document.getElementById('btn-proses-join');
  const code = inp?.value?.trim().toUpperCase();
  if (!code || code.length < 6) {
    if (st) st.innerHTML = '<span style="color:var(--red);">Masukkan kode minimal 6 karakter.</span>';
    inp?.focus(); return;
  }
  if (!currentUser) {
    closeModal('modal-join-with-code');
    showAlert('Silakan login terlebih dahulu untuk bergabung.');
    setTimeout(() => showAuthModal?.(), 400); return;
  }
  btn.disabled = true;
  btn.innerHTML = '<i class="ti ti-loader" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;margin-right:4px;animation:spin 1s linear infinite;"></i> Memproses...';
  if (st) st.innerHTML = '<span style="color:var(--muted);">Memeriksa kode...</span>';
  try {
    await _processJoinCode(code);
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-login" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Bergabung';
    closeModal('modal-join-with-code');
  } catch(e) {
    btn.disabled = false;
    btn.innerHTML = '<i class="ti ti-login" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;margin-right:4px;"></i> Bergabung';
    if (st) st.innerHTML = '<span style="color:var(--red);">Gagal: ' + e.message + '</span>';
  }
}
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// PRIORITAS 1 â€” MASTER PRODUK
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// MASTER PRODUK â€” Deteksi otomatis dari Kartu Stock Persediaan
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

/**
 * Hitung saldo & layer HPP dari satu kartu stock berdasarkan metode aktif.
 * Return: { metode, totalQty, totalNilai, hppRata, layers:[{qty,harga}] }
 */
function getKsSaldo(ks, _depth) {
  // Support dua format:
  // 1. Kategori: { data:{fifo,lifo,wa,mwa} }
  // 2. Card lama (legacy): { data:{fifo,lifo,wa,mwa} }
  // 3. Card baru: { kategori:{} } â†’ aggregate semua kategori
  const _empty = { metode:'fifo', totalQty:0, totalNilai:0, hppRata:0, hppNext:0, layers:[], allMetodeWithSaldo:[] };
  if (!ks) return _empty;
  if (ks.kategori && !ks.data) {
    // Card baru â€” aggregate semua kategori TANPA rekursi (inline loop)
    let tQty = 0, tNilai = 0;
    Object.values(ks.kategori).forEach(kat => {
      if (!kat || !kat.data || typeof kat.data !== 'object') return;
      const metodeArr = ['fifo','lifo','wa','mwa'];
      // Pilih metode yang punya saldo aktif (qty>0), fallback ke terpanjang
      let bestM = 'fifo', bestLen = 0, bestQty = 0;
      metodeArr.forEach(m => {
        const rows = kat.data[m] || [];
        if (!rows.length) return;
        const last = rows[rows.length-1];
        const saldoQty = (last.saldoLayers||[]).filter(l=>l.qty>0).reduce((s,l)=>s+l.qty,0);
        if (saldoQty > bestQty || (saldoQty === bestQty && rows.length > bestLen)) {
          bestQty = saldoQty; bestLen = rows.length; bestM = m;
        }
      });
      const rows = kat.data[bestM] || [];
      if (!rows.length) return;
      const last = rows[rows.length-1];
      const layers = (last.saldoLayers||[]).filter(l=>l.qty>0);
      tQty   += layers.reduce((s,l)=>s+l.qty,0);
      tNilai += layers.reduce((s,l)=>s+l.qty*l.harga,0);
    });
    const hppRata = tQty > 0 ? tNilai / tQty : 0;
    return { metode:'fifo', totalQty:tQty, totalNilai:tNilai, hppRata, hppNext:hppRata, layers:[], allMetodeWithSaldo:[] };
  }

  const data = ks.data || {};
  const metodeArr = ['fifo','lifo','wa','mwa'];

  // Kumpulkan semua metode yang punya saldo aktif (qty > 0)
  const allMetodeWithSaldo = [];
  metodeArr.forEach(m => {
    const rows = data[m] || [];
    if (!rows.length) return;
    const last = rows[rows.length-1];
    const layers = (last.saldoLayers||[]).filter(l=>l.qty>0);
    const qty = layers.reduce((s,l)=>s+l.qty,0);
    if (qty > 0) allMetodeWithSaldo.push(m);
  });

  // Pilih metode utama: yang punya saldo aktif terbesar. Jika tidak ada, pakai yang entri terpanjang.
  let metode = 'fifo';
  let maxQty = 0, maxLen = 0;
  metodeArr.forEach(m => {
    const rows = data[m] || [];
    if (!rows.length) return;
    const last = rows[rows.length-1];
    const layers = (last.saldoLayers||[]).filter(l=>l.qty>0);
    const qty = layers.reduce((s,l)=>s+l.qty,0);
    if (qty > maxQty || (qty === maxQty && rows.length > maxLen)) {
      maxQty = qty; maxLen = rows.length; metode = m;
    }
  });
  // Fallback: jika semua saldo 0, pakai metode entri terpanjang
  if (maxQty === 0) {
    maxLen = 0;
    metodeArr.forEach(m => {
      const len = (data[m]||[]).length;
      if (len > maxLen) { maxLen = len; metode = m; }
    });
  }

  const rows = (data[metode]||[]);
  if(!rows.length) return { metode, totalQty:0, totalNilai:0, hppRata:0, hppNext:0, layers:[], allMetodeWithSaldo };

  const lastRow = rows[rows.length - 1];
  const layers  = (lastRow.saldoLayers || []).filter(l => l.qty > 0);
  const totalQty   = layers.reduce((s,l) => s + l.qty, 0);
  const totalNilai = layers.reduce((s,l) => s + l.qty * l.harga, 0);
  const hppRata    = totalQty > 0 ? totalNilai / totalQty : 0;

  let hppNext = hppRata;
  if(metode === 'fifo' && layers.length > 0) hppNext = layers[0].harga;
  else if(metode === 'lifo' && layers.length > 0) hppNext = layers[layers.length - 1].harga;

  return { metode, totalQty, totalNilai, hppRata, hppNext, layers, allMetodeWithSaldo };
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUDIT FILTER â€” Kategori & Aktivitas pickers pakai openOptPicker()
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// State filter kategori (halaman/fitur dari sidebar)
let _auditCatFilter = '__all__'; // '__all__' = semua kategori

// â”€â”€ Definisi opsi kategori â€” mirror sidebar dengan icon Tabler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _AUDIT_KAT_OPTS = [
  { value:'__all__',        label:'Semua Kategori',    sub:'Tampilkan semua halaman & fitur',       icon:'<i class="ti ti-layout-grid" style="font-size:16px;"></i>' },
  // Utama
  { value:'transaksi',      label:'Transaksi',         sub:'Input transaksi cepat',                 icon:'<i class="ti ti-circle-plus" style="font-size:16px;"></i>' },
  // Jurnal â€” per jenis masing-masing
  { value:'jurnal-umum',    label:'Jurnal Umum',       sub:'Entry manual & jurnal penyesuaian',     icon:'<i class="ti ti-book" style="font-size:16px;"></i>' },
  { value:'jurnal-kas',     label:'Jurnal Kas',        sub:'Transaksi kas masuk & keluar',          icon:'<i class="ti ti-cash" style="font-size:16px;"></i>' },
  { value:'jurnal-jual',    label:'Jurnal Penjualan',  sub:'Transaksi penjualan',                   icon:'<i class="ti ti-receipt" style="font-size:16px;"></i>' },
  { value:'jurnal-beli',    label:'Jurnal Pembelian',  sub:'Transaksi pembelian',                   icon:'<i class="ti ti-shopping-cart" style="font-size:16px;"></i>' },
  // Laporan â€” masing-masing halaman laporan
  { value:'buku-besar',     label:'Buku Besar',        sub:'Filter akun & rekap saldo',             icon:'<i class="ti ti-books" style="font-size:16px;"></i>' },
  { value:'neraca-saldo',   label:'Neraca Saldo',      sub:'Filter periode trial balance',          icon:'<i class="ti ti-scale" style="font-size:16px;"></i>' },
  { value:'laba-rugi',      label:'Laba Rugi',         sub:'Filter periode income statement',       icon:'<i class="ti ti-trending-up" style="font-size:16px;"></i>' },
  { value:'neraca',         label:'Neraca',            sub:'Filter periode balance sheet',          icon:'<i class="ti ti-building-bank" style="font-size:16px;"></i>' },
  { value:'arus-kas',       label:'Arus Kas',          sub:'Filter periode cash flow',              icon:'<i class="ti ti-arrows-exchange" style="font-size:16px;"></i>' },
  { value:'ekuitas',        label:'Perubahan Ekuitas', sub:'Filter periode equity statement',       icon:'<i class="ti ti-chart-area" style="font-size:16px;"></i>' },
  { value:'analitik',       label:'Analitik',          sub:'Dashboard analitik bisnis',             icon:'<i class="ti ti-chart-bar" style="font-size:16px;"></i>' },
  // Master
  { value:'akun',           label:'Chart of Accounts', sub:'Tambah/edit/hapus akun',               icon:'<i class="ti ti-list" style="font-size:16px;"></i>' },
  { value:'produk',         label:'Master Produk',     sub:'Data produk & harga',                   icon:'<i class="ti ti-package" style="font-size:16px;"></i>' },
  { value:'aset',           label:'Aset Tetap',        sub:'Aset tetap & penyusutan',               icon:'<i class="ti ti-building-factory" style="font-size:16px;"></i>' },
  { value:'kontak',         label:'Kontak',            sub:'Pelanggan & supplier',                  icon:'<i class="ti ti-users" style="font-size:16px;"></i>' },
  // Persediaan
  { value:'persediaan',     label:'Persediaan',        sub:'Kartu stock & catatan persediaan',      icon:'<i class="ti ti-package" style="font-size:16px;"></i>' },
  // Kalkulator
  { value:'kalkulator',     label:'Kalkulator',        sub:'Penyusutan, bunga, BEP, PPN, dll',      icon:'<i class="ti ti-calculator" style="font-size:16px;"></i>' },
  // Fitur Baru
  { value:'invoice',        label:'Invoice',           sub:'Buat & kelola invoice',                 icon:'<i class="ti ti-file-invoice" style="font-size:16px;"></i>' },
  { value:'rekonsiliasi',   label:'Rekonsiliasi',      sub:'Rekonsiliasi bank',                     icon:'<i class="ti ti-git-compare" style="font-size:16px;"></i>' },
  { value:'anggaran',       label:'Anggaran',          sub:'Target & anggaran bisnis',              icon:'<i class="ti ti-target" style="font-size:16px;"></i>' },
  { value:'pajak',          label:'Pajak Auto',        sub:'PPh 21, PPh 23, PPN otomatis',          icon:'<i class="ti ti-receipt-tax" style="font-size:16px;"></i>' },
  // Lainnya
  { value:'ai',             label:'Orias AI',          sub:'Chat & aksi dari AI assistant',         icon:'<i class="ti ti-robot" style="font-size:16px;"></i>' },
  { value:'tutorial',       label:'Tutorial',          sub:'Penggunaan fitur tutorial',             icon:'<i class="ti ti-school" style="font-size:16px;"></i>' },
  { value:'system',         label:'Sistem',            sub:'Profil, kurs, backup, tema, reset',     icon:'<i class="ti ti-settings" style="font-size:16px;"></i>' },
];

// Mapping: filter value â†’ {category, jenisMatch?, refMatch?}
// jenisMatch: filter berdasarkan meta.jenis (untuk jurnal per jenis)
// refMatch: filter berdasarkan meta.ref atau description mengandung string
// catMatch: filter berdasarkan e.category
// â”€â”€ Mapping kategori â†’ fungsi filter entry â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Setiap kategori mendefinisikan fn(entry) â†’ boolean
// Sehingga setiap log (navigasi, jurnal, laporan, dll) yang relevan tetap muncul
const _AUDIT_KAT_FN = {
  '__all__': null,

  // Transaksi â€” semua jurnal dari input transaksi cepat (jenis apapun) + navigasi ke halaman transaksi
  'transaksi': e =>
    (e.category === 'jurnal') ||
    (e.category === 'navigasi' && e.meta?.ref === 'transaksi'),

  // Jurnal per jenis â€” jurnal dengan jenis cocok + navigasi ke halaman jurnal tersebut
  'jurnal-umum': e =>
    (e.category === 'jurnal' && ['manual','penyesuaian'].includes((e.meta?.jenis||'').toLowerCase())) ||
    (e.category === 'navigasi' && e.meta?.ref === 'jurnal-umum'),

  'jurnal-kas': e =>
    (e.category === 'jurnal' && (e.meta?.jenis||'').toLowerCase() === 'kas') ||
    (e.category === 'navigasi' && e.meta?.ref === 'jurnal-kas'),

  'jurnal-jual': e =>
    (e.category === 'jurnal' && (e.meta?.jenis||'').toLowerCase() === 'penjualan') ||
    (e.category === 'navigasi' && e.meta?.ref === 'jurnal-penjualan'),

  'jurnal-beli': e =>
    (e.category === 'jurnal' && (e.meta?.jenis||'').toLowerCase() === 'pembelian') ||
    (e.category === 'navigasi' && e.meta?.ref === 'jurnal-pembelian'),

  // Laporan â€” aktivitas filter/view di halaman laporan + navigasi ke halaman tersebut
  'buku-besar': e =>
    (e.category === 'laporan' && (e.meta?.ref||'').toLowerCase().includes('buku-besar')) ||
    (e.category === 'navigasi' && e.meta?.ref === 'buku-besar'),

  'neraca-saldo': e =>
    (e.category === 'laporan' && (e.meta?.ref||'').toLowerCase().includes('neraca-saldo')) ||
    (e.category === 'navigasi' && e.meta?.ref === 'neraca-saldo'),

  'laba-rugi': e =>
    (e.category === 'laporan' && (e.meta?.ref||'').toLowerCase().includes('laba-rugi')) ||
    (e.category === 'navigasi' && e.meta?.ref === 'laba-rugi'),

  'neraca': e =>
    (e.category === 'laporan' && (e.meta?.ref||'').toLowerCase() === 'neraca') ||
    (e.category === 'navigasi' && e.meta?.ref === 'neraca'),

  'arus-kas': e =>
    (e.category === 'laporan' && (e.meta?.ref||'').toLowerCase().includes('arus-kas')) ||
    (e.category === 'navigasi' && e.meta?.ref === 'arus-kas'),

  'ekuitas': e =>
    (e.category === 'laporan' && (e.meta?.ref||'').toLowerCase().includes('ekuitas')) ||
    (e.category === 'navigasi' && e.meta?.ref === 'perubahan-ekuitas'),

  'analitik': e =>
    (e.category === 'laporan' && (e.meta?.ref||'').toLowerCase().includes('analitik')) ||
    (e.category === 'navigasi' && e.meta?.ref === 'analitik'),

  // Master â€” aktivitas CRUD + navigasi ke halaman
  'akun': e =>
    e.category === 'akun' ||
    (e.category === 'navigasi' && e.meta?.ref === 'akun'),

  'produk': e =>
    e.category === 'produk' ||
    (e.category === 'navigasi' && e.meta?.ref === 'produk'),

  'aset': e =>
    e.category === 'aset' ||
    (e.category === 'navigasi' && e.meta?.ref === 'aset-tetap'),

  'kontak': e =>
    e.category === 'kontak' ||
    (e.category === 'navigasi' && e.meta?.ref === 'kontak'),

  // Persediaan
  'persediaan': e =>
    e.category === 'persediaan' ||
    (e.category === 'navigasi' && e.meta?.ref === 'kalk-persediaan'),

  // Kalkulator â€” semua kalkulator + navigasi ke kalkulator
  'kalkulator': e =>
    e.category === 'kalkulator' ||
    (e.category === 'navigasi' && (e.meta?.ref||'').startsWith('kalk-')),

  // Fitur baru
  'invoice': e =>
    e.category === 'invoice' ||
    (e.category === 'navigasi' && e.meta?.ref === 'invoice'),

  'rekonsiliasi': e =>
    e.category === 'rekonsiliasi' ||
    (e.category === 'navigasi' && e.meta?.ref === 'rekonsiliasi'),

  'anggaran': e =>
    e.category === 'anggaran' ||
    (e.category === 'navigasi' && e.meta?.ref === 'anggaran'),

  'pajak': e =>
    e.category === 'pajak' ||
    (e.category === 'navigasi' && e.meta?.ref === 'pajak'),

  // Lainnya
  'ai': e =>
    e.category === 'ai' ||
    (e.category === 'navigasi' && e.meta?.ref === 'ai-assistant'),

  'tutorial': e =>
    e.category === 'tutorial' ||
    (e.category === 'navigasi' && e.meta?.ref === 'tutorial'),

  'system': e =>
    e.category === 'system',
  // Jurnal Penutup & Rekonsiliasi Kas tidak punya filter kategori sendiri
  // â€” hanya muncul saat filter '__all__' (semua kategori)
};

// â”€â”€ Filter kategori pada renderAuditTrail â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _origRenderAuditTrailBase = window.renderAuditTrail;
window.renderAuditTrail = function() {
  if (_auditCatFilter === '__all__') {
    return _origRenderAuditTrailBase?.apply(this, arguments);
  }
  const filterFn = _AUDIT_KAT_FN[_auditCatFilter];
  if (!filterFn) return _origRenderAuditTrailBase?.apply(this, arguments);

  const origGetAll = window.auditGetAll;
  window.auditGetAll = function() {
    const all = origGetAll ? origGetAll() : [];
    return all.filter(e => { try { return filterFn(e); } catch(_) { return false; } });
  };
  _origRenderAuditTrailBase?.apply(this, arguments);
  window.auditGetAll = origGetAll;
};

// â”€â”€ Opsi aktivitas dengan icon â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _AUDIT_AKT_OPTS = [
  { value:'all',    label:'Semua Aktivitas', sub:'Tampilkan semua jenis aksi',             icon:'<i class="ti ti-list" style="font-size:16px;"></i>' },
  { value:'create', label:'Buat',            sub:'Tambah jurnal, akun, produk, dll',       icon:'<i class="ti ti-circle-plus" style="font-size:16px;"></i>' },
  { value:'delete', label:'Hapus',           sub:'Penghapusan data apapun',                icon:'<i class="ti ti-trash" style="font-size:16px;"></i>' },
  { value:'edit',   label:'Edit',            sub:'Perubahan & pembaruan data',             icon:'<i class="ti ti-pencil" style="font-size:16px;"></i>' },
  { value:'auto',   label:'Otomatis',        sub:'Penyusutan, jurnal otomatis',            icon:'<i class="ti ti-bolt" style="font-size:16px;"></i>' },
  { value:'export', label:'Export',          sub:'Export laporan & CSV',                  icon:'<i class="ti ti-upload" style="font-size:16px;"></i>' },
  { value:'login',  label:'Sesi',            sub:'Login & logout pengguna',               icon:'<i class="ti ti-lock" style="font-size:16px;"></i>' },
  { value:'info',   label:'Info & Filter',   sub:'Filter laporan, buka halaman, AI, dll', icon:'<i class="ti ti-info-circle" style="font-size:16px;"></i>' },
  { value:'reset',  label:'Reset',           sub:'Reset data â€” berbahaya',                icon:'<i class="ti ti-alert-triangle" style="font-size:16px;color:var(--red);"></i>' },
];

// â”€â”€ Picker: Filter Kategori â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function auditOpenKatPicker() {
  const btn = document.getElementById('audit-kat-btn');
  openOptPicker({
    title: 'Filter Kategori',
    options: _AUDIT_KAT_OPTS,
    currentValue: _auditCatFilter,
    btnEl: btn,
    onSelect: (val, label) => {
      _auditCatFilter = val;
      _auditPage = 0;
      const lbl = document.getElementById('audit-kat-label');
      if (lbl) lbl.textContent = val === '__all__' ? 'Semua Kategori' : label;
      // Update active state visual
      const katBtn = document.getElementById('audit-kat-btn');
      if (katBtn) katBtn.classList.toggle('open', val !== '__all__');
      renderAuditTrail();
    }
  });
}

// â”€â”€ Picker: Filter Aktivitas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function auditOpenAktPicker() {
  const btn = document.getElementById('audit-akt-btn');
  openOptPicker({
    title: 'Filter Aktivitas',
    options: _AUDIT_AKT_OPTS,
    currentValue: _auditFilter,
    btnEl: btn,
    onSelect: (val, label) => {
      auditSetFilter(val);
      const lbl = document.getElementById('audit-akt-label');
      if (lbl) lbl.textContent = val === 'all' ? 'Semua Aktivitas' : label;
      const aktBtn = document.getElementById('audit-akt-btn');
      if (aktBtn) aktBtn.classList.toggle('open', val !== 'all');
    }
  });
}

// â”€â”€ Picker: Filter Bisnis (dari biz bar) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function auditOpenBizPicker() {
  // Selalu ambil dari log asli (bypass cat filter)
  const origGetAll = window.auditGetAll;
  // Temporarily restore original to get unfiltered logs
  const rawLogs = typeof auditGetAll === 'function'
    ? JSON.parse(localStorage.getItem('oas_audit_trail') || '[]')
    : [];
  const bizMap = {};
  rawLogs.forEach(e => {
    if (e.companyId && !bizMap[e.companyId]) bizMap[e.companyId] = { id:e.companyId, name:e.companyName||e.companyId, count:0 };
    if (e.companyId) bizMap[e.companyId].count++;
  });
  const bizList = Object.values(bizMap);
  if (!bizList.length) { showAlert('Belum ada log dari beberapa bisnis.'); return; }
  const opts = [
    { value:'__all__', label:'Semua Bisnis', sub:'Tampilkan semua bisnis di log', icon:'<i class="ti ti-world" style="font-size:16px;"></i>' },
    ...bizList.map(b => ({ value:b.id, label:b.name, sub:`${b.count} log`, icon:'<i class="ti ti-building" style="font-size:16px;"></i>' }))
  ];
  const btn = document.getElementById('audit-biz-btn');
  openOptPicker({
    title: 'Filter Bisnis',
    options: opts,
    currentValue: _auditBizFilter === null ? '__all__' : _auditBizFilter,
    btnEl: btn,
    onSelect: (val, label) => {
      const realVal = val === '__all__' ? null : val;
      _auditBizFilter = realVal; _auditPage = 0;
      const lbl = document.getElementById('audit-biz-label');
      if (lbl) lbl.textContent = realVal === null ? 'Semua Bisnis' : label;
      const bizBtn = document.getElementById('audit-biz-btn');
      if (bizBtn) bizBtn.classList.toggle('open', realVal !== null);
      renderAuditTrail();
    }
  });
}

// â”€â”€ Reset semua filter saat initAuditPage â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const _origInitAuditPageKat = window.initAuditPage;
window.initAuditPage = function() {
  _auditCatFilter = '__all__';
  // Reset Kategori
  const katLbl = document.getElementById('audit-kat-label');
  if (katLbl) katLbl.textContent = 'Semua Kategori';
  const katBtn = document.getElementById('audit-kat-btn');
  if (katBtn) katBtn.classList.remove('open');
  // Reset Aktivitas
  const aktLbl = document.getElementById('audit-akt-label');
  if (aktLbl) aktLbl.textContent = 'Semua Aktivitas';
  const aktBtn = document.getElementById('audit-akt-btn');
  if (aktBtn) aktBtn.classList.remove('open');
  // Reset Bisnis
  const bizLbl = document.getElementById('audit-biz-label');
  if (bizLbl) bizLbl.textContent = 'Semua Bisnis';
  const bizBtn = document.getElementById('audit-biz-btn');
  if (bizBtn) bizBtn.classList.remove('open');
  _origInitAuditPageKat?.apply(this, arguments);
};

// â”€â”€ Show/hide tombol Filter Bisnis berdasarkan jumlah bisnis di log â”€â”€â”€â”€â”€â”€â”€â”€
const _origRenderBizBar2 = window._renderAuditBizBar;
window._renderAuditBizBar = function(logs) {
  // Panggil original (yang render pill tab desktop) â€” kini tidak perlu render apa-apa
  _origRenderBizBar2?.call(this, logs);
  // Hitung dari raw logs (bukan filtered)
  const rawLogs = JSON.parse(localStorage.getItem('oas_audit_trail') || '[]');
  const bizIds = new Set(rawLogs.filter(e => e.companyId).map(e => e.companyId));
  const bizBtn = document.getElementById('audit-biz-btn');
  if (bizBtn) bizBtn.style.display = bizIds.size > 1 ? '' : 'none';
};



// Relocated Audit Hooks from retired 08-kartu-stock.js (Domain 3B)

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// OAS AUDIT TRAIL â€” HOOKS MENYELURUH
// Semua aktivitas penting di seluruh fitur dilog ke auditLog()
// Di-inject setelah semua fungsi sudah terdefinisi
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function _installAuditHooks() {
  'use strict';

  // Helper: wrap fungsi dengan audit, toleran terhadap fungsi yang belum ada
  function _wrap(fnName, before, after) {
    const orig = window[fnName];
    window[fnName] = function() {
      try { if (before) before.apply(this, arguments); } catch(e) {}
      const ret = orig ? orig.apply(this, arguments) : undefined;
      try { if (after) after.apply(this, arguments); } catch(e) {}
      return ret;
    };
    // Preserve async nature
    if (orig && orig.constructor && orig.constructor.name === 'AsyncFunction') {
      window[fnName] = async function() {
        try { if (before) before.apply(this, arguments); } catch(e) {}
        const ret = orig ? await orig.apply(this, arguments) : undefined;
        try { if (after) after.apply(this, arguments); } catch(e) {}
        return ret;
      };
    }
  }

  function _al(action, cat, desc, ref, extraMeta) {
    if (typeof auditLog === 'function') auditLog(action, cat, desc, { ref: ref || '', ...(extraMeta||{}) });
  }
  function _rp(n) { return typeof fmtRp === 'function' ? fmtRp(n) : 'Rp ' + (n||0).toLocaleString('id-ID'); }
  function _v(id) { return document.getElementById(id)?.value || ''; }

  // â”€â”€ JURNAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // 1. HAPUS JURNAL â€” wrap konfirmasiHapusJurnal langsung (bukan button patch)
  //    Masalah sebelumnya: onclick di-set ulang setiap buka modal, listener tidak jalan
  _wrap('konfirmasiHapusJurnal', function(idx) {
    // Simpan data entry SEBELUM modal terbuka (idx masih valid)
    try {
      const j = jurnalEntries[idx];
      if (j) window._auditPendingHapusJurnal = { idx, no: j.no, ket: j.ket, jenis: j.jenis, total: (j.lines||[]).reduce((s,l)=>s+(l.debit||0),0) };
    } catch(e) {}
  }, null);

  // Patch tombol konfirmasi SETELAH konfirmasiHapusJurnal dipanggil
  const _origKonfirmasiHapusJurnal = window.konfirmasiHapusJurnal;
  window.konfirmasiHapusJurnal = function(idx) {
    _origKonfirmasiHapusJurnal?.apply(this, arguments);
    // Setelah modal terbuka, patch onclick-nya
    setTimeout(function() {
      const btn = document.getElementById('hapus-jurnal-confirm-btn');
      if (!btn) return;
      const origOnclick = btn.onclick;
      btn.onclick = async function() {
        const pending = window._auditPendingHapusJurnal;
        if (pending) {
          _al('delete', 'jurnal',
            `Hapus jurnal ${pending.jenis||'Manual'}: "${pending.ket||'â€”'}" â€” ${_rp(pending.total)}`,
            pending.no || String(pending.idx),
            {jenis: pending.jenis || 'Manual'});
          window._auditPendingHapusJurnal = null;
        }
        if (origOnclick) return await origOnclick.call(this);
      };
    }, 30);
  };

  // 2. Simpan Manual â€” jenis: Manual
  _wrap('simpanManual', null, function() {
    try {
      const ket = _v('manual-ket') || _v('jm-ket') || _v('ket-manual') || 'â€”';
      _al('create', 'jurnal', `Simpan Jurnal Manual: "${ket}"`, ket, {jenis:'Manual'});
    } catch(e) {}
  });

  // 3. Simpan Kas â€” jenis: Kas
  _wrap('simpanKas', null, function() {
    try {
      const ket = _v('kas-ket') || _v('ket-kas') || 'â€”';
      const jml = parseFloat(_v('kas-jumlah')) || 0;
      const tipe = _v('kas-tipe') || 'â€”';
      _al('create', 'jurnal', `Kas ${tipe}: "${ket}" â€” ${_rp(jml)}`, ket, {jenis:'Kas'});
    } catch(e) {}
  });

  // 4. Simpan Penjualan â€” jenis: Penjualan
  _wrap('simpanPenjualan', null, function() {
    try {
      const inv = _v('jual-inv') || 'â€”';
      const jml = parseFloat(_v('jual-jumlah')) || 0;
      _al('create', 'jurnal', `Penjualan${inv !== 'â€”' ? ' ' + inv : ''} â€” ${_rp(jml)}`, inv, {jenis:'Penjualan'});
    } catch(e) {}
  });

  // 5. Simpan Pembelian â€” jenis: Pembelian
  _wrap('simpanPembelian', null, function() {
    try {
      const po = _v('beli-po') || 'â€”';
      const jml = parseFloat(_v('beli-jumlah')) || 0;
      _al('create', 'jurnal', `Pembelian${po !== 'â€”' ? ' ' + po : ''} â€” ${_rp(jml)}`, po, {jenis:'Pembelian'});
    } catch(e) {}
  });

  // 6. Simpan Akun (Chart of Accounts)
  _wrap('simpanAkun', null, function() {
    try {
      const kode = _v('akun-kode');
      const nama = _v('akun-nama');
      const tipe = _v('akun-tipe');
      const editId = _v('akun-edit-id');
      _al(editId ? 'edit' : 'create', 'akun',
        `${editId ? 'Edit' : 'Tambah'} akun: ${kode} â€” ${nama} (${tipe})`, kode);
    } catch(e) {}
  });

  // 7. Hapus Akun
  _wrap('hapusAkun', function(kode) {
    try {
      const a = (typeof akuns !== 'undefined') ? akuns.find(x => x.kode === kode) : null;
      _al('delete', 'akun', `Hapus akun: ${kode} â€” ${a?.nama || ''}`, kode);
    } catch(e) {}
  }, null);

  // 8. Simpan Aset Tetap
  _wrap('simpanAsetTetap', null, function() {
    try {
      const nama = _v('at-nama');
      const harga = parseFloat(_v('at-harga')) || 0;
      const editId = _v('at-edit-id');
      _al(editId ? 'edit' : 'create', 'aset',
        `${editId ? 'Edit' : 'Tambah'} aset: ${nama} â€” ${_rp(harga)}`, editId || nama);
    } catch(e) {}
  });

  // 9. Hapus Aset
  _wrap('hapusAset', function(id) {
    try {
      const a = (typeof asetTetapList !== 'undefined') ? asetTetapList.find(x => x.id === id) : null;
      _al('delete', 'aset', `Hapus aset: ${a?.nama || id}`, id);
    } catch(e) {}
  }, null);

  // 10. Disposal Aset
  _wrap('disposalAset', function(id) {
    try {
      const a = (typeof asetTetapList !== 'undefined') ? asetTetapList.find(x => x.id === id) : null;
      _al('edit', 'aset', `Disposal aset: ${a?.nama || id}`, id);
    } catch(e) {}
  }, null);

  // 11. Simpan Kontak
  _wrap('simpanKontak', null, function() {
    try {
      const nama = _v('kontak-nama');
      const editId = _v('kontak-edit-id');
      _al(editId ? 'edit' : 'create', 'kontak',
        `${editId ? 'Edit' : 'Tambah'} kontak: ${nama}`, editId || nama);
    } catch(e) {}
  });

  // 12. Hapus Kontak
  _wrap('hapusKontak', function(id) {
    try {
      const k = (typeof kontakList !== 'undefined') ? kontakList.find(x => x.id === id) : null;
      _al('delete', 'kontak', `Hapus kontak: ${k?.nama || id}`, id);
    } catch(e) {}
  }, null);

  // 13. Simpan Invoice
  _wrap('simpanInvoice', null, function(status) {
    try {
      const no = _v('inv-no');
      _al('create', 'invoice', `${status === 'lunas' ? 'Invoice Lunas' : 'Buat invoice'}: ${no || 'â€”'}`, no);
    } catch(e) {}
  });

  // 14. (dihapus di task 5.3) Pelunasan invoice kini dicatat simpanPembayaranInvoice (32-pembayaran-ui.js) lewat auditLog sendiri.

  // 15. Hapus Invoice
  _wrap('hapusInvoice', function(id) {
    try {
      const inv = (typeof invoiceList !== 'undefined') ? invoiceList.find(x => x.id === id) : null;
      _al('delete', 'invoice', `Hapus invoice ${inv?.no || id} â€” ${_rp(inv?.total || 0)}`, inv?.no || id);
    } catch(e) {}
  }, null);

  // 16. Simpan Produk
  _wrap('simpanProduk', null, function() {
    try {
      const ksId = _v('produk-edit-id');
      const hj = parseFloat(_v('produk-harga-jual')) || 0;
      const ppn = _v('produk-ppn');
      _al('edit', 'produk', `Update produk: harga jual ${_rp(hj)}${ppn ? ', PPN ' + ppn + '%' : ''}`, ksId);
    } catch(e) {}
  });

  // 17. Hapus Produk
  _wrap('hapusProduk', function(id) {
    try {
      _al('delete', 'produk', `Hapus produk id: ${id}`, id);
    } catch(e) {}
  }, null);

  // 18. Simpan Jurnal Berulang
  _wrap('simpanJurnalBerulang', null, function() {
    try {
      const nama = _v('jb-nama');
      const frq = _v('jb-frekuensi');
      _al('create', 'jurnal', `Buat Jurnal Berulang: ${nama} (${frq})`, nama);
    } catch(e) {}
  });

  // 19. Hapus Jurnal Berulang
  _wrap('hapusJurnalBerulang', function(id) {
    try {
      const jb = (typeof jurnalBerulangList !== 'undefined') ? jurnalBerulangList?.find(j => j.id === id) : null;
      _al('delete', 'jurnal', `Hapus Jurnal Berulang: ${jb?.nama || id}`, id);
    } catch(e) {}
  }, null);

  // 20. Buat Jurnal Penutup â€” dari Dashboard aksi cepat, category 'system' agar hanya muncul di semua kategori
  _wrap('buatJurnalPenutup', null, function() {
    _al('auto', 'system', 'Buat Jurnal Penutup (Closing Entries)', 'JURNAL-PENUTUP');
  });

  // 20b. Cek Rekonsiliasi Kas â€” dari Dashboard aksi cepat, category 'system'
  _wrap('cekRekonsiliasi', null, function() {
    _al('info', 'system', 'Rekonsiliasi Kas â€” cek dari Dashboard', 'REKON-KAS');
  });

  // 21. Jurnal Penyesuaian
  _wrap('openJurnalPenyesuaian', null, function() {
    _al('info', 'jurnal', 'Buka modul Jurnal Penyesuaian', 'PENYESUAIAN', {jenis:'Penyesuaian'});
  });
  _wrap('deteksiPenyesuaianOtomatis', null, function() {
    _al('auto', 'jurnal', 'Deteksi otomatis Jurnal Penyesuaian', 'AUTO-PENYESUAIAN', {jenis:'Penyesuaian'});
  });

  // 22. Buat Jurnal PPh 21 & PPh 23
  _wrap('buatJurnalPPh21', null, function() {
    _al('create', 'pajak', 'Buat Jurnal PPh 21', 'PPH21');
  });
  _wrap('buatJurnalPPh23', null, function() {
    _al('create', 'pajak', 'Buat Jurnal PPh 23', 'PPH23');
  });

  // 23. Proses Rekonsiliasi
  _wrap('prosesRekonsiliasi', null, function() {
    _al('create', 'rekonsiliasi', 'Proses rekonsiliasi bank', 'REKON');
  });
  _wrap('importRekonSebagaiJurnal', null, function() {
    _al('create', 'jurnal', 'Import rekonsiliasi sebagai jurnal', 'REKON-IMPORT');
  });

  // 24. Simpan Kurs Manual
  _wrap('simpanKursManual', null, function() {
    try {
      const mata = _v('kurs-mata') || _v('kurs-uang') || 'â€”';
      const rate = parseFloat(_v('kurs-rate') || _v('kurs-nilai') || '0') || 0;
      _al('edit', 'system', `Update kurs ${mata}: ${rate.toLocaleString('id-ID')}`, mata);
    } catch(e) {}
  });

  // 25. Simpan Profil Perusahaan
  _wrap('saveProfil', null, function() {
    try {
      const nama = _v('profil-nama') || _v('profil-perusahaan') || 'â€”';
      _al('edit', 'system', `Simpan profil perusahaan: ${nama}`, 'PROFIL');
    } catch(e) {}
  });

  // 26. Simpan Saldo Awal
  _wrap('simpanSaldoAwal', null, function() {
    _al('edit', 'akun', 'Simpan / update Saldo Awal', 'SALDO-AWAL');
  });

  // 27. Simpan Alert/Notifikasi
  _wrap('simpanAlertBaru', null, function() {
    try {
      const nama = _v('notif-nama') || _v('alert-nama') || 'â€”';
      _al('create', 'system', `Tambah notifikasi/alert: ${nama}`, nama);
    } catch(e) {}
  });

  // 28. Hapus Alert
  _wrap('hapusAlert', function(id) {
    _al('delete', 'system', `Hapus notifikasi id: ${id}`, id);
  }, null);

  // 29. Simpan Anggaran
  _wrap('simpanAnggaran', null, function() {
    try {
      const period = _v('anggaran-period') || _v('ang-period') || 'â€”';
      _al('edit', 'anggaran', `Simpan anggaran periode ${period}`, period);
    } catch(e) {}
  });

  // 30. Hapus Anggaran
  _wrap('hapusAnggaran', function(id) {
    try {
      const a = (typeof anggaranList !== 'undefined') ? anggaranList?.find(x => x.id === id) : null;
      _al('delete', 'anggaran', `Hapus anggaran: ${a?.nama || a?.period || id}`, id);
    } catch(e) {}
  }, null);

  // 31. Export Backup JSON
  _wrap('exportBackupJSON', null, function() {
    _al('export', 'system', 'Export backup data JSON', 'BACKUP-JSON');
  });

  // 32. Import Backup JSON
  _wrap('importBackupJSON', null, function() {
    _al('create', 'system', 'Import data dari backup JSON', 'IMPORT-JSON');
  });

  // 33. Manual Save
  _wrap('manualSave', null, function() {
    _al('edit', 'system', 'Simpan manual (manual save)', 'MANUAL-SAVE');
  });

  // 34. Simpan Jurnal dari AI â€” dicatat dengan label role "AI" karena aksi ini
  //     dieksekusi otomatis oleh Orias AI, bukan diketik manual oleh pengguna.
  _wrap('saveJurnalFromAI', null, function(parsed) {
    try {
      const lines = parsed?.lines || parsed?.entries || [];
      const ket = parsed?.keterangan || parsed?.ket || parsed?.description || 'â€”';
      const total = lines.reduce ? lines.reduce((s, l) => s + (l.debit || 0), 0) : 0;
      _al('create', 'jurnal', `Simpan Jurnal dari AI: "${ket}" â€” ${_rp(total)}`, 'AI-JURNAL', {aiActed:true});
    } catch(e) {}
  });

  // 35. AI Chat â€” sendAI (kirim pesan ke Orias AI)
  _wrap('sendAI', function() {
    try {
      const msg = (document.getElementById('ai-input')?.value || '').trim().slice(0, 120);
      if (msg) _al('info', 'ai', `Orias AI: "${msg}"`, 'AI-CHAT');
    } catch(e) {}
  }, null);

  // 36. Clear AI Chat
  _wrap('clearAIChat', null, function() {
    _al('edit', 'ai', 'Reset riwayat chat Orias AI', 'AI-CLEAR');
  });

  // 37. Tutorial — mulai
  _wrap('startTutorialById', function(id) {
    try {
      const label = id === 'semua' ? 'Semua Tutorial' : (id || 'Tutorial');
      _al('info', 'tutorial', `Mulai tutorial: ${label}`, id);
    } catch(e) {}
  }, null);

  // 38. Tutorial â€” selesai/keluar
  _wrap('exitTutorial', null, function() {
    _al('info', 'tutorial', 'Keluar dari tutorial', 'TUT-EXIT');
  });

  // 39. doExport (laporan PDF/Excel/CSV)
  _wrap('doExport', null, function() {
    try {
      const fmt = (typeof exportFmt !== 'undefined' ? exportFmt : _v('exp-fmt') || 'â€”').toUpperCase();
      const nama = _v('exp-nama-perusahaan') || 'â€”';
      _al('export', 'system', `Export laporan ${fmt} â€” ${nama}`, fmt);
    } catch(e) {}
  });

  // 40. Reset Semua Data
  const _origDoResetAll = window.doResetAll;
  window.doResetAll = async function() {
    try {
      const cn = (typeof currentCompany !== 'undefined' && currentCompany?.name) || 'â€”';
      const dipilih = Array.from(document.querySelectorAll('#modal-reset-all input[data-reset]:checked')).map(c => c.getAttribute('data-label') || c.getAttribute('data-reset')).join(', ') || 'â€”';
      _al('reset', 'system', `âš ï¸ RESET DATA bisnis "${cn}" dieksekusi: ${dipilih}`, 'RESET-ALL');
    } catch(e) {}
    return _origDoResetAll ? await _origDoResetAll.apply(this, arguments) : undefined;
  };

  // 41. Kartu Stock â€” hapus entri baris (delegated event di tbody)
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.ks-hapus-btn');
    if (!btn) return;
    try {
      const idx = parseInt(btn.getAttribute('data-idx'));
      if (isNaN(idx)) return;
      const entry = (typeof kartuStockData !== 'undefined' && typeof kartuStockTab !== 'undefined')
        ? kartuStockData?.[kartuStockTab]?.[idx] : null;
      const card = (typeof multiKartuStock !== 'undefined' && typeof activeKartuStockId !== 'undefined')
        ? multiKartuStock?.[activeKartuStockId] : null;
      const kat = (card && typeof activeKategoriId !== 'undefined')
        ? card?.kategori?.[activeKategoriId] : null;
      if (entry) {
        const tipe = entry.mQty > 0 ? 'masuk' : 'keluar';
        const qty = entry.mQty > 0 ? entry.mQty : entry.kQty;
        const jml = entry.mQty > 0 ? (entry.mQty * (entry.mHarga || 0)) : (entry.kJml || 0);
        _al('delete', 'persediaan',
          `Hapus entry stock ${tipe}: ${entry.tgl || 'â€”'} | Qty ${qty} | ${entry.ket || 'â€”'} | ${_rp(jml)}`,
          `${kat?.nama || card?.nama || 'â€”'} (${(typeof kartuStockTab !== 'undefined' ? kartuStockTab : '').toUpperCase()})`);
      }
    } catch(ex) {}
  }, true); // capture phase â€” jalan sebelum confirm dialog

  // 42. Kartu Stock â€” hapus semua catatan
  _wrap('clearKartuStock', function() {
    try {
      const card = (typeof multiKartuStock !== 'undefined' && typeof activeKartuStockId !== 'undefined')
        ? multiKartuStock?.[activeKartuStockId] : null;
      const kat = (card && typeof activeKategoriId !== 'undefined')
        ? card?.kategori?.[activeKategoriId] : null;
      const tab = typeof kartuStockTab !== 'undefined' ? kartuStockTab : 'â€”';
      const count = (typeof kartuStockData !== 'undefined') ? (kartuStockData?.[tab] || []).length : 0;
      window._auditKsTabBefore = { tab, count, cardName: kat?.nama || card?.nama || 'â€”' };
    } catch(e) {}
  }, function() {
    try {
      const b = window._auditKsTabBefore;
      if (b && b.count > 0) _al('delete', 'persediaan',
        `Hapus semua catatan ${b.tab.toUpperCase()}: ${b.count} baris di "${b.cardName}"`, 'CLEAR-KS');
    } catch(e) {}
  });

  // 43. Kartu Stock â€” hapus seluruh kartu
  _wrap('_doHapusCard', function(cardId) {
    try {
      const card = (typeof multiKartuStock !== 'undefined') ? multiKartuStock?.[cardId] : null;
      const nKat = Object.keys(card?.kategori || {}).length;
      window._auditKsCardToDelete = { nama: card?.nama || cardId, nKat };
    } catch(e) {}
  }, function(cardId) {
    try {
      const d = window._auditKsCardToDelete;
      if (d) _al('delete', 'persediaan', `Hapus kartu stock "${d.nama}" (${d.nKat} kategori)`, cardId);
    } catch(e) {}
  });

  // 44. Kartu Stock â€” tambah entry baru via saveMKS
  let _ksCountMap = {};
  const _origSaveMKS = window.saveMKS;
  window.saveMKS = function(skipSync) {
    if (!skipSync) {
      try {
        const tab = typeof kartuStockTab !== 'undefined' ? kartuStockTab : null;
        const key = `${typeof activeKartuStockId !== 'undefined' ? activeKartuStockId : ''}__${typeof activeKategoriId !== 'undefined' ? activeKategoriId : ''}__${tab}`;
        const curr = (typeof kartuStockData !== 'undefined' && tab) ? (kartuStockData?.[tab] || []).length : 0;
        const prev = _ksCountMap[key] || 0;
        if (curr > prev && tab) {
          const entry = (kartuStockData?.[tab] || []).slice(-1)[0];
          const card = (typeof multiKartuStock !== 'undefined' && typeof activeKartuStockId !== 'undefined')
            ? multiKartuStock?.[activeKartuStockId] : null;
          const kat = (card && typeof activeKategoriId !== 'undefined') ? card?.kategori?.[activeKategoriId] : null;
          if (entry) {
            const tipe = entry.mQty > 0 ? 'masuk' : 'keluar';
            const qty = entry.mQty > 0 ? entry.mQty : entry.kQty;
            const jml = entry.mQty > 0 ? (entry.mQty * (entry.mHarga || 0)) : (entry.kJml || 0);
            _al('create', 'persediaan',
              `Entry stock ${tipe}: ${entry.tgl || 'â€”'} | Qty ${qty} | ${entry.ket || 'â€”'} | ${_rp(jml)}`,
              `${kat?.nama || card?.nama || 'â€”'} (${tab.toUpperCase()})`);
          }
        }
        _ksCountMap[key] = curr;
      } catch(e) {}
    }
    return _origSaveMKS ? _origSaveMKS.apply(this, arguments) : undefined;
  };

  // 45. Kalkulator Penyusutan
  _wrap('hitungPenyusutan', null, function() {
    try {
      const nama = _v('dep-nama') || _v('at-kalk-nama') || 'â€”';
      const harga = parseFloat(_v('dep-harga') || _v('at-kalk-harga') || '0') || 0;
      const metode = _v('dep-metode') || _v('at-kalk-metode') || 'â€”';
      _al('info', 'kalkulator', `Hitung Penyusutan: ${nama} | ${_rp(harga)} | ${metode}`, 'KALK-PENYUSUTAN');
    } catch(e) {}
  });

  // 46. Kalkulator Persediaan
  _wrap('hitungPersediaan', null, function() {
    try {
      const metode = _v('inv-metode') || 'â€”';
      const lbl = { fifo: 'FIFO', lifo: 'LIFO', wa: 'Weighted Average', mwa: 'Moving WA' };
      _al('info', 'kalkulator', `Hitung Persediaan ${lbl[metode] || metode}`, 'KALK-PERSEDIAAN');
    } catch(e) {}
  });

  // 47. Kalkulator Bunga
  _wrap('hitungBunga', null, function() {
    try {
      const pokok = parseFloat(_v('bunga-pokok')) || 0;
      const rate = _v('bunga-rate') || '0';
      const tipe = _v('bunga-tipe') || 'â€”';
      _al('info', 'kalkulator', `Hitung Bunga ${tipe}: pokok ${_rp(pokok)}, rate ${rate}%`, 'KALK-BUNGA');
    } catch(e) {}
  });

  // 48. Kalkulator Rasio
  _wrap('hitungRasio', null, function() {
    _al('info', 'kalkulator', 'Hitung Rasio Keuangan', 'KALK-RASIO');
  });

  // 49. Kalkulator BEP
  _wrap('hitungBEP', null, function() {
    try {
      const fc = parseFloat(_v('bep-fc')) || 0;
      _al('info', 'kalkulator', `Hitung BEP: FC ${_rp(fc)}`, 'KALK-BEP');
    } catch(e) {}
  });

  // 51. showPage â€” log semua navigasi halaman
  const _origShowPage = window.showPage;
  window.showPage = function(id) {
    const ret = _origShowPage ? _origShowPage.apply(this, arguments) : undefined;
    try {
      const PAGE_LABELS = {
        'dashboard': null, // terlalu sering, skip
        'transaksi': 'Buka halaman Transaksi',
        'jurnal-umum': 'Buka Jurnal Umum',
        'jurnal-kas': 'Buka Jurnal Kas',
        'jurnal-penjualan': 'Buka Jurnal Penjualan',
        'jurnal-pembelian': 'Buka Jurnal Pembelian',
        'buku-besar': 'Buka Buku Besar',
        'neraca-saldo': 'Buka Neraca Saldo',
        'laba-rugi': 'Buka Laporan Laba Rugi',
        'neraca': 'Buka Neraca',
        'arus-kas': 'Buka Laporan Arus Kas',
        'perubahan-ekuitas': 'Buka Laporan Perubahan Ekuitas',
        'analitik': 'Buka Analitik',
        'produk': 'Buka Master Produk',
        'akun': 'Buka Chart of Accounts',
        'aset-tetap': 'Buka Aset Tetap',
        'kontak': 'Buka Kontak',
        'kalk-penyusutan': 'Buka Kalkulator Penyusutan',
        'kalk-persediaan': 'Buka Kalkulator Persediaan',
        'kalk-bunga': 'Buka Kalkulator Bunga',
        'kalk-rasio': 'Buka Kalkulator Rasio',
        'kalk-bep': 'Buka Kalkulator BEP & Margin',
        'jurnal-berulang': 'Buka Jurnal Berulang',
        'invoice': 'Buka Invoice',
        'rekonsiliasi': 'Buka Rekonsiliasi',
        'kurs': 'Buka Kurs Mata Uang',
        'notifikasi': 'Buka Notifikasi',
        'anggaran': 'Buka Anggaran',
        'pajak': 'Buka Pajak Auto',
        'tutorial': 'Buka Tutorial',
        'ai-assistant': 'Buka Orias AI Assistant',
        'audit-trail': null, // jangan log buka audit trail sendiri
      };
      const label = PAGE_LABELS[id];
      if (label) _al('info', 'navigasi', label, id);
    } catch(e) {}
    return ret;
  };

  // 52. Theme toggle
  const _origToggleTheme = window.toggleTheme;
  window.toggleTheme = function() {
    const ret = _origToggleTheme ? _origToggleTheme.apply(this, arguments) : undefined;
    try {
      const theme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
      _al('edit', 'system', `Ganti tema: ${theme}`, 'TEMA');
    } catch(e) {}
    return ret;
  };

  // 53. Hapus Kategori KS
  _wrap('hapusKategori', function(cardId, katId) {
    try {
      const card = (typeof multiKartuStock !== 'undefined') ? multiKartuStock?.[cardId] : null;
      const kat = card?.kategori?.[katId];
      window._auditKatToDelete = kat?.nama || katId;
    } catch(e) {}
  }, function(cardId, katId) {
    try {
      const nm = window._auditKatToDelete || katId;
      _al('delete', 'persediaan', `Hapus kategori KS: "${nm}"`, katId);
    } catch(e) {}
  });

  // 54. Hapus KS (ksId)
  _wrap('hapusKS', function(ksId) {
    try {
      const card = (typeof multiKartuStock !== 'undefined') ? multiKartuStock?.[ksId] : null;
      window._auditKsToDelete = card?.nama || ksId;
    } catch(e) {}
  }, function(ksId) {
    try {
      _al('delete', 'persediaan', `Hapus KS: "${window._auditKsToDelete || ksId}"`, ksId);
    } catch(e) {}
  });

  // â”€â”€ HOOKS LAPORAN â€” category: 'laporan', ref: page id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  // Buku Besar â€” hook saat filter akun berubah
  const _origRenderBB = window.renderBukuBesar;
  window.renderBukuBesar = function() {
    try {
      const kode = document.getElementById('bb-akun-filter-val')?.value || '';
      const nama = kode
        ? (typeof akuns !== 'undefined' ? akuns.find(a => a.kode === kode)?.nama || kode : kode)
        : 'Semua Akun';
      _al('info', 'laporan', `Filter Buku Besar: ${nama}`, 'buku-besar');
    } catch(e) {}
    return _origRenderBB?.apply(this, arguments);
  };

  // Laporan dengan filter periode (Laba Rugi, Neraca Saldo, Neraca)
  const _origRenderReportPeriod = window.renderReportWithPeriod;
  window.renderReportWithPeriod = function(pageId, periodVal) {
    try {
      const periodLabel = {
        'all':'Semua Periode','this-month':'Bulan Ini','last-month':'Bulan Lalu',
        'this-quarter':'Kuartal Ini','this-year':'Tahun Ini'
      }[periodVal] || periodVal;
      const pageLabel = {
        'laba-rugi':'Laba Rugi','neraca-saldo':'Neraca Saldo','neraca':'Neraca'
      }[pageId] || pageId;
      _al('info', 'laporan', `Filter ${pageLabel}: ${periodLabel}`, pageId);
    } catch(e) {}
    return _origRenderReportPeriod?.apply(this, arguments);
  };

  // Arus Kas
  const _origRenderAK = window.renderArusKas;
  window.renderArusKas = function() {
    try {
      const period = document.getElementById('ak-period')?.value
        || document.getElementById('pe-period')?.value || 'all';
      _al('info', 'laporan', `Lihat Arus Kas`, 'arus-kas');
    } catch(e) {}
    return _origRenderAK?.apply(this, arguments);
  };

  // Perubahan Ekuitas
  const _origRenderPE = window.renderPerubahanEkuitas;
  window.renderPerubahanEkuitas = function() {
    try {
      _al('info', 'laporan', 'Lihat Perubahan Ekuitas', 'perubahan-ekuitas');
    } catch(e) {}
    return _origRenderPE?.apply(this, arguments);
  };

  // Analitik
  const _origRenderAnalitik = window.renderAnalitik;
  window.renderAnalitik = function() {
    try {
      _al('info', 'laporan', 'Lihat Analitik', 'analitik');
    } catch(e) {}
    return _origRenderAnalitik?.apply(this, arguments);
  };

  // Neraca â€” hook renderNeraca
  const _origRenderNeraca = window.renderNeraca;
  window.renderNeraca = function() {
    try {
      _al('info', 'laporan', 'Lihat Neraca', 'neraca');
    } catch(e) {}
    return _origRenderNeraca?.apply(this, arguments);
  };

  console.log('[OAS Audit] Hooks installed â€” ' + new Date().toLocaleTimeString('id-ID'));
}

// PENTING: file ini (08) dimuat lebih awal dari banyak modul lain (09..20) yang
// baru mendefinisikan fungsi-fungsi yang mau di-hook di atas (mis. doResetAll di
// 15-storage.js, clearAIChat/sendAI/saveJurnalFromAI di 20-ai-chat.js). Kalau
// _installAuditHooks() dipanggil langsung di sini (saat file ini dieksekusi),
// window.doResetAll dkk masih undefined â€” hook terpasang ke slot kosong, lalu
// begitu file modul tsb belakangan mendeklarasikan `function namaSama(){...}`,
// deklarasi itu MENIMPA hook yang sudah dipasang (function declaration di scope
// global selalu menulis ulang window.namaSama). Efeknya: reset data, hapus chat
// AI, dsb tidak pernah tercatat di Audit Trail meski kodenya terlihat benar.
// Fix: tunda pemasangan hook sampai semua script <script defer> selesai jalan
// (DOMContentLoaded baru terpicu setelah itu), jadi semua fungsi target sudah
// pasti terdefinisi final saat di-wrap.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _installAuditHooks);
} else {
  _installAuditHooks();
}


