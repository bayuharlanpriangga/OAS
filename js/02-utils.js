
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

// ══════════════════════════════════════════════════════════════
// JURNAL PENUTUP, JURNAL PEMBALIK, KUNCI PERIODE
// ══════════════════════════════════════════════════════════════
// Aturan pembukuan yang dijaga di sini:
//  - Jurnal yang sudah diposting TIDAK dihapus. Koreksi dilakukan dengan jurnal pembalik
//    (baris debit/kredit ditukar) sehingga jejak audit tetap utuh.
//  - Jurnal penutup (jenis 'Penutup') memindahkan saldo pendapatan/beban satu tahun buku ke
//    Laba Ditahan. Laporan Laba Rugi harus MENGABAIKAN jurnal penutup, kalau tidak laba
//    tahun yang sudah ditutup ikut menjadi nol. Neraca justru harus MEMASUKKANNYA.
//  - Periode yang sudah dikunci tidak menerima jurnal baru maupun pembalikan.
const JENIS_PENUTUP = 'Penutup';

// Jenis jurnal = badge di Jurnal Umum. Jurnal yang dibuat otomatis dari sebuah fitur memakai nama
// fitur/aksinya; 'Manual' hanya untuk jurnal yang memang diketik sendiri lewat form Jurnal Manual.
// Tidak ada logika laporan yang bergantung pada nilai-nilai ini kecuali Penjualan, Pembelian,
// PPN, Penyesuaian, dan Penutup — jangan dipakai ulang untuk jurnal fitur lain.
const JENIS_JURNAL = {
  MANUAL:          'Manual',
  INVOICE:         'Invoice & Piutang',   // kirim invoice + pelunasan invoice
  PENYUSUTAN:      'Penyusutan',          // Aset Tetap otomatis & kalkulator penyusutan
  JURNAL_BERULANG: 'Jurnal Berulang',
  REKONSILIASI:    'Rekonsiliasi',        // impor baris bank & koreksi rekonsiliasi kas
  SALDO_AWAL:      'Saldo Awal',
  KARTU_STOCK:     'Kartu Stock',
  BEP:             'BEP & Margin',
  PINJAMAN:        'Pinjaman',
  PPN_PPH:         'PPN & PPh',           // jurnal dari kalkulator PPN & PPh
  GAJI_PPH21:      'Gaji & PPh 21',
  PPH23:           'PPh 23',
};

// Sumber jurnal = badge TAMBAHAN di samping jenis (bukan pengganti jenis). Mis. penjualan yang dibuat
// lewat Orias AI tetap berjenis Penjualan, plus badge "Orias AI". Disimpan di entry.sumber.
const SUMBER_JURNAL = { ORIAS_AI: 'Orias AI' };
// Diisi sementara selama aksi sebuah sumber berjalan; addJurnal() menempelkannya ke tiap jurnal baru.
let _jurnalSumberAktif = '';
// Tabel jurnal_entries tidak punya kolom khusus untuk relasi pembalik, jadi relasinya
// dititipkan di awal keterangan: "[Pembalik JRN-005] keterangan asli". Field reversalOf
// dipakai kalau ada (entry yang baru dibuat di sesi ini); sisanya dibaca dari teks.
const _REV_KET_RE = /^\[Pembalik ([^\]]+)\]\s*/;

function isJurnalPenutup(j) { return !!j && j.jenis === JENIS_PENUTUP; }

// Nomor jurnal asal yang dibalik oleh entry ini ('' kalau entry ini bukan jurnal pembalik)
function getReversalOf(j) {
  if(!j) return '';
  if(j.reversalOf) return j.reversalOf;
  const m = _REV_KET_RE.exec(j.ket || '');
  return m ? m[1].trim() : '';
}
function isJurnalPembalik(j) { return !!getReversalOf(j); }

// Map: nomor jurnal asal -> nomor jurnal pembaliknya
function getReversedMap() {
  const map = new Map();
  jurnalEntries.forEach(j => { const r = getReversalOf(j); if(r) map.set(r, j.no); });
  return map;
}
function isJurnalDibalik(j) { return !!j && !!j.no && getReversedMap().has(j.no); }

// Keterangan tanpa awalan "[Pembalik ...]" (untuk tampilan)
function ketTanpaPrefixPembalik(ket) { return String(ket || '').replace(_REV_KET_RE, ''); }

