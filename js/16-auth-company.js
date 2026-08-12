
// INIT — dipanggil saat app pertama kali load

async function initSupabase() {
  const chipName = document.getElementById('chip-company-name');
  const chipSub  = document.getElementById('chip-sub');
  if (chipName) chipName.textContent = 'Menghubungkan...';
  if (chipSub)  chipSub.textContent  = 'Memeriksa akun';

  // Bersihkan refresh token yang corrupt/expired dari sesi lama
  try {
    const stored = _authStorage.getItem('oas_oas_auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && !parsed.access_token && parsed.refresh_token) {
        console.log('[Auth] Membersihkan refresh token lama yang tidak valid');
        _authStorage.removeItem('oas_oas_auth');
      }
    }
  } catch(e) {}

  // Deteksi OAuth PKCE code dari URL SEBELUM SDK memprosesnya
  const hasOAuthCode = window.location.search.includes('code=');
  const hasOAuthHash = window.location.hash.includes('access_token') || window.location.hash.includes('error=');
  const hasOAuthParams = hasOAuthCode || hasOAuthHash;
  if (hasOAuthParams) {
    window.__oauthRedirect = true;
    window.__initialOAuthRedirect = true;
    console.log('[Auth] OAuth redirect terdeteksi, code:', hasOAuthCode, 'hash:', hasOAuthHash);
  }

  // Untuk PKCE flow: jika ada ?code= di URL, exchange secara eksplisit
  // Ini memastikan SDK berhasil tukar code → session meski storage terbatas
  if (hasOAuthCode) {
    console.log('[Auth] Memproses PKCE code exchange...');
    try {
      const { data, error } = await DB.auth.exchangeCodeForSession(window.location.search);
      if (error) {
        console.error('[Auth] exchangeCodeForSession error:', error.message);
      } else {
        console.log('[Auth] exchangeCodeForSession sukses:', data.session?.user?.email);
      }
    } catch(e) {
      console.error('[Auth] exchangeCodeForSession exception:', e.message);
    }
    // Bersihkan ?code= dari URL tanpa reload
    const cleanUrl = window.location.pathname + window.location.hash;
    history.replaceState(null, '', cleanUrl);
  }

  // Pasang listener DULU agar SIGNED_IN dari OAuth redirect tidak terlewat
  DB.auth.onAuthStateChange(async (event, session) => {
    console.log('[Auth]', event, session?.user?.email);

    if (event === 'SIGNED_IN') {
      if (currentCompany) {
        currentUser = session.user;
        return;
      }
      isGuestMode = false;
      window.__oauthRedirect = false;
      currentUser = session.user;
      const gb = document.getElementById('guest-banner');
      if (gb) gb.remove();
      hideAuthModal();
      const picker = document.getElementById('company-picker');
      if (picker) picker.style.display = 'none';
      // KRITIS: Jangan await afterLogin() di sini!
      // Supabase menahan internal lock selama onAuthStateChange berjalan.
      // Query database apapun akan hang sampai lock dilepas.
      // setTimeout(0) memaksa afterLogin() berjalan SETELAH callback ini selesai
      // dan lock sudah dilepas oleh Supabase SDK.
      setTimeout(() => afterLogin(), 0);
      // Audit: login
      setTimeout(()=>{if(typeof auditLogLogin==='function')auditLogLogin(session.user?.email||'—',_getActorRole());},800);

    } else if (event === 'INITIAL_SESSION') {
      if (session?.user && !currentCompany) {
        isGuestMode = false;
        window.__oauthRedirect = false;
        currentUser = session.user;
        const gb = document.getElementById('guest-banner');
        if (gb) gb.remove();
        hideAuthModal();
        setTimeout(() => afterLogin(), 0);
      } else if (!session && !window.__oauthRedirect) {
        if (!currentUser) enterGuestMode();
      }

    } else if (event === 'TOKEN_REFRESHED') {
      currentUser = session?.user || currentUser;

    } else if (event === 'SIGNED_OUT') {
      // Jangan langsung guest mode jika ini adalah refresh token error sementara
      // dan user baru saja berhasil login (currentCompany sudah terisi)
      if (currentCompany) {
        console.log('[Auth] SIGNED_OUT tapi sudah punya company, abaikan');
        return;
      }
      if(typeof auditLogLogout==='function') auditLogLogout(currentUser?.email||'—');
      currentUser = null;
      currentCompany = null;
      isGuestMode = true;
      _afterLoginRunning = false;
      enterGuestMode();
    }
  });

  _authReady = true;

  // Fallback: perpanjang timeout untuk OAuth PKCE (butuh round-trip ke Supabase)
  const fallbackMs = (hasOAuthParams || window.__oauthRedirect) ? 15000 : 2500;
  setTimeout(() => {
    if (!currentUser && !_afterLoginRunning && !window.__oauthRedirect) {
      console.warn('[Auth] Fallback → guest mode (timeout', fallbackMs, 'ms)');
      enterGuestMode();
    }
  }, fallbackMs);
}

// GUEST MODE — masuk app tanpa login, data ke localStorage

function enterGuestMode() {
  // Jangan masuk guest mode jika OAuth sedang diproses
  // Pakai flag __oauthRedirect karena URL sudah dibersihkan SDK saat ini dipanggil
  if (window.__oauthRedirect ||
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code=')) {
    console.log('[Auth] Skipping guest mode — OAuth sedang diproses');
    return;
  }
  isGuestMode = true;
  currentUser = null;
  currentCompany = null;
  _afterLoginRunning = false;

  // Pastikan auth modal & company picker tertutup
  hideAuthModal();
  const picker = document.getElementById('company-picker');
  if (picker) picker.style.display = 'none';

  // Load dari localStorage seperti mode demo
  _origInitStorage();
  loadProfilToSidebar();
  renderDashboard();
  checkShowOnboarding();
  // Init aset tetap auto penyusutan
  setTimeout(()=>{ if(typeof atInitOnLoad==='function') atInitOnLoad(); }, 1500);

  // Update chip — pakai requestAnimationFrame agar DOM pasti siap
  requestAnimationFrame(() => {
    updateGuestChip();
    showGuestBanner();
  });
}

function updateGuestChip() {
  const chipAvatar = document.getElementById('chip-avatar');
  const chipName = document.getElementById('chip-company-name');
  const chipSub = document.getElementById('chip-sub');
  const chip = document.getElementById('user-company-chip');
  if (chip) {
    chip.style.display = 'flex';
    chip.onclick = () => showAuthModal();
    chip.title = 'Login untuk simpan data ke cloud';
  }
  if (chipAvatar) {
    chipAvatar.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:white;display:block;"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
    chipAvatar.style.background = 'linear-gradient(135deg,#64748b,#94a3b8)';
    chipAvatar.style.display = 'flex';
    chipAvatar.style.alignItems = 'center';
    chipAvatar.style.justifyContent = 'center';
  }
  if (chipName) chipName.textContent = 'Mode Tamu';
  if (chipSub) { chipSub.textContent = 'Klik untuk login'; chipSub.style.color = 'var(--accent3)'; }
}

