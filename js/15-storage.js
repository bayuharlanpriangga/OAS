
// STORAGE SYSTEM
// Storage keys — per bisnis agar data tidak bocor antar perusahaan
function getStorageKey()  { return 'oas_data_v2_'  + (window.currentCompany?.id || 'guest'); }
function getMetaKey()     { return 'oas_meta_v2_'  + (window.currentCompany?.id || 'guest'); }
// Legacy fallback key (single-company / guest)
const STORAGE_KEY_LEGACY  = 'oas_data_v2';
const META_KEY_LEGACY     = 'oas_meta_v2';
const STORAGE_SLOTS_KEY   = 'oas_slots_v2';
const AUTOSAVE_KEY        = 'oas_autosave_enabled';

let autoSaveEnabled = true;
let autoSaveTimer = null;
let hasUnsavedChanges = false;
let lastSaveTime = null;

// INIT STORAGE
function initStorage() {
  autoSaveEnabled = localStorage.getItem(AUTOSAVE_KEY) !== 'false';
  loadFromStorage();
  if(autoSaveEnabled) scheduleAutoSave();
  updateSaveIndicator('saved');

  // markDirty is called directly in addJurnal function below
}

function markDirty() {
  hasUnsavedChanges = true;
  updateSaveIndicator('unsaved');
  if(autoSaveEnabled) scheduleAutoSave();
}

function scheduleAutoSave() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    if(hasUnsavedChanges) {
      saveToStorage(false);
    }
  }, 3000); // Auto-save 3 seconds after last change
}

// SAVE TO LOCALSTORAGE
function saveToStorage(showToast = true) {
  try {
    const data = serializeData();
    localStorage.setItem(getStorageKey(), JSON.stringify(data));
    const meta = {
      lastSave: new Date().toISOString(),
      jurnalCount: jurnalEntries.length,
      akunCount: akuns.length,
      version: '2.0'
    };
    localStorage.setItem(getMetaKey(), JSON.stringify(meta));
    hasUnsavedChanges = false;
    lastSaveTime = new Date();
    updateSaveIndicator('saved');
    if(showToast) showAutoSaveToast('<i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Tersimpan!', false);
    else showAutoSaveToast('<i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Auto-saved', true);
    return true;
  } catch(e) {
    updateSaveIndicator('error');
    if(e.name === 'QuotaExceededError') {
      showAlert('❌ Storage penuh! Hapus beberapa data atau export backup dulu.');
    }
    return false;
  }
}

function manualSave() {
  saveToStorage(false);
  showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Data berhasil disimpan!');
  renderStorageSlots();
}

// LOAD FROM LOCALSTORAGE
function loadFromStorage() {
  try {
    // Coba key per-bisnis dulu, fallback ke key lama (legacy/guest)
    const raw = localStorage.getItem(getStorageKey()) || localStorage.getItem(STORAGE_KEY_LEGACY);
    if(!raw) return false;
    const data = JSON.parse(raw);
    if(data.jurnalEntries) {
      jurnalEntries = data.jurnalEntries;
      jurnalCounter = data.jurnalCounter || (jurnalEntries.length + 1);
      if(data.produkList) produkList = data.produkList;
      // MIGRATION: hapus jurnal perolehan aset lama (JRN_AT_*) yang menyebabkan
      // total aset negatif. Dashboard kini hitung aset tetap dari asetTetapList,
      // bukan dari CoA, sehingga jurnal Kr.Kas perolehan tidak lagi diperlukan.
      const _beforeCount = jurnalEntries.length;
      jurnalEntries = jurnalEntries.filter(j => !j.id?.startsWith('JRN_AT_'));
      if(jurnalEntries.length < _beforeCount) {
        console.info('[Migration] Hapus ' + (_beforeCount - jurnalEntries.length) + ' jurnal perolehan aset lama (JRN_AT_*)');
        setTimeout(() => saveToStorage(false), 600);
      }
    }
    if(data.akuns && data.akuns.length > 0) {
      akuns = data.akuns;
    }
    if(Array.isArray(data.akunsTrash)) akunsTrash = data.akunsTrash;
    if(data.transaksiAkunSettings) transaksiAkunSettings = { ...transaksiAkunSettings, ...data.transaksiAkunSettings };
    if(typeof data.periodeKunciSampai === 'string') periodeKunciSampai = data.periodeKunciSampai;
    if(typeof purgeExpiredAkunTrash === 'function') purgeExpiredAkunTrash();
    const meta = JSON.parse(localStorage.getItem(getMetaKey()) || localStorage.getItem(META_KEY_LEGACY) || '{}');
    lastSaveTime = meta.lastSave ? new Date(meta.lastSave) : null;
    renderDashboard();
    return true;
  } catch(e) {
    console.error('Load error:', e);
    return false;
  }
}

