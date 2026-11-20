
// KODE UNIK & DUPLIKAT CHECK
const KODE_COUNTER_KEY = 'oas_kode_counters';

function getKodeCounter() {
  return JSON.parse(localStorage.getItem(KODE_COUNTER_KEY) || '{}');
}

function nextKode(prefix) {
  const counters = getKodeCounter();
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  counters[key] = (counters[key] || 0) + 1;
  localStorage.setItem(KODE_COUNTER_KEY, JSON.stringify(counters));
  return `${prefix}-${year}-${String(counters[key]).padStart(3,'0')}`;
}

function isDuplicateKode(kode) {
  return jurnalEntries.some(j => j.kodeRef === kode);
}

function checkAndInputKalkulator(kode, jurnals, successMsg, onSuccess) {
  if(isDuplicateKode(kode)) {
    // Show duplicate warning
    if(!confirm(`<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Kode "${kode}" sudah pernah diinput sebelumnya!\n\nApakah kamu yakin ingin input ulang? (Bisa menyebabkan jurnal ganda)`)) return;
  }
  // Cek kunci periode untuk SEMUA jurnal dulu supaya tidak ada yang terposting sebagian
  const _terkunci = jurnals.find(j => isPeriodeTerkunci(j.tanggal));
  if(_terkunci) { guardPeriode(_terkunci.tanggal, 'diposting'); return; }
  // Add all journals
  jurnals.forEach(j => {
    j.kodeRef = kode;
    addJurnal(j);
  });
  renderDashboard();
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${successMsg} [${kode}]`);
  if(onSuccess) onSuccess(kode);
}

// UNDO SYSTEM
let lastKalkInput = null; // {kode, jurnalCount, timestamp}

function undoLastKalkInput() {
  if(!lastKalkInput) { showAlert('Tidak ada input yang bisa di-undo'); return; }
  const { kode, jurnalIndices } = lastKalkInput;
  if(!confirm(`Batalkan jurnal dari "${kode}"?\n\nJurnal asli tidak dihapus: sistem membuat jurnal pembalik bertanggal hari ini.`)) return;
  const asal = jurnalIndices.map(i => jurnalEntries[i]).filter(Boolean);
  let dibalik = 0;
  try { asal.forEach(e => { if(buatJurnalPembalik(e, { alasan: 'Undo input kalkulator ' + kode })) dibalik++; }); }
  catch(e) { if(!(e instanceof PeriodeTerkunciError)) throw e; }
  if(!dibalik) return; // alasan penolakan sudah ditampilkan oleh buatJurnalPembalik
  lastKalkInput = null;
  renderDashboard();
  renderJurnalUmum();
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Input "${kode}" dibatalkan lewat ${dibalik} jurnal pembalik`);
  // Hide undo buttons
  document.querySelectorAll('.kalk-undo-btn').forEach(b => b.style.display='none');
}

// KALKULATOR INPUT BUTTONS

// PENYUSUTAN → INPUT JURNAL
function inputPenyusutanJurnal() {
  const cost = parseFloat(document.getElementById('py-cost').value)||0;
  const sisa = parseFloat(document.getElementById('py-sisa').value)||0;
  const umur = parseInt(document.getElementById('py-umur').value)||0;
  const nama = document.getElementById('py-nama').value || 'Aset Tetap';
  const metode = document.getElementById('py-metode').value;

  if(!cost || !umur) { showAlert('Hitung penyusutan dulu!'); return; }

  const rows = document.querySelectorAll('#py-tabel-body tr');
  if(!rows.length) { showAlert('Klik "Hitung & Generate Tabel" dulu!'); return; }

  // Gunakan custom input modal untuk pemilihan tahun
  showCustomInputModal({
    icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color:var(--accent3)"><path d="M3 21h18M9 21V7l6-4v18M3 21V11l6-4"/></svg>',
    iconColor: 'rgba(74,222,128,0.15)',
    iconBorder: 'rgba(74,222,128,0.3)',
    title: 'Input Jurnal Penyusutan',
    subtitle: `Pilih tahun penyusutan yang ingin diinput ke jurnal`,
    rows: [
      { label: 'Nama Aset', value: nama || '—', color: 'var(--text)' },
      { label: 'Umur Ekonomis', value: umur + ' tahun', color: 'var(--accent2)' },
    ],
    inputLabel: `Tahun ke berapa yang ingin diinput? (1 – ${umur}):`,
    inputDefault: 1,
    btnLabel: '✓ Lanjut Pilih Akun',
  }).then(tahunVal => {
    if(tahunVal === null) return;
    const t = parseInt(tahunVal);
    if(t < 1 || t > umur) { showAlert('Tahun tidak valid'); return; }

    const row = rows[t-1];
    if(!row) { showAlert('Data baris tidak ditemukan'); return; }
    const tds = row.querySelectorAll('td');
    const beban = parseFloat(tds[1]?.textContent?.replace(/[^0-9]/g,''))||0;
    if(!beban) { showAlert('Nilai penyusutan tidak valid'); return; }

    const kode = nextKode('DEP');
    const today = new Date().toISOString().split('T')[0];

    // Pilih jenis aset dengan styled select modal
    const akunMap = {
      'bangunan':['1703','6301','Bangunan'],
      'kendaraan':['1712','6302','Kendaraan'],
      'peralatan':['1722','6303','Peralatan Kantor'],
      'mesin':['1732','6304','Mesin & Alat Produksi'],
      'komputer':['1752','6305','Komputer & Laptop'],
      'inventaris':['1742','6303','Inventaris & Furnitur'],
    };

    showCustomSelectModal({
      icon: '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>',
      iconColor: 'rgba(34,211,238,0.15)',
      iconBorder: 'rgba(34,211,238,0.3)',
      title: 'Pilih Jenis Aset',
      subtitle: `Penyusutan Tahun ke-${t} — ${fmtRp(beban)}`,
      options: [
        { value: 'bangunan',   label: 'Bangunan',            sub: 'Akun 1702/1703 ↔ 6301' },
        { value: 'kendaraan',  label: 'Kendaraan',           sub: 'Akun 1711/1712 ↔ 6302' },
        { value: 'peralatan',  label: 'Peralatan Kantor',    sub: 'Akun 1721/1722 ↔ 6303' },
        { value: 'mesin',      label: 'Mesin & Alat Produksi', sub: 'Akun 1731/1732 ↔ 6304' },
        { value: 'komputer',   label: 'Komputer & Laptop',   sub: 'Akun 1751/1752 ↔ 6305' },
        { value: 'inventaris', label: 'Inventaris & Furnitur', sub: 'Akun 1741/1742 ↔ 6303' },
      ],
      btnLabel: '✓ Input Jurnal Penyusutan',
    }).then(pilihan => {
      if(pilihan === null) return;
      const [akumKode, bebanKode, asetLabel] = akunMap[pilihan] || akunMap['kendaraan'];
      const akumNama = getAkunNama(akumKode);
      const bebanNama = getAkunNama(bebanKode);

      const jurnal = {
        tanggal: today,
        ket: `Penyusutan ${nama} Tahun ke-${t} [${metode}]`,
        jenis: JENIS_JURNAL.PENYUSUTAN,
        kodeRef: kode,
        lines: [
          { akun: bebanKode, ket: bebanNama, debit: beban, kredit: 0 },
          { akun: akumKode, ket: akumNama, debit: 0, kredit: beban }
        ]
      };

      const beforeCount = jurnalEntries.length;
      checkAndInputKalkulator(kode, [jurnal],
        `Jurnal penyusutan ${nama} Rp ${beban.toLocaleString('id-ID')} berhasil diinput`,
        (k) => {
          lastKalkInput = { kode: k, jurnalIndices: [beforeCount] };
          showKalkUndoBar(`DEP: ${nama} Tahun ke-${t}`, k);
        }
      );
    }); // end showCustomSelectModal
  }); // end showCustomInputModal
}

// BEP → INPUT JURNAL
function inputBEPJurnal() {
  const harga = parseFloat(document.getElementById('bep-harga').value)||0;
  const bv = parseFloat(document.getElementById('bep-bv').value)||0;
  const bt = parseFloat(document.getElementById('bep-bt').value)||0;
  const vol = parseFloat(document.getElementById('bep-vol').value)||0;

  if(!harga||!bt) { showAlert('Hitung BEP dulu!'); return; }

  const pendapatan = harga * vol;
  const hpp = bv * vol;
  const today = new Date().toISOString().split('T')[0];
  const kode = nextKode('BEP');

  const jurnals = [];
  if(pendapatan > 0) {
    jurnals.push({
      tanggal: today, ket: `Pendapatan periode BEP [${kode}]`, jenis: 'Penjualan',
      lines: [
        { akun: '1101', ket: 'Kas', debit: pendapatan, kredit: 0 },
        { akun: '4101', ket: 'Penjualan Barang', debit: 0, kredit: pendapatan }
      ]
    });
  }
  if(hpp > 0) {
    jurnals.push({
      tanggal: today, ket: `HPP periode BEP [${kode}]`, jenis: JENIS_JURNAL.BEP,
      lines: [
        { akun: '5101', ket: 'HPP', debit: hpp, kredit: 0 },
        { akun: '1301', ket: 'Persediaan Barang Dagangan', debit: 0, kredit: hpp }
      ]
    });
  }
  if(bt > 0) {
    jurnals.push({
      tanggal: today, ket: `Beban tetap periode BEP [${kode}]`, jenis: JENIS_JURNAL.BEP,
      lines: [
        { akun: '6701', ket: 'Beban Lain-lain (Biaya Tetap)', debit: bt, kredit: 0 },
        { akun: '1101', ket: 'Kas', debit: 0, kredit: bt }
      ]
    });
  }

  if(!jurnals.length) { showAlert('Tidak ada data untuk diinput'); return; }

  const beforeCount = jurnalEntries.length;
  const indices = Array.from({length: jurnals.length}, (_,i) => beforeCount+i);
  checkAndInputKalkulator(kode, jurnals,
    `Jurnal BEP (vol:${vol} unit, pendapatan:Rp${pendapatan.toLocaleString('id-ID')}) diinput`,
    (k) => {
      lastKalkInput = { kode: k, jurnalIndices: indices };
      showKalkUndoBar(`BEP: Vol ${vol} unit`, k);
    }
  );
}

