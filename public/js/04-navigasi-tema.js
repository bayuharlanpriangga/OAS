
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
  'ai-assistant':['Orias Assisten','Asisten keuangan berbasis AI'],
  'tutorial':['Tutorial','Panduan penggunaan software langkah demi langkah'],
  'analitik':['Analitik & Tren Bisnis','Pendapatan · Laba · Arus Kas · Posisi Keuangan · Proyeksi'],
  // Fitur Baru
  'jurnal-berulang':['Jurnal Berulang','Otomasi transaksi rutin · Gaji · Sewa · Cicilan'],
  'invoice':['Invoice & Piutang','Buat invoice · Lacak pembayaran · Jurnal otomatis'],
  'bill':['Tagihan Pembelian','Tagihan dari supplier · Utang usaha · Jatuh tempo'],
  'umur-piutang':['Umur Piutang','Piutang belum lunas per pelanggan · Bucket 0-30, 31-60, 61-90, >90 hari'],
  'umur-hutang':['Umur Hutang','Utang usaha belum lunas per supplier · Bucket 0-30, 31-60, 61-90, >90 hari'],
  'kartu-piutang':['Kartu Piutang','Invoice, pembayaran, dan saldo berjalan per pelanggan'],
  'kartu-hutang':['Kartu Hutang','Tagihan, pembayaran, dan saldo berjalan per supplier'],
  'penawaran':['Penawaran','Penawaran harga ke pelanggan · Dasar pesanan penjualan'],
  'pesanan-jual':['Pesanan Penjualan','Dibuat dari penawaran disetujui · Dasar faktur penjualan'],
  'rekonsiliasi':['Rekonsiliasi Bank','Cocokkan mutasi bank dengan jurnal · Upload CSV'],
  'kurs':['Multi Mata Uang','Kurs otomatis · Konversi transaksi · History kurs'],
  'notifikasi':['Notifikasi & Alert','Peringatan otomatis · Batas anggaran · Jatuh tempo'],
  'anggaran':['Anggaran vs Aktual','Target per akun · Monitoring realisasi · Variance'],
  'pajak':['Pajak Otomatis','PPN 11%/12% · PPh 21 · PPh 23 · Laporan SPT'],
  'arus-kas':['Laporan Arus Kas','Metode Tidak Langsung · PSAK 2'],
  'perubahan-ekuitas':['Laporan Perubahan Ekuitas','Mutasi modal pemilik · PSAK 1'],
  'produk':['Master Produk','Daftar produk & layanan · Stok · Harga'],
  'aset-tetap':['Register Aset Tetap','Daftar aset · Penyusutan otomatis · Nilai buku'],
  'kontak':['Master Kontak','Pelanggan & Supplier · Histori transaksi'],
  'audit-trail':['Audit Trail','Riwayat aktivitas · Role pengguna · Siapa · Kapan'],
  'settings':['Settings','Akun, autentikasi & pengaturan transaksi'],
};