// SERIALIZE DATA
function serializeData() {
  return {
    version: '2.0',
    savedAt: new Date().toISOString(),
    jurnalEntries: jurnalEntries,
    jurnalCounter: jurnalCounter,
    akuns: akuns,
    akunsTrash: akunsTrash,
    transaksiAkunSettings: transaksiAkunSettings,
    periodeKunciSampai: periodeKunciSampai,
    produkList: produkList,
    appName: 'Bayu Harlan Priangga'
  };
}

// SLOT SAVES (5 SLOTS)
function getSlots() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_SLOTS_KEY) || '{}');
  } catch { return {}; }
}

function saveToSlot(slotId) {
  const slots = getSlots();
  const name = prompt(`Nama simpanan slot ${slotId}:`, slots[slotId]?.name || `Simpanan ${slotId}`);
  if(name === null) return;
  slots[slotId] = {
    name: name || `Simpanan ${slotId}`,
    savedAt: new Date().toISOString(),
    data: serializeData(),
    jurnalCount: jurnalEntries.length
  };
  localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(slots));
  renderStorageSlots();
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Data disimpan ke Slot ${slotId}: "${name}"`);
}

function loadFromSlot(slotId) {
  const slots = getSlots();
  const slot = slots[slotId];
  if(!slot) return;
  if(!confirm(`Muat data dari "${slot.name}"?\nData saat ini akan diganti.`)) return;
  try {
    if(slot.data.jurnalEntries) {
      jurnalEntries = slot.data.jurnalEntries;
      jurnalCounter = slot.data.jurnalCounter || jurnalEntries.length + 1;
    }
    if(slot.data.akuns && slot.data.akuns.length > 0) {
      akuns = slot.data.akuns;
    }
    if(Array.isArray(slot.data.akunsTrash)) akunsTrash = slot.data.akunsTrash;
    if(slot.data.transaksiAkunSettings) transaksiAkunSettings = { ...transaksiAkunSettings, ...slot.data.transaksiAkunSettings };
    if(typeof slot.data.periodeKunciSampai === 'string') periodeKunciSampai = slot.data.periodeKunciSampai;
    saveToStorage(false);
    renderDashboard();
    renderStorageSlots();
    closeModal('modal-storage');
    showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Data "${slot.name}" berhasil dimuat!`);
  } catch(e) {
    showAlert('❌ Gagal memuat: ' + e.message);
  }
}

function deleteSlot(slotId) {
  const slots = getSlots();
  if(!slots[slotId]) return;
  if(!confirm(`Hapus simpanan "${slots[slotId].name}"?`)) return;
  delete slots[slotId];
  localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(slots));
  renderStorageSlots();
  showAlert('<i class="ti ti-trash" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Slot dihapus');
}

