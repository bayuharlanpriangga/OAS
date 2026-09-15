// ══════════════════════════════════════════════════════════════════
// SETTINGS — SATU file untuk seluruh halaman #page-settings:
//   - Navigasi drill-down (Root -> Akun / Transaksi -> sub-halaman)
//   - Akun: foto, nama, informasi akun (provider login + password)
//   - Transaksi: Penjualan & Pembelian (mapping akun default)
//   - Account Switcher (gaya Google/FB/IG) — dropdown dari chip sidebar
// Sebelumnya terpecah di js/17-settings-profil.js + js/21-settings-page.js,
// sekarang digabung jadi satu supaya tidak ada 2 "sumber kebenaran" utk Settings.
// ══════════════════════════════════════════════════════════════════

// ──────────────────────────────────────────────────────────────────
// NAVIGASI DRILL-DOWN
// ──────────────────────────────────────────────────────────────────
const SETTINGS_TITLES = {
  'root':            ['Settings', 'Akun, autentikasi & pengaturan transaksi'],
  'akun':            ['Akun', 'Foto, nama & informasi akun'],
  'akun-nama':       ['Nama', 'Ubah nama tampilan akun'],
  'akun-info':       ['Informasi Akun', 'Kelola metode login & password'],
  'transaksi':       ['Transaksi', 'Pengaturan akun default per jenis transaksi'],
  'transaksi-jual':  ['Penjualan', 'Akun default untuk tiap jenis penjualan'],
  'transaksi-beli':  ['Pembelian', 'Akun default untuk tiap jenis pembelian'],
};

let settingsStack = ['root'];

function settingsNavigate(view) {
  if (!SETTINGS_TITLES[view]) return;
  if (settingsStack[settingsStack.length - 1] !== view) settingsStack.push(view);
  renderSettingsView();
}

function settingsGoBack() {
  if (settingsStack.length <= 1) return;
  settingsStack.pop();
  renderSettingsView();
}

// Reset stack ke urutan tertentu — dipakai untuk deep-link (mis. dari Master Produk
// langsung ke Settings > Transaksi > Penjualan) dan shortcut tombol "Akun".
function settingsResetTo(views) {
  settingsStack = views.slice();
  renderSettingsView();
}

function renderSettingsView() {
  const current = settingsStack[settingsStack.length - 1];
  document.querySelectorAll('.settings-view').forEach(v => v.classList.remove('active'));
  document.getElementById('settings-view-' + current)?.classList.add('active');

  const t = SETTINGS_TITLES[current] || ['Settings', ''];
  const titleEl = document.getElementById('settings-crumb-title');
  const subEl   = document.getElementById('settings-crumb-sub');
  if (titleEl) titleEl.textContent = t[0];
  if (subEl)   subEl.textContent   = t[1];

  const backBtn = document.getElementById('settings-back-btn');
  if (backBtn) backBtn.classList.toggle('show', settingsStack.length > 1);

  // Trigger loader yang relevan per view
  if (current === 'akun' || current === 'akun-nama' || current === 'akun-info') {
    accsLoadUserInfo();
  }
  if (current === 'akun-info') {
    accsLoadProviders();
  }
  if (current === 'transaksi' || current === 'transaksi-jual' || current === 'transaksi-beli') {
    renderSettingsTransaksi();
  }
}

// ── Wrapper kompatibilitas (dipanggil dari tempat lama: tombol dashboard,
// deep-link di Master Produk, dll) — supaya tidak perlu ubah semua call site ──
function switchSettingsTab(tab) {
  settingsNavigate(tab === 'transaksi' ? 'transaksi' : 'akun');
}
function switchSettingsTransTab(sub) {
  settingsNavigate('transaksi-' + sub);
}
function switchAccsTab(tab) {
  // Dulu ada 3 tab (providers/profile/password) di dalam Akun.
  // Sekarang: 'profile' -> halaman Nama, 'providers'/'password' -> Informasi Akun.
  settingsNavigate(tab === 'profile' ? 'akun-nama' : 'akun-info');
}

// ══════════════════════════════════════════════════════════════════
// TRANSAKSI — mapping akun default Penjualan & Pembelian
// ══════════════════════════════════════════════════════════════════
function _settingsJualJenisList() {
  return (typeof _jualAkunOptions !== 'undefined' ? _jualAkunOptions : []).map(o => ({ kodeDefault: o.value, label: o.label }));
}
function _settingsBeliJenisList() {
  return (typeof _beliAkunOptions !== 'undefined' ? _beliAkunOptions : []).map(o => ({ kodeDefault: o.value, label: o.label }));
}