function showGuestBanner() {
  // Hapus banner lama jika ada
  const old = document.getElementById('guest-banner');
  if (old) old.remove();

  const banner = document.createElement('div');
  banner.id = 'guest-banner';
  banner.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
      <span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></span>
      <span><b>Mode Tamu</b> — Data hanya tersimpan di browser ini. <b>Login</b> untuk simpan ke cloud & akses dari perangkat lain.</span>
      <button onclick="showAuthModal()" style="background:var(--accent);border:none;border-radius:6px;padding:5px 14px;font-weight:700;cursor:pointer;color:#0d0f14;font-size:12px;white-space:nowrap;flex-shrink:0;"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline;vertical-align:-1px;margin-right:4px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Login / Daftar</button>
      <button onclick="document.getElementById('guest-banner').remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:18px;padding:0 4px;margin-left:auto;flex-shrink:0;">✕</button>
    </div>`;
  banner.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:var(--surface2);border-top:2px solid rgba(245,158,11,0.4);padding:10px 16px;z-index:5000;font-size:13px;';
  document.body.appendChild(banner);
}

// AUTH PAGE (halaman login terpisah — fullscreen, form tanpa kotak, mirip ChatGPT/Claude)

// AUTH PAGE (halaman login terpisah — desktop: form kiri, teks+logo kanan tengah; mobile: teks atas, form bawah)

function showAuthModal() {
  // Jika sudah login, langsung buka company picker
  if (currentUser) { showCompanyPicker(); return; }

  let modal = document.getElementById('auth-modal-inline');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal-inline';
    modal.style.cssText = 'position:fixed;inset:0;z-index:99998;overflow:hidden;background:var(--bg);';
    modal.innerHTML = `
      <div class="auth-orb auth-orb-1"></div>
      <div class="auth-orb auth-orb-2"></div>
      <div class="auth-orb auth-orb-3"></div>

      <div class="auth-page-split">

        <!-- INTRO: mobile = atas, desktop = kanan tengah -->
        <div class="auth-intro-col">
          <div class="auth-intro-stage">
            <div id="auth-welcome-text" class="auth-intro-overlay" style="font-size:clamp(22px,4vw,32px);font-weight:800;font-family:var(--sans);color:var(--text);"></div>

            <div id="auth-brand-block" style="display:flex;flex-direction:column;align-items:center;">
              <div id="auth-brand-logo" style="width:72px;height:72px;border-radius:20px;background:var(--surface);border:1px solid var(--accent);display:flex;align-items:center;justify-content:center;margin-bottom:16px;box-shadow:0 8px 32px rgba(74,222,128,0.15);opacity:0;transition:opacity 0.25s ease;">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80" width="44" height="44">
                  <rect class="logo-part" style="--part-delay:0ms;fill:var(--accent)" x="38.5" y="12" width="3" height="38" rx="1.5"/>
                  <rect class="logo-part" style="--part-delay:90ms;fill:var(--accent)" x="24" y="50" width="32" height="4" rx="2"/>
                  <rect class="logo-part" style="--part-delay:160ms;fill:var(--accent)" x="28" y="54" width="24" height="3" rx="1.5" opacity="0.65"/>
                  <rect class="logo-part" style="--part-delay:230ms;fill:var(--accent2)" x="16" y="20" width="48" height="3" rx="1.5"/>
                  <circle class="logo-part" style="--part-delay:300ms;fill:var(--accent3)" cx="40" cy="21.5" r="3.5"/>
                  <line class="logo-part" style="--part-delay:370ms;stroke:var(--accent2)" x1="20" y1="23" x2="20" y2="35" stroke-width="1.5" stroke-linecap="round"/>
                  <line class="logo-part" style="--part-delay:370ms;stroke:var(--accent2)" x1="60" y1="23" x2="60" y2="35" stroke-width="1.5" stroke-linecap="round"/>
                  <ellipse class="logo-part" style="--part-delay:450ms;fill:var(--accent)" cx="20" cy="36.5" rx="10" ry="3" opacity="0.9"/>
                  <ellipse class="logo-part" style="--part-delay:450ms;fill:var(--accent)" cx="60" cy="36.5" rx="10" ry="3" opacity="0.9"/>
                  <text class="logo-part" style="--part-delay:530ms;fill:var(--bg)" x="20" y="35.5" text-anchor="middle" font-size="7" font-weight="bold" font-family="sans-serif">Rp</text>
                  <text class="logo-part" style="--part-delay:530ms;fill:var(--bg)" x="60" y="35.5" text-anchor="middle" font-size="9" font-weight="bold" font-family="sans-serif">=</text>
                </svg>
              </div>
              <div id="auth-brand-title" style="font-size:24px;font-weight:800;font-family:var(--mono);letter-spacing:0.02em;color:var(--accent);text-shadow:0 0 20px rgba(74,222,128,0.35);min-height:1.2em;"></div>
              <div id="auth-brand-sub" style="font-size:12px;margin-top:6px;letter-spacing:0.08em;text-transform:uppercase;color:var(--muted);min-height:1.2em;"></div>
            </div>
          </div>
        </div>

        <!-- FORM: mobile = bawah, desktop = kiri -->
        <div class="auth-form-col">
          <div id="auth-bottom-panel" style="width:100%;max-width:400px;opacity:0;transform:translateY(14px);transition:opacity 0.6s ease,transform 0.6s ease;">

            <!-- Tab Masuk/Daftar — kotak di tengah, bisa diklik ATAU diseret -->
            <div class="auth-tab-switch" id="auth-tab-switch">
              <div class="auth-tab-thumb" id="auth-tab-thumb"></div>
              <button type="button" class="auth-tab-opt active" id="tab-modal-login" onclick="switchModalAuthTab('login')">Masuk</button>
              <button type="button" class="auth-tab-opt" id="tab-modal-register" onclick="switchModalAuthTab('register')">Daftar</button>
            </div>

            <!-- Login Form -->
            <div id="auth-modal-form-login">
              <div class="auth-field-group">
                <label class="auth-label">Email</label>
                <input type="email" id="modal-auth-email" class="auth-input" placeholder="nama@email.com" autocomplete="email">
              </div>
              <div class="auth-field-group">
                <label class="auth-label">Password</label>
                <div style="position:relative;">
                  <input type="password" id="modal-auth-password" class="auth-input" placeholder="Password" style="padding-right:44px;" onkeydown="if(event.key==='Enter')doModalLogin()">
                  <button onclick="toggleAuthPw('modal-auth-password')" class="auth-pw-toggle"><i class="ti ti-eye" style="font-size:15px;"></i></button>
                </div>
              </div>
              <button class="auth-btn-primary" onclick="doModalLogin()" id="btn-modal-login">
                <span id="btn-modal-login-text">Masuk</span>
                <span id="btn-modal-login-spinner" style="display:none;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></span>
              </button>
              <button class="auth-btn-google" onclick="doGoogleLogin()">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="flex-shrink:0"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>
                Lanjutkan dengan Google
              </button>
              <p class="auth-forgot" onclick="doModalForgotPassword()">Lupa password?</p>
            </div>

            <!-- Register Form -->
            <div id="auth-modal-form-register" style="display:none;">
              <div class="auth-field-group">
                <label class="auth-label">Nama Lengkap</label>
                <input type="text" id="modal-auth-fullname" class="auth-input" placeholder="Nama kamu" autocomplete="name">
              </div>
              <div class="auth-field-group">
                <label class="auth-label">Email</label>
                <input type="email" id="modal-auth-reg-email" class="auth-input" placeholder="nama@email.com" autocomplete="email">
              </div>
              <div class="auth-field-group">
                <label class="auth-label">Password</label>
                <div style="position:relative;">
                  <input type="password" id="modal-auth-reg-password" class="auth-input" placeholder="Minimal 6 karakter" style="padding-right:44px;" onkeydown="if(event.key==='Enter')doModalRegister()">
                  <button onclick="toggleAuthPw('modal-auth-reg-password')" class="auth-pw-toggle"><i class="ti ti-eye" style="font-size:15px;"></i></button>
                </div>
              </div>
              <button class="auth-btn-primary" onclick="doModalRegister()" id="btn-modal-register">
                <span id="btn-modal-register-text">Buat Akun</span>
                <span id="btn-modal-register-spinner" style="display:none;"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg></span>
              </button>
              <button class="auth-btn-google" onclick="doGoogleLogin()">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style="flex-shrink:0"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332Z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58Z" fill="#EA4335"/></svg>
                Lanjutkan dengan Google
              </button>
            </div>

            <!-- Pesan error/sukses -->
            <div id="auth-modal-msg" style="display:none;margin-top:12px;padding:10px 14px;border-radius:8px;font-size:13px;text-align:center;"></div>

            <p style="text-align:center;font-size:11px;color:var(--muted);margin-top:16px;opacity:0.7;">Data tersimpan aman di cloud · Multi-perangkat</p>
          </div>
        </div>

      </div>`;
    document.body.appendChild(modal);
    initAuthTabDrag();
  } else {
    modal.style.display = 'block';
  }

  // Mainkan ulang urutan animasi intro setiap kali halaman login dibuka
  requestAnimationFrame(() => { requestAnimationFrame(() => { playAuthIntro(); }); });
}

// Tab Masuk/Daftar bisa diklik ATAU diseret (drag) untuk berpindah
function initAuthTabDrag() {
  const switchEl = document.getElementById('auth-tab-switch');
  const thumb = document.getElementById('auth-tab-thumb');
  if (!switchEl || !thumb || switchEl._dragBound) return;
  switchEl._dragBound = true;

  let dragging = false;

  function ratioFromEvent(e) {
    const rect = switchEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }
  function onMove(e) {
    if (!dragging) return;
    thumb.style.transform = `translateX(${ratioFromEvent(e) * 100}%)`;
  }
  function onUp(e) {
    if (!dragging) return;
    dragging = false;
    switchEl.classList.remove('dragging');
    switchModalAuthTab(ratioFromEvent(e) < 0.5 ? 'login' : 'register');
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }
  switchEl.addEventListener('pointerdown', (e) => {
    dragging = true;
    switchEl.classList.add('dragging');
    onMove(e);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  });
}

// Utilitas: ketik teks karakter demi karakter (dengan kursor berkedip)
function typeText(el, text, speed, isActive) {
  return new Promise(resolve => {
    el.textContent = '';
    el.classList.add('typing-caret');
    let i = 0;
    (function step() {
      if (!isActive()) { resolve(); return; }
      if (i <= text.length) {
        el.textContent = text.slice(0, i);
        i++;
        setTimeout(step, speed);
      } else {
        resolve();
      }
    })();
  });
}

// Utilitas: hapus teks seperti backspace, karakter demi karakter
function untypeText(el, text, speed, isActive) {
  return new Promise(resolve => {
    let i = (el.textContent || '').length;
    (function step() {
      if (!isActive()) { el.classList.remove('typing-caret'); resolve(); return; }
      if (i >= 0) {
        el.textContent = text.slice(0, i);
        i--;
        setTimeout(step, speed);
      } else {
        el.classList.remove('typing-caret');
        resolve();
      }
    })();
  });
}

function _authDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Urutan animasi halaman login — LOOPING selama halaman login terbuka:
// "Selamat Datang" diketik → jeda → dihapus seperti backspace →
// logo terbentuk bagian demi bagian → judul "OAS" diketik → subjudul diketik → jeda (sama dgn jeda welcome) →
// logo, judul, subjudul hilang URUT SESUAI URUTAN MUNCUL (logo → judul → subjudul, judul & subjudul dihapus seperti backspace) → ulang dari awal
let _authIntroGen = 0;

async function playAuthIntro() {
  const welcome = document.getElementById('auth-welcome-text');
  const logo = document.getElementById('auth-brand-logo');
  const title = document.getElementById('auth-brand-title');
  const sub = document.getElementById('auth-brand-sub');
  const bottom = document.getElementById('auth-bottom-panel');
  if (!welcome || !logo || !title || !sub) return;

  // Token generasi — loop lama otomatis berhenti kalau halaman dibuka ulang/ditutup
  const gen = ++_authIntroGen;
  const isActive = () => {
    if (gen !== _authIntroGen) return false;
    const m = document.getElementById('auth-modal-inline');
    return !!m && m.style.display !== 'none';
  };

  const TYPE_SPEED  = 50;   // ms per karakter saat mengetik
  const DEL_SPEED   = 35;   // ms per karakter saat menghapus (sedikit lebih cepat)
  const T_HOLD      = 2200; // jeda saat full tampil — disamakan utk welcome & brand
  const STAGGER     = 380;  // jarak antar elemen brand (logo→judul→subjudul), sama saat muncul & hilang
  const WELCOME_TXT = 'Selamat Datang';
  const TITLE_TXT   = 'OAS';
  const SUB_TXT     = 'Orias Accounting System';

  // Reset kondisi awal
  welcome.textContent = ''; welcome.classList.remove('typing-caret');
  title.textContent = ''; title.classList.remove('typing-caret');
  sub.textContent = ''; sub.classList.remove('typing-caret');
  logo.style.opacity = '0'; logo.classList.remove('logo-built');
  if (bottom) { bottom.style.opacity = '0'; bottom.style.transform = 'translateY(14px)'; }

  while (isActive()) {
    // 1) "Selamat Datang" diketik
    await typeText(welcome, WELCOME_TXT, TYPE_SPEED, isActive);
    if (!isActive()) break;

    // 2) jeda
    await _authDelay(T_HOLD);
    if (!isActive()) break;

    // 3) "Selamat Datang" dihapus (backspace)
    await untypeText(welcome, WELCOME_TXT, DEL_SPEED, isActive);
    if (!isActive()) break;

    await _authDelay(200);
    if (!isActive()) break;

    // 4) Logo terbentuk bagian demi bagian (restart animasi CSS dgn reflow)
    logo.classList.remove('logo-built');
    void logo.offsetWidth; // force reflow supaya animasi CSS bisa diulang
    logo.style.opacity = '1';
    logo.classList.add('logo-built');

    await _authDelay(STAGGER);
    if (!isActive()) break;

    // 5) Judul "OAS" diketik
    await typeText(title, TITLE_TXT, 110, isActive);
    if (!isActive()) break;

    // 6) Subjudul diketik
    await typeText(sub, SUB_TXT, 28, isActive);
    if (!isActive()) break;

    // Tampilkan form login — hanya sekali, tidak ikut loop menghilang
    if (bottom && bottom.style.opacity !== '1') { bottom.style.opacity = '1'; bottom.style.transform = 'translateY(0)'; }

    // 7) jeda — disamakan dengan jeda welcome
    await _authDelay(T_HOLD);
    if (!isActive()) break;

    // 8) Logo, judul, subjudul hilang — urut sesuai urutan muncul (logo → judul → subjudul)
    logo.style.opacity = '0';
    await _authDelay(STAGGER);
    if (!isActive()) break;

    await untypeText(title, TITLE_TXT, DEL_SPEED, isActive);
    if (!isActive()) break;

    await untypeText(sub, SUB_TXT, DEL_SPEED, isActive);
    if (!isActive()) break;

    await _authDelay(250);
    // → kembali ke langkah 1 (loop)
  }
}

function hideAuthModal() {
  const modal = document.getElementById('auth-modal-inline');
  if (modal) modal.style.display = 'none';
  // Juga sembunyikan auth-screen lama jika tampil
  const authScreen = document.getElementById('auth-screen');
  if (authScreen) authScreen.style.display = 'none';
}

function switchModalAuthTab(tab) {
  document.getElementById('auth-modal-form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-modal-form-register').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-modal-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-modal-register').classList.toggle('active', tab === 'register');
  const thumb = document.getElementById('auth-tab-thumb');
  if (thumb) thumb.style.transform = tab === 'login' ? 'translateX(0%)' : 'translateX(100%)';
  clearModalAuthMsg();
}

function showModalAuthMsg(msg, isError = true) {
  const el = document.getElementById('auth-modal-msg');
  if (!el) return;
  el.style.display = 'block';
  el.style.background = isError ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)';
  el.style.border = isError ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(74,222,128,0.3)';
  el.style.color = isError ? 'var(--red)' : 'var(--accent)';
  el.textContent = msg;
}

function clearModalAuthMsg() {
  const el = document.getElementById('auth-modal-msg');
  if (el) el.style.display = 'none';
}

function setModalAuthLoading(btnId, loading) {
  const textEl = document.getElementById(btnId + '-text');
  const spinEl = document.getElementById(btnId + '-spinner');
  const btn = document.getElementById(btnId);
  if (textEl) textEl.style.display = loading ? 'none' : 'inline';
  if (spinEl) spinEl.style.display = loading ? 'inline' : 'none';
  if (btn) btn.disabled = loading;
}

async function doModalLogin() {
  const email = document.getElementById('modal-auth-email').value.trim();
  const pw = document.getElementById('modal-auth-password').value;
  if (!email || !pw) { showModalAuthMsg('Isi email dan password dulu'); return; }
  setModalAuthLoading('btn-modal-login', true); clearModalAuthMsg();
  const { error } = await DB.auth.signInWithPassword({ email, password: pw });
  setModalAuthLoading('btn-modal-login', false);
  if (error) showModalAuthMsg(error.message === 'Invalid login credentials' ? '❌ Email atau password salah' : '❌ ' + error.message);
  // Jika sukses → onAuthStateChange akan trigger afterLogin()
}

async function doModalRegister() {
  const name = document.getElementById('modal-auth-fullname').value.trim();
  const email = document.getElementById('modal-auth-reg-email').value.trim();
  const pw = document.getElementById('modal-auth-reg-password').value;
  if (!name) { showModalAuthMsg('Isi nama lengkap dulu'); return; }
  if (!email) { showModalAuthMsg('Isi email dulu'); return; }
  if (pw.length < 6) { showModalAuthMsg('Password minimal 6 karakter'); return; }
  setModalAuthLoading('btn-modal-register', true); clearModalAuthMsg();
  const { error } = await DB.auth.signUp({
    email, password: pw,
    options: { data: { full_name: name } }
  });
  setModalAuthLoading('btn-modal-register', false);
  if (error) { showModalAuthMsg('❌ ' + error.message); return; }
  showModalAuthMsg('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Cek email kamu untuk verifikasi!', false);
}

async function doModalForgotPassword() {
  const email = document.getElementById('modal-auth-email').value.trim();
  if (!email) { showModalAuthMsg('Masukkan email kamu dulu'); return; }
  const { error } = await DB.auth.resetPasswordForEmail(email);
  if (error) showModalAuthMsg('❌ ' + error.message);
  else showModalAuthMsg('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Link reset password sudah dikirim!', false);
}

// MIGRASI DATA GUEST → SUPABASE (opsional saat pertama login)

async function offerGuestDataMigration() {
  if (!currentCompany || !jurnalEntries.length) return;
  // Cek apakah ada data lokal yang belum ada di Supabase (belum punya _id)
  const localEntries = jurnalEntries.filter(j => !j._id);
  if (!localEntries.length) return;

  const doMigrate = await showCustomConfirmGeneral({
    icon: '☁️', iconColor: 'rgba(34,211,238,0.12)', iconBorder: 'rgba(34,211,238,0.3)',
    title: 'Pindahkan Data Tamu?',
    subtitle: `Kamu punya ${localEntries.length} jurnal dari mode tamu.`,
    rows: [{ label: 'Tujuan', value: `Bisnis "${currentCompany.name}" di cloud` }],
    warning: null,
    btnLabel: '☁️ Ya, Pindahkan',
    btnGradient: 'linear-gradient(135deg,#22d3ee,#4ade80)'
  });

  if (doMigrate) {
    updateSaveIndicator('saving');
    for (const j of localEntries) {
      await saveJurnalToSupabase(j);
    }
    await saveAkunsToSupabase();
    updateSaveIndicator('saved');
    showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${localEntries.length} jurnal berhasil dipindahkan ke cloud!`);
  }
}

