
// SIDEBAR TOGGLE — didefinisikan awal agar onclick bisa akses
function toggleSidebar(){
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('sidebar-overlay').classList.toggle('open');
}
function closeSidebar(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('open');
}

// BACK BUTTON NAVIGATION — DIPINDAH dari 05-akun.js (harus ada SEBELUM dipakai
// di file ini; 04 load duluan sebelum 05, jadi kalau deklarasinya masih di 05
// bakal ReferenceError: inIframe/pageHistory/isNavigating is not defined)
let pageHistory = ['dashboard'];
let isNavigating = false;

// Detect if running inside iframe (Claude preview / srcdoc)
const inIframe = (() => {
  try { return window.self !== window.top; } catch(e) { return true; }
})();

// NAVIGATION
const pageTitles = {
  'rekonsiliasi-bank': ['Rekonsiliasi Bank','Upload & cocokkan mutasi bank'],
  'dashboard':['Dashboard','Ringkasan keuangan bisnis Anda'],
  'transaksi':['Input Transaksi','Tambah transaksi baru'],
  'jurnal-umum':['Jurnal Umum','Semua entri jurnal'],
  'jurnal-kas':['Jurnal Kas','Penerimaan dan pengeluaran kas'],
  'jurnal-penjualan':['Jurnal Penjualan','Transaksi penjualan'],
  'jurnal-pembelian':['Jurnal Pembelian','Transaksi pembelian'],
  'buku-besar':['Buku Besar','Mutasi per akun'],
  'neraca-saldo':['Neraca Saldo','Saldo semua akun'],
  'laba-rugi':['Laporan Laba Rugi','Pendapatan & beban'],
  'neraca':['Neraca','Posisi keuangan'],
  'akun':['Chart of Accounts','Daftar akun'],
  'kalk-penyusutan':['Penyusutan Aset','Garis Lurus · Saldo Menurun · SYD · Unit Produksi'],
  'kalk-persediaan':['Persediaan','FIFO · LIFO · Weighted Average · Moving Average'],
  'kalk-bunga':['Bunga & Anuitas','Bunga Tunggal · Majemuk · Cicilan · PV/FV'],
  'kalk-rasio':['Rasio Keuangan','Likuiditas · Solvabilitas · Profitabilitas · Aktivitas'],
  'kalk-bep':['BEP & Margin','Break Even · Contribution Margin · Margin of Safety'],
  'kalk-ppn':['PPN & PPh','PPN 12% · PPh 21 · PPh 23 · PPh Badan'],
  'ai-assistant':['Orias Assisten','Asisten keuangan berbasis AI'],
  'tutorial':['Tutorial','Panduan penggunaan software langkah demi langkah'],
  'analitik':['Analitik & Tren Bisnis','Pendapatan · Laba · Arus Kas · Posisi Keuangan · Proyeksi'],
  // Fitur Baru
  'jurnal-berulang':['Jurnal Berulang','Otomasi transaksi rutin · Gaji · Sewa · Cicilan'],
  'invoice':['Invoice & Piutang','Buat invoice · Lacak pembayaran · Jurnal otomatis'],
  'rekonsiliasi':['Rekonsiliasi Bank','Cocokkan mutasi bank dengan jurnal · Upload CSV'],
  'kurs':['Multi Mata Uang','Kurs otomatis · Konversi transaksi · History kurs'],
  'notifikasi':['Notifikasi & Alert','Peringatan otomatis · Batas anggaran · Jatuh tempo'],
  'anggaran':['Anggaran vs Aktual','Target per akun · Monitoring realisasi · Variance'],
  'pajak':['Pajak Otomatis','PPN 12% · PPh 21 · PPh 23 · Laporan SPT'],
  'arus-kas':['Laporan Arus Kas','Metode Tidak Langsung · PSAK 2'],
  'perubahan-ekuitas':['Laporan Perubahan Ekuitas','Mutasi modal pemilik · PSAK 1'],
  'produk':['Master Produk','Daftar produk & layanan · Stok · Harga'],
  'aset-tetap':['Register Aset Tetap','Daftar aset · Penyusutan otomatis · Nilai buku'],
  'kontak':['Master Kontak','Pelanggan & Supplier · Histori transaksi'],
  'audit-trail':['Audit Trail','Riwayat aktivitas · Role pengguna · Siapa · Kapan'],
};