// ANUITAS → INPUT JURNAL
function inputAnuitasJurnal() {
  const pokok = parseFloat(document.getElementById('an-pokok').value)||0;
  const rate = parseFloat(document.getElementById('an-rate').value)||0;
  const tenor = parseInt(document.getElementById('an-tenor').value)||0;
  const dp = parseFloat(document.getElementById('an-dp').value)||0;

  if(!pokok||!rate||!tenor) { showAlert('Hitung anuitas dulu!'); return; }

  const rBln = rate/100/12;
  const pinjaman = pokok - dp;
  const cicilan = pinjaman * rBln / (1-Math.pow(1+rBln,-tenor));
  const bunga1 = pinjaman * rBln;
  const pokok1 = cicilan - bunga1;
  const today = new Date().toISOString().split('T')[0];
  const kode = nextKode('ANT');

  const jurnals = [];
  // Jurnal pencairan pinjaman
  jurnals.push({
    tanggal: today, ket: `Pencairan pinjaman/kredit [${kode}]`, jenis: JENIS_JURNAL.PINJAMAN,
    lines: [
      { akun: '1101', ket: 'Kas - penerimaan pinjaman', debit: pinjaman, kredit: 0 },
      { akun: '2801', ket: 'Utang Bank Jangka Panjang', debit: 0, kredit: pinjaman }
    ]
  });
  // Jurnal angsuran pertama
  jurnals.push({
    tanggal: today, ket: `Angsuran ke-1 pinjaman [${kode}]`, jenis: JENIS_JURNAL.PINJAMAN,
    lines: [
      { akun: '2801', ket: 'Angsuran pokok', debit: Math.round(pokok1), kredit: 0 },
      { akun: '6601', ket: 'Beban Bunga Pinjaman', debit: Math.round(bunga1), kredit: 0 },
      { akun: '1101', ket: 'Kas keluar', debit: 0, kredit: Math.round(cicilan) }
    ]
  });

  const beforeCount = jurnalEntries.length;
  const indices = [beforeCount, beforeCount+1];
  checkAndInputKalkulator(kode, jurnals,
    `Jurnal pinjaman Rp${pinjaman.toLocaleString('id-ID')} + angsuran ke-1 diinput`,
    (k) => {
      lastKalkInput = { kode: k, jurnalIndices: indices };
      showKalkUndoBar(`Anuitas: Pinjaman Rp${pinjaman.toLocaleString('id-ID')}`, k);
    }
  );
}

// PERSEDIAAN → INPUT JURNAL (sekarang lewat popup kartu stock)
function inputPersediaanJurnal() {
  const metode = window._invMetode || document.getElementById('inv-metode')?.value || 'fifo';
  kartuStockTab = metode;
  // showPilihKartuStockPopup callback dipanggil dengan katId — _doSelectKartuForInput sudah menangani switch
  showPilihKartuStockPopup((katId) => {
    // _doSelectKartuForInput sudah switch card+kategori aktif, langsung buka popup jurnal
    bukaPopupJurnalSemua();
  });
}

// UNDO BAR
function showKalkUndoBar(label, kode) {
  // Remove existing undo bars
  document.querySelectorAll('.kalk-undo-bar').forEach(b => b.remove());

  const bar = document.createElement('div');
  bar.className = 'kalk-undo-bar';
  bar.style.cssText = `
    position:fixed;bottom:80px;left:50%;transform:translateX(-50%);
    background:var(--surface);border:1px solid var(--accent);border-radius:10px;
    padding:10px 16px;display:flex;align-items:center;gap:12px;
    z-index:500;box-shadow:0 8px 32px rgba(0,0,0,0.4);font-size:13px;
    animation:slideUp 0.3s ease;max-width:90vw;
  `;
  bar.innerHTML = `
    <span style="color:var(--accent)"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i></span>
    <span style="color:var(--text);flex:1">${escapeHtml(label)} <span style="color:var(--muted);font-size:11px;font-family:var(--mono);">[${escapeHtml(kode)}]</span></span>
    <button onclick="undoLastKalkInput()" style="background:rgba(248,113,113,0.15);border:1px solid rgba(248,113,113,0.3);border-radius:6px;padding:5px 12px;cursor:pointer;color:var(--red);font-size:12px;font-family:var(--sans);font-weight:600;flex-shrink:0;">↩ Undo</button>
    <button onclick="showPage('jurnal-umum')" style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:6px;padding:5px 12px;cursor:pointer;color:var(--accent);font-size:12px;font-family:var(--sans);font-weight:600;flex-shrink:0;"><i class="ti ti-book" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Lihat</button>
    <button onclick="this.parentNode.remove()" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:16px;padding:0 4px;flex-shrink:0;">✕</button>
  `;
  document.body.appendChild(bar);

  // Auto-hide after 12 seconds
  setTimeout(() => { if(bar.parentNode) bar.remove(); }, 12000);
}

// ADD INPUT BUTTONS TO CALCULATOR RESULTS
function addKalkInputButtons() { /* buttons added via individual addInputBtnTo* fns */ }
function _addKalkInputButtonsUnused() {
  // Penyusutan
  const pyWrap = document.getElementById('py-tabel-wrap');
  if(pyWrap && !pyWrap.querySelector('.kalk-input-bar')) {
    const bar = createKalkBar([
      { label: '<i class="ti ti-download ti-inline"></i> Input Jurnal Penyusutan', fn: 'inputPenyusutanJurnal()', color: 'green' }
    ]);
    pyWrap.appendChild(bar);
  }

  // BEP
  const bepRes = document.getElementById('bep-hasil');
  if(bepRes && !bepRes.querySelector('.kalk-input-bar')) {
    const bar = createKalkBar([
      { label: '<i class="ti ti-download ti-inline"></i> Input Jurnal BEP', fn: 'inputBEPJurnal()', color: 'green' }
    ]);
    bepRes.appendChild(bar);
  }

  // Anuitas
  const anWrap = document.getElementById('an-tabel-wrap');
  if(anWrap && !anWrap.querySelector('.kalk-input-bar')) {
    const bar = createKalkBar([
      { label: '<i class="ti ti-download ti-inline"></i> Input Jurnal Pinjaman & Angsuran', fn: 'inputAnuitasJurnal()', color: 'green' }
    ]);
    anWrap.appendChild(bar);
  }

  // Persediaan
  const invRes = document.getElementById('inv-result');
  if(invRes && !invRes.querySelector('.kalk-input-bar')) {
    const bar = createKalkBar([
      { label: '<i class="ti ti-download ti-inline"></i> Input Jurnal HPP Persediaan', fn: 'inputPersediaanJurnal()', color: 'green' }
    ]);
    invRes.appendChild(bar);
  }
}

function createKalkBar(btns) {
  const bar = document.createElement('div');
  bar.className = 'kalk-input-bar';
  bar.style.cssText = 'padding:12px 16px;border-top:1px solid var(--border);display:flex;gap:8px;flex-wrap:wrap;align-items:center;';
  bar.innerHTML = `<span style="font-size:11px;color:var(--muted);flex-basis:100%;margin-bottom:4px;">💡 Hasil kalkulator bisa langsung diinput ke sistem:</span>`
    + btns.map(b => `<button onclick="${b.fn}" style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:7px;padding:8px 14px;cursor:pointer;color:var(--accent);font-size:13px;font-family:var(--sans);font-weight:600;transition:all 0.15s;" onmouseover="this.style.background='rgba(74,222,128,0.2)'" onmouseout="this.style.background='rgba(74,222,128,0.1)'">${b.label}</button>`).join('');
  return bar;
}

// Instead of MutationObserver (can cause loops), add buttons via showPage hook
// Buttons are added once when user visits kalkulator page
function addKalkButtonsIfNeeded() {
  // Only add if result is visible and button not yet present
  const pyWrap = document.getElementById('py-tabel-wrap');
  if(pyWrap && pyWrap.style.display !== 'none' && !document.getElementById('py-input-btn-bar')) {
    const bar = createKalkBar([{label:'<i class="ti ti-download ti-inline"></i> Input Jurnal Penyusutan', fn:'inputPenyusutanJurnal()', color:'green'}]);
    bar.id = 'py-input-btn-bar';
    pyWrap.appendChild(bar);
  }
  const anWrap = document.getElementById('an-tabel-wrap');
  if(anWrap && anWrap.style.display !== 'none' && !document.getElementById('an-input-btn-bar')) {
    const bar = createKalkBar([{label:'<i class="ti ti-download ti-inline"></i> Input Jurnal Pinjaman & Angsuran', fn:'inputAnuitasJurnal()', color:'green'}]);
    bar.id = 'an-input-btn-bar';
    anWrap.appendChild(bar);
  }
  const invRes = document.getElementById('inv-result');
  if(invRes && invRes.style.display !== 'none' && !document.getElementById('inv-input-btn-bar')) {
    const bar = createKalkBar([{label:'<i class="ti ti-clipboard-list ti-inline"></i> Input ke Kartu Stock', fn:'inputKeKartuStock()', color:'green'}]);
    bar.id = 'inv-input-btn-bar';
    invRes.appendChild(bar);
  }
  const bepRes = document.getElementById('bep-hasil');
  if(bepRes && !document.getElementById('bep-input-btn-bar')) {
    const bar = createKalkBar([{label:'<i class="ti ti-download ti-inline"></i> Input Jurnal BEP', fn:'inputBEPJurnal()', color:'green'}]);
    bar.id = 'bep-input-btn-bar';
    bepRes.appendChild(bar);
  }
}
// Slideup animation
const slideStyle = document.createElement('style');
slideStyle.textContent = '@keyframes slideUp { from{transform:translateX(-50%) translateY(20px);opacity:0} to{transform:translateX(-50%) translateY(0);opacity:1} }';
document.head.appendChild(slideStyle);

// TUTORIAL DRAG & MINIMIZE
let tutIsDragging = false, tutDragStartX, tutDragStartY, tutInitLeft, tutInitTop;
let tutIsMinimized = false;

// KALKULATOR INPUT BUTTONS — Fixed approach
// Called directly from hitungPenyusutan etc. via button in result HTML