// ── Kunci periode ──
function isPeriodeTerkunci(tanggal) {
  return !!periodeKunciSampai && !!tanggal && String(tanggal).slice(0,10) <= periodeKunciSampai;
}
// Dipakai di titik masuk form: true = boleh lanjut, false = ditolak (alert sudah tampil)
function guardPeriode(tanggal, aksi) {
  if(!isPeriodeTerkunci(tanggal)) return true;
  showAlert('<i class="ti ti-lock" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;margin-right:4px;"></i> Periode sampai '
    + fmtDate(periodeKunciSampai) + ' sudah dikunci, jadi jurnal bertanggal ' + fmtDate(String(tanggal).slice(0,10)) + ' tidak bisa '
    + (aksi || 'diproses') + '. Pakai tanggal setelah ' + fmtDate(periodeKunciSampai) + ', atau buka kunci di Settings > Transaksi > Kunci Periode.');
  return false;
}
class PeriodeTerkunciError extends Error {}

// ── Tahun buku (mengikuti pilihan di Profil Perusahaan: jan / apr / jul / okt) ──
const _TB_BULAN_AWAL = { jan:0, apr:3, jul:6, okt:9 };
function getBulanAwalTahunBuku() {
  let kode = 'jan';
  try {
    const p = JSON.parse(localStorage.getItem('oas_profil') || localStorage.getItem('oas_profil_v1') || '{}');
    if(p && p.tahunBuku && _TB_BULAN_AWAL[p.tahunBuku] !== undefined) kode = p.tahunBuku;
  } catch(e) {}
  return _TB_BULAN_AWAL[kode];
}
function _pad2(n) { return String(n).padStart(2,'0'); }
function _ymd(y, m0, d) { return y + '-' + _pad2(m0+1) + '-' + _pad2(d); }
// Rentang tahun buku yang memuat tanggal 'YYYY-MM-DD'
function getTahunBukuRange(tanggal) {
  const bulanAwal = getBulanAwalTahunBuku();
  const y = parseInt(tanggal.slice(0,4), 10), m0 = parseInt(tanggal.slice(5,7), 10) - 1;
  const yAwal = m0 >= bulanAwal ? y : y - 1;
  const from = _ymd(yAwal, bulanAwal, 1);
  const yAkhir = bulanAwal === 0 ? yAwal : yAwal + 1;
  const m0Akhir = (bulanAwal + 11) % 12;
  const to = _ymd(yAkhir, m0Akhir, new Date(yAkhir, m0Akhir + 1, 0).getDate());
  const label = bulanAwal === 0 ? String(yAwal) : (yAwal + '/' + yAkhir);
  return { from, to, label };
}

// Saldo "alami" akun laba rugi: pendapatan = kredit - debit, HPP/beban = debit - kredit.
// Akun kontra (4103 Retur, 4104 Diskon Penjualan = normal debit; 5103 Retur Pembelian = normal
// kredit) otomatis bernilai NEGATIF sehingga MENGURANGI totalnya. Menjumlahkan saldo menurut
// `normal` akun (D-K atau K-D) membuat kontra ikut MENAMBAH total, dan laba terbaca terlalu besar.
// s = {debit, kredit}; untuk tipe selain pendapatan/HPP/beban dikembalikan saldo menurut `normal`.
function plNatural(a, s) {
  s = s || { debit: 0, kredit: 0 };
  if(!a) return 0;
  if(a.tipe === 'Pendapatan') return (s.kredit||0) - (s.debit||0);
  if(a.tipe === 'HPP' || a.tipe === 'Beban') return (s.debit||0) - (s.kredit||0);
  return a.normal === 'D' ? (s.debit||0) - (s.kredit||0) : (s.kredit||0) - (s.debit||0);
}
// Saldo alami satu akun (jurnal penutup diabaikan kecuali opts diisi lain, mis. {} untuk neraca).
function saldoAlamiPL(kode, opts) {
  const a = akuns.find(x => x.kode === kode);
  if(!a) return 0;
  return plNatural(a, computeSaldoAll(opts || { tanpaPenutup: true })[kode]);
}
function saldoBersihPL(kode) { return saldoAlamiPL(kode, { tanpaPenutup: true }); }

// Entri yang dipakai untuk laporan laba rugi: semua jurnal KECUALI jurnal penutup.
function getJurnalTanpaPenutup() { return jurnalEntries.filter(j => !isJurnalPenutup(j)); }

