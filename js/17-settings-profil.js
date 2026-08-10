
// PROFIL PERUSAHAAN
const PROFIL_KEY = 'oas_profil_v1';

function getProfil() {
  try { return JSON.parse(localStorage.getItem(PROFIL_KEY) || '{}'); } catch { return {}; }
}

function switchProfilMode(mode) {
  const viewMode = document.getElementById('profil-view-mode');
  const editMode = document.getElementById('profil-edit-mode');
  const viewFooter = document.getElementById('profil-view-footer');
  const editFooter = document.getElementById('profil-edit-footer');
  if (mode === 'edit') {
    if (viewMode) viewMode.style.display = 'none';
    if (editMode) editMode.style.display = '';
    if (viewFooter) viewFooter.style.display = 'none';
    if (editFooter) editFooter.style.display = '';
    loadProfilToEditForm();
  } else {
    if (viewMode) viewMode.style.display = '';
    if (editMode) editMode.style.display = 'none';
    if (viewFooter) viewFooter.style.display = '';
    if (editFooter) editFooter.style.display = 'none';
    renderProfilView();
  }
}

function renderProfilView() {
  const p = getProfil();
  const logo = localStorage.getItem('oas_company_logo');
  const logoEl = document.getElementById('profil-view-logo');
  if (logoEl) {
    if (logo) {
      logoEl.innerHTML = `<img src="${escapeHtml(logo)}" style="width:100%;height:100%;object-fit:cover;border-radius:14px;cursor:pointer;" onclick="openPhotoViewer(this.src,'rounded')" title="Lihat logo">`;
    } else {
      logoEl.innerHTML = '🏢';
    }
  }
  const setV = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val || '—'; };
  setV('profil-view-nama', p.nama || '(belum diisi)');
  setV('profil-view-jenis', p.jenis || '');
  setV('profil-view-pemilik', p.pemilik || '');
  setV('profil-view-telp', p.telp || '—');
  setV('profil-view-alamat', p.alamat || '—');
  setV('profil-view-npwp', p.npwp || '—');
  setV('profil-view-email', p.email || '—');
  // Sembunyikan baris kosong
  const rows = { 'profil-view-row-pemilik': p.pemilik, 'profil-view-row-npwp': p.npwp, 'profil-view-row-email': p.email };
  Object.entries(rows).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.style.display = val ? 'flex' : 'none';
  });
}

function loadProfilToEditForm() {
  const p = getProfil();
  ['nama','jenis','pemilik','alamat','telp','npwp','email','website','provinsi','kabkota','kecamatan','kelurahan'].forEach(k => {
    const el = document.getElementById('prof-'+k);
    if(el) el.value = p[k] || '';
  });
  if(p.tahunBuku) {
    document.getElementById('prof-tahun-buku').value = p.tahunBuku;
    const _tbMap = {jan:'Januari - Desember',apr:'April - Maret',jul:'Juli - Juni',okt:'Oktober - September'};
    const lbl = document.getElementById('prof-tahun-buku-label');
    if(lbl && _tbMap[p.tahunBuku]) lbl.innerHTML = '<i class="ti ti-calendar" style="font-size:13px;vertical-align:-2px;margin-right:4px;"></i> ' + _tbMap[p.tahunBuku];
  }
  if(p.matauang) {
    document.getElementById('prof-mata-uang').value = p.matauang;
    const _muMap = {IDR:'IDR — Rupiah',USD:'USD — Dollar',SGD:'SGD — Singapore Dollar',EUR:'EUR — Euro',MYR:'MYR — Ringgit',JPY:'JPY — Yen'};
    const lbl = document.getElementById('prof-mata-uang-label');
    if(lbl && _muMap[p.matauang]) lbl.innerHTML = '<i class="ti ti-currency" style="font-size:13px;vertical-align:-2px;margin-right:4px;"></i> ' + _muMap[p.matauang];
  }
  // Load logo preview di form edit
  const logo = localStorage.getItem('oas_company_logo');
  const editLogoEl = document.getElementById('profil-edit-logo-preview');
  if (editLogoEl && logo) {
    editLogoEl.innerHTML = `<img src="${escapeHtml(logo)}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;cursor:pointer;" onclick="openPhotoViewer(this.src,'rounded')" title="Lihat logo">`;
  }
}