function renderStorageSlots() {
  const container = document.getElementById('storage-slots');
  if(!container) return;
  const slots = getSlots();
  const meta = JSON.parse(localStorage.getItem(getMetaKey()) || localStorage.getItem(META_KEY_LEGACY) || '{}');
  let html = '';

  // Current (auto-save) slot
  const lastSaveStr = meta.lastSave
    ? new Date(meta.lastSave).toLocaleString('id-ID', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})
    : 'Belum pernah disimpan';
  html += `<div class="storage-slot active-slot">
    <span class="slot-icon"><i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i></span>
    <div class="slot-info">
      <div class="slot-name">Data Aktif (Auto-save)</div>
      <div class="slot-meta">Terakhir: ${lastSaveStr} · ${jurnalEntries.length} jurnal · ${akuns.length} akun</div>
    </div>
    <div class="slot-actions">
      <button class="slot-btn primary" onclick="manualSave();renderStorageSlots()"><i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Simpan</button>
    </div>
  </div>`;

  // 5 manual slots
  for(let i = 1; i <= 5; i++) {
    const slot = slots[i];
    if(slot) {
      const dt = new Date(slot.savedAt).toLocaleString('id-ID', {day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'});
      html += `<div class="storage-slot">
        <span class="slot-icon"><i class="ti ti-folder" style="font-size:22px;"></i></span>
        <div class="slot-info">
          <div class="slot-name">${escHtml(slot.name)}</div>
          <div class="slot-meta">Disimpan: ${dt} · ${slot.jurnalCount || 0} jurnal</div>
        </div>
        <div class="slot-actions">
          <button class="slot-btn primary" onclick="loadFromSlot(${i})"><i class="ti ti-folder-open" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Muat</button>
          <button class="slot-btn" onclick="saveToSlot(${i})"><i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i></button>
          <button class="slot-btn danger" onclick="deleteSlot(${i})"><i class="ti ti-trash" style="font-size:14px;"></i></button>
        </div>
      </div>`;
    } else {
      html += `<div class="storage-slot" style="opacity:0.5;">
        <span class="slot-icon"><i class="ti ti-folder-open" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i></span>
        <div class="slot-info">
          <div class="slot-name">Slot ${i} — Kosong</div>
          <div class="slot-meta">Klik untuk menyimpan data saat ini ke slot ini</div>
        </div>
        <div class="slot-actions">
          <button class="slot-btn primary" onclick="saveToSlot(${i})"><i class="ti ti-device-floppy" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Simpan di sini</button>
        </div>
      </div>`;
    }
  }
  container.innerHTML = html;

  // Update header info
  const statusEl = document.getElementById('storage-current-info');
  const lastEl = document.getElementById('storage-last-save');
  if(statusEl) statusEl.textContent = `${jurnalEntries.length} Jurnal · ${akuns.length} Akun · ${getSizeKB()} KB digunakan`;
  if(lastEl) lastEl.textContent = meta.lastSave ? 'Terakhir disimpan: ' + lastSaveStr : 'Belum ada simpanan otomatis';

  const toggleBtn = document.getElementById('autosave-toggle-btn');
  if(toggleBtn) toggleBtn.textContent = `⏱ Auto-save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
}

function escHtml(str) { return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

function getSizeKB() {
  const raw = localStorage.getItem(getStorageKey()) || '';
  return (new Blob([raw]).size / 1024).toFixed(1);
}

function openStorageModal() {
  renderStorageSlots();
  const resetBtn = document.getElementById('storage-reset-btn');
  if (resetBtn) {
    resetBtn.style.display = (typeof isAdmin === 'function' && !isAdmin()) ? 'none' : '';
  }
  document.getElementById('modal-storage').classList.add('open');
}

// AUTO-SAVE TOGGLE
function toggleAutoSave() {
  autoSaveEnabled = !autoSaveEnabled;
  localStorage.setItem(AUTOSAVE_KEY, autoSaveEnabled);
  const btn = document.getElementById('autosave-toggle-btn');
  if(btn) btn.textContent = `⏱ Auto-save: ${autoSaveEnabled ? 'ON' : 'OFF'}`;
  showAlert(autoSaveEnabled ? '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Auto-save diaktifkan' : '⏸ Auto-save dinonaktifkan');
  if(autoSaveEnabled && hasUnsavedChanges) scheduleAutoSave();
}

// SAVE INDICATOR
function updateSaveIndicator(state) {
  const dot = document.getElementById('save-dot');
  const txt = document.getElementById('save-text');
  if(!dot || !txt) return;
  if(state === 'saving') {
    dot.style.background = 'var(--accent3)'; dot.classList.add('saving-anim');
    txt.textContent = 'Menyimpan...'; txt.style.color = 'var(--accent3)';
  } else if(state === 'saved') {
    dot.style.background = 'var(--accent)'; dot.classList.remove('saving-anim');
    txt.textContent = 'Tersimpan'; txt.style.color = 'var(--accent)';
  } else if(state === 'unsaved') {
    dot.style.background = 'var(--accent3)'; dot.classList.remove('saving-anim');
    txt.textContent = '● Belum disimpan'; txt.style.color = 'var(--accent3)';
  } else if(state === 'error') {
    dot.style.background = 'var(--red)'; dot.classList.remove('saving-anim');
    txt.textContent = '✕ Error'; txt.style.color = 'var(--red)';
  }
}

// TOAST NOTIFICATION
let toastTimer;
function showAutoSaveToast(msg, subtle = true) {
  const toast = document.getElementById('autosave-toast');
  const msgEl = document.getElementById('autosave-toast-msg');
  if(!toast || !msgEl) return;
  if(subtle) { toast.style.opacity = '0'; return; } // silent for auto-saves, show on manual
  msgEl.innerHTML = msg;
  toast.style.transform = 'translateY(0)';
  toast.style.opacity = '1';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.style.transform = 'translateY(40px)';
    toast.style.opacity = '0';
  }, 2000);
}

// EXPORT/IMPORT JSON BACKUP
function exportBackupJSON() {
  const data = serializeData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  a.href = url;
  a.download = `BHP_Backup_${date}.oas`;
  a.click();
  URL.revokeObjectURL(url);
  showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Backup berhasil didownload! Simpan file .oas ini dengan aman.');
}

function importBackupJSON(input) {
  const file = input.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if(!data.jurnalEntries && !data.akuns) {
        showAlert('❌ File tidak valid atau bukan format BHP backup.'); return;
      }
      const jCount = data.jurnalEntries?.length || 0;
      const aCount = data.akuns?.length || 0;
      if(!confirm(`Import data dari file:\n• ${jCount} jurnal\n• ${aCount} akun\n\nData saat ini akan DIGANTI. Lanjutkan?`)) {
        input.value = ''; return;
      }
      if(data.jurnalEntries) {
        jurnalEntries = data.jurnalEntries;
        jurnalCounter = data.jurnalCounter || jurnalEntries.length + 1;
      }
      if(data.akuns && data.akuns.length > 0) akuns = data.akuns;
      if(Array.isArray(data.akunsTrash)) akunsTrash = data.akunsTrash;
      if(data.transaksiAkunSettings) transaksiAkunSettings = { ...transaksiAkunSettings, ...data.transaksiAkunSettings };
      if(typeof data.periodeKunciSampai === 'string') periodeKunciSampai = data.periodeKunciSampai;
      saveToStorage(false);
      renderDashboard();
      closeModal('modal-storage');
      showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Import berhasil! ${jCount} jurnal dan ${aCount} akun dimuat.`);
    } catch(err) {
      showAlert('❌ Gagal membaca file: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
}

// RESET DATA (task 1.5). Yang dihapus dipilih user lewat checkbox [data-reset] di
// #modal-reset-all: 'jurnal' + nama kind di CLOUD_RECORD_KINDS (22-cloud-records.js).
function resetPilihSemua(on) {
  document.querySelectorAll('#modal-reset-all input[data-reset]').forEach(c => { c.checked = !!on; });
}

async function doResetAll() {
  if (typeof isAdmin === 'function' && !isAdmin()) {
    showAlert('❌ Hanya Admin atau Pemilik bisnis yang memiliki izin untuk mereset data.');
    closeModal('modal-reset-all');
    return;
  }
  const input = document.getElementById('reset-confirm-input');
  const boxes = Array.from(document.querySelectorAll('#modal-reset-all input[data-reset]:checked'));
  if (!boxes.length) { showAlert('Pilih minimal satu jenis data yang mau dihapus.'); return; }
  if ((input?.value || '').trim().toUpperCase() !== 'RESET') {
    if (input) { input.style.borderColor = 'var(--red)'; setTimeout(() => { input.style.borderColor = 'var(--border)'; }, 1500); }
    return;
  }
  const label = {};
  boxes.forEach(c => { label[c.getAttribute('data-reset')] = c.getAttribute('data-label') || c.getAttribute('data-reset'); });
  const resetJurnal = 'jurnal' in label;
  const kinds = Object.keys(label).filter(k => k !== 'jurnal');
  closeModal('modal-reset-all');

  const gagal = []; // label data yang gagal dihapus di cloud
  showOpSpinner('Menghapus data terpilih...', 'Membersihkan cloud & lokal');
  try {
    if (resetJurnal) {
      let ok = true;
      if (typeof currentCompany !== 'undefined' && currentCompany && typeof _supa !== 'undefined' && _supa) {
        try {
          // Supabase mengembalikan { error }, bukan melempar: wajib dicek, kalau tidak
          // gagal hapus tampak sukses lalu jurnal muncul lagi setelah reload.
          const { error } = await DB.table('jurnal_entries').delete().eq('company_id', currentCompany.id);
          if (error) throw error;
        } catch (e) { ok = false; console.error('Reset jurnal Supabase error:', e); }
      }
      if (ok) {
        jurnalEntries = [];
        jurnalCounter = 1;
        // Semua jurnal sudah kosong, jadi kunci periode tidak punya arti lagi — lepas supaya
        // pembukuan baru bisa mulai dari nol.
        periodeKunciSampai = '';
        if (typeof savePeriodeKunciToCloud === 'function') { try { savePeriodeKunciToCloud(); } catch (e) {} }
      } else gagal.push(label.jurnal);
    }
    if (kinds.length) {
      // Counter penomoran ikut dihapus bersama Invoice, supaya nomor mulai lagi dari 001.
      const hapus = kinds.includes('invoice') ? kinds.concat('counter') : kinds;
      const failedKinds = await cloudDeleteRecords(hapus);
      failedKinds.forEach(k => { const l = label[k] || label.invoice; if (!gagal.includes(l)) gagal.push(l); });
    }
  } finally { hideOpSpinner(); }

  // Tulis ulang penyimpanan lokal dengan kondisi terbaru. Dulu key-nya dihapus, sehingga
  // Chart of Accounts dan pengaturan hilang dari cache lokal kalau halaman di-reload sebelum simpan berikutnya.
  saveToStorage(false);
  if (typeof saveFiturBaru === 'function') { try { saveFiturBaru(); } catch (e) {} }
  hasUnsavedChanges = false;
  updateSaveIndicator('saved');
  renderDashboard();
  renderJurnalUmum();
  ['renderInvoiceList', 'renderInvoiceKPI', 'renderKontak', 'renderKontakKPI', 'renderAsetTetap', 'renderAsetTetapKPI', 'renderProduk', 'renderJurnalBerulang']
    .forEach(fn => { try { if (typeof window[fn] === 'function') window[fn](); } catch (e) {} });

  const berhasil = Object.keys(label).map(k => label[k]).filter(l => !gagal.includes(l));
  const ico = '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ';
  if (!gagal.length) showAlert(ico + 'Data berhasil direset: ' + berhasil.join(', ') + '.');
  else showAlert('⚠️ Gagal menghapus dari cloud: <b>' + gagal.join(', ') + '</b>. Data itu masih ada; cek koneksi lalu coba lagi.' + (berhasil.length ? '<br>Berhasil direset: ' + berhasil.join(', ') + '.' : ''));
}

// markDirty is called directly inside addJurnal()

// WARN BEFORE UNLOAD
window.addEventListener('beforeunload', (e) => {
  if(hasUnsavedChanges) {
    saveToStorage(false); // try to save on exit
  }
});

// PAGE VISIBILITY: save when tab hidden
document.addEventListener('visibilitychange', () => {
  if(document.hidden && hasUnsavedChanges) {
    saveToStorage(false);
  }
});

// Catatan: sistem template akun (per jenis bisnis) sudah dihapus.
// Semua bisnis — baru maupun lewat onboarding — selalu memakai Chart of
// Akun lengkap dari getDefaultAkuns(); "jenis bisnis" kini murni label/
// kategori (lihat createCompany & obNext), tidak lagi memfilter akun.

// INIT — jalankan setelah DOM ready

// Override initStorage agar tidak crash sebelum auth selesai
const _origInitStorage = initStorage;
window.initStorage = function() {
  // Saat mode Supabase, tunggu auth dulu sebelum load
  // (akan dipanggil manual di enterGuestMode atau loadDataFromSupabase)
  autoSaveEnabled = localStorage.getItem(AUTOSAVE_KEY) !== 'false';
  updateSaveIndicator('saved');
}

// Jalankan Supabase init setelah semua script loaded
window.addEventListener('DOMContentLoaded', () => {
  // Cek apakah Supabase URL sudah dikonfigurasi
  if (SUPABASE_URL.includes('YOUR_PROJECT')) {
    // Mode demo — tampilkan banner setup
    setTimeout(() => {
      showDemoModeBanner();
    }, 2000);
    // Tetap jalankan app dengan localStorage
    _origInitStorage();
    loadProfilToSidebar();
    renderDashboard();
    checkShowOnboarding();
  } else {
    // Supabase configured — langsung init (guest mode aktif jika tidak ada session)
    initSupabase();
  }
});