// AUTH SCREEN (lama — sekarang hanya sebagai fallback, tidak dipakai langsung)

function showAuthScreen() {
  // Sekarang kita gunakan modal in-app, bukan fullscreen
  showAuthModal();
}

function hideAuthScreen() {
  hideAuthModal();
}

function switchAuthTab(tab) {
  document.getElementById('auth-form-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('auth-form-register').style.display = tab === 'register' ? 'block' : 'none';
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  clearAuthMsg();
}

function showAuthMsg(msg, isError = true) {
  const el = document.getElementById('auth-msg');
  el.style.display = 'block';
  el.style.background = isError ? 'rgba(248,113,113,0.1)' : 'rgba(74,222,128,0.1)';
  el.style.border = isError ? '1px solid rgba(248,113,113,0.3)' : '1px solid rgba(74,222,128,0.3)';
  el.style.color = isError ? 'var(--red)' : 'var(--accent)';
  el.textContent = msg;
}

function clearAuthMsg() {
  const el = document.getElementById('auth-msg');
  if (el) el.style.display = 'none';
}

function setAuthLoading(btnId, loading) {
  const textEl = document.getElementById(btnId + '-text');
  const spinEl = document.getElementById(btnId + '-spinner');
  const btn = document.getElementById(btnId);
  if (textEl) textEl.style.display = loading ? 'none' : 'inline';
  if (spinEl) spinEl.style.display = loading ? 'inline' : 'none';
  if (btn) btn.disabled = loading;
}

function toggleAuthPw(inputId) {
  const el = document.getElementById(inputId);
  el.type = el.type === 'password' ? 'text' : 'password';
}

async function doLogin() {
  const email = document.getElementById('auth-email').value.trim();
  const pw = document.getElementById('auth-password').value;
  if (!email || !pw) { showAuthMsg('Isi email dan password dulu'); return; }
  setAuthLoading('btn-login', true); clearAuthMsg();
  showOpSpinner('Masuk ke akun...', 'Verifikasi kredensial');
  const { error } = await DB.auth.signInWithPassword({ email, password: pw });
  hideOpSpinner();
  setAuthLoading('btn-login', false);
  if (error) showAuthMsg(error.message === 'Invalid login credentials' ? '❌ Email atau password salah' : '❌ ' + error.message);
}

async function doRegister() {
  const name = document.getElementById('auth-fullname').value.trim();
  const email = document.getElementById('auth-reg-email').value.trim();
  const pw = document.getElementById('auth-reg-password').value;
  if (!name) { showAuthMsg('Isi nama lengkap dulu'); return; }
  if (!email) { showAuthMsg('Isi email dulu'); return; }
  if (pw.length < 6) { showAuthMsg('Password minimal 6 karakter'); return; }
  setAuthLoading('btn-register', true); clearAuthMsg();
  const { error } = await DB.auth.signUp({
    email, password: pw,
    options: { data: { full_name: name } }
  });
  setAuthLoading('btn-register', false);
  if (error) { showAuthMsg('❌ ' + error.message); return; }
  showAuthMsg('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Cek email kamu untuk verifikasi!', false);
}

async function doGoogleLogin() {
  // Tampilkan loading state
  const btns = document.querySelectorAll('.auth-btn-google');
  btns.forEach(b => { b.disabled = true; b.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Mengarahkan ke Google...'; });

  try {
    // Gunakan URL yang benar untuk redirect setelah OAuth
    const redirectTo = window.location.origin + window.location.pathname;

    const { error } = await DB.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });

    if (error) {
      btns.forEach(b => { b.disabled = false; b.innerHTML = '<img src="https://www.google.com/favicon.ico" width="16" height="16" style="vertical-align:middle;margin-right:8px;border-radius:2px"> Lanjutkan dengan Google'; });
      // Cek apakah error karena provider belum dikonfigurasi
      if (error.message && (error.message.includes('provider') || error.message.includes('not enabled') || error.message.includes('OAuth'))) {
        showAuthMsg('❌ Google Login belum diaktifkan. Hubungi admin untuk setup Google OAuth di Supabase Dashboard → Authentication → Providers → Google.');
      } else {
        showAuthMsg('❌ ' + error.message);
      }
    }
    // Jika sukses, browser akan redirect ke Google — tidak perlu reset tombol
  } catch(e) {
    btns.forEach(b => { b.disabled = false; b.innerHTML = '<img src="https://www.google.com/favicon.ico" width="16" height="16" style="vertical-align:middle;margin-right:8px;border-radius:2px"> Lanjutkan dengan Google'; });
    showAuthMsg('❌ Gagal menghubungi server. Pastikan koneksi internet aktif.');
    console.error('Google login error:', e);
  }
}

// Helper: tampilkan panduan setup Google OAuth jika diperlukan
function showGoogleSetupGuide() {
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.8);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
  modal.innerHTML = `
    <div style="background:var(--surface);border:1px solid var(--border);border-radius:16px;max-width:520px;width:100%;padding:28px;font-family:var(--sans);">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
        <span style="font-size:24px;">🔐</span>
        <div>
          <div style="font-size:16px;font-weight:700;">Setup Google Login</div>
          <div style="font-size:12px;color:var(--muted);">Ikuti langkah berikut di Supabase Dashboard</div>
        </div>
      </div>
      <ol style="font-size:13px;line-height:1.9;color:var(--text);padding-left:18px;">
        <li>Buka <a href="https://supabase.com/dashboard" target="_blank" style="color:var(--accent2)">supabase.com/dashboard</a> → pilih project kamu</li>
        <li>Pergi ke <b>Authentication → Providers → Google</b></li>
        <li>Toggle <b>Enable</b> → aktifkan</li>
        <li>Buka <a href="https://console.cloud.google.com" target="_blank" style="color:var(--accent2)">Google Cloud Console</a> → buat project / pilih project</li>
        <li>Pergi ke <b>APIs & Services → Credentials → Create OAuth Client ID</b></li>
        <li>Application type: <b>Web application</b></li>
        <li>Di bagian <b>Authorized redirect URIs</b>, tambahkan:<br>
          <code style="background:var(--surface2);padding:4px 8px;border-radius:5px;font-size:12px;display:block;margin-top:5px;word-break:break-all;">${SUPABASE_URL}/auth/v1/callback</code>
        </li>
        <li>Copy <b>Client ID</b> dan <b>Client Secret</b> → paste di Supabase (Authentication → Providers → Google)</li>
        <li>Simpan di Supabase → selesai! Google Login siap digunakan.</li>
      </ol>
      <div style="margin-top:16px;padding:12px;background:rgba(34,211,238,0.08);border:1px solid rgba(34,211,238,0.2);border-radius:8px;font-size:12px;color:var(--accent2);">
        💡 <b>Site URL di Supabase</b> (Authentication → URL Configuration) harus diisi dengan URL tempat file HTML ini diakses, misalnya <code>http://localhost</code> atau domain kamu.
      </div>
      <button onclick="this.closest('div[style]').remove()" style="margin-top:18px;width:100%;background:var(--accent);border:none;border-radius:8px;padding:11px;font-weight:700;cursor:pointer;color:#000;font-size:14px;">Mengerti, Tutup</button>
    </div>
  `;
  document.body.appendChild(modal);
  modal.onclick = (e) => { if(e.target === modal) modal.remove(); };
}