function loadProfil() {
  // Jika profil sudah ada data → buka view mode, kalau belum → langsung edit
  const p = getProfil();
  if (p.nama) {
    switchProfilMode('view');
  } else {
    switchProfilMode('edit');
  }
}

function handleLogoUpload(input) {
  // Semua upload logo (export modal maupun profil) lewat crop modal dulu.
  // Bedanya ada di onConfirm: export modal update exportLogoDataUrl + preview box,
  // profil modal update _applyCompanyLogo (profil UI).
  const file = input.files[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) { showAlert('Ukuran logo max 5MB.'); input.value = ''; return; }
  const isFromExport = (input.id === 'exp-logo-input');
  const reader = new FileReader();
  reader.onload = function(e) {
    openCropModal({
      imgSrc: e.target.result,
      shape: 'rounded',
      outputSize: 300,
      title: 'Sesuaikan Logo Perusahaan',
      onConfirm: function(croppedDataURL) {
        if (isFromExport) {
          // Update exportLogoDataUrl dan preview di export modal
          exportLogoDataUrl = croppedDataURL;
          const img = document.getElementById('exp-logo-img');
          const placeholder = document.getElementById('exp-logo-placeholder');
          const removeBtn = document.getElementById('exp-logo-remove-btn');
          if (img) { img.src = croppedDataURL; img.style.display = 'block'; }
          if (placeholder) placeholder.style.display = 'none';
          if (removeBtn) removeBtn.style.display = 'block';
          const box = document.getElementById('exp-logo-preview-box');
          if (box) { box.style.borderStyle = 'solid'; box.style.borderColor = 'var(--accent)'; }
        } else {
          // Update profil perusahaan
          _applyCompanyLogo(croppedDataURL);
        }
      }
    });
  };
  reader.readAsDataURL(file);
  input.value = '';
}
function saveProfil() {
  const btn = document.querySelector('#modal-profil .btn-primary');
  const origHTML = btn ? btn.innerHTML : '';
  // Show spinner on button
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span style="display:inline-block;width:14px;height:14px;border:2.5px solid rgba(0,0,0,0.2);border-top-color:#000;border-radius:50%;animation:spin 0.6s linear infinite;vertical-align:middle;margin-right:6px;"></span>Menyimpan...';
  }
  setTimeout(function() {
    const p = {
      nama: document.getElementById('prof-nama').value.trim(),
      jenis: document.getElementById('prof-jenis').value.trim(),
      pemilik: document.getElementById('prof-pemilik').value.trim(),
      alamat: document.getElementById('prof-alamat').value.trim(),
      telp: document.getElementById('prof-telp').value.trim(),
      npwp: document.getElementById('prof-npwp').value.trim(),
      email: document.getElementById('prof-email').value.trim(),
      website: document.getElementById('prof-website')?.value.trim() || '',
      provinsi: document.getElementById('prof-provinsi')?.value.trim() || '',
      kabkota: document.getElementById('prof-kabkota')?.value.trim() || '',
      kecamatan: document.getElementById('prof-kecamatan')?.value.trim() || '',
      kelurahan: document.getElementById('prof-kelurahan')?.value.trim() || '',
      tahunBuku: document.getElementById('prof-tahun-buku').value,
      matauang: document.getElementById('prof-mata-uang').value,
    };
    localStorage.setItem(PROFIL_KEY, JSON.stringify(p));
    // Jangan ubah logo OAS — nama perusahaan bukan nama app
    if (btn) { btn.disabled = false; btn.innerHTML = origHTML; }
    markDirty();
    // Kembali ke view mode
    switchProfilMode('view');
    // Show success toast
    showSaveProfilSuccess();
  }, 900);
}

