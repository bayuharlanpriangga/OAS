
function selectExportFmt(fmt) {
  exportFmt = fmt;
  ['excel','pdf','csv'].forEach(f => {
    document.getElementById('exp-opt-'+f).classList.toggle('exp-fmt-active', f === fmt);
  });
  updateExportSections();
}

function updateExportSections() {
  const isExcel = exportFmt === 'excel';
  const isPdf = exportFmt === 'pdf';
  document.getElementById('exp-excel-template-section').style.display = isExcel ? '' : 'none';
  document.getElementById('exp-pdf-logo-section').style.display = isPdf ? '' : 'none';
  const pvBtn = document.getElementById('exp-preview-btn');
  if(pvBtn) {
    pvBtn.disabled = !isPdf;
    pvBtn.style.cursor = isPdf ? 'pointer' : 'not-allowed';
    pvBtn.style.borderColor = isPdf ? 'var(--accent2)' : 'rgba(34,211,238,0.2)';
    pvBtn.style.color = isPdf ? 'var(--accent2)' : 'rgba(34,211,238,0.3)';
  }
}

function selectExcelTemplate(tmpl) {
  excelTemplate = tmpl;
  ['data','formula'].forEach(t => {
    document.getElementById('exp-tmpl-'+t).classList.toggle('exp-fmt-active', t === tmpl);
  });
  const desc = document.getElementById('exp-tmpl-desc');
  if(tmpl === 'data') {
    desc.innerHTML = '💡 <b style="color:var(--text)">Template Data:</b> Export data transaksi lengkap per sheet. Setiap sheet memiliki tabel terformat, total baris, dan sheet Referensi Formula sebagai panduan perhitungan manual di Excel/Spreadsheet.';
  } else {
    desc.innerHTML = '<i class="ti ti-settings ti-inline"></i> <b style="color:var(--accent2)">Template Hitung Otomatis:</b> Semua angka dihubungkan dengan formula Excel aktif. Sheet <b>INPUT</b> sebagai sumber data — ubah di sana, semua laporan (Laba Rugi, Neraca, Saldo) update otomatis. Ideal untuk input & analisis rutin.';
  }
}

// handleLogoUpload() versi lengkap ada di bawah (~baris 8406) — sudah pakai
// crop modal + menangani upload dari modal export maupun modal profil.
// Duplikat lama di sini dihapus.

function removeLogo() {
  exportLogoDataUrl = null;
  const img = document.getElementById('exp-logo-img');
  const placeholder = document.getElementById('exp-logo-placeholder');
  const removeBtn = document.getElementById('exp-logo-remove-btn');
  img.src = '';
  img.style.display = 'none';
  placeholder.style.display = '';
  removeBtn.style.display = 'none';
  document.getElementById('exp-logo-preview-box').style.borderStyle = 'dashed';
  document.getElementById('exp-logo-preview-box').style.borderColor = 'var(--border)';
}

function expStatus(msg, color='var(--accent2)') {
  const el = document.getElementById('exp-status');
  el.style.display = 'block';
  el.style.color = color;
  el.innerHTML = msg;
}

function openPdfPreview() {
  window._pvExportInfo = {
    nama:    document.getElementById('exp-nama-perusahaan')?.value || '',
    proyek:  document.getElementById('exp-proyek')?.value || '',
    periode: document.getElementById('exp-periode')?.value || '',
    sections: {
      jurnal:    document.getElementById('exp-jurnal-umum')?.checked,
      labaRugi:  document.getElementById('exp-laba-rugi')?.checked,
      neraca:    document.getElementById('exp-neraca')?.checked,
      saldo:     document.getElementById('exp-neraca-saldo')?.checked,
      dashboard: document.getElementById('exp-dashboard')?.checked,
      pajak:     document.getElementById('exp-pajak')?.checked,
    }
  };
  closeModal('modal-export');
  const modal = document.getElementById('modal-pdf-preview');
  if(!modal) { showAlert('❌ Komponen preview belum dimuat. Coba refresh halaman.'); return; }
  modal.classList.add('open');
  _pvPanelOpen = false;
  document.getElementById('pv-panel')?.classList.add('hidden');
  // Sync tampilan kartu template dengan setting yang tersimpan
  ['A','B','C','D'].forEach(id => document.getElementById('pv-tc-'+id)?.classList.toggle('active', id === _pvTmpl));
  if(typeof pvRenderPalList === 'function') pvRenderPalList();
  if(typeof pvRenderRecent === 'function') pvRenderRecent();
  _pvPages = []; _pvCurPage = 0;
  if(typeof pvBuildPages === 'function') pvBuildPages();
}

// ── Helper: inject template aktif → exportPDF ──
function _pvInjectThemeAndExport(nama, periode, proyek) {
  function hexToRgb(hex){const h=(hex||'#000000').replace('#','');return[parseInt(h.slice(0,2),16)||0,parseInt(h.slice(2,4),16)||0,parseInt(h.slice(4,6),16)||0];}
  function lighten(rgb,p){return rgb.map(c=>Math.round(c+(255-c)*p));}

  // Selalu inject theme — pvGetC1/C2/C3 otomatis fallback ke default palette per template
  const c1hex = pvGetC1();
  const c2hex = pvGetC2();
  const c1 = hexToRgb(c1hex);
  const c2 = hexToRgb(c2hex);

  if(_pvTmpl === 'A') {
    // Corporate: header/footer pakai c1, accent pakai c2
    window._pvExportTheme = {DARK:c1, GREEN:c2, BLUE:c2, LIGHT:lighten(c1,0.93)};
  } else if(_pvTmpl === 'B') {
    // Klasik Minimal: garis & judul pakai c1, highlight/KPI pakai c2
    window._pvExportTheme = {DARK:c1, GREEN:c2, BLUE:c2, LIGHT:lighten(hexToRgb(pvGetC3()),0.02)};
  } else {
    // Modern Dark: sidebar pakai c1, aksen pakai c2, bg pakai c3
    const c3hex = pvGetC3();
    const c3 = hexToRgb(c3hex);
    const darkBg = c3.every(v=>v>180) ? [28,32,48] : c3;
    window._pvExportTheme = {DARK:darkBg, GREEN:c1, BLUE:c2, LIGHT:[226,232,240]};
  }

  exportPDF(nama, periode, proyek);
  window._pvExportTheme = null;
}

function doExport() {
  const btn = document.getElementById('exp-btn');
  btn.disabled = true;
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Memproses...';
  const p = typeof getProfil === 'function' ? getProfil() : {};
  const nama = document.getElementById('exp-nama-perusahaan').value || p.nama || 'PT Demo Indonesia';
  const proyek = document.getElementById('exp-proyek')?.value || '';
  const periode = document.getElementById('exp-periode').value || new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'});

  if(exportFmt === 'pdf') {
    // FIX: PDF export dari modal utama harus pakai sistem template HTML (pvExportNow),
    // bukan exportPDF lama (jsPDF). Inject export info, build pages dengan template aktif,
    // lalu panggil pvExportNow setelah pages selesai dirender.
    window._pvExportInfo = {
      nama, proyek, periode,
      sections: {
        jurnal:    document.getElementById('exp-jurnal-umum')?.checked,
        labaRugi:  document.getElementById('exp-laba-rugi')?.checked,
        neraca:    document.getElementById('exp-neraca')?.checked,
        saldo:     document.getElementById('exp-neraca-saldo')?.checked,
        dashboard: document.getElementById('exp-dashboard')?.checked,
        pajak:     document.getElementById('exp-pajak')?.checked,
      }
    };
    // Build pages menggunakan template & warna yang sedang aktif (_pvTmpl, _pvColors)
    const gen = document.getElementById('pv-generating');
    if(gen) gen.style.display = 'flex';
    setTimeout(() => {
      try {
        const sec = window._pvExportInfo.sections || {};
        const c1 = pvGetC1(), c2 = pvGetC2(), c3 = pvGetC3(), t = _pvTmpl;
        _pvPages = [];
        _pvPages.push(pvMakeCover(nama, periode, proyek, sec, t, c1, c2, c3));
        if(sec.dashboard) _pvPages.push(pvMakeDash(nama, periode, t, c1, c2, c3));
        if(sec.jurnal) _pvPages.push(...pvMakeJurnal(nama, periode, t, c1, c2, c3));
        if(sec.labaRugi) _pvPages.push(pvMakeLR(nama, periode, t, c1, c2, c3));
        if(sec.neraca) _pvPages.push(pvMakeNeraca(nama, periode, t, c1, c2, c3));
        if(sec.saldo) _pvPages.push(pvMakeSaldo(nama, periode, t, c1, c2, c3));
        if(sec.pajak) _pvPages.push(pvMakePajak(nama, periode, t, c1, c2, c3));
        if(!_pvPages.length) _pvPages.push(pvMakeCover(nama, periode, proyek, {}, t, c1, c2, c3));
        if(gen) gen.style.display = 'none';
        // Sekarang export dengan template yang sudah terisi
        pvExportNow();
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Selesai!';
        setTimeout(() => { btn.innerHTML = '<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Export Sekarang'; btn.disabled = false; }, 2000);
      } catch(e) {
        if(gen) gen.style.display = 'none';
        expStatus('❌ Error: ' + e.message, 'var(--red)');
        btn.disabled = false;
        btn.innerHTML = '<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Export Sekarang';
      }
    }, 100);
    return;
  }

  setTimeout(() => {
    try {
      if(exportFmt === 'excel') exportExcel(nama, periode, excelTemplate);
      else exportCSV(nama, periode);
      btn.disabled = false;
      btn.innerHTML = '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Selesai!';
      setTimeout(() => { btn.innerHTML = '<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Export Sekarang'; btn.disabled = false; }, 2000);
    } catch(e) {
      expStatus('❌ Error: ' + e.message, 'var(--red)');
      btn.disabled = false;
      btn.innerHTML = '<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Export Sekarang';
    }
  }, 100);
}

// ══════════════════════════════════════════════════════════════════════
// AUDIT TRAIL SYSTEM — dengan label role multi-user
// ══════════════════════════════════════════════════════════════════════

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
};

// ── Determine current actor role ──────────────────────────────────────────
function _getActorRole() {
  // Guest / local mode
  if (typeof isGuestMode !== 'undefined' && isGuestMode) return 'guest';
  if (typeof currentUser === 'undefined' || !currentUser)  return 'guest';
  // Owner: company creator
  if (typeof currentCompany !== 'undefined' && currentCompany
      && currentCompany.user_id === currentUser.id) return 'owner';
  // Admin (member yang diberi role admin oleh owner)
  if (typeof _currentMemberRole !== 'undefined' && _currentMemberRole === 'admin') return 'admin';
  // Member biasa
  if (typeof _currentMemberRole !== 'undefined' && _currentMemberRole === 'member') return 'member';
  // Fallback: user sudah login, company belum terisi (masih loading) → tandai owner sementara
  // agar saat company sudah siap kita bisa re-evaluate; tapi jangan return 'admin' (menyesatkan)
  if (currentUser?.id) return 'owner'; // default ke owner sampai company info siap
  return 'guest';
}

// ══════════════════════════════════════════════════════════════════════
// AUDIT HOOKS
// ══════════════════════════════════════════════════════════════════════

// 1. Delete jurnal — patch confirm button after modal opens
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
        `Hapus jurnal ${entry.jenis||'Manual'}: ${entry.ket||entry.keterangan||'—'} — ${fmtRp(total)}`,
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
  auditLog(editId?'edit':'create','akun',`${editId?'Edit':'Tambah'} akun: ${kode} — ${nama} (${tipe})`,{ref:kode});
};
const _origHapusAkun2=window.hapusAkun;
window.hapusAkun=function(kode){
  const akun=akuns.find(a=>a.kode===kode);
  _origHapusAkun2?.(kode);
  auditLog('delete','akun',`Hapus akun: ${kode} — ${akun?.nama||''}`,{ref:kode});
};

// 3. Aset Tetap
const _origSimpanAsetTetap2=window.simpanAsetTetap;
window.simpanAsetTetap=function(){
  const nama=document.getElementById('at-nama')?.value;
  const harga=document.getElementById('at-harga')?.value;
  const editId=document.getElementById('at-edit-id')?.value;
  _origSimpanAsetTetap2?.();
  auditLog(editId?'edit':'create','aset',
    `${editId?'Edit':'Tambah'} aset: ${nama} — ${fmtRp(parseFloat(harga)||0)}`,{ref:editId||nama});
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
  const fmt=typeof exportFmt!=='undefined'?exportFmt:'—';
  const nama=document.getElementById('exp-nama-perusahaan')?.value||'—';
  _origDoExport2?.();
  auditLog('export','system',`Export laporan ${fmt.toUpperCase()} — ${nama}`,{ref:fmt});
};

// 8. Reset
const _origConfirmResetAll2=window.confirmResetAll;
window.confirmResetAll=function(){
  auditLog('reset','system','Membuka konfirmasi Reset Semua Data ⚠️');
  _origConfirmResetAll2?.();
};

// 9. Transaksi cepat penjualan & pembelian
const _origSimpanPenjualan2=window.simpanPenjualan;
window.simpanPenjualan=function(){
  const inv=document.getElementById('jual-inv')?.value||'';
  const jml=parseFloat(document.getElementById('jual-jumlah')?.value)||0;
  _origSimpanPenjualan2?.();
  auditLog('create','jurnal',`Penjualan${inv?' '+inv:''} — ${fmtRp(jml)}`,{ref:inv});
};
const _origSimpanPembelian2=window.simpanPembelian;
window.simpanPembelian=function(){
  const po=document.getElementById('beli-po')?.value||'';
  const jml=parseFloat(document.getElementById('beli-jumlah')?.value)||0;
  _origSimpanPembelian2?.();
  auditLog('create','jurnal',`Pembelian${po?' '+po:''} — ${fmtRp(jml)}`,{ref:po});
};

// 10. Auto penyusutan
const _origAtCheck2=window.atCheckAndRunAutoPenyusutan;
window.atCheckAndRunAutoPenyusutan=function(force=false){
  const before=jurnalEntries.length;
  _origAtCheck2?.(force);
  const after=jurnalEntries.length;
  if(after>before){
    const n=typeof asetTetapList!=='undefined'?asetTetapList.filter(a=>a.status==='aktif').length:0;
    auditLog('auto','jurnal',`Penyusutan otomatis${force?' (manual)':''} — ${n} aset`,{ref:'AUTO-DEPRE',count:n});
  }
};

// ── showPage hook — init audit page + patch hapus btn ────────────────────
const _origShowPageAudit=window.showPage;
window.showPage=function(id){
  _origShowPageAudit?.(id);
  if(id==='audit-trail') setTimeout(()=>{initAuditPage();_patchHapusJurnalBtn();},80);
  if(id==='jurnal-umum') setTimeout(_patchHapusJurnalBtn,200);
};

// ── Log startup ───────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  setTimeout(()=>auditLog('info','system','Aplikasi dibuka',{ref:'STARTUP'}),2000);
});


// ══════════════════════════════════════════════════════════════
// PDF PREVIEW & TEMPLATE SYSTEM
// ══════════════════════════════════════════════════════════════
let _pvPages=[], _pvCurPage=0, _pvPanelOpen=false;
let _pvRecentColors=[], _pvActiveCP=null;
let _pvCpH=210, _pvCpS=0.7, _pvCpV=0.9, _pvCpDrag=false;

const PV_PALETTES={
  A:[{key:'primary',label:'Warna Header & Footer',hex:'#1e3a8a'},{key:'accent',label:'Warna Aksen & Total Row',hex:'#3b82f6'},{key:'bg',label:'Warna Background Page',hex:'#ffffff'}],
  B:[{key:'primary',label:'Warna Garis & Judul',hex:'#111827'},{key:'accent',label:'Warna Highlight & KPI',hex:'#10b981'},{key:'bg',label:'Warna Background Row Alt',hex:'#f9fafb'}],
  C:[{key:'primary',label:'Warna Sidebar Strip',hex:'#7c3aed'},{key:'accent',label:'Warna Aksen & Heading',hex:'#a78bfa'},{key:'bg',label:'Warna Background Gelap',hex:'#0f172a'}],
  D:[{key:'primary',label:'Warna Strip & Header',hex:'#4ade80'},{key:'accent',label:'Warna Aksen Cyan',hex:'#22d3ee'},{key:'bg',label:'Warna Background Gelap',hex:'#1c2030'}],
};
const PV_PRESETS=['#1e3a8a','#2563eb','#3b82f6','#60a5fa','#065f46','#10b981','#34d399','#7c2d12','#dc2626','#f87171','#78350f','#f59e0b','#fcd34d','#4c1d95','#7c3aed','#a78bfa','#111827','#374151','#6b7280','#f9fafb'];

// ── Template PDF adalah SETTING GLOBAL — tersimpan di localStorage ──
const PV_STORAGE_KEY = 'oas_pdf_theme';
let _pvTmpl = 'A';
let _pvColors = {A:{},B:{},C:{},D:{}};

function _pvLoadSaved() {
  try {
    const s = localStorage.getItem(PV_STORAGE_KEY);
    if (s) {
      const d = JSON.parse(s);
      if (d.tmpl) _pvTmpl = d.tmpl;
      if (d.colors) _pvColors = Object.assign({A:{},B:{},C:{},D:{}}, d.colors);
      if (d.recent) _pvRecentColors = d.recent;
    }
  } catch(e) {}
}
function _pvSaveTheme() {
  try {
    localStorage.setItem(PV_STORAGE_KEY, JSON.stringify({
      tmpl: _pvTmpl, colors: _pvColors, recent: _pvRecentColors,
    }));
  } catch(e) {}
  _pvUpdateExportModalBadge();
}
function pvResetToDefault() {
  showCustomConfirmGeneral({
    icon: '🔄',
    iconColor: 'rgba(245,158,11,0.15)',
    iconBorder: 'rgba(245,158,11,0.3)',
    title: 'Reset Template PDF?',
    subtitle: 'Template akan kembali ke Corporate dan semua warna kustom akan dihapus.',
    warning: '⚠️ Tindakan ini tidak bisa dibatalkan.',
    btnLabel: '🔄 Ya, Reset ke Default',
    btnGradient: 'linear-gradient(135deg,#f59e0b,#ef4444)',
  }).then(function(ok) {
    if (!ok) return;
    _pvTmpl = 'A'; _pvColors = {A:{},B:{},C:{},D:{}}; _pvRecentColors = [];
    try { localStorage.removeItem(PV_STORAGE_KEY); } catch(e) {}
    ['A','B','C','D'].forEach(id => document.getElementById('pv-tc-'+id)?.classList.toggle('active', id==='A'));
    pvRenderPalList(); pvRenderRecent(); _pvUpdateExportModalBadge();
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Template direset ke default.');
  });
}
function _pvUpdateExportModalBadge() {
  const el = document.getElementById('exp-pdf-theme-badge');
  if (!el) return;
  const names = {A:'Corporate', B:'Klasik Minimal', C:'Modern Dark', D:'OAS Dark'};
  const clrs  = {A:'#3b82f6', B:'#374151', C:'#7c3aed', D:'#4ade80'};
  const isDefault = _pvTmpl==='A' && !Object.values(_pvColors).some(v=>Object.keys(v).length>0);
  el.innerHTML = '<span style="display:inline-flex;align-items:center;gap:6px;font-size:11px;">'
    +'<span style="width:10px;height:10px;border-radius:50%;background:'+clrs[_pvTmpl]+';display:inline-block;flex-shrink:0;border:1px solid rgba(255,255,255,0.2);"></span>'
    +'<b>'+names[_pvTmpl]+'</b>'
    +(isDefault?' <span style=\'color:var(--muted)\'>(default)</span>':' <span style=\'color:var(--accent)\'>(kustom ✓)</span>')
    +'</span>';
}
// Load saved theme saat script pertama kali jalan
_pvLoadSaved();

function pvGetColor(key){const s=PV_PALETTES[_pvTmpl].find(x=>x.key===key);return _pvColors[_pvTmpl][key]||s?.hex||'#1e3a8a';}
function pvGetC1(){return pvGetColor('primary');}
function pvGetC2(){return pvGetColor('accent');}
function pvGetC3(){return pvGetColor('bg')||((_pvTmpl==='C'||_pvTmpl==='D')?'#1c2030':'#ffffff');}
function pvHex2rgb(hex){const h=hex.replace('#','');return{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)};}
function pvRgb2hex(r,g,b){return'#'+[r,g,b].map(x=>Math.round(x).toString(16).padStart(2,'0')).join('');}
function pvHsv2hex(h,s,v){const i=Math.floor(h/60)%6,f=h/60-Math.floor(h/60),p=v*(1-s),q=v*(1-f*s),t=v*(1-(1-f)*s);let r,g,b;if(i===0){r=v;g=t;b=p;}else if(i===1){r=q;g=v;b=p;}else if(i===2){r=p;g=v;b=t;}else if(i===3){r=p;g=q;b=v;}else if(i===4){r=t;g=p;b=v;}else{r=v;g=p;b=q;}return pvRgb2hex(r*255,g*255,b*255);}
function pvHex2hsv(hex){const{r,g,b}=pvHex2rgb(hex);const rn=r/255,gn=g/255,bn=b/255,max=Math.max(rn,gn,bn),min=Math.min(rn,gn,bn),d=max-min;let h=0;if(d){if(max===rn)h=(60*((gn-bn)/d)+360)%360;else if(max===gn)h=60*((bn-rn)/d)+120;else h=60*((rn-gn)/d)+240;}return{h,s:max?d/max:0,v:max};}
function pvLuminance(hex){const{r,g,b}=pvHex2rgb(hex);const to=(c)=>{const s=c/255;return s<=.04045?s/12.92:Math.pow((s+.055)/1.055,2.4);};return .2126*to(r)+.7152*to(g)+.0722*to(b);}
function pvContrast(h1,h2){const l1=pvLuminance(h1),l2=pvLuminance(h2);return(Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05);}
function pvLighten(hex,amt){const{r,g,b}=pvHex2rgb(hex);const bl=c=>Math.round(c+(255-c)*amt);return pvRgb2hex(bl(r),bl(g),bl(b));}
function pvRgbStr(hex){const{r,g,b}=pvHex2rgb(hex);return r+','+g+','+b;}