function showPage(id) {
  // Cek permission sebelum buka halaman (kecuali dashboard & settings — settings itu personal, bukan data bisnis)
  if (id === 'audit-trail' && typeof isAdmin === 'function' && !isAdmin()) {
    showAlert('⛔ Akses ditolak.\n\nAudit Trail hanya dapat diakses oleh Admin atau Pemilik bisnis.');
    return;
  }
  const _modulIzin = typeof modulUntukHalaman === 'function' ? modulUntukHalaman(id) : null;
  if (id !== 'dashboard' && id !== 'settings' && _modulIzin && !isAdmin() && typeof hasPerm === 'function') {
    if (!hasPerm(_modulIzin, 'read')) { // modul diambil dari pemetaan halaman (26-daftar-bisnis.js)
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
  // Setup number inputs for calculator pages
  if(id && id.startsWith('kalk')) setTimeout(() => { setupNumberInputs(); upgradeFormPickers(); }, 300);
  if(id==='jurnal-umum') { renderJurnalUmum(); setTimeout(upgradeFormPickers, 80); }
  if(id==='settings') {
    // Selalu mulai dari daftar Akun/Transaksi (root) — kecuali kalau ada
    // kode lain (mis. openAccountSettings / deep-link Master Produk) yang
    // langsung menimpa stack ini lewat settingsResetTo/settingsNavigate
    // di baris berikutnya (dijalankan sesudah showPage() ini selesai).
    if(typeof settingsResetTo === 'function') settingsResetTo(['root']);
  }
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
  if(id==='bill') renderBillList();
  if(id==='penawaran') renderPenawaranList();
  if(id==='pesanan-jual') renderPesananList();
  if(id==='umur-piutang') renderAgingPiutang();
  if(id==='umur-hutang') renderAgingHutang();
  if(id==='kartu-piutang') renderKartuPiutang();
  if(id==='kartu-hutang') renderKartuHutang();
  if(id==='rekonsiliasi') setTimeout(upgradeFormPickers, 80);
  if(id==='kurs') setTimeout(()=>{ renderKursPage(); upgradeFormPickers(); }, 80);
  if(id==='notifikasi') setTimeout(()=>{ renderNotifikasiPage(); upgradeFormPickers(); }, 80);
  if(id==='anggaran') setTimeout(()=>{ renderAnggaranPage(); upgradeFormPickers(); }, 80);
  if(id==='pajak') setTimeout(()=>{ renderPajakOtomatis(); }, 60);
}

function handleAddBtn() {
  showPage('transaksi');
}

// TABS (switchTab migrated to src/components/transaksi/TransaksiPage.tsx)

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
      'kalk-penyusutan','kalk-persediaan','kalk-bunga','kalk-rasio','kalk-bep',
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

// Selaraskan meta theme-color & color-scheme dengan tema aktif.
// Dipanggil setiap kali tema berubah (bukan cuma saat load awal) agar status bar
// PWA konsisten dengan tema yang dipilih user.
// CATATAN: JANGAN swap <link rel="manifest"> ke blob URL di sini. Untuk PWA yang
// sudah ter-install jadi WebAPK, Android butuh href manifest tetap konsisten
// (manifest.json asli) untuk validasi & update check di background — kalau
// di-swap ke blob: URL tiap toggle, WebAPK bisa gagal validasi dan fallback ke
// warna status bar default (biasanya light), meski meta tag di halaman sudah benar.
// theme_color/background_color statis di manifest.json sudah cukup untuk splash
// screen saat install; nav bar device sendiri memang di luar jangkauan web PWA
// (butuh native/TWA kalau mau full-sync).
function syncPwaThemeChrome(mode) {
  try {
    const isLight = mode === 'light';
    const bg = isLight ? '#f8fafc' : '#0d0f14';
    const metaTC = document.getElementById('meta-theme-color');
    if (metaTC) metaTC.setAttribute('content', bg);
    const metaCS = document.getElementById('meta-color-scheme');
    if (metaCS) metaCS.setAttribute('content', isLight ? 'light' : 'dark');
  } catch(e) {}
}

function toggleTheme() {
  const isLight = document.body.classList.contains('light-mode');
  applyTheme(isLight ? 'dark' : 'light');
  // No alert — switch is self-explanatory
}

// TUTORIAL DRAG & MINIMIZE state (relocated from retired 12-kalkulator.js)
let tutIsDragging = false, tutDragStartX, tutDragStartY, tutInitLeft, tutInitTop;
let tutIsMinimized = false;

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

// LAPORAN ARUS KAS migrated to src/components/laporan/LaporanPages.tsx

// Tutorial step data per modul
const TUT_MODULES = {

  'pengenalan': {
    title: 'Pengenalan Bayu Harlan Priangga', icon: '→',
    steps: [
      { icon:'→', title:'Selamat Datang di Bayu Harlan Priangga!',
        body:'Bayu Harlan Priangga adalah software akuntansi lengkap yang bisa kamu gunakan langsung dari browser. Tidak perlu install apapun!\n\nDi tutorial ini kamu akan mengenal tampilan dan cara berpindah antar menu.',
        target: null },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Sidebar — Pusat Navigasi',
        body:'Lihat panel di sebelah kiri — itu namanya <b>Sidebar</b>. Semua menu ada di sana, dikelompokkan:\n\n• <b>Utama</b> — Dashboard & Transaksi\n• <b>Jurnal</b> — Catatan transaksi\n• <b>Laporan</b> — Laporan keuangan\n• <b>Kalkulator</b> — Alat hitung\n• <b>AI Assistant</b> — Asisten pintar\n• <b>Tutorial</b> — Kamu sedang di sini!',
        target: '#sidebar', highlight: true },
      { icon:'<i class="ti ti-device-mobile ti-inline"></i>', title:'Di HP? Gunakan Tombol <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="0" y1="1" x2="18" y2="1"/><line x1="0" y1="7" x2="18" y2="7"/><line x1="0" y1="13" x2="18" y2="13"/></svg>',
        body:'Kalau kamu buka Bayu Harlan Priangga di handphone, sidebar tidak terlihat secara default.\n\nTap tombol <b><svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="0" y1="1" x2="18" y2="1"/><line x1="0" y1="7" x2="18" y2="7"/><line x1="0" y1="13" x2="18" y2="13"/></svg> (tiga garis)</b> di pojok kiri atas untuk membuka sidebar. Setelah pilih menu, sidebar otomatis menutup sendiri.',
        target: '.hamburger', highlight: true },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Dashboard — Ringkasan Keuangan',
        body:'<b>Dashboard</b> adalah halaman utama yang langsung tampil saat buka Bayu Harlan Priangga.\n\nDi sini kamu bisa lihat:\n• Total Aset bisnis kamu\n• Total Pendapatan bulan ini\n• Total Beban bulan ini\n• Laba Bersih\n• Transaksi terbaru\n• Ringkasan saldo akun utama',
        target: '#page-dashboard', navTo: 'dashboard' },
      { icon:'<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Cara Berpindah Halaman',
        body:'Cukup klik menu di sidebar — halaman langsung berganti tanpa refresh browser.\n\nMenu yang sedang aktif ditandai dengan aksen emas dan aksen tepi di sisi kiri.\n\nSemua data tersimpan sementara selama sesi browser kamu terbuka.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--green);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Siap Menjelajah!',
        body:'Sekarang kamu sudah tahu cara navigasi Bayu Harlan Priangga.\n\n<b>Lanjutkan dengan tutorial:</b>\n• <i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Mencatat Pemasukan Kas\n• <i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Mencatat Penjualan\n• <i class="ti ti-chart-bar ti-inline"></i> Membaca Laporan Keuangan\n\nAtau langsung eksplorasi sendiri — jika bingung, tanya <b>Orias Assisten</b>!',
        target: null }
    ]
  },

  'konsep-akuntansi': {
    title: 'Konsep Dasar Akuntansi', icon: '<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'Apa itu Akuntansi?',
        body:'Akuntansi adalah cara <b>mencatat, mengelompokkan, dan meringkas</b> semua kejadian keuangan bisnis.\n\nBayangkan kamu punya buku catatan keuangan yang rapi — itulah akuntansi. Bedanya, Bayu Harlan Priangga melakukannya secara otomatis!',
        target: null },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent-text)"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v16l-5-2.5L5 20V4zm9 0h2a2 2 0 012 2v16l-4-2"/></svg>', title:'Akun — Tempat Menyimpan Catatan',
        body:'<b>Akun</b> adalah "laci" untuk menyimpan catatan jenis transaksi tertentu.\n\nContoh akun:\n• <b>Kas</b> — catatan semua uang tunai masuk keluar\n• <b>Penjualan</b> — catatan semua pendapatan\n• <b>Beban Gaji</b> — catatan semua pengeluaran gaji\n• <b>Piutang</b> — catatan tagihan yang belum dibayar pelanggan\n\nLihat semua akun di menu <b>Chart of Accounts</b>.',
        target: '.nav-item[onclick*="akun"]', highlight: true },
      { icon:'<i class="ti ti-scale ti-inline"></i>', title:'Debit dan Kredit',
        body:'Ini konsep paling penting! Setiap transaksi selalu punya dua sisi:\n\n<b>DEBIT (Dr)</b> = sisi kiri\n<b>KREDIT (Kr)</b> = sisi kanan\n\nAturannya:\n• Aset naik → Debit\n• Aset turun → Kredit\n• Beban naik → Debit\n• Pendapatan naik → Kredit\n• Liabilitas/Ekuitas naik → Kredit\n\nTotal Debit <b>SELALU HARUS SAMA</b> dengan total Kredit.',
        target: null },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 0v6h6M8 13h8M8 17h5"/></svg>', title:'Jurnal — Catatan Tiap Transaksi',
        body:'<b>Jurnal</b> adalah catatan resmi setiap transaksi keuangan.\n\nContoh: Kamu bayar listrik Rp 500.000 tunai\n\n<code>Dr. Beban Listrik   Rp 500.000\n  Kr. Kas             Rp 500.000</code>\n\nArtinya: beban listrik bertambah (Dr), kas berkurang (Kr).\n\nBayu Harlan Priangga membuat jurnal ini <b>otomatis</b> saat kamu input transaksi!',
        target: null },
      { icon:'<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'5 Jenis Akun',
        body:'Semua akun dikelompokkan jadi 5 tipe:\n\n• <b>Aset</b> — apa yang dimiliki bisnis (kas, mesin, gedung)\n• <b>Liabilitas</b> — hutang bisnis (utang bank, utang usaha)\n• <b>Ekuitas</b> — modal pemilik\n• <b>Pendapatan</b> — uang masuk dari penjualan/jasa\n• <b>Beban</b> — pengeluaran operasional\n\nRumus dasar: <b>Aset = Liabilitas + Ekuitas</b>',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--green);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Konsep Sudah Paham!',
        body:'Kamu sudah mengerti konsep dasar akuntansi.\n\nIngat intinya:\n• Setiap transaksi = Debit + Kredit\n• Total Debit = Total Kredit (selalu!)\n• Bayu Harlan Priangga otomatis buatkan jurnal yang benar\n\nLanjut ke tutorial <b>Mencatat Pemasukan Kas</b> untuk praktek langsung!',
        target: null }
    ]
  },

  'chart-of-accounts': {
    title: 'Chart of Accounts', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>', title:'Apa itu Chart of Accounts?',
        body:'<b>Chart of Accounts (CoA)</b> adalah daftar lengkap semua akun yang digunakan perusahaan.\n\nIbaratnya seperti daftar isi buku catatan keuangan — setiap akun punya nomor kode dan nama yang unik.',
        target: '.nav-item[onclick*="akun"]', navTo: 'akun' },
      { icon:'<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'Kode Akun',
        body:'Setiap akun punya <b>kode unik</b> berupa angka:\n\n• <b>1xxx</b> = Aset (1101 = Kas, 1201 = Piutang...)\n• <b>2xxx</b> = Liabilitas (2101 = Utang Usaha...)\n• <b>3xxx</b> = Ekuitas (3101 = Modal...)\n• <b>4xxx</b> = Pendapatan (4101 = Penjualan...)\n• <b>5xxx+</b> = Beban (6101 = Beban Gaji...)\n\nUrutan angka memudahkan pengelompokan laporan.',
        target: '#akun-body', highlight: true },
      { icon:'+', title:'Menambah Akun Baru',
        body:'Akun bawaan sudah mencakup kebutuhan umum, tapi kamu bisa tambah akun sesuai bisnis.\n\nContoh tambahan yang sering dibutuhkan:\n• Beban Transportasi\n• Pendapatan Bunga Bank\n• Uang Muka Pelanggan\n• Beban Perbaikan & Perawatan\n\nKlik tombol <b>"+ Tambah Akun"</b> di kanan atas.',
        target: 'button[onclick*="openModalAkun"]', highlight: true },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Cara Isi Form Akun Baru',
        body:'Saat tambah akun baru, isi:\n\n• <b>Kode Akun</b> — angka unik, ikuti pola (misal 6106 untuk beban baru)\n• <b>Nama Akun</b> — nama jelas dan spesifik\n• <b>Tipe</b> — pilih: Aset/Liabilitas/Ekuitas/Pendapatan/Beban\n• <b>Kategori</b> — misal: Lancar, Tetap, Operasional\n\nSaldo normal (Debit/Kredit) ditentukan otomatis berdasarkan tipe.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Chart of Accounts Siap!',
        body:'Sekarang kamu tahu cara mengelola daftar akun.\n\n<b>Tips:</b>\n• Jangan terlalu banyak akun — cukup yang dibutuhkan\n• Nama akun harus jelas dan konsisten\n• Jangan ubah kode akun yang sudah dipakai di jurnal\n\nLanjut ke tutorial mencatat transaksi!',
        target: null }
    ]
  },

  'catat-kas-masuk': {
    title: 'Mencatat Pemasukan Kas', icon: '<i class="ti ti-cash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm9 5v3"/></svg>', title:'Apa itu Pemasukan Kas?',
        body:'Pemasukan kas adalah semua uang tunai yang masuk ke bisnis:\n\n💰 Modal yang disetor pemilik\n🛍️ Pembayaran dari pelanggan\n📬 Pelunasan piutang\n<i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Pendapatan jasa\n\nSetiap pemasukan kas harus dicatat agar laporan keuangan akurat.',
        target: '.nav-item[onclick*="transaksi"]', navTo: 'transaksi' },
      { icon:'<i class="ti ti-folder-open" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i>', title:'Buka Tab Kas',
        body:'Di halaman Transaksi, ada 4 tab di bagian atas:\n\n• <b>Penerimaan/Pengeluaran Kas</b> ← ini yang kita pakai\n• Penjualan\n• Pembelian\n• Jurnal Manual\n\nTab <b>Kas</b> sudah aktif secara default saat buka halaman Transaksi.',
        target: '#trx-kas', highlight: true },
      { icon:'↔', title:'Pilih Jenis: Penerimaan',
        body:'Di dropdown <b>Jenis</b>, pilih:\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Penerimaan Kas</b> — untuk uang MASUK\n❌ Pengeluaran Kas — untuk uang keluar\n\nJika pilih Penerimaan Kas, jurnal yang dibuat:\n<code>Dr. Kas (bertambah)\n  Kr. [Akun Lawan] (misal Modal/Pendapatan)</code>',
        target: '#kas-jenis', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>', title:'Akun Lawan — Dari Mana Uangnya?',
        body:'<b>Akun Lawan</b> adalah sumber uang yang masuk. Pilih sesuai asal uangnya:\n\n• Dari modal pemilik → pilih <b>Modal Pemilik</b>\n• Dari pendapatan jasa → pilih <b>Pendapatan Jasa</b>\n• Dari pelunasan piutang → pilih <b>Piutang Usaha</b>\n• Dari pinjaman bank → pilih <b>Utang Bank</b>',
        target: '#kas-akun-lawan', highlight: true },
      { icon:'💰', title:'Isi Jumlah & Keterangan',
        body:'• <b>Jumlah</b> — isi angka tanpa titik/koma (contoh: 5000000 untuk Rp 5.000.000)\n• <b>Keterangan</b> — deskripsi singkat yang jelas\n\nContoh keterangan yang baik:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> "Modal awal dari pemilik"\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> "Pelunasan piutang Pak Ahmad"\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> "Pendapatan jasa konsultasi"\n\nHindari keterangan tidak jelas seperti "uang masuk" saja.',
        target: '#kas-jumlah', highlight: true },
      { icon:'👁️', title:'Preview Jurnal Sebelum Simpan',
        body:'Sebelum simpan, klik tombol <b>"Preview Jurnal"</b> untuk melihat jurnal yang akan dibuat.\n\nIni penting untuk memastikan:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Akun sudah benar\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jumlah debit = kredit\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tidak ada salah pilih\n\nJika sudah benar, klik <b>"Simpan & Buat Jurnal"</b>.',
        target: 'button[onclick*="previewKas"]', highlight: true },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Berhasil Mencatat Pemasukan!',
        body:'Setelah simpan, transaksi otomatis:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Masuk ke Jurnal Umum\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Masuk ke Jurnal Kas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memperbarui saldo akun Kas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memperbarui Laporan Keuangan\n\nCek hasilnya di menu <b>Jurnal Kas</b> untuk melihat saldo kas terkini!',
        target: null }
    ]
  },

  'catat-kas-keluar': {
    title: 'Mencatat Pengeluaran Kas', icon: '💸',
    steps: [
      { icon:'💸', title:'Apa itu Pengeluaran Kas?',
        body:'Pengeluaran kas adalah semua uang tunai yang keluar dari bisnis:\n\n💡 Bayar listrik, air, internet\n👥 Bayar gaji karyawan\n🏠 Bayar sewa tempat\n<i class="ti ti-shopping-cart" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Beli perlengkapan kantor\n<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Cicilan pinjaman\n\nSemua harus dicatat agar tidak ada pengeluaran yang "hilang".',
        target: '.nav-item[onclick*="transaksi"]', navTo: 'transaksi' },
      { icon:'↔', title:'Pilih Jenis: Pengeluaran',
        body:'Di dropdown <b>Jenis</b>, pilih:\n\n❌ Penerimaan Kas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Pengeluaran Kas</b> ← pilih ini\n\nJika pilih Pengeluaran Kas, jurnal yang dibuat:\n<code>Dr. [Akun Lawan] (beban/aset bertambah)\n  Kr. Kas (kas berkurang)</code>',
        target: '#kas-jenis', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>', title:'Akun Lawan — Untuk Apa Uangnya?',
        body:'<b>Akun Lawan</b> adalah tujuan pengeluaran. Pilih sesuai peruntukannya:\n\n• Bayar listrik → <b>Beban Listrik & Air</b>\n• Bayar gaji → <b>Beban Gaji</b>\n• Bayar sewa → <b>Beban Sewa</b>\n• Beli perlengkapan → <b>Perlengkapan</b>\n• Bayar utang → <b>Utang Usaha / Utang Bank</b>\n\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jangan salah pilih akun — ini menentukan laporan laba rugi!',
        target: '#kas-akun-lawan', highlight: true },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Bedakan: Beban vs Aset',
        body:'Ada 2 jenis pengeluaran yang berbeda pencatatannya:\n\n<b>1. BEBAN (langsung jadi biaya)</b>\nContoh: listrik, gaji, sewa bulan ini\n→ Pilih akun "Beban ..." → langsung kurangi laba\n\n<b>2. ASET (jadi milik perusahaan)</b>\nContoh: beli komputer, kendaraan, peralatan\n→ Pilih akun "Peralatan" → jadi aset, lalu disusutkan\n\nIni sering membingungkan pemula — jika ragu, tanya Orias Assisten!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Pengeluaran Tercatat!',
        body:'Setelah simpan, sistem otomatis:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Mengurangi saldo Kas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Menambah saldo akun Beban\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memperbarui Laporan Laba Rugi\n\n<b>Tips penting:</b>\nSelalu catat pengeluaran di hari yang sama — jangan ditumpuk. Makin telat dicatat, makin mudah terlupa!',
        target: null }
    ]
  },

  'catat-penjualan': {
    title: 'Mencatat Penjualan', icon: '<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2v18l-2-2-2 2-2-2-2 2-2-2-2 2zm4-11h6m-6 4h6"/></svg>', title:'Mencatat Transaksi Penjualan',
        body:'Penjualan adalah pendapatan utama bisnis. Di Bayu Harlan Priangga, ada 2 jenis penjualan:\n\n<i class="ti ti-cash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Penjualan Tunai</b> — pelanggan bayar langsung\n<i class="ti ti-clipboard-list ti-inline"></i> <b>Penjualan Kredit</b> — pelanggan bayar nanti (piutang)\n\nKeduanya punya jurnal berbeda!',
        target: '.nav-item[onclick*="transaksi"]', navTo: 'transaksi' },
      { icon:'<i class="ti ti-folder-open" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i>', title:'Buka Tab Penjualan',
        body:'Klik tab <b>"Penjualan"</b> di halaman Transaksi.\n\nKamu akan melihat form dengan kolom:\n• Tanggal\n• No. Invoice\n• Metode Pembayaran\n• Jumlah Penjualan\n• HPP (Harga Pokok)\n• Keterangan',
        target: '.tab[onclick*="penjualan"]', highlight: true },
      { icon:'📄', title:'No. Invoice',
        body:'<b>Nomor Invoice</b> adalah nomor dokumen penjualan yang diberikan ke pelanggan.\n\nFormat umum: INV-001, INV-2024/001, atau sesuai format perusahaan.\n\nFungsinya:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Referensi untuk tracking pembayaran\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Bukti transaksi yang sah\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memudahkan rekonsiliasi',
        target: '#jual-inv', highlight: true },
      { icon:'<i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Penjualan Tunai vs Kredit',
        body:'Pilih metode pembayaran:\n\n<b>Tunai (Kas)</b>\nPelanggan bayar langsung.\nJurnal: Dr. Kas — Kr. Penjualan\n\n<b>Kredit (Piutang)</b>\nPelanggan bayar nanti.\nJurnal: Dr. Piutang Usaha — Kr. Penjualan\n\nNanti saat piutang dilunasi, catat lagi via tab Kas: penerimaan kas, akun lawan = Piutang Usaha.',
        target: '#jual-metode', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M12 3l9 5v8l-9 5-9-5V8l9-5zm0 0v9m9-4l-9 4-9-4"/></svg>', title:'Pilih Produk — HPP Otomatis',
        body:'<b>Pilih Produk</b> dari kartu stock persediaan.\n\nSaat produk dipilih, sistem otomatis:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Mengisi <b>harga jual</b> sesuai Master Produk\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Menghitung <b>HPP otomatis</b> dari kartu stock (FIFO/LIFO/WA)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Membuat <b>jurnal HPP + persediaan keluar</b> secara otomatis\n\nTidak perlu isi HPP manual — sistem sudah mendeteksi dari persediaan.',
        target: '#jual-produk-btn', highlight: true },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Otomatis Masuk ke Laporan',
        body:'Setelah simpan penjualan, data langsung masuk ke:\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Jurnal Penjualan</b> — daftar semua transaksi jual\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Laporan Laba Rugi</b> — menambah pendapatan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Neraca</b> — menambah kas/piutang\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Dashboard</b> — update angka ringkasan\n\nSemua laporan otomatis — tidak perlu isi manual!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Penjualan Berhasil Dicatat!',
        body:'Kamu sudah tahu cara mencatat penjualan.\n\n<b>Ingat perbedaannya:</b>\n• Penjualan tunai → kas langsung bertambah\n• Penjualan kredit → piutang bertambah dulu\n• HPP → otomatis kurangi persediaan\n\nCek di menu <b>Jurnal Penjualan</b> untuk lihat semua transaksi jual!',
        target: null }
    ]
  },

  'catat-pembelian': {
    title: 'Mencatat Pembelian', icon: '<i class="ti ti-shopping-cart" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0"/></svg>', title:'Mencatat Transaksi Pembelian',
        body:'Pembelian perlu dicatat untuk:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Menambah stok persediaan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Mencatat aset baru\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Melacak utang usaha\n\nAda 2 jenis: <b>Tunai</b> (bayar langsung) dan <b>Kredit</b> (hutang dulu).',
        target: '.nav-item[onclick*="transaksi"]', navTo: 'transaksi' },
      { icon:'<i class="ti ti-folder-open" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i>', title:'Buka Tab Pembelian',
        body:'Klik tab <b>"Pembelian"</b> di halaman Transaksi.\n\nForm yang tersedia:\n• Tanggal & No. Faktur\n• Metode (Tunai/Kredit)\n• Jumlah Pembelian\n• Akun Beban/Aset\n• Keterangan',
        target: '.tab[onclick*="pembelian"]', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>', title:'Pilih Akun yang Tepat',
        body:'Ini bagian paling penting! Pilih akun sesuai apa yang dibeli:\n\n<i class="ti ti-package" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Beli stok/barang dagangan → <b>Persediaan Barang</b>\n🖥️ Beli komputer/mesin → <b>Peralatan</b>\n📄 Beli ATK/perlengkapan → <b>Perlengkapan</b>\n💊 Beli bahan baku → <b>Persediaan Barang</b>\n\nPilih akun yang salah → laporan keuangan jadi tidak akurat.',
        target: '#beli-akun', highlight: true },
      { icon:'<i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Tunai vs Kredit (Hutang)',
        body:'<b>Pembelian Tunai</b>\nBayar langsung dengan kas.\nJurnal: Dr. [Aset/Beban] — Kr. Kas\n\n<b>Pembelian Kredit</b>\nBayar nanti (jadi hutang ke supplier).\nJurnal: Dr. [Aset/Beban] — Kr. Utang Usaha\n\nNanti saat bayar hutang ke supplier:\n→ Catat via tab Kas: pengeluaran kas, akun lawan = Utang Usaha.',
        target: '#beli-metode', highlight: true },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'No. Faktur Supplier',
        body:'<b>No. Faktur</b> adalah nomor dokumen dari supplier.\n\nPenting untuk:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Bukti pembelian resmi\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Dasar klaim jika ada masalah\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Referensi saat bayar hutang\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Keperluan perpajakan (Faktur Pajak PPN)\n\nSimpan fisik faktur supplier — cocokkan dengan catatan di sistem.',
        target: '#beli-faktur', highlight: true },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Pembelian Tercatat!',
        body:'Setelah simpan, otomatis:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Stok/aset bertambah di neraca\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Kas berkurang (jika tunai)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Utang usaha bertambah (jika kredit)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal Pembelian terupdate\n\nCek menu <b>Jurnal Pembelian</b> untuk lihat semua riwayat beli!',
        target: null }
    ]
  },

  'jurnal-manual': {
    title: 'Jurnal Manual', icon: '<i class="ti ti-pencil" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<i class="ti ti-pencil" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'Kapan Pakai Jurnal Manual?',
        body:'Jurnal Manual digunakan untuk transaksi yang tidak tersedia di tab cepat:\n\n<i class="ti ti-adjustments" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Jurnal penyesuaian (penyusutan, akrual)\n💱 Koreksi kesalahan pencatatan\n<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Transfer antar akun\n<i class="ti ti-clipboard-list ti-inline"></i> Transaksi kompleks (banyak akun sekaligus)\n🗂️ Pembebanan biaya ke beberapa departemen',
        target: '.nav-item[onclick*="transaksi"]', navTo: 'transaksi' },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Buka Tab Jurnal Manual',
        body:'Klik tab <b>"Jurnal Manual"</b> di halaman Transaksi.\n\nKamu akan melihat:\n• Kolom Tanggal & No. Jurnal\n• Kolom Keterangan jurnal\n• Tabel baris debit/kredit\n• Tombol "+ Tambah Baris"\n• Indikator balance otomatis',
        target: '.tab[onclick*="umum"]', highlight: true },
      { icon:'🧱', title:'Cara Kerja Baris Jurnal',
        body:'Setiap baris jurnal punya 4 kolom:\n\n1. <b>Akun</b> — pilih dari daftar akun\n2. <b>Keterangan</b> — deskripsi baris ini\n3. <b>Debit</b> — isi angka jika akun di-Debit\n4. <b>Kredit</b> — isi angka jika akun di-Kredit\n\nSetiap baris hanya isi SALAH SATU: debit ATAU kredit, bukan keduanya.',
        target: '#manual-lines', highlight: true },
      { icon:'<i class="ti ti-scale ti-inline"></i>', title:'Validasi Balance Otomatis',
        body:'Di bawah tabel ada indikator balance real-time:\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b style="color:#4ade80">Balance</b> — total debit = total kredit, aman disimpan\n❌ <b style="color:#f87171">Tidak Balance</b> — ada selisih, tidak bisa disimpan\n\nIni fitur pengaman agar tidak ada jurnal salah masuk ke sistem.\n\nJika tidak balance, periksa: ada angka yang kurang? akun yang tertukar?',
        target: '#manual-balance', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm0 0v6h6M8 13h8M8 17h5"/></svg>', title:'Contoh: Jurnal Penyesuaian Penyusutan',
        body:'Contoh jurnal penyusutan mesin Rp 1.000.000/tahun:\n\n<b>Baris 1:</b>\nAkun: Beban Penyusutan\nDebit: 1.000.000\nKredit: (kosong)\n\n<b>Baris 2:</b>\nAkun: Akumulasi Penyusutan\nDebit: (kosong)\nKredit: 1.000.000\n\n→ Total Debit = Total Kredit = Balance ✓',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Jurnal Manual Siap Digunakan!',
        body:'Sekarang kamu bisa input jurnal apapun dengan bebas.\n\n<b>Tips:</b>\n• Klik "Tambah Baris" untuk jurnal dengan banyak akun\n• Isi keterangan yang jelas di setiap baris\n• Gunakan Preview/cek balance sebelum simpan\n• Jika bingung jurnalnya, tanya <b>Orias Assisten</b> — dia langsung kasih format jurnalnya!',
        target: null }
    ]
  },

  'jurnal-laporan': {
    title: 'Membaca Jurnal & Buku Besar', icon: '<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2zM10 3v18M3 8h3M3 12h3M3 16h3"/></svg>', title:'Jurnal — Rekaman Semua Transaksi',
        body:'Bayu Harlan Priangga punya 4 jenis jurnal khusus:\n\n<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Jurnal Umum</b> — semua transaksi dalam satu tampilan\n<i class="ti ti-cash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Jurnal Kas</b> — khusus mutasi uang kas\n<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Jurnal Penjualan</b> — khusus transaksi jual\n<i class="ti ti-shopping-cart" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Jurnal Pembelian</b> — khusus transaksi beli\n\nSetiap transaksi yang kamu input otomatis masuk ke jurnal yang sesuai.',
        target: '.nav-item[onclick*="jurnal-umum"]', navTo: 'jurnal-umum' },
      { icon:'🔍', title:'Filter & Pencarian di Jurnal Umum',
        body:'Di Jurnal Umum ada 2 alat untuk menemukan transaksi:\n\n🔍 <b>Kotak Pencarian</b> — ketik kata kunci dari keterangan transaksi\n📁 <b>Filter Jenis</b> — tampilkan hanya Kas / Penjualan / Pembelian / Manual\n\nContoh: ketik "listrik" → tampil semua transaksi yang keterangannya mengandung kata "listrik".',
        target: '#filter-ju', highlight: true },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M3 10h18M3 14h18M5 6h14a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2zm9 5v3"/></svg>', title:'Jurnal Kas — Running Balance',
        body:'Jurnal Kas spesial karena ada kolom <b>Saldo Berjalan</b> — saldo kas setelah setiap transaksi.\n\nKamu bisa lihat:\n• Kapan saldo kas terendah\n• Apakah ada anomali (saldo minus = ada masalah)\n• Total penerimaan dan pengeluaran di bagian bawah\n\nIni sangat berguna untuk memantau arus kas harian.',
        target: '.nav-item[onclick*="jurnal-kas"]', navTo: 'jurnal-kas' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent)"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v16l-5-2.5L5 20V4zm9 0h2a2 2 0 012 2v16l-4-2"/></svg>', title:'Buku Besar — Detail Per Akun',
        body:'<b>Buku Besar</b> menampilkan semua mutasi untuk SATU akun spesifik.\n\nCara menggunakan:\n1. Buka menu Buku Besar\n2. Pilih akun dari dropdown (misal: Kas, Piutang, Penjualan)\n3. Sistem tampilkan semua transaksi yang menyentuh akun itu\n4. Ada kolom Saldo yang selalu update\n\nBuku Besar sangat berguna untuk rekonsiliasi dan audit.',
        target: '.nav-item[onclick*="buku-besar"]', navTo: 'buku-besar' },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Bisa Baca Jurnal & Buku Besar!',
        body:'Sekarang kamu tahu cara:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Melihat semua transaksi di Jurnal Umum\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Filter dan cari jurnal tertentu\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memantau arus kas di Jurnal Kas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Melihat detail mutasi per akun di Buku Besar\n\nLanjut ke tutorial <b>Membaca Neraca Saldo</b>!',
        target: null }
    ]
  },

  'neraca-saldo': {
    title: 'Neraca Saldo', icon: '<i class="ti ti-scale ti-inline"></i>',
    steps: [
      { icon:'<i class="ti ti-scale ti-inline"></i>', title:'Apa itu Neraca Saldo?',
        body:'<b>Neraca Saldo</b> adalah daftar semua akun beserta saldonya dalam kolom Debit dan Kredit.\n\nFungsinya:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Memastikan semua jurnal sudah benar (debit = kredit)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lihat saldo terkini semua akun dalam satu halaman\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Dasar penyusunan laporan keuangan final',
        target: '.nav-item[onclick*="neraca-saldo"]', navTo: 'neraca-saldo' },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Cara Membaca Neraca Saldo',
        body:'Neraca saldo punya kolom:\n• <b>Kode & Nama Akun</b>\n• <b>Tipe</b> (Aset/Liabilitas/dll)\n• <b>Debit</b> — saldo normal debit\n• <b>Kredit</b> — saldo normal kredit\n\nDi baris terakhir ada <b>TOTAL</b> — jumlah total debit harus = total kredit.\n\nJika tidak sama → ada jurnal yang salah.',
        target: '#neraca-saldo-body', highlight: true },
      { icon:'🎯', title:'Saldo Normal Setiap Akun',
        body:'Setiap tipe akun punya saldo normal:\n\n🟢 <b>Aset</b> → saldo normal Debit (bertambah jika Dr)\n🔴 <b>Liabilitas</b> → saldo normal Kredit (bertambah jika Kr)\n🔵 <b>Ekuitas</b> → saldo normal Kredit\n🟡 <b>Pendapatan</b> → saldo normal Kredit\n🟠 <b>Beban</b> → saldo normal Debit\n\nJika ada akun yang saldonya di sisi berlawanan, mungkin ada koreksi yang perlu dilakukan.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Neraca Saldo Dipahami!',
        body:'Ingat yang penting:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Total Debit = Total Kredit → jurnal sudah benar\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Neraca saldo otomatis update saat tambah transaksi\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jika ada selisih, cari jurnal yang tidak balance\n\nLanjut ke <b>Laporan Laba Rugi</b>!',
        target: null }
    ]
  },

  'laba-rugi': {
    title: 'Laporan Laba Rugi', icon: '<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Laporan Laba Rugi',
        body:'<b>Laporan Laba Rugi</b> menjawab pertanyaan: "<b>Apakah bisnis saya untung atau rugi?</b>"\n\nDibuat dari semua akun Pendapatan dan Beban yang ada di jurnal. Di Bayu Harlan Priangga, laporan ini otomatis — tidak perlu input manual!',
        target: '.nav-item[onclick*="laba-rugi"]', navTo: 'laba-rugi' },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Struktur Laporan Laba Rugi',
        body:'Laporan Laba Rugi tersusun dari atas ke bawah:\n\n<b>1. Pendapatan</b>\n+ Penjualan barang/jasa\n= Total Pendapatan\n\n<b>2. HPP (Harga Pokok Penjualan)</b>\n- Biaya barang/bahan yang terjual\n= <b>Laba Kotor</b>\n\n<b>3. Beban Operasional</b>\n- Gaji, sewa, listrik, dll\n= <b>Laba Bersih</b>',
        target: '#laba-rugi-content', highlight: true },
      { icon:'📉', title:'Memahami Angka',
        body:'Cara baca hasil:\n\n🟢 <b>Laba Kotor tinggi</b> — margin produk bagus\n🔴 <b>Laba Kotor rendah</b> — harga jual terlalu murah atau HPP terlalu mahal\n\n🟢 <b>Laba Bersih positif</b> — bisnis untung!\n🔴 <b>Laba Bersih negatif</b> — bisnis rugi, beban > pendapatan\n\nIngin analisis lebih dalam? Tanya <b>Orias Assisten</b> untuk insight dan rekomendasi!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Laporan Laba Rugi Siap Dibaca!',
        body:'Sekarang kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Baca laporan laba rugi otomatis\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pahami komponen pendapatan dan beban\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Evaluasi performa keuangan bisnis\n\nLanjut ke tutorial <b>Neraca (Balance Sheet)</b>!',
        target: null }
    ]
  },

  'neraca': {
    title: 'Neraca (Balance Sheet)', icon: '<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Neraca — Posisi Keuangan',
        body:'<b>Neraca</b> (Balance Sheet) menjawab: "<b>Apa yang dimiliki dan dihutang bisnis saya?</b>"\n\nNeraca menampilkan kondisi keuangan pada SATU titik waktu, berbeda dengan Laba Rugi yang untuk satu periode.',
        target: '.nav-item[onclick*="neraca"]', navTo: 'neraca' },
      { icon:'<i class="ti ti-scale ti-inline"></i>', title:'Struktur Neraca: Dua Sisi',
        body:'Neraca selalu punya dua sisi yang HARUS sama:\n\n<b>Sisi Kiri — ASET</b>\n• Aset Lancar (kas, piutang, persediaan)\n• Aset Tetap (mesin, kendaraan, gedung)\n= Total Aset\n\n<b>Sisi Kanan — LIABILITAS + EKUITAS</b>\n• Liabilitas (utang lancar, utang jangka panjang)\n• Ekuitas (modal + laba ditahan)\n= Total Liabilitas + Ekuitas\n\n<b>Total Aset = Total Liabilitas + Ekuitas</b>',
        target: '#neraca-content', highlight: true },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Indikator Balance Otomatis',
        body:'Di bawah neraca ada indikator:\n\n<span style="color:#4ade80">✓ Neraca Balance</span> — semua jurnal benar\n<span style="color:#f87171">✗ Neraca Tidak Balance</span> — ada kesalahan\n\nJika tidak balance:\n1. Cek Neraca Saldo — cari akun yang aneh\n2. Cek Jurnal Umum — cari jurnal tidak balance\n3. Tanya Orias Assisten untuk bantu diagnosa!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Neraca Dipahami!',
        body:'Sekarang kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Baca neraca dua sisi\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pahami posisi aset, liabilitas, dan ekuitas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Cek apakah laporan sudah balance\n\nKamu sudah menguasai semua laporan keuangan utama! 🎉\n\nLanjut ke <b>Kalkulator Penyusutan</b> untuk fitur yang lebih advanced.',
        target: null }
    ]
  },

  'kalk-penyusutan': {
    title: 'Kalkulator Penyusutan', icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M3 21h18M9 21V7l6-4v18M3 21V11l6-4"/></svg>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M3 21h18M9 21V7l6-4v18M3 21V11l6-4"/></svg>', title:'Apa itu Penyusutan Aset?',
        body:'Aset tetap (mesin, kendaraan, gedung) nilainya turun setiap tahun — ini disebut <b>penyusutan</b> (depreciation).\n\nBayu Harlan Priangga hitung penyusutan otomatis dengan 4 metode berbeda sesuai standar PSAK 16.',
        target: '.nav-item[onclick*="kalk-penyusutan"]', navTo: 'kalk-penyusutan' },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M3 20.29V5a2 2 0 012-2h13.71a.7.7 0 01.5 1.21L5.21 18.5a.7.7 0 01-1.21-.5zM6 9h8M6 13h5"/></svg>', title:'4 Metode Penyusutan',
        body:'<b>1. Garis Lurus (SLM)</b>\nBeban sama setiap tahun. Paling simpel.\nContoh: mesin Rp 100jt, umur 5 tahun → Rp 20jt/tahun\n\n<b>2. Saldo Menurun Ganda (DDB)</b>\nBeban besar di awal, mengecil di akhir.\nCocok untuk aset teknologi yang cepat usang.\n\n<b>3. Sum of Years Digits (SYD)</b>\nVariasi saldo menurun yang lebih halus.\n\n<b>4. Unit Produksi</b>\nBerdasarkan berapa banyak unit diproduksi.\nCocok untuk mesin pabrik.',
        target: '#py-metode', highlight: true },
      { icon:'<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'Parameter yang Perlu Diisi',
        body:'Untuk hitung penyusutan, isi:\n\n• <b>Harga Perolehan</b> — harga beli aset\n• <b>Nilai Sisa/Residu</b> — estimasi nilai saat tidak dipakai lagi\n• <b>Umur Ekonomis</b> — berapa tahun aset dipakai\n• <b>Metode</b> — pilih sesuai kebijakan perusahaan\n\nContoh: Mesin produksi\nHarga: Rp 100.000.000\nResidu: Rp 10.000.000\nUmur: 5 tahun\nMetode: Garis Lurus',
        target: '#py-cost', highlight: true },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Hasil: Tabel + Jurnal Otomatis',
        body:'Setelah klik <b>"Hitung & Generate Tabel"</b>, sistem tampilkan:\n\n<i class="ti ti-chart-bar ti-inline"></i> <b>Tabel penyusutan</b> lengkap per tahun:\n• Beban Penyusutan per tahun\n• Akumulasi Penyusutan\n• Nilai Buku Awal dan Akhir\n\n<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Jurnal per tahun:</b>\nDr. Beban Penyusutan — Kr. Akumulasi Penyusutan\n\nSalin jurnal ini ke menu Jurnal Manual setiap akhir periode!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Penyusutan Siap Dihitung!',
        body:'Sekarang kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pilih metode penyusutan yang tepat\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Generate tabel penyusutan per tahun\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tahu jurnal penyesuaian yang harus dicatat\n\nLanjut ke <b>Kalkulator Persediaan</b>!',
        target: null }
    ]
  },

  'kalk-persediaan': {
    title: 'Kalkulator Persediaan', icon: '<i class="ti ti-package" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M12 3l9 5v8l-9 5-9-5V8l9-5zm0 0v9m9-4l-9 4-9-4"/></svg>', title:'Kalkulator Persediaan',
        body:'Kalkulator ini untuk menghitung <b>nilai persediaan akhir</b> dan <b>HPP</b> menggunakan metode:\n\n• <b>FIFO</b> — barang masuk pertama, keluar pertama\n• <b>LIFO</b> — barang masuk terakhir, keluar pertama\n• <b>Weighted Average</b> — rata-rata tertimbang\n• <b>Moving Average</b> — rata-rata bergerak\n\nMasing-masing metode hasilkan nilai yang berbeda!',
        target: '.nav-item[onclick*="kalk-persediaan"]', navTo: 'kalk-persediaan' },
      { icon:'<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Cara Input Transaksi',
        body:'Klik tombol:\n• <b>"+ Pembelian/Masuk"</b> — untuk barang yang dibeli/diterima\n• <b>"+ Penjualan/Keluar"</b> — untuk barang yang dijual/dikeluarkan\n\nSetiap baris isi: Tanggal, Qty, Harga/Unit, dan Keterangan.\n\nUntuk baris Keluar, harga diisi otomatis oleh sistem sesuai metode yang dipilih.',
        target: '#inv-input-body', highlight: true },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Membaca Kartu Persediaan',
        body:'Setelah klik <b>"Hitung"</b>, sistem tampilkan <b>Kartu Persediaan</b> dengan kolom:\n\n| Masuk | Keluar | Saldo |\n\nSetiap kolom punya 3 sub-kolom: Qty, Harga/unit, Jumlah.\n\nDi bagian bawah ada ringkasan:\n• Nilai Persediaan Akhir\n• Total HPP\n• Qty Akhir tersisa',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Persediaan Siap Dihitung!',
        body:'Kamu sekarang bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Input kartu stok masuk-keluar\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pilih metode FIFO/LIFO/WA/MWA\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Dapatkan nilai persediaan akhir & HPP\n\nLanjut ke <b>Kalkulator BEP</b>!',
        target: null }
    ]
  },

  'kalk-bep': {
    title: 'Kalkulator BEP & Margin', icon: '<i class="ti ti-target" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>', title:'Apa itu BEP?',
        body:'<b>BEP (Break Even Point)</b> adalah titik di mana bisnis tidak untung tidak rugi — tepat impas.\n\nKenapa penting?\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tahu berapa minimal harus jual\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Evaluasi apakah harga jual sudah cukup\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Perencanaan target penjualan',
        target: '.nav-item[onclick*="kalk-bep"]', navTo: 'kalk-bep' },
      { icon:'<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'3 Parameter Utama BEP',
        body:'<b>1. Harga Jual / Unit</b>\nBerapa harga yang dibayar pelanggan per unit produk.\n\n<b>2. Biaya Variabel / Unit</b>\nBiaya yang berubah sesuai jumlah produksi (bahan baku, komisi).\n\n<b>3. Biaya Tetap / Periode</b>\nBiaya yang tidak berubah berapa pun yang diproduksi (sewa, gaji tetap, listrik bulanan).\n\nRumus: <b>BEP = Biaya Tetap ÷ (Harga - Biaya Variabel)</b>',
        target: '#bep-harga', highlight: true },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Hasil yang Didapat',
        body:'Dari kalkulator BEP, kamu dapatkan:\n\n• <b>BEP Unit</b> — minimal berapa unit harus terjual\n• <b>BEP Rupiah</b> — minimal berapa omzet\n• <b>CM (Contribution Margin)</b> — laba per unit sebelum biaya tetap\n• <b>CM Ratio</b> — % laba dari harga jual\n• <b>Margin of Safety</b> — seberapa jauh dari titik rugi\n• <b>DOL</b> — seberapa sensitif laba terhadap perubahan penjualan',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'BEP Siap Dihitung!',
        body:'Sekarang kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Hitung BEP bisnis kamu\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tahu minimal target penjualan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Analisis margin dan risiko\n\nLanjut ke <b>Kalkulator Rasio Keuangan</b>!',
        target: null }
    ]
  },

  'kalk-rasio': {
    title: 'Kalkulator Rasio Keuangan', icon: '<i class="ti ti-scale" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M3 20.29V5a2 2 0 012-2h13.71a.7.7 0 01.5 1.21L5.21 18.5a.7.7 0 01-1.21-.5zM6 9h8M6 13h5"/></svg>', title:'Rasio Keuangan — Kesehatan Bisnis',
        body:'<b>Rasio keuangan</b> adalah angka-angka yang menunjukkan seberapa sehat bisnis kamu.\n\nIbarat hasil medical check-up untuk bisnis!\n\nBayu Harlan Priangga hitung 20+ rasio sekaligus dari data yang kamu masukkan.',
        target: '.nav-item[onclick*="kalk-rasio"]', navTo: 'kalk-rasio' },
      { icon:'<i class="ti ti-droplet ti-inline"></i>', title:'Rasio Likuiditas',
        body:'Mengukur kemampuan bayar utang jangka pendek:\n\n• <b>Current Ratio ≥ 2x</b> — sehat\nAset Lancar ÷ Utang Lancar\n\n• <b>Quick Ratio ≥ 1x</b> — sehat\n(Aset Lancar - Persediaan) ÷ Utang Lancar\n\n• <b>Cash Ratio ≥ 0,5x</b> — sehat\nKas ÷ Utang Lancar\n\nWarna hijau = baik, kuning = perlu perhatian, merah = bermasalah.',
        target: '#rasio-likuiditas', highlight: true },
      { icon:'<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Rasio Profitabilitas',
        body:'Mengukur kemampuan menghasilkan laba:\n\n• <b>NPM (Net Profit Margin)</b> ≥ 10% = baik\nLaba Bersih ÷ Penjualan\n\n• <b>ROA</b> ≥ 5% = baik\nLaba Bersih ÷ Total Aset\n\n• <b>ROE</b> ≥ 15% = baik\nLaba Bersih ÷ Ekuitas\n\nSemakin tinggi = semakin menguntungkan.',
        target: '#rasio-profitabilitas', highlight: true },
      { icon:'<i class="ti ti-clipboard-list ti-inline"></i>', title:'Cara Menggunakan',
        body:'Isi data dari laporan keuangan kamu di bagian kiri:\n\n1. Data Neraca (aset, liabilitas, ekuitas)\n2. Data Laba Rugi (penjualan, HPP, laba)\n3. Data Pasar (jika perusahaan publik)\n\nSemua rasio langsung dihitung otomatis di kanan.\nAda interpretasi warna dan benchmark di setiap rasio.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Rasio Keuangan Siap Dianalisis!',
        body:'Sekarang kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Isi data keuangan dan dapatkan 20+ rasio\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Baca interpretasi warna (hijau/kuning/merah)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Bandingkan dengan benchmark industri\n\nJika ada rasio yang merah, tanya <b>Orias Assisten</b> untuk rekomendasi perbaikannya!',
        target: null }
    ]
  },

  'ai-intro': {
    title: 'Mengenal Orias Assisten', icon: '<i class="ti ti-robot" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-robot" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Orias Assisten — Asisten Keuangan Cerdas',
        body:'<b>Orias Assisten</b> adalah asisten akuntansi yang memahami bahasa sehari-hari.\n\nKamu tidak perlu hafal menu atau fitur — cukup ceritakan apa yang ingin dilakukan, dan AI akan bantu!',
        target: '.nav-item[onclick*="ai-assistant"]', navTo: 'ai-assistant' },
      { icon:'💬', title:'Cara Bicara dengan AI',
        body:'Kamu bisa bicara natural, contoh:\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <i>"Kemarin beli laptop Rp 12jt untuk kantor, bayar tunai"</i>\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <i>"Gaji karyawan bulan ini Rp 8jt, belum dibayar"</i>\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <i>"Jual 50 unit barang @ Rp 25rb, bayar transfer"</i>\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <i>"Hitung penyusutan mesin 100jt umur 5 tahun"</i>\n\nAI akan pahami maksudmu dan buatkan jurnal/kalkulasi yang benar.',
        target: '#ai-input', highlight: true },
      { icon:'<i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i>', title:'Simpan Jurnal dari AI',
        body:'Jika AI membuatkan jurnal, akan muncul tombol:\n\n<b>"<i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Simpan Jurnal ke Sistem"</b>\n\nKlik tombol itu → jurnal langsung masuk ke database tanpa perlu input manual!\n\nJuga ada tombol shortcut ke kalkulator yang relevan dari jawaban AI.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Siap Pakai AI!',
        body:'Sekarang kamu tahu cara pakai Orias Assisten:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Ketik transaksi dalam bahasa natural\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Minta hitung pajak, penyusutan, BEP, dll\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Simpan jurnal dari AI dengan satu klik\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tanya cara pakai fitur apapun\n\nAI tidak pernah bingung — selalu siap membantu 24/7!',
        target: null }
    ]
  },

  'ai-advanced': {
    title: 'AI untuk Analisis Keuangan', icon: '✨',
    steps: [
      { icon:'✨', title:'Lebih dari Sekedar Input Transaksi',
        body:'Orias Assisten bukan hanya untuk input transaksi — dia bisa jadi konsultan keuangan pribadi kamu!\n\nDia punya akses ke data keuangan kamu yang sudah tercatat dan bisa memberikan analisis mendalam.',
        target: '.nav-item[onclick*="ai-assistant"]', navTo: 'ai-assistant' },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Minta Analisis Laporan',
        body:'Coba tanya AI:\n\n💬 <i>"Analisis kondisi keuangan bisnis saya sekarang"</i>\n💬 <i>"Apakah rasio keuangan saya bagus?"</i>\n💬 <i>"Ada masalah apa di laporan keuangan saya?"</i>\n💬 <i>"Kenapa laba saya kecil padahal penjualan banyak?"</i>\n\nAI akan baca data jurnal dan berikan insight spesifik!',
        target: '#ai-input', highlight: true },
      { icon:'🎯', title:'Minta Rekomendasi',
        body:'AI juga bisa kasih rekomendasi:\n\n💬 <i>"Bagaimana cara meningkatkan profit margin saya?"</i>\n💬 <i>"Akun apa yang perlu saya tambahkan untuk bisnis restoran?"</i>\n💬 <i>"Saya mau ajukan kredit bank, dokumen apa yang perlu disiapkan?"</i>',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'AI Siap Jadi Konsultan Kamu!',
        body:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> AI paham bahasa natural dan konteks\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> AI baca data keuangan kamu secara real-time\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> AI tahu semua standar PSAK & perpajakan Indonesia\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> AI bisa jelaskan ulang dengan cara berbeda jika belum paham',
        target: null }
    ]
  },

  // ═══ FITUR BARU ═══

  'tut-jurnal-berulang': {
    title: 'Jurnal Berulang', icon: '<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Apa itu Jurnal Berulang?',
        body:'Jurnal Berulang adalah template transaksi yang berjalan otomatis sesuai jadwal.\n\nContoh penggunaan:\n💼 Gaji karyawan → tiap bulan tanggal 25\n🏠 Sewa kantor → tiap bulan tanggal 1\n<i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Cicilan → tiap bulan\n<i class="ti ti-package" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Langganan software → tiap tahun\n\nSekali setup, sistem yang mencatat otomatis!',
        navTo: 'jurnal-berulang' },
      { icon:'+', title:'Cara Membuat Jurnal Berulang',
        body:'1. Buka menu <b>J. Berulang</b> di sidebar\n2. Ketuk <b>+ Tambah Berulang</b>\n3. Isi nama template (contoh: "Gaji Karyawan")\n4. Pilih frekuensi: Harian / Mingguan / Bulanan / Triwulan / Tahunan\n5. Pilih tanggal mulai\n6. Pilih akun Debit dan Kredit\n7. Isi nominal dan keterangan\n8. Ketuk <b>Simpan</b>',
        target: null },
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>', title:'Menjalankan Jurnal Tertunda',
        body:'Sistem otomatis deteksi jurnal yang tertunda saat app dibuka.\n\n<b>Jalankan satu:</b> Ketuk tombol <i class="ti ti-player-play" style="font-size:11px;vertical-align:-1px;"></i> di baris jurnal\n<b>Jalankan semua:</b> Ketuk tombol <b>▶ Jalankan Semua Tertunda</b>\n\nSetelah dijalankan, jurnal otomatis tercatat di Jurnal Umum dan tanggal berikutnya diperbarui otomatis.',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Tips Jurnal Berulang',
        body:'💡 Tips:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Gunakan keterangan "[Auto] Nama Jurnal" agar mudah diidentifikasi\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Set tanggal berakhir jika transaksi ada batas waktu (cicilan selesai)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Nonaktifkan (<i class="ti ti-player-pause" style="font-size:11px;vertical-align:-1px;"></i>) jika sementara tidak perlu tanpa menghapus template\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Cek riwayat eksekusi di bagian bawah halaman',
        target: null }
    ]
  },

  'tut-invoice': {
    title: 'Invoice & Piutang', icon: '<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2v18l-2-2-2 2-2-2-2 2-2-2-2 2zm4-11h6m-6 4h6"/></svg>', title:'Apa itu Fitur Invoice?',
        body:'Fitur Invoice memungkinkan kamu:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Buat invoice profesional untuk pelanggan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lacak status: Draft → Terkirim → Lunas\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Deteksi otomatis invoice yang sudah jatuh tempo\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal piutang dibuat otomatis saat invoice dikirim\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal penerimaan kas dibuat otomatis saat tandai lunas',
        navTo: 'invoice' },
      { icon:'+', title:'Cara Membuat Invoice',
        body:'1. Buka menu <b>Invoice</b> → ketuk <b>+ Buat Invoice</b>\n2. No. Invoice otomatis terisi (bisa diubah)\n3. Isi nama pelanggan dan tanggal jatuh tempo\n4. Tambah item/jasa: nama, qty, harga\n5. Centang PPN 11%/12% jika dikenakan pajak\n6. Pilih akun piutang dan akun pendapatan\n7. Ketuk <b>Simpan & Terkirim</b> → jurnal piutang otomatis dibuat!',
        target: null },
      { icon:'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', title:'Tandai Invoice Lunas',
        body:'Saat pelanggan membayar:\n1. Temukan invoice di daftar\n2. Ketuk tombol <b><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lunas</b>\n3. Isi tanggal pembayaran dan nominal\n4. Pilih akun kas/bank penerima\n5. Ketuk <b>Konfirmasi Lunas & Buat Jurnal</b>\n\nJurnal: Kas (Debit) | Piutang Usaha (Kredit) — otomatis!',
        target: null },
      { icon:'🔍', title:'Filter & Monitoring',
        body:'Gunakan filter status untuk monitoring:\n<i class="ti ti-clipboard-list ti-inline"></i> <b>Semua</b> — lihat semua invoice\n<i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Draft</b> — belum dikirim ke pelanggan\n<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> <b>Terkirim</b> — menunggu pembayaran\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Lunas</b> — sudah dibayar\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Jatuh Tempo</b> — lewat tanggal bayar\n\nKPI cards di atas menampilkan total tagihan, lunas, belum lunas, dan jumlah jatuh tempo.',
        target: null }
    ]
  },

  'tut-rekonsiliasi': {
    title: 'Rekonsiliasi Bank', icon: '<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Apa itu Rekonsiliasi Bank?',
        body:'Rekonsiliasi bank adalah proses mencocokkan mutasi di rekening bank dengan jurnal yang sudah dicatat di OAS.\n\nManfaatnya:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Temukan transaksi yang belum dicatat\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Deteksi selisih atau kesalahan pencatatan\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pastikan saldo buku = saldo bank\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Import transaksi bank langsung jadi jurnal',
        navTo: 'rekonsiliasi' },
      { icon:'<i class="ti ti-download ti-inline"></i>', title:'Upload CSV Mutasi Bank',
        body:'1. Buka menu <b>Rekonsiliasi</b>\n2. Pilih nama bank (BCA/Mandiri/BNI/BRI/Generic)\n3. Download mutasi rekening dari internet banking dalam format CSV\n4. Tap zona upload atau drag file CSV ke sana\n5. File langsung diparse — lihat ringkasan di panel kanan',
        target: null },
      { icon:'🔍', title:'Proses Pencocokan',
        body:'Ketuk <b><i class="ti ti-search" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Proses Rekonsiliasi</b> — sistem otomatis:\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Cocok</b> — tanggal & nominal sama dengan jurnal\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Beda Nominal</b> — tanggal sama tapi nominal berbeda\n<i class="ti ti-question-mark" style="color:var(--red);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Belum Cocok</b> — tidak ada jurnal yang sesuai\n\nGunakan filter untuk fokus ke yang belum cocok.',
        target: null },
      { icon:'<i class="ti ti-download ti-inline"></i>', title:'Import Transaksi Bank',
        body:'Untuk transaksi <b><i class="ti ti-question-mark" style="color:var(--red);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Belum Cocok</b>:\n\n<b>Satu-satu:</b> Ketuk <b><i class="ti ti-download ti-inline"></i> Import</b> di baris transaksi\n<b>Semua sekaligus:</b> Ketuk <b><i class="ti ti-download ti-inline"></i> Import Belum Cocok</b>\n\nJurnal otomatis dibuat dari data mutasi bank. Kamu bisa edit akun setelahnya di Jurnal Umum.',
        target: null }
    ]
  },

  'tut-kurs': {
    title: 'Multi Mata Uang & Kurs', icon: '💱',
    steps: [
      { icon:'💱', title:'Fitur Multi Mata Uang',
        body:'OAS mendukung 6 mata uang: IDR, USD, SGD, EUR, MYR, JPY.\n\nFitur ini berguna untuk:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Bisnis yang bertransaksi dalam mata uang asing\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Konversi cepat antar mata uang\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tracking nilai kurs terkini\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Update kurs manual atau otomatis',
        navTo: 'kurs' },
      { icon:'<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Update Kurs',
        body:'<b>Update Otomatis:</b>\nKetuk tombol <b><i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Update Kurs</b> di pojok kanan atas — kurs langsung diperbarui.\n\n<b>Update Manual:</b>\nDi panel kanan "Atur Kurs Manual", isi nilai kurs terbaru per USD, lalu ketuk <b><i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Simpan Kurs</b>.\n\nKurs disimpan di perangkat dan dipakai untuk konversi.',
        target: null },
      { icon:'<i class="ti ti-list" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>', title:'Konverter Cepat',
        body:'Panel kiri "Konverter Cepat":\n1. Isi nominal yang ingin dikonversi\n2. Pilih mata uang asal (Dari)\n3. Pilih mata uang tujuan (Ke)\n4. Hasil konversi muncul otomatis real-time\n\nContoh: 1.000.000 IDR → berapa USD? Langsung terhitung!',
        target: null }
    ]
  },

  'tut-notifikasi': {
    title: 'Notifikasi & Alert', icon: '🔔',
    steps: [
      { icon:'🔔', title:'Alert Keuangan Otomatis',
        body:'Sistem notifikasi OAS memantau kondisi keuangan bisnis kamu secara otomatis.\n\nAda 5 tipe alert:\n💸 Arus kas negatif\n<i class="ti ti-chart-bar ti-inline"></i> Anggaran terlampaui\n⏰ Invoice jatuh tempo\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Saldo akun di bawah batas\n📉 Laba bersih negatif',
        navTo: 'notifikasi' },
      { icon:'+', title:'Cara Membuat Alert',
        body:'1. Buka menu <b>Notifikasi</b>\n2. Ketuk <b>+ Tambah Alert</b>\n3. Beri nama alert (contoh: "Peringatan Arus Kas")\n4. Pilih tipe alert dari daftar\n5. Isi parameter jika diperlukan (contoh: batas % untuk anggaran)\n6. Ketuk <b>Simpan Alert</b>\n\nAlert langsung aktif dan dicek setiap ada perubahan data.',
        target: null },
      { icon:'🔴', title:'Membaca Alert Aktif',
        body:'Saat ada kondisi yang terpenuhi:\n\n🔴 <b>Alert bahaya</b> — latar merah (arus kas negatif, jatuh tempo)\n🟡 <b>Alert peringatan</b> — latar kuning (mendekati batas)\n\nAngka merah di ikon 🔔 di sidebar menunjukkan jumlah alert aktif.\n\nRiwayat semua notifikasi tersimpan di panel kanan.',
        target: null }
    ]
  },

  'tut-anggaran': {
    title: 'Anggaran vs Aktual', icon: '🎯',
    steps: [
      { icon:'🎯', title:'Mengapa Perlu Anggaran?',
        body:'Anggaran (budget) adalah target pengeluaran atau pendapatan per akun per bulan.\n\nDengan fitur ini kamu bisa:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Set target realistis per kategori\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Monitor apakah pengeluaran sesuai rencana\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lihat variance (selisih anggaran vs aktual)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Dapat peringatan saat melebihi anggaran',
        navTo: 'anggaran' },
      { icon:'+', title:'Set Anggaran Baru',
        body:'1. Buka menu <b>Anggaran</b>\n2. Ketuk <b>+ Set Anggaran</b>\n3. Pilih akun (misalnya: Beban Gaji, Beban Sewa)\n4. Pilih periode bulan (YYYY-MM)\n5. Isi nominal target anggaran\n6. Tambah catatan opsional\n7. Ketuk <b>Simpan Anggaran</b>',
        target: null },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Membaca Progress Anggaran',
        body:'Panel "Progress Anggaran Bulan Ini" menampilkan:\n\n🟢 <b>Hijau</b> — masih di bawah 80% → aman\n🟡 <b>Kuning</b> — 80–100% → perhatikan\n🔴 <b>Merah</b> — melewati 100% → melebihi anggaran!\n\nTabel detail menampilkan semua akun dengan variance dan status on-track/melebihi.',
        target: null },
      { icon:'<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Chart Anggaran vs Aktual',
        body:'Chart batang di panel kanan membandingkan:\n\n🔵 <b>Batang biru</b> — nominal anggaran yang ditetapkan\n🟢 <b>Batang hijau</b> — aktual dari jurnal yang sudah tercatat\n\nKlik chart untuk tampilan HD yang lebih besar dan jelas.',
        target: null }
    ]
  },

  'tut-pajak': {
    title: 'Pajak Otomatis', icon: '<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i>',
    steps: [
      { icon:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent2)"><path d="M5 21V3l2 2 2-2 2 2 2-2 2 2 2-2v18l-2-2-2 2-2-2-2 2-2-2-2 2zm4-11h6m-6 4h6"/></svg>', title:'Pajak Otomatis di OAS',
        body:'OAS otomatis menghitung pajak dari data jurnal kamu:\n\n💰 <b>PPN 11%/12%</b> — dari transaksi penjualan & pembelian\n👤 <b>PPh 21</b> — pajak gaji karyawan (progresif)\n🏢 <b>PPh 23</b> — jasa, royalti, sewa, dividen, bunga\n\nHitung otomatis, buat jurnal pajak satu klik!',
        navTo: 'pajak' },
      { icon:'💰', title:'PPN Keluaran & Masukan',
        body:'Sistem otomatis scan jurnal penjualan dan pembelian:\n\n<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> <b>PPN Keluaran</b> = PPN dari penjualan (hutang ke negara)\n<i class="ti ti-download ti-inline"></i> <b>PPN Masukan</b> = PPN dari pembelian (kredit pajak)\n<i class="ti ti-scale ti-inline"></i> <b>Kurang/(Lebih) Bayar</b> = Keluaran minus Masukan\n\nKetuk <b><i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Hitung Ulang</b> untuk perbarui kalkulasi.',
        target: null },
      { icon:'👤', title:'PPh 21 — Pajak Gaji',
        body:'1. Isi <b>Total Gaji Bruto/Bulan</b> dan <b>Jumlah Karyawan</b>\n2. Sistem otomatis hitung PKP, biaya jabatan, PTKP\n3. Tarif progresif: 5% / 15% / 25% / 30% / 35%\n4. Ketuk <b><i class="ti ti-notebook" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Buat Jurnal PPh 21</b>\n\nJurnal: Beban Gaji (D) | Hutang PPh 21 (K) | Kas (K)',
        target: null },
      { icon:'🏢', title:'PPh 23 — Jasa & Royalti',
        body:'1. Pilih jenis penghasilan (Jasa 2%, Royalti 15%, Sewa 2%, dll)\n2. Isi nilai bruto\n3. PPh otomatis terhitung\n4. Ketuk <b><i class="ti ti-notebook" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Buat Jurnal PPh 23</b>\n\nRingkasan SPT Tahunan di panel kanan merangkum semua penghasilan bruto, HPP, dan PPN wajib bayar untuk pelaporan.',
        target: null }
    ]
  },

  'tut-analitik': {
    title: 'Analitik & Tren Bisnis', icon: '<i class="ti ti-chart-bar ti-inline"></i>',
    steps: [
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Dashboard Analitik',
        body:'Halaman Analitik menampilkan 10+ grafik visual dari data jurnal kamu:\n\n<i class="ti ti-chart-bar ti-inline"></i> Pendapatan vs Beban per Bulan\n<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Tren Laba Bersih\n<i class="ti ti-droplet ti-inline"></i> Arus Kas Bersih per Bulan\n🌊 Waterfall Laba-Rugi\n📉 Growth MoM (%)\n🍩 Distribusi Beban (Donut)\n💰 Posisi Keuangan\n🎯 Margin per Bulan\n🔮 Proyeksi Keuangan',
        navTo: 'analitik' },
      { icon:'📱', title:'Scroll Horizontal di Mobile',
        body:'Di HP, chart kadang tampak sempit karena banyak data bulan.\n\n👆 <b>Geser kiri-kanan</b> di area chart untuk scroll horizontal\n• Label bulan dan tahun tampil 2 baris (tidak bertabrakan)\n\nScrollbar tipis muncul di bawah chart sebagai indikator posisi.',
        target: null },
      { icon:'🔍', title:'Tampilan Chart HD',
        body:'Ketuk/klik chart mana saja untuk membuka modal HD!\n\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Chart diperbesar mengisi layar penuh\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Resolusi super tajam\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Scroll horizontal jika data banyak\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tutup dengan ketuk ✕ atau area gelap atau tekan Escape',
        target: null },
      { icon:'<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Export Analitik',
        body:'Data analitik bisa diekspor!\n\n1. Ketuk <b>Export Laporan</b> di sidebar\n2. Centang <b><i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Grafik Analitik Bisnis</b>\n3. Pilih format Excel\n4. Ketuk Export\n\nSheet "<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Analitik Bisnis" berisi data 12 bulan: pendapatan, beban, laba, margin, dan pertumbuhan MoM.',
        target: null }
    ]
  },

  'tut-chart-hd': {
    title: 'Chart HD & Zoom', icon: '🔍',
    steps: [
      { icon:'🔍', title:'Fitur Chart HD',
        body:'Semua chart di halaman Analitik bisa diklik untuk membuka tampilan HD!\n\nCaranya:\n👆 <b>Mobile</b>: Tap chart\n🖱️ <b>Desktop</b>: Klik chart\n\nModal akan terbuka dengan chart diperbesar mengisi layar — sangat berguna untuk presentasi atau analisis detail.',
        navTo: 'analitik' },
      { icon:'📱', title:'Scroll Horizontal',
        body:'Setiap chart di mobile punya scroll horizontal sendiri (bukan seluruh halaman).\n\nLabel format baru:\n• Baris atas: nama bulan (Jan, Feb, Mar)\n• Baris bawah: tahun (2025, 2026)\n\nLabel tidak bertabrakan lagi meski data banyak!',
        target: null }
    ]
  },

  'export-laporan': {
    title: 'Export PDF, Excel & CSV', icon: '<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    steps: [
      { icon:'<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Cara Export Laporan',
        body:'OAS mendukung export ke 3 format:\n\n<i class="ti ti-chart-bar ti-inline"></i> <b>Excel (.xlsx)</b> — tabel terformat, formula aktif\n📄 <b>PDF</b> — siap cetak/kirim, bisa tambah logo\n<i class="ti ti-clipboard-list ti-inline"></i> <b>CSV</b> — untuk Google Sheets / analisis eksternal\n\nBuka: Sidebar → <b>Export Laporan</b>',
        target: null },
      { icon:'✨', title:'Export Fitur Baru',
        body:'Selain laporan standar, sekarang bisa export:\n\n<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Invoice & Piutang</b> — semua invoice + status\n<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> <b>Jurnal Berulang</b> — daftar template aktif\n🎯 <b>Anggaran vs Aktual</b> — realisasi per akun\n<i class="ti ti-file-invoice" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> <b>Laporan Pajak</b> — rekap PPN & riwayat transaksi\n<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> <b>Analitik Bisnis</b> — data 12 bulan tren keuangan',
        target: null },
      { icon:'📄', title:'Export PDF dengan Logo',
        body:'Saat pilih format PDF:\n1. Upload logo perusahaan (PNG/JPG/SVG, maks 2MB)\n2. Logo muncul di pojok kiri atas setiap halaman\n3. Isi nama perusahaan dan periode\n4. Setiap laporan dipisah per halaman otomatis',
        target: null },
      { icon:'<i class="ti ti-chart-bar ti-inline"></i>', title:'Template Excel',
        body:'Ada 2 template Excel:\n\n<i class="ti ti-clipboard-list ti-inline"></i> <b>Template Data</b> — data mentah per sheet, formula referensi\n<i class="ti ti-settings ti-inline"></i> <b>Template Hitung Otomatis</b> — formula Excel aktif, ubah di sheet INPUT → semua laporan update otomatis\n\nTemplate Hitung Otomatis cocok untuk akuntan yang mau edit dan analisis di Excel.',
        target: null }
    ]
  },

  'tut-shortcut': {
    title: 'Keyboard Shortcut', icon: '⌨️',
    steps: [
      { icon:'⌨️', title:'Shortcut Keyboard OAS',
        body:'Shortcut untuk kerja lebih cepat:\n\n<b>Ctrl+N</b> — Input transaksi baru\n<b>Ctrl+S</b> — Simpan data ke cloud\n<b>Ctrl+/</b> — Buka AI Assisten\n<b>Ctrl+E</b> — Buka modal Export\n<b>Ctrl+F</b> — Fokus ke pencarian\n<b>Escape</b> — Tutup modal / picker\n<b>Alt+←</b> — Kembali ke halaman sebelumnya\n\nShortcut aktif di semua halaman.',
        target: null }
    ]
  },

  'tut-mobile': {
    title: 'Penggunaan di Mobile', icon: '📱',
    steps: [
      { icon:'📱', title:'OAS di Mobile',
        body:'OAS dirancang mobile-first dengan fitur:\n\n🔃 <b>Pull-to-refresh</b> — tarik ke bawah untuk refresh data\n<i class="ti ti-clipboard-list ti-inline"></i> <b>Bottom sheet picker</b> — pilih akun/opsi dari bawah layar\n📲 <b>Install sebagai PWA</b> — buka seperti aplikasi native\n👆 <b>Swipe & scroll</b> — navigasi intuitif',
        target: null },
      { icon:'📲', title:'Install sebagai App',
        body:'Buka sidebar → scroll ke bawah → ketuk <b>📲 Install App</b>\n\nSetelah install:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Icon OAS muncul di home screen\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Buka tanpa URL bar browser\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tampilan fullscreen\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Akses lebih cepat\n\nPanduan detail otomatis muncul sesuai browser kamu.',
        target: null },
      { icon:'🔃', title:'Pull-to-Refresh',
        body:'Saat berada di paling atas halaman:\n\n1. Tarik layar ke bawah dengan jari\n2. Muncul indikator loading\n3. Lepas saat indikator berputar\n4. Data direfresh!\n\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Hanya isi konten yang refresh — header/topbar tetap di tempat.',
        target: null }
    ]
  },

  'tut-backup': {
    title: 'Backup & Sinkronisasi', icon: '☁️',
    steps: [
      { icon:'☁️', title:'Simpan Data ke Cloud',
        body:'OAS mendukung 2 mode penyimpanan:\n\n<i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> <b>Mode Tamu (Lokal)</b> — data tersimpan di browser perangkat ini saja\n☁️ <b>Mode Login (Cloud)</b> — data tersimpan di Supabase, bisa diakses dari perangkat manapun\n\nMode cloud memerlukan akun gratis di Supabase.',
        target: null },
      { icon:'<i class="ti ti-download ti-inline"></i>', title:'Export Backup JSON',
        body:'Cara backup manual:\n1. Buka sidebar → <b>Kelola</b>\n2. Ketuk <b>Export Backup JSON</b>\n3. File JSON diunduh ke perangkat\n\nFile JSON berisi semua jurnal, akun, pengaturan, invoice, anggaran, dan data lainnya.',
        target: null },
      { icon:'<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', title:'Import / Restore Backup',
        body:'Cara restore dari backup:\n1. Buka sidebar → <b>Kelola</b>\n2. Ketuk <b>Import Backup JSON</b>\n3. Pilih file JSON backup\n4. Konfirmasi restore\n\n<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Import akan menggantikan semua data yang ada sekarang.',
        target: null }
    ]
  },

  'saldo-awal': {
    title: 'Setup Saldo Awal', icon: '🏁',
    steps: [
      { icon:'🏁', title:'Mengapa Perlu Saldo Awal?',
        body:'Saldo awal adalah posisi keuangan bisnis kamu sebelum mulai mencatat di OAS.\n\nContoh:\n<i class="ti ti-cash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Kamu punya kas Rp 50 juta\n<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Tabungan bank Rp 200 juta\n🏠 Aset gedung Rp 500 juta\n<i class="ti ti-credit-card" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Utang bank Rp 150 juta\n\nSemua ini perlu diinput agar laporan keuangan akurat dari hari pertama.',
        target: null },
      { icon:'<i class="ti ti-settings ti-inline"></i>', title:'Cara Input Saldo Awal',
        body:'1. Buka <b>Dashboard</b> → ketuk tombol <b>Saldo Awal</b>\n2. Isi saldo untuk setiap akun yang relevan\n3. Sistem akan buat jurnal pembuka otomatis\n\nAlternatif: Input manual via <b>Jurnal Manual</b> dengan keterangan "Saldo Awal [nama akun]"\n\nAkun yang biasanya perlu saldo awal:\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Kas & Bank\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Piutang (jika ada)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Aset Tetap\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Utang (jika ada)\n<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Modal Pemilik',
        target: 'button[onclick*="saldoAwal"], button[onclick*="saldo-awal"]', navTo: 'dashboard' }
    ]
  }
};