function showSaveProfilSuccess() {
  // Remove existing if any
  const old = document.getElementById('profil-success-popup');
  if (old) old.remove();
  const overlay = document.createElement('div');
  overlay.id = 'profil-success-popup';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.55);backdrop-filter:blur(4px);animation:fadeInOverlay 0.2s ease both;';
  overlay.innerHTML = `
    <div style="background:var(--surface);border:1.5px solid rgba(74,222,128,0.4);border-radius:20px;padding:32px 36px;text-align:center;width:min(320px,88vw);box-shadow:0 24px 60px rgba(0,0,0,0.5);animation:popupSlideIn 0.3s cubic-bezier(0.34,1.56,0.64,1) both;">
      <div style="width:56px;height:56px;background:rgba(74,222,128,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 16px;border:2px solid rgba(74,222,128,0.35);">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:6px;">Profil Tersimpan!</div>
      <div style="font-size:13px;color:var(--muted);margin-bottom:20px;">Data profil perusahaan berhasil disimpan.</div>
      <button onclick="document.getElementById('profil-success-popup').remove()" style="background:var(--accent);color:#000;border:none;border-radius:10px;padding:10px 28px;font-size:13px;font-weight:700;cursor:pointer;font-family:var(--sans);transition:opacity 0.15s;" onmouseover="this.style.opacity='0.85'" onmouseout="this.style.opacity='1'">OK</button>
    </div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener('click', function(e) { if(e.target===overlay) overlay.remove(); });
  setTimeout(function() { if(overlay.parentNode) overlay.remove(); }, 4000);
}
function openModal(id) { document.getElementById(id)?.classList.add('open'); }

// ONBOARDING
let obStep = 1;
let obType = 'lengkap';

function checkShowOnboarding() {
  const p = getProfil();
  const visited = localStorage.getItem('oas_onboarded');
  if(!visited && !p.nama) {
    setTimeout(() => document.getElementById('modal-onboarding').classList.add('open'), 800);
  }
}

function obNext() {
  if(obStep === 1) {
    const nama = document.getElementById('ob-nama').value.trim();
    if(!nama) { document.getElementById('ob-nama').focus(); document.getElementById('ob-nama').style.borderColor='var(--red)'; return; }
    // Save name to profil
    const p = getProfil(); p.nama = nama;
    localStorage.setItem(PROFIL_KEY, JSON.stringify(p));
    obStep = 2;
    document.getElementById('onboard-step-1').style.display = 'none';
    document.getElementById('onboard-step-2').style.display = 'block';
    document.getElementById('ob-back-btn').style.display = 'block';
    document.getElementById('ob-dot-1').style.background = 'var(--accent)';
    document.getElementById('ob-dot-2').style.background = 'var(--accent)';
  } else if(obStep === 2) {
    obStep = 3;
    // Apply template directly (no dependency on the removed COA template modal DOM)
    if(typeof TEMPLATES !== 'undefined' && TEMPLATES[obType]) {
      const tmpl = TEMPLATES[obType];
      const allAkuns = getDefaultAkuns();
      akuns = tmpl.codes === null ? [...allAkuns] : allAkuns.filter(a => tmpl.codes.includes(a.kode));
      akuns.sort((a,b) => a.kode.localeCompare(b.kode));
      markDirty();
    }
    const p = getProfil();
    document.getElementById('ob-ready-title').textContent = `Siap, ${p.nama}! 🎉`;
    document.getElementById('ob-ready-desc').textContent = `Template akun untuk bisnis ${obType} sudah diterapkan. Kamu bisa mulai input transaksi sekarang.`;
    document.getElementById('onboard-step-2').style.display = 'none';
    document.getElementById('onboard-step-3').style.display = 'block';
    document.getElementById('ob-next-btn').textContent = '🚀 Mulai Sekarang!';
    document.getElementById('ob-dot-3').style.background = 'var(--accent)';
  } else if(obStep === 3) {
    localStorage.setItem('oas_onboarded', '1');
    document.getElementById('modal-onboarding').classList.remove('open');
    renderDashboard();
    showAlert('🎉 Selamat datang! Software siap digunakan.');
  }
}
function obBack() {
  if(obStep === 2) {
    obStep = 1;
    document.getElementById('onboard-step-2').style.display = 'none';
    document.getElementById('onboard-step-1').style.display = 'block';
    document.getElementById('ob-back-btn').style.display = 'none';
    document.getElementById('ob-dot-2').style.background = 'var(--border)';
  } else if(obStep === 3) {
    obStep = 2;
    document.getElementById('onboard-step-3').style.display = 'none';
    document.getElementById('onboard-step-2').style.display = 'block';
    document.getElementById('ob-next-btn').textContent = 'Lanjut →';
    document.getElementById('ob-dot-3').style.background = 'var(--border)';
  }
}
function selectObType(type, el) {
  obType = type;
  document.querySelectorAll('.ob-type-card').forEach(c => { c.style.border = '2px solid var(--border)'; c.style.background = 'var(--surface2)'; });
  el.style.border = '2px solid var(--accent)';
  el.style.background = 'rgba(74,222,128,0.07)';
}

function loadProfilToSidebar() {
  // Logo OAS tidak diubah — nama perusahaan bukan nama app
  // Chip akan diupdate oleh updateGuestChip() atau updateUserChip()
}

function showDemoModeBanner() {
  const banner = document.createElement('div');
  banner.id = 'demo-banner';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span>☁️ <b>Mode Demo</b> — Data tersimpan di browser. Untuk cloud + multi-user:</span>
      <button onclick="showSupabaseSetup()" style="background:var(--accent);border:none;border-radius:6px;padding:5px 12px;font-weight:700;cursor:pointer;color:#0d0f14;font-size:12px;white-space:nowrap;">Setup Supabase ›</button>
      <button onclick="document.getElementById('demo-banner').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:0 4px;margin-left:auto;">✕</button>
    </div>`;
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:var(--surface2);border-top:1px solid var(--border);padding:10px 16px;z-index:5000;font-size:13px;';
  document.body.appendChild(banner);
}