async function doForgotPassword() {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) { showAuthMsg('Masukkan email kamu dulu'); return; }
  const { error } = await DB.auth.resetPasswordForEmail(email);
  if (error) showAuthMsg('❌ ' + error.message);
  else showAuthMsg('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Link reset password sudah dikirim ke email kamu!', false);
}

async function doLogout() {
  showOpSpinner('Keluar dari akun...', 'Membersihkan sesi');
  try {
    await DB.auth.signOut({ scope: 'global' });
  } catch(e) {
    try { await DB.auth.signOut(); } catch(e2) {}
  }
  // Paksa reload halaman agar state bersih sepenuhnya
  window.location.reload();
}

// CHIP CLICK HANDLER — safe handler yang cek state dulu

function handleChipClick() {
  // Abaikan klik jika sedang proses apapun
  if (_afterLoginRunning) return;
  if (window.__oauthRedirect || window.__initialOAuthRedirect) return;
  // Jika belum login sama sekali
  if (!currentUser) { showAuthModal(); return; }
  // Jika sudah login, tampilkan company picker
  showCompanyPicker();
}

// AFTER LOGIN — cek companies

async function afterLogin() {
  if (_afterLoginRunning) return;
  _afterLoginRunning = true;
  // Paksa batalkan guest mode sebelum apapun
  isGuestMode = false;
  window.__oauthRedirect = false;
  hideAuthModal();
  // Hapus banner guest
  const guestBanner = document.getElementById('guest-banner');
  if (guestBanner) guestBanner.remove();

  // Tunjukkan loading state di chip selama proses
  const chipAvatar = document.getElementById('chip-avatar');
  const chipName   = document.getElementById('chip-company-name');
  const chipSub    = document.getElementById('chip-sub');
  const chip       = document.getElementById('user-company-chip');
  // Update chip segera agar tidak stuck di "Mode Tamu"
  if (chip) {
    chip.style.display = 'flex';
    chip.onclick = null; // Disable saat loading agar tidak trigger showCompanyPicker prematur
    chip.style.pointerEvents = 'none';
    chip.title = 'Memuat...';
  }
  if (chipAvatar) {
    const photoURL = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || localStorage.getItem('oas_profile_photo');
    const initial = (currentUser.user_metadata?.full_name || currentUser.email || '?').charAt(0).toUpperCase();
    if (photoURL) {
      chipAvatar.innerHTML = `<img src="${escapeHtml(photoURL)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      chipAvatar.style.background = 'transparent';
    } else {
      chipAvatar.textContent = initial;
      chipAvatar.style.background = 'linear-gradient(135deg,var(--accent2),var(--accent))';
    }
  }
  const _displayName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email || '—';
  if (chipName)   chipName.textContent = _displayName.length > 22 ? _displayName.slice(0,20)+'…' : _displayName;
  if (chipSub)    chipSub.textContent  = currentUser?.email || '';

  console.log('[afterLogin] Mulai, user:', currentUser?.email, 'id:', currentUser?.id);
  if (chipName) chipName.textContent = 'Memuat bisnis...';

  try {
    if (!currentUser?.id) throw new Error('User ID tidak tersedia');

    console.log('[afterLogin] Query companies (owned + member)...');
    // getMyCompanies() sudah include bisnis yang user-nya jadi member via org_members
    let list = [];
    try {
      list = await getMyCompanies();
    } catch(getErr) {
      // Fallback ke query langsung jika getMyCompanies gagal (misal tabel org_members belum ada)
      console.warn('[afterLogin] getMyCompanies failed, fallback:', getErr.message);
      const { data: owned, error: compErr } = await _supa
        .from('companies').select('*').eq('user_id', currentUser.id).order('created_at');
      if (compErr) {
        const msg = compErr.message || '';
        if (msg.includes('relation') || msg.includes('does not exist') || compErr.code === '42P01')
          throw new Error('Tabel "companies" belum dibuat. Buka Setup Supabase.');
        if (compErr.code === '42501' || msg.includes('policy') || msg.includes('permission'))
          throw new Error('RLS Policy belum diatur. Buka Setup Supabase.');
        throw new Error('Query gagal: ' + msg + ' (code: ' + compErr.code + ')');
      }
      list = Array.isArray(owned) ? owned : [];
    }
    console.log('[afterLogin] Jumlah bisnis ditemukan:', list.length);

    if (list.length === 0) {
      showCompanyPickerScreen(list);
    } else if (list.length === 1) {
      await selectCompany(list[0]);
      updateUserChip();
      await offerGuestDataMigration();
    } else {
      showCompanyPickerScreen(list);
    }

  } catch(e) {
    console.error('[afterLogin] ERROR:', e.message, e);
    if (chip) chip.style.pointerEvents = '';
    if (chipName) chipName.textContent = '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Gagal memuat';
    if (chipSub) chipSub.textContent = e.message || 'Cek console';
    showAlert('❌ Gagal memuat data bisnis: ' + e.message);
    enterGuestMode();
  } finally {
    _afterLoginRunning = false;
    window.__initialOAuthRedirect = false;
    console.log('[afterLogin] Selesai');
  }
}

// COMPANY PICKER

let _companyPickerLoading = false;
async function showCompanyPicker() {
  // Jika belum login, tampilkan auth modal
  if (!currentUser) { showAuthModal(); return; }
  if (_companyPickerLoading) return;
  _companyPickerLoading = true;
  const chip = document.getElementById('user-company-chip');
  if (chip) chip.style.opacity = '0.6';
  try {
    const companies = await getMyCompanies();
    showCompanyPickerScreen(companies);
  } catch(e) {
    console.error('showCompanyPicker error:', e);
    showAlert('❌ Gagal memuat daftar bisnis. Coba lagi.');
  } finally {
    _companyPickerLoading = false;
    if (chip) chip.style.opacity = '1';
  }
}

function showCompanyPickerScreen(companies) {
  const chip = document.getElementById('user-company-chip');
  if (chip) chip.style.pointerEvents = ''; // Re-enable setelah loading
  const picker = document.getElementById('company-picker');
  picker.style.display = 'block';
  const isLight = document.body.classList.contains('light-mode');
  picker.style.background = isLight ? '#f8fafc' : '#0d0f14';

  // Email
  document.getElementById('cp-user-email').textContent = currentUser?.email || '';

  // Reset form
  document.getElementById('cp-add-form').style.display = 'none';
  document.getElementById('cp-new-name').value = '';

  // Update chip sementara HANYA jika belum ada bisnis aktif
  if (!currentCompany) {
    const chipAvatar = document.getElementById('chip-avatar');
    const chipName   = document.getElementById('chip-company-name');
    const chipSub    = document.getElementById('chip-sub');
    if (chipAvatar) { chipAvatar.textContent = currentUser?.email?.charAt(0)?.toUpperCase() || '?'; chipAvatar.style.background = 'linear-gradient(135deg,var(--accent2),var(--accent))'; }
    if (chipName)   chipName.textContent = 'Pilih Bisnis';
    if (chipSub)    chipSub.textContent  = currentUser?.email || '';
  }

  renderCompanyList(companies);
}

function renderCompanyList(companies) {
  const list = document.getElementById('cp-list');
  if (companies.length === 0) {
    list.innerHTML = `<div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;">Belum ada bisnis.<br>Buat bisnis pertama kamu di bawah!</div>
    <div style="text-align:center;margin-bottom:8px;">
      <button onclick="diagnosSupabase()" style="font-size:11px;color:var(--muted);background:none;border:1px dashed var(--border);border-radius:8px;padding:6px 14px;cursor:pointer;">
        🔍 Diagnosa koneksi Supabase
      </button>
    </div>`;
    return;
  }
  const icons = {
    umum: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    dagang: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
    jasa: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
    manufaktur: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M5 20V8l7-5 7 5v12"/><path d="M9 20v-5h6v5"/></svg>`,
    properti: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M9 21V7l6-4v18M3 7l6-4"/><rect x="13" y="10" width="4" height="4"/></svg>`
  };
  list.innerHTML = companies.map((c, i) => `
    <div class="cp-company-card" data-company-id="${c.id}" style="animation-delay:${i*60}ms;">
      <div class="cp-card-inner">
        <div class="cp-company-icon" style="display:flex;align-items:center;justify-content:center;">${icons[c.type] || icons.umum}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:15px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(c.name)}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px;text-transform:capitalize;">${c.type || 'Umum'}</div>
        </div>
        <div style="color:var(--muted);font-size:12px;font-family:var(--mono);opacity:0.55;margin-left:4px;flex-shrink:0;">tahan <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="0" y1="1" x2="18" y2="1"/><line x1="0" y1="7" x2="18" y2="7"/><line x1="0" y1="13" x2="18" y2="13"/></svg></div>
      </div>
      <div class="cp-press-bar" id="press-bar-${c.id}"></div>
    </div>
  `).join('');

  // Pasang long-press handler setelah render
  companies.forEach(c => {
    const card = list.querySelector(`[data-company-id="${c.id}"]`);
    if (card) attachCompanyCardHandlers(card, c);
  });
}

// Long-press threshold (ms)
const CP_LONG_PRESS_MS = 600;

function attachCompanyCardHandlers(card, company) {
  let pressTimer = null;
  let isLongPress = false;
  let startX = 0, startY = 0;
  const bar = card.querySelector('.cp-press-bar');

  function startPress(x, y) {
    isLongPress = false;
    startX = x; startY = y;
    card.classList.add('long-pressing');
    if (bar) { bar.style.width = '0%'; bar.style.transition = 'none'; bar.classList.add('animating'); }
    pressTimer = setTimeout(() => {
      isLongPress = true;
      card.classList.remove('long-pressing');
      if (bar) { bar.style.width = '0%'; bar.classList.remove('animating'); }
      // Haptic feedback jika tersedia
      if (navigator.vibrate) navigator.vibrate(40);
      showCompanyActionSheet(company);
    }, CP_LONG_PRESS_MS);
    // Animate bar
    requestAnimationFrame(() => {
      if (bar) { bar.style.transition = `width ${CP_LONG_PRESS_MS}ms linear`; bar.style.width = '100%'; }
    });
  }

  function cancelPress() {
    clearTimeout(pressTimer);
    card.classList.remove('long-pressing');
    if (bar) { bar.style.width = '0%'; bar.classList.remove('animating'); bar.style.transition = 'none'; }
  }

  // Touch events
  card.addEventListener('touchstart', e => {
    const t = e.touches[0];
    startPress(t.clientX, t.clientY);
  }, { passive: true });

  card.addEventListener('touchmove', e => {
    const t = e.touches[0];
    if (Math.abs(t.clientX - startX) > 8 || Math.abs(t.clientY - startY) > 8) cancelPress();
  }, { passive: true });

  card.addEventListener('touchend', e => {
    if (!isLongPress) {
      cancelPress();
      // Tap normal → buka bisnis
      selectCompany(company);
    }
    isLongPress = false;
  });

  card.addEventListener('touchcancel', () => { cancelPress(); isLongPress = false; });

  // Mouse events (desktop)
  card.addEventListener('mousedown', e => { startPress(e.clientX, e.clientY); });
  card.addEventListener('mousemove', e => {
    if (Math.abs(e.clientX - startX) > 8 || Math.abs(e.clientY - startY) > 8) cancelPress();
  });
  card.addEventListener('mouseup', e => {
    if (!isLongPress) {
      cancelPress();
      selectCompany(company);
    }
    isLongPress = false;
  });
  card.addEventListener('mouseleave', () => { cancelPress(); });
}

// COMPANY ACTION SHEET
let _cpActionTarget = null;

function showCompanyActionSheet(company) {
  _cpActionTarget = company;
  const icons = {
    umum: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
    dagang: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
    jasa: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16"/></svg>`,
    manufaktur: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 20h20M5 20V8l7-5 7 5v12"/><path d="M9 20v-5h6v5"/></svg>`,
    properti: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M9 21V7l6-4v18M3 7l6-4"/><rect x="13" y="10" width="4" height="4"/></svg>`
  };
  const bizIconEl = document.getElementById('cp-action-biz-icon');
  if(bizIconEl) { bizIconEl.innerHTML = icons[company.type] || icons.umum; bizIconEl.style.display='flex'; bizIconEl.style.alignItems='center'; bizIconEl.style.justifyContent='center'; }
  document.getElementById('cp-action-biz-name').textContent = company.name;
  document.getElementById('cp-action-biz-type').textContent = company.type || 'Umum';
  document.getElementById('cp-action-sheet-backdrop').classList.add('open');
}

function closeCompanyActionSheet() {
  document.getElementById('cp-action-sheet-backdrop').classList.remove('open');
  _cpActionTarget = null;
}

function cpActionOpen() {
  if (_cpActionTarget) {
    closeCompanyActionSheet();
    selectCompany(_cpActionTarget);
  }
}

function cpActionDelete() {
  if (!_cpActionTarget) return;
  const company = _cpActionTarget;
  closeCompanyActionSheet();
  setTimeout(() => showDeleteCompanyConfirm(company), 120);
}

// BEAUTIFUL DELETE CONFIRM
let _cpDeleteTarget = null;

function showDeleteCompanyConfirm(company) {
  _cpDeleteTarget = company;
  document.getElementById('cp-del-biz-name').textContent = company.name;
  document.getElementById('cp-del-journal-warn').textContent =
    'Semua jurnal & transaksi bisnis "' + company.name + '" akan dihapus permanen.';
  document.getElementById('cp-delete-confirm-backdrop').classList.add('open');
}

function closeDeleteCompanyConfirm() {
  document.getElementById('cp-delete-confirm-backdrop').classList.remove('open');
  _cpDeleteTarget = null;
  // Reset tombol ke state semula agar bisa dipakai lagi
  const okBtn = document.getElementById('cp-del-btn-ok');
  if (okBtn) {
    okBtn.classList.remove('loading');
    okBtn.disabled = false;
    okBtn.innerHTML = '<i class="ti ti-trash ti-btn"></i> Hapus Permanen';
  }
}

async function confirmDeleteCompany() {
  if (!_cpDeleteTarget) return;
  const company = _cpDeleteTarget;
  const okBtn = document.getElementById('cp-del-btn-ok');
  okBtn.classList.add('loading');
  okBtn.disabled = true;
  okBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.7s linear infinite;vertical-align:-2px"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Menghapus...';
  try {
    await DB.table('jurnal_entries').delete().eq('company_id', company.id);
    const { error } = await DB.table('companies').delete().eq('id', company.id).eq('user_id', currentUser.id);
    if (error) throw error;
    if (currentCompany?.id === company.id) currentCompany = null;
    closeDeleteCompanyConfirm();
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Bisnis "' + company.name + '" berhasil dihapus.');
    const companies = await getMyCompanies();
    if (companies.length === 0) {
      showCompanyPickerScreen(companies);
    } else {
      renderCompanyList(companies);
    }
  } catch(e) {
    okBtn.classList.remove('loading');
    okBtn.disabled = false;
    okBtn.innerHTML = '<i class="ti ti-trash ti-btn"></i> Hapus Permanen';
    showAlert('❌ Gagal menghapus bisnis: ' + (e.message || e));
  }
}

async function deleteCompany(company) {
  showDeleteCompanyConfirm(company);
}

async function getMyCompanies() {
  if (!currentUser) throw new Error('Belum login');
  // 1. Companies yang dimiliki user
  const { data: owned, error: ownedErr } = await _supa
    .from('companies')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at');
  if (ownedErr) {
    console.error('getMyCompanies error:', ownedErr);
    throw new Error(ownedErr.message || 'Gagal mengambil data bisnis');
  }
  // 2. Companies yang user-nya jadi member (via org_members)
  let memberCompanies = [];
  try {
    const { data: memberships } = await _supa
      .from('org_members')
      .select('company_id')
      .eq('user_id', currentUser.id);
    if (memberships && memberships.length) {
      const ids = memberships.map(m => m.company_id);
      const { data: mcos } = await _supa
        .from('companies')
        .select('*')
        .in('id', ids);
      memberCompanies = (mcos || []).filter(c => c.user_id !== currentUser.id);
    }
  } catch(e) { /* tabel org_members mungkin belum ada, skip */ }
  const all = [...(Array.isArray(owned)?owned:[]), ...memberCompanies];
  // Deduplicate by id
  return all.filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i);
}