// Runtime state
let activeTutId = null;
let tutStep = 0;
let tutHighlighted = null;

// Start tutorial by ID
function startTutorialById(id) {
  tutRestore();
  setTimeout(initTutDrag, 300);
  if(id === 'semua') {
    // Run all in sequence — flatten all steps with section markers
    const allIds = Object.keys(TUT_MODULES);
    runSequential(allIds, 0);
    return;
  }
  activeTutId = id;
  tutStep = 0;
  document.getElementById('tut-backdrop').style.display = 'block';
  document.getElementById('tut-complete').style.display = 'none';
  closeSidebar();
  renderTutStep();
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
  document.getElementById('tut-step-label').innerHTML = `${mod.icon} ${mod.title}`;
  document.getElementById('tut-counter').textContent = `${tutStep+1} / ${total}`;
  document.getElementById('tut-progress').style.width = ((tutStep+1)/total*100) + '%';

  // Content
  document.getElementById('tut-icon').innerHTML = step.icon;
  document.getElementById('tut-title').textContent = step.title;
  document.getElementById('tut-body').innerHTML = step.body.replace(/\n/g, '<br>').replace(/`([^`]+)`/g, '<code style="background:var(--bg);padding:2px 6px;border-radius:4px;font-family:var(--mono);font-size:12px;color:var(--accent-text);display:inline-block;margin:2px 0;">$1</code>').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/<b>/g,'<b style="color:var(--text)">');

  // No task box in new system — just explanation
  document.getElementById('tut-task-wrap').style.display = 'none';
  document.getElementById('tut-tip-wrap').style.display = 'none';

  // Next button
  const nextBtn = document.getElementById('tut-btn-next');
  if(tutStep === total - 1) {
    nextBtn.innerHTML = window._tutSeqIds ? 'Bagian Berikutnya →' : '<i class="ti ti-circle-check" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Selesai';
  } else {
    nextBtn.innerHTML = 'Lanjut →';
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