function renderSettingsTransaksi() {
  _renderSettingsAkunList('jual', _settingsJualJenisList(), 'settings-jual-list');
  _renderSettingsAkunList('beli', _settingsBeliJenisList(), 'settings-beli-list');
  _renderSettingsHppPersediaan();
}

function _renderSettingsAkunList(kategori, jenisList, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = jenisList.map(j => {
    const efektif   = resolveAkunSetting(kategori, j.kodeDefault);
    const akunObj   = akuns.find(a => a.kode === efektif);
    const notFound  = !akunObj;
    const isCustom  = efektif !== j.kodeDefault;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid ${notFound ? 'var(--red)' : 'var(--border)'};border-radius:8px;margin-bottom:6px;background:var(--surface2);">
        <div style="flex:1;min-width:0;">
          <div style="font-weight:600;font-size:13px;">${escapeHtml(j.label)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;">Default: ${escapeHtml(j.kodeDefault)}${akunObj ? ' · ' + escapeHtml(akunObj.nama) : ''}</div>
        </div>
        <input type="text" value="${escapeHtml(efektif)}" data-kategori="${kategori}" data-jenis="${escapeHtml(j.kodeDefault)}"
          onchange="_updateSettingsAkun(this)"
          style="width:80px;text-align:center;font-family:var(--mono);padding:7px 6px;border:1px solid ${notFound ? 'var(--red)' : 'var(--border)'};border-radius:6px;background:var(--surface);color:var(--text);font-size:12.5px;">
        ${isCustom
          ? `<button type="button" onclick="_resetSettingsAkun('${kategori}','${escJsAttr(j.kodeDefault)}')" title="Reset ke default" style="background:none;border:none;color:var(--muted);cursor:pointer;padding:4px;flex-shrink:0;"><i class="ti ti-refresh" style="font-size:15px;"></i></button>`
          : `<span style="width:23px;display:inline-block;flex-shrink:0;"></span>`}
      </div>
      ${notFound ? `<div style="font-size:11px;color:var(--red);margin:-2px 0 8px 2px;"><i class="ti ti-alert-triangle" style="font-size:11px;vertical-align:-1px;"></i> Akun ${escapeHtml(efektif)} tidak ditemukan di COA — cek Sampah COA atau isi kode akun lain.</div>` : ''}`;
  }).join('');
}

function _updateSettingsAkun(input) {
  const kategori = input.dataset.kategori;
  const jenis    = input.dataset.jenis;
  const val      = input.value.trim() || jenis;
  if (!transaksiAkunSettings[kategori]) transaksiAkunSettings[kategori] = {};
  transaksiAkunSettings[kategori][jenis] = val;
  markDirty();
  renderSettingsTransaksi();
}

function _resetSettingsAkun(kategori, jenis) {
  if (transaksiAkunSettings[kategori]) transaksiAkunSettings[kategori][jenis] = jenis;
  markDirty();
  renderSettingsTransaksi();
}

// Dulu diset per-produk di Master Produk (akunHpp/akunPers) — sekarang default global di sini.
function _renderSettingsHppPersediaan() {
  const box = document.getElementById('settings-jual-list');
  if (!box) return;
  const hppVal  = transaksiAkunSettings.jualHpp || '';
  const persVal = transaksiAkunSettings.jualPersediaan || '';
  box.insertAdjacentHTML('beforeend', `
    <div style="margin-top:10px;padding-top:14px;border-top:1px solid var(--border);">
      <div style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px;">HPP &amp; Persediaan (dulu diset per-produk di Master Produk)</div>
      <div class="form-row">
        <div class="form-group">
          <label>Akun HPP (default)</label>
          <input type="text" value="${escapeHtml(hppVal)}" placeholder="5101 (otomatis)"
            onchange="transaksiAkunSettings.jualHpp=this.value.trim();markDirty();"
            style="font-family:var(--mono);">
        </div>
        <div class="form-group">
          <label>Akun Persediaan (default)</label>
          <input type="text" value="${escapeHtml(persVal)}" placeholder="Kosongkan = tebak otomatis"
            onchange="transaksiAkunSettings.jualPersediaan=this.value.trim();markDirty();"
            style="font-family:var(--mono);">
        </div>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:4px;">Kosongkan Akun Persediaan supaya tetap pakai deteksi otomatis per kategori produk (dagang/bahan baku/barang jadi).</div>
    </div>`);
}

// ══════════════════════════════════════════════════════════════════
// ACCOUNT SWITCHER — gaya Google/FB/IG, maks 5 akun tersimpan di device.
// Chip di sidebar (#user-company-chip) HANYA membuka dropdown ini —
// TIDAK pernah langsung navigasi ke Settings. Untuk ke Settings, ada
// menu item "Pengaturan Akun" di dalam dropdown ini, atau lewat nav
// item "Settings" terpisah di sidebar.
// ══════════════════════════════════════════════════════════════════
const ACCOUNT_SWITCHER_KEY = 'oas_saved_accounts';
const ACCOUNT_SWITCHER_MAX = 5;

function _getSavedAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNT_SWITCHER_KEY) || '[]'); } catch (e) { return []; }
}
function _setSavedAccounts(list) {
  try { localStorage.setItem(ACCOUNT_SWITCHER_KEY, JSON.stringify(list)); } catch (e) {}
}

// Dipanggil dari js/16-auth-company.js tiap kali onAuthStateChange dapat sesi valid
function saveCurrentAccountToSwitcher(session) {
  if (!session?.user || !session.access_token || !session.refresh_token) return;
  let list = _getSavedAccounts();
  const idx = list.findIndex(a => a.uid === session.user.id);
  const entry = {
    uid: session.user.id,
    email: session.user.email || '',
    nama: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email || 'Akun',
    avatarUrl: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || '',
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    savedAt: new Date().toISOString(),
  };
  if (idx >= 0) list[idx] = entry;
  else {
    if (list.length >= ACCOUNT_SWITCHER_MAX) {
      list.sort((a, b) => new Date(a.savedAt) - new Date(b.savedAt));
      list.shift(); // evict akun yang paling lama tidak dipakai
    }
    list.push(entry);
  }
  _setSavedAccounts(list);
}

function toggleAccountSwitcher() {
  const panel = document.getElementById('account-switcher-panel');
  if (!panel) return;
  if (panel.classList.contains('open')) { closeAccountSwitcher(); return; }
  renderAccountSwitcher();
  panel.classList.add('open');
  setTimeout(() => document.addEventListener('click', _accSwitcherOutsideClick), 0);
}
function closeAccountSwitcher() {
  document.getElementById('account-switcher-panel')?.classList.remove('open');
  document.removeEventListener('click', _accSwitcherOutsideClick);
}
function _accSwitcherOutsideClick(e) {
  const panel = document.getElementById('account-switcher-panel');
  const chip  = document.getElementById('user-company-chip');
  if (panel && !panel.contains(e.target) && chip && !chip.contains(e.target)) closeAccountSwitcher();
}

function renderAccountSwitcher() {
  const panel = document.getElementById('account-switcher-panel');
  if (!panel) return;
  const list = _getSavedAccounts();
  const currentUid = (typeof currentUser !== 'undefined' && currentUser) ? currentUser.id : null;
  const rows = list.map(a => {
    const active  = a.uid === currentUid;
    const initial = (a.nama || '?').charAt(0).toUpperCase();
    return `<div class="acc-switch-row ${active ? 'active' : ''}" ${active ? '' : `onclick="switchToAccount('${escJsAttr(a.uid)}')"`}>
      <div class="acc-switch-avatar">${a.avatarUrl ? `<img src="${escapeHtml(a.avatarUrl)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : initial}</div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(a.nama)}</div>
        <div style="font-size:10.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(a.email)}</div>
      </div>
      ${active ? '<i class="ti ti-check" style="font-size:15px;color:var(--accent);flex-shrink:0;"></i>' :
        `<button type="button" onclick="event.stopPropagation();removeAccountFromSwitcher('${escJsAttr(a.uid)}')" title="Hapus dari daftar" class="acc-switch-remove"><i class="ti ti-x" style="font-size:12px;"></i></button>`}
    </div>`;
  }).join('') || `<div style="padding:14px;text-align:center;font-size:12px;color:var(--muted);">Belum ada akun tersimpan</div>`;

  panel.innerHTML = `
    ${rows}
    <div class="acc-switch-divider"></div>
    <div class="acc-switch-menuitem" onclick="closeAccountSwitcher();openAccountSettings();"><i class="ti ti-settings" style="font-size:14px;vertical-align:-2px;margin-right:6px;"></i> Pengaturan Akun</div>
    ${list.length < ACCOUNT_SWITCHER_MAX
      ? `<div class="acc-switch-menuitem" onclick="addAccountFlow()"><i class="ti ti-plus" style="font-size:14px;vertical-align:-2px;margin-right:6px;"></i> Tambah Akun</div>`
      : `<div style="padding:10px 14px;font-size:11px;color:var(--muted);text-align:center;">Maks 5 akun tersimpan</div>`}
  `;
}

async function switchToAccount(uid) {
  const list = _getSavedAccounts();
  const acc = list.find(a => a.uid === uid);
  if (!acc) return;
  closeAccountSwitcher();
  if (typeof showOpSpinner === 'function') showOpSpinner('Mengganti akun...', acc.nama);
  try {
    const { error } = await DB.auth.setSession({ access_token: acc.access_token, refresh_token: acc.refresh_token });
    if (error) throw error;
    location.reload();
  } catch (e) {
    if (typeof hideOpSpinner === 'function') hideOpSpinner();
    showAlert('❌ Sesi akun ini sudah kedaluwarsa, silakan login ulang.\n' + (e?.message || ''));
    _setSavedAccounts(list.filter(a => a.uid !== uid));
    renderAccountSwitcher();
  }
}

async function addAccountFlow() {
  closeAccountSwitcher();
  if (!confirm('Kamu akan keluar sementara dari akun ini untuk login akun lain.\nAkun saat ini tetap tersimpan di daftar switch akun — lanjutkan?')) return;
  try { await DB.auth.signOut({ scope: 'local' }); } catch (e) {}
  location.reload();
}

function removeAccountFromSwitcher(uid) {
  _setSavedAccounts(_getSavedAccounts().filter(a => a.uid !== uid));
  renderAccountSwitcher();
}

// ══════════════════════════════════════════════════════════════════
// AKUN — info user, foto, nama, provider login & password
// ══════════════════════════════════════════════════════════════════

// Daftar provider OAuth yang didukung.
// Untuk tambah provider baru: aktifkan di Supabase Dashboard → Authentication → Providers,
// lalu tambahkan object baru di array ini.
const SUPPORTED_PROVIDERS = [
  { id: 'google',   name: 'Google',   icon: '<img src="https://www.google.com/favicon.ico" width="20" height="20" style="border-radius:3px">', description: 'Login dengan akun Google' },
  // { id: 'github',   name: 'GitHub',   icon: '🐙', description: 'Login dengan akun GitHub' },
  // { id: 'facebook', name: 'Facebook', icon: '📘', description: 'Login dengan akun Facebook' },
  // { id: 'discord',  name: 'Discord',  icon: '🎮', description: 'Login dengan akun Discord' },
  // { id: 'twitter',  name: 'X/Twitter',icon: '🐦', description: 'Login dengan akun X' },
];

// Shortcut publik: buka Settings langsung ke halaman Akun (dipakai tombol
// "Akun" di dashboard & menu "Pengaturan Akun" di account switcher).
async function openAccountSettings() {
  if (!currentUser) { typeof showAuthModal === 'function' ? showAuthModal() : alert('Login dulu.'); return; }
  if (typeof closeAccountSwitcher === 'function') closeAccountSwitcher();
  showPage('settings');
  settingsResetTo(['root', 'akun']);
}

async function accsLoadUserInfo() {
  const user = currentUser;
  const dangerZone = document.getElementById('accs-danger-zone');
  if (dangerZone) dangerZone.style.display = user ? 'block' : 'none';
  if (!user) return;
  const photoURL = user.user_metadata?.avatar_url || user.user_metadata?.picture || localStorage.getItem('oas_profile_photo');
  const initial = (user.user_metadata?.full_name || user.user_metadata?.name || user.email || '?').charAt(0).toUpperCase();
  const avatarEl = document.getElementById('accs-avatar');
  if (avatarEl) {
    if (photoURL) {
      avatarEl.innerHTML = `<img src="${escapeHtml(photoURL)}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:50%;cursor:pointer;" onclick="openPhotoViewer(this.src,'circle')" title="Lihat foto" onerror="this.parentElement.innerHTML='${initial}'">`;
    } else {
      avatarEl.innerHTML = initial;
    }
  }
  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || '(Nama belum diatur)';
  document.getElementById('accs-email-label').textContent = user.email || '—';
  document.getElementById('accs-uid-label').textContent = 'UID: ' + (user.id || '').substring(0, 16) + '...';
  const ni = document.getElementById('accs-input-name'); if (ni) ni.value = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const ei = document.getElementById('accs-input-email'); if (ei) ei.value = user.email || '';
  // Preview di list Akun
  const namaPrev = document.getElementById('settings-nama-preview');
  if (namaPrev) namaPrev.textContent = displayName;
  const infoPrev = document.getElementById('settings-akuninfo-preview');
  if (infoPrev) infoPrev.textContent = user.email || '—';
}

function handleProfilePhotoUpload(input) {
  // Delegated to crop modal system — didefinisikan di js/03-widgets.js (openCropModal, _applyProfilePhoto)
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    const msg = document.getElementById('accs-photo-msg');
    if (msg) { msg.textContent = '❌ Ukuran foto max 5MB'; msg.style.color = 'var(--red)'; }
    input.value = ''; return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    openCropModal({
      imgSrc: e.target.result,
      shape: 'circle',
      outputSize: 300,
      title: '✂️ Sesuaikan Foto Profil',
      onConfirm: function(croppedDataURL) { _applyProfilePhoto(croppedDataURL); }
    });
  };
  reader.readAsDataURL(file);
  input.value = '';
}

async function accsLoadProviders() {
  const container = document.getElementById('accs-providers-list');
  container.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Memuat koneksi...</div>';

  // Mode Tamu (belum login sama sekali) — tetap tampilkan daftar metode login
  // yang tersedia (Email & Password, Google, dst) supaya user tahu apa yang
  // bisa dipakai, statusnya "Belum login", dan diklik langsung ke halaman login.
  if (!currentUser) {
    const goLogin = "typeof showAuthModal === 'function' ? showAuthModal() : alert('Login dulu.')";
    let html = `<div class="provider-card" onclick="${goLogin}" style="cursor:pointer;">
      <div class="provider-icon"><i class="ti ti-mail" style="font-size:20px;"></i></div>
      <div class="provider-info">
        <div class="provider-name">Email &amp; Password</div>
        <div class="provider-status">Belum login</div>
      </div>
    </div>`;
    for (const p of SUPPORTED_PROVIDERS) {
      html += `<div class="provider-card" onclick="${goLogin}" style="cursor:pointer;">
        <div class="provider-icon">${p.icon}</div>
        <div class="provider-info">
          <div class="provider-name">${p.name}</div>
          <div class="provider-status">Belum login</div>
        </div>
      </div>`;
    }
    container.innerHTML = html;
    const pwSection = document.getElementById('accs-current-pw-section');
    if (pwSection) pwSection.style.display = 'none';
    return;
  }

  try {
    // Gunakan currentUser dari memori terlebih dulu (hindari hang pada fresh OAuth session)
    // Refresh dari server dengan timeout 4 detik — jika timeout, tetap gunakan data lokal
    let user = currentUser;
    try {
      const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000));
      const fresh = DB.auth.getUser().then(r => r.data?.user);
      const result = await Promise.race([fresh, timeout]);
      if (result) user = result;
    } catch(e) {
      console.warn('[accsLoadProviders] getUser timeout/error, menggunakan cache:', e.message);
    }
    if (!user) throw new Error('Tidak ada sesi aktif. Silakan login ulang.');
    const identities = user?.identities || [];
    const linkedIds = identities.map(i => i.provider);

    // Coba refresh user untuk dapat data terbaru dari Supabase
    try {
      const { data: freshData } = await supabase.auth.getUser();
      if (freshData?.user) {
        const freshIdentities = freshData.user.identities || [];
        if (freshIdentities.some(i => i.provider === 'email')) {
          // Update local reference
          user = freshData.user;
        }
      }
    } catch(e2) {}

    const freshIdentities2 = user?.identities || [];
    const freshLinkedIds = freshIdentities2.map(i => i.provider);
    const hasEmail = freshLinkedIds.includes('email') ||
      !!(user?.app_metadata?.providers?.includes('email')) ||
      !!(user?.user_metadata?.has_password);
    window._accsHasEmailPw = hasEmail;

    let html = '';

    // Email/Password row
    html += `<div class="provider-card ${hasEmail ? 'linked-primary' : ''}">
      <div class="provider-icon"><i class="ti ti-mail" style="font-size:20px;"></i></div>
      <div class="provider-info">
        <div class="provider-name">Email &amp; Password</div>
        <div class="provider-status ${hasEmail ? 'primary' : ''}">${hasEmail ? 'Aktif · ' + (user.email || '') : 'Belum ada password — atur di bawah'}</div>
      </div>
      ${hasEmail ? '<span class="provider-badge-primary">Aktif</span>' : '<span style="font-size:11px;color:var(--muted);">↓ di bawah</span>'}
    </div>`;

    // OAuth provider rows
    for (const p of SUPPORTED_PROVIDERS) {
      const isLinked = linkedIds.includes(p.id);
      const identity = identities.find(i => i.provider === p.id);
      const linkedEmail = identity?.identity_data?.email || '';
      const canUnlink = identities.length > 1;
      html += `<div class="provider-card ${isLinked ? 'linked' : ''}">
        <div class="provider-icon">${p.icon}</div>
        <div class="provider-info">
          <div class="provider-name">${p.name}</div>
          <div class="provider-status ${isLinked ? 'linked' : ''}">${isLinked ? (linkedEmail || 'Terhubung') : p.description}</div>
        </div>
        ${isLinked
          ? `<button class="provider-action btn-unlink" onclick="accsUnlinkProvider('${p.id}')" ${!canUnlink ? 'disabled title="Tidak bisa unlink satu-satunya metode login"' : ''}>${!canUnlink ? '🔒 Terkunci' : 'Putuskan'}</button>`
          : `<button class="provider-action btn-link" onclick="accsLinkProvider('${p.id}')">+ Hubungkan</button>`}
      </div>`;
    }

    html += `<div style="text-align:center;font-size:11px;color:var(--muted);margin-top:12px;padding:8px;background:var(--surface2);border-radius:8px;font-family:var(--mono);">
      ${identities.length} metode login aktif · Semua mengarah ke 1 akun yang sama
    </div>`;
    container.innerHTML = html;

    // Tampilkan/sembunyikan blok "Password Saat Ini" tergantung status email+password
    const pwSection = document.getElementById('accs-current-pw-section');
    if (pwSection) {
      pwSection.style.display = hasEmail ? 'block' : 'none';
      if (hasEmail) loadCachedPasswordDisplay(user.id);
    }
  } catch(e) {
    container.innerHTML = `<div style="color:var(--red);font-size:13px;padding:12px;text-align:center;">❌ Gagal memuat: ${escapeHtml(e.message)}</div>`;
  }
}