// Compute saldo per akun.
// opts.tanpaPenutup = true  -> abaikan jurnal penutup (untuk Laba Rugi & turunannya)
function computeSaldoAll(opts) {
  const map = {};
  const src = (opts && opts.tanpaPenutup) ? getJurnalTanpaPenutup() : jurnalEntries;
  src.forEach(j => j.lines.forEach(l => {
    if(!map[l.akun]) map[l.akun] = {debit:0,kredit:0};
    map[l.akun].debit += l.debit||0;
    map[l.akun].kredit += l.kredit||0;
  }));
  return map;
}

function computeSaldoBersih(kode, opts) {
  const a = akuns.find(x=>x.kode===kode);
  if(!a) return 0;
  const map = computeSaldoAll(opts);
  const s = map[kode] || {debit:0,kredit:0};
  return a.normal==='D' ? s.debit-s.kredit : s.kredit-s.debit;
}

// ══════════════════════════════════════════════════════════════
// PPN — tarif & rekap
// ══════════════════════════════════════════════════════════════
// Tarif TIDAK lagi berupa setting global. Tarif ditentukan per transaksi:
//  - Penjualan/pembelian barang: dari Master Produk (produk.ppn)
//  - Invoice: dipilih di form invoice (select #inv-ppn-tarif)
// Rekap pajak (dashboard, Pajak Otomatis, Rekap Siap Setor, export) membaca PPN aktual
// dari jurnal lewat rekapPpnJurnal() — bukan estimasi tarif x total penjualan.
//
// Sejak 1 Jan 2025 tarif PPN menurut UU HPP adalah 12%, tetapi PMK 131/2024:
//  - BKP/JKP non-mewah: 12% x DPP nilai lain (11/12 x harga) = tarif efektif 11%
//  - BKP mewah (kena PPnBM): 12% x harga jual penuh = tarif efektif 12%
// Ada juga pengecualian "besaran tertentu" (PMK 11/2025) yang tidak dicakup helper ini —
// konfirmasikan ke konsultan pajak untuk jenis usaha yang kena ketentuan khusus.
const PPN_TARIF_STANDAR = 11;   // hanya nilai awal pilihan di form/kalkulator, bukan setting

// PPN = DPP x tarif efektif (dibulatkan ke rupiah). Tarif kosong/tidak valid -> PPN_TARIF_STANDAR.
function hitungPpn(dpp, tarifPct) {
  const t = (tarifPct === undefined || tarifPct === null || tarifPct === '' || isNaN(tarifPct)) ? PPN_TARIF_STANDAR : Number(tarifPct);
  return Math.round((dpp || 0) * t / 100);
}

// Kode akun Utang PPN Keluaran (2301 bila ada, kalau tidak akun Liabilitas yang namanya memuat 'ppn').
function akunPpnKeluaranKode() {
  if (akuns.find(a => a.kode === '2301')) return '2301';
  return (akuns.find(a => a.nama.toLowerCase().includes('ppn') && a.tipe === 'Liabilitas') || {}).kode || '2301';
}

// Tarif PPN sebuah jurnal: _ppnTarif bila ada, kalau tidak dibaca dari "NN%" di keterangan baris PPN
// (mis. "Utang PPN Keluaran 11%") supaya tetap terbaca untuk jurnal yang dimuat dari cloud.
function _tarifPpnJurnal(j, barisPpn) {
  if (j._ppnTarif > 0) return Number(j._ppnTarif);
  for (const l of barisPpn) {
    const m = /(\d+(?:[.,]\d+)?)\s*%/.exec(l.ket || '');
    if (m) { const t = parseFloat(m[1].replace(',', '.')); if (t > 0) return t; }
  }
  return 0;
}

// Baca PPN aktual dari satu jurnal (penjualan/pembelian produk ber-PPN, invoice ber-PPN).
// Return null kalau bukan jurnal PPN.
function ppnDariJurnal(j) {
  if (!j || !Array.isArray(j.lines)) return null;
  const jum = (arr, f) => arr.reduce((sum, l) => sum + (l[f] || 0), 0);
  const keluaran = j.lines.filter(l => (l.kredit || 0) > 0 && (l.akun === '2301' || /ppn keluaran/i.test(l.ket || '')));
  if (keluaran.length) {
    const tarif = _tarifPpnJurnal(j, keluaran);
    if (!(tarif > 0)) return null;
    const ppn = jum(keluaran, 'kredit');
    const pendapatan = j.lines.filter(l => (l.kredit || 0) > 0 && (akuns.find(a => a.kode === l.akun) || {}).tipe === 'Pendapatan');
    const dpp = jum(pendapatan, 'kredit') || Math.round(ppn / (tarif / 100));
    return { tipe: 'keluaran', ppn, dpp, tarif };
  }
  const masukan = j.lines.filter(l => (l.debit || 0) > 0 && (l.akun === '1502' || /ppn masukan/i.test(l.ket || '')));
  if (masukan.length) {
    const tarif = _tarifPpnJurnal(j, masukan);
    if (!(tarif > 0)) return null;
    const ppn = jum(masukan, 'debit');
    return { tipe: 'masukan', ppn, dpp: Math.round(ppn / (tarif / 100)), tarif };
  }
  return null;
}