function showPage(id) {
  // Cek permission sebelum buka halaman (kecuali dashboard)
  if (id !== 'dashboard' && !isAdmin() && typeof hasPerm === 'function') {
    if (!hasPerm(id, 'read')) {
      showAlert('⛔ Akses ditolak.\n\nKamu tidak punya izin untuk membuka modul ini.\nHubungi admin untuk mengatur ulang hak akses.');
      return;
    }
  }
  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
    p.style.display = 'none';
  });
  // Handle both old nav-item and new nav-card
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.nav-card').forEach(n => n.classList.remove('active'));
  const _activePage = document.getElementById('page-'+id);
  if (_activePage) {
    _activePage.classList.add('active');
    _activePage.style.display = (id === 'audit-trail') ? 'flex' : 'block';
  }
  // Set active nav-item (legacy)
  document.querySelectorAll('.nav-item').forEach(n => {
    const oc = n.getAttribute('onclick') || '';
    if(oc === `showPage('${id}')`) n.classList.add('active');
  });
  // Set active nav-card by data-page attribute
  document.querySelectorAll('.nav-card[data-page]').forEach(n => {
    if(n.dataset.page === id) n.classList.add('active');
  });
  // History tracking (inline — no wrapper to avoid recursion)
  if(typeof isNavigating !== 'undefined' && !isNavigating && typeof pageHistory !== 'undefined') {
    safeHistoryPush({ page: id }, '', '#' + id);
    if(pageHistory[pageHistory.length - 1] !== id) pageHistory.push(id);
  }
  const t = pageTitles[id] || [id, ''];
  document.getElementById('page-title').textContent = t[0];
  document.getElementById('page-sub').textContent = t[1];
  currentPage = id;
  // Render
  if(id==='dashboard') { renderDashboard(); setTimeout(upgradeFormPickers, 150); }
  if(id==='ai-assistant') { updateAIKeyStatus(); initChipsState(); }
  // Setup number inputs for calculator pages
  if(id && id.startsWith('kalk')) setTimeout(() => { setupNumberInputs(); upgradeFormPickers(); upgradePajakPickers(); }, 300);
  if(id==='jurnal-umum') { renderJurnalUmum(); setTimeout(upgradeFormPickers, 80); }
  if(id==='rekonsiliasi-bank') { setTimeout(upgradeFormPickers, 80); }
  if(id==='jurnal-kas') { renderJurnalKas(); setTimeout(upgradeFormPickers, 80); }
  if(id==='jurnal-penjualan') { renderJurnalPenjualan(); setTimeout(upgradeFormPickers, 80); }
  if(id==='jurnal-pembelian') { renderJurnalPembelian(); setTimeout(upgradeFormPickers, 80); }
  if(id==='buku-besar') { renderBukuBesar(); setTimeout(upgradeFormPickers, 80); }
  if(id==='neraca-saldo') renderNeracaSaldo();
  if(id==='laba-rugi') { renderLabaRugi(); setTimeout(addPeriodFilterToReports,80); }
  if(id==='neraca-saldo') setTimeout(addPeriodFilterToReports,80);
  if(id==='neraca') renderNeraca();
  if(id==='arus-kas') { renderArusKas(); setTimeout(upgradeFormPickers, 80); }
  if(id==='perubahan-ekuitas') { renderPerubahanEkuitas(); setTimeout(upgradeFormPickers, 80); }
  if(id==='aset-tetap') setTimeout(()=>{ renderAsetTetap(); renderAsetTetapKPI(); upgradeFormPickers(); }, 80);
  if(id==='kontak') setTimeout(()=>{ renderKontak(); renderKontakKPI(); upgradeFormPickers(); }, 80);
  if(id==='kalk-persediaan') setTimeout(()=>{
    // Pastikan activeKartuStockId/activeKategoriId terisi dan data di-sync sebelum render
    if(!activeKartuStockId) {
      const firstCard = Object.values(multiKartuStock)[0];
      if(firstCard) {
        activeKartuStockId = firstCard.id;
        activeKategoriId = firstCard.kategori ? Object.keys(firstCard.kategori)[0] : null;
      }
    }
    if(!activeKategoriId && activeKartuStockId) {
      const card = multiKartuStock[activeKartuStockId];
      if(card?.kategori) activeKategoriId = Object.keys(card.kategori)[0];
    }
    syncKartuStockDataFromKategori();
    renderKartuStockSelector();
    renderKartuStock();
    upgradeFormPickers();
    // Fix sticky header setelah semua render selesai
    fixKsTableStickyHeaders();
  }, 80);
  if(id==='akun') { renderAkun(); setTimeout(upgradeFormPickers, 80); }
  if(id==='transaksi') { initTransaksiForm(); setTimeout(() => { upgradeFormPickers(); refreshKontakPickers(); }, 80); }
  if(id==='analitik') setTimeout(renderAnalitik, 80);
  // Fitur Baru
  if(id==='jurnal-berulang') setTimeout(()=>{ renderJurnalBerulang(); upgradeFormPickers(); }, 80);
  if(id==='invoice') setTimeout(()=>{ renderInvoiceList(); renderInvoiceKPI(); upgradeFormPickers(); }, 80);
  if(id==='rekonsiliasi') setTimeout(upgradeFormPickers, 80);
  if(id==='kurs') setTimeout(()=>{ renderKursPage(); upgradeFormPickers(); }, 80);
  if(id==='notifikasi') setTimeout(()=>{ renderNotifikasiPage(); upgradeFormPickers(); }, 80);
  if(id==='anggaran') setTimeout(()=>{ renderAnggaranPage(); upgradeFormPickers(); }, 80);
  if(id==='pajak') setTimeout(()=>{ renderPajakOtomatis(); }, 60);
}