async function accsLinkProvider(providerId) {
  accsShowMsg('providers', '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Mengarahkan ke ' + providerId + '...', 'success');
  try {
    const redirectTo = window.location.href.split('#')[0] + '#account-linked';
    const { error } = await DB.auth.linkIdentity({ provider: providerId, options: { redirectTo, queryParams: { access_type: 'offline', prompt: 'consent' } } });
    if (error) {
      if (error.message?.includes('not supported') || error.message?.includes('linkIdentity')) {
        accsShowMsg('providers', '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Login dengan ' + providerId + ' menggunakan email yang sama — Supabase akan otomatis menggabungkan akun.', 'error');
        return;
      }
      throw error;
    }
  } catch(e) { accsShowMsg('providers', '❌ ' + e.message, 'error'); }
}

async function accsUnlinkProvider(providerId) {
  const { data: { user } } = await DB.auth.getUser();
  const identities = user?.identities || [];
  if (identities.length <= 1) { accsShowMsg('providers', '❌ Tidak bisa menghapus satu-satunya metode login.', 'error'); return; }
  const identity = identities.find(i => i.provider === providerId);
  if (!identity) { accsShowMsg('providers', '❌ Provider tidak ditemukan.', 'error'); return; }
  const pName = SUPPORTED_PROVIDERS.find(p => p.id === providerId)?.name || providerId;
  if (!confirm(`Putuskan koneksi ${pName}? Kamu masih bisa login dengan metode lain.`)) return;
  try {
    const { error } = await DB.auth.unlinkIdentity(identity);
    if (error) throw error;
    accsShowMsg('providers', `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${pName} berhasil diputuskan dari akun ini.`, 'success');
    setTimeout(accsLoadProviders, 1200);
  } catch(e) { accsShowMsg('providers', '❌ ' + e.message, 'error'); }
}