// Blokir karakter non-angka di input nominal (kecuali tombol kontrol)
function blockNonNumeric(e) {
  const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Enter','Home','End'];
  if (allowed.includes(e.key)) return;
  // Izinkan Ctrl/Cmd + A/C/V/X
  if ((e.ctrlKey || e.metaKey) && ['a','c','v','x'].includes(e.key.toLowerCase())) return;
  // Izinkan satu titik desimal
  if (e.key === '.' && !e.target.value.includes('.')) return;
  // Izinkan minus di awal
  if (e.key === '-' && e.target.selectionStart === 0 && !e.target.value.includes('-')) return;
  // Blokir semua yang bukan digit
  if (!/^\d$/.test(e.key)) e.preventDefault();
}
function sanitizePaste(e, el) {
  e.preventDefault();
  const text = (e.clipboardData || window.clipboardData).getData('text');
  const clean = text.replace(/[^0-9.\-]/g, '');
  const num = parseFloat(clean);
  if (!isNaN(num)) { el.value = num; el.dispatchEvent(new Event('input')); }
}

function selectBizType(el) {
  document.querySelectorAll('.cp-type-card').forEach(c => {
    c.classList.remove('cp-type-selected');
    c.querySelector('.cp-type-radio').innerHTML = '';
  });
  el.classList.add('cp-type-selected');
  el.querySelector('.cp-type-radio').innerHTML = '<span class="cp-type-dot"></span>';
  document.getElementById('cp-new-type').value = el.dataset.val;
}