function addInputBtnToPenyusutan() {
  const wrap = document.getElementById('py-tabel-wrap');
  if(!wrap || document.getElementById('py-input-btn-bar')) return;
  const bar = createKalkBar([{label:'<i class="ti ti-download ti-inline"></i> Input Jurnal Penyusutan ke Sistem', fn:'inputPenyusutanJurnal()', color:'green'}]);
  bar.id = 'py-input-btn-bar';
  wrap.appendChild(bar);
}
function addInputBtnToBEP() {
  const res = document.getElementById('bep-detail-body');
  if(!res || document.getElementById('bep-input-btn-bar')) return;
  // Add after bep-hasil table
  const table = res.closest('.table-card') || res.parentElement;
  if(table) {
    const bar = createKalkBar([{label:'<i class="ti ti-download ti-inline"></i> Input Jurnal BEP ke Sistem', fn:'inputBEPJurnal()', color:'green'}]);
    bar.id = 'bep-input-btn-bar';
    table.appendChild(bar);
  }
}
function addInputBtnToAnuitas() {
  const wrap = document.getElementById('an-tabel-wrap');
  if(!wrap || document.getElementById('an-input-btn-bar')) return;
  const bar = createKalkBar([{label:'<i class="ti ti-download ti-inline"></i> Input Jurnal Pinjaman & Angsuran', fn:'inputAnuitasJurnal()', color:'green'}]);
  bar.id = 'an-input-btn-bar';
  wrap.appendChild(bar);
}
function addInputBtnToPersediaan() {
  const res = document.getElementById('inv-result');
  if(!res || res.style.display==='none' || document.getElementById('inv-input-btn-bar')) return;
  const bar = createKalkBar([{label:'<i class="ti ti-clipboard-list ti-inline"></i> Input ke Kartu Stock', fn:'inputKeKartuStock()', color:'green'}]);
  bar.id = 'inv-input-btn-bar';
  res.appendChild(bar);
}

// PENYUSUTAN
function hitungPenyusutan() {
  if (document.getElementById('page-kalk-penyusutan')?.dataset.reactManaged === '1') {
    window.dispatchEvent(new CustomEvent('oas:kalk-sync', { detail: { kind: 'penyusutan' } }));
    return;
  }
  const cost = parseFloat(document.getElementById('py-cost').value)||0;
  const sisa = parseFloat(document.getElementById('py-sisa').value)||0;
  const umur = parseInt(document.getElementById('py-umur').value)||0;
  const metode = document.getElementById('py-metode').value;
  const tarif = parseFloat(document.getElementById('py-tarif').value)||2;
  const unitRow = document.getElementById('py-unit-row');
  unitRow.style.display = metode==='unit-produksi' ? 'block' : 'none';
  // Disable tarif pajak DDB saat metode unit produksi atau garis lurus atau SYD
  const tarifInput = document.getElementById('py-tarif');
  const tarifGroup = document.getElementById('py-tarif-group');
  const ddbMetode = metode === 'saldo-menurun' || metode === 'saldo-menurun-1x';
  tarifInput.disabled = !ddbMetode;
  tarifGroup.style.opacity = ddbMetode ? '1' : '0.4';
  tarifGroup.title = ddbMetode ? '' : 'Tarif pajak hanya digunakan untuk metode Saldo Menurun (DDB)';

  if(!cost||!umur) return;
  if(sisa > cost) { document.getElementById('py-summary').innerHTML = '<span style="color:var(--red)">Nilai sisa tidak boleh melebihi harga perolehan.</span>'; return; }

  const totalUnit = parseFloat(document.getElementById('py-total-unit')?.value)||1;
  const unitPerTahunStr = document.getElementById('py-unit-per-tahun')?.value || '';
  const unitPerTahun = unitPerTahunStr.split(',').map(x=>parseFloat(x.trim())||0);

  let dasarPenyusutan = cost - sisa;
  let tabel = [];
  let totalBeban = 0;
  let rataRata = 0;

  if (typeof window !== 'undefined' && window.__oasLib && window.__oasLib.hitungPenyusutanPure) {
    const res = window.__oasLib.hitungPenyusutanPure({ cost, sisa, umur, metode, totalUnit, unitPerTahun });
    if (!res.ok) {
      document.getElementById('py-summary').innerHTML = `<span style="color:var(--red)">${escapeHtml(res.pesan || 'Parameter tidak valid.')}</span>`;
      return;
    }
    dasarPenyusutan = res.dasarPenyusutan;
    tabel = res.tabel;
    totalBeban = res.totalBeban;
    rataRata = res.rataRataPerTahun;
  } else {
    let nb = cost;
    if(metode === 'garis-lurus') {
      const beban = dasarPenyusutan / umur;
      for(let t=1; t<=umur; t++) {
        const akum = beban * t;
        tabel.push({ t, beban, akum, nbAwal: nb, nbAkhir: nb - beban });
        nb -= beban;
      }
    } else if(metode === 'saldo-menurun' || metode === 'saldo-menurun-1x') {
      const multiplier = metode === 'saldo-menurun' ? 2 : 1.5;
      const rate = (multiplier / umur);
      for(let t=1; t<=umur; t++) {
        let beban = nb * rate;
        if(nb - beban < sisa) beban = nb - sisa;
        if(beban < 0) beban = 0;
        const nbAwal = nb;
        nb -= beban;
        tabel.push({ t, beban, akum: cost - nb, nbAwal, nbAkhir: nb });
      }
    } else if(metode === 'sum-of-years') {
      const sumYears = (umur * (umur+1)) / 2;
      let akum = 0;
      for(let t=1; t<=umur; t++) {
        const fraksi = (umur - t + 1) / sumYears;
        const beban = dasarPenyusutan * fraksi;
        akum += beban;
        tabel.push({ t, beban, akum, nbAwal: nb, nbAkhir: nb - beban });
        nb -= beban;
      }
    } else if(metode === 'unit-produksi') {
      const tarifPerUnit = dasarPenyusutan / totalUnit;
      let akum = 0;
      for(let t=0; t<Math.max(umur,unitPerTahun.length); t++) {
        const u = unitPerTahun[t] || 0;
        const beban = tarifPerUnit * u;
        akum += beban;
        tabel.push({ t: t+1, beban, akum, nbAwal: nb, nbAkhir: nb - beban, unit: u });
        nb -= beban;
      }
    }
    totalBeban = tabel.reduce((s,r)=>s+r.beban,0);
    rataRata = totalBeban / umur;
  }

  // Summary
  document.getElementById('py-summary').innerHTML = `
    ${resRow('Harga Perolehan', rp(cost))}
    ${resRow('Nilai Sisa', rp(sisa))}
    ${resRow('Dasar Penyusutan', rp(dasarPenyusutan))}
    ${resRow('Umur Ekonomis', umur + ' Tahun')}
    ${resRow('Total Akumulasi', rp(totalBeban))}
    ${resRow('Rata-rata / Tahun', rp(rataRata))}
    ${metode==='garis-lurus'?resRow('Tarif Penyusutan', pct((1/umur)*100)):''}
    ${metode.includes('saldo')?resRow('Tarif DDB/SDB', pct((tarif/umur)*100)):''}
  `;

  // Tabel
  const wrap = document.getElementById('py-tabel-wrap');
  wrap.style.display = 'block';
  document.getElementById('py-tabel-body').innerHTML = tabel.map(r => `<tr>
    <td>Tahun ${r.t}${r.unit?' ('+r.unit.toLocaleString('id-ID')+' unit)':''}</td>
    <td class="debit">${rp(r.beban)}</td>
    <td class="kredit">${rp(r.akum)}</td>
    <td class="num">${rp(r.nbAwal)}</td>
    <td class="num">${rp(r.nbAkhir)}</td>
    <td style="font-size:11px;color:var(--muted);">Dr. Beban Peny. ${rp(r.beban)}<br>Kr. Akum. Peny. ${rp(r.beban)}</td>
  </tr>`).join('');

  // Auto-add input button
  setTimeout(addInputBtnToPenyusutan, 80);
}