function handleAddBtn() {
  showPage('transaksi');
}

// TABS
function switchTab(group, tab) {
  document.querySelectorAll('.trx-tab').forEach(t => t.style.display='none');
  document.getElementById(`${group}-${tab}`).style.display='block';
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  if(tab==='umum') initManualLines();
  if(tab==='penjualan') initJualAkunPendapatan();
  if(tab==='simpel') {
    // tanggal tidak auto-fill — user wajib pilih sendiri
  }
}

// AKUN DROPDOWN
function populateAkunSelect(selId, filter=null) {
  // Jika elemen adalah hidden input (pakai picker), skip — nilai diset via picker
  const el = document.getElementById(selId);
  if(!el || el.type === 'hidden') return;
  el.innerHTML = '';
  akuns.filter(a => !filter || filter(a)).forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.kode;
    opt.textContent = `${escapeHtml(a.kode)} - ${escapeHtml(a.nama)}`;
    el.appendChild(opt);
  });
}

// Safe history wrapper — silently skip if inside iframe
function safeHistoryPush(state, title, url) {
  if(inIframe) return;
  try { history.pushState(state, title, url); } catch(e) { /* blocked in iframe */ }
}
function safeHistoryReplace(state, title, url) {
  if(inIframe) return;
  try { history.replaceState(state, title, url); } catch(e) { /* blocked in iframe */ }
}

// Wrap showPage to track history
// showPage history tracking inlined into original function

// Handle browser back/forward + Android back button
if(!inIframe) {
  window.addEventListener('popstate', (e) => {
    isNavigating = true;
    if(e.state && e.state.page) {
      showPage(e.state.page);
      const idx = pageHistory.lastIndexOf(e.state.page);
      if(idx >= 0) pageHistory = pageHistory.slice(0, idx + 1);
    } else if(pageHistory.length > 1) {
      pageHistory.pop();
      const prev = pageHistory[pageHistory.length - 1];
      showPage(prev);
      safeHistoryPush({ page: prev }, '', '#' + prev);
    } else {
      safeHistoryPush({ page: 'dashboard' }, '', '#dashboard');
      showPage('dashboard');
    }
    isNavigating = false;
  });

  window.addEventListener('load', () => {
    const hash = window.location.hash.replace('#', '');
    const validPages = ['dashboard','transaksi','jurnal-umum','jurnal-kas','jurnal-penjualan',
      'jurnal-pembelian','buku-besar','neraca-saldo','laba-rugi','neraca','akun',
      'kalk-penyusutan','kalk-persediaan','kalk-bunga','kalk-rasio','kalk-bep','kalk-ppn',
      'ai-assistant','tutorial','analitik'];
    if(hash && validPages.includes(hash)) {
      showPage(hash);
    }
    const current = hash && validPages.includes(hash) ? hash : 'dashboard';
    safeHistoryReplace({ page: current }, '', '#' + current);
    pageHistory = [current];
  });
}

// THEME SYSTEM
const THEME_KEY = 'oas_theme';

function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if(saved) {
    applyTheme(saved);
  } else {
    // Ikuti preferensi sistem perangkat
    const preferLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(preferLight ? 'light' : 'dark');
  }
}