async function createCompany() {
  const name = document.getElementById('cp-new-name').value.trim();
  const type = document.getElementById('cp-new-type').value;
  if (!name) { document.getElementById('cp-new-name').focus(); return; }

  const btn = document.getElementById('btn-create-co');
  const btnText = document.getElementById('btn-create-co-text');
  btn.disabled = true; btnText.textContent = 'Membuat...';

  try {
    // Tidak perlu getSession() — token sudah valid saat user login
    if (!currentUser) {
      btn.disabled = false; btnText.textContent = 'Buat Bisnis';
      showAlert('❌ Sesi login habis. Silakan login ulang.');
      return;
    }

    const { data, error } = await DB.table('companies').insert({
      user_id: currentUser.id,
      name, type,
      created_at: new Date().toISOString()
    }).select().single();

    btn.disabled = false; btnText.textContent = 'Buat Bisnis';

    if (error) {
      console.error('createCompany error:', error);
      let msg = error.message || JSON.stringify(error);
      // Tabel belum dibuat di Supabase
      if (msg.includes('relation') || msg.includes('does not exist') || msg.includes('42P01')) {
        showAlert('❌ Tabel "companies" belum ada di Supabase.\n\nSilakan buka menu <i class="ti ti-settings ti-inline"></i> Setup Supabase dan jalankan SQL schema-nya dulu di Supabase Dashboard → SQL Editor.');
        showSupabaseSetup();
        return;
      }
      // RLS policy block
      if (msg.includes('row-level') || msg.includes('policy') || msg.includes('42501') || msg.includes('permission')) {
        showAlert('❌ Akses ditolak Supabase (RLS).\n\nPastikan policy "Users can manage own companies" sudah dibuat di SQL Editor Supabase.');
        showSupabaseSetup();
        return;
      }
      showAlert('❌ Gagal membuat bisnis:\n' + msg);
      return;
    }

    await selectCompany(data);
  } catch(e) {
    btn.disabled = false; btnText.textContent = 'Buat Bisnis';
    console.error('createCompany exception:', e);
    showAlert('❌ Error tidak terduga: ' + (e.message || e));
  }
}

async function selectCompany(company) {
  currentCompany = company;
  isGuestMode = false;
  document.getElementById('company-picker').style.display = 'none';

  // Reset semua data agar tidak bocor ke bisnis baru
  multiKartuStock = {};
  jurnalEntries = [];
  activeKartuStockId = null;
  activeKategoriId = null;

  // Update chip di topbar — pastikan currentCompany & currentUser sudah terisi
  updateUserChip();

  // Load data dari Supabase untuk company ini
  await loadDataFromSupabase();

  // Update chip sekali lagi setelah load selesai (guard kalau render async mengubah chip)
  updateUserChip();

  // Render app
  renderDashboard();
  showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Beralih ke: ' + company.name);
}

function updateUserChip() {
  if (!currentCompany || !currentUser) return;
  const chip = document.getElementById('user-company-chip');
  const chipAvatar = document.getElementById('chip-avatar');
  const chipName = document.getElementById('chip-company-name');
  const chipSub = document.getElementById('chip-sub');
  const bisnisAktif = document.getElementById('sidebar-bisnis-aktif');

  if (chip) {
    chip.style.display = 'flex';
    chip.style.pointerEvents = '';
    chip.onclick = () => openAccountSettings();
    chip.title = 'Informasi Akun';
  }

  // Chip atas: tampilkan foto profil / inisial user
  if (chipAvatar) {
    const photoURL = currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || localStorage.getItem('oas_profile_photo');
    if (photoURL) {
      chipAvatar.innerHTML = `<img src="${escapeHtml(photoURL)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" onerror="this.parentElement.innerHTML='${(currentUser.user_metadata?.full_name || currentUser.email || '?').charAt(0).toUpperCase()}'">`;
      chipAvatar.style.background = 'transparent';
    } else {
      const initial = (currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email || '?').charAt(0).toUpperCase();
      chipAvatar.innerHTML = initial;
      chipAvatar.style.background = 'linear-gradient(135deg,var(--accent),var(--accent2))';
    }
  }

  // Chip atas: tampilkan username
  const displayName = currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email || '—';
  if (chipName) chipName.textContent = displayName.length > 22 ? displayName.slice(0,20)+'…' : displayName;
  if (chipSub) {
    const email = currentUser.email || '';
    chipSub.textContent = email.length > 26 ? email.slice(0,24)+'…' : email;
    chipSub.style.color = 'var(--muted)';
  }

  // Tombol bawah: tampilkan nama bisnis aktif
  if (bisnisAktif) bisnisAktif.textContent = currentCompany.name;
}