// PENGATURAN AKUN — Account Settings & Provider Linking

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

async function openAccountSettings() {
  if (!currentUser) { typeof showAuthModal === 'function' ? showAuthModal() : alert('Login dulu.'); return; }
  openModal('modal-account-settings');
  switchAccsTab('providers');
  await accsLoadUserInfo();
  await accsLoadProviders();
}

async function accsLoadUserInfo() {
  const user = currentUser; if (!user) return;
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
  document.getElementById('accs-display-name').textContent = user.user_metadata?.full_name || user.user_metadata?.name || '(Nama belum diatur)';
  document.getElementById('accs-email-label').textContent = user.email || '—';
  document.getElementById('accs-uid-label').textContent = 'UID: ' + (user.id || '').substring(0, 16) + '...';
  const ni = document.getElementById('accs-input-name'); if (ni) ni.value = user.user_metadata?.full_name || user.user_metadata?.name || '';
  const ei = document.getElementById('accs-input-email'); if (ei) ei.value = user.email || '';
  // Load nama perusahaan dari localStorage
  const ci = document.getElementById('accs-input-company');
  if (ci) {
    try { const p = JSON.parse(localStorage.getItem('oas_profil_v1')||'{}'); ci.value = p.nama || ''; } catch(e) {}
  }
}