function applyTheme(mode) {
  if (mode !== 'light' && mode !== 'dark') mode = 'dark';
  const body = document.body;
  const thumb = document.getElementById('theme-thumb');
  const navIcon = document.getElementById('theme-nav-icon');
  const navLabel = document.getElementById('theme-nav-label');
  const sunSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>`;
  const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`;
  if(mode === 'light') {
    body.classList.add('light-mode');
    if(thumb) thumb.innerHTML = sunSVG;
    if(navIcon) navIcon.innerHTML = sunSVG;
    if(navLabel) navLabel.textContent = 'Tema Terang';
  } else {
    body.classList.remove('light-mode');
    if(thumb) thumb.innerHTML = moonSVG;
    if(navIcon) navIcon.innerHTML = moonSVG;
    if(navLabel) navLabel.textContent = 'Tema Gelap';
  }
  localStorage.setItem(THEME_KEY, mode);
  syncPwaThemeChrome(mode);
  // renderChart() baru didefinisikan di 13-analitik-dashboard.js (load ke-13,
  // setelah file ini). applyTheme() ini juga dipanggil ulang tiap user toggle
  // tema (bukan cuma sekali saat load), jadi TIDAK bisa dipindah kayak fix
  // lain — dikasih guard typeof biar gak ReferenceError pas initTheme() jalan
  // duluan sebelum file 13 ke-load; setelah semua file ke-load, guard ini
  // otomatis lolos dan renderChart() tetap jalan normal tiap ganti tema.
  if (typeof renderChart === 'function') setTimeout(renderChart, 50);
}

// Selaraskan meta theme-color, color-scheme, dan manifest dinamis dengan tema aktif.
// Dipanggil setiap kali tema berubah (bukan cuma saat load awal) agar status bar /
// splash screen PWA konsisten dengan tema yang dipilih user.
function syncPwaThemeChrome(mode) {
  try {
    const isLight = mode === 'light';
    const bg = isLight ? '#f8fafc' : '#0d0f14';
    const metaTC = document.getElementById('meta-theme-color');
    if (metaTC) metaTC.setAttribute('content', bg);
    const metaCS = document.getElementById('meta-color-scheme');
    if (metaCS) metaCS.setAttribute('content', isLight ? 'light' : 'dark');

    fetch('manifest.json', { cache: 'no-store' }).then(r => r.json()).then(m => {
      m.background_color = bg;
      m.theme_color = bg;
      const baseDir = location.origin + location.pathname.replace(/[^\/]*$/, '');
      const abs = p => { try { return new URL(p, baseDir).href; } catch(e) { return p; } };
      if (m.start_url) m.start_url = abs(m.start_url);
      if (m.scope) m.scope = abs(m.scope);
      if (Array.isArray(m.icons)) m.icons.forEach(ic => { if (ic.src) ic.src = abs(ic.src); });
      if (Array.isArray(m.screenshots)) m.screenshots.forEach(sc => { if (sc.src) sc.src = abs(sc.src); });
      if (Array.isArray(m.shortcuts)) m.shortcuts.forEach(sc => {
        if (sc.url) sc.url = abs(sc.url);
        if (Array.isArray(sc.icons)) sc.icons.forEach(ic => { if (ic.src) ic.src = abs(ic.src); });
      });
      const blobUrl = URL.createObjectURL(new Blob([JSON.stringify(m)], { type: 'application/json' }));
      const link = document.getElementById('manifest-link');
      if (link) link.setAttribute('href', blobUrl);
    }).catch(() => {});
  } catch(e) {}
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-mode');
  applyTheme(isLight ? 'dark' : 'light');
  // No alert — switch is self-explanatory
}

