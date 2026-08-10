
function _getCurrentActorLabel() {
  if (typeof currentUser !== 'undefined' && currentUser?.email) {
    return currentUser.user_metadata?.full_name
        || currentUser.user_metadata?.name
        || currentUser.email;
  }
  if (typeof isGuestMode !== 'undefined' && isGuestMode) return 'Guest (Lokal)';
  return 'Pengguna';
}

// ── Core logger ───────────────────────────────────────────────────────────
function auditLog(action, category, description, meta = {}) {
  try {
    const logs      = auditGetAll();
    const who       = _getCurrentActorLabel();
    const role      = _getActorRole();
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

// ── Render ────────────────────────────────────────────────────────────────
function renderAuditTrail() {
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
    // Badge nama bisnis — tampilkan jika ada dan filter bukan per-bisnis tunggal
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
          <span class="at-trail-who"><i class="ti ti-user" style="font-size:10px;vertical-align:-1px;margin-right:3px;"></i>${e.who||'—'}</span>
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

// Render bar filter per bisnis — auto-generate dari log yang ada
function _renderAuditBizBar(logs) {
  // Pill tab bisnis digantikan oleh tombol opt-picker audit-biz-btn
  // Fungsi ini dikosongkan — logika show/hide ditangani oleh override di akhir file
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
  const kpis = [
    { label:'Total Log',        val:logs.length.toLocaleString('id-ID'), icon:'shield-check',   clr:'var(--accent2)' },
    { label:'Hari Ini',         val:todayLogs.length,                    icon:'calendar-today', clr:'var(--accent)'  },
    { label:'Aksi Hapus',       val:logs.filter(e=>e.action==='delete').length, icon:'trash',   clr:'var(--red)'     },
    { label:'Oleh Owner',       val:ownerCount,                           icon:'crown',          clr:'#facc15'        },
    { label:'Oleh Tim',         val:memberCount,                          icon:'users',          clr:'var(--accent3)' },
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
    `<span class="at-trail-diff-old">${o??'—'}</span> → <span class="at-trail-diff-new">${n??'—'}</span></div>`
  ).join('');
  return `<div class="at-trail-diff">${rows}</div>`;
}

// ── Role filter toggle (label role badges) ────────────────────────────────
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

// ── Filter & pagination ───────────────────────────────────────────────────
function auditSetFilter(f) {
  _auditFilter=f; _auditPage=0;
  document.querySelectorAll('.at-trail-filter-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('audit-f-'+f)?.classList.add('active');
  renderAuditTrail();
}
function auditLoadMore() { _auditPage++; renderAuditTrail(); }

// ── Export CSV ────────────────────────────────────────────────────────────
function auditExportCSV() {
  const logs=auditGetAll();
  if(!logs.length){showAlert('Belum ada log audit.');return;}
  const header=['Waktu','Bisnis','Aksi','Kategori','Deskripsi','Oleh','Role','Referensi'];
  const rows=logs.map(e=>[
    new Date(e.ts).toLocaleString('id-ID'),
    e.companyName||'',
    e.action,e.category,e.description,e.who||'',e.role||'',e.meta?.ref||''
  ].map(v=>`"${String(v).replace(/"/g,'""')}"`));
  const csv=[header,...rows].map(r=>r.join(',')).join('\n');
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8;'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download=`audit-trail-${new Date().toISOString().slice(0,10)}.csv`;
  a.click();URL.revokeObjectURL(url);
  auditLog('export','system',`Export audit trail CSV — ${logs.length} entri`);
}

// ── Clear old >90 days ────────────────────────────────────────────────────
function auditClearOld() {
  const cutoff=new Date(Date.now()-90*24*3600*1000).toISOString();
  const logs=auditGetAll(),before=logs.length;
  const fresh=logs.filter(e=>e.ts>=cutoff);
  localStorage.setItem(AUDIT_KEY,JSON.stringify(fresh));
  const removed=before-fresh.length;
  auditLog('info','system',`Membersihkan ${removed} log audit lama (>90 hari)`);
  renderAuditTrail();
  showAlert(`${removed} log lama dihapus.`);
}

// ── Init page ─────────────────────────────────────────────────────────────
function initAuditPage() {
  _auditPage=0;_auditFilter='all';_auditRoleFilter=null;_auditBizFilter=null;
  document.querySelectorAll('.at-trail-filter-btn').forEach(b=>b.classList.remove('active'));
  document.getElementById('audit-f-all')?.classList.add('active');
  document.querySelectorAll('.at-role-filter-badge').forEach(b=>{b.style.opacity='1';b.style.boxShadow='';b.style.transform='';});
  const s=document.getElementById('audit-search');if(s)s.value='';
  renderAuditTrail();
}

// ── Login/logout helpers ──────────────────────────────────────────────────
function auditLogLogin(email) {
  // Tunggu hingga currentCompany terisi (maks 5 detik) agar role & companyId akurat
  const MAX_WAIT = 5000, INTERVAL = 200;
  let elapsed = 0;
  const tryLog = () => {
    const companyReady = typeof currentCompany !== 'undefined' && currentCompany?.id;
    if (companyReady || elapsed >= MAX_WAIT) {
      auditLog('login','system',`Login: ${email} — sesi dimulai`,{ref:email});
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
  if (!currentCompany || !_supa) return [];
  try {
    const { data, error } = await DB.table('org_members').select('*').eq('company_id', currentCompany.id);
    if (error) { console.error('loadOrgMembers:', error); return []; }
    _orgMembers = data || [];
    const me = _orgMembers.find(m => m.user_id === currentUser?.id);
    _currentMemberRole = me?.role || (currentCompany?.user_id === currentUser?.id ? 'admin' : 'member');
    return _orgMembers;
  } catch(e) { console.error('loadOrgMembers:', e); return []; }
}

function isAdmin() {
  return _currentMemberRole === 'admin' || currentCompany?.user_id === currentUser?.id;
}

function hasPerm(mod, act) {
  if (isAdmin()) return true;
  const me = _orgMembers.find(m => m.user_id === currentUser?.id);
  if (!me) return false;
  const p = me.permissions || {};
  return p[mod]?.[act] !== false;
}

function enforcePermissions() {
  if (isAdmin()) return;
  Object.keys(MODULES_CRUD).forEach(mod => {
    // Sembunyikan nav card di sidebar
    const navEl = document.querySelector(`[data-page="${mod}"]`);
    if (navEl) navEl.style.display = hasPerm(mod, 'read') ? '' : 'none';
    // Sembunyikan tombol Aksi Cepat di dashboard (onclick="showPage('mod')")
    document.querySelectorAll(`.quick-action-btn[onclick*="showPage('${mod}')"]`).forEach(btn => {
      btn.style.display = hasPerm(mod, 'read') ? '' : 'none';
    });
  });
  // Sembunyikan tombol reset
  const resetBtn = document.querySelector('[onclick*="resetData"]');
  if (resetBtn && !hasPerm('reset', 'delete')) resetBtn.style.display = 'none';
  // Sembunyikan tombol create/edit/delete di halaman jika tidak punya akses
  const currentMod = typeof currentPage !== 'undefined' ? currentPage : null;
  if (currentMod) {
    const addBtns = document.querySelectorAll('.btn-tambah, [data-action="create"], .btn-primary[onclick*="baru"], .btn-primary[onclick*="tambah"]');
    addBtns.forEach(btn => { btn.style.display = hasPerm(currentMod, 'create') ? '' : 'none'; });
    const editBtns = document.querySelectorAll('[data-action="edit"], .btn-edit');
    editBtns.forEach(btn => { btn.style.display = hasPerm(currentMod, 'update') ? '' : 'none'; });
    const delBtns = document.querySelectorAll('[data-action="delete"], .btn-delete, .btn-hapus');
    delBtns.forEach(btn => { btn.style.display = hasPerm(currentMod, 'delete') ? '' : 'none'; });
  }
}

// ── Share Link / Join Code ──────────────────────────────────
/** Generate atau ambil join code untuk company saat ini */
async function getOrCreateJoinCode() {
  if (!currentCompany || !_supa) return null;
  // Cek apakah sudah ada
  const { data: existing } = await DB.table('company_join_codes')
    .select('code,expires_at').eq('company_id', currentCompany.id).single();
  if (existing && new Date(existing.expires_at) > new Date()) return existing.code;
  // Buat baru — 8 karakter uppercase alphanumeric
  const code = Math.random().toString(36).substring(2,6).toUpperCase() +
               Math.random().toString(36).substring(2,6).toUpperCase();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 hari
  await DB.table('company_join_codes').upsert({
    company_id: currentCompany.id, code,
    created_by: currentUser?.id, expires_at: expires
  }, { onConflict: 'company_id' });
  return code;
}

async function showJoinCodeModal() {
  if (!isAdmin()) { showAlert('Hanya admin yang bisa melihat join code.'); return; }
  const btn = document.getElementById('btn-show-joincode');
  if (btn) { btn.disabled = true; btn.textContent = 'Memuat...'; }
  try {
    const code = await getOrCreateJoinCode();
    const joinLink = `${location.origin}${location.pathname}?join=${code}`;
    document.getElementById('joincode-display').textContent = code || '—';
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
  navigator.clipboard.writeText(val).then(() => showAlert('✓ Link berhasil disalin!')).catch(() => {
    document.getElementById('joincode-link').select();
    document.execCommand('copy');
    showAlert('✓ Link disalin!');
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
    showAlert('🔗 Link undangan terdeteksi!\n\nSilakan login terlebih dahulu untuk bergabung ke bisnis ini.');
    setTimeout(() => showAuthModal?.(), 400);
    return;
  }
  await _processJoinCode(code);
}

/** Proses join code setelah user dipastikan sudah login */
async function _processJoinCode(code) {
  if (!code || !currentUser) return;
  // Hapus dari sessionStorage
  sessionStorage.removeItem('oas_pending_join');
  try {
    const { data: jc, error: jcErr } = await _supa
      .from('company_join_codes').select('*').eq('code', code).single();
    if (jcErr || !jc) throw new Error('Kode undangan tidak valid atau sudah kadaluarsa.');
    if (new Date(jc.expires_at) < new Date()) throw new Error('Kode undangan sudah kadaluarsa (berlaku 7 hari). Minta admin untuk memperbarui kode.');
    // Ambil info company
    const { data: co } = await DB.table('companies').select('*').eq('id', jc.company_id).single();
    if (!co) throw new Error('Bisnis tidak ditemukan.');
    // Cek apakah sudah member atau owner
    if (co.user_id === currentUser.id) { showAlert(`ℹ Kamu adalah pemilik bisnis "${co.name}".`); return; }
    const { data: existing } = await DB.table('org_members').select('id')
      .eq('company_id', jc.company_id).eq('email', currentUser.email).maybeSingle();
    if (existing) {
      showAlert(`ℹ Kamu sudah terdaftar di bisnis "${co.name}".\n\nPilih bisnis tersebut dari daftar bisnis kamu.`);
      return;
    }
    // Konfirmasi join
    if (!confirm(`✅ Bergabung ke bisnis "${co.name}"?\n\nKamu akan ditambahkan sebagai Member. Admin bisa mengubah izin akses kamu.`)) return;
    const { error: insertErr } = await DB.table('org_members').insert({
      company_id: jc.company_id,
      user_id: currentUser.id,
      email: currentUser.email,
      nama: currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || currentUser.email,
      role: 'member',
      permissions: makeDefaultPerms(false),
      status: 'active',
      created_at: new Date().toISOString()
    });
    if (insertErr) { showAlert('Gagal bergabung: ' + insertErr.message); return; }
    showAlert(`✅ Berhasil bergabung ke bisnis "${co.name}"!\n\nKlik tombol bisnis di pojok kiri atas untuk memilih bisnis tersebut.`);
    // Refresh company list agar bisnis baru muncul
    const companies = await getMyCompanies();
    const newCo = companies.find(c => c.id === jc.company_id);
    if (newCo && !currentCompany) {
      await selectCompany(newCo);
      updateUserChip?.();
    }
  } catch(e) {
    console.error('_processJoinCode error:', e);
    showAlert('Error saat bergabung: ' + e.message);
  }
}

// ── Modal User Management ─────────────────────────────────────
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
      : `<span style="padding:2px 8px;border-radius:5px;font-size:10px;font-weight:700;background:rgba(34,211,238,0.1);color:var(--accent2);">Member</span>`;
    return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px;margin-bottom:10px;">
      <div style="display:flex;align-items:flex-start;gap:10px;">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--accent)22;border:1px solid var(--accent)44;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;color:var(--accent);flex-shrink:0;">
          ${(m.nama||m.email||'?').charAt(0).toUpperCase()}
        </div>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px;">
            <span style="font-weight:600;font-size:14px;">${m.nama||'—'}</span>
            ${roleBadge}
            ${isMe?'<span style="font-size:10px;color:var(--accent);background:rgba(74,222,128,0.1);padding:2px 6px;border-radius:4px;font-weight:600;">Saya</span>':''}
          </div>
          <div style="font-size:11px;color:var(--muted);">${m.email||'—'}${m.nik?' · NIK: '+m.nik:''}${m.jabatan?' · '+m.jabatan:''}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:2px;"><i class="ti ti-shield-check" style="font-size:11px;width:11px;height:11px;vertical-align:-1px;"></i> ${activeCount}/${modCount} modul · Status: <span style="color:${m.status==='active'?'var(--accent)':'var(--accent3)'}">${m.status==='active'?'Aktif':'Pending'}</span></div>
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
  showAlert(`✓ "${nama}" dihapus dari tim.`);
  renderUserMgmtList();
}

// ── Invite / Edit Member dengan CRUD Permissions ─────────────

function openInviteModal() {
  if (!isAdmin()) return;
  document.getElementById('invite-email').value = '';
  document.getElementById('invite-nama').value = '';
  document.getElementById('invite-nik').value = '';
  document.getElementById('invite-jabatan').value = '';
  document.getElementById('invite-role').value = 'member';
  renderPermTable('perm-table-invite', makeDefaultPerms(false));
  // Upgrade role select ke opt-picker dengan icon SVG
  const invRole = document.getElementById('invite-role');
  if (invRole) {
    delete invRole.dataset.upgraded;
    upgradeSelectToOptPicker(invRole, {
      title: '<i class="ti ti-shield-check" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Pilih Role',
      iconMap: {
        member: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent2)"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        admin:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent3)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>'
      },
      subMap: {
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
    showAlert(`✓ Anggota "${nama||email}" ditambahkan!\n\nMinta mereka buka link join code untuk bergabung.`);
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
  renderPermTable('perm-table-edit', m.permissions || makeDefaultPerms(false));
  // Upgrade role select ke opt-picker dengan icon SVG
  const editRole = document.getElementById('edit-member-role');
  if (editRole) {
    delete editRole.dataset.upgraded;
    upgradeSelectToOptPicker(editRole, {
      title: '<i class="ti ti-shield-check" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Pilih Role',
      iconMap: {
        member: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent2)"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        admin:  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent3)"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>'
      },
      subMap: {
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
  showAlert('✓ Data anggota berhasil diperbarui!');
  closeModal('modal-edit-member');
  renderUserMgmtList();
  enforcePermissions();
}

// ── Permission Table (CRUD per Modul) ─────────────────────────

/** Render tabel permission CRUD ke dalam container */
function renderPermTable(containerId, perms) {
  const container = document.getElementById(containerId);
  if (!container) return;
  const p = perms || makeDefaultPerms(false);
  let html = `<table style="width:100%;border-collapse:collapse;font-size:12px;">
    <thead>
      <tr style="border-bottom:1px solid var(--border);">
        <th style="text-align:left;padding:6px 8px;color:var(--muted);font-weight:600;">Modul</th>
        ${CRUD_ACTIONS.map(a => `<th style="text-align:center;padding:6px 4px;color:var(--muted);font-weight:600;min-width:44px;">${CRUD_LABELS[a]}</th>`).join('')}
        <th style="text-align:center;padding:6px 4px;color:var(--muted);font-weight:600;">Semua</th>
      </tr>
    </thead>
    <tbody>`;
  Object.entries(MODULES_CRUD).forEach(([mod, info]) => {
    const isDanger = info.danger;
    html += `<tr style="border-bottom:1px solid var(--border);${isDanger?'background:rgba(239,68,68,0.04);':''}">
      <td style="padding:7px 8px;">
        <div style="display:flex;align-items:center;gap:6px;">
          <i class="ti ${info.icon}" style="font-size:13px;width:13px;height:13px;color:${isDanger?'var(--red)':'var(--muted)'};flex-shrink:0;"></i>
          <span style="color:${isDanger?'var(--red)':'var(--text)'};">${info.label}</span>
        </div>
      </td>
      ${CRUD_ACTIONS.map(act => {
        const checked = p[mod]?.[act] !== false;
        return `<td style="text-align:center;padding:4px;">
          <input type="checkbox" data-mod="${mod}" data-act="${act}" class="perm-cb-${containerId}" ${checked?'checked':''}
            onchange="syncRowAll('${containerId}','${mod}')"
            style="width:15px;height:15px;accent-color:${isDanger?'var(--red)':'var(--accent)'};cursor:pointer;">
        </td>`;
      }).join('')}
      <td style="text-align:center;padding:4px;">
        <input type="checkbox" data-mod="${mod}" data-act="all" class="perm-cb-${containerId}"
          ${CRUD_ACTIONS.every(a => p[mod]?.[a] !== false) ? 'checked' : ''}
          onchange="toggleRowAll('${containerId}','${mod}',this.checked)"
          style="width:15px;height:15px;accent-color:var(--accent2);cursor:pointer;">
      </td>
    </tr>`;
  });
  html += '</tbody></table>';
  container.innerHTML = html;
}

/** Toggle semua CRUD di satu modul */
function toggleRowAll(containerId, mod, checked) {
  document.querySelectorAll(`.perm-cb-${containerId}[data-mod="${mod}"][data-act!="all"]`).forEach(cb => cb.checked = checked);
}

/** Sync checkbox "Semua" setelah individual diubah */
function syncRowAll(containerId, mod) {
  const cbs = Array.from(document.querySelectorAll(`.perm-cb-${containerId}[data-mod="${mod}"][data-act!="all"]`));
  const allChecked = cbs.every(cb => cb.checked);
  const allCb = document.querySelector(`.perm-cb-${containerId}[data-mod="${mod}"][data-act="all"]`);
  if (allCb) allCb.checked = allChecked;
}

/** Baca nilai dari tabel permission */
function readPermTableValues(containerId) {
  const perms = {};
  Object.keys(MODULES_CRUD).forEach(mod => {
    perms[mod] = {};
    CRUD_ACTIONS.forEach(act => {
      const cb = document.querySelector(`.perm-cb-${containerId}[data-mod="${mod}"][data-act="${act}"]`);
      perms[mod][act] = cb ? cb.checked : true;
    });
  });
  return perms;
}

// Hook afterLogin — jalankan join code check + load org members
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

// Cek join code di URL — HANYA jika ada ?join= parameter
if (new URLSearchParams(location.search).has('join')) {
  checkJoinCodeInURL();
}

// ══════════════════════════════════════════════════════════════
// DETEKSI JURNAL PENYESUAIAN OTOMATIS — FIXED
// ══════════════════════════════════════════════════════════════
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
// ══════════════════════════════════════════════════════════
// PRIORITAS 1 — MASTER PRODUK
// ══════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════
// MASTER PRODUK — Deteksi otomatis dari Kartu Stock Persediaan
// ══════════════════════════════════════════════════════════

/**
 * Hitung saldo & layer HPP dari satu kartu stock berdasarkan metode aktif.
 * Return: { metode, totalQty, totalNilai, hppRata, layers:[{qty,harga}] }
 */
function getKsSaldo(ks, _depth) {
  // Support dua format:
  // 1. Kategori: { data:{fifo,lifo,wa,mwa} }
  // 2. Card lama (legacy): { data:{fifo,lifo,wa,mwa} }
  // 3. Card baru: { kategori:{} } → aggregate semua kategori
  const _empty = { metode:'fifo', totalQty:0, totalNilai:0, hppRata:0, hppNext:0, layers:[], allMetodeWithSaldo:[] };
  if (!ks) return _empty;
  if (ks.kategori && !ks.data) {
    // Card baru — aggregate semua kategori TANPA rekursi (inline loop)
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

// ══════════════════════════════════════════════════════════════════════
// AUDIT FILTER — Kategori & Aktivitas pickers pakai openOptPicker()
// ══════════════════════════════════════════════════════════════════════

// State filter kategori (halaman/fitur dari sidebar)
let _auditCatFilter = '__all__'; // '__all__' = semua kategori

// ── Definisi opsi kategori — mirror sidebar dengan icon Tabler ─────────────
const _AUDIT_KAT_OPTS = [
  { value:'__all__',        label:'Semua Kategori',    sub:'Tampilkan semua halaman & fitur',       icon:'<i class="ti ti-layout-grid" style="font-size:16px;"></i>' },
  // Utama
  { value:'transaksi',      label:'Transaksi',         sub:'Input transaksi cepat',                 icon:'<i class="ti ti-circle-plus" style="font-size:16px;"></i>' },
  // Jurnal — per jenis masing-masing
  { value:'jurnal-umum',    label:'Jurnal Umum',       sub:'Entry manual & jurnal penyesuaian',     icon:'<i class="ti ti-book" style="font-size:16px;"></i>' },
  { value:'jurnal-kas',     label:'Jurnal Kas',        sub:'Transaksi kas masuk & keluar',          icon:'<i class="ti ti-cash" style="font-size:16px;"></i>' },
  { value:'jurnal-jual',    label:'Jurnal Penjualan',  sub:'Transaksi penjualan',                   icon:'<i class="ti ti-receipt" style="font-size:16px;"></i>' },
  { value:'jurnal-beli',    label:'Jurnal Pembelian',  sub:'Transaksi pembelian',                   icon:'<i class="ti ti-shopping-cart" style="font-size:16px;"></i>' },
  // Laporan — masing-masing halaman laporan
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

// Mapping: filter value → {category, jenisMatch?, refMatch?}
// jenisMatch: filter berdasarkan meta.jenis (untuk jurnal per jenis)
// refMatch: filter berdasarkan meta.ref atau description mengandung string
// catMatch: filter berdasarkan e.category
// ── Mapping kategori → fungsi filter entry ────────────────────────────────
// Setiap kategori mendefinisikan fn(entry) → boolean
// Sehingga setiap log (navigasi, jurnal, laporan, dll) yang relevan tetap muncul
const _AUDIT_KAT_FN = {
  '__all__': null,

  // Transaksi — semua jurnal dari input transaksi cepat (jenis apapun) + navigasi ke halaman transaksi
  'transaksi': e =>
    (e.category === 'jurnal') ||
    (e.category === 'navigasi' && e.meta?.ref === 'transaksi'),

  // Jurnal per jenis — jurnal dengan jenis cocok + navigasi ke halaman jurnal tersebut
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

  // Laporan — aktivitas filter/view di halaman laporan + navigasi ke halaman tersebut
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

  // Master — aktivitas CRUD + navigasi ke halaman
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

  // Kalkulator — semua kalkulator + navigasi ke kalkulator
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
  // — hanya muncul saat filter '__all__' (semua kategori)
};

// ── Filter kategori pada renderAuditTrail ─────────────────────────────────
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

// ── Opsi aktivitas dengan icon ─────────────────────────────────────────────
const _AUDIT_AKT_OPTS = [
  { value:'all',    label:'Semua Aktivitas', sub:'Tampilkan semua jenis aksi',             icon:'<i class="ti ti-list" style="font-size:16px;"></i>' },
  { value:'create', label:'Buat',            sub:'Tambah jurnal, akun, produk, dll',       icon:'<i class="ti ti-circle-plus" style="font-size:16px;"></i>' },
  { value:'delete', label:'Hapus',           sub:'Penghapusan data apapun',                icon:'<i class="ti ti-trash" style="font-size:16px;"></i>' },
  { value:'edit',   label:'Edit',            sub:'Perubahan & pembaruan data',             icon:'<i class="ti ti-pencil" style="font-size:16px;"></i>' },
  { value:'auto',   label:'Otomatis',        sub:'Penyusutan, jurnal otomatis',            icon:'<i class="ti ti-bolt" style="font-size:16px;"></i>' },
  { value:'export', label:'Export',          sub:'Export laporan & CSV',                  icon:'<i class="ti ti-upload" style="font-size:16px;"></i>' },
  { value:'login',  label:'Sesi',            sub:'Login & logout pengguna',               icon:'<i class="ti ti-lock" style="font-size:16px;"></i>' },
  { value:'info',   label:'Info & Filter',   sub:'Filter laporan, buka halaman, AI, dll', icon:'<i class="ti ti-info-circle" style="font-size:16px;"></i>' },
  { value:'reset',  label:'Reset',           sub:'Reset data — berbahaya',                icon:'<i class="ti ti-alert-triangle" style="font-size:16px;color:var(--red);"></i>' },
];

// ── Picker: Filter Kategori ────────────────────────────────────────────────
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

// ── Picker: Filter Aktivitas ───────────────────────────────────────────────
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

// ── Picker: Filter Bisnis (dari biz bar) ──────────────────────────────────
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

// ── Reset semua filter saat initAuditPage ─────────────────────────────────
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

// ── Show/hide tombol Filter Bisnis berdasarkan jumlah bisnis di log ────────
const _origRenderBizBar2 = window._renderAuditBizBar;
window._renderAuditBizBar = function(logs) {
  // Panggil original (yang render pill tab desktop) — kini tidak perlu render apa-apa
  _origRenderBizBar2?.call(this, logs);
  // Hitung dari raw logs (bukan filtered)
  const rawLogs = JSON.parse(localStorage.getItem('oas_audit_trail') || '[]');
  const bizIds = new Set(rawLogs.filter(e => e.companyId).map(e => e.companyId));
  const bizBtn = document.getElementById('audit-biz-btn');
  if (bizBtn) bizBtn.style.display = bizIds.size > 1 ? '' : 'none';
};