async function accsUpdateProfile() {
  const name = document.getElementById('accs-input-name').value.trim();
  if (!name) { accsShowMsg('profile', '❌ Nama tidak boleh kosong.', 'error'); return; }
  const btn = document.getElementById('accs-btn-save-profile');
  btn.innerHTML = '<span class="accs-spinner"></span>Menyimpan...'; btn.disabled = true;
  try {
    // Pastikan session masih valid sebelum update
    const { data: { session }, error: sessErr } = await DB.auth.getSession();
    if (sessErr || !session) {
      accsShowMsg('profile', '❌ Sesi login sudah habis. Silakan login ulang.', 'error');
      btn.innerHTML = '<i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Simpan Perubahan'; btn.disabled = false;
      return;
    }
    const { error } = await DB.auth.updateUser({ data: { full_name: name } });
    if (error) throw error;
    if (currentUser?.user_metadata) currentUser.user_metadata.full_name = name;
    await accsLoadUserInfo();
    accsShowMsg('profile', '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Profil berhasil disimpan!', 'success');
  } catch(e) {
    console.error('accsUpdateProfile error:', e);
    const msg = e.message || 'Gagal menyimpan';
    if (msg.toLowerCase().includes('jwt') || msg.toLowerCase().includes('token') || msg.toLowerCase().includes('session')) {
      accsShowMsg('profile', '❌ Sesi expired — coba refresh halaman lalu login ulang.', 'error');
    } else {
      accsShowMsg('profile', '❌ ' + msg, 'error');
    }
  }
  finally { btn.innerHTML = '<i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Simpan Perubahan'; btn.disabled = false; }
}