function handleProfilePhotoUpload(input) {
  // Delegated to crop modal system — defined at bottom of file
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

    // Cek email identity: bisa dari identities ATAU dari
    // user yang sudah set password (email_confirmed_at ada, email ada,
    // tapi identity masih google — karena Supabase tidak tambah identity baru
    // saat set password via updateUser)
    const hasEmailIdentity = linkedIds.includes('email');
    const hasEmailPassword = hasEmailIdentity ||
      (!!user.email && !!user.email_confirmed_at &&
       !!(user.user_metadata?.has_password ||
          user.app_metadata?.providers?.includes('email') ||
          // Jika user bisa login via email+password, Supabase set last_sign_in_at
          // dan identities punya email. Fallback: cek apakah ada password yg pernah diset
          identities.some(i => i.provider === 'email')));

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

    let html = '';

    // Email/Password row
    html += `<div class="provider-card ${hasEmail ? 'linked-primary' : ''}">
      <div class="provider-icon"><i class="ti ti-mail" style="font-size:20px;"></i></div>
      <div class="provider-info">
        <div class="provider-name">Email &amp; Password</div>
        <div class="provider-status ${hasEmail ? 'primary' : ''}">${hasEmail ? 'Aktif · ' + (user.email || '') : 'Belum ada password — atur di tab Password'}</div>
      </div>
      ${hasEmail ? '<span class="provider-badge-primary">Aktif</span>' : '<span style="font-size:11px;color:var(--muted);">→ Tab Password</span>'}
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

async function accsUpdatePassword() {
  const pw1 = document.getElementById('accs-input-pw1').value;
  const pw2 = document.getElementById('accs-input-pw2').value;
  if (!pw1) { accsShowMsg('password', '❌ Password tidak boleh kosong.', 'error'); return; }
  if (pw1.length < 6) { accsShowMsg('password', '❌ Password minimal 6 karakter.', 'error'); return; }
  if (pw1 !== pw2) { accsShowMsg('password', '❌ Konfirmasi password tidak cocok.', 'error'); return; }
  const btn = document.getElementById('accs-btn-save-pw');
  btn.innerHTML = '<span class="accs-spinner"></span>Menyimpan...'; btn.disabled = true;
  try {
    const { error } = await DB.auth.updateUser({ password: pw1 });
    if (error) throw error;

    // Tandai di user_metadata bahwa user sudah set password
    // Ini supaya pengecekan di tab Login Platform bisa detect
    try {
      await DB.auth.updateUser({
        data: { has_password: true }
      });
    } catch(e2) { /* non-critical */ }

    document.getElementById('accs-input-pw1').value = '';
    document.getElementById('accs-input-pw2').value = '';
    accsShowMsg('password', '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Password berhasil diatur! Kamu sekarang bisa login dengan email + password juga.', 'success');
    // Refresh session dan reload providers setelah 1.5 detik
    setTimeout(async () => {
      try { await DB.auth.refreshSession(); } catch(e3) {}
      accsLoadProviders();
    }, 1500);
  } catch(e) { accsShowMsg('password', '❌ ' + e.message, 'error'); }
  finally { btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:5px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Simpan Password'; btn.disabled = false; }
}

async function accsLogoutAll() {
  if (!confirm('Logout dari semua perangkat? Kamu harus login ulang setelahnya.')) return;
  try { await DB.auth.signOut({ scope: 'global' }); } catch(e) { await DB.auth.signOut(); }
  window.location.reload();
}

function switchAccsTab(tab) {
  document.querySelectorAll('.accs-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.accs-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('accs-tab-' + tab)?.classList.add('active');
  document.getElementById('accs-panel-' + tab)?.classList.add('active');
}

function accsShowMsg(panel, msg, type) {
  const el = document.getElementById('accs-msg-' + panel); if (!el) return;
  el.innerHTML = msg; el.className = 'accs-msg ' + type; el.style.display = 'block';
  if (type === 'success') setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function toggleAccsPw(id) { const el = document.getElementById(id); el.type = el.type === 'password' ? 'text' : 'password'; }

// Sembunyikan tombol "Pengaturan Akun" di sidebar saat guest mode
const _origEnterGuestMode = typeof enterGuestMode === 'function' ? enterGuestMode : null;
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
          accsShowMsg('providers', '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Provider berhasil dihubungkan ke akun kamu!', 'success');
        }, 600);
      }
    }, 400);
    setTimeout(() => clearInterval(tryOpen), 12000);
  }
})();

// FIX: Input tidak tertutup keyboard di mobile
// Saat input/textarea dapat fokus di dalam modal, scroll supaya input terlihat di atas keyboard
(function() {
  function scrollInputIntoView(el) {
    // Tunggu sedikit agar keyboard muncul dulu
    setTimeout(() => {
      try {
        // scrollIntoView dengan nearest agar tidak scroll lebih dari perlu
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Untuk modal yang punya overflow-y:auto, scroll container-nya juga
        let parent = el.parentElement;
        while (parent) {
          const style = window.getComputedStyle(parent);
          const overflow = style.overflowY;
          if (overflow === 'auto' || overflow === 'scroll') {
            const elRect = el.getBoundingClientRect();
            const parentRect = parent.getBoundingClientRect();
            // Kalau input berada di bawah 60% tinggi layar (area keyboard), scroll naik
            if (elRect.bottom > window.innerHeight * 0.55) {
              parent.scrollTop += elRect.bottom - window.innerHeight * 0.45;
            }
            break;
          }
          parent = parent.parentElement;
        }
      } catch(e) {}
    }, 350);
  }

  // Pasang listener ke semua input & textarea yang ada sekarang maupun yang dibuat nanti
  document.addEventListener('focusin', function(e) {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') {
      // Hanya aktif di mobile (layar ≤ 768px)
      if (window.innerWidth <= 768) {
        scrollInputIntoView(e.target);
      }
    }
  }, true);

  // Resize event untuk saat keyboard muncul/hilang (viewport berubah)
  let lastVH = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  function onViewportChange() {
    if (!window.visualViewport) return;
    const currentVH = window.visualViewport.height;
    const diff = lastVH - currentVH;
    lastVH = currentVH;
    // Keyboard muncul (viewport mengecil >100px)
    if (diff > 100) {
      const focused = document.activeElement;
      if (focused && (focused.tagName === 'INPUT' || focused.tagName === 'TEXTAREA')) {
        scrollInputIntoView(focused);
      }
    }
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', onViewportChange);
  }
})();

// INV METODE CUSTOM SELECT
const _invMetodeList = [
  { value:'fifo', label:'FIFO', sub:'First In First Out', icon:'<i class="ti ti-download ti-inline"></i>' },
  { value:'lifo', label:'LIFO', sub:'Last In First Out', icon:'<i class="ti ti-upload" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>' },
  { value:'wa',   label:'Weighted Average', sub:'Rata-rata Tertimbang', icon:'<i class="ti ti-scale ti-inline"></i>' },
  { value:'mwa',  label:'Moving Weighted Average', sub:'Rata-rata Bergerak', icon:'<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>' },
];
let _invMetodeVal = 'fifo';

function openInvMetodeSheet() {
  openOptPicker({
    title: 'Pilih Metode Persediaan',
    options: _invMetodeList.map(m => ({
      value: m.value,
      label: m.label,
      sub:   m.sub,
      icon:  m.icon,
    })),
    currentValue: _invMetodeVal,
    onSelect: (val) => selectInvMetode(val),
  });
}

function selectInvMetode(val) {
  _invMetodeVal = val;
  const hidden = document.getElementById('inv-metode');
  if (hidden) hidden.value = val;
  const found = _invMetodeList.find(m => m.value === val);
  const btn = document.getElementById('inv-metode-label-btn');
  // Tampilkan label + penjelasan dengan kurung, bukan dash — konsisten dengan tampilan awal
  if (btn && found) btn.textContent = found.label + (found.sub ? ' (' + found.sub + ')' : '');
  closeInvMetodeSheet();
}

function closeInvMetodeSheet() {
  closeOptPicker();
  // fallback: tutup custom backdrop jika masih ada
  const bd = document.getElementById('inv-metode-sheet-backdrop');
  if (bd) bd.style.display = 'none';
}

// ── TAHUN BUKU PICKER ──
const _tahunBukuList = [
  { value:'jan', label:'Januari - Desember', sub:'Fiskal kalender standar', icon:'<i class="ti ti-calendar" style="font-size:18px;"></i>' },
  { value:'apr', label:'April - Maret',       sub:'Fiskal tahunan April',    icon:'<i class="ti ti-flower" style="font-size:18px;"></i>' },
  { value:'jul', label:'Juli - Juni',          sub:'Fiskal semester tengah', icon:'<i class="ti ti-sun" style="font-size:18px;"></i>' },
  { value:'okt', label:'Oktober - September', sub:'Fiskal kuartal akhir',   icon:'<i class="ti ti-leaf" style="font-size:18px;"></i>' },
];

function openTahunBukuPicker() {
  const val = document.getElementById('prof-tahun-buku').value || 'jan';
  const optEl = document.getElementById('oas-tahun-buku-options');
  optEl.innerHTML = _tahunBukuList.map(m => `
    <button class="oas-picker-option ${val===m.value?'selected':''}" onclick="selectTahunBuku('${m.value}')">
      <span class="opt-icon">${m.icon}</span>
      <span class="opt-body">
        <span class="opt-label">${escapeHtml(m.label)}</span>
        <span class="opt-sub">${m.sub}</span>
      </span>
      <span class="opt-check"></span>
    </button>`).join('');
  const bd = document.getElementById('oas-tahun-buku-backdrop');
  bd.style.display = 'flex';
  document.getElementById('prof-tahun-buku-btn').classList.add('open');
}
function selectTahunBuku(val) {
  document.getElementById('prof-tahun-buku').value = val;
  const found = _tahunBukuList.find(m => m.value === val);
  if (found) document.getElementById('prof-tahun-buku-label').innerHTML = found.icon + ' ' + found.label;
  closeTahunBukuPicker();
}
function closeTahunBukuPicker() {
  document.getElementById('oas-tahun-buku-backdrop').style.display = 'none';
  const btn = document.getElementById('prof-tahun-buku-btn');
  if (btn) btn.classList.remove('open');
}

// ── MATA UANG PICKER ──
const _mataUangList = [
  { value:'IDR', label:'IDR — Rupiah',           sub:'Rupiah Indonesia',     icon:'<b style="font-size:12px;font-family:var(--mono);">Rp</b>', flag:'Rp' },
  { value:'USD', label:'USD — Dollar',            sub:'Dolar Amerika Serikat',icon:'<b style="font-size:14px;font-family:var(--mono);">$</b>', flag:'$'  },
  { value:'SGD', label:'SGD — Singapore Dollar', sub:'Dolar Singapura',      icon:'<b style="font-size:12px;font-family:var(--mono);">S$</b>', flag:'S$' },
];

function openMataUangPicker() {
  const val = document.getElementById('prof-mata-uang').value || 'IDR';
  const optEl = document.getElementById('oas-mata-uang-options');
  optEl.innerHTML = _mataUangList.map(m => `
    <button class="oas-picker-option ${val===m.value?'selected':''}" onclick="selectMataUang('${m.value}')">
      <span class="opt-icon">${m.icon}</span>
      <span class="opt-body">
        <span class="opt-label">${escapeHtml(m.label)}</span>
        <span class="opt-sub">${m.sub}</span>
      </span>
      <span class="opt-check"></span>
    </button>`).join('');
  const bd = document.getElementById('oas-mata-uang-backdrop');
  bd.style.display = 'flex';
  document.getElementById('prof-mata-uang-btn').classList.add('open');
}
function selectMataUang(val) {
  document.getElementById('prof-mata-uang').value = val;
  const found = _mataUangList.find(m => m.value === val);
  if (found) document.getElementById('prof-mata-uang-label').innerHTML = found.icon + ' ' + found.label;
  closeMataUangPicker();
}
function closeMataUangPicker() {
  document.getElementById('oas-mata-uang-backdrop').style.display = 'none';
  const btn = document.getElementById('prof-mata-uang-btn');
  if (btn) btn.classList.remove('open');
}

// Sync loadProfil agar trigger button label ikut update saat data di-load
(function() {
  const _origLoadProfil = window.loadProfil;
  if (typeof _origLoadProfil === 'function') {
    window.loadProfil = function() {
      _origLoadProfil.apply(this, arguments);
      setTimeout(function() {
        const tb = document.getElementById('prof-tahun-buku');
        if (tb && tb.value) {
          const found = _tahunBukuList.find(m => m.value === tb.value);
          const lbl = document.getElementById('prof-tahun-buku-label');
          if (found && lbl) lbl.innerHTML = found.icon + ' ' + found.label;
        }
        const mu = document.getElementById('prof-mata-uang');
        if (mu && mu.value) {
          const found = _mataUangList.find(m => m.value === mu.value);
          const lbl = document.getElementById('prof-mata-uang-label');
          if (found && lbl) lbl.innerHTML = found.icon + ' ' + found.label;
        }
      }, 50);
    };
  }
})();

// ═══════════════════════════════════════════════════════════════
//  PHOTO VIEWER
// ═══════════════════════════════════════════════════════════════
function openPhotoViewer(src, shape) {
  // shape: 'circle' | 'rounded'
  const overlay = document.getElementById('photo-viewer-overlay');
  const frame   = document.getElementById('photo-viewer-frame');
  const img     = document.getElementById('photo-viewer-img');
  if (!src || !overlay) return;
  img.src = src;
  frame.className = shape === 'circle' ? 'circle' : 'rounded';
  overlay.classList.add('open');
  document.addEventListener('keydown', _pvKeyClose);
}
