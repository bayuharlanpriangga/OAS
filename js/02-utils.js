
// addJurnal() versi lengkap ada di bawah (~baris 19546) — sudah termasuk
// sync ke Supabase + audit log. Duplikat lama di sini dihapus.

// FORMAT
function fmtRp(n) {
  if(!n) return 'Rp 0';
  return 'Rp ' + Number(n).toLocaleString('id-ID');
}
function fmtDate(d) {
  if(!d) return '-';
  const [y,m,day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${day} ${months[parseInt(m)-1]} ${y}`;
}

// HELPERS
function rpNum(n) { return Math.round(n)||0; }

function getAkunNama(kode) {
  return akuns.find(a=>a.kode===kode)?.nama || kode;
}

// Compute saldo per akun
function computeSaldoAll() {
  const map = {};
  jurnalEntries.forEach(j => j.lines.forEach(l => {
    if(!map[l.akun]) map[l.akun] = {debit:0,kredit:0};
    map[l.akun].debit += l.debit||0;
    map[l.akun].kredit += l.kredit||0;
  }));
  return map;
}

function computeSaldoBersih(kode) {
  const a = akuns.find(x=>x.kode===kode);
  if(!a) return 0;
  const map = computeSaldoAll();
  const s = map[kode] || {debit:0,kredit:0};
  return a.normal==='D' ? s.debit-s.kredit : s.kredit-s.debit;
}

function setVal(id, val) {
  const el = document.getElementById(id);
  if(el) { el.value = val; el.dispatchEvent(new Event('input')); }
}

function setSelectVal(id, val) {
  const el = document.getElementById(id);
  if(el) { el.value = val; el.dispatchEvent(new Event('change')); }
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── INFO ICON POPOVER (tombol ⓘ di sebelah judul field/header modal) ──
let _activeInfoPopover = null;
function toggleInfoPopover(btn, html) {
  const already = _activeInfoPopover && _activeInfoPopover._btn === btn;
  closeInfoPopover();
  if(already) return;
  const pop = document.createElement('div');
  pop.className = 'info-popover';
  pop.innerHTML = html;
  pop._btn = btn;
  document.body.appendChild(pop);
  _positionInfoPopover(pop, btn);
  _activeInfoPopover = pop;
  setTimeout(() => {
    document.addEventListener('click', _onDocClickCloseInfoPopover, true);
    window.addEventListener('scroll', closeInfoPopover, true);
    window.addEventListener('resize', closeInfoPopover, true);
  }, 0);
}
function closeInfoPopover() {
  if(!_activeInfoPopover) return;
  _activeInfoPopover.remove();
  _activeInfoPopover = null;
  document.removeEventListener('click', _onDocClickCloseInfoPopover, true);
  window.removeEventListener('scroll', closeInfoPopover, true);
  window.removeEventListener('resize', closeInfoPopover, true);
}
function _onDocClickCloseInfoPopover(e) {
  if(!_activeInfoPopover) return;
  const btn = _activeInfoPopover._btn;
  if(!_activeInfoPopover.contains(e.target) && e.target !== btn && !(btn && btn.contains(e.target))) {
    closeInfoPopover();
  }
}
function _positionInfoPopover(pop, btn) {
  const rect = btn.getBoundingClientRect();
  const popRect = pop.getBoundingClientRect();
  let left = rect.left + rect.width/2 - popRect.width/2;
  left = Math.max(8, Math.min(left, window.innerWidth - popRect.width - 8));
  let top = rect.bottom + 8;
  if(top + popRect.height > window.innerHeight - 8) top = rect.top - popRect.height - 8;
  pop.style.left = left + 'px';
  pop.style.top = top + 'px';
}

function emptyState(msg, desc){
  const descText = desc !== undefined ? desc : 'Tambah transaksi baru untuk memulai';
  return `<div class="empty-state"><div class="empty-icon"><svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" style="opacity:0.35"><rect x="4" y="8" width="28" height="20" rx="4" stroke="currentColor" stroke-width="2" fill="none"/><path d="M4 14h28" stroke="currentColor" stroke-width="2"/><circle cx="10" cy="21" r="2" fill="currentColor"/><rect x="15" y="20" width="10" height="2" rx="1" fill="currentColor"/></svg></div><div class="empty-title">${msg}</div>${descText ? `<div class="empty-desc">${descText}</div>` : ''}</div>`;
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// For values interpolated inside an inline event-handler JS string literal
// that itself sits inside an HTML attribute, e.g.:
//   onclick="doThing('${escapeForJsAttr(nama)}')"
// Plain escapeHtml() is NOT enough here: the browser decodes HTML entities
// in the attribute BEFORE handing the JS to the parser, so a lone escaped
// quote can still break out of the JS string. We first JS-escape backslashes
// and single quotes, then HTML-escape the result so it also survives being
// inside a double-quoted HTML attribute.
function escapeForJsAttr(str) {
  if (str === null || str === undefined) return '';
  return escapeHtml(String(str).replace(/\\/g,'\\\\').replace(/'/g,"\\'"));
}

function parseJurnalFromAI(text) {
  // Try to extract debit/kredit lines from AI response
  const lines = [];
  const today = new Date().toISOString().split('T')[0];
  const ketMatch = text.match(/(?:jurnal|mencatat|transaksi)[:\s]+([^\n.]+)/i);
  const ket = ketMatch ? ketMatch[1].trim().substring(0,60) : 'Dari AI';

  // Match patterns like "Dr. Kas 5.000.000" or "Kas (Debit) Rp 5.000.000"
  const drPattern = /(?:Dr\.?|Debit)[:\s]+([A-Za-z\s\/]+?)[:\s]+(?:Rp\s*)?([0-9.,]+)/gi;
  const krPattern = /(?:Kr\.?|Kredit)[:\s]+([A-Za-z\s\/]+?)[:\s]+(?:Rp\s*)?([0-9.,]+)/gi;

  let m;
  while((m = drPattern.exec(text)) !== null) {
    const nama = m[1].trim();
    const val = parseFloat(m[2].replace(/[.,]/g, '').replace(/(\d{3})$/,'$1')) || parseFloat(m[2].replace(/\./g,'').replace(',','.'));
    const akun = akuns.find(a => a.nama.toLowerCase().includes(nama.toLowerCase().split(' ')[0]));
    if(val > 0) lines.push({akun: akun?.kode||'1101', ket: nama, debit: val, kredit: 0});
  }
  while((m = krPattern.exec(text)) !== null) {
    const nama = m[1].trim();
    const val = parseFloat(m[2].replace(/[.,]/g, '').replace(/(\d{3})$/,'$1')) || parseFloat(m[2].replace(/\./g,'').replace(',','.'));
    const akun = akuns.find(a => a.nama.toLowerCase().includes(nama.toLowerCase().split(' ')[0]));
    if(val > 0) lines.push({akun: akun?.kode||'1101', ket: nama, debit: 0, kredit: val});
  }

  if(lines.length < 2) return null;
  const td = lines.reduce((s,l)=>s+l.debit,0);
  const tk = lines.reduce((s,l)=>s+l.kredit,0);
  if(Math.abs(td-tk) > 1) return null; // not balanced

  return { tanggal: today, ket, jenis: 'AI', lines };
}