// Buka modal Ubah Password — dipanggil dari tombol "Ubah Password" di Informasi Akun.
// Hitung ulang langsung dari currentUser — jangan cuma andalkan window._accsHasEmailPw
// (yang di-set accsLoadProviders secara async), supaya tetap akurat walau user klik
// tombol "Ubah Password" sebelum proses loading provider itu selesai.
function accsHasEmailLogin() {
  const user = currentUser;
  if (!user) return false;
  const linkedIds = (user.identities || []).map(i => i.provider);
  return linkedIds.includes('email') ||
    !!(user.app_metadata?.providers?.includes('email')) ||
    !!(user.user_metadata?.has_password) ||
    !!window._accsHasEmailPw;
}

function openAccsPasswordModal() {
  // Mode Tamu (belum login) tidak punya akun/password sama sekali — jangan buka modal.
  if (!currentUser) { showAlert('❌ Belum memiliki password.'); return; }

  const pwOld = document.getElementById('accs-input-pw-old');
  const pw1   = document.getElementById('accs-input-pw1');
  const pw2   = document.getElementById('accs-input-pw2');
  if (pwOld) pwOld.value = '';
  if (pw1)   pw1.value = '';
  if (pw2)   pw2.value = '';
  const msg = document.getElementById('accs-msg-password');
  if (msg) { msg.style.display = 'none'; msg.innerHTML = ''; }

  // Kalau akun belum pernah punya password (login via Google saja), tidak ada
  // "password lama" yang bisa diverifikasi — sembunyikan field itu.
  const hasEmailPw = accsHasEmailLogin();
  const fieldOld = document.getElementById('accs-field-pw-old');
  if (fieldOld) fieldOld.style.display = hasEmailPw ? 'block' : 'none';

  document.getElementById('modal-ubah-password').classList.add('open');
}