// Rekap PPN dari jurnal dalam rentang tanggal (YYYY-MM-DD, keduanya opsional).
function rekapPpnJurnal(fromStr, toStr) {
  const r = { keluaran: 0, masukan: 0, dppKeluaran: 0, dppMasukan: 0, rowsKeluaran: [], rowsMasukan: [], kurangBayar: 0 };
  const dibalik = getReversedMap();   // nomor jurnal asal -> nomor pembaliknya
  jurnalEntries.forEach(j => {
    if (fromStr && (j.tanggal || '') < fromStr) return;
    if (toStr && (j.tanggal || '') > toStr) return;
    if (isJurnalPembalik(j) || dibalik.has(j.no)) return;   // jurnal yang dibalik + pembaliknya saling meniadakan
    const p = ppnDariJurnal(j);
    if (!p) return;
    const row = { j, ppnVal: p.ppn, dpp: p.dpp, tarifPct: p.tarif };
    if (p.tipe === 'keluaran') { r.keluaran += p.ppn; r.dppKeluaran += p.dpp; r.rowsKeluaran.push(row); }
    else { r.masukan += p.ppn; r.dppMasukan += p.dpp; r.rowsMasukan.push(row); }
  });
  r.kurangBayar = r.keluaran - r.masukan;
  return r;
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
// Tombolnya sendiri cuma ikon bulat polos (lihat .info-icon-btn di components.css,
// tidak ada border/card). Kartu popover-nya baru muncul saat ⓘ ditekan (tap, tetap
// terbuka sampai ditutup) ATAU saat kursor mouse hover di atasnya (desktop, otomatis
// hilang saat kursor pergi).
let _activeInfoPopover = null;
function _buildInfoPopover(btn, html) {
  const pop = document.createElement('div');
  pop.className = 'info-popover';
  pop.innerHTML = html;
  pop._btn = btn;
  document.body.appendChild(pop);
  _positionInfoPopover(pop, btn);
  return pop;
}
// Dipanggil dari onclick="toggleInfoPopover(this, this.dataset.infoHtml)" — tap/klik
// MENGUNCI popover terbuka sampai ditekan lagi atau ditutup manual.
function toggleInfoPopover(btn, html) {
  const already = _activeInfoPopover && _activeInfoPopover._btn === btn && _activeInfoPopover._pinned;
  closeInfoPopover();
  if(already) return;
  const pop = _buildInfoPopover(btn, html);
  pop._pinned = true;
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
// Hover (mouse asli saja — bukan tap layar sentuh): tampilkan sekilas, tidak terkunci,
// otomatis hilang saat kursor keluar dari tombolnya. Pakai capture:true karena
// mouseenter/mouseleave tidak bubble, tapi tetap tertangkap ancestor di fase capture.
const _infoHoverMQ = window.matchMedia('(hover: hover) and (pointer: fine)');
document.addEventListener('mouseenter', function(e) {
  if(!_infoHoverMQ.matches) return;
  const btn = e.target.closest && e.target.closest('.info-icon-btn');
  if(!btn || (_activeInfoPopover && _activeInfoPopover._btn === btn)) return;
  const html = btn.dataset.infoHtml;
  if(!html) return;
  closeInfoPopover();
  const pop = _buildInfoPopover(btn, html);
  pop._pinned = false;
  _activeInfoPopover = pop;
}, true);
document.addEventListener('mouseleave', function(e) {
  if(!_infoHoverMQ.matches) return;
  const btn = e.target.closest && e.target.closest('.info-icon-btn');
  if(!btn) return;
  if(_activeInfoPopover && _activeInfoPopover._btn === btn && !_activeInfoPopover._pinned) closeInfoPopover();
}, true);
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