// SUPABASE DATA LAYER — menggantikan localStorage

// LOAD DATA
async function loadDataFromSupabase() {
  if (!currentCompany) return;
  showOpSpinner('Memuat data bisnis...', 'Mengambil dari cloud');
  const companyId = currentCompany.id;

  // Load jurnal entries
  const { data: jurnalData } = await _supa
    .from('jurnal_entries')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at');

  if (jurnalData && jurnalData.length > 0) {
    jurnalEntries = jurnalData.map(r => ({
      no: r.no,
      tanggal: r.tanggal,
      ket: r.ket,
      jenis: r.jenis,
      lines: r.lines,
      attachments: r.attachments || [],
      _id: r.id
    }));
    // Hitung counter dari nomor jurnal tertinggi
    const nums = jurnalEntries.map(j => parseInt(j.no.replace('JRN-','')) || 0);
    jurnalCounter = (Math.max(0, ...nums) + 1);
  } else {
    jurnalEntries = [];
    jurnalCounter = 1;
  }

  // Load akuns
  const { data: akunData } = await _supa
    .from('akuns')
    .select('*')
    .eq('company_id', companyId)
    .order('kode');

  if (akunData && akunData.length > 0) {
    akuns = akunData.map(r => ({ kode: r.kode, nama: r.nama, tipe: r.tipe, normal: r.normal, _id: r.id }));
  } else {
    // Default chart of accounts jika belum ada
    akuns = getDefaultAkuns();
    await saveAkunsToSupabase();
  }

  // Load profil perusahaan
  const { data: profilData } = await _supa
    .from('company_profiles')
    .select('*')
    .eq('company_id', companyId)
    .single();

  if (profilData) {
    const cloudData = profilData.data || {};
    // Profil disimpan di _profil key (baru), fallback ke root untuk backward compat
    const profilObj = cloudData._profil || cloudData;
    // Simpan ke localStorage untuk backward compat dengan fungsi getProfil()
    if (profilObj && (profilObj.nama || profilObj.jenis)) {
      localStorage.setItem('oas_profil_v1', JSON.stringify(profilObj));
    }
    // Load kartu stock dari cloud
    loadKartuStockFromData(cloudData);
  }

  updateSaveIndicator('saved');
  hideOpSpinner();
}

// getDefaultAkuns() dipakai dari versi lengkap di baris ~5673 (103 akun hardcoded).
// Versi kedua yang tadinya ada di sini DIHAPUS — sebelumnya diam-diam override jadi
// `return [...akuns]`, yang membuat applyTemplate("Lengkap") dan seed akun untuk
// company baru gagal mengembalikan COA lengkap yang benar.

// SAVE JURNAL
async function saveJurnalToSupabase(entry) {
  if (!currentCompany) return;
  const payload = {
    company_id: currentCompany.id,
    no: entry.no,
    tanggal: entry.tanggal,
    ket: entry.ket,
    jenis: entry.jenis,
    lines: entry.lines,
    attachments: entry.attachments || [],
    created_at: new Date().toISOString()
  };
  const { data, error } = await DB.table('jurnal_entries').insert(payload).select().single();
  if (!error && data) entry._id = data.id;
  return !error;
}

async function updateJurnalInSupabase(entry) {
  if (!currentCompany || !entry._id) return;
  await DB.table('jurnal_entries').update({
    tanggal: entry.tanggal,
    ket: entry.ket,
    jenis: entry.jenis,
    lines: entry.lines,
    attachments: entry.attachments || []
  }).eq('id', entry._id);
}

async function deleteJurnalFromSupabase(entry) {
  if (!currentCompany || !entry._id) return;
  showOpSpinner('Menghapus jurnal...', 'Sinkronisasi ke cloud');
  try {
    await DB.table('jurnal_entries').delete().eq('id', entry._id);
    hideOpSpinner();
  } catch(e) {
    hideOpSpinner();
    throw e;
  }
}

// SAVE AKUNS
async function saveAkunsToSupabase() {
  if (!currentCompany) return;
  // Upsert semua akun
  const payload = akuns.map(a => ({
    company_id: currentCompany.id,
    kode: a.kode, nama: a.nama,
    tipe: a.tipe, normal: a.normal
  }));
  await DB.table('akuns').upsert(payload, { onConflict: 'company_id,kode' });
}

// SAVE PROFIL
async function saveProfilToSupabase(profilData) {
  if (!currentCompany) return;
  try {
    // Ambil data existing dulu agar tidak menimpa _kartu_stock
    const { data: existing } = await DB.table('company_profiles')
      .select('data').eq('company_id', currentCompany.id).single();
    const existingData = (existing && existing.data) ? existing.data : {};
    // Merge: simpan profil di key _profil, bukan langsung di root
    await DB.table('company_profiles').upsert({
      company_id: currentCompany.id,
      data: { ...existingData, _profil: profilData },
      updated_at: new Date().toISOString()
    }, { onConflict: 'company_id' });
  } catch(e) {
    console.warn('saveProfilToSupabase error:', e);
  }
}

// SAVE & LOAD KARTU STOCK KE CLOUD
async function saveKartuStockToCloud() {
  // PENTING: syncKategoriFromKartuStockData() TIDAK dipanggil di sini.
  // Dipanggil dari saveMKS(skipSync=true) — kat.data sudah ditulis langsung oleh
  // addKartuStockOnBuy/deductKartuStockOnSale. Sync di sini overwrite data baru
  // dengan kartuStockData yang masih stale.
  if (!currentCompany) {
    // Fallback ke localStorage jika belum login / mode tamu
    try { localStorage.setItem('oas_mks_guest', JSON.stringify(multiKartuStock)); } catch(e) {}
    return;
  }
  try {
    const { data: existing } = await DB.table('company_profiles').select('data').eq('company_id', currentCompany.id).single();
    const existingData = (existing && existing.data) ? existing.data : {};
    await DB.table('company_profiles').upsert({
      company_id: currentCompany.id,
      data: { ...existingData, _multi_kartu_stock: multiKartuStock },
      updated_at: new Date().toISOString()
    }, { onConflict: 'company_id' });
  } catch(e) {
    console.warn('saveKartuStockToCloud error:', e);
    try { localStorage.setItem('oas_mks_' + currentCompany.id, JSON.stringify(multiKartuStock)); } catch(e2) {}
  }
}

function loadKartuStockFromData(profileData) {
  // Coba dari cloud data format baru (_multi_kartu_stock) dulu
  if (profileData && profileData._multi_kartu_stock && Object.keys(profileData._multi_kartu_stock).length > 0) {
    try {
      // Deep copy wajib — agar tiap card/kategori benar-benar independen
      multiKartuStock = JSON.parse(JSON.stringify(profileData._multi_kartu_stock));
      const key = 'oas_mks_' + (currentCompany ? currentCompany.id : 'guest');
      localStorage.setItem(key, JSON.stringify(multiKartuStock));
    } catch(e) {}
  } else if (profileData && profileData._kartu_stock) {
    // Format lama (flat) — akan di-migrate oleh initMultiKartuStock
    kartuStockData = {
      fifo: profileData._kartu_stock.fifo || [],
      lifo: profileData._kartu_stock.lifo || [],
      wa:   profileData._kartu_stock.wa   || [],
      mwa:  profileData._kartu_stock.mwa  || []
    };
  } else {
    // Fallback ke localStorage format baru dulu, lalu format lama
    try {
      const keyMks = 'oas_mks_' + (currentCompany ? currentCompany.id : 'guest');
      const storedMks = localStorage.getItem(keyMks);
      if (storedMks) {
        multiKartuStock = JSON.parse(storedMks);
      } else {
        const key = 'oas_kartu_stock_v1_' + (currentCompany ? currentCompany.id : 'guest');
        const stored = localStorage.getItem(key);
        if (stored) kartuStockData = JSON.parse(stored);
      }
    } catch(e) {}
  }
  // Rebuild id counter dari semua kategori
  let maxId = 0;
  Object.values(multiKartuStock || {}).forEach(card => {
    Object.values(card.kategori || {}).forEach(kat => {
      Object.values(kat.data || {}).forEach(arr => {
        (arr || []).forEach(e => { if((e.id||0) > maxId) maxId = e.id; });
      });
    });
  });
  // Fallback ke kartuStockData jika multiKartuStock belum ada
  for (const arr of Object.values(kartuStockData || {})) (arr||[]).forEach(e => { if((e.id||0) > maxId) maxId = e.id; });
  kartuStockIdCounter = maxId + 1;
  // Init multi kartu stock (migrate data lama jika perlu)
  if (typeof initMultiKartuStock === 'function') initMultiKartuStock();
  if (typeof renderKartuStock === 'function') renderKartuStock();
}