// PERSEDIAAN
let invRows = [];
let invRowId = 0;
function addInvRow(jenis) {
  const id = invRowId++;
  const tbody = document.getElementById('inv-input-body');
  const tr = document.createElement('tr');
  const today = new Date().toISOString().split('T')[0];
  tr.id = 'invr-'+id;
  tr.innerHTML = `
    <td>${id+1}</td>
    <td><input type="date" value="${today}" style="background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:5px;color:var(--text);font-size:12px;width:120px"></td>
    <td><span class="badge ${jenis==='masuk'?'badge-green':'badge-red'}">${jenis==='masuk'?'Masuk':'Keluar'}</span><input type="hidden" value="${jenis}"></td>
    <td><input type="number" placeholder="0" min="0" style="background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:5px;color:var(--text);font-size:12px;width:80px"></td>
    <td><input type="number" placeholder="${jenis==='keluar'?'(auto-HPP)':'0'}" min="0" style="background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:5px;color:var(--text);font-size:12px;width:100px" ${jenis==='keluar'?'readonly':''}></td>
    <td><input type="text" placeholder="Keterangan" style="background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:5px;color:var(--text);font-size:12px;width:120px"></td>
    <td><button onclick="document.getElementById('invr-${id}').remove()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;">✕</button></td>`;
  tbody.appendChild(tr);
}
function resetInv() {
  document.getElementById('inv-input-body').innerHTML = '';
  document.getElementById('inv-result').style.display = 'none';
  const summaryEl = document.getElementById('inv-penjualan-summary');
  if(summaryEl) summaryEl.style.display = 'none';
  const btnBar = document.getElementById('inv-input-btn-bar');
  if(btnBar) btnBar.remove();
  window._invHpp = 0; window._invPendapatan = 0; window._invLaba = 0;
  window._invAdaHargaJual = false; window._invKartu = [];
  invRowId = 0;
  // seed default
  addInvRow('masuk'); addInvRow('masuk'); addInvRow('keluar');
}
function hitungPersediaan() {
  const metode = document.getElementById('inv-metode').value;
  const rows = [];
  document.querySelectorAll('#inv-input-body tr').forEach(tr => {
    const hiddenJenis = tr.querySelector('input[type=hidden]');
    const allInputs = tr.querySelectorAll('input:not([type=hidden])');
    // allInputs[0]=date, [1]=qty, [2]=harga beli, [3]=harga jual, [4]=ket
    if (!hiddenJenis || allInputs.length < 2) return;
    const jenis = hiddenJenis.value;
    const tgl = allInputs[0].value;
    const qty = parseFloat(allInputs[1].value) || 0;
    const harga = parseFloat(allInputs[2]?.value) || 0;
    const ket = allInputs[3]?.value || '';
    if(qty) rows.push({tgl, jenis, qty, harga, ket});
  });
  if(!rows.length) { showAlert('Tambah data transaksi dulu!'); return; }

  let stock = []; // {qty, harga} — selalu per layer untuk semua metode
  let hpp = 0;
  let kartu = [];
  let akhirQty = 0;
  let akhirVal = 0;

  if (typeof window !== 'undefined' && window.__oasLib && window.__oasLib.hitungPersediaanPure) {
    const res = window.__oasLib.hitungPersediaanPure(rows, metode);
    stock = res.stock;
    hpp = res.hpp;
    kartu = res.kartu;
    akhirQty = res.akhirQty;
    akhirVal = res.akhirVal;
  } else {
    rows.forEach(r => {
      if(r.jenis === 'masuk') {
        if(metode === 'wa' || metode === 'mwa') {
          const totalQty = stock.reduce((s,x)=>s+x.qty,0) + r.qty;
          const totalVal = stock.reduce((s,x)=>s+x.qty*x.harga,0) + r.qty*r.harga;
          const hargaWA = totalQty ? totalVal / totalQty : 0;
          stock = [{qty: totalQty, harga: hargaWA}];
        } else {
          stock.push({qty: r.qty, harga: r.harga});
        }
        const saldoLayers = stock.filter(x=>x.qty>0).map(x=>({...x}));
        kartu.push({
          tgl:r.tgl, ket:r.ket||'masuk',
          mQty:r.qty, mHarga:r.harga, mJml:r.qty*r.harga,
          kQty:'', kHarga:'', kJml:'', kHargaJual:'', kLaba:'',
          saldoLayers
        });
      } else {
        let qKeluarSisa = r.qty;
        let hppBatch = 0;
        let keluarLayers = [];

        if(metode === 'fifo') {
          while(qKeluarSisa > 0 && stock.length) {
            const layer = stock[0];
            const ambil = Math.min(layer.qty, qKeluarSisa);
            hppBatch += ambil * layer.harga;
            keluarLayers.push({qty: ambil, harga: layer.harga});
            layer.qty -= ambil;
            qKeluarSisa -= ambil;
            if(layer.qty <= 0) stock.shift();
          }
        } else if(metode === 'lifo') {
          while(qKeluarSisa > 0 && stock.length) {
            const layer = stock[stock.length-1];
            const ambil = Math.min(layer.qty, qKeluarSisa);
            hppBatch += ambil * layer.harga;
            keluarLayers.push({qty: ambil, harga: layer.harga});
            layer.qty -= ambil;
            qKeluarSisa -= ambil;
            if(layer.qty <= 0) stock.pop();
          }
        } else if(metode === 'wa' || metode === 'mwa') {
          const totalQty = stock.reduce((s,x)=>s+x.qty,0);
          const totalVal = stock.reduce((s,x)=>s+x.qty*x.harga,0);
          const hargaWA = totalQty ? totalVal/totalQty : 0;
          hppBatch = hargaWA * r.qty;
          keluarLayers = [{qty: r.qty, harga: hargaWA}];
          let sisa2 = r.qty;
          for(let i=0;i<stock.length&&sisa2>0;i++) {
            const ambil = Math.min(stock[i].qty, sisa2);
            stock[i].qty -= ambil; sisa2 -= ambil;
          }
          stock = stock.filter(x=>x.qty>0);
        }

        hpp += hppBatch;
        const hppPerUnit = r.qty ? hppBatch / r.qty : 0;
        const saldoLayers = stock.filter(x=>x.qty>0).map(x=>({...x}));
        kartu.push({
          tgl:r.tgl, ket:r.ket||'keluar',
          mQty:'', mHarga:'', mJml:'',
          kQty:r.qty, kHarga:hppPerUnit, kJml:hppBatch,
          keluarLayers,
          saldoLayers
        });
      }
    });
    akhirQty = stock.reduce((s,x)=>s+x.qty,0);
    akhirVal = stock.reduce((s,x)=>s+x.qty*x.harga,0);
  }

  document.getElementById('inv-result').style.display='block';
  const mLabel = {fifo:'FIFO',lifo:'LIFO',wa:'Weighted Average',mwa:'Moving WA'};
  document.getElementById('inv-metode-label').textContent = 'Metode: ' + (mLabel[metode]||metode);
  document.getElementById('inv-akhir').textContent = rp(akhirVal);
  document.getElementById('inv-hpp').textContent = rp(hpp);
  document.getElementById('inv-qty').textContent = akhirQty.toLocaleString('id-ID');

  // Sembunyikan summary penjualan (sudah tidak ada harga jual di input)
  const summaryEl = document.getElementById('inv-penjualan-summary');
  if(summaryEl) summaryEl.style.display = 'none';

  // Render kartu persediaan — FIFO/LIFO tampilkan saldo per layer
  const isLayered = (metode === 'fifo' || metode === 'lifo');
  let kartuHtml = '';
  kartu.forEach(k => {
    if(k.mQty !== '') {
      // Baris MASUK
      const saldoRows = isLayered ? k.saldoLayers : [{qty: k.saldoLayers.reduce((s,x)=>s+x.qty,0), harga: k.saldoLayers.length ? k.saldoLayers.reduce((s,x)=>s+x.qty*x.harga,0)/k.saldoLayers.reduce((s,x)=>s+x.qty,0) : 0}];
      const rowspan = saldoRows.length || 1;
      kartuHtml += `<tr>
        <td rowspan="${rowspan}" style="font-size:11px">${k.tgl}</td>
        <td rowspan="${rowspan}" style="font-size:12px">${k.ket}</td>
        <td rowspan="${rowspan}" style="border-left:1px solid var(--border)" class="num">${k.mQty}</td>
        <td rowspan="${rowspan}" class="num">${rp(k.mHarga)}</td>
        <td rowspan="${rowspan}" class="debit">${rp(k.mJml)}</td>
        <td rowspan="${rowspan}" style="border-left:1px solid var(--border)" class="num"></td>
        <td rowspan="${rowspan}" class="num"></td>
        <td style="border-left:1px solid var(--border)" class="num">${saldoRows[0]?.qty||0}</td>
        <td class="num">${rp(saldoRows[0]?.harga||0)}</td>
        <td class="num">${rp((saldoRows[0]?.qty||0)*(saldoRows[0]?.harga||0))}</td>
      </tr>`;
      for(let i=1;i<saldoRows.length;i++) {
        kartuHtml += `<tr>
          <td style="border-left:1px solid var(--border)" class="num">${saldoRows[i].qty}</td>
          <td class="num">${rp(saldoRows[i].harga)}</td>
          <td class="num">${rp(saldoRows[i].qty*saldoRows[i].harga)}</td>
        </tr>`;
      }
    } else {
      // Baris KELUAR — tampilkan per layer keluar jika FIFO/LIFO
      const keluarRows = (isLayered && k.keluarLayers && k.keluarLayers.length > 1) ? k.keluarLayers : null;
      const saldoRows = isLayered ? k.saldoLayers : [{qty: k.saldoLayers.reduce((s,x)=>s+x.qty,0), harga: k.saldoLayers.length ? k.saldoLayers.reduce((s,x)=>s+x.qty*x.harga,0)/k.saldoLayers.reduce((s,x)=>s+x.qty,0) : 0}];
      const maxRows = Math.max(keluarRows ? keluarRows.length : 1, saldoRows.length || 1);
      if(!keluarRows) {
        // Satu baris keluar (keluar dari 1 layer atau WA)
        const rowspan = saldoRows.length || 1;
        kartuHtml += `<tr>
          <td rowspan="${rowspan}" style="font-size:11px">${k.tgl}</td>
          <td rowspan="${rowspan}" style="font-size:12px">${k.ket}</td>
          <td rowspan="${rowspan}" style="border-left:1px solid var(--border)" class="num"></td>
          <td rowspan="${rowspan}" class="num"></td>
          <td rowspan="${rowspan}" class="num"></td>
          <td rowspan="${rowspan}" style="border-left:1px solid var(--border)" class="num">${k.kQty}</td>
          <td rowspan="${rowspan}" class="num kredit">${rp(k.kHarga)}</td>
          <td style="border-left:1px solid var(--border)" class="num">${saldoRows[0]?.qty||0}</td>
          <td class="num">${rp(saldoRows[0]?.harga||0)}</td>
          <td class="num">${rp((saldoRows[0]?.qty||0)*(saldoRows[0]?.harga||0))}</td>
        </tr>`;
        for(let i=1;i<saldoRows.length;i++) {
          kartuHtml += `<tr>
            <td style="border-left:1px solid var(--border)" class="num">${saldoRows[i].qty}</td>
            <td class="num">${rp(saldoRows[i].harga)}</td>
            <td class="num">${rp(saldoRows[i].qty*saldoRows[i].harga)}</td>
          </tr>`;
        }
      } else {
        // Multi baris keluar (FIFO/LIFO ambil dari beberapa layer)
        const rowspan = maxRows;
        kartuHtml += `<tr>
          <td rowspan="${rowspan}" style="font-size:11px">${k.tgl}</td>
          <td rowspan="${rowspan}" style="font-size:12px">${k.ket}</td>
          <td rowspan="${rowspan}" style="border-left:1px solid var(--border)" class="num"></td>
          <td rowspan="${rowspan}" class="num"></td>
          <td rowspan="${rowspan}" class="num"></td>
          <td style="border-left:1px solid var(--border)" class="num">${keluarRows[0].qty}</td>
          <td class="num kredit">${rp(keluarRows[0].harga)}</td>
          <td style="border-left:1px solid var(--border)" class="num">${saldoRows[0]?.qty||''}</td>
          <td class="num">${saldoRows[0]?.harga?rp(saldoRows[0].harga):''}</td>
          <td class="num">${saldoRows[0]?.qty?rp(saldoRows[0].qty*saldoRows[0].harga):''}</td>
        </tr>`;
        for(let i=1;i<maxRows;i++) {
          const kr = keluarRows[i] || null;
          const sr = saldoRows[i] || null;
          kartuHtml += `<tr>
            <td style="border-left:1px solid var(--border)" class="num">${kr?kr.qty:''}</td>
            <td class="num kredit">${kr?rp(kr.harga):''}</td>
            <td style="border-left:1px solid var(--border)" class="num">${sr?sr.qty:''}</td>
            <td class="num">${sr?rp(sr.harga):''}</td>
            <td class="num">${sr?rp(sr.qty*sr.harga):''}</td>
          </tr>`;
        }
      }
    }
  });
  document.getElementById('inv-kartu-body').innerHTML = kartuHtml;

  // Simpan data untuk kartu stock
  window._invHpp = hpp;
  window._invKartu = kartu;
  window._invMetode = metode;
  window._invStockLayers = stock.map(x=>({...x}));

  // Auto-add input button (ke kartu stock)
  setTimeout(addInputBtnToPersediaan, 80);
}