function initTutDrag() {
  const titlebar = document.getElementById('tut-titlebar');
  const tt = document.getElementById('tut-tooltip');
  if(!titlebar || !tt) return;

  titlebar.addEventListener('mousedown', startDrag);
  titlebar.addEventListener('touchstart', startDragTouch, {passive:false});

  function startDrag(e) {
    if(e.target.tagName === 'BUTTON') return;
    tutIsDragging = true;
    const rect = tt.getBoundingClientRect();
    tutDragStartX = e.clientX;
    tutDragStartY = e.clientY;
    tutInitLeft = rect.left;
    tutInitTop = rect.top;
    // Remove transform so position uses left/top directly
    tt.style.transform = 'none';
    tt.style.left = rect.left + 'px';
    tt.style.top = rect.top + 'px';
    titlebar.style.cursor = 'grabbing';
    document.addEventListener('mousemove', onDrag);
    document.addEventListener('mouseup', stopDrag);
  }
  function startDragTouch(e) {
    if(e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    const touch = e.touches[0];
    tutIsDragging = true;
    const rect = tt.getBoundingClientRect();
    tutDragStartX = touch.clientX;
    tutDragStartY = touch.clientY;
    tutInitLeft = rect.left;
    tutInitTop = rect.top;
    tt.style.transform = 'none';
    tt.style.left = rect.left + 'px';
    tt.style.top = rect.top + 'px';
    document.addEventListener('touchmove', onDragTouch, {passive:false});
    document.addEventListener('touchend', stopDrag);
  }
  function onDrag(e) {
    if(!tutIsDragging) return;
    const dx = e.clientX - tutDragStartX;
    const dy = e.clientY - tutDragStartY;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = tt.offsetWidth, h = tt.offsetHeight;
    tt.style.left = Math.max(0, Math.min(vw - w, tutInitLeft + dx)) + 'px';
    tt.style.top  = Math.max(0, Math.min(vh - h, tutInitTop + dy)) + 'px';
    tt.style.right = 'auto';
    tt.style.bottom = 'auto';
  }
  function onDragTouch(e) {
    if(!tutIsDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const dx = touch.clientX - tutDragStartX;
    const dy = touch.clientY - tutDragStartY;
    const vw = window.innerWidth, vh = window.innerHeight;
    const w = tt.offsetWidth, h = tt.offsetHeight;
    tt.style.left = Math.max(0, Math.min(vw - w, tutInitLeft + dx)) + 'px';
    tt.style.top  = Math.max(0, Math.min(vh - h, tutInitTop + dy)) + 'px';
    tt.style.right = 'auto';
    tt.style.bottom = 'auto';
  }
  function stopDrag() {
    tutIsDragging = false;
    titlebar.style.cursor = 'grab';
    document.removeEventListener('mousemove', onDrag);
    document.removeEventListener('mouseup', stopDrag);
    document.removeEventListener('touchmove', onDragTouch);
    document.removeEventListener('touchend', stopDrag);
  }
}

function tutMinimize() {
  tutIsMinimized = true;
  const tt = document.getElementById('tut-tooltip');
  const mini = document.getElementById('tut-minimized');
  if(!tt || !mini) return;
  tt.style.display = 'none';
  mini.style.display = 'flex';
  // Update mini label
  const label = document.getElementById('tut-step-label');
  const counter = document.getElementById('tut-counter');
  document.getElementById('tut-mini-label').textContent = label?.textContent || 'Tutorial';
  document.getElementById('tut-mini-counter').textContent = counter?.textContent || '';
}

function tutRestore() {
  tutIsMinimized = false;
  const tt = document.getElementById('tut-tooltip');
  const mini = document.getElementById('tut-minimized');
  if(!tt || !mini) return;
  tt.style.display = 'block';
  mini.style.display = 'none';
}

// exitTutorial mini-pill cleanup is handled inside exitTutorial directly

// startTutorialById drag init handled inline

// renderTutStep mini sync handled inline

// JURNAL PENYESUAIAN — scan otomatis, langsung dari tombol aksi cepat
function dismissAndOpenPenyesuaian(dismissKey) {
  // Tandai notifikasi ini sudah di-dismiss untuk bulan ini
  if(dismissKey) localStorage.setItem(dismissKey, '1');
  openJurnalPenyesuaian();
}

function openJurnalPenyesuaian() {
  deteksiPenyesuaianOtomatis();
}

function openInlineTemplatePenyesuaian() { deteksiPenyesuaianOtomatis(); }
function toggleTemplatePenyesuaian() { deteksiPenyesuaianOtomatis(); }
function fillPenyesuaianInline() { deteksiPenyesuaianOtomatis(); }
function openModalPenyesuaian() { deteksiPenyesuaianOtomatis(); }

// ══════════════════════════════════════════════════════════════
// LAPORAN ARUS KAS (PSAK 2 — Metode Tidak Langsung)
// ══════════════════════════════════════════════════════════════
function renderArusKas() {
  const periodVal=document.getElementById('arus-kas-period')?.value||'all';
  const saldoMap=getFilteredSaldo(periodVal);
  const el=document.getElementById('arus-kas-content'); if(!el)return;
  const profil=JSON.parse(localStorage.getItem('oas_profil')||localStorage.getItem('oas_profil_v1')||'{}');
  const namaPerusahaan=profil.nama||'Perusahaan';
  const getSaldo=(kode)=>{const a=akuns.find(x=>x.kode===kode);if(!a)return 0;const s=saldoMap[kode]||{debit:0,kredit:0};return a.normal==='D'?s.debit-s.kredit:s.kredit-s.debit;};
  const sumK=(...kodes)=>kodes.reduce((acc,k)=>acc+getSaldo(k),0);
  const labaBersih=akuns.filter(a=>a.tipe==='Pendapatan').reduce((acc,a)=>acc+getSaldo(a.kode),0)-akuns.filter(a=>['HPP','Beban'].includes(a.tipe)).reduce((acc,a)=>acc+getSaldo(a.kode),0);
  const penyusutan=akuns.filter(a=>a.tipe==='Aset'&&a.kat==='Kontra'&&a.nama.toLowerCase().includes('penyusutan')).reduce((acc,a)=>{const s=saldoMap[a.kode]||{debit:0,kredit:0};return acc+(s.kredit-s.debit);},0);
  const deltaPiutang=-(akuns.filter(a=>a.kode.startsWith('12')).reduce((acc,a)=>acc+getSaldo(a.kode),0));
  const deltaPersediaan=-(akuns.filter(a=>a.kode.startsWith('13')).reduce((acc,a)=>acc+getSaldo(a.kode),0));
  const deltaUtangUsaha=getSaldo('2101');
  const deltaAkrual=sumK('2201','2301','2302','2303','2304','2501','2502');
  const asetLain=-(akuns.filter(a=>a.kode.startsWith('14')||a.kode.startsWith('15')||a.kode.startsWith('16')).reduce((acc,a)=>acc+getSaldo(a.kode),0));
  const totalOperasi=labaBersih+penyusutan+deltaPiutang+deltaPersediaan+deltaUtangUsaha+deltaAkrual+asetLain;
  const beliAset=-(akuns.filter(a=>a.tipe==='Aset'&&a.kat==='Tetap'&&!a.nama.toLowerCase().includes('penyusutan')).reduce((acc,a)=>acc+getSaldo(a.kode),0));
  const setorModal=getSaldo('3101'); const prive=-(getSaldo('3102'));
  const utangLP=akuns.filter(a=>a.tipe==='Liabilitas'&&a.kat==='Jk Panjang').reduce((acc,a)=>acc+getSaldo(a.kode),0);
  const totalPendanaan=setorModal+prive+utangLP;
  const kasAkhir=sumK('1101','1102','1103','1104');
  const kenaikan=totalOperasi+beliAset+totalPendanaan;
  const rpFn=v=>{const f='Rp '+Math.abs(Math.round(v)).toLocaleString('id-ID');return v<0?`<span style="color:var(--red);">(${f})</span>`:`<span>${f}</span>`;};
  const rpP=v=>{const f='Rp '+Math.abs(Math.round(v)).toLocaleString('id-ID');return v<0?`(${f})`:f;};
  const sec=(icon,title,rows,total)=>`<div class="table-card" style="margin-bottom:16px;"><div class="table-header"><div class="table-title"><i class="ti ti-${icon} ti-btn"></i> ${title}</div></div><table><tbody>${rows.filter(([,v])=>v!==0).map(([l,v])=>`<tr><td style="padding-left:28px;color:var(--muted);font-size:13px;">${l}</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">${rpFn(v)}</td></tr>`).join('')}</tbody><tfoot><tr class="total-row"><td>Total ${title}</td><td style="text-align:right;font-family:var(--mono);color:${total>=0?'var(--accent)':'var(--red)'};">${rpP(total)}</td></tr></tfoot></table></div>`;
  const sel=document.getElementById('arus-kas-period');
  const lbl=sel?sel.options[sel.selectedIndex].text:'Semua Periode';
  el.innerHTML=`${sec('settings','Aktivitas Operasi',[['Laba Bersih Periode',labaBersih],['Penyusutan & Amortisasi',penyusutan],['Perubahan Piutang Usaha',deltaPiutang],['Perubahan Persediaan',deltaPersediaan],['Perubahan Utang Usaha',deltaUtangUsaha],['Perubahan Kewajiban Akrual & Pajak',deltaAkrual],['Perubahan Aset Lancar Lainnya',asetLain]],totalOperasi)}
    ${sec('building-factory','Aktivitas Investasi',[['Pembelian Aset Tetap',beliAset]],beliAset)}
    ${sec('cash','Aktivitas Pendanaan',[['Setoran Modal Pemilik',setorModal],['Pengambilan Prive',prive],['Perubahan Utang Bank Jangka Panjang',utangLP]],totalPendanaan)}
    <div class="table-card"><table><tbody><tr><td style="color:var(--muted);font-size:13px;padding-left:16px;">Kenaikan (Penurunan) Kas Bersih</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">${rpFn(kenaikan)}</td></tr><tr class="total-row"><td>Saldo Kas & Setara Kas Akhir Periode</td><td style="text-align:right;font-family:var(--mono);color:${kasAkhir>=0?'var(--accent)':'var(--red)'};">${rpP(kasAkhir)}</td></tr></tbody></table></div>
    <div style="margin-top:12px;padding:10px 14px;background:var(--surface2);border-radius:10px;font-size:11px;color:var(--muted);line-height:1.7;"><b>Catatan:</b> Laporan metode tidak langsung sesuai PSAK 2. Pastikan saldo awal semua akun sudah diisi.</div>`;
}

function runSequential(ids, idx) {
  if(idx >= ids.length) { showTutComplete(); return; }
  activeTutId = ids[idx];
  tutStep = 0;
  document.getElementById('tut-backdrop').style.display = 'block';
  // override finish to go to next
  window._tutSeqIds = ids;
  window._tutSeqIdx = idx;
  renderTutStep();
}

function exitTutorial() {
  document.getElementById('tut-backdrop').style.display = 'none';
  clearTutHighlight();
  window._tutSeqIds = null;
  // Hide minimized pill
  const mini = document.getElementById('tut-minimized');
  if(mini) mini.style.display = 'none';
  tutIsMinimized = false;
}

function clearTutHighlight() {
  if(tutHighlighted) {
    tutHighlighted.classList.remove('tut-highlight');
    tutHighlighted = null;
  }
  const cb = document.getElementById('tut-clickblock');
  if(cb) cb.style.display = 'none';
}

function renderTutStep() {
  const mod = TUT_MODULES[activeTutId];
  if(!mod) return;
  const steps = mod.steps;
  if(tutStep >= steps.length) {
    // Module done
    if(window._tutSeqIds) {
      exitTutorial();
      setTimeout(() => runSequential(window._tutSeqIds, window._tutSeqIdx + 1), 400);
    } else {
      exitTutorial();
      showTutComplete();
    }
    return;
  }
  const step = steps[tutStep];
  const total = steps.length;

  // Progress
  document.getElementById('tut-step-label').textContent = `${mod.icon} ${mod.title}`;
  document.getElementById('tut-counter').textContent = `${tutStep+1} / ${total}`;
  document.getElementById('tut-progress').style.width = ((tutStep+1)/total*100) + '%';

  // Content
  document.getElementById('tut-icon').textContent = step.icon;
  document.getElementById('tut-title').textContent = step.title;
  document.getElementById('tut-body').innerHTML = step.body.replace(/\n/g, '<br>').replace(/`([^`]+)`/g, '<code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-family:var(--mono);font-size:12px;color:var(--accent);display:inline-block;margin:2px 0;">$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/<b>/g,'<b style="color:var(--text)">');

  // No task box in new system — just explanation
  document.getElementById('tut-task-wrap').style.display = 'none';
  document.getElementById('tut-tip-wrap').style.display = 'none';

  // Next button
  const nextBtn = document.getElementById('tut-btn-next');
  if(tutStep === total - 1) {
    nextBtn.textContent = window._tutSeqIds ? 'Bagian Berikutnya →' : '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Selesai';
  } else {
    nextBtn.textContent = 'Lanjut →';
  }

  // Clear old highlight
  clearTutHighlight();

  // Navigate if needed
  if(step.navTo) {
    showPage(step.navTo);
  }

  // Highlight after nav
  setTimeout(() => {
    if(step.target && step.highlight !== false) {
      const el = document.querySelector(step.target);
      if(el) {
        tutHighlighted = el;
        el.classList.add('tut-highlight');
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        positionTutTooltip(el);

        // Auto-advance when user clicks highlighted element
        if(step.autoNext !== false) {
          const handler = (e) => {
            el.removeEventListener('click', handler);
            setTimeout(() => tutNext(), 350);
          };
          el.addEventListener('click', handler, { once: true });
        }

        // Show clickblock overlay on top of highlighted element
        const rect = el.getBoundingClientRect();
        const cb = document.getElementById('tut-clickblock');
        if(cb) {
          cb.style.display = 'block';
          cb.style.top = rect.top + 'px';
          cb.style.left = rect.left + 'px';
          cb.style.width = rect.width + 'px';
          cb.style.height = rect.height + 'px';
          cb.onclick = () => {
            cb.style.display = 'none';
            el.click();
          };
        }
      } else {
        // Target not found — center tooltip and continue
        positionTutTooltipCenter();
      }
    } else {
      positionTutTooltipCenter();
      const cb = document.getElementById('tut-clickblock');
      if(cb) cb.style.display = 'none';
    }
  }, 300);
}

function tutNext() {
  tutStep++;
  const mod = TUT_MODULES[activeTutId];
  if(!mod) return;
  if(tutStep < mod.steps.length) {
    renderTutStep();
  } else {
    if(window._tutSeqIds) {
      exitTutorial();
      setTimeout(() => runSequential(window._tutSeqIds, window._tutSeqIdx + 1), 400);
    } else {
      exitTutorial();
      showTutComplete();
    }
  }
}

function tutSkipSection() {
  exitTutorial();
}

function positionTutTooltip(el) {
  const tt = document.getElementById('tut-tooltip');
  const rect = el.getBoundingClientRect();
  const vw = window.innerWidth, vh = window.innerHeight;
  const ttW = Math.min(340, vw - 32);
  tt.style.width = ttW + 'px';
  tt.style.transform = 'none';
  const ttH = tt.offsetHeight || 380;
  const margin = 16;
  let top, left;
  // Prefer below target
  if(rect.bottom + ttH + margin < vh) { top = rect.bottom + margin; }
  else if(rect.top - ttH - margin > 0) { top = rect.top - ttH - margin; }
  else { top = Math.max(margin, Math.min(rect.top, vh - ttH - margin)); }
  // Prefer right of target
  if(rect.right + ttW + margin < vw) { left = rect.right + margin; }
  else if(rect.left - ttW - margin > 0) { left = rect.left - ttW - margin; }
  else { left = Math.max(margin, (vw - ttW)/2); }
  tt.style.top = top + 'px';
  tt.style.left = left + 'px';
  tt.style.bottom = 'auto';
  tt.style.right = 'auto';
}

function positionTutTooltipCenter() {
  const tt = document.getElementById('tut-tooltip');
  if(!tt) return;
  const vw = window.innerWidth;
  const ttW = Math.min(360, vw - 32);
  tt.style.width = ttW + 'px';
  tt.style.top = '50%';
  tt.style.left = '50%';
  tt.style.bottom = 'auto';
  tt.style.right = 'auto';
  tt.style.transform = 'translate(-50%,-50%)';
}

function showTutComplete() {
  document.getElementById('tut-complete').style.display = 'flex';
}

// legacy compat
function startTutorial() { showPage('tutorial'); }

// INIT KALKULATOR — DIPINDAH ke akhir 12-kalkulator.js. IIFE ini manggil
// resetInv() (baru didefinisikan di 12-kalkulator.js, load ke-12, JAUH
// setelah file ini yang load ke-4) dan konfirmasiInputJurnalKartu (di
// 08-kartu-stock.js, load ke-8, juga setelah file ini). Dulu manggilnya di
// sini = ReferenceError: resetInv is not defined, dan itu bikin SISA file
// ini (CUSTOM OPTION PICKER ENGINE dkk di bawah) ikut kepotong gak jalan.

// CUSTOM OPTION PICKER ENGINE
// Replaces <select> with a beautiful bottom-sheet/dialog picker
let _optPickerCallback = null;
let _optPickerBtnEl = null;
let _optPickerSelectEl = null;

/**
 * Open the custom option picker
 * @param {Object} config - { title, options: [{value, label, icon, sub}], currentValue, onSelect, btnEl, selectEl }
 */
function openOptPicker(config) {
  _optPickerCallback = config.onSelect || null;
  _optPickerBtnEl = config.btnEl || null;
  _optPickerSelectEl = config.selectEl || null;

  document.getElementById('opt-picker-title').innerHTML = config.title || 'Pilih Opsi';

  const list = document.getElementById('opt-picker-list');
  // Store options for safe lookup by value
  list._optPickerOptions = config.options;
  list.innerHTML = config.options.map((opt, idx) => {
    const isSel = opt.value === config.currentValue;
    const safeVal = escapeHtml(opt.value);
    return `<div class="opt-picker-item${isSel ? ' selected' : ''}" onclick="selectOptPickerByIndex(${idx})" data-value="${safeVal}" data-idx="${idx}">
      ${opt.icon ? `<div class="opt-picker-item-icon">${opt.icon}</div>` : ''}
      <div class="opt-picker-item-text">
        <div class="opt-picker-item-name">${escapeHtml(opt.label)}</div>
        ${opt.sub ? `<div class="opt-picker-item-sub">${escapeHtml(opt.sub)}</div>` : ''}
      </div>
      <div class="opt-picker-radio"></div>
    </div>`;
  }).join('');

  document.getElementById('opt-picker-backdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

// initTheme() DIPINDAH dari 03-widgets.js — supaya dipanggil SETELAH function
// initTheme() ini selesai didefinisikan (bukan sebelum, kayak yang bikin
// ReferenceError: initTheme is not defined pas 03-widgets.js masih jalan duluan)
initTheme();