// ATTACHMENTS
async function saveAttachmentToSupabase(jurnalEntry, attachments) {
  if (!currentCompany || !jurnalEntry._id) return;
  await DB.table('jurnal_entries').update({ attachments }).eq('id', jurnalEntry._id);
}

// OVERRIDE saveToStorage — redirect ke Supabase

const _origSaveToStorage = saveToStorage;
window.saveToStorage = async function(showToast = true) {
  if (!currentCompany) {
    return _origSaveToStorage(showToast);
  }
  // Hanya tampilkan spinner jika belum ada spinner aktif
  const _overlay = document.getElementById('op-spinner-overlay');
  const _spinnerAlreadyActive = _overlay && _overlay.classList.contains('active');
  if (!_spinnerAlreadyActive) {
    showOpSpinner('Menyimpan data...', 'Mengunggah ke cloud');
  }
  try {
    for (const j of jurnalEntries) {
      if (!j._id) {
        await saveJurnalToSupabase(j);
      }
    }
    await saveAkunsToSupabase();
    hasUnsavedChanges = false;
    lastSaveTime = new Date();
    updateSaveIndicator('saved');
    if (showToast) showAutoSaveToast('☁️ Tersimpan ke cloud!', false);
    else showAutoSaveToast('☁️ Auto-saved', true);
    if (!_spinnerAlreadyActive) hideOpSpinner();
    return true;
  } catch(e) {
    if (!_spinnerAlreadyActive) hideOpSpinner();
    updateSaveIndicator('error');
    console.error('Supabase save error:', e);
    return false;
  }
}

// OVERRIDE addJurnal — auto save ke Supabase + audit hook

const _origAddJurnal = addJurnal;
function addJurnal(entry) {
  entry.no = 'JRN-' + String(jurnalCounter++).padStart(3,'0');
  jurnalEntries.push(entry);
  if (currentCompany) {
    saveJurnalToSupabase(entry).catch(e => console.warn('Auto-save error:', e));
  }
  if(typeof markDirty === 'function') markDirty();
  // Audit log
  try {
    const total=(entry.lines||[]).reduce((s,l)=>s+(l.debit||0),0);
    if(typeof auditLog==='function') auditLog('create','jurnal',
      `Jurnal ${entry.jenis||'Manual'}: ${entry.ket||entry.keterangan||'—'} — ${fmtRp(total)}`,
      {ref:entry.no||entry.id,debit:total});
  } catch(e){}
}

// OVERRIDE manualSave — pastikan async Supabase save berjalan benar

const _origManualSave = manualSave;
window.manualSave = async function() {
  if (!currentCompany || window.isGuestMode) {
    // Guest/local mode: reset spinner depth dulu agar tidak stuck, lalu show & hide
    if (typeof _opSpinnerDepth !== 'undefined') window._opSpinnerDepth = 0;
    showOpSpinner('Menyimpan...', 'Menyimpan ke penyimpanan lokal');
    _origManualSave();
    setTimeout(function() {
      if (typeof _opSpinnerDepth !== 'undefined') window._opSpinnerDepth = 1; // pastikan 1 agar hideOpSpinner bisa turun ke 0
      hideOpSpinner();
    }, 500);
    return;
  }
  showOpSpinner('Menyimpan ke cloud...', 'Mohon tunggu sebentar');
  updateSaveIndicator('saving');
  try {
    await saveToStorage(false);
    hideOpSpinner();
    updateSaveIndicator('saved');
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Data berhasil disimpan ke cloud!');
    if(typeof renderStorageSlots === 'function') renderStorageSlots();
  } catch(e) {
    hideOpSpinner();
    updateSaveIndicator('error');
    showAlert('❌ Gagal menyimpan: ' + (e.message || e));
  }
};

// OVERRIDE saveProfil — juga save ke Supabase
(function() {
  var _origSaveProfil = saveProfil;
  window.saveProfil = function() {
    _origSaveProfil();
    if (currentCompany) {
      const p = JSON.parse(localStorage.getItem('oas_profil_v1') || '{}');
      saveProfilToSupabase(p);
    }
  };
})();

// OVERRIDE handleAttachFile — save attachment ke Supabase

const _origHandleAttachFile = handleAttachFile;
function handleAttachFile(input) {
  const idx = parseInt(document.getElementById('attach-jurnal-idx').value);
  const j = jurnalEntries[idx];
  if (!j || !input.files.length) return;
  const file = input.files[0];
  if (file.size > 5 * 1024 * 1024) { showAlert('❌ File terlalu besar (max 5MB)'); return; }
  const reader = new FileReader();
  reader.onload = async (e) => {
    if (!j.attachments) j.attachments = [];
    j.attachments.push({
      name: file.name, type: file.type,
      size: (file.size/1024).toFixed(1) + ' KB',
      date: new Date().toLocaleDateString('id-ID'),
      data: e.target.result
    });
    // Save ke localStorage untuk backward compat
    const allAttach = getAttachments();
    allAttach[j.no] = j.attachments;
    localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify(allAttach));
    // Save ke Supabase
    if (currentCompany && j._id) {
      await saveAttachmentToSupabase(j, j.attachments);
    }
    renderAttachList(j.no);
    renderJurnalUmum();
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lampiran berhasil ditambahkan!');
  };
  reader.readAsDataURL(file);
  input.value = '';
}

// SUPABASE SCHEMA HELPER — tampilkan SQL yang perlu dijalankan

async function diagnosSupabase() {
  let result = '🔍 Diagnosa Supabase:\n\n';
  try {
    // 1. Cek session
    const { data: { session }, error: sessErr } = await DB.auth.getSession();
    result += session ? `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Session aktif (${session.user?.email})\n` : `❌ Tidak ada session\n`;
    if (sessErr) result += `<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Session error: ${sessErr.message}\n`;

    // 2. Cek tabel companies
    const { data, error } = await DB.table('companies').select('count').limit(1);
    if (error) {
      if (error.message.includes('relation') || error.message.includes('does not exist') || error.code === '42P01') {
        result += `❌ Tabel "companies" BELUM DIBUAT\n   → Jalankan SQL schema di Supabase Dashboard\n`;
      } else if (error.code === '42501' || error.message.includes('permission') || error.message.includes('policy')) {
        result += `❌ RLS Policy BELUM DIBUAT\n   → Tambahkan policy di Supabase Dashboard\n`;
      } else {
        result += `❌ Error tabel: ${error.message} (code: ${error.code})\n`;
      }
    } else {
      result += `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tabel "companies" ada dan bisa diakses\n`;
    }
  } catch(e) {
    result += `❌ Exception: ${e.message}\n`;
  }

  result += `\nURL: ${SUPABASE_URL}\n`;
  result += `\nJika ada ❌, buka <i class="ti ti-settings ti-inline"></i> Setup Supabase untuk panduan lengkap.`;
  showAlert(result);
}

function showSupabaseSetup() {
  const sql = `-- Jalankan SQL ini di Supabase SQL Editor:

-- 1. Tabel companies
CREATE TABLE companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text DEFAULT 'umum',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own companies"
  ON companies FOR ALL USING (auth.uid() = user_id);

-- 2. Tabel jurnal_entries
CREATE TABLE jurnal_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  no text NOT NULL,
  tanggal date,
  ket text,
  jenis text,
  lines jsonb DEFAULT '[]',
  attachments jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE jurnal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own jurnal"
  ON jurnal_entries FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- 3. Tabel akuns
CREATE TABLE akuns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  kode text NOT NULL,
  nama text,
  tipe text,
  normal text,
  UNIQUE(company_id, kode)
);
ALTER TABLE akuns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own akuns"
  ON akuns FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- 4. Tabel company_profiles
CREATE TABLE company_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  data jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profiles"
  ON company_profiles FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));`;

  const w = window.open('', '_blank');
  w.document.write('<!DOCTYPE html><html><head><title>Supabase Setup SQL<\/title>'
    + '<style>body{font-family:monospace;background:#0d0f14;color:#e2e8f0;padding:24px;margin:0;}'
    + 'pre{background:#141720;border:1px solid #252a3a;border-radius:10px;padding:20px;white-space:pre-wrap;font-size:13px;line-height:1.6;}'
    + 'h2{color:#4ade80;margin-bottom:16px;}'
    + 'p{color:#64748b;margin-bottom:16px;font-family:sans-serif;font-size:14px;}'
    + 'button{background:#4ade80;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;color:#0d0f14;}'
    + '<\/style><\/head><body>'
    + '<h2>⚙️ Setup Supabase untuk OAS<\/h2>'
    + '<p>1. Buat project baru di <a href="https://supabase.com" style="color:#22d3ee">supabase.com<\/a><br>'
    + '2. Pergi ke SQL Editor → New Query<br>'
    + '3. Copy-paste SQL di bawah ini dan klik RUN<br>'
    + '4. Copy URL &amp; Anon Key dari Settings → API → paste ke file HTML (cari SUPABASE_URL dan SUPABASE_ANON_KEY)<\/p>'
    + '<button onclick="navigator.clipboard.writeText(document.querySelector(\'pre\').textContent)">Copy SQL<\/button>'
    + '<pre>' + sql + '<\/pre>'
    + '<\/body><\/html>');
  w.document.close();
}