// ===== END KARTU STOCK =====

// BUNGA
function switchBungaTab(id, el) {
  if (document.getElementById('page-kalk-bunga')?.dataset.reactManaged === '1') {
    window.dispatchEvent(new CustomEvent('oas:kalk-sync', { detail: { kind: 'bunga-tab', tab: id } }));
    return;
  }
  ['tunggal','anuitas','pv','diskonto'].forEach(x => document.getElementById('bunga-'+x).style.display='none');
  document.getElementById('bunga-'+id).style.display='block';
  document.querySelectorAll('#bunga-tabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
}

function hitungBunga() {
  if (document.getElementById('page-kalk-bunga')?.dataset.reactManaged === '1') {
    window.dispatchEvent(new CustomEvent('oas:kalk-sync', { detail: { kind: 'bunga' } }));
    return;
  }
  const pokok = parseFloat(document.getElementById('bt-pokok').value)||0;
  const rateAnn = parseFloat(document.getElementById('bt-rate').value)||0;
  const n = parseFloat(document.getElementById('bt-n').value)||0;
  const satuan = document.getElementById('bt-satuan').value;
  const jenis = document.getElementById('bt-jenis').value;
  if(!pokok||!rateAnn||!n) return;

  const el = document.getElementById('bt-hasil');
  const wrap = document.getElementById('bt-tabel-wrap');
  const tbody = document.getElementById('bt-tabel-body');

  if (typeof window !== 'undefined' && window.__oasLib && window.__oasLib.hitungBungaPure) {
    const res = window.__oasLib.hitungBungaPure({ pokok, rateAnn, n, satuan, jenis });
    if (jenis === 'tunggal') {
      el.innerHTML = resRow('Pokok',rp(res.pokok)) + resRow('Total Bunga',rp(res.totalBunga)) + resRow('FV / Nilai Akhir',rp(res.fv)) + resRow('Bunga per '+satuan, rp(res.bungaPerSatuan||0));
      wrap.style.display='block';
      tbody.innerHTML = res.tabel.map(row => `<tr><td>${row.periode}</td><td class="num">${rp(row.saldoAwal)}</td><td class="debit">${rp(row.bunga)}</td><td class="num">${rp(row.saldoAkhir)}</td></tr>`).join('');
    } else if (jenis.startsWith('majemuk')) {
      el.innerHTML = resRow('Pokok',rp(res.pokok)) + resRow('Total Bunga',rp(res.totalBunga)) + resRow('FV',rp(res.fv)) + resRow('Suku Bunga Efektif',pct(res.rEfektifPct||0));
      wrap.style.display='block';
      tbody.innerHTML = res.tabel.map(row => `<tr><td>${row.periode}</td><td class="num">${rp(row.saldoAwal)}</td><td class="debit">${rp(row.bunga)}</td><td class="num">${rp(row.saldoAkhir)}</td></tr>`).join('');
    } else if (jenis === 'efektif-menurun') {
      el.innerHTML = resRow('Cicilan/Bulan',rp(res.cicilanBulan||0)) + resRow('Suku Bunga Flat Setara',pct(res.rFlatSetaraPct||0)) + resRow('Total Bayar',rp(res.totalBayar||res.fv)) + resRow('Total Bunga',rp(res.totalBunga));
    }
    return;
  }

  // convert to years
  const nTahun = satuan==='tahun'?n : satuan==='bulan'?n/12 : n/365;
  const r = rateAnn/100;
  let fv, totalBunga, tabel = [];

  if(jenis === 'tunggal') {
    fv = pokok * (1 + r * nTahun);
    totalBunga = fv - pokok;
    el.innerHTML = resRow('Pokok',rp(pokok)) + resRow('Total Bunga',rp(totalBunga)) + resRow('FV / Nilai Akhir',rp(fv)) + resRow('Bunga per '+satuan, rp(totalBunga/n));
    wrap.style.display='block';
    let saldo = pokok;
    for(let i=1;i<=Math.min(n,120);i++) {
      const bunga = pokok * r * (satuan==='tahun'?1:satuan==='bulan'?1/12:1/365);
      saldo += bunga;
      tabel.push(`<tr><td>${i}</td><td class="num">${rp(saldo-bunga)}</td><td class="debit">${rp(bunga)}</td><td class="num">${rp(saldo)}</td></tr>`);
    }
    tbody.innerHTML = tabel.join('');
  } else if(jenis.startsWith('majemuk')) {
    const m = jenis==='majemuk-tahunan'?1:jenis==='majemuk-semesteran'?2:jenis==='majemuk-triwulanan'?4:12;
    fv = pokok * Math.pow(1 + r/m, m*nTahun);
    totalBunga = fv - pokok;
    const rEfektif = Math.pow(1+r/m,m) - 1;
    el.innerHTML = resRow('Pokok',rp(pokok)) + resRow('Total Bunga',rp(totalBunga)) + resRow('FV',rp(fv)) + resRow('Suku Bunga Efektif',pct(rEfektif*100));
    wrap.style.display='block';
    let saldo=pokok;
    const rPeriode = r/m;
    const totalPeriode = Math.round(m*nTahun);
    for(let i=1;i<=Math.min(totalPeriode,120);i++) {
      const bunga = saldo*rPeriode;
      saldo += bunga;
      tabel.push(`<tr><td>${i}</td><td class="num">${rp(saldo-bunga)}</td><td class="debit">${rp(bunga)}</td><td class="num">${rp(saldo)}</td></tr>`);
    }
    tbody.innerHTML = tabel.join('');
  } else if(jenis === 'efektif-menurun') {
    const rBulanan = r/12;
    const tenor = Math.round(nTahun*12);
    const cicilan = pokok * rBulanan / (1-Math.pow(1+rBulanan,-tenor));
    const totalBayar = cicilan * tenor;
    const rFlat = (totalBayar - pokok) / pokok / nTahun * 100;
    el.innerHTML = resRow('Cicilan/Bulan',rp(cicilan)) + resRow('Suku Bunga Flat Setara',pct(rFlat)) + resRow('Total Bayar',rp(totalBayar)) + resRow('Total Bunga',rp(totalBayar-pokok));
  }
}

function hitungAnuitas() {
  if (document.getElementById('page-kalk-bunga')?.dataset.reactManaged === '1') {
    window.dispatchEvent(new CustomEvent('oas:kalk-sync', { detail: { kind: 'anuitas' } }));
    return;
  }
  const pokok = parseFloat(document.getElementById('an-pokok').value)||0;
  const dp = parseFloat(document.getElementById('an-dp').value)||0;
  const rateAnn = parseFloat(document.getElementById('an-rate').value)||0;
  const tenor = parseInt(document.getElementById('an-tenor').value)||0;
  const biaya = parseFloat(document.getElementById('an-biaya').value)||0;
  const jenis = document.getElementById('an-jenis').value;
  if(!pokok||!rateAnn||!tenor) return;

  const el = document.getElementById('an-hasil');
  const wrap = document.getElementById('an-tabel-wrap');
  const tbody = document.getElementById('an-tabel-body');

  if (typeof window !== 'undefined' && window.__oasLib && window.__oasLib.hitungAnuitasPure) {
    const res = window.__oasLib.hitungAnuitasPure({ pokok, dp, rateAnn, tenor, biaya, jenis });
    if (jenis === 'anuitas') {
      el.innerHTML = resRow('Cicilan / Bulan',rp(res.cicilanBulan)) + resRow('Total Bunga',rp(res.totalBunga)) + resRow('Total Bayar (incl DP+biaya)',rp(res.totalBayar)) + resRow('Efektif Suku Bunga',pct(rateAnn));
    } else if (jenis === 'flat') {
      const pokokPerBln = res.pinjaman / tenor;
      const bungaPerBln = res.pinjaman * rateAnn / 100 / 12;
      el.innerHTML = resRow('Cicilan / Bulan',rp(res.cicilanBulan)) + resRow('Pokok / Bulan',rp(pokokPerBln)) + resRow('Bunga / Bulan',rp(bungaPerBln)) + resRow('Total Bunga',rp(res.totalBunga));
    } else {
      el.innerHTML = resRow('Cicilan Pertama',rp(res.cicilanBulan)) + resRow('Total Bunga',rp(res.totalBunga)) + resRow('Total Bayar',rp(res.totalBayar));
    }
    wrap.style.display='block';
    tbody.innerHTML = res.tabel.map(row => `<tr><td>${row.periode}</td><td class="num">${rp(row.saldoAwal)}</td><td class="debit">${rp(row.pokok)}</td><td class="kredit">${rp(row.bunga)}</td><td class="num">${rp(row.cicilan)}</td><td class="num">${rp(row.saldoAkhir)}</td></tr>`).join('');
    setTimeout(addInputBtnToAnuitas, 80);
    return;
  }

  const pinjaman = pokok - dp;
  const rBln = rateAnn/100/12;
  let tabel = [];

  if(jenis === 'anuitas') {
    const cicilan = pinjaman * rBln / (1-Math.pow(1+rBln,-tenor));
    const totalBayar = cicilan*tenor + dp + biaya;
    const totalBunga = cicilan*tenor - pinjaman;
    el.innerHTML = resRow('Cicilan / Bulan',rp(cicilan)) + resRow('Total Bunga',rp(totalBunga)) + resRow('Total Bayar (incl DP+biaya)',rp(totalBayar)) + resRow('Efektif Suku Bunga',pct(rateAnn));
    wrap.style.display='block';
    let saldo=pinjaman;
    for(let i=1;i<=Math.min(tenor,360);i++) {
      const bunga = saldo*rBln;
      const pokok_i = cicilan-bunga;
      saldo -= pokok_i;
      tabel.push(`<tr><td>${i}</td><td class="num">${rp(saldo+pokok_i)}</td><td class="debit">${rp(pokok_i)}</td><td class="kredit">${rp(bunga)}</td><td class="num">${rp(cicilan)}</td><td class="num">${rp(Math.max(0,saldo))}</td></tr>`);
    }
  } else if(jenis === 'flat') {
    const bungaPerBln = pinjaman * rateAnn/100/12;
    const pokokPerBln = pinjaman/tenor;
    const cicilan = pokokPerBln+bungaPerBln;
    const totalBunga = bungaPerBln*tenor;
    el.innerHTML = resRow('Cicilan / Bulan',rp(cicilan)) + resRow('Pokok / Bulan',rp(pokokPerBln)) + resRow('Bunga / Bulan',rp(bungaPerBln)) + resRow('Total Bunga',rp(totalBunga));
    wrap.style.display='block';
    let saldo=pinjaman;
    for(let i=1;i<=Math.min(tenor,360);i++) {
      saldo -= pokokPerBln;
      tabel.push(`<tr><td>${i}</td><td class="num">${rp(saldo+pokokPerBln)}</td><td class="debit">${rp(pokokPerBln)}</td><td class="kredit">${rp(bungaPerBln)}</td><td class="num">${rp(cicilan)}</td><td class="num">${rp(Math.max(0,saldo))}</td></tr>`);
    }
  } else { // efektif
    let saldo=pinjaman, totalBunga=0;
    for(let i=1;i<=Math.min(tenor,360);i++) {
      const bunga=saldo*rBln;
      const pkok=pinjaman/tenor;
      const cic=pkok+bunga;
      totalBunga+=bunga;
      const nbaru=saldo-pkok;
      tabel.push(`<tr><td>${i}</td><td class="num">${rp(saldo)}</td><td class="debit">${rp(pkok)}</td><td class="kredit">${rp(bunga)}</td><td class="num">${rp(cic)}</td><td class="num">${rp(Math.max(0,nbaru))}</td></tr>`);
      saldo=nbaru;
    }
    const cicilanAwal = pinjaman/tenor + pinjaman*rBln;
    el.innerHTML = resRow('Cicilan Pertama',rp(cicilanAwal)) + resRow('Total Bunga',rp(totalBunga)) + resRow('Total Bayar',rp(pinjaman+totalBunga));
    wrap.style.display='block';
  }
  tbody.innerHTML = tabel.join('');

  // Auto-add input button
  setTimeout(addInputBtnToAnuitas, 80);
}

function hitungPV() {
  if (document.getElementById('page-kalk-bunga')?.dataset.reactManaged === '1') {
    window.dispatchEvent(new CustomEvent('oas:kalk-sync', { detail: { kind: 'pv' } }));
    return;
  }
  const mode = document.getElementById('pv-mode').value;
  const PV = parseFloat(document.getElementById('pv-pv').value)||0;
  const FV = parseFloat(document.getElementById('pv-fv').value)||0;
  const ratePct = parseFloat(document.getElementById('pv-r').value)||0;
  const r = ratePct/100;
  const n = parseFloat(document.getElementById('pv-n').value)||0;
  const pmt = parseFloat(document.getElementById('pv-pmt').value)||0;
  const m = parseInt(document.getElementById('pv-m').value)||1;
  const el = document.getElementById('pv-hasil');

  if(mode === 'fv' && !PV && !r && !n) return;
  if(mode === 'pv' && !FV && !r && !n) return;
  if(mode === 'rate' && (!PV || !FV || !n)) return;
  if(mode === 'n' && (!PV || !FV || !r)) return;

  if (typeof window !== 'undefined' && window.__oasLib && window.__oasLib.hitungPvPure) {
    const res = window.__oasLib.hitungPvPure({ mode, pv: PV, fv: FV, ratePct, n, pmt, m });
    if (mode === 'fv') {
      el.innerHTML = resRow('Future Value (Lump Sum)',rp(res.fvLump||0)) + (pmt?resRow('FV Anuitas',rp(res.fvAnn||0)):'') + resRow('Total FV',rp(res.totalFv||0)) + resRow('Keuntungan',rp(res.keuntungan||0));
    } else if (mode === 'pv') {
      el.innerHTML = resRow('Present Value',rp(res.pvCalc||0)) + (pmt?resRow('PV Anuitas',rp(res.pvAnn||0)):'') + resRow('Total PV',rp(res.totalPv||0)) + resRow('Faktor Diskonto',(res.faktorDiskontoPct||0).toFixed(4)+'%');
    } else if (mode === 'rate') {
      el.innerHTML = resRow('Suku Bunga / Tahun',pct(res.ratePerTahunPct||0)) + resRow('Suku Bunga / Periode',pct(res.ratePerPeriodePct||0));
    } else if (mode === 'n') {
      el.innerHTML = resRow('Jangka Waktu (Tahun)',(res.nTahun||0).toFixed(4)) + resRow('Jangka Waktu (Bulan)',(res.nBulan||0).toFixed(2));
    }
    return;
  }

  if(mode === 'fv') {
    const fvLump = PV * Math.pow(1+r/m, m*n);
    const fvAnn = pmt>0 ? pmt * (Math.pow(1+r/m,m*n)-1)/(r/m) : 0;
    const total = fvLump + fvAnn;
    el.innerHTML = resRow('Future Value (Lump Sum)',rp(fvLump)) + (pmt?resRow('FV Anuitas',rp(fvAnn)):'') + resRow('Total FV',rp(total)) + resRow('Keuntungan',rp(total-PV-(pmt*m*n)));
  } else if(mode === 'pv') {
    const pvCalc = FV / Math.pow(1+r/m, m*n);
    const pvAnn = pmt>0 ? pmt * (1-Math.pow(1+r/m,-m*n))/(r/m) : 0;
    el.innerHTML = resRow('Present Value',rp(pvCalc)) + (pmt?resRow('PV Anuitas',rp(pvAnn)):'') + resRow('Total PV',rp(pvCalc+pvAnn)) + resRow('Faktor Diskonto',((pvCalc/FV)*100).toFixed(4)+'%');
  } else if(mode === 'rate') {
    const rCalc = (Math.pow(FV/PV, 1/(m*n)) - 1) * m * 100;
    el.innerHTML = resRow('Suku Bunga / Tahun',pct(rCalc)) + resRow('Suku Bunga / Periode',pct(rCalc/m));
  } else if(mode === 'n') {
    const nCalc = Math.log(FV/PV) / (m*Math.log(1+r/m));
    el.innerHTML = resRow('Jangka Waktu (Tahun)',nCalc.toFixed(4)) + resRow('Jangka Waktu (Bulan)',(nCalc*12).toFixed(2));
  }
}

function hitungDiskonto() {
  if (document.getElementById('page-kalk-bunga')?.dataset.reactManaged === '1') {
    window.dispatchEvent(new CustomEvent('oas:kalk-sync', { detail: { kind: 'diskonto' } }));
    return;
  }
  const nominal = parseFloat(document.getElementById('dk-nominal').value)||0;
  const ratePct = parseFloat(document.getElementById('dk-rate').value)||0;
  const rate = ratePct/100;
  const hari = parseFloat(document.getElementById('dk-hari').value)||0;
  const bungaWeselPct = parseFloat(document.getElementById('dk-bunga-wesel').value)||0;
  const bungaWesel = bungaWeselPct/100;
  const basis = parseInt(document.getElementById('dk-basis').value)||360;
  if(!nominal||!rate||!hari) return;

  const el = document.getElementById('dk-hasil');
  if (typeof window !== 'undefined' && window.__oasLib && window.__oasLib.hitungDiskontoPure) {
    const res = window.__oasLib.hitungDiskontoPure({ nominal, ratePct, hari, bungaWeselPct, basis });
    el.innerHTML = resRow('Nilai Nominal Wesel',rp(res.nominal))
      + (bungaWesel?resRow('Bunga Wesel',rp(res.bungaWesel)):'')
      + resRow('Nilai Jatuh Tempo',rp(res.nilaiJatuhTempo))
      + resRow('Diskonto',rp(res.diskonto))
      + resRow('Hasil Bersih Diterima',`<span style="color:var(--accent);font-size:18px">${rp(res.hasilBersih)}</span>`)
      + resRow('Tarif Efektif',pct(res.tarifEfektifPct));
    return;
  }

  const nilaiJatuhTempo = nominal * (1 + bungaWesel * hari/basis);
  const diskonto = nilaiJatuhTempo * rate * hari/basis;
  const hasilBersih = nilaiJatuhTempo - diskonto;
  el.innerHTML = resRow('Nilai Nominal Wesel',rp(nominal))
    + (bungaWesel?resRow('Bunga Wesel',rp(nilaiJatuhTempo-nominal)):'')
    + resRow('Nilai Jatuh Tempo',rp(nilaiJatuhTempo))
    + resRow('Diskonto',rp(diskonto))
    + resRow('Hasil Bersih Diterima',`<span style="color:var(--accent);font-size:18px">${rp(hasilBersih)}</span>`)
    + resRow('Tarif Efektif',pct(((diskonto/hasilBersih)*(basis/hari)*100)));
}

// RASIO KEUANGAN
function hitungRasio() {
  if (document.getElementById('page-kalk-rasio')?.dataset.reactManaged === '1') {
    window.dispatchEvent(new CustomEvent('oas:kalk-sync', { detail: { kind: 'rasio' } }));
    return;
  }
  // g(): baca .value, fallback ke 0
  const g = id => { const el = document.getElementById(id); return el ? (parseFloat(el.value)||0) : 0; };
  // Helper row untuk nilai format string Rp (bypass parseFloat di rasioRow)
  const rasioRowStr = (nama, nilaiStr, keterangan) =>
    `<tr class="rasio-row"><td>${nama}</td><td>${nilaiStr}</td><td>${keterangan}</td></tr>`;

  // Baca semua field input MANUAL
  const kas=g('rs-kas'), piutang=g('rs-piutang'), pers=g('rs-persediaan');
  const asetT=g('rs-aset-tetap');
  const utangL=g('rs-utang-lancar'), utangP=g('rs-utang-panjang');
  const ekuitas=g('rs-ekuitas');
  const penjualan=g('rs-penjualan'), hpp=g('rs-hpp');
  const ebit=g('rs-ebit');
  const bBunga=g('rs-beban-bunga');
  const saham=g('rs-saham'), hargaSaham=g('rs-harga-saham');

  const _lbManual = g('rs-laba-bersih');
  const setCalc = (id, val) => {
    const el = document.getElementById(id);
    if (el && !(parseFloat(el.value) > 0) && val > 0) {
      el.placeholder = val.toLocaleString('id-ID');
    }
  };

  if (typeof window !== 'undefined' && window.__oasLib && window.__oasLib.hitungRasioPure) {
    const res = window.__oasLib.hitungRasioPure({
      kas, piutang, persediaan: pers, asetTetap: asetT,
      utangLancar: utangL, utangPanjang: utangP, ekuitas,
      penjualan, hpp, ebit, bebanBunga: bBunga, saham, hargaSaham,
      asetLancar: g('rs-aset-lancar'), labaKotor: g('rs-laba-kotor'),
      totalLiab: g('rs-total-liab'), totalAset: g('rs-total-aset'),
      labaBersih: _lbManual,
    });
    setCalc('rs-aset-lancar', res.asetLancar);
    setCalc('rs-laba-kotor', res.labaKotor);
    setCalc('rs-total-liab', res.totalLiab);
    setCalc('rs-total-aset', res.totalAset);
    if (res.labaBersihFinal > 0 && _lbManual === 0) setCalc('rs-laba-bersih', res.labaBersihFinal);

    document.getElementById('rasio-likuiditas').innerHTML = [
      rasioRow('Current Ratio', res.currentRatio.toFixed(2), 'x', {ok:2,warn:1}, 'Baik ≥ 2x'),
      rasioRow('Quick Ratio', res.quickRatio.toFixed(2), 'x', {ok:1,warn:0.5}, 'Baik ≥ 1x'),
      rasioRow('Cash Ratio', res.cashRatio.toFixed(2), 'x', {ok:0.5,warn:0.2}, 'Baik ≥ 0.5x'),
      rasioRowStr('Net Working Capital', rp(res.netWorkingCapital), 'Modal kerja bersih'),
    ].join('');
    document.getElementById('rasio-solvabilitas').innerHTML = [
      rasioRow('Debt to Equity (DER)', res.der.toFixed(2), 'x', {ok:1,warn:2}, 'Baik ≤ 1x'),
      rasioRow('Debt to Assets (DAR)', pct(res.dar*100), '', {ok:50,warn:70}, 'Baik < 50%'),
      rasioRow('Equity Multiplier', res.equityMultiplier.toFixed(2), 'x', null, ''),
      res.interestCoverage!==null ? rasioRow('Interest Coverage (ICR)', res.interestCoverage.toFixed(2), 'x', {ok:3,warn:1.5}, 'Baik ≥ 3x') : '',
      rasioRow('Long-term Debt Ratio', res.longTermDebtRatio.toFixed(2), 'x', null, 'Utang JP / (Utang JP + Ekuitas)'),
    ].join('');
    document.getElementById('rasio-profitabilitas').innerHTML = [
      rasioRow('Gross Profit Margin', pct(res.grossProfitMarginPct), '', {ok:30,warn:15}, 'Baik ≥ 30%'),
      rasioRow('Net Profit Margin (NPM)', pct(res.netProfitMarginPct), '', {ok:10,warn:5}, 'Baik ≥ 10%'),
      rasioRow('Return on Assets (ROA)', pct(res.roaPct), '', {ok:5,warn:2}, 'Baik ≥ 5%'),
      rasioRow('Return on Equity (ROE)', pct(res.roePct), '', {ok:15,warn:8}, 'Baik ≥ 15%'),
      rasioRow('EBIT Margin', pct(res.ebitMarginPct), '', {ok:15,warn:8}, 'Laba operasi/penjualan'),
      rasioRow('Return on Sales', pct(res.netProfitMarginPct), '', null, ''),
    ].join('');
    document.getElementById('rasio-aktivitas').innerHTML = [
      rasioRow('Perputaran Piutang', res.perputaranPiutang.toFixed(2), 'x', {ok:8,warn:4}, 'Makin tinggi makin baik'),
      rasioRow('Days Sales Outstanding (DSO)', res.dso.toFixed(1), 'hari', {ok:45,warn:60}, 'Makin kecil makin baik'),
      rasioRow('Perputaran Persediaan', res.perputaranPersediaan.toFixed(2), 'x', {ok:6,warn:3}, 'Makin tinggi makin baik'),
      rasioRow('Days of Inventory (DOH)', res.doh.toFixed(1), 'hari', null, 'Rata-rata lama simpan'),
      rasioRow('Asset Turnover', res.assetTurnover.toFixed(2), 'x', {ok:1,warn:0.5}, ''),
      rasioRow('Fixed Asset Turnover', res.fixedAssetTurnover.toFixed(2), 'x', {ok:2,warn:1}, ''),
    ].join('');
    document.getElementById('rasio-pasar').innerHTML = [
      rasioRowStr('EPS (Earning per Share)', res.eps !== null ? rp(res.eps) : '—', 'Laba per lembar saham'),
      rasioRow('Price to Earning (PER)', res.per !== null ? res.per.toFixed(2) : '—', res.per !== null ? 'x' : '', {ok:15,warn:25}, 'Valuasi saham'),
      rasioRow('Price to Book Value (PBV)', res.pbv !== null ? res.pbv.toFixed(2) : '—', res.pbv !== null ? 'x' : '', {ok:1,warn:3}, 'Nilai pasar vs buku'),
      rasioRowStr('Book Value per Share', res.bvps !== null ? rp(res.bvps) : '—', 'Nilai buku per saham'),
      rasioRowStr('Market Cap', res.marketCap !== null ? rp(res.marketCap) : '—', 'Kapitalisasi pasar'),
      rasioRowStr('Dividend per Share', '—', 'Isi manual jika ada'),
    ].join('');
    return;
  }

  // Hitung field turunan — fallback jika bridge belum siap
  const asetL      = g('rs-aset-lancar') > 0 ? g('rs-aset-lancar') : kas + piutang + pers;
  const labaKotor  = g('rs-laba-kotor')  > 0 ? g('rs-laba-kotor')  : penjualan - hpp;
  const totalLiab  = g('rs-total-liab')  > 0 ? g('rs-total-liab')  : utangL + utangP;
  const totalAset  = g('rs-total-aset')  > 0 ? g('rs-total-aset')  : asetL + asetT;

  const labaBersihFinal = _lbManual > 0
    ? _lbManual
    : (ebit > 0 ? Math.max(0, ebit - bBunga) : 0);

  setCalc('rs-aset-lancar', asetL);
  setCalc('rs-laba-kotor', labaKotor);
  setCalc('rs-total-liab', totalLiab);
  setCalc('rs-total-aset', totalAset);
  if (labaBersihFinal > 0 && _lbManual === 0) setCalc('rs-laba-bersih', labaBersihFinal);

  const r = (a,b) => b ? a/b : 0;
  const quickAsset = Math.max(0, asetL - pers);

  document.getElementById('rasio-likuiditas').innerHTML = [
    rasioRow('Current Ratio', r(asetL,utangL).toFixed(2), 'x', {ok:2,warn:1}, 'Baik ≥ 2x'),
    rasioRow('Quick Ratio', r(quickAsset,utangL).toFixed(2), 'x', {ok:1,warn:0.5}, 'Baik ≥ 1x'),
    rasioRow('Cash Ratio', r(kas,utangL).toFixed(2), 'x', {ok:0.5,warn:0.2}, 'Baik ≥ 0.5x'),
    rasioRowStr('Net Working Capital', rp(asetL-utangL), 'Modal kerja bersih'),
  ].join('');

  const der = r(totalLiab,ekuitas);
  const dar = r(totalLiab,totalAset);
  const ier = bBunga ? r(ebit,bBunga) : null;
  document.getElementById('rasio-solvabilitas').innerHTML = [
    rasioRow('Debt to Equity (DER)', der.toFixed(2), 'x', {ok:1,warn:2}, 'Baik ≤ 1x'),
    rasioRow('Debt to Assets (DAR)', pct(dar*100), '', {ok:50,warn:70}, 'Baik < 50%'),
    rasioRow('Equity Multiplier', r(totalAset,ekuitas).toFixed(2), 'x', null, ''),
    ier!==null ? rasioRow('Interest Coverage (ICR)', ier.toFixed(2), 'x', {ok:3,warn:1.5}, 'Baik ≥ 3x') : '',
    rasioRow('Long-term Debt Ratio', r(utangP, utangP+ekuitas).toFixed(2), 'x', null, 'Utang JP / (Utang JP + Ekuitas)'),
  ].join('');

  document.getElementById('rasio-profitabilitas').innerHTML = [
    rasioRow('Gross Profit Margin', pct(r(labaKotor,penjualan)*100), '', {ok:30,warn:15}, 'Baik ≥ 30%'),
    rasioRow('Net Profit Margin (NPM)', pct(r(labaBersihFinal,penjualan)*100), '', {ok:10,warn:5}, 'Baik ≥ 10%'),
    rasioRow('Return on Assets (ROA)', pct(r(labaBersihFinal,totalAset)*100), '', {ok:5,warn:2}, 'Baik ≥ 5%'),
    rasioRow('Return on Equity (ROE)', pct(r(labaBersihFinal,ekuitas)*100), '', {ok:15,warn:8}, 'Baik ≥ 15%'),
    rasioRow('EBIT Margin', pct(r(ebit,penjualan)*100), '', {ok:15,warn:8}, 'Laba operasi/penjualan'),
    rasioRow('Return on Sales', pct(r(labaBersihFinal,penjualan)*100), '', null, ''),
  ].join('');

  const perputaranPiutang = r(penjualan,piutang);
  const dso = perputaranPiutang ? 365/perputaranPiutang : 0;
  const perputaranPers = r(hpp,pers);
  const doh = perputaranPers ? 365/perputaranPers : 0;
  document.getElementById('rasio-aktivitas').innerHTML = [
    rasioRow('Perputaran Piutang', perputaranPiutang.toFixed(2), 'x', {ok:8,warn:4}, 'Makin tinggi makin baik'),
    rasioRow('Days Sales Outstanding (DSO)', dso.toFixed(1), 'hari', {ok:45,warn:60}, 'Makin kecil makin baik'),
    rasioRow('Perputaran Persediaan', perputaranPers.toFixed(2), 'x', {ok:6,warn:3}, 'Makin tinggi makin baik'),
    rasioRow('Days of Inventory (DOH)', doh.toFixed(1), 'hari', null, 'Rata-rata lama simpan'),
    rasioRow('Asset Turnover', r(penjualan,totalAset).toFixed(2), 'x', {ok:1,warn:0.5}, ''),
    rasioRow('Fixed Asset Turnover', r(penjualan,asetT).toFixed(2), 'x', {ok:2,warn:1}, ''),
  ].join('');

  const eps = saham > 0 && labaBersihFinal > 0 ? labaBersihFinal / saham : null;
  const bvps = saham > 0 && ekuitas > 0 ? ekuitas / saham : null;
  const per = (eps !== null && hargaSaham > 0) ? hargaSaham / eps : null;
  const pbv = (bvps !== null && hargaSaham > 0) ? hargaSaham / bvps : null;
  const marketCap = saham > 0 && hargaSaham > 0 ? hargaSaham * saham : null;

  document.getElementById('rasio-pasar').innerHTML = [
    rasioRowStr('EPS (Earning per Share)', eps !== null ? rp(eps) : '—', 'Laba per lembar saham'),
    rasioRow('Price to Earning (PER)', per !== null ? per.toFixed(2) : '—', per !== null ? 'x' : '', {ok:15,warn:25}, 'Valuasi saham'),
    rasioRow('Price to Book Value (PBV)', pbv !== null ? pbv.toFixed(2) : '—', pbv !== null ? 'x' : '', {ok:1,warn:3}, 'Nilai pasar vs buku'),
    rasioRowStr('Book Value per Share', bvps !== null ? rp(bvps) : '—', 'Nilai buku per saham'),
    rasioRowStr('Market Cap', marketCap !== null ? rp(marketCap) : '—', 'Kapitalisasi pasar'),
    rasioRowStr('Dividend per Share', '—', 'Isi manual jika ada'),
  ].join('');
}

// BEP
function hitungBEP() {
  if (document.getElementById('page-kalk-bep')?.dataset.reactManaged === '1') {
    window.dispatchEvent(new CustomEvent('oas:kalk-sync', { detail: { kind: 'bep' } }));
    return;
  }
  const harga = parseFloat(document.getElementById('bep-harga').value)||0;
  const bv = parseFloat(document.getElementById('bep-bv').value)||0;
  const bt = parseFloat(document.getElementById('bep-bt').value)||0;
  const vol = parseFloat(document.getElementById('bep-vol').value)||0;
  const target = parseFloat(document.getElementById('bep-target').value)||0;
  const pajakPct = parseFloat(document.getElementById('bep-pajak').value)||0;
  const pajak = pajakPct/100;
  if(!harga||!bt) return;

  const bauranStr = document.getElementById('bep-bauran').value.trim();

  if (typeof window !== 'undefined' && window.__oasLib && window.__oasLib.hitungBepPure) {
    const bauranInput = bauranStr ? bauranStr.split(',').map(s => {
      const parts = s.trim().split(':');
      return {nama:parts[0]||'', harga:parseFloat(parts[1])||0, bv:parseFloat(parts[2])||0, prop:parseFloat(parts[3])||0};
    }) : undefined;
    const res = window.__oasLib.hitungBepPure({ harga, bv, bt, vol, target, pajakPct, bauran: bauranInput });
    document.getElementById('bep-unit').textContent = res.bepUnit.toLocaleString('id-ID',{maximumFractionDigits:0});
    document.getElementById('bep-rp').textContent = rp(res.bepRp);
    document.getElementById('bep-cm').textContent = rp(res.cm);
    document.getElementById('bep-cmr').textContent = pct(res.cmr*100);
    document.getElementById('bep-detail-body').innerHTML = `
      <tr><td style="color:var(--muted);font-size:12px">Pendapatan Aktual</td><td class="num" style="text-align:right">${rp(res.pendapatan)}</td></tr>
      <tr><td style="color:var(--muted);font-size:12px">Laba Kotor</td><td class="debit" style="text-align:right">${rp(res.labaKotor)}</td></tr>
      <tr><td style="color:var(--muted);font-size:12px">Laba Bersih (after tax)</td><td class="debit" style="text-align:right">${rp(res.labaBersih)}</td></tr>
      <tr><td style="color:var(--muted);font-size:12px">Margin of Safety (unit)</td><td class="${res.mos>=0?'debit':'kredit'}" style="text-align:right">${res.mos.toLocaleString('id-ID',{maximumFractionDigits:0})}</td></tr>
      <tr><td style="color:var(--muted);font-size:12px">Margin of Safety (%)</td><td class="${res.mos>=0?'debit':'kredit'}" style="text-align:right">${pct(res.mosPct*100)}</td></tr>
      <tr><td style="color:var(--muted);font-size:12px">Degree of Operating Leverage</td><td class="num" style="text-align:right">${res.dol.toFixed(2)}x</td></tr>
      ${res.targetVol?`<tr><td style="color:var(--muted);font-size:12px">Volume utk target laba ${rp(target)}</td><td class="num" style="text-align:right">${Math.ceil(res.targetVol).toLocaleString('id-ID')} unit</td></tr>`:''}
    `;
    if (res.bauranItems && res.bauranItems.length) {
      const bauranWrap = document.getElementById('bep-bauran-wrap');
      bauranWrap.style.display='block';
      document.getElementById('bep-bauran-body').innerHTML = res.bauranItems.map(p =>
        `<tr><td>${escapeHtml(p.nama)}</td><td class="num">${rp(p.harga)}</td><td class="num">${rp(p.bv)}</td><td class="debit">${rp(p.cm)}</td><td>${(p.prop*100).toFixed(0)}%</td><td class="num">${rp(p.wmCm)}</td></tr>`
      ).join('') + `<tr style="border-top:2px solid var(--border);font-weight:700"><td colspan="4">BEP Bauran</td><td colspan="2" class="debit">${Math.ceil(res.bepBauranUnit||0).toLocaleString('id-ID')} unit</td></tr>`;
    }
    setTimeout(addInputBtnToBEP, 80);
    return;
  }

  const cm = harga - bv;
  const cmr = harga ? cm/harga : 0;
  const bepUnit = bt / cm;
  const bepRp = bt / cmr;
  const pendapatan = harga * vol;
  const labaKotor = cm * vol - bt;
  const labaBersih = labaKotor * (1-pajak);
  const mos = vol - bepUnit;
  const mosPct = vol ? mos/vol : 0;
  const dol = labaKotor ? (cm*vol)/labaKotor : 0;

  // target volume
  const targetVol = target > 0 ? (bt + target/(1-pajak)) / cm : null;

  document.getElementById('bep-unit').textContent = bepUnit.toLocaleString('id-ID',{maximumFractionDigits:0});
  document.getElementById('bep-rp').textContent = rp(bepRp);
  document.getElementById('bep-cm').textContent = rp(cm);
  document.getElementById('bep-cmr').textContent = pct(cmr*100);

  document.getElementById('bep-detail-body').innerHTML = `
    <tr><td style="color:var(--muted);font-size:12px">Pendapatan Aktual</td><td class="num" style="text-align:right">${rp(pendapatan)}</td></tr>
    <tr><td style="color:var(--muted);font-size:12px">Laba Kotor</td><td class="debit" style="text-align:right">${rp(labaKotor)}</td></tr>
    <tr><td style="color:var(--muted);font-size:12px">Laba Bersih (after tax)</td><td class="debit" style="text-align:right">${rp(labaBersih)}</td></tr>
    <tr><td style="color:var(--muted);font-size:12px">Margin of Safety (unit)</td><td class="${mos>=0?'debit':'kredit'}" style="text-align:right">${mos.toLocaleString('id-ID',{maximumFractionDigits:0})}</td></tr>
    <tr><td style="color:var(--muted);font-size:12px">Margin of Safety (%)</td><td class="${mos>=0?'debit':'kredit'}" style="text-align:right">${pct(mosPct*100)}</td></tr>
    <tr><td style="color:var(--muted);font-size:12px">Degree of Operating Leverage</td><td class="num" style="text-align:right">${dol.toFixed(2)}x</td></tr>
    ${targetVol?`<tr><td style="color:var(--muted);font-size:12px">Volume utk target laba ${rp(target)}</td><td class="num" style="text-align:right">${Math.ceil(targetVol).toLocaleString('id-ID')} unit</td></tr>`:''}
  `;

  // Bauran produk
  if(bauranStr) {
    const bauranWrap = document.getElementById('bep-bauran-wrap');
    bauranWrap.style.display='block';
    const produk = bauranStr.split(',').map(s=>{
      const parts = s.trim().split(':');
      return {nama:parts[0]||'', harga:parseFloat(parts[1])||0, bv:parseFloat(parts[2])||0, prop:parseFloat(parts[3])||0};
    });
    const wmCM = produk.reduce((s,p)=>(p.harga-p.bv)*p.prop+s,0);
    const bepBauranUnit = wmCM ? bt/wmCM : 0;
    document.getElementById('bep-bauran-body').innerHTML = produk.map(p=>{
      const cmP = p.harga-p.bv;
      const wmCmP = cmP*p.prop;
      return `<tr><td>${escapeHtml(p.nama)}</td><td class="num">${rp(p.harga)}</td><td class="num">${rp(p.bv)}</td><td class="debit">${rp(cmP)}</td><td>${(p.prop*100).toFixed(0)}%</td><td class="num">${rp(wmCmP)}</td></tr>`;
    }).join('') + `<tr style="border-top:2px solid var(--border);font-weight:700"><td colspan="4">BEP Bauran</td><td colspan="2" class="debit">${Math.ceil(bepBauranUnit).toLocaleString('id-ID')} unit</td></tr>`;
  }

  // Auto-add input button
  setTimeout(addInputBtnToBEP, 80);
}

// INIT KALKULATOR — DIPINDAH dari 04-navigasi-tema.js (harus dipanggil SETELAH
// resetInv() di atas ada, dan setelah konfirmasiInputJurnalKartu di
// 08-kartu-stock.js sudah dimuat — file ini load ke-12, setelah file 08 & 04)
(function initKalk(){
  const today = new Date().toISOString().split('T')[0];
  // seed persediaan
  resetInv();
  // set default dates
  ['py-tgl'].forEach(id=>{const el=document.getElementById(id);if(el)el.value=today;});

  // === Kartu Stock button wiring ===
  // clearKartuStock dipasang langsung via onclick di renderKartuStock (tombol di-render dinamis)

  var jurnalClose = document.getElementById('ks-jurnal-popup-close');
  if(jurnalClose) jurnalClose.addEventListener('click', function(){ document.getElementById('ks-jurnal-popup').style.display='none'; });

  var jurnalBatal = document.getElementById('ks-jurnal-popup-batal');
  if(jurnalBatal) jurnalBatal.addEventListener('click', function(){ document.getElementById('ks-jurnal-popup').style.display='none'; });

  var jurnalOk = document.getElementById('ks-jurnal-popup-ok');
  if(jurnalOk) jurnalOk.addEventListener('click', konfirmasiInputJurnalKartu);
})();