function closePdfPreview(){document.getElementById('modal-pdf-preview')?.classList.remove('open');pvCloseCP();}
function pvTogglePanel(){
  _pvPanelOpen=!_pvPanelOpen;
  const p=document.getElementById('pv-panel'),b=document.getElementById('pv-edit-btn');
  p?.classList.toggle('hidden',!_pvPanelOpen);
  if(b){b.style.background=_pvPanelOpen?'rgba(34,211,238,0.12)':'';b.style.borderColor=_pvPanelOpen?'var(--accent2)':'';b.style.color=_pvPanelOpen?'var(--accent2)':'';}
  if(_pvPanelOpen)pvRenderPalList();
}
function pvSelectTmpl(t){_pvTmpl=t;['A','B','C','D'].forEach(id=>document.getElementById('pv-tc-'+id)?.classList.toggle('active',id===t));pvRenderPalList();}
function pvRenderPalList(){
  const el=document.getElementById('pv-pal-list');if(!el)return;
  el.innerHTML=PV_PALETTES[_pvTmpl].map(s=>{const hex=pvGetColor(s.key);return '<div class="pv-pal-row"><div class="pv-pal-dot" style="background:'+hex+';" onclick="pvOpenCP(&#39;'+s.key+'&#39;,&#39;'+s.label+'&#39;,this)"></div><div class="pv-pal-lbl">'+s.label+'</div><input class="pv-pal-hex" type="text" value="'+hex+'" maxlength="7" onchange="pvOnPalHex(&#39;'+s.key+'&#39;,this.value)" oninput="pvOnPalHex(&#39;'+s.key+'&#39;,this.value)"></div>';}).join('');
}
function pvOnPalHex(key,val){if(/^#[0-9a-fA-F]{6}$/.test(val)){_pvColors[_pvTmpl][key]=val;pvRenderPalList();}}
function pvApply(){
  _pvSaveTheme();
  pvBuildPages();
  if(_pvPanelOpen)pvTogglePanel();
  const tmplNames={A:'Corporate',B:'Klasik Minimal',C:'Modern Dark',D:'OAS Dark'};
  expStatus('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Template <b>'+tmplNames[_pvTmpl]+'</b> disimpan — berlaku untuk semua export PDF.','var(--accent)');
}

function pvBuildPages(){
  const gen=document.getElementById('pv-generating');if(gen)gen.style.display='flex';
  setTimeout(()=>{
    try{
      const info=window._pvExportInfo||{};
      const p=typeof getProfil==='function'?getProfil():{};
      const nama=info.nama||p.nama||'Perusahaan';
      const periode=info.periode||new Date().toLocaleDateString('id-ID',{month:'long',year:'numeric'});
      const proyek=info.proyek||'';
      const sec=info.sections||{};
      const c1=pvGetC1(),c2=pvGetC2(),c3=pvGetC3(),t=_pvTmpl;
      _pvPages=[];
      _pvPages.push(pvMakeCover(nama,periode,proyek,sec,t,c1,c2,c3));
      if(sec.dashboard)_pvPages.push(pvMakeDash(nama,periode,t,c1,c2,c3));
      if(sec.jurnal)_pvPages.push(...pvMakeJurnal(nama,periode,t,c1,c2,c3));
      if(sec.labaRugi)_pvPages.push(pvMakeLR(nama,periode,t,c1,c2,c3));
      if(sec.neraca)_pvPages.push(pvMakeNeraca(nama,periode,t,c1,c2,c3));
      if(sec.saldo)_pvPages.push(pvMakeSaldo(nama,periode,t,c1,c2,c3));
      if(sec.pajak)_pvPages.push(pvMakePajak(nama,periode,t,c1,c2,c3));
      if(!_pvPages.length)_pvPages.push(pvMakeCover(nama,periode,proyek,{},t,c1,c2,c3));
      pvRenderPage(0);pvBuildThumbs();pvUpdateNav();
    }catch(e){console.error('pvBuildPages:',e);}
    finally{if(gen)gen.style.display='none';}
  },60);
}

function pvStyles(t,c1,c2,c3){
  // ── TEMPLATE A: Corporate ──
  // Layout: Header bar solid penuh di atas, nama perusahaan di kiri header,
  // tabel dengan zebra stripe, section title pakai border-left accent,
  // KPI card dengan background tinted, footer bar bawah dengan warna primary.
  if(t==='A'){
    const bgPage=c3||'#ffffff';
    return'<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Helvetica Neue,Arial,sans-serif;background:'+bgPage+';color:#1e293b;width:794px;}'
    +'.pv-cover{background:'+c1+';color:#fff;height:1123px;display:flex;flex-direction:column;justify-content:space-between;padding:64px 56px;position:relative;}'
    +'.pv-hdr{background:'+c1+';color:#fff;padding:16px 38px 16px 38px;display:flex;align-items:center;justify-content:space-between;}'
    +'.pv-hdr-t{font-size:13px;font-weight:700;letter-spacing:.01em;}'
    +'.pv-hdr-s{font-size:9px;opacity:.65;margin-top:2px;}'
    +'.pv-hdr-r{font-size:9px;opacity:.55;text-align:right;}'
    +'.pv-body{padding:22px 38px;min-height:880px;background:'+bgPage+';}'
    +'.pv-sec{font-size:10.5px;font-weight:800;color:'+c1+';border-left:5px solid '+c2+';padding:5px 0 5px 10px;margin-bottom:14px;letter-spacing:.05em;text-transform:uppercase;background:'+pvLighten(c1,0.97)+';}'
    +'table{width:100%;border-collapse:collapse;font-size:10.5px;}'
    +'th{background:'+c1+';color:#fff;padding:7px 10px;text-align:left;font-size:9.5px;font-weight:700;}'
    +'td{padding:5px 10px;border-bottom:1px solid #e2e8f0;color:#334155;}'
    +'tr:nth-child(even) td{background:'+pvLighten(c2,0.93)+'}'
    +'.tot td{background:'+pvLighten(c1,0.88)+';font-weight:700;color:'+c1+';border-top:2px solid '+c2+';}'
    +'.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:18px;}'
    +'.kpi{background:'+pvLighten(c1,0.94)+';border-radius:6px;padding:13px 14px;border-left:4px solid '+c2+';}'
    +'.kpi-l{font-size:9px;color:#64748b;margin-bottom:4px;font-weight:600;text-transform:uppercase;}'
    +'.kpi-v{font-size:15px;font-weight:800;color:'+c1+';}'
    +'.foot{background:'+c1+';color:rgba(255,255,255,0.7);padding:7px 38px;display:flex;justify-content:space-between;font-size:8px;position:absolute;bottom:0;left:0;right:0;}'
    +'</style>';
  }
  // ── TEMPLATE B: Klasik Minimal ──
  // Layout: Tidak ada header bar — nama perusahaan sebagai teks besar di atas kanan,
  // garis horizontal tipis pemisah, tabel tanpa zebra (hanya border bawah per baris),
  // section title pakai garis bawah, KPI card berbentuk kotak outline,
  // footer hanya teks centered di bawah halaman.
  if(t==='B'){
    const bgPage=c3||'#ffffff';
    return'<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Georgia,Times New Roman,serif;background:'+bgPage+';color:#111827;width:794px;}'
    +'.pv-cover{background:'+bgPage+';height:1123px;display:flex;flex-direction:column;justify-content:center;padding:80px 70px;border-left:6px solid '+c1+';position:relative;}'
    +'.pv-hdr{border-bottom:2px solid '+c1+';padding:14px 50px;display:flex;align-items:flex-end;justify-content:space-between;background:'+bgPage+';}'
    +'.pv-hdr-t{font-size:14px;font-weight:700;color:'+c1+';letter-spacing:.01em;}'
    +'.pv-hdr-s{font-size:9px;color:#9ca3af;margin-top:3px;}'
    +'.pv-hdr-r{font-size:9px;color:#9ca3af;text-align:right;padding-bottom:2px;}'
    +'.pv-body{padding:28px 50px;min-height:880px;background:'+bgPage+';}'
    +'.pv-sec{font-size:11px;font-weight:700;color:'+c1+';border-bottom:1.5px solid '+c2+';padding-bottom:5px;margin-bottom:14px;display:flex;align-items:center;gap:8px;}'
    +'.pv-sec::before{content:"";display:inline-block;width:8px;height:8px;background:'+c2+';border-radius:50%;flex-shrink:0;}'
    +'table{width:100%;border-collapse:collapse;font-size:10.5px;}'
    +'th{border-bottom:2px solid '+c1+';color:'+c1+';padding:7px 10px;text-align:left;font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;background:transparent;}'
    +'td{padding:6px 10px;border-bottom:1px solid #e5e7eb;color:#374151;}'
    +'tr:nth-child(even) td{background:'+c3+'}'
    +'.tot td{font-weight:700;color:'+c1+';border-top:2px solid '+c1+';border-bottom:2px solid '+c1+';background:transparent;}'
    +'.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:22px;}'
    +'.kpi{border:1.5px solid '+c1+';border-radius:4px;padding:14px 16px;text-align:left;border-top:4px solid '+c2+';}'
    +'.kpi-l{font-size:9px;color:#6b7280;margin-bottom:5px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;}'
    +'.kpi-v{font-size:15px;font-weight:700;color:'+c1+';}'
    +'.foot{position:absolute;bottom:16px;left:50px;right:50px;text-align:center;font-size:8px;color:#9ca3af;border-top:1px solid #e5e7eb;padding-top:7px;display:flex;justify-content:space-between;}'
    +'</style>';
  }
  // ── TEMPLATE C: Modern Dark ──
  if(t==='C'){
  const bgDark=c3||'#0f172a';
  const isDark=pvLuminance(bgDark)<0.2;
  const txtColor=isDark?'#e2e8f0':'#1e293b';
  const mutedColor=isDark?'rgba(255,255,255,0.4)':'#64748b';
  const borderColor=isDark?'rgba(255,255,255,0.07)':'rgba(0,0,0,0.1)';
  return'<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Helvetica Neue,Arial,sans-serif;background:'+bgDark+';color:'+txtColor+';width:794px;}'
  +'.pv-cover{background:'+bgDark+';height:1123px;display:flex;position:relative;overflow:hidden;}'
  +'.pv-sidebar-strip{position:absolute;left:0;top:0;width:52px;height:100%;background:'+c1+';display:flex;flex-direction:column;align-items:center;justify-content:flex-end;padding-bottom:24px;}'
  +'.pv-hdr{margin-left:52px;padding:16px 32px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid '+borderColor+';}'
  +'.pv-hdr-t{font-size:13px;font-weight:700;color:'+txtColor+';}'
  +'.pv-hdr-s{font-size:9px;color:'+mutedColor+';margin-top:2px;}'
  +'.pv-hdr-r{font-size:9px;color:'+mutedColor+';text-align:right;}'
  +'.pv-body{margin-left:52px;padding:22px 32px;min-height:880px;}'
  +'.pv-sec{font-size:10px;font-weight:800;color:'+c2+';background:rgba('+pvRgbStr(c1)+',0.15);border-left:3px solid '+c1+';padding:5px 10px;margin-bottom:13px;letter-spacing:.07em;text-transform:uppercase;border-radius:0 4px 4px 0;}'
  +'table{width:100%;border-collapse:collapse;font-size:10.5px;}'
  +'th{color:'+c2+';padding:7px 10px;text-align:left;font-size:9.5px;font-weight:700;border-bottom:1px solid rgba('+pvRgbStr(c1)+',0.5);background:transparent;}'
  +'td{padding:5px 10px;border-bottom:1px solid '+borderColor+';color:'+txtColor+';}'
  +'tr:nth-child(even) td{background:rgba('+pvRgbStr(c1)+',0.08)}'
  +'.tot td{background:rgba('+pvRgbStr(c1)+',0.2);font-weight:700;color:'+txtColor+';border-top:1px solid '+c1+';}'
  +'.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;margin-bottom:18px;}'
  +'.kpi{background:rgba(255,255,255,0.04);border-radius:8px;padding:13px;border:1px solid '+borderColor+';border-top:3px solid '+c1+';}'
  +'.kpi-l{font-size:9px;color:'+mutedColor+';margin-bottom:4px;font-weight:600;text-transform:uppercase;}'
  +'.kpi-v{font-size:14px;font-weight:800;color:'+c2+';}'
  +'.foot{margin-left:52px;padding:6px 32px;display:flex;justify-content:space-between;font-size:8px;color:'+mutedColor+';border-top:1px solid '+borderColor+';position:absolute;bottom:0;left:0;right:0;}'
  +'</style>';
  }
  if(t==='D'){
  const bgD=c3||'#1c2030';
  const accentD=c2||'#22d3ee';
  const stripD=c1||'#4ade80';
  const txtD='#e2e8f0';
  const mutedD='rgba(255,255,255,0.4)';
  const borderD='rgba(255,255,255,0.07)';
  return'<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:Helvetica Neue,Arial,sans-serif;background:'+bgD+';color:'+txtD+';width:794px;}'
  +'.pv-hdr{background:rgba(0,0,0,0.35);color:'+txtD+';padding:0 38px;height:44px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid '+borderD+';}'
  +'.pv-hdr-left{display:flex;align-items:center;gap:12px;}'
  +'.pv-hdr-strip{width:4px;height:24px;background:'+stripD+';border-radius:2px;flex-shrink:0;}'
  +'.pv-hdr-t{font-size:13px;font-weight:700;letter-spacing:.01em;}'
  +'.pv-hdr-s{font-size:9px;color:'+mutedD+';margin-top:1px;}'
  +'.pv-hdr-r{font-size:9px;color:'+mutedD+';text-align:right;}'
  +'.pv-body{padding:20px 38px;min-height:880px;background:'+bgD+';}'
  +'.pv-sec{font-size:10px;font-weight:800;color:'+accentD+';border-left:4px solid '+stripD+';padding:5px 0 5px 12px;margin-bottom:14px;letter-spacing:.07em;text-transform:uppercase;background:rgba(74,222,128,0.06);}'
  +'table{width:100%;border-collapse:collapse;font-size:10.5px;}'
  +'th{background:rgba(0,0,0,0.4);color:'+accentD+';padding:7px 10px;text-align:left;font-size:9.5px;font-weight:700;border-bottom:2px solid rgba(74,222,128,0.3);}'
  +'td{padding:5px 10px;border-bottom:1px solid '+borderD+';color:'+txtD+';}'
  +'tr:nth-child(even) td{background:rgba(255,255,255,0.03)}'
  +'.tot td{background:rgba(34,211,238,0.08);font-weight:700;color:'+accentD+';border-top:1px solid rgba(34,211,238,0.3);}'
  +'.kpi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:18px;}'
  +'.kpi{background:rgba(255,255,255,0.04);border-radius:8px;padding:12px 14px;border:1px solid '+borderD+';border-top:3px solid '+stripD+';}'
  +'.kpi-l{font-size:9px;color:'+mutedD+';margin-bottom:4px;font-weight:600;text-transform:uppercase;}'
  +'.kpi-v{font-size:15px;font-weight:800;color:'+accentD+';}'
  +'.foot{background:rgba(0,0,0,0.4);color:'+mutedD+';padding:6px 38px;display:flex;justify-content:space-between;font-size:8px;border-top:1px solid rgba(74,222,128,0.2);position:absolute;bottom:0;left:0;right:0;}'
  +'</style>';
  }
}

function pvWrap(t,c1,c2,c3,nama,periode,body,pg){
  const st=pvStyles(t,c1,c2,c3);
  const today=new Date().toLocaleDateString('id-ID');
  // Logo: tampilkan di header jika ada
  const logo=typeof exportLogoDataUrl!=='undefined'&&exportLogoDataUrl?exportLogoDataUrl:null;
  const logoHtml=logo?'<img src="'+logo+'" style="width:32px;height:32px;object-fit:contain;border-radius:6px;flex-shrink:0;margin-left:10px;" alt="logo">':'';
  const logoHtmlC=logo?'<img src="'+logo+'" style="width:28px;height:28px;object-fit:contain;border-radius:5px;flex-shrink:0;" alt="logo">':'';
  // Template A: full-width header bar solid, logo di kanan header
  if(t==='A'){
    return'<!DOCTYPE html><html><head><meta charset="utf-8">'+st+'</head><body style="position:relative;overflow:hidden;width:794px;min-height:1123px;">'
      +'<div class="pv-hdr"><div><div class="pv-hdr-t">'+nama+'</div><div class="pv-hdr-s">Laporan Keuangan &middot; '+periode+'</div></div>'
      +'<div style="display:flex;align-items:center;gap:0;">'
        +'<div class="pv-hdr-r">Hal. '+pg+'<br><span style="font-size:8px;">'+today+'</span></div>'
        +logoHtml
      +'</div></div>'
      +'<div class="pv-body">'+body+'</div>'
      +'<div class="foot"><span>'+nama+' &middot; '+periode+'</span><span>Dicetak: '+today+'</span></div>'
      +'</body></html>';
  }
  // Template B: header garis bawah, logo di kanan header
  if(t==='B'){
    return'<!DOCTYPE html><html><head><meta charset="utf-8">'+st+'</head><body style="position:relative;overflow:hidden;width:794px;min-height:1123px;">'
      +'<div class="pv-hdr"><div><div class="pv-hdr-t">'+nama+'</div><div class="pv-hdr-s">Laporan Keuangan &middot; '+periode+'</div></div>'
      +'<div style="display:flex;align-items:center;gap:0;">'
        +'<div class="pv-hdr-r">Hal. '+pg+'<br><span style="font-size:8px;">'+today+'</span></div>'
        +(logo?'<img src="'+logo+'" style="width:32px;height:32px;object-fit:contain;border-radius:6px;flex-shrink:0;margin-left:10px;border:1px solid #e5e7eb;" alt="logo">':'')
      +'</div></div>'
      +'<div class="pv-body">'+body+'</div>'
      +'<div class="foot"><span>'+nama+'</span><span>'+periode+' &middot; Dicetak: '+today+'</span></div>'
      +'</body></html>';
  }
  // Template C: sidebar strip kiri, header & footer indented, logo di sidebar atas
  if(t==='C'){
    const bgDark=c3||'#0f172a';
    return'<!DOCTYPE html><html><head><meta charset="utf-8">'+st+'</head><body style="position:relative;overflow:hidden;width:794px;min-height:1123px;">'
      +'<div style="position:absolute;left:0;top:0;width:52px;height:100%;background:'+c1+';display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:16px 0 20px;">'
        +(logo?'<img src="'+logo+'" style="width:32px;height:32px;object-fit:contain;border-radius:6px;flex-shrink:0;" alt="logo">'
              :'<div style="width:28px;height:28px;background:rgba(255,255,255,0.15);border-radius:5px;"></div>')
        +'<span style="font-size:7px;color:rgba(255,255,255,0.5);writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:.12em;text-transform:uppercase;transform:rotate(180deg);">'+nama+'</span>'
      +'</div>'
      +'<div class="pv-hdr"><div><div class="pv-hdr-t">'+nama+'</div><div class="pv-hdr-s">Laporan Keuangan &middot; '+periode+'</div></div><div class="pv-hdr-r">Hal. '+pg+'<br><span style="font-size:8px;">'+today+'</span></div></div>'
      +'<div class="pv-body">'+body+'</div>'
      +'<div class="foot"><span>'+nama+' &middot; '+periode+'</span><span>Hal. '+pg+' &middot; '+today+'</span></div>'
      +'</body></html>';
  }
  // Template D: OAS Dark — header bar gelap penuh dengan strip hijau, bg #1c2030, aksen cyan
  const logoHtmlD=logo?'<img src="'+logo+'" style="width:28px;height:28px;object-fit:contain;border-radius:5px;flex-shrink:0;margin-left:10px;" alt="logo">':'';
  return'<!DOCTYPE html><html><head><meta charset="utf-8">'+st+'</head><body style="position:relative;overflow:hidden;width:794px;min-height:1123px;">'
    +'<div class="pv-hdr">'
      +'<div class="pv-hdr-left"><div class="pv-hdr-strip"></div><div><div class="pv-hdr-t">'+nama+'</div><div class="pv-hdr-s">Laporan Keuangan &middot; '+periode+'</div></div></div>'
      +'<div style="display:flex;align-items:center;"><div class="pv-hdr-r">Hal. '+pg+'<br><span style="font-size:8px;">'+today+'</span></div>'+logoHtmlD+'</div>'
    +'</div>'
    +'<div class="pv-body">'+body+'</div>'
    +'<div class="foot"><span>'+nama+' &middot; '+periode+'</span><span>Hal. '+pg+' &middot; '+today+'</span></div>'
    +'</body></html>';
}

function pvMakeCover(nama,periode,proyek,sec,t,c1,c2,c3){
  const st=pvStyles(t,c1,c2,c3);
  const today=new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const list=[sec.dashboard&&'Ringkasan Keuangan',sec.jurnal&&'Jurnal Umum',sec.labaRugi&&'Laporan Laba Rugi',sec.neraca&&'Neraca',sec.saldo&&'Neraca Saldo',sec.pajak&&'Laporan Pajak'].filter(Boolean);

  // ── Cover A: Corporate — nama besar di bawah blok warna, logo pojok kanan atas ──
  if(t==='A'){
    const bgPage=c3||'#ffffff';
    const logo=typeof exportLogoDataUrl!=='undefined'&&exportLogoDataUrl?exportLogoDataUrl:null;
    const logoBlock=logo?'<div style="position:absolute;top:28px;right:52px;width:64px;height:64px;background:rgba(255,255,255,0.12);border-radius:10px;padding:6px;display:flex;align-items:center;justify-content:center;"><img src="'+logo+'" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" alt="logo"></div>':'';
    return'<!DOCTYPE html><html><head><meta charset="utf-8">'+st+'</head><body style="overflow:hidden;width:794px;height:1123px;">'
      +'<div style="position:relative;width:794px;height:1123px;background:'+bgPage+';">'
        +'<div style="position:absolute;top:0;left:0;right:0;height:440px;background:'+c1+';"></div>'
        +'<div style="position:absolute;top:440px;left:0;right:0;height:6px;background:'+c2+';"></div>'
        +logoBlock
        +'<div style="position:absolute;top:0;left:0;right:0;height:440px;display:flex;flex-direction:column;justify-content:flex-end;padding:0 64px 48px;">'
          +'<div style="font-size:10px;font-weight:700;letter-spacing:.25em;color:rgba(255,255,255,0.55);text-transform:uppercase;margin-bottom:14px;">Laporan Keuangan</div>'
          +'<div style="font-size:44px;font-weight:900;color:#fff;line-height:1.1;margin-bottom:10px;max-width:580px;">'+nama+'</div>'
          +(proyek?'<div style="font-size:14px;color:rgba(255,255,255,0.65);margin-bottom:6px;">'+proyek+'</div>':'')
          +'<div style="font-size:13px;color:rgba(255,255,255,0.6);">Periode: '+periode+'</div>'
        +'</div>'
        +'<div style="position:absolute;top:480px;left:64px;right:64px;">'
          +'<div style="font-size:9px;font-weight:700;color:'+c1+';text-transform:uppercase;letter-spacing:.12em;margin-bottom:16px;border-left:4px solid '+c2+';padding-left:10px;">Daftar Isi</div>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:520px;">'
            +list.map((s,i)=>'<div style="font-size:12px;color:#334155;display:flex;gap:9px;align-items:center;"><span style="width:22px;height:22px;border-radius:4px;background:'+c1+';display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0;">'+(i+1)+'</span>'+s+'</div>').join('')
          +'</div>'
          +'<div style="margin-top:48px;font-size:9px;color:#94a3b8;">Dicetak: '+today+'</div>'
        +'</div>'
      +'</div>'
      +'</body></html>';
  }

  // ── Cover B: Klasik Minimal — teks centered, garis kiri tebal, logo pojok kanan atas ──
  if(t==='B'){
    const bgPage=c3||'#ffffff';
    const logo=typeof exportLogoDataUrl!=='undefined'&&exportLogoDataUrl?exportLogoDataUrl:null;
    const logoBlockB=logo?'<div style="position:absolute;top:32px;right:52px;width:60px;height:60px;border:1.5px solid #e5e7eb;border-radius:10px;padding:5px;display:flex;align-items:center;justify-content:center;background:#fff;"><img src="'+logo+'" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" alt="logo"></div>':'';
    return'<!DOCTYPE html><html><head><meta charset="utf-8">'+st+'</head><body style="overflow:hidden;width:794px;height:1123px;">'
      +'<div style="position:relative;width:794px;height:1123px;background:'+bgPage+';border-left:10px solid '+c1+';">'
        +'<div style="position:absolute;top:0;left:0;right:0;height:8px;background:'+c2+';"></div>'
        +logoBlockB
        +'<div style="padding:110px 80px 0;">'
          +'<div style="font-size:10px;font-weight:700;letter-spacing:.2em;color:'+c2+';text-transform:uppercase;margin-bottom:18px;">Laporan Keuangan</div>'
          +'<div style="font-size:48px;font-weight:900;color:'+c1+';line-height:1.1;margin-bottom:14px;max-width:540px;font-family:Georgia,serif;">'+nama+'</div>'
          +(proyek?'<div style="font-size:15px;color:#6b7280;margin-bottom:8px;">'+proyek+'</div>':'')
          +'<div style="font-size:13px;color:#6b7280;">Periode: '+periode+'</div>'
          +'<div style="margin-top:60px;border-top:2px solid '+c1+';padding-top:28px;">'
            +'<div style="font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;">Daftar Isi</div>'
            +list.map((s,i)=>'<div style="font-size:12px;color:'+c1+';padding:8px 0;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:12px;"><span style="font-size:11px;font-weight:700;color:'+c2+';min-width:18px;">'+(i<9?'0':'')+(i+1)+'.</span>'+s+'</div>').join('')
          +'</div>'
          +'<div style="position:absolute;bottom:56px;left:80px;font-size:9px;color:#9ca3af;">'+today+'</div>'
        +'</div>'
      +'</div>'
      +'</body></html>';
  }

  // ── Cover C: Modern Dark — sidebar strip, logo di sidebar, nama di tengah-kanan ──
  if(t==='C'){
  const bgDark=c3||'#0f172a';
  const isDark=pvLuminance(bgDark)<0.2;
  const txtColor=isDark?'#f1f5f9':'#1e293b';
  const mutedColor=isDark?'rgba(255,255,255,0.45)':'#64748b';
  const logo=typeof exportLogoDataUrl!=='undefined'&&exportLogoDataUrl?exportLogoDataUrl:null;
  return'<!DOCTYPE html><html><head><meta charset="utf-8">'+st+'</head><body style="overflow:hidden;width:794px;height:1123px;">'
    +'<div style="position:relative;width:794px;height:1123px;background:'+bgDark+';">'
      +'<div style="position:absolute;left:0;top:0;width:64px;height:100%;background:'+c1+';display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:28px 0;">'
        +(logo
          ?'<div style="width:40px;height:40px;background:rgba(255,255,255,0.12);border-radius:8px;padding:4px;display:flex;align-items:center;justify-content:center;"><img src="'+logo+'" style="width:100%;height:100%;object-fit:contain;border-radius:5px;" alt="logo"></div>'
          :'<div style="width:28px;height:28px;background:rgba(255,255,255,0.15);border-radius:6px;"></div>')
        +'<span style="font-size:7.5px;color:rgba(255,255,255,0.6);writing-mode:vertical-rl;text-orientation:mixed;letter-spacing:.14em;text-transform:uppercase;transform:rotate(180deg);">Laporan Keuangan</span>'
        +'<div style="font-size:8px;color:rgba(255,255,255,0.4);writing-mode:vertical-rl;transform:rotate(180deg);">'+new Date().getFullYear()+'</div>'
      +'</div>'
      +'<div style="margin-left:64px;padding:80px 56px;height:100%;display:flex;flex-direction:column;justify-content:space-between;">'
        +'<div>'
          +'<div style="font-size:10px;font-weight:700;letter-spacing:.2em;color:'+c2+';text-transform:uppercase;margin-bottom:20px;">'+periode+'</div>'
          +'<div style="font-size:46px;font-weight:900;color:'+txtColor+';line-height:1.1;margin-bottom:12px;max-width:500px;">'+nama+'</div>'
          +(proyek?'<div style="font-size:14px;color:'+mutedColor+';margin-bottom:6px;">'+proyek+'</div>':'')
        +'</div>'
        +'<div>'
          +'<div style="font-size:9px;font-weight:700;color:'+mutedColor+';text-transform:uppercase;letter-spacing:.1em;margin-bottom:14px;">Isi Laporan</div>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;max-width:480px;">'
            +list.map((s,i)=>'<div style="font-size:11px;color:'+txtColor+';display:flex;gap:9px;align-items:center;"><span style="width:22px;height:22px;border-radius:50%;background:'+c2+';display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;color:#fff;flex-shrink:0;">'+(i+1)+'</span>'+s+'</div>').join('')
          +'</div>'
          +'<div style="margin-top:40px;font-size:9px;color:'+mutedColor+';">Dicetak: '+today+'</div>'
        +'</div>'
      +'</div>'
    +'</div>'
    +'</body></html>';
  }

  // ── Cover D: OAS Dark — full dark bg, strip hijau kiri, nama di tengah, daftar isi grid ──
  const bgD=c3||'#1c2030';
  const stripD=c1||'#4ade80';
  const accentD=c2||'#22d3ee';
  const logoD=typeof exportLogoDataUrl!=='undefined'&&exportLogoDataUrl?exportLogoDataUrl:null;
  return'<!DOCTYPE html><html><head><meta charset="utf-8">'+st+'</head><body style="overflow:hidden;width:794px;height:1123px;">'
    +'<div style="position:relative;width:794px;height:1123px;background:'+bgD+';">'
      +'<div style="position:absolute;left:0;top:0;width:8px;height:100%;background:'+stripD+';"></div>'
      +(logoD?'<div style="position:absolute;top:32px;right:52px;width:60px;height:60px;background:rgba(255,255,255,0.06);border-radius:10px;padding:6px;display:flex;align-items:center;justify-content:center;"><img src="'+logoD+'" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" alt="logo"></div>':'')
      +'<div style="padding:120px 72px 0;">'
        +'<div style="font-size:10px;font-weight:700;letter-spacing:.28em;color:'+accentD+';text-transform:uppercase;margin-bottom:16px;">Laporan Keuangan</div>'
        +'<div style="font-size:46px;font-weight:900;color:#e2e8f0;line-height:1.1;margin-bottom:12px;max-width:560px;">'+nama+'</div>'
        +(proyek?'<div style="font-size:14px;color:rgba(255,255,255,0.45);margin-bottom:8px;">'+proyek+'</div>':'')
        +'<div style="font-size:13px;color:rgba(255,255,255,0.35);">Periode: '+periode+'</div>'
        +'<div style="margin-top:56px;border-top:1px solid rgba(74,222,128,0.2);padding-top:32px;">'
          +'<div style="font-size:9px;font-weight:700;color:rgba(255,255,255,0.3);text-transform:uppercase;letter-spacing:.12em;margin-bottom:16px;border-left:3px solid '+accentD+';padding-left:10px;">Daftar Isi</div>'
          +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;max-width:520px;">'
            +list.map((s,i)=>'<div style="font-size:12px;color:#cbd5e1;display:flex;gap:9px;align-items:center;"><span style="width:22px;height:22px;border-radius:4px;background:rgba(74,222,128,0.15);border:1px solid rgba(74,222,128,0.3);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:'+accentD+';flex-shrink:0;">'+(i+1)+'</span>'+s+'</div>').join('')
          +'</div>'
          +'<div style="margin-top:48px;font-size:9px;color:rgba(255,255,255,0.2);">Dicetak: '+today+'</div>'
        +'</div>'
      +'</div>'
    +'</div>'
    +'</body></html>';
}

function pvSaldo(kode){let d=0,k=0;jurnalEntries.forEach(j=>j.lines.forEach(l=>{if(l.akun===kode){d+=l.debit||0;k+=l.kredit||0;}}));const a=akuns.find(x=>x.kode===kode);return a?.normal==='D'?d-k:k-d;}

function pvMakeDash(nama,periode,t,c1,c2,c3){
  const tP=akuns.filter(a=>a.tipe==='Pendapatan').reduce((s,a)=>s+pvSaldo(a.kode),0);
  const tH=akuns.filter(a=>a.tipe==='HPP').reduce((s,a)=>s+pvSaldo(a.kode),0);
  const tB=akuns.filter(a=>a.tipe==='Beban').reduce((s,a)=>s+pvSaldo(a.kode),0);
  const lk=tP-tH,lb=lk-tB;
  const kpis=[{l:'Total Pendapatan',v:rp(tP),c:c2},{l:'Laba Kotor',v:rp(lk),c:lk>=0?c2:'#ef4444'},{l:'Laba Bersih',v:rp(lb),c:lb>=0?c2:'#ef4444'},{l:'Total HPP',v:rp(tH),c:'#ef4444'},{l:'Total Beban',v:rp(tB),c:'#ef4444'},{l:'Margin',v:tP?((lb/tP)*100).toFixed(1)+'%':'—',c:c2}];
  const body='<div class="pv-sec">Ringkasan Keuangan</div><div class="kpi-grid">'+kpis.map(k=>'<div class="kpi"><div class="kpi-l">'+k.l+'</div><div class="kpi-v" style="color:'+k.c+';">'+k.v+'</div></div>').join('')+'</div><div class="pv-sec">Ringkasan Transaksi</div><table><thead><tr><th>Keterangan</th><th>Jumlah</th></tr></thead><tbody><tr><td>Total Jurnal</td><td>'+jurnalEntries.length+' entri</td></tr><tr><td>Jurnal Penjualan</td><td>'+jurnalEntries.filter(j=>j.jenis==='Penjualan').length+' entri</td></tr><tr><td>Jurnal PPN</td><td>'+jurnalEntries.filter(j=>j.jenis==='PPN').length+' entri</td></tr><tr class="tot"><td>Periode</td><td>'+periode+'</td></tr></tbody></table>';
  return pvWrap(t,c1,c2,c3,nama,periode,body,2);
}

function pvMakeJurnal(nama,periode,t,c1,c2,c3){
  const pages=[],PRP=22,entries=jurnalEntries.slice(0,44);
  const chunks=[];for(let i=0;i<Math.max(entries.length,1);i+=PRP)chunks.push(entries.slice(i,i+PRP));
  if(!chunks.length)chunks.push([]);
  chunks.forEach((ch,pi)=>{
    const rows=ch.map(j=>{const nom=j.lines.reduce((s,l)=>s+Math.max(l.debit||0,l.kredit||0),0);return'<tr><td style="font-size:9.5px;">'+j.tanggal+'</td><td>'+(j.keterangan||j.ket||'—')+'</td><td style="text-align:right;">'+rp(nom)+'</td><td><span style="font-size:9px;background:rgba(34,211,238,0.12);color:#0891b2;padding:1px 5px;border-radius:4px;">'+(j.jenis||'—')+'</span></td></tr>';}).join('');
    const body='<div class="pv-sec">JURNAL UMUM</div><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th style="text-align:right;">Nominal</th><th>Jenis</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4" style="text-align:center;color:#9ca3af;padding:18px;">Belum ada data</td></tr>')+'</tbody></table>';
    pages.push(pvWrap(t,c1,c2,c3,nama,periode,body,3+pi));
  });
  return pages;
}

function pvMakeLR(nama,periode,t,c1,c2,c3){
  const pL=akuns.filter(a=>a.tipe==='Pendapatan'),hL=akuns.filter(a=>a.tipe==='HPP'),bL=akuns.filter(a=>a.tipe==='Beban');
  const tP=pL.reduce((s,a)=>s+pvSaldo(a.kode),0),tH=hL.reduce((s,a)=>s+pvSaldo(a.kode),0),tB=bL.reduce((s,a)=>s+pvSaldo(a.kode),0);
  const mkR=(l)=>l.map(a=>{const s=pvSaldo(a.kode);return s?'<tr><td>'+a.kode+'</td><td>'+a.nama+'</td><td style="text-align:right;">'+rp(s)+'</td></tr>':''}).join('');
  const body='<div class="pv-sec">Laporan Laba Rugi</div><table><thead><tr><th>Kode</th><th>Akun</th><th style="text-align:right;">Saldo</th></tr></thead><tbody><tr><td colspan="3" style="font-weight:700;padding-top:8px;font-size:10px;">PENDAPATAN</td></tr>'+mkR(pL)+'<tr class="tot"><td colspan="2">Total Pendapatan</td><td style="text-align:right;">'+rp(tP)+'</td></tr><tr><td colspan="3" style="font-weight:700;padding-top:8px;font-size:10px;">HPP</td></tr>'+mkR(hL)+'<tr class="tot"><td colspan="2">Total HPP</td><td style="text-align:right;">'+rp(tH)+'</td></tr><tr><td colspan="3" style="font-weight:700;padding-top:8px;font-size:10px;">BEBAN</td></tr>'+mkR(bL)+'<tr class="tot"><td colspan="2">Total Beban</td><td style="text-align:right;">'+rp(tB)+'</td></tr><tr style="background:#dbeafe;"><td colspan="2" style="font-weight:800;">LABA BERSIH</td><td style="text-align:right;font-weight:800;">'+rp(tP-tH-tB)+'</td></tr></tbody></table>';
  return pvWrap(t,c1,c2,c3,nama,periode,body,'—');
}

function pvMakeNeraca(nama,periode,t,c1,c2,c3){
  const aL=akuns.filter(a=>a.tipe==='Aset'),lL=akuns.filter(a=>a.tipe==='Liabilitas'),eL=akuns.filter(a=>a.tipe==='Ekuitas');
  const tA=aL.reduce((s,a)=>s+pvSaldo(a.kode),0),tL=lL.reduce((s,a)=>s+pvSaldo(a.kode),0),tE=eL.reduce((s,a)=>s+pvSaldo(a.kode),0);
  const mkR=(l)=>l.map(a=>{const s=pvSaldo(a.kode);return s?'<tr><td>'+a.kode+'</td><td>'+a.nama+'</td><td style="text-align:right;">'+rp(s)+'</td></tr>':''}).join('');
  const body='<div class="pv-sec">Neraca</div><table><thead><tr><th>Kode</th><th>Akun</th><th style="text-align:right;">Saldo</th></tr></thead><tbody><tr><td colspan="3" style="font-weight:700;padding-top:8px;">ASET</td></tr>'+mkR(aL)+'<tr class="tot"><td colspan="2">Total Aset</td><td style="text-align:right;">'+rp(tA)+'</td></tr><tr><td colspan="3" style="font-weight:700;padding-top:8px;">LIABILITAS</td></tr>'+mkR(lL)+'<tr class="tot"><td colspan="2">Total Liabilitas</td><td style="text-align:right;">'+rp(tL)+'</td></tr><tr><td colspan="3" style="font-weight:700;padding-top:8px;">EKUITAS</td></tr>'+mkR(eL)+'<tr class="tot"><td colspan="2">Total Ekuitas</td><td style="text-align:right;">'+rp(tE)+'</td></tr><tr style="background:#dbeafe;"><td colspan="2" style="font-weight:800;">Total Liabilitas + Ekuitas</td><td style="text-align:right;font-weight:800;">'+rp(tL+tE)+'</td></tr></tbody></table>';
  return pvWrap(t,c1,c2,c3,nama,periode,body,'—');
}

function pvMakeSaldo(nama,periode,t,c1,c2,c3){
  const rows=akuns.map(a=>{let d=0,k=0;jurnalEntries.forEach(j=>j.lines.forEach(l=>{if(l.akun===a.kode){d+=l.debit||0;k+=l.kredit||0;}}));return(!d&&!k)?'':'<tr><td>'+a.kode+'</td><td>'+a.nama+'</td><td style="text-align:right;">'+(d?rp(d):'-')+'</td><td style="text-align:right;">'+(k?rp(k):'-')+'</td></tr>';}).join('');
  const body='<div class="pv-sec">Neraca Saldo</div><table><thead><tr><th>Kode</th><th>Nama Akun</th><th style="text-align:right;">Debit</th><th style="text-align:right;">Kredit</th></tr></thead><tbody>'+(rows||'<tr><td colspan="4" style="text-align:center;padding:18px;color:#9ca3af;">Belum ada data</td></tr>')+'</tbody></table>';
  return pvWrap(t,c1,c2,c3,nama,periode,body,'—');
}

function pvMakePajak(nama,periode,t,c1,c2,c3){
  const ppnJ=jurnalEntries.filter(j=>j.jenis==='PPN');let total=0;
  const rows=ppnJ.map(j=>{const krd=j.lines.find(l=>l.kredit>0&&(l.akun==='2301'||l.akun?.startsWith('23')));const ppn=krd?krd.kredit:0;total+=ppn;const dpp=j._ppnTarif?Math.round(ppn/(j._ppnTarif/100)):0;return ppn?'<tr><td style="font-size:9.5px;">'+j.tanggal+'</td><td>'+j.keterangan+'</td><td style="text-align:right;">'+rp(dpp)+'</td><td style="text-align:center;">'+(j._ppnTarif||'—')+'%</td><td style="text-align:right;">'+rp(ppn)+'</td></tr>':''}).join('');
  const body='<div class="pv-sec">Laporan PPN</div><table><thead><tr><th>Tanggal</th><th>Keterangan</th><th style="text-align:right;">DPP</th><th style="text-align:center;">Tarif</th><th style="text-align:right;">PPN</th></tr></thead><tbody>'+(rows||'<tr><td colspan="5" style="text-align:center;padding:18px;color:#9ca3af;">Belum ada transaksi kena PPN</td></tr>')+(total?'<tr class="tot"><td colspan="4">Total PPN</td><td style="text-align:right;">'+rp(total)+'</td></tr>':'')+'</tbody></table>';
  return pvWrap(t,c1,c2,c3,nama,periode,body,'—');
}

function pvRenderPage(idx){
  if(!_pvPages.length)return;
  _pvCurPage=Math.max(0,Math.min(idx,_pvPages.length-1));
  const c=document.getElementById('pv-page-render');if(!c)return;
  const old=c.querySelector('iframe');if(old)old.remove();
  const ifr=document.createElement('iframe');
  ifr.style.cssText='width:794px;min-height:1123px;border:none;display:block;';
  ifr.sandbox='allow-same-origin';
  c.appendChild(ifr);
  const doc=ifr.contentDocument||ifr.contentWindow.document;
  doc.open();doc.write(_pvPages[_pvCurPage]);doc.close();
  setTimeout(()=>{
    const h=doc.body?.scrollHeight||1123;
    ifr.style.height=Math.max(h,1123)+'px';
    c.style.minHeight=ifr.style.height;
    // Init fit zoom setelah iframe rendered — canvas pasti sudah punya ukuran benar
    if(idx===0) pvInitZoom();
  },120);
  pvUpdateNav();
}

function pvBuildThumbs(){
  const list=document.getElementById('pv-thumb-list');if(!list)return;
  list.innerHTML=_pvPages.map((html,i)=>'<div class="pv-thumb-label">Hal. '+(i+1)+'</div><div class="pv-thumb '+(i===_pvCurPage?'active':'')+'" onclick="pvGoTo('+i+')" id="pv-th-'+i+'"><iframe style="width:794px;height:1123px;border:none;pointer-events:none;transform:scale('+(74/794).toFixed(4)+');transform-origin:top left;display:block;" sandbox="allow-same-origin" srcdoc="'+html.replace(/"/g,'&quot;')+'"></iframe></div>').join('');
}

function pvGoTo(i){pvRenderPage(i);document.querySelectorAll('.pv-thumb').forEach((el,j)=>el.classList.toggle('active',j===i));}

// ── Zoom controls untuk canvas preview ──
let _pvZoom = 1.0;
let _pvFitZoom = 1.0; // zoom ngepas awal berdasarkan lebar layar

// pvCalcFitZoom: hanya untuk mobile
// Desktop tidak disentuh — zoom bebas, default 100%
function pvCalcFitZoom() {
  const wrap = document.getElementById('pv-canvas-wrap');
  // Gunakan clientWidth jika sudah ada ukurannya, fallback ke window.innerWidth
  // (clientWidth bisa 0 saat modal baru dibuka sebelum browser melayout)
  const wrapW = (wrap && wrap.clientWidth > 10) ? wrap.clientWidth : window.innerWidth;
  const available = wrapW - 16; // 8px padding kiri-kanan
  if (available <= 0) return 1.0;
  return Math.min(1.0, Math.max(0.2, available / 794));
}

// pvInitZoom: mobile fit zoom, desktop panggil pvApplyZoom supaya tombol langsung muncul
function pvInitZoom() {
  if (window.innerWidth >= 900) {
    // Desktop: zoom tetap 1.0, tapi pvApplyZoom harus dipanggil
    // supaya tombol zoom out & reset langsung tampil dari awal
    _pvFitZoom = 1.0;
    _pvZoom = 1.0;
    pvApplyZoom();
    return;
  }
  // Mobile: hitung fit zoom segera (bisa pakai window.innerWidth)
  const fit = pvCalcFitZoom();
  _pvFitZoom = fit;
  _pvZoom = fit;
  pvApplyZoom();
  // Recalculate setelah browser selesai layout (clientWidth akurat)
  // Diperlukan karena modal baru dibuka dan clientWidth mungkin belum final
  setTimeout(() => {
    const fit2 = pvCalcFitZoom();
    if (Math.abs(fit2 - _pvFitZoom) > 0.01) {
      _pvFitZoom = fit2;
      if (_pvZoom >= fit - 0.01) {
        // Kalau masih di posisi fit (belum di-zoom user), ikuti fit baru
        _pvZoom = fit2;
      }
      pvApplyZoom();
    }
  }, 200);
}

function pvZoom(delta) {
  const isMobile = window.innerWidth < 900;
  const minZoom = isMobile ? _pvFitZoom : 0.25; // desktop bisa zoom out bebas, mobile min fit
  _pvZoom = Math.min(3.0, Math.max(minZoom, _pvZoom + delta));
  pvApplyZoom();
}

// Reset: desktop kembali ke 100%, mobile kembali ke fit
function pvZoomReset() {
  _pvZoom = window.innerWidth >= 900 ? 1.0 : _pvFitZoom;
  pvApplyZoom();
}

function pvApplyZoom() {
  const el = document.getElementById('pv-page-render');
  const wrap = document.getElementById('pv-canvas-wrap');
  const label = document.getElementById('pv-zoom-label');
  const zoomOutBtn = document.getElementById('pv-zoom-out-btn');
  const resetBtn = document.getElementById('pv-zoom-reset-btn');
  const isMobile = window.innerWidth < 900;

  if (el) {
    if (isMobile) {
      // Mobile: pakai transform:scale dengan transform-origin top left
      // lalu set tinggi wrapper secara eksplisit agar tidak ada overflow/clipping
      // CSS zoom tidak reliable di semua browser dan tidak mengubah clientWidth
      el.style.zoom = '';
      el.style.transform = 'scale(' + _pvZoom + ')';
      el.style.transformOrigin = 'top left';
      el.style.width = '794px';
      el.style.minWidth = '794px';

      // Hitung ukuran visual setelah scale agar wrapper tahu tinggi/lebar konten
      const scaledW = Math.ceil(794 * _pvZoom);
      const scaledH = Math.ceil(1123 * _pvZoom);
      // Beri margin bottom sebesar selisih (karena transform tidak mempengaruhi flow)
      el.style.marginBottom = (scaledH - 1123) + 'px';

      const isZoomedIn = _pvZoom > _pvFitZoom + 0.01;
      if (wrap) {
        wrap.style.overflowY = 'auto';
        wrap.style.overflowX = isZoomedIn ? 'auto' : 'hidden';
        wrap.style.alignItems = 'flex-start';
        // Tengahkan halaman secara horizontal saat fit (scaledW <= wrap.clientWidth)
        if (!isZoomedIn) {
          // Padding kiri agar page terlihat di tengah
          const wrapW = wrap.clientWidth || window.innerWidth;
          const leftPad = Math.max(0, Math.floor((wrapW - scaledW) / 2));
          wrap.style.paddingLeft = leftPad + 'px';
          wrap.style.justifyContent = 'flex-start';
        } else {
          wrap.style.paddingLeft = '10px';
          wrap.style.justifyContent = 'flex-start';
        }
      }
    } else {
      // Desktop: transform:scale seperti biasa
      el.style.zoom = '';
      el.style.transform = 'scale(' + _pvZoom + ')';
      el.style.transformOrigin = 'top center';
      el.style.marginBottom = _pvZoom > 1.0
        ? Math.ceil((_pvZoom - 1) * 1123) + 'px'
        : '0px';
      el.style.width = '';
      el.style.minWidth = '';
      if (wrap) {
        wrap.style.overflowY = 'auto';
        wrap.style.overflowX = 'hidden';
        wrap.style.alignItems = 'flex-start';
        wrap.style.justifyContent = 'center';
        wrap.style.paddingLeft = '';
      }
    }
  }

  // Label
  const pct = Math.round(_pvZoom * 100);
  if (label) label.textContent = pct + '%';

  // Tombol zoom out & reset
  const showZoomOut = isMobile ? (_pvZoom > _pvFitZoom + 0.01) : true;
  if (zoomOutBtn) zoomOutBtn.style.display = showZoomOut ? 'flex' : 'none';
  if (resetBtn) resetBtn.style.display = showZoomOut ? 'flex' : 'none';
}
function pvNav(dir){pvGoTo(_pvCurPage+dir);}

// Re-hitung fit zoom saat window di-resize (orientasi berubah, dll)
if (typeof window !== 'undefined') {
  window.addEventListener('resize', function() {
    if (document.getElementById('modal-pdf-preview')?.classList.contains('open')) {
      _pvFitZoom = pvCalcFitZoom();
      // Kalau zoom saat ini lebih kecil dari fit baru, naikan ke fit
      if (_pvZoom < _pvFitZoom) { _pvZoom = _pvFitZoom; }
      pvApplyZoom();
    }
  });
}
function pvUpdateNav(){
  const total=_pvPages.length;
  const c=document.getElementById('pv-counter'),s=document.getElementById('pv-page-sub');
  const prev=document.getElementById('pv-prev'),next=document.getElementById('pv-next');
  if(c)c.textContent=((_pvCurPage+1)+' / '+total);
  if(s)s.textContent='Hal. '+(_pvCurPage+1)+' dari '+total;
  if(prev)prev.disabled=_pvCurPage<=0;
  if(next)next.disabled=_pvCurPage>=total-1;
}

function pvExportNow(){
  if(!_pvPages || !_pvPages.length){
    showAlert('Tidak ada halaman untuk di-export. Coba buka preview terlebih dahulu.');
    return;
  }

  const info = window._pvExportInfo || {};
  const p = typeof getProfil === 'function' ? getProfil() : {};
  const nama = info.nama || p.nama || 'Laporan';

  // FIX: Kumpulkan SEMUA <style> dari semua halaman.
  // Cover page (template A/B/C) pakai inline styles tanpa class,
  // halaman isi pakai .pv-hdr .pv-body .foot dll via pvStyles().
  // Jadi kita extract style dari halaman KE-2 (index 1) kalau ada,
  // karena halaman pertama adalah cover yang full inline-style.
  const allStyles = new Set();
  _pvPages.forEach(function(pageHtml) {
    var re = /<style>([\s\S]*?)<\/style>/gi;
    var m;
    while((m = re.exec(pageHtml)) !== null) allStyles.add(m[1].trim());
  });
  var templateStyle = allStyles.size > 0
    ? '<style>' + Array.from(allStyles).join('\n') + '</style>'
    : '';

  // Gabung semua halaman — ambil konten <body>
  var combinedBody = _pvPages.map(function(pageHtml, i) {
    var bodyMatch = pageHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    var bodyContent = bodyMatch ? bodyMatch[1] : pageHtml;
    // CATATAN: page-break-after sudah dihandle via CSS .pdf-page di @media print.
    // Jangan tambahkan <div style="page-break-after:always"> lagi karena akan
    // menghasilkan halaman kosong di antara setiap halaman (double page break).
    return '<div class="pdf-page">' + bodyContent + '</div>';
  }).join('\n');

  // FIX: print-color-adjust: exact memastikan semua background (cover biru, header bar, footer)
  // ter-render saat cetak/save as PDF. Tanpa ini, browser strip semua background images & colors.
  var printHtml = '<!DOCTYPE html>\n<html>\n<head>\n'
    + '<meta charset="utf-8">\n'
    + '<title>' + escapeHtml(nama) + '</title>\n'
    + templateStyle + '\n'
    + '<style>\n'
    + '*, *::before, *::after {\n'
    + '  -webkit-print-color-adjust: exact !important;\n'
    + '  print-color-adjust: exact !important;\n'
    + '  color-adjust: exact !important;\n'
    + '  box-sizing: border-box;\n'
    + '}\n'
    + 'html, body { margin: 0; padding: 0; }\n'
    + '.pdf-page {\n'
    + '  width: 794px;\n'
    + '  min-height: 1123px;\n'
    + '  position: relative;\n'
    + '  overflow: hidden;\n'
    + '  box-sizing: border-box;\n'
    + '}\n'
    + '@page { size: A4 portrait; margin: 0; }\n'
    + '@media print {\n'
    + '  html, body { margin: 0; padding: 0; }\n'
    + '  .pdf-page {\n'
    + '    width: 210mm !important;\n'
    + '    min-height: 297mm !important;\n'
    + '    page-break-after: always;\n'
    + '    overflow: hidden;\n'
    + '  }\n'
    + '  .pdf-page:last-child { page-break-after: auto; }\n'
    + '}\n'
    + '</style>\n'
    + '</head>\n<body>\n'
    + combinedBody + '\n'
    + '</body>\n</html>';

  var win = window.open('', '_blank');
  if (!win) {
    showAlert('Popup diblokir browser. Izinkan popup untuk site ini lalu coba lagi.');
    return;
  }
  win.document.open();
  win.document.write(printHtml);
  win.document.close();
  win.focus();

  // FIX: win.onload tidak selalu terpanggil setelah document.write+close di browser modern.
  // Pakai readyState check + fallback timeout untuk memastikan layout selesai sebelum print.
  var printed = false;
  function doPrint() {
    if(printed) return;
    printed = true;
    setTimeout(function() {
      win.print();
      win.onafterprint = function() { try { win.close(); } catch(e){} };
    }, 700);
  }

  if(win.document.readyState === 'complete') {
    doPrint();
  } else {
    win.onload = doPrint;
    // Fallback kalau onload tidak fire
    setTimeout(doPrint, 2500);
  }

  var tmplName = _pvTmpl === 'A' ? 'Corporate' : _pvTmpl === 'B' ? 'Klasik Minimal' : _pvTmpl === 'C' ? 'Modern Dark' : 'OAS Dark';
  if (typeof auditLog === 'function') {
    auditLog('export', 'system', 'Export PDF (Template ' + tmplName + ') - ' + nama, { ref: 'pdf' });
  }
}

// Color Picker
function pvOpenCP(key,label,dotEl){
  _pvActiveCP={key};
  const hex=pvGetColor(key),popup=document.getElementById('pv-cp-popup');
  if(!popup)return;
  const rect=dotEl.getBoundingClientRect();
  popup.style.display='block';
  popup.style.left=Math.min(rect.right+8,window.innerWidth-260)+'px';
  popup.style.top=Math.min(rect.top-10,window.innerHeight-430)+'px';
  document.getElementById('pv-cp-title').textContent=label;
  const hsv=pvHex2hsv(hex);_pvCpH=hsv.h;_pvCpS=hsv.s;_pvCpV=hsv.v;
  document.getElementById('pv-hue-slider').value=_pvCpH;
  document.getElementById('pv-cp-hex').value=hex;
  pvDrawSL();pvUpdateSwatch();pvUpdateContrast(hex);
  const sw=document.getElementById('pv-swatches');
  if(sw)sw.innerHTML=PV_PRESETS.map(clr=>`<div class="pv-swatch" style="background:${clr};" onclick="pvPickPreset('${clr}')" title="${clr}"></div>`).join('');
  const canvas=document.getElementById('pv-sl-canvas');
  if(canvas){canvas.onmousedown=(e)=>{_pvCpDrag=true;pvOnSL(e);};canvas.onmousemove=(e)=>{if(_pvCpDrag)pvOnSL(e);};document.onmouseup=()=>{_pvCpDrag=false;};}
}
function pvDrawSL(){
  const canvas=document.getElementById('pv-sl-canvas');if(!canvas)return;
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height;
  const sg=ctx.createLinearGradient(0,0,W,0);sg.addColorStop(0,'#fff');sg.addColorStop(1,'hsl('+_pvCpH+',100%,50%)');
  ctx.fillStyle=sg;ctx.fillRect(0,0,W,H);
  const vg=ctx.createLinearGradient(0,0,0,H);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,1)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  const cx=_pvCpS*W,cy=(1-_pvCpV)*H;
  ctx.beginPath();ctx.arc(cx,cy,6,0,Math.PI*2);ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy,5,0,Math.PI*2);ctx.strokeStyle='rgba(0,0,0,0.4)';ctx.lineWidth=1.2;ctx.stroke();
}
function pvOnSL(e){
  const canvas=document.getElementById('pv-sl-canvas');if(!canvas)return;
  const r=canvas.getBoundingClientRect(),sx=canvas.width/r.width,sy=canvas.height/r.height;
  _pvCpS=Math.max(0,Math.min(1,(e.clientX-r.left)*sx/canvas.width));
  _pvCpV=Math.max(0,Math.min(1,1-(e.clientY-r.top)*sy/canvas.height));
  pvDrawSL();const hex=pvHsv2hex(_pvCpH,_pvCpS,_pvCpV);
  document.getElementById('pv-cp-hex').value=hex;pvUpdateSwatch();pvUpdateContrast(hex);
}
function pvOnHue(h){_pvCpH=parseFloat(h);pvDrawSL();const hex=pvHsv2hex(_pvCpH,_pvCpS,_pvCpV);document.getElementById('pv-cp-hex').value=hex;pvUpdateSwatch();pvUpdateContrast(hex);}
function pvOnHexInput(val){val=val.trim();if(!val.startsWith('#'))val='#'+val;if(/^#[0-9a-fA-F]{6}$/.test(val)){const hsv=pvHex2hsv(val);_pvCpH=hsv.h;_pvCpS=hsv.s;_pvCpV=hsv.v;document.getElementById('pv-hue-slider').value=_pvCpH;pvDrawSL();pvUpdateSwatch();pvUpdateContrast(val);}}
function pvUpdateSwatch(){const hex=pvHsv2hex(_pvCpH,_pvCpS,_pvCpV);const sw=document.getElementById('pv-cp-swatch');if(sw)sw.style.background=hex;}
function pvUpdateContrast(hex){
  const ratio=pvContrast(hex,'#ffffff');
  const needle=document.getElementById('pv-cr-needle'),score=document.getElementById('pv-cr-score'),badge=document.getElementById('pv-cr-badge');
  if(!needle)return;
  needle.style.left=Math.min(100,((ratio-1)/19)*100)+'%';
  if(score)score.textContent=ratio.toFixed(1)+':1';
  let lv,cl;if(ratio>=7){lv='AAA';cl='#22c55e';}else if(ratio>=4.5){lv='AA';cl='#22c55e';}else if(ratio>=3){lv='AA Large';cl='#f59e0b';}else{lv='Kurang';cl='#ef4444';}
  if(badge){badge.textContent=lv;badge.style.background=cl+'22';badge.style.color=cl;}
}
function pvPickPreset(hex){const hsv=pvHex2hsv(hex);_pvCpH=hsv.h;_pvCpS=hsv.s;_pvCpV=hsv.v;document.getElementById('pv-hue-slider').value=_pvCpH;document.getElementById('pv-cp-hex').value=hex;pvDrawSL();pvUpdateSwatch();pvUpdateContrast(hex);}
function pvConfirmCP(){
  if(!_pvActiveCP)return;
  const hex=document.getElementById('pv-cp-hex').value;
  if(!/^#[0-9a-fA-F]{6}$/.test(hex)){showAlert('Format warna tidak valid. Gunakan #rrggbb');return;}
  _pvColors[_pvTmpl][_pvActiveCP.key]=hex;
  _pvRecentColors=_pvRecentColors.filter(c=>c!==hex);_pvRecentColors.unshift(hex);if(_pvRecentColors.length>12)_pvRecentColors.length=12;
  pvRenderPalList();pvRenderRecent();pvCloseCP();
  // Auto-save warna ke tema global (dikonfirmasi saat pvApply/Terapkan)
}
function pvCloseCP(){const p=document.getElementById('pv-cp-popup');if(p)p.style.display='none';_pvActiveCP=null;document.onmouseup=null;}
function pvRenderRecent(){
  const el=document.getElementById('pv-recent');if(!el)return;
  if(!_pvRecentColors.length){el.innerHTML='<span style="font-size:10px;color:var(--muted);">Belum ada</span>';return;}
  el.innerHTML=_pvRecentColors.map(clr=>`<div class="pv-recent-dot" style="background:${clr};" onclick="pvPickRecentColor('${clr}')" title="${clr}"></div>`).join('');
}
function pvPickRecentColor(hex){if(!_pvActiveCP)return;_pvColors[_pvTmpl][_pvActiveCP.key]=hex;pvRenderPalList();pvCloseCP();}
document.addEventListener('click',(e)=>{const p=document.getElementById('pv-cp-popup');if(!p||p.style.display==='none')return;if(!p.contains(e.target)&&!e.target.classList.contains('pv-pal-dot'))pvCloseCP();});

// EXCEL EXPORT
function exportExcel(nama, periode, template='data') {
  if(typeof XLSX === 'undefined') { expStatus('❌ Library XLSX belum dimuat. Coba refresh halaman.', 'var(--red)'); return; }
  if(template === 'formula') {
    exportExcelFormula(nama, periode);
    return;
  }
  exportExcelData(nama, periode);
}

function exportExcelData(nama, periode) {
  const wb = XLSX.utils.book_new();
  const today = new Date().toLocaleDateString('id-ID');

  // Style helpers
  const hdr = (v) => ({ v, t:'s', s:{ font:{bold:true,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'1C2030'}}, alignment:{horizontal:'center'} } });
  const titleCell = (v) => ({ v, t:'s', s:{ font:{bold:true,sz:13}, alignment:{horizontal:'left'} } });
  const subCell = (v) => ({ v, t:'s', s:{ font:{color:{rgb:'64748B'},sz:10} } });
  const numCell = (v) => ({ v: rpNum(v), t:'n', s:{ numFmt:'#,##0', alignment:{horizontal:'right'} } });
  const numFmt = (v) => ({ v, t:'n', s:{ numFmt:'"Rp "#,##0', alignment:{horizontal:'right'}, font:{color:{rgb:'111827'}} } });
  const drCell = (v) => ({ v: rpNum(v)||'', t: v?'n':'s', s:{ numFmt:'"Rp "#,##0', font:{color:{rgb:'16A34A'}}, alignment:{horizontal:'right'} } });
  const krCell = (v) => ({ v: rpNum(v)||'', t: v?'n':'s', s:{ numFmt:'"Rp "#,##0', font:{color:{rgb:'DC2626'}}, alignment:{horizontal:'right'} } });
  const boldNum = (v) => ({ v: rpNum(v), t:'n', s:{ numFmt:'"Rp "#,##0', font:{bold:true}, alignment:{horizontal:'right'}, fill:{fgColor:{rgb:'1C2030'}} } });
  const boldTxt = (v) => ({ v, t:'s', s:{ font:{bold:true} } });
  const grayRow = (v) => ({ v, t:'s', s:{ font:{color:{rgb:'94A3B8'}}, fill:{fgColor:{rgb:'F1F5F9'}} } });

  function addSheet(wb, name, rows, colWidths) {
    const ws = XLSX.utils.aoa_to_sheet(rows);
    colWidths.forEach((w,i) => {
      if(!ws['!cols']) ws['!cols'] = [];
      ws['!cols'][i] = {wch: w};
    });
    XLSX.utils.book_append_sheet(wb, ws, name);
  }

  function headerBlock(nama, periode, judul, today) {
    return [
      [{ v: nama, t:'s', s:{font:{bold:true,sz:14}} }],
      [{ v: judul, t:'s', s:{font:{bold:true,sz:12,color:{rgb:'1D4ED8'}}} }],
      [{ v: 'Periode: ' + periode + '   |   Tanggal cetak: ' + today, t:'s', s:{font:{sz:9,color:{rgb:'94A3B8'}}} }],
      [],
    ];
  }

  // SHEET 1: RINGKASAN (Dashboard)
  if(document.getElementById('exp-dashboard')?.checked) {
    const saldo = computeSaldoAll();
    let totalAset=0, totalLiab=0, totalEk=0, totalPend=0, totalBeban=0;
    akuns.forEach(a => {
      const s = saldo[a.kode]||{debit:0,kredit:0};
      const bersih = a.normal==='D' ? s.debit-s.kredit : s.kredit-s.debit;
      if(a.tipe==='Aset') totalAset += bersih;
      else if(a.tipe==='Liabilitas') totalLiab += bersih;
      else if(a.tipe==='Ekuitas') totalEk += bersih;
      else if(a.tipe==='Pendapatan') totalPend += bersih;
      else if(['Beban','HPP'].includes(a.tipe)) totalBeban += bersih;
    });
    const labaBersih = totalPend - totalBeban;
    const rows = [
      ...headerBlock(nama, periode, 'RINGKASAN KEUANGAN', today),
      [boldTxt('INDIKATOR KEUANGAN UTAMA')],
      [],
      [boldTxt('Uraian'), '', boldTxt('Nilai')],
      [{ v:'Total Aset', t:'s' }, '', boldNum(totalAset)],
      [{ v:'Total Liabilitas', t:'s' }, '', boldNum(totalLiab)],
      [{ v:'Total Ekuitas', t:'s' }, '', boldNum(totalEk)],
      [],
      [{ v:'Total Pendapatan', t:'s' }, '', boldNum(totalPend)],
      [{ v:'Total Beban (incl HPP)', t:'s' }, '', boldNum(totalBeban)],
      [boldTxt('Laba Bersih'), '', boldNum(labaBersih)],
      [],
      [boldTxt('FORMULA RINGKASAN')],
      [{ v:'Laba Bersih', t:'s' }, '=', { v:'Pendapatan - Total Beban', t:'s', s:{font:{color:{rgb:'64748B'}}} }],
      [{ v:'Total Aset (check)', t:'s' }, '=', { v:'Liabilitas + Ekuitas + Laba Bersih', t:'s', s:{font:{color:{rgb:'64748B'}}} }],
      [],
      [{ v:'Jumlah Jurnal Tercatat: ' + jurnalEntries.length, t:'s', s:{font:{color:{rgb:'94A3B8'},sz:10}} }],
    ];
    addSheet(wb, 'Ringkasan KPI', rows, [28,4,20]);
  }

  // SHEET 2: JURNAL UMUM
  if(document.getElementById('exp-jurnal-umum')?.checked) {
    const rows = [
      ...headerBlock(nama, periode, 'JURNAL UMUM', today),
      [hdr('No'), hdr('Tanggal'), hdr('No Jurnal'), hdr('Keterangan'), hdr('Jenis'), hdr('Akun'), hdr('Debit (Rp)'), hdr('Kredit (Rp)')],
    ];
    let no = 1;
    let totalD = 0, totalK = 0;
    jurnalEntries.forEach(j => {
      j.lines.forEach((l, i) => {
        rows.push([
          i===0 ? {v:no++,t:'n'} : {v:'',t:'s'},
          i===0 ? {v:j.tanggal,t:'s'} : {v:'',t:'s'},
          i===0 ? {v:j.no,t:'s',s:{font:{color:{rgb:'64748B'}},alignment:{horizontal:'center'}}} : {v:'',t:'s'},
          i===0 ? {v:j.ket,t:'s'} : {v:'',t:'s'},
          i===0 ? {v:j.jenis,t:'s',s:{alignment:{horizontal:'center'}}} : {v:'',t:'s'},
          {v: getAkunNama(l.akun) + (l.debit?'':' '), t:'s', s:{alignment:{horizontal:'left',indent: l.debit?0:2}}},
          drCell(l.debit),
          krCell(l.kredit),
        ]);
        totalD += l.debit||0; totalK += l.kredit||0;
      });
    });
    rows.push([]);
    rows.push([{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}, boldTxt('TOTAL'), boldNum(totalD), boldNum(totalK)]);
    rows.push([{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}, {v:'Balance: '+(Math.abs(totalD-totalK)<1?'✓ BALANCE':'✗ TIDAK BALANCE'),t:'s',s:{font:{color:{rgb:Math.abs(totalD-totalK)<1?'16A34A':'DC2626'},bold:true}}}]);
    addSheet(wb, 'Jurnal Umum', rows, [5,12,14,36,12,28,18,18]);
  }

  // SHEET 3: JURNAL KAS
  if(document.getElementById('exp-jurnal-kas')?.checked) {
    const rows = [
      ...headerBlock(nama, periode, 'JURNAL KAS', today),
      [hdr('Tanggal'), hdr('No Jurnal'), hdr('Keterangan'), hdr('Penerimaan (Rp)'), hdr('Pengeluaran (Rp)'), hdr('Saldo (Rp)')],
    ];
    let saldo = 0, totalIn=0, totalOut=0;
    jurnalEntries.forEach(j => {
      j.lines.forEach(l => {
        if(l.akun==='1101') {
          const masuk = l.debit||0, keluar = l.kredit||0;
          if(!masuk && !keluar) return;
          saldo += masuk - keluar; totalIn += masuk; totalOut += keluar;
          rows.push([
            {v:j.tanggal,t:'s'}, {v:j.no,t:'s',s:{font:{color:{rgb:'64748B'}}}},
            {v:j.ket,t:'s'}, drCell(masuk), krCell(keluar), numFmt(saldo)
          ]);
        }
      });
    });
    rows.push([]);
    rows.push([boldTxt('TOTAL'), {v:'',t:'s'}, {v:'',t:'s'}, boldNum(totalIn), boldNum(totalOut), boldNum(saldo)]);
    addSheet(wb, 'Jurnal Kas', rows, [12,14,36,20,20,20]);
  }

  // SHEET 4: JURNAL PENJUALAN
  if(document.getElementById('exp-jurnal-jual')?.checked) {
    const rows = [
      ...headerBlock(nama, periode, 'JURNAL PENJUALAN', today),
      [hdr('Tanggal'), hdr('No Invoice'), hdr('Keterangan'), hdr('Metode'), hdr('Kas/Piutang Dr (Rp)'), hdr('Penjualan Kr (Rp)')],
    ];
    let totalDr=0, totalKr=0;
    jurnalEntries.filter(j=>j.jenis==='Penjualan').forEach(j => {
      const kasLine = j.lines.find(l=>['1101','1201'].includes(l.akun));
      const jualLine = j.lines.find(l=>l.akun==='4101');
      if(!jualLine) return;
      const metode = kasLine?.akun==='1101'?'Tunai':'Kredit';
      rows.push([
        {v:j.tanggal,t:'s'}, {v:j.ref||j.no,t:'s',s:{font:{color:{rgb:'64748B'}}}},
        {v:j.ket,t:'s'}, {v:metode,t:'s',s:{alignment:{horizontal:'center'}}},
        drCell(kasLine?.debit||0), krCell(jualLine?.kredit||0)
      ]);
      totalDr += kasLine?.debit||0; totalKr += jualLine?.kredit||0;
    });
    rows.push([]);
    rows.push([boldTxt('TOTAL'), {v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}, boldNum(totalDr), boldNum(totalKr)]);
    addSheet(wb, 'Jurnal Penjualan', rows, [12,14,36,10,22,22]);
  }

  // SHEET 5: JURNAL PEMBELIAN
  if(document.getElementById('exp-jurnal-beli')?.checked) {
    const rows = [
      ...headerBlock(nama, periode, 'JURNAL PEMBELIAN', today),
      [hdr('Tanggal'), hdr('No Faktur'), hdr('Keterangan'), hdr('Metode'), hdr('Akun Debit'), hdr('Nilai Dr (Rp)'), hdr('Kas/Utang Kr (Rp)')],
    ];
    let totalDr=0, totalKr=0;
    jurnalEntries.filter(j=>j.jenis==='Pembelian').forEach(j => {
      const krLine = j.lines.find(l=>['1101','2101'].includes(l.akun)&&l.kredit);
      const drLine = j.lines.find(l=>l.debit&&!['1101','2101'].includes(l.akun));
      if(!drLine) return;
      const metode = krLine?.akun==='1101'?'Tunai':'Kredit';
      rows.push([
        {v:j.tanggal,t:'s'}, {v:j.ref||j.no,t:'s',s:{font:{color:{rgb:'64748B'}}}},
        {v:j.ket,t:'s'}, {v:metode,t:'s',s:{alignment:{horizontal:'center'}}},
        {v:getAkunNama(drLine.akun),t:'s'}, drCell(drLine.debit), krCell(krLine?.kredit||0)
      ]);
      totalDr += drLine.debit; totalKr += krLine?.kredit||0;
    });
    rows.push([]);
    rows.push([boldTxt('TOTAL'),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}, boldNum(totalDr), boldNum(totalKr)]);
    addSheet(wb, 'Jurnal Pembelian', rows, [12,14,36,10,24,20,20]);
  }

  // SHEET 6: BUKU BESAR
  if(document.getElementById('exp-buku-besar')?.checked) {
    const saldoMap = computeSaldoAll();
    const rows = [...headerBlock(nama, periode, 'BUKU BESAR', today)];
    
    akuns.forEach(akun => {
      const entries = [];
      let saldo = 0;
      jurnalEntries.forEach(j => {
        j.lines.forEach(l => {
          if(l.akun !== akun.kode) return;
          const n = akun.normal==='D' ? (l.debit||0)-(l.kredit||0) : (l.kredit||0)-(l.debit||0);
          saldo += n;
          entries.push([
            {v:j.tanggal,t:'s'}, {v:j.no,t:'s',s:{font:{color:{rgb:'64748B'}}}},
            {v:j.ket,t:'s'}, drCell(l.debit), krCell(l.kredit), numFmt(saldo)
          ]);
        });
      });
      if(!entries.length) return;
      rows.push([{v:`AKUN: ${akun.kode} — ${akun.nama}  (${akun.tipe} | Normal: ${akun.normal==='D'?'Debit':'Kredit'})`, t:'s', s:{font:{bold:true,color:{rgb:'1D4ED8'}}}}]);
      rows.push([hdr('Tanggal'), hdr('No Jurnal'), hdr('Keterangan'), hdr('Debit (Rp)'), hdr('Kredit (Rp)'), hdr('Saldo (Rp)')]);
      entries.forEach(r => rows.push(r));
      const finalSaldo = (saldoMap[akun.kode]||{debit:0,kredit:0});
      const bersih = akun.normal==='D' ? finalSaldo.debit-finalSaldo.kredit : finalSaldo.kredit-finalSaldo.debit;
      rows.push([{v:'',t:'s'},{v:'',t:'s'}, boldTxt('Saldo Akhir'), {v:'',t:'s'},{v:'',t:'s'}, boldNum(bersih)]);
      rows.push([]);
    });
    addSheet(wb, '📗 Buku Besar', rows, [12,14,36,18,18,20]);
  }

  // SHEET 7: NERACA SALDO
  if(document.getElementById('exp-neraca-saldo')?.checked) {
    const rows = [
      ...headerBlock(nama, periode, 'NERACA SALDO', today),
      [hdr('Kode'), hdr('Nama Akun'), hdr('Tipe'), hdr('Debit (Rp)'), hdr('Kredit (Rp)')],
    ];
    const saldoMap = computeSaldoAll();
    let totalD=0, totalK=0;
    akuns.forEach(a => {
      const s = saldoMap[a.kode]||{debit:0,kredit:0};
      const d = a.normal==='D' && s.debit>s.kredit ? s.debit-s.kredit : (a.normal==='K' && s.kredit<s.debit ? s.debit-s.kredit : 0);
      const k = a.normal==='K' && s.kredit>s.debit ? s.kredit-s.debit : (a.normal==='D' && s.kredit>s.debit ? s.kredit-s.debit : 0);
      if(!d && !k) return;
      rows.push([{v:a.kode,t:'s',s:{font:{color:{rgb:'64748B'}}}}, {v:a.nama,t:'s'}, {v:a.tipe,t:'s'}, drCell(d), krCell(k)]);
      totalD+=d; totalK+=k;
    });
    rows.push([]);
    rows.push([{v:'',t:'s'}, boldTxt('TOTAL'), {v:'',t:'s'}, boldNum(totalD), boldNum(totalK)]);
    rows.push([{v:'',t:'s'}, {v:Math.abs(totalD-totalK)<1?'✓ BALANCE':'✗ TIDAK BALANCE (Selisih: '+rpNum(Math.abs(totalD-totalK))+')',t:'s', s:{font:{bold:true,color:{rgb:Math.abs(totalD-totalK)<1?'16A34A':'DC2626'}}}}]);
    addSheet(wb, 'Neraca Saldo', rows, [8,28,14,20,20]);
  }

  // SHEET 8: LABA RUGI
  if(document.getElementById('exp-laba-rugi')?.checked) {
    const rows = [...headerBlock(nama, periode, 'LAPORAN LABA RUGI', today)];
    let totalPend=0, totalHPP=0, totalBeban=0;
    const pendRows=[], hppRows=[], bebanRows=[];
    akuns.forEach(a => {
      const s = computeSaldoBersih(a.kode);
      if(!s) return;
      if(a.tipe==='Pendapatan') { totalPend+=s; pendRows.push([a.nama, s]); }
      if(a.tipe==='HPP') { totalHPP+=s; hppRows.push([a.nama, s]); }
      if(a.tipe==='Beban') { totalBeban+=s; bebanRows.push([a.nama, s]); }
    });
    const labaKotor = totalPend - totalHPP;
    const labaBersih = labaKotor - totalBeban;

    rows.push([boldTxt('I. PENDAPATAN')]);
    pendRows.forEach(([n,v]) => rows.push([{v:'   '+n,t:'s'}, drCell(v)]));
    rows.push([boldTxt('   Total Pendapatan'), boldNum(totalPend)]);
    rows.push([]);
    rows.push([boldTxt('II. HARGA POKOK PENJUALAN (HPP)')]);
    hppRows.forEach(([n,v]) => rows.push([{v:'   '+n,t:'s'}, krCell(v)]));
    rows.push([boldTxt('   Total HPP'), boldNum(totalHPP)]);
    rows.push([]);
    rows.push([{v:'LABA KOTOR', t:'s', s:{font:{bold:true,color:{rgb:'1D4ED8'}}}}, boldNum(labaKotor)]);
    rows.push([]);
    rows.push([boldTxt('III. BEBAN OPERASIONAL')]);
    bebanRows.forEach(([n,v]) => rows.push([{v:'   '+n,t:'s'}, krCell(v)]));
    rows.push([boldTxt('   Total Beban'), boldNum(totalBeban)]);
    rows.push([]);
    rows.push([{v:'LABA BERSIH', t:'s', s:{font:{bold:true,sz:13,color:{rgb:labaBersih>=0?'16A34A':'DC2626'}}}}, {v:rpNum(labaBersih), t:'n', s:{numFmt:'"Rp "#,##0', font:{bold:true,sz:13,color:{rgb:labaBersih>=0?'16A34A':'DC2626'}}, alignment:{horizontal:'right'}}}]);
    addSheet(wb, 'Laba Rugi', rows, [36,22]);
  }

  // SHEET 9: NERACA
  if(document.getElementById('exp-neraca')?.checked) {
    const rows = [...headerBlock(nama, periode, 'NERACA (BALANCE SHEET)', today)];
    let totalAset=0, totalLiab=0, totalEk=0;
    const asetRows=[], liabRows=[], ekRows=[];
    const labaBersih = (() => {
      let p=0,b=0;
      akuns.forEach(a=>{const s=computeSaldoBersih(a.kode);if(a.tipe==='Pendapatan')p+=s;if(['Beban','HPP'].includes(a.tipe))b+=s;});
      return p-b;
    })();
    akuns.forEach(a => {
      const s = computeSaldoBersih(a.kode);
      if(a.tipe==='Aset') { totalAset+=s; asetRows.push([a.nama, s]); }
      if(a.tipe==='Liabilitas') { totalLiab+=s; liabRows.push([a.nama, s]); }
      if(a.tipe==='Ekuitas') { totalEk+=s; ekRows.push([a.nama, s]); }
    });
    const totalLiabEk = totalLiab + totalEk + labaBersih;

    rows.push([boldTxt('ASET'), '', boldTxt('LIABILITAS & EKUITAS'), '']);
    rows.push([boldTxt('Aset Lancar & Tetap'), '', boldTxt('Liabilitas'), '']);
    const maxLen = Math.max(asetRows.length, liabRows.length + ekRows.length + 3);
    const leftRows = asetRows.map(([n,v])=>[{v:'  '+n,t:'s'},numFmt(v)]);
    leftRows.push([boldTxt('Total Aset'), boldNum(totalAset)]);
    const rightRows = liabRows.map(([n,v])=>[{v:'  '+n,t:'s'},numFmt(v)]);
    rightRows.push([boldTxt('Total Liabilitas'), boldNum(totalLiab)]);
    rightRows.push([{v:'',t:'s'}]);
    rightRows.push([boldTxt('Ekuitas'), {v:'',t:'s'}]);
    ekRows.forEach(([n,v]) => rightRows.push([{v:'  '+n,t:'s'},numFmt(v)]));
    rightRows.push([{v:'  Laba Periode Berjalan',t:'s'}, numFmt(labaBersih)]);
    rightRows.push([boldTxt('Total Ekuitas'), boldNum(totalEk+labaBersih)]);
    rightRows.push([boldTxt('Total Liab + Ekuitas'), boldNum(totalLiabEk)]);
    for(let i=0;i<Math.max(leftRows.length,rightRows.length);i++) {
      const l = leftRows[i] || [{v:'',t:'s'},{v:'',t:'s'}];
      const r = rightRows[i] || [{v:'',t:'s'},{v:'',t:'s'}];
      rows.push([l[0], l[1], r[0], r[1]]);
    }
    rows.push([]);
    const balanced = Math.abs(totalAset-totalLiabEk)<1;
    rows.push([{v:(balanced?'✓ NERACA BALANCE':'✗ TIDAK BALANCE — Selisih: Rp '+rpNum(Math.abs(totalAset-totalLiabEk))), t:'s', s:{font:{bold:true,color:{rgb:balanced?'16A34A':'DC2626'}}}}]);
    addSheet(wb, 'Neraca', rows, [30,22,30,22]);
  }

  // SHEET 10: CHART OF ACCOUNTS
  if(document.getElementById('exp-coa')?.checked) {
    const rows = [
      ...headerBlock(nama, periode, 'CHART OF ACCOUNTS', today),
      [hdr('Kode'), hdr('Nama Akun'), hdr('Tipe'), hdr('Kategori'), hdr('Saldo Normal'), hdr('Saldo Saat Ini (Rp)')],
    ];
    const saldoMap = computeSaldoAll();
    akuns.forEach(a => {
      const s = saldoMap[a.kode]||{debit:0,kredit:0};
      const bersih = a.normal==='D' ? s.debit-s.kredit : s.kredit-s.debit;
      rows.push([
        {v:a.kode,t:'s',s:{font:{color:{rgb:'64748B'},bold:true}}},
        {v:a.nama,t:'s'}, {v:a.tipe,t:'s'}, {v:a.kat||'-',t:'s'},
        {v:a.normal==='D'?'Debit':'Kredit', t:'s', s:{alignment:{horizontal:'center'}}},
        numFmt(bersih)
      ]);
    });
    addSheet(wb, '🗂️ Chart of Accounts', rows, [8,28,14,12,14,20]);
  }

  // SHEET: INVOICE & PIUTANG
  if(document.getElementById('exp-invoice')?.checked && typeof invoiceList !== 'undefined' && invoiceList.length) {
    const rows = [
      ...headerBlock(nama, periode, 'INVOICE & PIUTANG', today),
      [hdr('No Invoice'), hdr('Pelanggan'), hdr('Tanggal'), hdr('Jatuh Tempo'), hdr('Total (Rp)'), hdr('Sisa (Rp)'), hdr('Status')],
    ];
    invoiceList.forEach(inv => {
      rows.push([
        {v:inv.noInvoice,t:'s',s:{font:{bold:true}}},
        {v:inv.pelanggan,t:'s'}, {v:inv.tanggal,t:'s'}, {v:inv.jatuhTempo,t:'s'},
        numFmt(inv.total), numFmt(inv.sisaTagihan),
        {v:inv.status,t:'s',s:{font:{color:{rgb:inv.status==='lunas'?'16A34A':'DC2626'}}}}
      ]);
    });
    const totalTagihan = invoiceList.reduce((s,i)=>s+i.total,0);
    const totalSisa = invoiceList.reduce((s,i)=>s+i.sisaTagihan,0);
    rows.push([], [{v:'TOTAL',t:'s',s:{font:{bold:true}}}, '','','', boldNum(totalTagihan), boldNum(totalSisa),'']);
    addSheet(wb, 'Invoice Piutang', rows, [16,24,12,12,18,18,12]);
  }

  // SHEET: JURNAL BERULANG
  if(document.getElementById('exp-jurnal-berulang')?.checked && typeof jurnalBerulangList !== 'undefined' && jurnalBerulangList.length) {
    const rows = [
      ...headerBlock(nama, periode, 'JURNAL BERULANG', today),
      [hdr('Nama Template'), hdr('Frekuensi'), hdr('Akun Debit'), hdr('Akun Kredit'), hdr('Nominal (Rp)'), hdr('Berikutnya'), hdr('Status')],
    ];
    jurnalBerulangList.forEach(j => {
      const aD=akuns.find(a=>a.kode===j.akunDebit); const aK=akuns.find(a=>a.kode===j.akunKredit);
      rows.push([
        {v:j.nama,t:'s',s:{font:{bold:true}}},
        {v:j.frekuensi,t:'s'}, {v:(aD?aD.nama:j.akunDebit),t:'s'}, {v:(aK?aK.nama:j.akunKredit),t:'s'},
        numFmt(j.nominal), {v:j.berikutnya,t:'s'}, {v:j.aktif?'Aktif':'Nonaktif',t:'s'}
      ]);
    });
    addSheet(wb, 'Jurnal Berulang', rows, [26,14,22,22,18,14,10]);
  }

  // SHEET: ANGGARAN VS AKTUAL
  if(document.getElementById('exp-anggaran')?.checked && typeof anggaranList !== 'undefined' && anggaranList.length) {
    const rows = [
      ...headerBlock(nama, periode, 'ANGGARAN VS AKTUAL', today),
      [hdr('Akun'), hdr('Periode'), hdr('Anggaran (Rp)'), hdr('Aktual (Rp)'), hdr('Variance (Rp)'), hdr('% Terpakai'), hdr('Status')],
    ];
    anggaranList.forEach(a => {
      const akunNama = akuns.find(x=>x.kode===a.akunKode)?.nama||a.akunKode;
      const aktual = jurnalEntries.filter(j=>j.tanggal.startsWith(a.periode)).reduce((s,j)=>
        s+j.lines.filter(l=>l.akun===a.akunKode).reduce((ss,l)=>ss+Math.max(l.debit,l.kredit),0),0);
      const variance = a.nominal - aktual;
      const pct = a.nominal ? (aktual/a.nominal*100) : 0;
      rows.push([
        {v:akunNama,t:'s'}, {v:a.periode,t:'s'}, numFmt(a.nominal), numFmt(aktual),
        {v:variance,t:'n',s:{numFmt:'"Rp "#,##0',font:{bold:true,color:{rgb:variance>=0?'16A34A':'DC2626'}}}},
        {v:parseFloat(pct.toFixed(1)),t:'n',s:{numFmt:'0.0"%"'}},
        {v:aktual>a.nominal?'<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Melebihi':'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> On Track',t:'s'}
      ]);
    });
    addSheet(wb, '🎯 Anggaran vs Aktual', rows, [28,10,18,18,18,12,14]);
  }

  // SHEET: LAPORAN PAJAK
  if(document.getElementById('exp-pajak')?.checked) {
    const penjualan = jurnalEntries.filter(j=>j.jenis==='Penjualan'||j.keterangan?.toLowerCase().includes('penjualan'));
    const pembelian = jurnalEntries.filter(j=>j.jenis==='Pembelian'||j.keterangan?.toLowerCase().includes('pembelian'));
    const totalPenj = penjualan.reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const ac=akuns.find(x=>x.kode===l.akun);return ss+(ac&&ac.tipe==='Pendapatan'?l.kredit:0)},0),0);
    const totalBeli = pembelian.reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const ac=akuns.find(x=>x.kode===l.akun);return ss+(ac&&(ac.tipe==='HPP'||ac.tipe==='Beban')?l.debit:0)},0),0);
    const ppnKeluar = totalPenj*0.12; const ppnMasuk = totalBeli*0.12;
    const rows = [
      ...headerBlock(nama, periode, 'LAPORAN PAJAK', today),
      [boldTxt('REKAPITULASI PAJAK')], [],
      [boldTxt('Uraian'), '', boldTxt('Nilai (Rp)')],
      [{v:'Dasar Pengenaan PPN Keluaran (Penjualan)',t:'s'},'',numFmt(totalPenj)],
      [{v:'PPN Keluaran (12%)',t:'s',s:{font:{color:{rgb:'DC2626'}}}},'',boldNum(ppnKeluar)],
      [{v:'Dasar Pengenaan PPN Masukan (Pembelian)',t:'s'},'',numFmt(totalBeli)],
      [{v:'PPN Masukan (12%)',t:'s',s:{font:{color:{rgb:'16A34A'}}}},'',boldNum(ppnMasuk)],
      [], [{v:'PPN Kurang/(Lebih) Bayar',t:'s',s:{font:{bold:true}}},'',boldNum(ppnKeluar-ppnMasuk)],
      [], [boldTxt('RIWAYAT TRANSAKSI KENA PAJAK')], [],
      [hdr('Tanggal'), hdr('Keterangan'), hdr('DPP (Rp)'), hdr('Jenis Pajak'), hdr('Tarif'), hdr('Nilai Pajak (Rp)')],
    ];
    [...penjualan.map(j=>({j,jenis:'PPN Keluaran',tarif:0.12})),...pembelian.map(j=>({j,jenis:'PPN Masukan',tarif:0.12}))].forEach(({j,jenis,tarif})=>{
      const dpp=j.lines.reduce((s,l)=>s+Math.max(l.debit,l.kredit),0);
      rows.push([{v:j.tanggal,t:'s'},{v:j.keterangan||'—',t:'s'},numFmt(dpp),{v:jenis,t:'s'},{v:(tarif*100)+'%',t:'s'},numFmt(dpp*tarif)]);
    });
    addSheet(wb, 'Laporan Pajak', rows, [12,30,18,16,8,18]);
  }

  // SHEET: ANALITIK BISNIS
  if(document.getElementById('exp-analitik')?.checked) {
    const months = []; const now2 = new Date();
    for(let i=11;i>=0;i--){ const d=new Date(now2.getFullYear(),now2.getMonth()-i,1); months.push({y:d.getFullYear(),m:d.getMonth(),label:d.toLocaleDateString('id-ID',{month:'short',year:'numeric'})}); }
    const rows = [
      ...headerBlock(nama, periode, 'ANALITIK BISNIS 12 BULAN', today),
      [hdr('Bulan'), hdr('Pendapatan (Rp)'), hdr('Beban (Rp)'), hdr('Laba Bersih (Rp)'), hdr('Margin (%)'), hdr('Pertumbuhan')],
    ];
    let prevPend = 0;
    months.forEach(mo => {
      const pfx = `${mo.y}-${String(mo.m+1).padStart(2,'0')}`;
      const pend = jurnalEntries.filter(j=>j.tanggal.startsWith(pfx)).reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const ac=akuns.find(x=>x.kode===l.akun);return ss+(ac&&ac.tipe==='Pendapatan'?l.kredit:0)},0),0);
      const beban = jurnalEntries.filter(j=>j.tanggal.startsWith(pfx)).reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const ac=akuns.find(x=>x.kode===l.akun);return ss+(ac&&(ac.tipe==='Beban'||ac.tipe==='HPP')?l.debit:0)},0),0);
      const laba = pend - beban; const margin = pend ? laba/pend*100 : 0;
      const growth = prevPend ? ((pend-prevPend)/prevPend*100) : 0;
      rows.push([
        {v:mo.label,t:'s'}, numFmt(pend), numFmt(beban), {v:laba,t:'n',s:{numFmt:'"Rp "#,##0',font:{color:{rgb:laba>=0?'16A34A':'DC2626'}}}},
        {v:parseFloat(margin.toFixed(1)),t:'n',s:{numFmt:'0.0"%"'}},
        {v:prevPend?parseFloat(growth.toFixed(1))+'%':'—',t:'s',s:{font:{color:{rgb:growth>=0?'16A34A':'DC2626'}}}}
      ]);
      prevPend = pend;
    });
    addSheet(wb, 'Analitik Bisnis', rows, [16,20,18,20,12,14]);
  }

  // SHEET: FORMULA REFERENCE
  const formulaRows = [
    ...headerBlock(nama, periode, 'REFERENSI FORMULA AKUNTANSI', today),
    [boldTxt('FORMULA DASAR'), '', boldTxt('KETERANGAN')],
    [{v:'Laba Kotor',t:'s'}, {v:'=Pendapatan − HPP',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'Selisih penjualan & harga pokok',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'Laba Bersih',t:'s'}, {v:'=Laba Kotor − Total Beban',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'Keuntungan setelah semua biaya operasional',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'Neraca',t:'s'}, {v:'=Aset = Liabilitas + Ekuitas',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'Persamaan dasar akuntansi (harus balance)',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [],
    [boldTxt('RASIO LIKUIDITAS'), '', ''],
    [{v:'Current Ratio',t:'s'}, {v:'=Aset Lancar / Utang Lancar',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'≥ 2x = baik',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'Quick Ratio',t:'s'}, {v:'=(Aset Lancar − Persediaan) / Utang Lancar',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'≥ 1x = baik',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'Cash Ratio',t:'s'}, {v:'=Kas / Utang Lancar',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'≥ 0.5x = baik',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [],
    [boldTxt('RASIO PROFITABILITAS'), '', ''],
    [{v:'Gross Profit Margin',t:'s'}, {v:'=Laba Kotor / Penjualan × 100%',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'≥ 30% = baik',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'Net Profit Margin',t:'s'}, {v:'=Laba Bersih / Penjualan × 100%',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'≥ 10% = baik',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'ROA',t:'s'}, {v:'=Laba Bersih / Total Aset × 100%',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'≥ 5% = baik',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'ROE',t:'s'}, {v:'=Laba Bersih / Ekuitas × 100%',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'≥ 15% = baik',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [],
    [boldTxt('RASIO SOLVABILITAS'), '', ''],
    [{v:'DER',t:'s'}, {v:'=Total Liabilitas / Ekuitas',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'≤ 1x = baik',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'DAR',t:'s'}, {v:'=Total Liabilitas / Total Aset',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'< 50% = baik',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [],
    [boldTxt('PENYUSUTAN'), '', ''],
    [{v:'Garis Lurus',t:'s'}, {v:'=(Harga − Nilai Sisa) / Umur',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'Beban tetap per tahun',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'Saldo Menurun',t:'s'}, {v:'=Nilai Buku × (2 / Umur)',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'Beban besar di awal',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [],
    [boldTxt('PAJAK'), '', ''],
    [{v:'PPN',t:'s'}, {v:'=DPP × Tarif (12%)',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'Pajak Pertambahan Nilai',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'PPh 21 Tarif',t:'s'}, {v:'5% / 15% / 25% / 30% / 35%',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'Progresif berdasarkan PKP',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'PPh Badan',t:'s'}, {v:'=PKP × 22%',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'Tarif umum 2024',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
    [{v:'BEP Unit',t:'s'}, {v:'=Biaya Tetap / (Harga − Biaya Variabel)',t:'s',s:{font:{color:{rgb:'1D4ED8'}}}}, {v:'Titik impas dalam unit',t:'s',s:{font:{color:{rgb:'64748B'}}}}],
  ];
  const formulaWs = XLSX.utils.aoa_to_sheet(formulaRows);
  formulaWs['!cols'] = [{wch:26},{wch:44},{wch:36}];
  XLSX.utils.book_append_sheet(wb, formulaWs, 'Referensi Formula');

  // WRITE FILE
  const fn = `BHP_${nama.replace(/\s+/g,'_')}_${periode.replace(/\s+/g,'_')}.xlsx`;
  XLSX.writeFile(wb, fn);
  expStatus(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> File Excel berhasil diunduh: <b>${fn}</b><br><span style="font-size:11px">${wb.SheetNames.length} sheet tersedia</span>`);
}

// EXCEL TEMPLATE HITUNG OTOMATIS
// Template ini menggunakan formula Excel aktif yang saling terhubung antar sheet.
// Sheet INPUT adalah sumber data; semua laporan otomatis update jika diubah.
function exportExcelFormula(nama, periode) {
  const wb = XLSX.utils.book_new();
  const today = new Date().toLocaleDateString('id-ID');

  // Style helpers
  const hdr = (v, rgb='16406A') => ({ v, t:'s', s:{
    font:{bold:true, color:{rgb:'FFFFFF'}, sz:11},
    fill:{fgColor:{rgb}},
    alignment:{horizontal:'center', vertical:'center', wrapText:true},
    border:{
      top:{style:'medium',color:{rgb:'AAAAAA'}}, bottom:{style:'medium',color:{rgb:'AAAAAA'}},
      left:{style:'thin',color:{rgb:'AAAAAA'}}, right:{style:'thin',color:{rgb:'AAAAAA'}}
    }
  }});

  const boldTxt = (v, rgb) => ({ v, t:'s', s:{
    font:{bold:true, color: rgb?{rgb}:undefined},
    border:{bottom:{style:'thin',color:{rgb:'DDDDDD'}}}
  }});

  const numFmt = (v) => ({ v: Math.round(v)||0, t:'n', s:{
    numFmt:'"Rp "#,##0',
    alignment:{horizontal:'right'},
    border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}, left:{style:'thin',color:{rgb:'EEEEEE'}}, right:{style:'thin',color:{rgb:'EEEEEE'}}}
  }});

  const numFmtGreen = (v) => ({ v: Math.round(v)||0, t:'n', s:{
    numFmt:'"Rp "#,##0', alignment:{horizontal:'right'},
    font:{color:{rgb:'16A34A'}},
    border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}
  }});

  const numFmtRed = (v) => ({ v: Math.round(v)||0, t:'n', s:{
    numFmt:'"Rp "#,##0', alignment:{horizontal:'right'},
    font:{color:{rgb:'DC2626'}},
    border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}
  }});

  const formulaCell = (f, opts={}) => ({ f, t:'n', s:{
    numFmt:'"Rp "#,##0', alignment:{horizontal:'right'},
    ...(opts.bold ? {font:{bold:true}} : {}),
    ...(opts.fill ? {fill:{fgColor:{rgb:opts.fill}}} : {}),
    border:{top:{style:'thin',color:{rgb:'CCCCCC'}}, bottom:{style:'thin',color:{rgb:'CCCCCC'}}, left:{style:'thin',color:{rgb:'CCCCCC'}}, right:{style:'thin',color:{rgb:'CCCCCC'}}}
  }});

  const pctFormula = (f, opts={}) => ({ f, t:'n', s:{
    numFmt:'0.00"%"', alignment:{horizontal:'right'},
    ...(opts.bold ? {font:{bold:true}} : {}),
    border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}
  }});

  const totalCell = (f) => ({ f, t:'n', s:{
    numFmt:'"Rp "#,##0', alignment:{horizontal:'right'},
    font:{bold:true, color:{rgb:'FFFFFF'}},
    fill:{fgColor:{rgb:'16406A'}},
    border:{top:{style:'medium',color:{rgb:'AAAAAA'}}, bottom:{style:'medium',color:{rgb:'AAAAAA'}}, left:{style:'thin',color:{rgb:'AAAAAA'}}, right:{style:'thin',color:{rgb:'AAAAAA'}}}
  }});

  const totalTxt = (v) => ({ v, t:'s', s:{
    font:{bold:true, color:{rgb:'FFFFFF'}},
    fill:{fgColor:{rgb:'16406A'}},
    border:{top:{style:'medium',color:{rgb:'AAAAAA'}}, bottom:{style:'medium',color:{rgb:'AAAAAA'}}, left:{style:'thin',color:{rgb:'AAAAAA'}}, right:{style:'thin',color:{rgb:'AAAAAA'}}}
  }});

  const sectionHdr = (v, rgb='EFF6FF', fontRgb='1D4ED8') => ({ v, t:'s', s:{
    font:{bold:true, sz:11, color:{rgb:fontRgb}},
    fill:{fgColor:{rgb}},
    alignment:{horizontal:'left'},
    border:{bottom:{style:'medium',color:{rgb:'1D4ED8'}}}
  }});

  const inputCell = (v='') => ({ v, t:'s', s:{
    fill:{fgColor:{rgb:'FFFBEB'}},
    border:{
      top:{style:'thin',color:{rgb:'F59E0B'}},
      bottom:{style:'thin',color:{rgb:'F59E0B'}},
      left:{style:'thin',color:{rgb:'F59E0B'}},
      right:{style:'thin',color:{rgb:'F59E0B'}}
    },
    alignment:{wrapText:true}
  }});

  const inputNum = () => ({ v: null, t:'n', s:{
    numFmt:'"Rp "#,##0',
    fill:{fgColor:{rgb:'FFFBEB'}},
    alignment:{horizontal:'right'},
    border:{
      top:{style:'thin',color:{rgb:'F59E0B'}},
      bottom:{style:'thin',color:{rgb:'F59E0B'}},
      left:{style:'thin',color:{rgb:'F59E0B'}},
      right:{style:'thin',color:{rgb:'F59E0B'}}
    }
  }});

  const titleStyle = (v, sz=14) => ({ v, t:'s', s:{font:{bold:true,sz}} });
  const subStyle = (v) => ({ v, t:'s', s:{font:{sz:9, color:{rgb:'64748B'}}} });
  const infoStyle = (v, rgb='16A34A') => ({ v, t:'s', s:{font:{bold:true, color:{rgb}}} });

  // Empty cell with border
  const eb = () => ({ v:'', t:'s', s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}, left:{style:'thin',color:{rgb:'EEEEEE'}}, right:{style:'thin',color:{rgb:'EEEEEE'}}}} });

  // // Compute data dari app
  // const saldo = computeSaldoAll();
  let totalAset=0, totalLiab=0, totalEk=0, totalPend=0, totalBeban=0;
  akuns.forEach(a=>{
    const s=saldo[a.kode]||{debit:0,kredit:0};
    const b=a.normal==='D'?s.debit-s.kredit:s.kredit-s.debit;
    if(a.tipe==='Aset') totalAset+=b;
    else if(a.tipe==='Liabilitas') totalLiab+=b;
    else if(a.tipe==='Ekuitas') totalEk+=b;
    else if(a.tipe==='Pendapatan') totalPend+=b;
    else if(['Beban','HPP'].includes(a.tipe)) totalBeban+=b;
  });
  const labaBersih = totalPend - totalBeban;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 1: INPUT JURNAL — baris data + kosong siap isi
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const inputRows = [
    [titleStyle(nama,14),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [{v:'JURNAL UMUM — Template Hitung Otomatis',t:'s',s:{font:{bold:true,sz:11,color:{rgb:'1D4ED8'}}}},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [subStyle('Periode: '+periode+'   |   Cetak: '+today),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [subStyle('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Isi data di kolom bertanda kuning. Sheet lain akan update otomatis.'),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [],
    [hdr('No'), hdr('Tanggal'), hdr('No Jurnal'), hdr('Keterangan'), hdr('Jenis'), hdr('Kode Akun'), hdr('Debit (Rp)','16A34A'), hdr('Kredit (Rp)','DC2626')],
  ];

  // Data transaksi yang sudah ada
  let rowIdx = 7;
  jurnalEntries.forEach(j => {
    j.lines.forEach((l, i) => {
      inputRows.push([
        i===0?{v:inputRows.length-5,t:'n',s:{alignment:{horizontal:'center'},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}},left:{style:'thin',color:{rgb:'EEEEEE'}},right:{style:'thin',color:{rgb:'EEEEEE'}}}}}:eb(),
        i===0?{v:j.tanggal,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}},left:{style:'thin',color:{rgb:'EEEEEE'}},right:{style:'thin',color:{rgb:'EEEEEE'}}}}}:eb(),
        i===0?{v:j.no,t:'s',s:{font:{color:{rgb:'64748B'}},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}},left:{style:'thin',color:{rgb:'EEEEEE'}},right:{style:'thin',color:{rgb:'EEEEEE'}}}}}:eb(),
        i===0?{v:j.ket,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}},left:{style:'thin',color:{rgb:'EEEEEE'}},right:{style:'thin',color:{rgb:'EEEEEE'}}}}}:eb(),
        i===0?{v:j.jenis,t:'s',s:{alignment:{horizontal:'center'},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}},left:{style:'thin',color:{rgb:'EEEEEE'}},right:{style:'thin',color:{rgb:'EEEEEE'}}}}}:eb(),
        {v:l.akun,t:'s',s:{font:{color:{rgb:'1D4ED8'},bold:true},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}},left:{style:'thin',color:{rgb:'EEEEEE'}},right:{style:'thin',color:{rgb:'EEEEEE'}}}}},
        l.debit?{v:Math.round(l.debit),t:'n',s:{numFmt:'"Rp "#,##0',alignment:{horizontal:'right'},font:{color:{rgb:'16A34A'}},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}},left:{style:'thin',color:{rgb:'EEEEEE'}},right:{style:'thin',color:{rgb:'EEEEEE'}}}}}:eb(),
        l.kredit?{v:Math.round(l.kredit),t:'n',s:{numFmt:'"Rp "#,##0',alignment:{horizontal:'right'},font:{color:{rgb:'DC2626'}},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}},left:{style:'thin',color:{rgb:'EEEEEE'}},right:{style:'thin',color:{rgb:'EEEEEE'}}}}}:eb(),
      ]);
    });
  });

  const lastDataRow = inputRows.length;

  // Baris kosong siap isi (10 baris input kuning)
  for(let i=0; i<10; i++) {
    inputRows.push([
      {v:'',t:'n',s:{fill:{fgColor:{rgb:'FFFBEB'}},border:{top:{style:'thin',color:{rgb:'F59E0B'}},bottom:{style:'thin',color:{rgb:'F59E0B'}},left:{style:'thin',color:{rgb:'F59E0B'}},right:{style:'thin',color:{rgb:'F59E0B'}}}}},
      inputCell(), inputCell(), inputCell(), inputCell(), inputCell(), inputNum(), inputNum()
    ]);
  }
  const lastInputRow = inputRows.length;

  // Baris total dengan SUM
  inputRows.push([]);
  const totalRowIdx = inputRows.length + 1;
  inputRows.push([
    {v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},
    totalTxt('TOTAL DEBIT / KREDIT'),
    totalCell(`SUM(G7:G${lastInputRow})`),
    totalCell(`SUM(H7:H${lastInputRow})`),
  ]);

  // Balance check row
  const balanceRowIdx = inputRows.length + 1;
  inputRows.push([
    {v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},
    {v:'STATUS BALANCE',t:'s',s:{font:{bold:true,sz:11}}},
    {f:`IF(ABS(G${totalRowIdx}-H${totalRowIdx})<1,"<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> JURNAL BALANCE","❌ TIDAK BALANCE — Selisih: "&TEXT(ABS(G${totalRowIdx}-H${totalRowIdx}),"#,##0"))`,
     t:'s', s:{font:{bold:true}, alignment:{horizontal:'center',wrapText:true},
     fill:{fgColor:{rgb:'F0FDF4'}},
     border:{top:{style:'medium',color:{rgb:'16A34A'}},bottom:{style:'medium',color:{rgb:'16A34A'}},left:{style:'medium',color:{rgb:'16A34A'}},right:{style:'medium',color:{rgb:'16A34A'}}}}},
    {v:'',t:'s'},
  ]);

  const inputWs = XLSX.utils.aoa_to_sheet(inputRows);
  inputWs['!cols'] = [{wch:5},{wch:13},{wch:14},{wch:38},{wch:14},{wch:14},{wch:22},{wch:22}];
  inputWs['!rows'] = [{hpt:20},{hpt:18},{hpt:15},{hpt:15},{hpt:8},{hpt:24}];

  // Merge cells untuk judul
  inputWs['!merges'] = [
    {s:{r:0,c:0},e:{r:0,c:7}},
    {s:{r:1,c:0},e:{r:1,c:7}},
    {s:{r:2,c:0},e:{r:2,c:7}},
    {s:{r:3,c:0},e:{r:3,c:7}},
    {s:{r:balanceRowIdx-1,c:6},e:{r:balanceRowIdx-1,c:7}},
  ];

  // Conditional Formatting: merah jika tidak balance
  // (SheetJS community tidak support CF native — pakai catatan di cell)
  XLSX.utils.book_append_sheet(wb, inputWs, 'INPUT Jurnal');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 2: LABA RUGI — formula aktif
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const pendR=[], bebanR=[], hppR=[];
  akuns.forEach(a=>{
    const s=computeSaldoBersih(a.kode);
    if(a.tipe==='Pendapatan') pendR.push([a.nama, s]);
    if(a.tipe==='HPP') hppR.push([a.nama, s]);
    if(a.tipe==='Beban') bebanR.push([a.nama, s]);
  });

  const lrRows = [
    [titleStyle(nama),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [{v:'LAPORAN LABA RUGI',t:'s',s:{font:{bold:true,sz:12,color:{rgb:'1D4ED8'}}}},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [subStyle('Periode: '+periode),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [],
    [hdr('URAIAN','1D4ED8'), hdr('NILAI (Rp)','1D4ED8'), {v:'',t:'s'}, {v:'',t:'s'}],
    [sectionHdr('PENDAPATAN','DBEAFE','1D4ED8'), {v:'',t:'s'}, {v:'',t:'s'}, {v:'',t:'s'}],
  ];
  let pendStart = lrRows.length + 1;
  pendR.forEach(([n,v]) => lrRows.push([{v:'  '+n,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}}, numFmt(v),{v:'',t:'s'},{v:'',t:'s'}]));
  const pendEnd = lrRows.length;
  lrRows.push([totalTxt('Total Pendapatan'), totalCell(`SUM(B${pendStart}:B${pendEnd})`),{v:'',t:'s'},{v:'',t:'s'}]);
  const totPendRow = lrRows.length;

  lrRows.push([]);
  lrRows.push([sectionHdr('HPP (HARGA POKOK PENJUALAN)','FEF2F2','DC2626'),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}]);
  let hppStart = lrRows.length + 1;
  if(hppR.length) {
    hppR.forEach(([n,v]) => lrRows.push([{v:'  '+n,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}}, numFmtRed(v),{v:'',t:'s'},{v:'',t:'s'}]));
  } else {
    lrRows.push([{v:'  (tidak ada akun HPP)',t:'s',s:{font:{color:{rgb:'94A3B8'}}}},{v:0,t:'n',s:{numFmt:'"Rp "#,##0',alignment:{horizontal:'right'}}},{v:'',t:'s'},{v:'',t:'s'}]);
  }
  const hppEnd = lrRows.length;
  lrRows.push([totalTxt('Total HPP'), totalCell(`SUM(B${hppStart}:B${hppEnd})`),{v:'',t:'s'},{v:'',t:'s'}]);
  const totHppRow = lrRows.length;

  lrRows.push([]);
  lrRows.push([{v:'LABA KOTOR',t:'s',s:{font:{bold:true,sz:11}}}, formulaCell(`B${totPendRow}-B${totHppRow}`,{bold:true,fill:'F0FDF4'}),{v:'',t:'s'},{v:'',t:'s'}]);
  const labaKotorRow = lrRows.length;

  lrRows.push([]);
  lrRows.push([sectionHdr('BEBAN OPERASIONAL','FFF7ED','D97706'),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}]);
  let bebanStart = lrRows.length + 1;
  if(bebanR.length) {
    bebanR.forEach(([n,v]) => lrRows.push([{v:'  '+n,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}}, numFmtRed(v),{v:'',t:'s'},{v:'',t:'s'}]));
  } else {
    lrRows.push([{v:'  (tidak ada akun beban)',t:'s',s:{font:{color:{rgb:'94A3B8'}}}},{v:0,t:'n',s:{numFmt:'"Rp "#,##0',alignment:{horizontal:'right'}}},{v:'',t:'s'},{v:'',t:'s'}]);
  }
  const bebanEnd = lrRows.length;
  lrRows.push([totalTxt('Total Beban Operasional'), totalCell(`SUM(B${bebanStart}:B${bebanEnd})`),{v:'',t:'s'},{v:'',t:'s'}]);
  const totBebanRow = lrRows.length;

  lrRows.push([]);
  lrRows.push([
    {v:'LABA BERSIH',t:'s',s:{font:{bold:true,sz:12,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'16A34A'}},border:{top:{style:'medium',color:{rgb:'0D7D41'}},bottom:{style:'medium',color:{rgb:'0D7D41'}},left:{style:'medium',color:{rgb:'0D7D41'}},right:{style:'medium',color:{rgb:'0D7D41'}}}}},
    {f:`B${labaKotorRow}-B${totBebanRow}`, t:'n', s:{numFmt:'"Rp "#,##0', font:{bold:true,sz:12,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'16A34A'}}, alignment:{horizontal:'right'}, border:{top:{style:'medium',color:{rgb:'0D7D41'}},bottom:{style:'medium',color:{rgb:'0D7D41'}},left:{style:'medium',color:{rgb:'0D7D41'}},right:{style:'medium',color:{rgb:'0D7D41'}}}}},
    {v:'',t:'s'},{v:'',t:'s'}
  ]);
  const labaBersihRow = lrRows.length;

  const lrWs = XLSX.utils.aoa_to_sheet(lrRows);
  lrWs['!cols'] = [{wch:36},{wch:24},{wch:10},{wch:10}];
  lrWs['!merges'] = [
    {s:{r:0,c:0},e:{r:0,c:3}},{s:{r:1,c:0},e:{r:1,c:3}},{s:{r:2,c:0},e:{r:2,c:3}}
  ];
  XLSX.utils.book_append_sheet(wb, lrWs, 'Laba Rugi');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 3: NERACA — Balance Sheet + cek balance otomatis
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let totA=0,totL=0,totE2=0;
  const asetR=[],liabR=[],ekR=[];
  akuns.forEach(a=>{
    const s=computeSaldoBersih(a.kode);
    if(a.tipe==='Aset'){totA+=s;asetR.push([a.nama,s]);}
    if(a.tipe==='Liabilitas'){totL+=s;liabR.push([a.nama,s]);}
    if(a.tipe==='Ekuitas'){totE2+=s;ekR.push([a.nama,s]);}
  });

  const neracaRows = [
    [titleStyle(nama),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [{v:'NERACA (BALANCE SHEET)',t:'s',s:{font:{bold:true,sz:12,color:{rgb:'1D4ED8'}}}},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [subStyle('Periode: '+periode),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [],
    [hdr('ASET','16A34A'), hdr('NILAI (Rp)','16A34A'), hdr('LIABILITAS & EKUITAS','DC2626'), hdr('NILAI (Rp)','DC2626')],
    [{v:'Aset Lancar & Tetap',t:'s',s:{font:{bold:true,color:{rgb:'16A34A'}},fill:{fgColor:{rgb:'F0FDF4'}}}},{v:'',t:'s'},
     {v:'Liabilitas',t:'s',s:{font:{bold:true,color:{rgb:'DC2626'}},fill:{fgColor:{rgb:'FEF2F2'}}}},{v:'',t:'s'}],
  ];

  let asetDataStart = neracaRows.length + 1;
  // Aset: jika kosong, tambah template baris input
  if(asetR.length === 0) {
    for(let i=0;i<5;i++) neracaRows.push([inputCell('Nama Aset'),inputNum(),{v:'',t:'s'},{v:'',t:'s'}]);
  } else {
    asetR.forEach(([n,v]) => neracaRows.push([{v:'  '+n,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmt(v),{v:'',t:'s'},{v:'',t:'s'}]));
  }
  const asetDataEnd = neracaRows.length;

  // Liabilitas: isi sejajar dengan aset
  let liabDataStart = 7; // baris 7 (1-based, setelah header)
  liabR.forEach(([n,v],i) => {
    const rowI = asetDataStart - 1 + i;
    if(neracaRows[rowI]) {
      neracaRows[rowI][2] = {v:'  '+n,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}};
      neracaRows[rowI][3] = numFmt(v);
    } else {
      neracaRows.push([{v:'',t:'s'},{v:'',t:'s'},{v:'  '+n,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmt(v)]);
    }
  });
  // Jika tidak ada liabilitas, tambah baris input
  if(liabR.length === 0) {
    for(let i=0;i<3;i++) {
      if(neracaRows[asetDataStart-1+i]) {
        neracaRows[asetDataStart-1+i][2] = inputCell('Nama Liabilitas');
        neracaRows[asetDataStart-1+i][3] = inputNum();
      }
    }
  }

  // Total aset
  neracaRows.push([
    totalTxt('TOTAL ASET'),
    totalCell(`SUM(B${asetDataStart}:B${asetDataEnd})`),
    totalTxt('TOTAL LIABILITAS'),
    {f: liabR.length>0 ? `SUM(D${liabDataStart}:D${asetDataEnd})` : `0`, t:'n', s:{numFmt:'"Rp "#,##0', font:{bold:true,color:{rgb:'FFFFFF'}}, fill:{fgColor:{rgb:'16406A'}}, alignment:{horizontal:'right'}, border:{top:{style:'medium',color:{rgb:'AAAAAA'}},bottom:{style:'medium',color:{rgb:'AAAAAA'}},left:{style:'thin',color:{rgb:'AAAAAA'}},right:{style:'thin',color:{rgb:'AAAAAA'}}}}},
  ]);
  const totAsetRow = neracaRows.length;

  neracaRows.push([]);
  neracaRows.push([{v:'',t:'s'},{v:'',t:'s'},{v:'Ekuitas',t:'s',s:{font:{bold:true,color:{rgb:'0891B2'}},fill:{fgColor:{rgb:'ECFEFF'}}}},{v:'',t:'s'}]);
  let ekDataStart = neracaRows.length + 1;
  if(ekR.length === 0) {
    for(let i=0;i<3;i++) neracaRows.push([{v:'',t:'s'},{v:'',t:'s'},inputCell('Nama Ekuitas'),inputNum()]);
  } else {
    ekR.forEach(([n,v]) => neracaRows.push([{v:'',t:'s'},{v:'',t:'s'},{v:'  '+n,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmt(v)]));
  }
  const ekDataEnd = neracaRows.length;
  neracaRows.push([{v:'',t:'s'},{v:'',t:'s'},{v:'  Laba/(Rugi) Periode Berjalan',t:'s',s:{font:{italic:true,color:{rgb:'16A34A'}},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmtGreen(labaBersih)]);
  const labaPdRow = neracaRows.length;

  neracaRows.push([
    {v:'',t:'s'},{v:'',t:'s'},
    totalTxt('TOTAL EKUITAS'),
    totalCell(`SUM(D${ekDataStart}:D${labaPdRow})`),
  ]);
  const totEkRow = neracaRows.length;

  neracaRows.push([
    {v:'',t:'s'},{v:'',t:'s'},
    totalTxt('TOTAL LIABILITAS + EKUITAS'),
    totalCell(`D${totAsetRow}+D${totEkRow}`),
  ]);
  const totLiabEkRow = neracaRows.length;

  // Balance check
  neracaRows.push([]);
  const balanced = Math.abs(totA-(totL+totE2+labaBersih))<1;
  neracaRows.push([
    {v: balanced ? '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> NERACA BALANCE' : '❌ NERACA TIDAK BALANCE — Periksa transaksi!',
     t:'s', s:{
       font:{bold:true,sz:12,color:{rgb:balanced?'FFFFFF':'FFFFFF'}},
       fill:{fgColor:{rgb:balanced?'16A34A':'DC2626'}},
       alignment:{horizontal:'center'},
       border:{top:{style:'medium',color:{rgb:balanced?'0D7D41':'B91C1C'}},bottom:{style:'medium',color:{rgb:balanced?'0D7D41':'B91C1C'}},left:{style:'medium',color:{rgb:balanced?'0D7D41':'B91C1C'}},right:{style:'medium',color:{rgb:balanced?'0D7D41':'B91C1C'}}}
     }},
    {v:'',t:'s'},
    {v:'Selisih Aset vs Liab+Ekuitas',t:'s',s:{font:{color:{rgb:'64748B'},sz:10}}},
    {f:`ABS(B${totAsetRow}-D${totLiabEkRow})`,t:'n',s:{numFmt:'"Rp "#,##0',alignment:{horizontal:'right'},font:{bold:true}}},
  ]);
  const statusRow = neracaRows.length;
  neracaRows.push([
    {v:'Formula cek: =ABS(Total Aset - Total Liab+Ekuitas) < 1',t:'s',s:{font:{sz:9,color:{rgb:'64748B'},italic:true}}},
    {v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}
  ]);

  const neracaWs = XLSX.utils.aoa_to_sheet(neracaRows);
  neracaWs['!cols'] = [{wch:32},{wch:24},{wch:32},{wch:24}];
  neracaWs['!merges'] = [
    {s:{r:0,c:0},e:{r:0,c:3}},
    {s:{r:1,c:0},e:{r:1,c:3}},
    {s:{r:2,c:0},e:{r:2,c:3}},
    {s:{r:statusRow-1,c:0},e:{r:statusRow-1,c:1}},
    {s:{r:statusRow,c:0},e:{r:statusRow,c:3}},
  ];
  XLSX.utils.book_append_sheet(wb, neracaWs, 'Neraca');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 4: NERACA SALDO — dengan balance check formula
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const saldoMap = computeSaldoAll();
  const nsRows = [
    [titleStyle(nama),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [{v:'NERACA SALDO',t:'s',s:{font:{bold:true,sz:12,color:{rgb:'1D4ED8'}}}},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [subStyle('Periode: '+periode),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [],
    [hdr('Kode'), hdr('Nama Akun'), hdr('Tipe'), hdr('Total Debit (Rp)','16A34A'), hdr('Total Kredit (Rp)','DC2626')],
  ];
  let nsTotalD=0, nsTotalK=0;
  const nsDataStart = nsRows.length + 1;
  akuns.forEach(a => {
    const s = saldoMap[a.kode]||{debit:0,kredit:0};
    nsTotalD+=s.debit; nsTotalK+=s.kredit;
    nsRows.push([
      {v:a.kode,t:'s',s:{font:{color:{rgb:'1D4ED8'},bold:true},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
      {v:a.nama,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
      {v:a.tipe,t:'s',s:{alignment:{horizontal:'center'},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
      s.debit ? numFmtGreen(s.debit) : {v:'-',t:'s',s:{alignment:{horizontal:'center'},font:{color:{rgb:'94A3B8'}}}},
      s.kredit ? numFmtRed(s.kredit) : {v:'-',t:'s',s:{alignment:{horizontal:'center'},font:{color:{rgb:'94A3B8'}}}},
    ]);
  });

  // Jika tidak ada akun, tambah baris contoh kosong
  if(akuns.length === 0) {
    for(let i=0;i<5;i++) {
      nsRows.push([inputCell('1101'),inputCell('Kas'),inputCell('Aset'),inputNum(),inputNum()]);
    }
  }

  const nsDataEnd = nsRows.length;
  nsRows.push([]);
  nsRows.push([
    {v:'',t:'s'},
    totalTxt('TOTAL'),
    {v:'',t:'s'},
    totalCell(`SUMIF(D${nsDataStart}:D${nsDataEnd},"<>-",D${nsDataStart}:D${nsDataEnd})`),
    totalCell(`SUMIF(E${nsDataStart}:E${nsDataEnd},"<>-",E${nsDataStart}:E${nsDataEnd})`),
  ]);
  const nsTotalRow = nsRows.length;

  const nsBalanced = Math.abs(nsTotalD - nsTotalK) < 1;
  nsRows.push([
    {v:'',t:'s'},
    {f:`IF(ABS(D${nsTotalRow}-E${nsTotalRow})<1,"<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> SALDO BALANCE","❌ TIDAK BALANCE — Selisih: "&TEXT(ABS(D${nsTotalRow}-E${nsTotalRow}),"Rp #,##0"))`,
     t:'s', s:{
       font:{bold:true,color:{rgb:nsBalanced?'16A34A':'DC2626'}},
       alignment:{horizontal:'left'},
       border:{top:{style:'medium',color:{rgb:nsBalanced?'16A34A':'DC2626'}},bottom:{style:'medium',color:{rgb:nsBalanced?'16A34A':'DC2626'}}}
     }},
    {v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},
  ]);

  const nsWs = XLSX.utils.aoa_to_sheet(nsRows);
  nsWs['!cols'] = [{wch:9},{wch:32},{wch:14},{wch:24},{wch:24}];
  nsWs['!merges'] = [{s:{r:0,c:0},e:{r:0,c:4}},{s:{r:1,c:0},e:{r:1,c:4}},{s:{r:2,c:0},e:{r:2,c:4}}];
  XLSX.utils.book_append_sheet(wb, nsWs, 'Neraca Saldo');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 5: KAS — Buku Kas Harian + Saldo Running
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const kasRows = [
    [titleStyle(nama),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [{v:'BUKU KAS HARIAN',t:'s',s:{font:{bold:true,sz:12,color:{rgb:'1D4ED8'}}}},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [subStyle('Periode: '+periode),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [],
    [hdr('Tanggal'), hdr('No Jurnal'), hdr('Keterangan'), hdr('Masuk (Rp)','16A34A'), hdr('Keluar (Rp)','DC2626'), hdr('Saldo Running (Rp)','0891B2')],
  ];
  let kasSaldo=0, kasIn=0, kasOut=0;
  let kasDataStart = kasRows.length + 1;
  jurnalEntries.forEach(j => {
    j.lines.forEach(l => {
      if(l.akun === '1101') {
        const masuk=l.debit||0, keluar=l.kredit||0;
        if(!masuk && !keluar) return;
        const row = kasRows.length + 1;
        kasSaldo += masuk - keluar; kasIn += masuk; kasOut += keluar;
        kasRows.push([
          {v:j.tanggal,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
          {v:j.no,t:'s',s:{font:{color:{rgb:'64748B'}},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
          {v:j.ket,t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
          masuk?numFmtGreen(masuk):{v:'-',t:'s',s:{alignment:{horizontal:'center'},font:{color:{rgb:'94A3B8'}}}},
          keluar?numFmtRed(keluar):{v:'-',t:'s',s:{alignment:{horizontal:'center'},font:{color:{rgb:'94A3B8'}}}},
          {f: row===kasDataStart ? `D${row}-E${row}` : `F${row-1}+D${row}-E${row}`,
           t:'n', s:{numFmt:'"Rp "#,##0',alignment:{horizontal:'right'},font:{color:{rgb:'0891B2'},bold:true},border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
        ]);
      }
    });
  });

  // Baris kosong siap isi
  for(let i=0;i<5;i++) {
    const row = kasRows.length + 1;
    kasRows.push([
      inputCell(), inputCell(), inputCell(), inputNum(), inputNum(),
      {f: row===kasDataStart ? `D${row}-E${row}` : `F${row-1}+D${row}-E${row}`,
       t:'n', s:{numFmt:'"Rp "#,##0',alignment:{horizontal:'right'},font:{color:{rgb:'0891B2'},bold:true},fill:{fgColor:{rgb:'ECFEFF'}},border:{top:{style:'thin',color:{rgb:'0891B2'}},bottom:{style:'thin',color:{rgb:'0891B2'}},left:{style:'thin',color:{rgb:'0891B2'}},right:{style:'thin',color:{rgb:'0891B2'}}}}},
    ]);
  }

  const kasDataEnd = kasRows.length;
  kasRows.push([]);
  kasRows.push([
    {v:'',t:'s'},{v:'',t:'s'},
    totalTxt('TOTAL MASUK / KELUAR'),
    totalCell(`SUM(D${kasDataStart}:D${kasDataEnd})`),
    totalCell(`SUM(E${kasDataStart}:E${kasDataEnd})`),
    {v:'',t:'s'},
  ]);
  const kasTotalRow = kasRows.length;
  kasRows.push([
    {v:'',t:'s'},{v:'',t:'s'},
    {v:'SALDO KAS AKHIR',t:'s',s:{font:{bold:true,color:{rgb:'0891B2'}}}},
    {v:'',t:'s'},{v:'',t:'s'},
    formulaCell(`D${kasTotalRow}-E${kasTotalRow}`,{bold:true,fill:'ECFEFF'}),
  ]);

  const kasWs = XLSX.utils.aoa_to_sheet(kasRows);
  kasWs['!cols'] = [{wch:14},{wch:14},{wch:36},{wch:22},{wch:22},{wch:24}];
  kasWs['!merges'] = [{s:{r:0,c:0},e:{r:0,c:5}},{s:{r:1,c:0},e:{r:1,c:5}},{s:{r:2,c:0},e:{r:2,c:5}}];
  XLSX.utils.book_append_sheet(wb, kasWs, 'Jurnal Kas');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 6: RINGKASAN KPI — Rasio Keuangan
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const sumRows = [
    [titleStyle(nama),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [{v:'RINGKASAN KEUANGAN & KPI',t:'s',s:{font:{bold:true,sz:12,color:{rgb:'1D4ED8'}}}},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [subStyle('Periode: '+periode+'  |  Hitung Otomatis dari data akun'),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [],
    [sectionHdr('NERACA SINGKAT','DBEAFE','1D4ED8'),{v:'',t:'s'},sectionHdr('LABA RUGI SINGKAT','DBEAFE','1D4ED8'),{v:'',t:'s'},{v:'',t:'s'}],
    [hdr('Uraian','1D4ED8'),hdr('Nilai (Rp)','1D4ED8'),hdr('Uraian','1D4ED8'),hdr('Nilai (Rp)','1D4ED8'),{v:'',t:'s'}],
    [{v:'Total Aset',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmt(totalAset),{v:'Total Pendapatan',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmt(totalPend),{v:'',t:'s'}],
    [{v:'Total Liabilitas',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmt(totalLiab),{v:'Total HPP',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmt(0),{v:'',t:'s'}],
    [{v:'Total Ekuitas',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmt(totalEk),{v:'Laba Kotor',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmt(totalPend),{v:'',t:'s'}],
    [{v:'',t:'s'},{v:'',t:'s'},{v:'Total Beban Operasional',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},numFmt(totalBeban),{v:'',t:'s'}],
    [totalTxt('Laba Bersih'),{v:Math.round(labaBersih),t:'n',s:{numFmt:'"Rp "#,##0',font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'16406A'}},alignment:{horizontal:'right'},border:{top:{style:'medium',color:{rgb:'AAAAAA'}},bottom:{style:'medium',color:{rgb:'AAAAAA'}},left:{style:'thin',color:{rgb:'AAAAAA'}},right:{style:'thin',color:{rgb:'AAAAAA'}}}}},
     totalTxt('Laba Bersih'),{v:Math.round(labaBersih),t:'n',s:{numFmt:'"Rp "#,##0',font:{bold:true,color:{rgb:'FFFFFF'}},fill:{fgColor:{rgb:'16406A'}},alignment:{horizontal:'right'},border:{top:{style:'medium',color:{rgb:'AAAAAA'}},bottom:{style:'medium',color:{rgb:'AAAAAA'}},left:{style:'thin',color:{rgb:'AAAAAA'}},right:{style:'thin',color:{rgb:'AAAAAA'}}}}},{v:'',t:'s'}],
    [],
    [sectionHdr('RASIO KEUANGAN','F0F9FF','0891B2'),{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'},{v:'',t:'s'}],
    [hdr('Rasio','0891B2'),hdr('Nilai','0891B2'),hdr('Formula','0891B2'),hdr('Benchmark','0891B2'),hdr('Status','0891B2')],
    [{v:'Gross Profit Margin',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
      totalPend>0?pctFormula(`(D9/D7)*100`):{v:'N/A',t:'s',s:{font:{color:{rgb:'94A3B8'}}}},
      {v:'Laba Kotor / Pendapatan × 100',t:'s',s:{font:{color:{rgb:'64748B'},sz:10}}},
      {v:'≥ 30% = baik',t:'s',s:{font:{color:{rgb:'16A34A'},bold:true}}},
      totalPend>0?{f:`IF((D9/D7)*100>=30,"<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> BAIK","<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> PERLU PERBAIKAN")`,t:'s',s:{font:{bold:true}}}:{v:'N/A',t:'s'}],
    [{v:'Net Profit Margin',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
      totalPend>0?pctFormula(`(B11/D7)*100`):{v:'N/A',t:'s',s:{font:{color:{rgb:'94A3B8'}}}},
      {v:'Laba Bersih / Pendapatan × 100',t:'s',s:{font:{color:{rgb:'64748B'},sz:10}}},
      {v:'≥ 10% = baik',t:'s',s:{font:{color:{rgb:'16A34A'},bold:true}}},
      totalPend>0?{f:`IF((B11/D7)*100>=10,"<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> BAIK","<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> PERLU PERBAIKAN")`,t:'s',s:{font:{bold:true}}}:{v:'N/A',t:'s'}],
    [{v:'ROA (Return on Assets)',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
      totalAset>0?pctFormula(`(B11/B7)*100`):{v:'N/A',t:'s',s:{font:{color:{rgb:'94A3B8'}}}},
      {v:'Laba Bersih / Total Aset × 100',t:'s',s:{font:{color:{rgb:'64748B'},sz:10}}},
      {v:'≥ 5% = baik',t:'s',s:{font:{color:{rgb:'16A34A'},bold:true}}},
      totalAset>0?{f:`IF((B11/B7)*100>=5,"<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> BAIK","<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> PERLU PERBAIKAN")`,t:'s',s:{font:{bold:true}}}:{v:'N/A',t:'s'}],
    [{v:'ROE (Return on Equity)',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
      totalEk>0?pctFormula(`(B11/B9)*100`):{v:'N/A',t:'s',s:{font:{color:{rgb:'94A3B8'}}}},
      {v:'Laba Bersih / Ekuitas × 100',t:'s',s:{font:{color:{rgb:'64748B'},sz:10}}},
      {v:'≥ 15% = baik',t:'s',s:{font:{color:{rgb:'16A34A'},bold:true}}},
      totalEk>0?{f:`IF((B11/B9)*100>=15,"<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> BAIK","<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> PERLU PERBAIKAN")`,t:'s',s:{font:{bold:true}}}:{v:'N/A',t:'s'}],
    [{v:'DER (Debt to Equity)',t:'s',s:{border:{bottom:{style:'thin',color:{rgb:'EEEEEE'}}}}},
      totalEk>0?{f:`B8/B9`,t:'n',s:{numFmt:'0.00"x"',alignment:{horizontal:'right'}}}:{v:'N/A',t:'s',s:{font:{color:{rgb:'94A3B8'}}}},
      {v:'Total Liabilitas / Ekuitas',t:'s',s:{font:{color:{rgb:'64748B'},sz:10}}},
      {v:'≤ 1x = baik',t:'s',s:{font:{color:{rgb:'16A34A'},bold:true}}},
      totalEk>0?{f:`IF(B8/B9<=1,"<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> BAIK","<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> PERLU PERBAIKAN")`,t:'s',s:{font:{bold:true}}}:{v:'N/A',t:'s'}],
  ];

  const sumWs = XLSX.utils.aoa_to_sheet(sumRows);
  sumWs['!cols'] = [{wch:26},{wch:22},{wch:34},{wch:16},{wch:22}];
  sumWs['!merges'] = [
    {s:{r:0,c:0},e:{r:0,c:4}},{s:{r:1,c:0},e:{r:1,c:4}},{s:{r:2,c:0},e:{r:2,c:4}},
    {s:{r:4,c:0},e:{r:4,c:1}},{s:{r:4,c:2},e:{r:4,c:4}},
    {s:{r:12,c:0},e:{r:12,c:4}},
  ];
  XLSX.utils.book_append_sheet(wb, sumWs, 'Ringkasan KPI');

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // SHEET 7: PANDUAN — Cara penggunaan template
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const guideRows = [
    [{v:'📖 PANDUAN TEMPLATE HITUNG OTOMATIS',t:'s',s:{font:{bold:true,sz:14,color:{rgb:'1D4ED8'}}}},{v:'',t:'s'}],
    [{v:nama+' — '+periode,t:'s',s:{font:{sz:10,color:{rgb:'64748B'}}}},{v:'',t:'s'}],
    [],
    [sectionHdr('CARA MENGGUNAKAN TEMPLATE INI'),{v:'',t:'s'}],
    [{v:'1.',t:'s'},{v:'Sheet "<i class="ti ti-download ti-inline"></i> INPUT Jurnal" = SATU-SATUNYA tempat input/edit data transaksi. Isi baris dengan latar kuning.',t:'s',s:{font:{sz:11}}}],
    [{v:'2.',t:'s'},{v:'Kolom: Tanggal | No Jurnal | Keterangan | Jenis | Kode Akun | Debit | Kredit',t:'s',s:{font:{sz:11}}}],
    [{v:'3.',t:'s'},{v:'Sheet lain (Laba Rugi, Neraca, Kas, Neraca Saldo) = OTOMATIS. Jangan hapus formula di sana.',t:'s',s:{font:{sz:11}}}],
    [{v:'4.',t:'s'},{v:'Baris berwarna KUNING = siap isi. Tambahkan baris baru di bawah baris data terakhir.',t:'s',s:{font:{sz:11}}}],
    [{v:'5.',t:'s'},{v:'STATUS BALANCE di INPUT Jurnal akan otomatis berubah merah/hijau sesuai kondisi.',t:'s',s:{font:{sz:11}}}],
    [{v:'6.',t:'s'},{v:'Neraca: Aset harus = Liabilitas + Ekuitas + Laba Bersih. Jika tidak sama, ada transaksi yang salah.',t:'s',s:{font:{sz:11}}}],
    [],
    [sectionHdr('KODE WARNA DALAM TEMPLATE'),{v:'',t:'s'}],
    [{v:'🟡 Kuning',t:'s',s:{fill:{fgColor:{rgb:'FFFBEB'}},font:{bold:true}}},{v:'= Kolom input — silakan isi/ubah',t:'s'}],
    [{v:'🟢 Hijau',t:'s',s:{fill:{fgColor:{rgb:'F0FDF4'}},font:{bold:true}}},{v:'= Total / hasil formula (jangan ubah)',t:'s'}],
    [{v:'🔵 Biru tua',t:'s',s:{fill:{fgColor:{rgb:'16406A'}},font:{bold:true,color:{rgb:'FFFFFF'}}}},{v:'= Header / total utama',t:'s'}],
    [{v:'🔴 Merah',t:'s',s:{fill:{fgColor:{rgb:'DC2626'}},font:{bold:true,color:{rgb:'FFFFFF'}}}},{v:'= Tidak balance / error',t:'s'}],
    [],
    [sectionHdr('KODE AKUN TERDAFTAR'),{v:'',t:'s'}],
    [hdr('Kode'), hdr('Nama Akun & Tipe')],
  ];
  akuns.forEach(a => guideRows.push([
    {v:a.kode,t:'s',s:{font:{color:{rgb:'1D4ED8'},bold:true}}},
    {v:a.nama+' ('+a.tipe+')',t:'s'}
  ]));
  guideRows.push([]);
  guideRows.push([sectionHdr('FORMULA KUNCI'),{v:'',t:'s'}]);
  guideRows.push([hdr('Formula'), hdr('Keterangan')]);
  [
    ['=SUM(G7:G100)', 'Total Debit semua jurnal (baris 7–100)'],
    ['=IF(ABS(G_total-H_total)<1,"<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> BALANCE","❌")', 'Cek balance jurnal (selisih < 1 rupiah = balance)'],
    ['=SUM(B_start:B_end)', 'Total per kategori (Pendapatan / Beban / Aset)'],
    ['=F_prev+D_row-E_row', 'Saldo kas running harian'],
    ['=ABS(TotalAset - TotalLiab+Ek) < 1', 'Cek balance neraca (harus nol atau < 1)'],
    ['=(B_labaBersih/D_pendapatan)*100', 'Net Profit Margin (%)'],
    ['=B_laba/B_aset*100', 'Return on Assets / ROA (%)'],
  ].forEach(([f,k]) => guideRows.push([
    {v:f,t:'s',s:{font:{color:{rgb:'1D4ED8'},bold:true}}},
    {v:k,t:'s',s:{font:{color:{rgb:'64748B'}}}}
  ]));

  const guideWs = XLSX.utils.aoa_to_sheet(guideRows);
  guideWs['!cols'] = [{wch:52},{wch:60}];
  XLSX.utils.book_append_sheet(wb, guideWs, '📖 Panduan');

  // WRITE FILE
  const fn = `BHP_${nama.replace(/\s+/g,'_')}_${periode.replace(/\s+/g,'_')}_FormulaTemplate.xlsx`;
  XLSX.writeFile(wb, fn);
  expStatus(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Template Hitung Otomatis berhasil diunduh: <b>${fn}</b><br><span style="font-size:11px">${wb.SheetNames.length} sheet • Baris kuning = siap isi • Balance check otomatis aktif di setiap sheet</span>`);
}
// PDF EXPORT
function exportPDF(nama, periode, proyek='') {
  if(typeof window.jspdf === 'undefined' && typeof jspdf === 'undefined') {
    expStatus('❌ Library jsPDF belum dimuat. Coba refresh halaman.', 'var(--red)'); return;
  }
  const { jsPDF } = window.jspdf || jspdf;
  const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
  const W = 210, margin = 14;
  let y = 0;
  // Logo data URL (dari upload user, bisa null)
  const logoData = exportLogoDataUrl || null;

  // Warna default — bisa di-override oleh template aktif via window._pvExportTheme
  const _th = window._pvExportTheme || {};
  const DARK  = _th.DARK  || [28, 32, 48];
  const GREEN = _th.GREEN || [22, 163, 74];
  const BLUE  = _th.BLUE  || [29, 78, 216];
  const RED   = [220, 38, 38];
  const GRAY  = [100, 116, 139];
  const LIGHT = _th.LIGHT || [241, 245, 249];

  function newPage() {
    doc.addPage();
    y = 0;
  }

  // Helper: gambar logo di posisi tertentu (jika ada)
  function drawLogo(x, y2, maxW, maxH) {
    if(!logoData) return;
    try {
      // Deteksi format
      let fmt = 'PNG';
      if(logoData.startsWith('data:image/jpeg') || logoData.startsWith('data:image/jpg')) fmt = 'JPEG';
      else if(logoData.startsWith('data:image/webp')) fmt = 'WEBP';
      // SVG tidak didukung jsPDF addImage langsung, skip jika SVG
      if(logoData.startsWith('data:image/svg')) return;
      doc.addImage(logoData, fmt, x, y2, maxW, maxH, undefined, 'FAST');
    } catch(e) { /* logo gagal render, abaikan */ }
  }

  function addCover() {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, W, 297, 'F');
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, 6, 297, 'F');

    // Logo perusahaan (jika ada) di kanan atas cover
    if(logoData) {
      // Kotak putih background untuk logo
      doc.setFillColor(255,255,255);
      doc.roundedRect(W-margin-38, margin+2, 36, 36, 4, 4, 'F');
      drawLogo(W-margin-36, margin+4, 32, 32);
    }

    doc.setTextColor(255,255,255);
    doc.setFont('helvetica','bold');
    doc.setFontSize(26);
    // Main title = nama perusahaan (user input)
    const mainTitle = nama || 'Laporan Keuangan';
    // Handle long names — split to 2 lines if needed
    const maxW = W - margin*2 - 16;
    const titleLines = doc.splitTextToSize(mainTitle, maxW);
    titleLines.forEach((line, i) => {
      doc.text(line, margin+8, 75 + (i * 12));
    });
    const afterTitle = 75 + (titleLines.length * 12) + 4;
    doc.setFontSize(14);
    doc.setTextColor(...LIGHT);
    doc.text('LAPORAN KEUANGAN', margin+8, afterTitle);
    doc.setFontSize(12);
    doc.setTextColor(...GRAY.map(x=>x+60));
    // Proyek name (custom subtitle)
    if(typeof proyek !== 'undefined' && proyek) {
      doc.text(proyek, margin+8, afterTitle+14);
      doc.text('Periode: ' + periode, margin+8, afterTitle+26);
    } else {
      doc.text('Periode: ' + periode, margin+8, afterTitle+14);
    }
    doc.setFontSize(10);
    doc.text('Dicetak: ' + new Date().toLocaleDateString('id-ID',{weekday:'long',year:'numeric',month:'long',day:'numeric'}), margin+8, 140);

    // TOC
    doc.setFillColor(35,42,58);
    doc.roundedRect(margin+4, 165, W-margin*2-4, 100, 3, 3, 'F');
    doc.setTextColor(34, 211, 238);
    doc.setFontSize(11);
    doc.setFont('helvetica','bold');
    doc.text('DAFTAR ISI', margin+12, 180);
    doc.setFont('helvetica','normal');
    doc.setFontSize(10);
    doc.setTextColor(200,210,230);
    const toc = [
      '1. Ringkasan Keuangan','2. Jurnal Umum','3. Jurnal Kas',
      '4. Jurnal Penjualan','5. Jurnal Pembelian','6. Neraca Saldo',
      '7. Laporan Laba Rugi','8. Neraca (Balance Sheet)','9. Chart of Accounts'
    ];
    toc.forEach((t,i) => {
      const col = i < 5 ? 0 : 1;
      const row = i < 5 ? i : i-5;
      doc.text(t, margin+12 + col*90, 190 + row*10);
    });
  }

  function sectionHeader(title, subtitle='') {
    doc.addPage();
    y = margin;
    doc.setFillColor(...DARK);
    doc.rect(0, 0, W, 32, 'F');
    doc.setFillColor(...GREEN);
    doc.rect(0, 0, 5, 32, 'F');
    // Logo di pojok kanan header setiap halaman
    if(logoData) {
      doc.setFillColor(255,255,255);
      doc.roundedRect(W-margin-26, 2, 24, 28, 3, 3, 'F');
      drawLogo(W-margin-25, 3, 22, 26);
    }
    doc.setFont('helvetica','bold');
    doc.setFontSize(14);
    doc.setTextColor(255,255,255);
    doc.text(title, margin+4, 16);
    doc.setFontSize(8);
    doc.setTextColor(...GRAY.map(x=>x+80));
    doc.setFont('helvetica','normal');
    doc.text(nama + '  |  ' + periode, margin+4, 24);
    if(subtitle) doc.text(subtitle, logoData ? W-margin-30 : W-margin, 24, {align:'right'});
    y = 40;
  }

  function tableHeader(headers, colWidths) {
    doc.setFillColor(...DARK);
    doc.rect(margin, y, W-margin*2, 8, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.setTextColor(200,220,255);
    let x = margin+2;
    headers.forEach((h,i) => {
      doc.text(h, x, y+5.5, {maxWidth: colWidths[i]-2});
      x += colWidths[i];
    });
    y += 8;
  }

  function tableRow(cells, colWidths, bg=null, textColor=null) {
    if(y > 260) { doc.addPage(); y = margin; }
    if(bg) { doc.setFillColor(...bg); doc.rect(margin, y, W-margin*2, 7, 'F'); }
    doc.setFont('helvetica','normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...(textColor||[30,30,30]));
    let x = margin+2;
    cells.forEach((cell,i) => {
      const txt = cell===null||cell===undefined?'':String(cell);
      const align = i >= cells.length-2 && txt.match(/^[\d,Rp\s.()-]+$/) ? 'right' : 'left';
      doc.text(txt, align==='right' ? x+colWidths[i]-4 : x, y+5, {maxWidth:colWidths[i]-2, align});
      x += colWidths[i];
    });
    y += 7;
  }

  function totalRow(cells, colWidths) {
    doc.setFillColor(...BLUE.map(x=>Math.min(x+180,255)));
    doc.rect(margin, y, W-margin*2, 7, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...BLUE);
    let x = margin+2;
    cells.forEach((cell,i) => {
      const txt = cell===null||cell===undefined?'':String(cell);
      const align = i >= cells.length-2 ? 'right' : 'left';
      doc.text(txt, align==='right' ? x+colWidths[i]-4 : x, y+5, {maxWidth:colWidths[i]-2, align});
      x += colWidths[i];
    });
    y += 7;
  }

  function fmtRpPDF(n) { if(!n) return '-'; return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }

  // COVER
  addCover();

  // RINGKASAN
  if(document.getElementById('exp-dashboard')?.checked) {
    sectionHeader('RINGKASAN KEUANGAN', 'Dashboard');
    const saldoMap = computeSaldoAll();
    let tA=0,tL=0,tE=0,tP=0,tB=0;
    akuns.forEach(a=>{const s=saldoMap[a.kode]||{debit:0,kredit:0};const b=a.normal==='D'?s.debit-s.kredit:s.kredit-s.debit;if(a.tipe==='Aset')tA+=b;else if(a.tipe==='Liabilitas')tL+=b;else if(a.tipe==='Ekuitas')tE+=b;else if(a.tipe==='Pendapatan')tP+=b;else if(['Beban','HPP'].includes(a.tipe))tB+=b;});
    const tLB = tP-tB;
    const cards = [['Total Aset',tA,GREEN],['Total Pendapatan',tP,BLUE],['Total Beban',tB,RED],['Laba Bersih',tLB,tLB>=0?GREEN:RED]];
    const cW = (W-margin*2)/2 - 2;
    cards.forEach((card,i) => {
      const cx = margin + (i%2)*(cW+4);
      const cy = y + Math.floor(i/2)*22;
      doc.setFillColor(28,32,48);
      doc.roundedRect(cx, cy, cW, 18, 2, 2, 'F');
      doc.setFillColor(...card[2]);
      doc.rect(cx, cy, cW, 1.5, 'F');
      doc.setFont('helvetica','normal');
      doc.setFontSize(7);
      doc.setTextColor(...GRAY.map(x=>x+60));
      doc.text(card[0].toUpperCase(), cx+4, cy+7);
      doc.setFont('helvetica','bold');
      doc.setFontSize(11);
      doc.setTextColor(255,255,255);
      doc.text(fmtRpPDF(card[1]), cx+4, cy+15);
    });
    y += 50;
  }

  // JURNAL UMUM
  if(document.getElementById('exp-jurnal-umum')?.checked) {
    sectionHeader('JURNAL UMUM', `${jurnalEntries.length} entri`);
    const cols = [12,14,22,14,48,22,22];
    tableHeader(['No','Tanggal','No. Jurnal','Jenis','Akun','Debit','Kredit'], cols);
    let no=1, totalD=0, totalK=0;
    jurnalEntries.forEach((j,ji) => {
      j.lines.forEach((l,i) => {
        const bg = ji%2===0 ? null : [248,250,252];
        tableRow([
          i===0?no:'', i===0?j.tanggal:'', i===0?j.no:'', i===0?j.jenis:'',
          (l.debit?'':' ')+getAkunNama(l.akun),
          l.debit?fmtRpPDF(l.debit):'', l.kredit?fmtRpPDF(l.kredit):''
        ], cols, bg);
        totalD+=l.debit||0; totalK+=l.kredit||0;
      });
      no++;
    });
    totalRow(['','','','','TOTAL', fmtRpPDF(totalD), fmtRpPDF(totalK)], cols);
  }

  // JURNAL KAS
  if(document.getElementById('exp-jurnal-kas')?.checked) {
    sectionHeader('JURNAL KAS');
    const cols = [20,18,60,28,28,28];
    tableHeader(['Tanggal','No. Jurnal','Keterangan','Penerimaan','Pengeluaran','Saldo'], cols);
    let saldo=0, tI=0, tO=0, rowIdx=0;
    jurnalEntries.forEach(j => j.lines.forEach(l => {
      if(l.akun!=='1101'||(!(l.debit)&&!(l.kredit))) return;
      const masuk=l.debit||0, keluar=l.kredit||0;
      saldo+=masuk-keluar; tI+=masuk; tO+=keluar;
      tableRow([j.tanggal, j.no, j.ket, masuk?fmtRpPDF(masuk):'-', keluar?fmtRpPDF(keluar):'-', fmtRpPDF(saldo)], cols, rowIdx++%2===0?null:[248,250,252]);
    }));
    totalRow(['','','TOTAL', fmtRpPDF(tI), fmtRpPDF(tO), fmtRpPDF(saldo)], cols);
  }

  // JURNAL PENJUALAN
  if(document.getElementById('exp-jurnal-jual')?.checked) {
    const pjEntries = jurnalEntries.filter(j=>j.jenis==='Penjualan');
    sectionHeader('JURNAL PENJUALAN', `${pjEntries.length} transaksi`);
    const cols = [20,18,58,18,28,28];
    tableHeader(['Tanggal','No. Invoice','Keterangan','Metode','Dr (Kas/Piutang)','Kr (Penjualan)'], cols);
    let tD=0,tK=0,ri=0;
    pjEntries.forEach(j => {
      const kasLine=j.lines.find(l=>['1101','1201'].includes(l.akun));
      const jLine=j.lines.find(l=>l.akun==='4101');
      if(!jLine) return;
      tableRow([j.tanggal,j.ref||j.no,j.ket,kasLine?.akun==='1101'?'Tunai':'Kredit',fmtRpPDF(kasLine?.debit||0),fmtRpPDF(jLine?.kredit||0)],cols,ri++%2===0?null:[248,250,252]);
      tD+=kasLine?.debit||0; tK+=jLine?.kredit||0;
    });
    totalRow(['','','','TOTAL',fmtRpPDF(tD),fmtRpPDF(tK)],cols);
  }

  // JURNAL PEMBELIAN
  if(document.getElementById('exp-jurnal-beli')?.checked) {
    const pbEntries = jurnalEntries.filter(j=>j.jenis==='Pembelian');
    sectionHeader('JURNAL PEMBELIAN', `${pbEntries.length} transaksi`);
    const cols = [20,18,50,16,38,28];
    tableHeader(['Tanggal','No. Faktur','Keterangan','Metode','Akun Debit','Kr (Kas/Utang)'],cols);
    let tD=0,tK=0,ri=0;
    pbEntries.forEach(j=>{
      const krLine=j.lines.find(l=>['1101','2101'].includes(l.akun)&&l.kredit);
      const drLine=j.lines.find(l=>l.debit&&!['1101','2101'].includes(l.akun));
      if(!drLine) return;
      tableRow([j.tanggal,j.ref||j.no,j.ket,krLine?.akun==='1101'?'Tunai':'Kredit',getAkunNama(drLine.akun),fmtRpPDF(krLine?.kredit||0)],cols,ri++%2===0?null:[248,250,252]);
      tD+=drLine.debit; tK+=krLine?.kredit||0;
    });
    totalRow(['','','','','TOTAL',fmtRpPDF(tK)],cols);
  }

  // NERACA SALDO
  if(document.getElementById('exp-neraca-saldo')?.checked) {
    sectionHeader('NERACA SALDO');
    const cols = [16,72,28,28,28];
    tableHeader(['Kode','Nama Akun','Tipe','Debit','Kredit'],cols);
    const saldoMap = computeSaldoAll();
    let tD=0,tK=0,ri=0;
    akuns.forEach(a=>{
      const s=saldoMap[a.kode]||{debit:0,kredit:0};
      const d=a.normal==='D'&&s.debit>s.kredit?s.debit-s.kredit:0;
      const k=a.normal==='K'&&s.kredit>s.debit?s.kredit-s.debit:0;
      if(!d&&!k) return;
      tableRow([a.kode,a.nama,a.tipe,d?fmtRpPDF(d):'-',k?fmtRpPDF(k):'-'],cols,ri++%2===0?null:[248,250,252]);
      tD+=d; tK+=k;
    });
    totalRow(['','TOTAL','',fmtRpPDF(tD),fmtRpPDF(tK)],cols);
    y+=4;
    const balanced = Math.abs(tD-tK)<1;
    doc.setFont('helvetica','bold'); doc.setFontSize(9);
    doc.setTextColor(...(balanced?GREEN:RED));
    doc.text(balanced?'✓ NERACA SALDO BALANCE':'✗ TIDAK BALANCE — Selisih: '+fmtRpPDF(Math.abs(tD-tK)), margin, y);
    y+=8;
  }

  // LABA RUGI
  if(document.getElementById('exp-laba-rugi')?.checked) {
    sectionHeader('LAPORAN LABA RUGI');
    let tP=0,tH=0,tB=0;
    const pRows=[],hRows=[],bRows=[];
    akuns.forEach(a=>{const s=computeSaldoBersih(a.kode);if(!s)return;if(a.tipe==='Pendapatan'){tP+=s;pRows.push([a.nama,s]);}if(a.tipe==='HPP'){tH+=s;hRows.push([a.nama,s]);}if(a.tipe==='Beban'){tB+=s;bRows.push([a.nama,s]);}});
    const labaK=tP-tH, labaB=labaK-tB;
    const sect = (title,rows,total,color) => {
      if(y>250){doc.addPage();y=margin;}
      doc.setFont('helvetica','bold');doc.setFontSize(9);doc.setTextColor(...color);
      doc.text(title, margin, y); y+=8;
      doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(50,50,50);
      rows.forEach(([n,v])=>{ doc.text('    '+n,margin,y);doc.text(fmtRpPDF(v),W-margin,y,{align:'right'});y+=6;if(y>260){doc.addPage();y=margin;} });
      doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.setFillColor(...color.map(x=>Math.min(x+180,255)));
      doc.rect(margin,y,W-margin*2,7,'F');doc.setTextColor(...color);
      doc.text('Total '+title,margin+2,y+5);doc.text(fmtRpPDF(total),W-margin-2,y+5,{align:'right'});y+=12;
    };
    sect('Pendapatan',pRows,tP,BLUE); sect('HPP',hRows,tH,RED);
    doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setFillColor(...BLUE.map(x=>Math.min(x+160,255)));
    doc.rect(margin,y,W-margin*2,9,'F');doc.setTextColor(...BLUE);
    doc.text('LABA KOTOR',margin+2,y+6.5);doc.text(fmtRpPDF(labaK),W-margin-2,y+6.5,{align:'right'});y+=14;
    sect('Beban Operasional',bRows,tB,RED);
    doc.setFont('helvetica','bold');doc.setFontSize(13);
    const lbColor = labaB>=0?GREEN:RED;
    doc.setFillColor(...lbColor.map(x=>Math.min(x+160,255)));
    doc.rect(margin,y,W-margin*2,10,'F');doc.setTextColor(...lbColor);
    doc.text('LABA BERSIH',margin+2,y+7);doc.text(fmtRpPDF(labaB),W-margin-2,y+7,{align:'right'});y+=12;
  }

  // NERACA (rewritten — proper page breaks, single column)
  if(document.getElementById('exp-neraca')?.checked) {
    sectionHeader('NERACA (BALANCE SHEET)');

    // Compute laba bersih from P&L
    const labaBersih2 = (() => {
      let p=0, b=0;
      akuns.forEach(a => {
        const s = computeSaldoBersih(a.kode);
        if(a.tipe==='Pendapatan') p += s;
        if(['Beban','HPP'].includes(a.tipe)) b += s;
      });
      return p - b;
    })();

    let tA2=0, tL2=0, tE2=0;
    const aR2=[], lR2=[], eR2=[];

    // Only include accounts with non-zero balance OR show all? Show only non-zero for clean PDF
    akuns.forEach(a => {
      const s = computeSaldoBersih(a.kode);
      if(a.tipe==='Aset') {
        tA2 += s;
        if(s !== 0) aR2.push([a.nama, s]);
      }
      if(a.tipe==='Liabilitas') {
        tL2 += s;
        if(s !== 0) lR2.push([a.nama, s]);
      }
      if(a.tipe==='Ekuitas') {
        tE2 += s;
        if(s !== 0) eR2.push([a.nama, s]);
      }
    });

    const CW = W - margin*2;
    const checkY2 = (need=8) => {
      if(y + need > 272) {
        doc.addPage();
        y = margin;
        // Mini header on continuation pages
        doc.setFillColor(...DARK);
        doc.rect(0, 0, W, 10, 'F');
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        doc.setTextColor(180,180,180);
        doc.text(nama, margin, 7);
        doc.text('Neraca (Balance Sheet) — lanjutan', W/2, 7, {align:'center'});
        y = 16;
      }
    };

    // Helper: print a neraca section
    const neracaBlock = (title, rows, totalLabel, totalVal, headerBg, totalTextColor) => {
      checkY2(16);

      // Header bar
      doc.setFillColor(...headerBg);
      doc.rect(margin, y, CW, 8, 'F');
      doc.setFont('helvetica','bold');
      doc.setFontSize(9);
      doc.setTextColor(255, 255, 255);
      doc.text(title, margin+4, y+5.5);
      y += 10; // y now points BELOW the header bar

      if(rows.length === 0) {
        checkY2(7);
        doc.setFont('helvetica','italic');
        doc.setFontSize(8);
        doc.setTextColor(150,150,150);
        doc.text('   (tidak ada saldo)', margin, y+4.5);
        y += 7;
      } else {
        // Rows
        doc.setFont('helvetica','normal');
        doc.setFontSize(8);
        rows.forEach(([n, v]) => {
          checkY2(6);
          const shortName = n.length > 50 ? n.slice(0,48)+'...' : n;
          const isContra = n.toLowerCase().includes('akumulasi') || n.toLowerCase().includes('cadangan');
          doc.setTextColor(isContra ? 120 : 40, 40, 40);
          doc.text((isContra ? '      ↳ ' : '   ') + shortName, margin, y+4);
          const valStr = v === 0 ? '-' : fmtRpPDF(Math.abs(v));
          doc.setTextColor(v < 0 ? 200 : 40, 40, 40);
          doc.text(valStr, W-margin, y+4, {align:'right'});
          y += 6;
        });
      }

      // Thin separator
      doc.setDrawColor(...headerBg);
      doc.setLineWidth(0.3);
      doc.line(margin, y+1, W-margin, y+1);
      y += 4;

      // Total bar
      checkY2(9);
      doc.setFillColor(...headerBg.map(x => Math.min(x+185, 255)));
      doc.rect(margin, y, CW, 8, 'F');
      doc.setFont('helvetica','bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...totalTextColor);
      doc.text(totalLabel, margin+4, y+5.5);
      doc.text(fmtRpPDF(totalVal), W-margin-2, y+5.5, {align:'right'});
      y += 12;
    };

    // Print sections
    neracaBlock('ASET', aR2, 'TOTAL ASET', tA2, DARK, BLUE);
    neracaBlock('LIABILITAS', lR2, 'TOTAL LIABILITAS', tL2, [160,28,28], RED);

    // Ekuitas — add laba periode
    const eRows2full = [...eR2];
    if(labaBersih2 !== 0) eRows2full.push(['Laba Periode Berjalan', labaBersih2]);
    neracaBlock('EKUITAS', eRows2full, 'TOTAL EKUITAS', tE2+labaBersih2, [22,78,196], BLUE);

    // Grand total
    checkY2(10);
    doc.setFillColor(...BLUE.map(x=>Math.min(x+130,255)));
    doc.rect(margin, y, CW, 9, 'F');
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.setTextColor(...BLUE);
    doc.text('TOTAL LIABILITAS + EKUITAS', margin+4, y+6);
    doc.text(fmtRpPDF(tL2+tE2+labaBersih2), W-margin-2, y+6, {align:'right'});
    y += 13;

    // Balance check — use total debit vs kredit from journals
    let chkD=0, chkK=0;
    jurnalEntries.forEach(j=>j.lines.forEach(l=>{chkD+=l.debit||0;chkK+=l.kredit||0;}));
    const balanced2 = Math.abs(chkD - chkK) < 1;
    checkY2(8);
    const balColor = balanced2 ? GREEN : RED;
    doc.setFont('helvetica','bold');
    doc.setFontSize(9);
    doc.setTextColor(...balColor);
    doc.text(balanced2 ? '✓  NERACA BALANCE' : '✗  PERIKSA JURNAL — ADA SELISIH: '+fmtRpPDF(Math.abs(chkD-chkK)), margin, y);
    y += 10;
  }

  // COA
  if(document.getElementById('exp-coa')?.checked) {
    sectionHeader('CHART OF ACCOUNTS', `${akuns.length} akun`);
    const cols=[16,58,22,18,22,36];
    tableHeader(['Kode','Nama Akun','Tipe','Kategori','Normal','Saldo Saat Ini'],cols);
    const saldoMap=computeSaldoAll();
    akuns.forEach((a,i)=>{
      const s=saldoMap[a.kode]||{debit:0,kredit:0};
      const b=a.normal==='D'?s.debit-s.kredit:s.kredit-s.debit;
      tableRow([a.kode,a.nama,a.tipe,a.kat||'-',a.normal==='D'?'Debit':'Kredit',fmtRpPDF(b)],cols,i%2===0?null:[248,250,252]);
    });
  }

  // PAGE NUMBERS
  const pageCount = doc.getNumberOfPages();
  for(let i=1;i<=pageCount;i++) {
    doc.setPage(i);
    if(i===1) continue;
    doc.setFillColor(28,32,48);
    doc.rect(0,287,W,10,'F');
    doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(150,170,200);
    doc.text(nama+' | '+periode, margin, 293);
    doc.text(`Halaman ${i} dari ${pageCount}`, W-margin, 293, {align:'right'});
  }

  const fn = `BHP_${nama.replace(/\s+/g,'_')}_${periode.replace(/\s+/g,'_')}.pdf`;
  doc.save(fn);
  expStatus(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> PDF berhasil diunduh: <b>${fn}</b><br><span style="font-size:11px">${pageCount} halaman</span>`);
}

// CSV EXPORT (Google Sheets compatible)
function exportCSV(nama, periode) {
  const zip_parts = [];

  function makeCSV(headers, rows) {
    const escape = v => {
      const s = String(v===null||v===undefined?'':v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? '"'+s.replace(/"/g,'""')+'"' : s;
    };
    return [headers.map(escape).join(','), ...rows.map(r=>r.map(escape).join(','))].join('\n');
  }

  // Since we can't create a real ZIP in browser without JSZip, we'll export each as separate CSV
  // and bundle them as a single multi-section CSV with separators
  const sections = [];

  sections.push(`OAS Export — ${nama} — ${periode}\nDicetak: ${new Date().toLocaleDateString('id-ID')}\n`);

  // Jurnal Umum
  if(document.getElementById('exp-jurnal-umum')?.checked) {
    const rows = [];
    jurnalEntries.forEach(j => j.lines.forEach((l,i) => {
      rows.push([i===0?j.tanggal:'', i===0?j.no:'', i===0?j.ket:'', i===0?j.jenis:'', getAkunNama(l.akun), l.debit||0, l.kredit||0]);
    }));
    sections.push('=== JURNAL UMUM ===');
    sections.push(makeCSV(['Tanggal','No Jurnal','Keterangan','Jenis','Akun','Debit','Kredit'], rows));
  }

  if(document.getElementById('exp-jurnal-kas')?.checked) {
    const rows = []; let saldo=0;
    jurnalEntries.forEach(j=>j.lines.forEach(l=>{if(l.akun!=='1101'||(!l.debit&&!l.kredit))return;saldo+=(l.debit||0)-(l.kredit||0);rows.push([j.tanggal,j.no,j.ket,l.debit||0,l.kredit||0,saldo]);}));
    sections.push('\n=== JURNAL KAS ===');
    sections.push(makeCSV(['Tanggal','No Jurnal','Keterangan','Penerimaan','Pengeluaran','Saldo'],rows));
  }

  if(document.getElementById('exp-neraca-saldo')?.checked) {
    const saldoMap=computeSaldoAll();
    const rows=akuns.map(a=>{const s=saldoMap[a.kode]||{debit:0,kredit:0};const d=a.normal==='D'&&s.debit>s.kredit?s.debit-s.kredit:0;const k=a.normal==='K'&&s.kredit>s.debit?s.kredit-s.debit:0;return[a.kode,a.nama,a.tipe,d,k];}).filter(r=>r[3]||r[4]);
    sections.push('\n=== NERACA SALDO ===');
    sections.push(makeCSV(['Kode','Nama Akun','Tipe','Debit','Kredit'],rows));
  }

  if(document.getElementById('exp-laba-rugi')?.checked) {
    const rows=[]; let tP=0,tH=0,tB=0;
    akuns.forEach(a=>{const s=computeSaldoBersih(a.kode);if(!s)return;if(a.tipe==='Pendapatan'){tP+=s;rows.push([a.nama,'Pendapatan',s,'','']);}if(a.tipe==='HPP'){tH+=s;rows.push([a.nama,'HPP','',s,'']);}if(a.tipe==='Beban'){tB+=s;rows.push([a.nama,'Beban','',s,'']);}});
    rows.push(['LABA BERSIH','',tP-tH-tB,'','']);
    sections.push('\n=== LAPORAN LABA RUGI ===');
    sections.push(makeCSV(['Nama Akun','Kategori','Pendapatan','Beban','Laba Bersih'],rows));
  }

  if(document.getElementById('exp-coa')?.checked) {
    const saldoMap=computeSaldoAll();
    const rows=akuns.map(a=>{const s=saldoMap[a.kode]||{debit:0,kredit:0};const b=a.normal==='D'?s.debit-s.kredit:s.kredit-s.debit;return[a.kode,a.nama,a.tipe,a.kat||'',a.normal==='D'?'Debit':'Kredit',b];});
    sections.push('\n=== CHART OF ACCOUNTS ===');
    sections.push(makeCSV(['Kode','Nama Akun','Tipe','Kategori','Normal','Saldo'],rows));
  }

  const content = sections.join('\n');
  const blob = new Blob(['\uFEFF'+content], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href=url; a.download=`BHP_${nama.replace(/\s+/g,'_')}.csv`;
  a.click(); URL.revokeObjectURL(url);
  expStatus('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> CSV berhasil diunduh! Import ke Google Sheets via File → Import → Upload.');
}

// AI ACTION EXECUTOR
async function executeAIActions(actions) {
  const results = [];
  const today = new Date().toISOString().split('T')[0];

  for(const action of actions) {
    try {
      switch(action.type) {

        case 'addJurnal': {
          const entry = {
            tanggal: action.tanggal || today,
            ket: action.ket || 'Dari AI',
            jenis: action.jenis || 'Manual',
            lines: action.lines || []
          };
          // Validate balance
          const td = entry.lines.reduce((s,l)=>s+(l.debit||0),0);
          const tk = entry.lines.reduce((s,l)=>s+(l.kredit||0),0);
          if(Math.abs(td-tk) > 1) {
            results.push(`<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal "${entry.ket}" tidak balance (Dr:${rp(td)} ≠ Kr:${rp(tk)}) — dilewati`);
            break;
          }
          addJurnal(entry);
          renderDashboard();
          results.push(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal disimpan: <b>${entry.ket}</b> — ${entry.lines.length} baris (${rp(td)})`);
          break;
        }

        case 'navigate': {
          const page = action.page;
          if(page) {
            showPage(page);
            const names = { dashboard:'Dashboard', transaksi:'Transaksi',
              'jurnal-umum':'Jurnal Umum', 'jurnal-kas':'Jurnal Kas',
              'jurnal-penjualan':'Jurnal Penjualan', 'jurnal-pembelian':'Jurnal Pembelian',
              'buku-besar':'Buku Besar', 'neraca-saldo':'Neraca Saldo',
              'laba-rugi':'Laba Rugi', neraca:'Neraca', akun:'Chart of Accounts',
              'kalk-penyusutan':'Kalkulator Penyusutan', 'kalk-persediaan':'Kalkulator Persediaan',
              'kalk-bunga':'Kalkulator Bunga', 'kalk-rasio':'Kalkulator Rasio',
              'kalk-bep':'Kalkulator BEP', 'kalk-ppn':'Kalkulator PPN & PPh' };
            results.push(`↔ Berpindah ke: <b>${names[page]||page}</b>`);
          }
          break;
        }

        case 'fillKalkPenyusutan': {
          showPage('kalk-penyusutan');
          await sleep(150);
          if(action.nama) setVal('py-nama', action.nama);
          if(action.cost) setVal('py-cost', action.cost);
          if(action.sisa !== undefined) setVal('py-sisa', action.sisa);
          if(action.umur) setVal('py-umur', action.umur);
          if(action.metode) setSelectVal('py-metode', action.metode);
          if(action.totalUnit) setVal('py-total-unit', action.totalUnit);
          hitungPenyusutan();
          results.push(`<i class="ti ti-chart-bar ti-inline"></i> Kalkulator penyusutan diisi: <b>${action.nama||'Aset'}</b> Rp ${(action.cost||0).toLocaleString('id-ID')}, ${action.umur} tahun, metode ${action.metode||'garis-lurus'}`);
          break;
        }

        case 'fillKalkBEP': {
          showPage('kalk-bep');
          await sleep(150);
          if(action.harga) setVal('bep-harga', action.harga);
          if(action.bv !== undefined) setVal('bep-bv', action.bv);
          if(action.bt) setVal('bep-bt', action.bt);
          if(action.vol) setVal('bep-vol', action.vol);
          if(action.target) setVal('bep-target', action.target);
          hitungBEP();
          const cm = (action.harga||0)-(action.bv||0);
          const bep = cm>0 ? Math.ceil((action.bt||0)/cm) : 0;
          results.push(`[BEP] Kalkulator BEP diisi: Harga Rp ${(action.harga||0).toLocaleString('id-ID')}, BV Rp ${(action.bv||0).toLocaleString('id-ID')}, BT Rp ${(action.bt||0).toLocaleString('id-ID')} → BEP = <b>${bep.toLocaleString('id-ID')} unit</b>`);
          break;
        }

        case 'fillKalkAnuitas': {
          showPage('kalk-bunga');
          await sleep(200);
          // Switch to anuitas tab
          const anuitasTab = document.querySelector('#bunga-tabs .tab:nth-child(2)');
          if(anuitasTab) { switchBungaTab('anuitas', anuitasTab); }
          await sleep(100);
          if(action.pokok) setVal('an-pokok', action.pokok);
          if(action.rate) setVal('an-rate', action.rate);
          if(action.tenor) setVal('an-tenor', action.tenor);
          if(action.jenis) setSelectVal('an-jenis', action.jenis);
          if(action.dp) setVal('an-dp', action.dp);
          hitungAnuitas();
          results.push(`[Bunga] Kalkulator anuitas diisi: Pokok Rp ${(action.pokok||0).toLocaleString('id-ID')}, ${action.rate}%/tahun, ${action.tenor} bulan`);
          break;
        }

        case 'fillKalkPPN': {
          showPage('kalk-ppn');
          await sleep(200);
          const ppnTab = document.querySelector('#pajak-tabs .tab:first-child');
          if(ppnTab) switchPajakTab('ppn', ppnTab);
          await sleep(100);
          if(action.nilai) setVal('ppn-nilai', action.nilai);
          if(action.tarif) setSelectVal('ppn-tarif', action.tarif);
          if(action.mode) setSelectVal('ppn-mode', action.mode);
          hitungPPN();
          const ppn = (action.nilai||0) * (parseFloat(action.tarif)||12)/100;
          results.push(`[Invoice] Kalkulator PPN diisi: DPP Rp ${(action.nilai||0).toLocaleString('id-ID')} → PPN = <b>Rp ${Math.round(ppn).toLocaleString('id-ID')}</b>`);
          break;
        }

        case 'fillKalkPPH21': {
          showPage('kalk-ppn');
          await sleep(200);
          const pph21Tab = document.querySelectorAll('#pajak-tabs .tab')[1];
          if(pph21Tab) switchPajakTab('pph21', pph21Tab);
          await sleep(100);
          if(action.gaji) setVal('p21-gaji', action.gaji);
          if(action.tunjangan) setVal('p21-tunjangan', action.tunjangan);
          if(action.ptkp) setSelectVal('p21-ptkp', action.ptkp);
          if(action.bonus) setVal('p21-bonus', action.bonus);
          hitungPPh21();
          results.push(`👤 Kalkulator PPh 21 diisi: Gaji Rp ${(action.gaji||0).toLocaleString('id-ID')}, PTKP ${action.ptkp||'TK0'}`);
          break;
        }

        case 'addAkun': {
          if(!action.kode || !action.nama) break;
          if(akuns.find(a=>a.kode===action.kode)) {
            results.push(`ℹ️ Akun ${action.kode} sudah ada`);
            break;
          }
          const normal = ['Aset','Beban','HPP'].includes(action.tipe) ? 'D' : 'K';
          akuns.push({kode:action.kode, nama:action.nama, tipe:action.tipe||'Beban', kat:action.kat||'', normal});
          akuns.sort((a,b)=>a.kode.localeCompare(b.kode));
          results.push(`🗂️ Akun baru ditambahkan: <b>${action.kode} - ${action.nama}</b>`);
          break;
        }

        case 'showAlert': {
          showAlert(action.msg || '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Selesai');
          // Don't add to results to avoid duplicate
          break;
        }

        default:
          results.push(`<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Aksi tidak dikenal: ${action.type}`);
      }
    } catch(e) {
      results.push(`❌ Error pada aksi ${action.type}: ${e.message}`);
    }
  }
  return results;
}