async function accsUpdatePassword() {
  const hasEmailPw = accsHasEmailLogin();
  const pwOld = document.getElementById('accs-input-pw-old').value;
  const pw1   = document.getElementById('accs-input-pw1').value;
  const pw2   = document.getElementById('accs-input-pw2').value;
  if (hasEmailPw && !pwOld) { showAlert('❌ Masukkan password lama.'); return; }
  if (!pw1) { showAlert('❌ Password tidak boleh kosong.'); return; }
  if (pw1.length < 6) { showAlert('❌ Password minimal 6 karakter.'); return; }
  if (pw1 !== pw2) { showAlert('❌ Konfirmasi password tidak cocok.'); return; }
  const btn = document.getElementById('accs-btn-save-pw');
  btn.innerHTML = '<span class="accs-spinner"></span>Menyimpan...'; btn.disabled = true;
  try {
    // Verifikasi password lama dulu (re-auth) sebelum mengganti — supaya orang
    // lain yang kebetulan masih login di perangkat ini tidak bisa asal ganti password.
    if (hasEmailPw && pwOld) {
      const { error: reauthErr } = await DB.auth.signInWithPassword({ email: currentUser.email, password: pwOld });
      if (reauthErr) {
        showAlert('❌ Password lama salah.');
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Simpan Password'; btn.disabled = false;
        return;
      }
    }

    const { error } = await DB.auth.updateUser({ password: pw1 });
    if (error) throw error;

    // Tandai di user_metadata bahwa user sudah set password
    // Ini supaya pengecekan di tab Login Platform bisa detect
    try {
      await DB.auth.updateUser({
        data: { has_password: true }
      });
    } catch(e2) { /* non-critical */ }

    // Supabase TIDAK PERNAH mengembalikan password asli (hanya hash tersimpan
    // di server) — satu-satunya cara menampilkan "password saat ini" nanti
    // adalah menyimpannya sendiri di perangkat ini, persis saat user
    // mengaturnya di sini. Ini trade-off yang disadari: nyaman untuk
    // ditampilkan/disalin lagi, tapi berarti password plaintext ikut
    // tersimpan di localStorage perangkat ini.
    if (currentUser?.id) cachePasswordLocally(currentUser.id, pw1);

    document.getElementById('accs-input-pw-old').value = '';
    document.getElementById('accs-input-pw1').value = '';
    document.getElementById('accs-input-pw2').value = '';
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Password berhasil diatur! Kamu sekarang bisa login dengan email + password juga.');
    // Refresh session, reload providers, dan tutup modal setelah 1.5 detik
    setTimeout(async () => {
      try { await DB.auth.refreshSession(); } catch(e3) {}
      accsLoadProviders();
      closeModal('modal-ubah-password');
    }, 1500);
  } catch(e) { showAlert('❌ ' + e.message); }
  finally { btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Simpan Password'; btn.disabled = false; }
}

// Link "Lupa password?" di dalam modal Ubah Password — kirim email reset ke
// alamat akun yang sedang login (beda dari doModalForgotPassword yang dipakai
// di modal login, yang mengambil email dari field input).
async function accsForgotPassword() {
  if (!currentUser?.email) return;
  try {
    const { error } = await DB.auth.resetPasswordForEmail(currentUser.email);
    if (error) throw error;
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Link reset password sudah dikirim ke ' + currentUser.email);
  } catch(e) {
    showAlert('❌ ' + e.message);
  }
}

async function accsLogoutAll() {
  if (!confirm('Logout dari semua perangkat? Kamu harus login ulang setelahnya.')) return;
  try { await DB.auth.signOut({ scope: 'global' }); } catch(e) { await DB.auth.signOut(); }
  window.location.reload();
}

function accsShowMsg(panel, msg, type) {
  const el = document.getElementById('accs-msg-' + panel); if (!el) return;
  el.innerHTML = msg; el.className = 'accs-msg ' + type; el.style.display = 'block';
  if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function toggleAccsPw(id) { const el = document.getElementById(id); el.type = el.type === 'password' ? 'text' : 'password'; }

// ── Password "saat ini" tersensor + salin (lihat catatan trade-off di accsUpdatePassword) ──
function _pwCacheKey(uid) { return 'oas_pw_cache_' + uid; }

function cachePasswordLocally(uid, plaintext) {
  try { localStorage.setItem(_pwCacheKey(uid), plaintext); } catch(e) {}
}

function loadCachedPasswordDisplay(uid) {
  const known   = document.getElementById('accs-current-pw-known');
  const unknown = document.getElementById('accs-current-pw-unknown');
  const field   = document.getElementById('accs-current-pw-field');
  if (!known || !unknown || !field) return;
  let cached = null;
  try { cached = localStorage.getItem(_pwCacheKey(uid)); } catch(e) {}
  if (cached) {
    field.value = cached;
    field.type = 'password';
    known.style.display = 'block';
    unknown.style.display = 'none';
  } else {
    known.style.display = 'none';
    unknown.style.display = 'block';
  }
}

function copyCurrentPassword() {
  const field = document.getElementById('accs-current-pw-field');
  if (!field || !field.value) return;
  navigator.clipboard?.writeText(field.value).then(() => {
    accsShowMsg('providers', '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Password disalin ke clipboard.', 'success');
  }).catch(() => {
    // Fallback lama untuk browser yang tidak support Clipboard API
    field.type = 'text';
    field.select();
    document.execCommand('copy');
    field.type = 'password';
  });
}

// Sembunyikan tombol "Bisnis aktif" di sidebar saat guest mode
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('sidebar-accs-btn');
  const updateBtn = () => { if (btn) btn.style.display = (typeof isGuestMode !== 'undefined' && isGuestMode) ? 'none' : 'flex'; };
  setInterval(updateBtn, 1000);
});

// Deteksi redirect balik dari OAuth linking
(function checkAccountLinkedRedirect() {
  if (window.location.href.includes('account-linked')) {
    const tryOpen = setInterval(() => {
      if (typeof _authReady !== 'undefined' && _authReady && currentUser) {
        clearInterval(tryOpen);
        history.replaceState(null, '', window.location.pathname);
        setTimeout(() => {
          openAccountSettings();
          settingsNavigate('akun-info');
          accsShowMsg('providers', '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Provider berhasil dihubungkan ke akun kamu!', 'success');
        }, 600);
      }
    }, 400);
    setTimeout(() => clearInterval(tryOpen), 12000);
  }
})();
