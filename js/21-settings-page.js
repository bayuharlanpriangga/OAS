// ══════════════════════════════════════════════════════════════════
// SETTINGS PAGE — #page-settings (Akun & Transaksi) + Account Switcher
// ══════════════════════════════════════════════════════════════════

// ── Tab level 1: Akun / Transaksi ──
function switchSettingsTab(tab) {
  document.getElementById('settings-tab-akun')?.classList.toggle('active', tab === 'akun');
  document.getElementById('settings-tab-transaksi')?.classList.toggle('active', tab === 'transaksi');
  const pAkun  = document.getElementById('settings-panel-akun');
  const pTrans = document.getElementById('settings-panel-transaksi');
  if (pAkun)  pAkun.style.display  = (tab === 'akun') ? 'block' : 'none';
  if (pTrans) pTrans.style.display = (tab === 'transaksi') ? 'block' : 'none';
  if (tab === 'transaksi') renderSettingsTransaksi();
}

// ── Tab level 2 (dalam Transaksi): Penjualan / Pembelian ──
function switchSettingsTransTab(sub) {
  const scope = document.getElementById('settings-panel-transaksi');
  if (!scope) return;
  scope.querySelectorAll('.accs-tab').forEach(t => t.classList.remove('active'));
  scope.querySelectorAll('.accs-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('settings-transtab-' + sub)?.classList.add('active');
  document.getElementById('settings-transpanel-' + sub)?.classList.add('active');
}

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
// ACCOUNT SWITCHER — gaya Google/FB/IG, maks 5 akun tersimpan di device
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
    <div class="acc-switch-menuitem" onclick="openAccountSettings()"><i class="ti ti-user-cog" style="font-size:14px;vertical-align:-2px;margin-right:6px;"></i> Pengaturan Akun</div>
    <div class="acc-switch-divider"></div>
    ${rows}
    <div class="acc-switch-divider"></div>
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
