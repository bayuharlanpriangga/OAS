
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
  if(!confirm(`Hapus jurnal dari "${kode}"?`)) return;
  // Remove in reverse order
  [...jurnalIndices].reverse().forEach(idx => jurnalEntries.splice(idx, 1));
  lastKalkInput = null;
  renderDashboard();
  renderJurnalUmum();
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Input "${kode}" berhasil di-undo`);
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
        jenis: 'Manual',
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
      tanggal: today, ket: `HPP periode BEP [${kode}]`, jenis: 'Manual',
      lines: [
        { akun: '5101', ket: 'HPP', debit: hpp, kredit: 0 },
        { akun: '1301', ket: 'Persediaan Barang Dagangan', debit: 0, kredit: hpp }
      ]
    });
  }
  if(bt > 0) {
    jurnals.push({
      tanggal: today, ket: `Beban tetap periode BEP [${kode}]`, jenis: 'Manual',
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
    tanggal: today, ket: `Pencairan pinjaman/kredit [${kode}]`, jenis: 'Manual',
    lines: [
      { akun: '1101', ket: 'Kas - penerimaan pinjaman', debit: pinjaman, kredit: 0 },
      { akun: '2801', ket: 'Utang Bank Jangka Panjang', debit: 0, kredit: pinjaman }
    ]
  });
  // Jurnal angsuran pertama
  jurnals.push({
    tanggal: today, ket: `Angsuran ke-1 pinjaman [${kode}]`, jenis: 'Manual',
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

// PPN → INPUT JURNAL
function inputPPNJurnal() {
  const nilai = parseFloat(document.getElementById('ppn-nilai').value)||0;
  const tarifSel = document.getElementById('ppn-tarif').value;
  const tarif = tarifSel==='custom' ? (parseFloat(document.getElementById('ppn-custom')?.value)||12)/100 : parseFloat(tarifSel)/100;
  const mode = document.getElementById('ppn-mode').value;
  if(!nilai) { showAlert('Hitung PPN dulu!'); return; }

  let dpp = mode==='eksklusif' ? nilai : nilai/(1+tarif);
  let ppn = dpp * tarif;
  const kode = nextKode('PPN');
  const today = new Date().toISOString().split('T')[0];

  // Jurnal PPN Keluaran (penjualan)
  const jurnal = {
    tanggal: today, ket: `PPN Keluaran ${(tarif*100).toFixed(0)}% [${kode}]`, jenis: 'Manual',
    lines: [
      { akun: '1101', ket: 'Kas / Piutang (termasuk PPN)', debit: Math.round(dpp+ppn), kredit: 0 },
      { akun: '4101', ket: 'Penjualan (DPP)', debit: 0, kredit: Math.round(dpp) },
      { akun: '2301', ket: 'Utang PPN Keluaran', debit: 0, kredit: Math.round(ppn) }
    ]
  };

  const beforeCount = jurnalEntries.length;
  checkAndInputKalkulator(kode, [jurnal],
    `Jurnal PPN Rp${Math.round(ppn).toLocaleString('id-ID')} (DPP Rp${Math.round(dpp).toLocaleString('id-ID')}) diinput`,
    (k) => {
      lastKalkInput = { kode: k, jurnalIndices: [beforeCount] };
      showKalkUndoBar(`PPN ${(tarif*100).toFixed(0)}%: Rp${Math.round(ppn).toLocaleString('id-ID')}`, k);
    }
  );
}

// PPH21 → INPUT JURNAL
function inputPPH21Jurnal() {
  const stored = window._lastPPh21;
  if (!stored || !stored.pph) { showAlert('Hitung PPh 21 dulu! Pastikan nilai PPh 21 sudah muncul di hasil.'); return; }
  const gaji = stored.gaji;
  const pph21 = Math.round(stored.pph);
  if (!gaji || !pph21) { showAlert('Nilai PPh 21 atau gaji tidak valid.'); return; }

  // Pilih akun beban sesuai kategori penerima
  const kat = stored.kategori || 'tetap';
  const bebanMap = {
    'tetap':          { akun: '6101', nama: 'Beban Gaji & Upah' },
    'tidak-tetap':    { akun: '6101', nama: 'Beban Gaji & Upah' },
    'komisaris':      { akun: '6108', nama: 'Beban Honorarium Komisaris' },
    'bukan-pegawai':  { akun: '6109', nama: 'Beban Jasa Profesional' },
    'peserta-kegiatan': { akun: '6110', nama: 'Beban Hadiah & Kegiatan' },
    'pensiun':        { akun: '6111', nama: 'Beban Tunjangan Pensiun' },
    'mantan-pegawai': { akun: '6112', nama: 'Beban Tantiem & Gratifikasi' },
  };
  const beban = bebanMap[kat] || bebanMap['tetap'];

  const kode = nextKode('P21');
  const today = new Date().toISOString().split('T')[0];

  const jurnal = {
    tanggal: today, ket: `${beban.nama} & PPh 21 [${kode}]`, jenis: 'Manual',
    lines: [
      { akun: beban.akun, ket: beban.nama, debit: gaji, kredit: 0 },
      { akun: '2302', ket: 'Utang PPh 21 (Karyawan)', debit: 0, kredit: pph21 },
      { akun: '2201', ket: 'Utang Gaji', debit: 0, kredit: gaji - pph21 }
    ]
  };

  const beforeCount = jurnalEntries.length;
  checkAndInputKalkulator(kode, [jurnal],
    `Jurnal ${beban.nama} Rp${gaji.toLocaleString('id-ID')} & PPh21 Rp${pph21.toLocaleString('id-ID')} diinput`,
    (k) => {
      lastKalkInput = { kode: k, jurnalIndices: [beforeCount] };
      showKalkUndoBar(`PPh21: ${beban.nama} Rp${gaji.toLocaleString('id-ID')}`, k);
    }
  );
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
    <button onclick="showPage('jurnal-umum')" style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.25);border-radius:6px;padding:5px 12px;cursor:pointer;color:var(--accent);font-size:12px;font-family:var(--sans);font-weight:600;flex-shrink:0;">[Jurnal Umum] Lihat</button>
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

// Add PPN & PPh21 input buttons to result areas dynamically
function addPajakInputBtns() {
  const ppnHasil = document.getElementById('ppn-hasil');
  if(ppnHasil && ppnHasil.innerHTML.includes('PPN Terutang') && !ppnHasil.querySelector('.kalk-input-bar')) {
    const bar = createKalkBar([{ label: '<i class="ti ti-download ti-inline"></i> Input Jurnal PPN', fn: 'inputPPNJurnal()', color:'green' }]);
    ppnHasil.appendChild(bar);
  }
  const pph21Hasil = document.getElementById('pph21-hasil');
  if(pph21Hasil && pph21Hasil.innerHTML.includes('PPh 21') && !pph21Hasil.querySelector('.kalk-input-bar')) {
    const bar = createKalkBar([{ label: '<i class="ti ti-download ti-inline"></i> Input Jurnal Gaji & PPh 21', fn: 'inputPPH21Jurnal()', color:'green' }]);
    pph21Hasil.appendChild(bar);
  }
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
function addPajakButtonsIfNeeded() {
  const ppnRes = document.getElementById('ppn-hasil');
  if(ppnRes && ppnRes.children.length > 0 && !document.getElementById('ppn-input-btn-bar')) {
    const bar = createKalkBar([{label:'<i class="ti ti-download ti-inline"></i> Input Jurnal PPN', fn:'inputPPNJurnal()', color:'green'}]);
    bar.id = 'ppn-input-btn-bar';
    ppnRes.appendChild(bar);
  }
  const pph21Res = document.getElementById('pph21-hasil');
  if(pph21Res && pph21Res.children.length > 0 && !document.getElementById('p21-input-btn-bar')) {
    const bar = createKalkBar([{label:'<i class="ti ti-download ti-inline"></i> Input Jurnal Gaji & PPh 21', fn:'inputPPH21Jurnal()', color:'green'}]);
    bar.id = 'p21-input-btn-bar';
    pph21Res.appendChild(bar);
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
function addInputBtnToPPN() {
  const res = document.getElementById('ppn-hasil');
  if(!res || res.innerHTML.length < 50 || document.getElementById('ppn-input-btn-bar')) return;
  const bar = createKalkBar([{label:'<i class="ti ti-download ti-inline"></i> Input Jurnal PPN Keluaran', fn:'inputPPNJurnal()', color:'green'}]);
  bar.id = 'ppn-input-btn-bar';
  res.appendChild(bar);
}
function addInputBtnToPPH21() {
  const res = document.getElementById('pph21-hasil');
  if(!res || res.innerHTML.length < 50 || document.getElementById('p21-input-btn-bar')) return;
  const bar = createKalkBar([{label:'<i class="ti ti-download ti-inline"></i> Input Jurnal Gaji & PPh 21', fn:'inputPPH21Jurnal()', color:'green'}]);
  bar.id = 'p21-input-btn-bar';
  res.appendChild(bar);
}

// PENYUSUTAN
function hitungPenyusutan() {
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

  const dasarPenyusutan = cost - sisa;
  let tabel = [];
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
    const totalUnit = parseFloat(document.getElementById('py-total-unit').value)||1;
    const unitPerTahunStr = document.getElementById('py-unit-per-tahun').value;
    const unitPerTahun = unitPerTahunStr.split(',').map(x=>parseFloat(x.trim())||0);
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

  // Summary
  const totalBeban = tabel.reduce((s,r)=>s+r.beban,0);
  document.getElementById('py-summary').innerHTML = `
    ${resRow('Harga Perolehan', rp(cost))}
    ${resRow('Nilai Sisa', rp(sisa))}
    ${resRow('Dasar Penyusutan', rp(dasarPenyusutan))}
    ${resRow('Umur Ekonomis', umur + ' Tahun')}
    ${resRow('Total Akumulasi', rp(totalBeban))}
    ${resRow('Rata-rata / Tahun', rp(totalBeban/umur))}
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
  let totalPendapatan = 0;
  let kartu = [];
  let adaHargaJual = false;

  rows.forEach(r => {
    if(r.jenis === 'masuk') {
      if(metode === 'wa') {
        // Weighted Average periodic: gabung jadi satu layer rata-rata
        const totalQty = stock.reduce((s,x)=>s+x.qty,0) + r.qty;
        const totalVal = stock.reduce((s,x)=>s+x.qty*x.harga,0) + r.qty*r.harga;
        const hargaWA = totalVal / totalQty;
        stock = [{qty: totalQty, harga: hargaWA}];
      } else if(metode === 'mwa') {
        // Moving WA: setiap masuk langsung rata-ratakan
        const totalQty = stock.reduce((s,x)=>s+x.qty,0) + r.qty;
        const totalVal = stock.reduce((s,x)=>s+x.qty*x.harga,0) + r.qty*r.harga;
        stock = [{qty: totalQty, harga: totalVal/totalQty}];
      } else {
        // FIFO & LIFO: simpan per layer terpisah
        stock.push({qty: r.qty, harga: r.harga});
      }
      // Snapshot saldo setelah masuk
      const saldoLayers = stock.filter(x=>x.qty>0).map(x=>({...x}));
      kartu.push({
        tgl:r.tgl, ket:r.ket||'masuk',
        mQty:r.qty, mHarga:r.harga, mJml:r.qty*r.harga,
        kQty:'', kHarga:'', kJml:'', kHargaJual:'', kLaba:'',
        saldoLayers
      });
    } else {
      // KELUAR
      let qKeluarSisa = r.qty;
      let hppBatch = 0;
      // Detail keluar per layer untuk ditampilkan di kartu
      let keluarLayers = []; // [{qty, hargaBeli}]

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
      // Harga rata-rata HPP per unit untuk display
      const hppPerUnit = r.qty ? hppBatch / r.qty : 0;

      const saldoLayers = stock.filter(x=>x.qty>0).map(x=>({...x}));
      kartu.push({
        tgl:r.tgl, ket:r.ket||'keluar',
        mQty:'', mHarga:'', mJml:'',
        kQty:r.qty, kHarga:hppPerUnit, kJml:hppBatch,
        keluarLayers, // detail FIFO/LIFO per layer
        saldoLayers
      });
    }
  });

  const akhirQty = stock.reduce((s,x)=>s+x.qty,0);
  const akhirVal = stock.reduce((s,x)=>s+x.qty*x.harga,0);

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
  ['tunggal','anuitas','pv','diskonto'].forEach(x => document.getElementById('bunga-'+x).style.display='none');
  document.getElementById('bunga-'+id).style.display='block';
  document.querySelectorAll('#bunga-tabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
}

function hitungBunga() {
  const pokok = parseFloat(document.getElementById('bt-pokok').value)||0;
  const rateAnn = parseFloat(document.getElementById('bt-rate').value)||0;
  const n = parseFloat(document.getElementById('bt-n').value)||0;
  const satuan = document.getElementById('bt-satuan').value;
  const jenis = document.getElementById('bt-jenis').value;
  if(!pokok||!rateAnn||!n) return;

  // convert to years
  const nTahun = satuan==='tahun'?n : satuan==='bulan'?n/12 : n/365;
  const r = rateAnn/100;
  const el = document.getElementById('bt-hasil');
  const wrap = document.getElementById('bt-tabel-wrap');
  const tbody = document.getElementById('bt-tabel-body');

  let fv, totalBunga, tabel = [];

  if(jenis === 'tunggal') {
    fv = pokok * (1 + r * nTahun);
    totalBunga = fv - pokok;
    el.innerHTML = resRow('Pokok',rp(pokok)) + resRow('Total Bunga',rp(totalBunga)) + resRow('FV / Nilai Akhir',rp(fv)) + resRow('Bunga per '+satuan, rp(totalBunga/n));
    // tabel per satuan
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
  const pokok = parseFloat(document.getElementById('an-pokok').value)||0;
  const dp = parseFloat(document.getElementById('an-dp').value)||0;
  const rateAnn = parseFloat(document.getElementById('an-rate').value)||0;
  const tenor = parseInt(document.getElementById('an-tenor').value)||0;
  const biaya = parseFloat(document.getElementById('an-biaya').value)||0;
  const jenis = document.getElementById('an-jenis').value;
  if(!pokok||!rateAnn||!tenor) return;

  const pinjaman = pokok - dp;
  const rBln = rateAnn/100/12;
  const el = document.getElementById('an-hasil');
  const wrap = document.getElementById('an-tabel-wrap');
  const tbody = document.getElementById('an-tabel-body');
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
  const mode = document.getElementById('pv-mode').value;
  const PV = parseFloat(document.getElementById('pv-pv').value)||0;
  const FV = parseFloat(document.getElementById('pv-fv').value)||0;
  const r = (parseFloat(document.getElementById('pv-r').value)||0)/100;
  const n = parseFloat(document.getElementById('pv-n').value)||0;
  const pmt = parseFloat(document.getElementById('pv-pmt').value)||0;
  const m = parseInt(document.getElementById('pv-m').value)||1;
  const el = document.getElementById('pv-hasil');

  if(mode === 'fv') {
    if(!PV&&!r&&!n) return;
    const fvLump = PV * Math.pow(1+r/m, m*n);
    // FV of annuity
    const fvAnn = pmt>0 ? pmt * (Math.pow(1+r/m,m*n)-1)/(r/m) : 0;
    const total = fvLump + fvAnn;
    el.innerHTML = resRow('Future Value (Lump Sum)',rp(fvLump)) + (pmt?resRow('FV Anuitas',rp(fvAnn)):'') + resRow('Total FV',rp(total)) + resRow('Keuntungan',rp(total-PV-(pmt*m*n)));
  } else if(mode === 'pv') {
    if(!FV&&!r&&!n) return;
    const pvCalc = FV / Math.pow(1+r/m, m*n);
    const pvAnn = pmt>0 ? pmt * (1-Math.pow(1+r/m,-m*n))/(r/m) : 0;
    el.innerHTML = resRow('Present Value',rp(pvCalc)) + (pmt?resRow('PV Anuitas',rp(pvAnn)):'') + resRow('Total PV',rp(pvCalc+pvAnn)) + resRow('Faktor Diskonto',((pvCalc/FV)*100).toFixed(4)+'%');
  } else if(mode === 'rate') {
    if(!PV||!FV||!n) return;
    const rCalc = (Math.pow(FV/PV, 1/(m*n)) - 1) * m * 100;
    el.innerHTML = resRow('Suku Bunga / Tahun',pct(rCalc)) + resRow('Suku Bunga / Periode',pct(rCalc/m));
  } else if(mode === 'n') {
    if(!PV||!FV||!r) return;
    const nCalc = Math.log(FV/PV) / (m*Math.log(1+r/m));
    el.innerHTML = resRow('Jangka Waktu (Tahun)',nCalc.toFixed(4)) + resRow('Jangka Waktu (Bulan)',(nCalc*12).toFixed(2));
  }
}

function hitungDiskonto() {
  const nominal = parseFloat(document.getElementById('dk-nominal').value)||0;
  const rate = (parseFloat(document.getElementById('dk-rate').value)||0)/100;
  const hari = parseFloat(document.getElementById('dk-hari').value)||0;
  const bungaWesel = (parseFloat(document.getElementById('dk-bunga-wesel').value)||0)/100;
  const basis = parseInt(document.getElementById('dk-basis').value)||360;
  if(!nominal||!rate||!hari) return;

  const nilaiJatuhTempo = nominal * (1 + bungaWesel * hari/basis);
  const diskonto = nilaiJatuhTempo * rate * hari/basis;
  const hasilBersih = nilaiJatuhTempo - diskonto;
  const el = document.getElementById('dk-hasil');
  el.innerHTML = resRow('Nilai Nominal Wesel',rp(nominal))
    + (bungaWesel?resRow('Bunga Wesel',rp(nilaiJatuhTempo-nominal)):'')
    + resRow('Nilai Jatuh Tempo',rp(nilaiJatuhTempo))
    + resRow('Diskonto',rp(diskonto))
    + resRow('Hasil Bersih Diterima',`<span style="color:var(--accent);font-size:18px">${rp(hasilBersih)}</span>`)
    + resRow('Tarif Efektif',pct(((diskonto/hasilBersih)*(basis/hari)*100)));
}

// RASIO KEUANGAN
function hitungRasio() {
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

  // Hitung field turunan — pakai nilai manual jika ada, kalau tidak hitung otomatis
  const asetL      = g('rs-aset-lancar') > 0 ? g('rs-aset-lancar') : kas + piutang + pers;
  const labaKotor  = g('rs-laba-kotor')  > 0 ? g('rs-laba-kotor')  : penjualan - hpp;
  const totalLiab  = g('rs-total-liab')  > 0 ? g('rs-total-liab')  : utangL + utangP;
  const totalAset  = g('rs-total-aset')  > 0 ? g('rs-total-aset')  : asetL + asetT;

  // Laba bersih: cek manual dulu, lalu EBIT-bBunga, lalu dari field placeholder
  const _lbManual = g('rs-laba-bersih');
  const labaBersihFinal = _lbManual > 0
    ? _lbManual
    : (ebit > 0 ? Math.max(0, ebit - bBunga) : 0);

  // Update placeholder field otomatis (tidak ubah .value agar tidak ganggu input user)
  const setCalc = (id, val) => {
    const el = document.getElementById(id);
    if (el && !(parseFloat(el.value) > 0) && val > 0) {
      el.placeholder = val.toLocaleString('id-ID');
    }
  };
  setCalc('rs-aset-lancar', asetL);
  setCalc('rs-laba-kotor', labaKotor);
  setCalc('rs-total-liab', totalLiab);
  setCalc('rs-total-aset', totalAset);
  if (labaBersihFinal > 0 && _lbManual === 0) setCalc('rs-laba-bersih', labaBersihFinal);

  const r = (a,b) => b ? a/b : 0;

  // Gunakan variabel yang sudah dihitung di atas — tidak perlu re-read dari DOM
  // Fix: Quick Ratio tidak boleh negatif
  const quickAsset = Math.max(0, asetL - pers);

  // Likuiditas
  document.getElementById('rasio-likuiditas').innerHTML = [
    rasioRow('Current Ratio', r(asetL,utangL).toFixed(2), 'x', {ok:2,warn:1}, 'Baik ≥ 2x'),
    rasioRow('Quick Ratio', r(quickAsset,utangL).toFixed(2), 'x', {ok:1,warn:0.5}, 'Baik ≥ 1x'),
    rasioRow('Cash Ratio', r(kas,utangL).toFixed(2), 'x', {ok:0.5,warn:0.2}, 'Baik ≥ 0.5x'),
    rasioRowStr('Net Working Capital', rp(asetL-utangL), 'Modal kerja bersih'),
  ].join('');

  // Solvabilitas
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

  // Profitabilitas
  document.getElementById('rasio-profitabilitas').innerHTML = [
    rasioRow('Gross Profit Margin', pct(r(labaKotor,penjualan)*100), '', {ok:30,warn:15}, 'Baik ≥ 30%'),
    rasioRow('Net Profit Margin (NPM)', pct(r(labaBersihFinal,penjualan)*100), '', {ok:10,warn:5}, 'Baik ≥ 10%'),
    rasioRow('Return on Assets (ROA)', pct(r(labaBersihFinal,totalAset)*100), '', {ok:5,warn:2}, 'Baik ≥ 5%'),
    rasioRow('Return on Equity (ROE)', pct(r(labaBersihFinal,ekuitas)*100), '', {ok:15,warn:8}, 'Baik ≥ 15%'),
    rasioRow('EBIT Margin', pct(r(ebit,penjualan)*100), '', {ok:15,warn:8}, 'Laba operasi/penjualan'),
    rasioRow('Return on Sales', pct(r(labaBersihFinal,penjualan)*100), '', null, ''),
  ].join('');

  // Aktivitas
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

  // Pasar — Fix: EPS dan BVPS selalu dihitung jika saham > 0
  const eps = saham > 0 && labaBersihFinal > 0 ? labaBersihFinal / saham : null;
  const bvps = saham > 0 && ekuitas > 0 ? ekuitas / saham : null;
  const per = (eps !== null && hargaSaham > 0) ? hargaSaham / eps : null;
  const pbv = (bvps !== null && hargaSaham > 0) ? hargaSaham / bvps : null;
  const marketCap = saham > 0 && hargaSaham > 0 ? hargaSaham * saham : null;

  // BUGFIX: rasioRow pakai parseFloat(nilai) — nilai format Rp ditangani rasioRowStr (didefinisikan di atas)

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
  const harga = parseFloat(document.getElementById('bep-harga').value)||0;
  const bv = parseFloat(document.getElementById('bep-bv').value)||0;
  const bt = parseFloat(document.getElementById('bep-bt').value)||0;
  const vol = parseFloat(document.getElementById('bep-vol').value)||0;
  const target = parseFloat(document.getElementById('bep-target').value)||0;
  const pajak = (parseFloat(document.getElementById('bep-pajak').value)||0)/100;
  if(!harga||!bt) return;

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
  const targetVolPreTax = target > 0 ? (bt+target)/cm : null;

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
  const bauranStr = document.getElementById('bep-bauran').value.trim();
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

// PPN
function switchPajakTab(id, el) {
  ['ppn','pph21','pph23','badan'].forEach(x => document.getElementById('pajak-'+x).style.display='none');
  document.getElementById('pajak-'+id).style.display='block';
  document.querySelectorAll('#pajak-tabs .tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
  // Upgrade pickers after tab switch
  setTimeout(upgradePajakPickers, 100);
}

document.getElementById('ppn-tarif').addEventListener('change', function() {
  document.getElementById('ppn-custom-row').style.display = this.value==='custom'?'grid':'none';
});
document.getElementById('p23-jenis').addEventListener('change', function() {
  document.getElementById('p23-custom-row').style.display = this.value==='custom'?'grid':'none';
});

function hitungPPN() {
  const nilai = parseFloat(document.getElementById('ppn-nilai').value)||0;
  const tarifSel = document.getElementById('ppn-tarif').value;
  const tarif = tarifSel==='custom' ? (parseFloat(document.getElementById('ppn-custom').value)||12)/100 : parseFloat(tarifSel)/100;
  const mode = document.getElementById('ppn-mode').value;
  const el = document.getElementById('ppn-hasil');
  if(!nilai) return;

  let dpp, ppn, total;
  if(mode === 'eksklusif') {
    dpp = nilai; ppn = dpp*tarif; total = dpp+ppn;
  } else if(mode === 'inklusif') {
    total = nilai; dpp = total/(1+tarif); ppn = total-dpp;
  } else {
    total = nilai; dpp = total/(1+tarif); ppn = total-dpp;
  }
  el.innerHTML = resRow('DPP (Dasar Pengenaan Pajak)', rp(dpp))
    + resRow('Tarif PPN', pct(tarif*100))
    + resRow('PPN Terutang', `<span style="color:var(--red);font-size:18px">${rp(ppn)}</span>`)
    + resRow('Total Harga', rp(total))
    + resRow('Faktur Pajak', `PPN Keluaran: ${rp(ppn)}`);

  // Auto-add input button
  setTimeout(addInputBtnToPPN, 80);
}

// PPh 21 — State & Switchers
let _p21KategoriCalc = 'tetap'; // 'tetap' | 'tidak-tetap' | dll
let _p21BukanPegawaiMode = 'tidak'; // 'tidak' | 'berkesinambungan'

function setBukanPegawaiMode(mode) {
  _p21BukanPegawaiMode = mode;
  const btnTidak = document.getElementById('p21-bp-mode-tidak');
  const btnBerk  = document.getElementById('p21-bp-mode-berkesinambungan');
  const kumulatifGroup = document.getElementById('p21-bp-kumulatif-group');
  const infoBerk  = document.getElementById('p21-bp-info-berkesinambungan');
  const infoTidak = document.getElementById('p21-bp-info-tidak');
  const isBerk = mode === 'berkesinambungan';

  if(btnTidak) {
    btnTidak.style.border = isBerk ? '2px solid var(--border)' : '2px solid var(--accent2)';
    btnTidak.style.background = isBerk ? 'var(--surface2)' : 'rgba(34,211,238,0.1)';
    btnTidak.style.color = isBerk ? 'var(--muted)' : 'var(--accent2)';
  }
  if(btnBerk) {
    btnBerk.style.border = isBerk ? '2px solid var(--accent2)' : '2px solid var(--border)';
    btnBerk.style.background = isBerk ? 'rgba(34,211,238,0.1)' : 'var(--surface2)';
    btnBerk.style.color = isBerk ? 'var(--accent2)' : 'var(--muted)';
  }
  if(kumulatifGroup) kumulatifGroup.style.display = isBerk ? '' : 'none';
  if(infoBerk)  infoBerk.style.display  = isBerk ? '' : 'none';
  if(infoTidak) infoTidak.style.display = isBerk ? 'none' : '';

  // Reset kumulatif jika pindah ke mode tidak berkesinambungan
  if(!isBerk) {
    const kInput = document.getElementById('p21-bukan-pegawai-kumulatif');
    if(kInput) kInput.value = '';
  }
  hitungPPh21BukanPegawai();
}
const _p21KatList = ['tetap','tidak-tetap','komisaris','bukan-pegawai','peserta-kegiatan','pensiun','mantan-pegawai','pns'];

function p21OnBulanChange() {
  const bulan = parseInt(document.getElementById('p21-bulan')?.value) || 0;
  const panel = document.getElementById('p21-rekon-panel');
  if(panel) {
    if(bulan === 12) {
      panel.style.display = 'block';
      // Smooth reveal
      panel.style.opacity = '0';
      panel.style.transition = 'opacity 0.3s';
      setTimeout(() => { panel.style.opacity = '1'; }, 10);
    } else {
      panel.style.display = 'none';
    }
  }
  hitungPPh21();
}
const _p21KatLabel = {
  'tetap': 'PPh Pasal 21 — Pegawai Tetap',
  'tidak-tetap': 'PPh Pasal 21 — Pegawai Tidak Tetap',
  'komisaris': 'PPh Pasal 21 — Komisaris / Dewan Pengawas',
  'bukan-pegawai': 'PPh Pasal 21 — Bukan Pegawai (Honor)',
  'peserta-kegiatan': 'PPh Pasal 21 — Peserta Kegiatan',
  'pensiun': 'PPh Pasal 21 — Peserta Program Pensiun',
  'mantan-pegawai': 'PPh Pasal 21 — Mantan Pegawai',
  'pns': 'PPh Pasal 21 — PNS/TNI/POLRI/Pejabat Negara'
};

function switchP21Kategori(k) {
  _p21KategoriCalc = k;
  // Toggle all category buttons
  _p21KatList.forEach(id => {
    const btn = document.getElementById('p21-kat-' + id);
    if(btn) btn.classList.toggle('active', id === k);
  });
  // Show/hide sections
  _p21KatList.forEach(id => {
    const sec = document.getElementById('p21-section-' + id);
    if(sec) sec.style.display = id === k ? 'block' : 'none';
  });
  // Also handle the old 'tidak-tetap' ID mapping
  const title = document.getElementById('p21-card-title');
  if(title) title.textContent = _p21KatLabel[k] || 'PPh Pasal 21';
  document.getElementById('pph21-hasil').innerHTML = '<span style="color:var(--muted);font-size:13px">Isi parameter.</span>';
  document.getElementById('p21-tabel-wrap').style.display = 'none';
  document.getElementById('p21-pmk-info').style.display = 'none';
  // Reset bukan pegawai mode ke default saat pindah ke kategori itu
  if(k === 'bukan-pegawai') {
    _p21BukanPegawaiMode = 'tidak';
    setTimeout(() => setBukanPegawaiMode('tidak'), 50);
  }
  // Re-run upgrade for new selects
  setTimeout(upgradePajakPickers, 80);
}

// Tabel TER Bulanan (PMK 168/2023)
// Sumber: www.pajak.go.id — Lampiran PMK 168 Tahun 2023
// TER A = PTKP: TK/0 (54 juta); TK/1 & K/0 (58,5 juta)
const TER_A = [
  [5400000,0],      // s.d. 5.400.000
  [5650000,0.0025],
  [5950000,0.005],
  [6300000,0.0075],
  [6750000,0.01],
  [7500000,0.0125],
  [8550000,0.015],
  [9650000,0.0175],
  [10050000,0.02],
  [10350000,0.0225],
  [10700000,0.025],
  [11050000,0.03],
  [11600000,0.035],
  [12500000,0.04],
  [13750000,0.05],
  [15100000,0.06],
  [16950000,0.07],
  [19750000,0.08],
  [24150000,0.09],
  [26450000,0.10],
  [28000000,0.11],
  [30050000,0.12],
  [32400000,0.13],
  [35400000,0.14],
  [39100000,0.15],
  [43850000,0.16],
  [47800000,0.17],
  [51400000,0.18],
  [56300000,0.19],
  [62200000,0.20],
  [68600000,0.21],
  [77500000,0.22],
  [89000000,0.23],
  [103000000,0.24],
  [125000000,0.25],
  [157000000,0.26],
  [206000000,0.27],
  [337000000,0.28],
  [454000000,0.29],
  [550000000,0.30],
  [695000000,0.31],
  [910000000,0.32],
  [1400000000,0.33],
  [Infinity,0.34]
];

// TER B = PTKP: TK/2 & K/1 (63 juta); TK/3 & K/2 (67,5 juta)
const TER_B = [
  [6200000,0],      // s.d. 6.200.000
  [6500000,0.0025],
  [6850000,0.005],
  [7300000,0.0075],
  [9200000,0.01],
  [10750000,0.015],
  [11250000,0.02],
  [11600000,0.025],
  [12600000,0.03],
  [13600000,0.04],
  [14950000,0.05],
  [16400000,0.06],
  [18450000,0.07],
  [21850000,0.08],
  [26000000,0.09],
  [27700000,0.10],
  [29350000,0.11],
  [31450000,0.12],
  [33950000,0.13],
  [37100000,0.14],
  [41100000,0.15],
  [45800000,0.16],
  [49500000,0.17],
  [53800000,0.18],
  [58500000,0.19],
  [64000000,0.20],
  [71000000,0.21],
  [80000000,0.22],
  [93000000,0.23],
  [109000000,0.24],
  [129000000,0.25],
  [163000000,0.26],
  [211000000,0.27],
  [374000000,0.28],
  [459000000,0.29],
  [555000000,0.30],
  [704000000,0.31],
  [957000000,0.32],
  [1405000000,0.33],
  [Infinity,0.34]
];

// TER C = PTKP: K/3 (72 juta)
const TER_C = [
  [6600000,0],      // s.d. 6.600.000
  [6950000,0.0025],
  [7350000,0.005],
  [7800000,0.0075],
  [8850000,0.01],
  [9800000,0.0125],
  [10950000,0.015],
  [11200000,0.0175],
  [12050000,0.02],
  [12950000,0.03],
  [14150000,0.04],
  [15550000,0.05],
  [17050000,0.06],
  [19500000,0.07],
  [22700000,0.08],
  [26600000,0.09],
  [28100000,0.10],
  [30100000,0.11],
  [32600000,0.12],
  [35400000,0.13],
  [38900000,0.14],
  [43000000,0.15],
  [47400000,0.16],
  [51200000,0.17],
  [55800000,0.18],
  [60400000,0.19],
  [66700000,0.20],
  [74500000,0.21],
  [83200000,0.22],
  [95600000,0.23],
  [110000000,0.24],
  [134000000,0.25],
  [169000000,0.26],
  [221000000,0.27],
  [390000000,0.28],
  [463000000,0.29],
  [561000000,0.30],
  [709000000,0.31],
  [965000000,0.32],
  [1419000000,0.33],
  [Infinity,0.34]
];

// TER HARIAN (PMK 168/2023) — berlaku untuk upah > Rp2.500.000/hari
// Minimal penghasilan kena pajak harian: Rp450.000/hari
function getTERHarian(upahHarian) {
  // Batas PTKP harian = 54jt / 360 = 150.000. Tapi PMK 168 pasal TER Harian
  // menggunakan tabel TER Harian khusus dengan batas Rp450.000/hari
  if(upahHarian <= 450000) return 0;
  if(upahHarian <= 2500000) {
    // Ps. 17: (upah - PTKP harian) x tarif
    // Untuk simplifikasi: pakai 5% dari neto (upah - 450rb batas bebas pajak)
    return 0; // Ini ditangani di hitungPPh21TidakTetap dengan logika ≤500rb/2.5jt
  }
  // Untuk upah > 2.5jt: Ph.Bruto x 50% x Tarif Ps.17 — lihat foto 4
  // Namun untuk TER harian khusus, kita kembalikan rate berdasarkan proyeksi bulanan
  return null; // sinyal: gunakan logika Ph.Bruto × 50% × Tarif Ps.17
}
function getTERKategori(ptkpKode) {
  // TER A: TK/0 (PTKP 54jt), TK/1 & K/0 (PTKP 58,5jt)
  if(['TK0','TK1','K0'].includes(ptkpKode)) return 'A';
  // TER B: TK/2 & K/1 (PTKP 63jt), TK/3 & K/2 (PTKP 67,5jt)
  if(['TK2','TK3','K1','K2'].includes(ptkpKode)) return 'B';
  // TER C: K/3 (PTKP 72jt) + KI (istri kerja)
  return 'C';
}
function getTERTable(ptkpKode) {
  if(['TK0','TK1','K0'].includes(ptkpKode)) return TER_A;
  if(['TK2','TK3','K1','K2'].includes(ptkpKode)) return TER_B;
  return TER_C; // K3, KI0, KI1, KI2, KI3
}
function getTERTarif(penghasilanBrutoBulan, ptkpKode) {
  const tbl = getTERTable(ptkpKode);
  for(const [batas, rate] of tbl) {
    if(penghasilanBrutoBulan <= batas) return rate;
  }
  return 0.1;
}

function hitungPPh21() {
  if(_p21KategoriCalc === 'tidak-tetap') { hitungPPh21TidakTetap(); return; }
  if(_p21KategoriCalc === 'komisaris') { hitungPPh21Komisaris(); return; }
  if(_p21KategoriCalc === 'bukan-pegawai') { hitungPPh21BukanPegawai(); return; }
  if(_p21KategoriCalc === 'peserta-kegiatan') { hitungPPh21PesertaKegiatan(); return; }
  if(_p21KategoriCalc === 'pensiun') { hitungPPh21Pensiun(); return; }
  if(_p21KategoriCalc === 'mantan-pegawai') { hitungPPh21MantanPegawai(); return; }
  if(_p21KategoriCalc === 'pns') { hitungPPh21PNS(); return; }

  const gaji = parseFloat(document.getElementById('p21-gaji').value)||0;
  const tunjangan = parseFloat(document.getElementById('p21-tunjangan').value)||0;
  const bonus = parseFloat(document.getElementById('p21-bonus').value)||0;
  const jhtIn = parseFloat(document.getElementById('p21-jht').value)||0;
  const bpjsIn = parseFloat(document.getElementById('p21-bpjs').value)||0;
  const jpIn = parseFloat(document.getElementById('p21-jp').value)||0;
  const ptkpKode = document.getElementById('p21-ptkp').value;
  const metodePot = document.getElementById('p21-metode').value;
  const bulan = parseInt(document.getElementById('p21-bulan').value)||1;
  if(!gaji) return;

  const ptkpTbl = {
    TK0:54000000, TK1:58500000, TK2:63000000, TK3:67500000,
    K0:58500000, K1:63000000, K2:67500000, K3:72000000,
    KI0:63000000, KI1:67500000, KI2:72000000, KI3:76500000
  };
  const ptkp = ptkpTbl[ptkpKode]||54000000;
  const penghasilanBrutoBulan = gaji + tunjangan;
  const jhtBulan = jhtIn || gaji * 0.02;
  const bpjsBulan = bpjsIn || Math.min(gaji * 0.01, 40000);
  const jpBulan = jpIn || Math.min(gaji * 0.01, 99000);

  const el = document.getElementById('pph21-hasil');
  const tw = document.getElementById('p21-tabel-wrap');
  const pmkEl = document.getElementById('p21-pmk-info');

  // METODE TER (PMK 168/2023)
  // Pegawai Tetap: Jan-Nov pakai TER, Desember rekonsiliasi Ps.17 otomatis
    const tarif = getTERTarif(penghasilanBrutoBulan, ptkpKode);
    const pphBulan = Math.round(penghasilanBrutoBulan * tarif);

    const tarifPct = (tarif*100).toFixed(2);
    window._lastPPh21 = { gaji: penghasilanBrutoBulan, pph: pphBulan, jht: jhtBulan+bpjsBulan+jpBulan, kategori: 'tetap' };

    // REKONSILIASI DESEMBER — Otomatis & Detail
    let rekonsiliasi = '';
    if(bulan === 12) {
      // Ambil input aktual Jan-Nov, fallback ke estimasi × 11
      const janNovInput = parseFloat(document.getElementById('p21-rekon-janNov')?.value) || 0;
      const bonusSetahunInput = parseFloat(document.getElementById('p21-rekon-bonus-setahun')?.value) || 0;
      const pphJanNov = janNovInput > 0 ? janNovInput : pphBulan * 11;
      const isEstimasi = janNovInput <= 0;

      // Hitung PPh tahunan dengan Pasal 17
      const brutoSetahun = penghasilanBrutoBulan * 12 + (bonusSetahunInput || bonus);
      const jhtSetahun = jhtBulan * 12;
      const bpjsSetahun = bpjsBulan * 12;
      const jpSetahun = jpBulan * 12;
      const biayaJabatan = Math.min(brutoSetahun * 0.05, 6000000);
      const netoSetahun = brutoSetahun - biayaJabatan - jhtSetahun - bpjsSetahun - jpSetahun;
      const pkp = Math.max(0, Math.floor((netoSetahun - ptkp)/1000)*1000);
      const {pajak: pajTahunan, rows: lapisanRowsRekon} = hitungTarifProgresifDetail(pkp);

      // Sudah dipotong Jan-Des (Jan-Nov + Des TER)
      const totalTerJanDes = pphJanNov + pphBulan;

      // Selisih: positif = kurang bayar, negatif = lebih bayar
      const selisih = Math.round(pajTahunan - totalTerJanDes);
      const isKurangBayar = selisih > 0;
      const isLebihBayar = selisih < 0;
      const isPas = selisih === 0;

      const warnaBadge = isKurangBayar ? 'var(--red)' : isLebihBayar ? 'var(--accent)' : 'var(--accent2)';
      const bgBadge = isKurangBayar ? 'rgba(248,113,113,0.12)' : isLebihBayar ? 'rgba(74,222,128,0.12)' : 'rgba(34,211,238,0.12)';
      const labelStatus = isKurangBayar ? '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> KURANG BAYAR' : isLebihBayar ? '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> LEBIH BAYAR' : '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> NIHIL / PAS';
      const deskStatus = isKurangBayar
        ? `Karyawan masih harus dipotong/setor <b style="color:var(--red)">${rp(selisih)}</b> di bulan Desember`
        : isLebihBayar
        ? `Karyawan berhak restitusi / diperhitungkan <b style="color:var(--accent)">${rp(Math.abs(selisih))}</b>`
        : `Pajak tepat — tidak ada selisih`;

      // PPh Desember yang seharusnya (hasil rekonsiliasi)
      const pphDesSemestinya = Math.round(pajTahunan - pphJanNov);

      rekonsiliasi = `
        <div style="margin-top:12px;border-radius:10px;border:1px solid rgba(245,158,11,0.3);overflow:hidden;">
          <div style="background:rgba(245,158,11,0.1);padding:10px 14px;display:flex;align-items:center;gap:8px;">
            <i class="ti ti-calendar" style="font-size:14px;vertical-align:-2px;"></i>
            <span style="font-weight:700;color:var(--accent3);font-size:12.5px;">Rekonsiliasi Akhir Tahun — Pasal 17</span>
            ${isEstimasi ? '<span style="margin-left:auto;font-size:10px;color:var(--muted);background:var(--surface2);border-radius:4px;padding:2px 6px;">estimasi (× 11)</span>' : '<span style="margin-left:auto;font-size:10px;color:var(--accent);background:rgba(74,222,128,0.1);border-radius:4px;padding:2px 6px;">✓ input aktual</span>'}
          </div>
          <div style="padding:12px 14px;">
            ${resRow('Penghasilan Bruto Setahun', rp(brutoSetahun))}
            ${resRow('Biaya Jabatan (maks Rp6jt)', rp(biayaJabatan))}
            ${resRow('Iuran JHT+BPJS+JP/Tahun', rp(jhtSetahun+bpjsSetahun+jpSetahun))}
            ${resRow('Penghasilan Neto Setahun', rp(netoSetahun))}
            ${resRow('PTKP ('+ptkpKode+')', rp(ptkp))}
            ${resRow('PKP Setahun (dibulatkan)', rp(pkp))}
            <div style="height:1px;background:var(--border);margin:8px 0;"></div>
            ${resRow('PPh 21 Tahunan (Ps.17)', `<b>${rp(pajTahunan)}</b>`)}
            ${resRow('PPh dipotong Jan–Nov (TER)', rp(pphJanNov) + (isEstimasi ? ' <span style="font-size:10px;color:var(--muted)">(estimasi)</span>' : ''))}
            ${resRow('PPh Desember yang Seharusnya', `<b style="color:var(--accent3)">${rp(Math.max(0, pphDesSemestinya))}</b>`)}
            <div style="height:1px;background:var(--border);margin:8px 0;"></div>
            ${resRow('PPh sudah dipotong Jan–Des (TER)', rp(totalTerJanDes))}
            ${resRow('PPh Tahunan Seharusnya (Ps.17)', rp(pajTahunan))}
            <div style="margin-top:10px;padding:11px 14px;border-radius:8px;background:${bgBadge};border:1px solid ${warnaBadge}22;">
              <div style="font-weight:800;color:${warnaBadge};font-size:13px;margin-bottom:4px;">${labelStatus}: ${rp(Math.abs(selisih))}</div>
              <div style="font-size:11.5px;color:var(--muted);line-height:1.6;">${deskStatus}</div>
              ${isKurangBayar ? `<div style="font-size:11px;color:var(--red);margin-top:6px;opacity:0.85;">📌 Potong dari gaji Desember: PPh Des = <b>${rp(Math.max(0,pphDesSemestinya))}</b></div>` : ''}
              ${isLebihBayar ? `<div style="font-size:11px;color:var(--accent);margin-top:6px;opacity:0.85;">📌 Dapat dikembalikan/diperhitungkan dengan PPh bulan berikutnya atau dalam SPT Tahunan.</div>` : ''}
            </div>
          </div>
        </div>`;

      // Update tabel lapisan Ps.17 untuk rekonsiliasi
      tw.style.display = 'block';
      document.getElementById('p21-tabel-title').textContent = 'Lapisan Tarif Ps.17 — Rekonsiliasi Desember';
      document.getElementById('p21-th1').textContent = 'PKP Lapisan';
      document.getElementById('p21-tabel-body').innerHTML = lapisanRowsRekon.join('');

      // Override _lastPPh21 dengan nilai rekonsiliasi
      window._lastPPh21 = { gaji: penghasilanBrutoBulan, pph: Math.max(0,pphDesSemestinya), jht: jhtBulan+bpjsBulan+jpBulan, kategori: 'tetap' };
    } else {
      tw.style.display = 'block';
      document.getElementById('p21-tabel-title').textContent = 'Tabel TER Bulan ke-' + bulan + ' (' + ptkpKode + ')';
      document.getElementById('p21-th1').textContent = 'Penghasilan Bruto Bulanan ≤';
      const tbl = getTERTable(ptkpKode);
      document.getElementById('p21-tabel-body').innerHTML = tbl.slice(0,12).map(([batas,rate], idx, arr) => {
        const isActive = penghasilanBrutoBulan <= batas && (idx === 0 || arr[idx-1][0] < penghasilanBrutoBulan);
        return `<tr ${isActive ? 'style="background:rgba(74,222,128,0.08);font-weight:600"' : ''}>
          <td>${batas===Infinity ? '> '+rp(arr[arr.length-2]?.[0]||0) : rp(batas)}</td>
          <td>${(rate*100).toFixed(2)}%</td>
          <td class="kredit">${rp(penghasilanBrutoBulan * rate)}</td>
        </tr>`;
      }).join('') + `<tr><td colspan="3" style="text-align:center;color:var(--muted);font-size:11px;padding:8px;">Baris <b>hijau</b> = tarif aktif untuk penghasilan ini</td></tr>`;
    }

    el.innerHTML = resRow('Penghasilan Bruto/Bulan', rp(penghasilanBrutoBulan))
      + resRow('Tarif TER ('+ptkpKode+')', `${tarifPct}%`)
      + resRow('PPh 21 Bulan ini (TER)', `<span class="kredit" style="font-size:18px">${rp(pphBulan)}</span>`)
      + '<div style="height:1px;background:var(--border);margin:10px 0;"></div>'
      + resRow('Potongan JHT+BPJS+JP', rp(jhtBulan+bpjsBulan+jpBulan))
      + resRow('Take Home Pay', rp(penghasilanBrutoBulan - (metodePot==='netto'?pphBulan:0) - jhtBulan - bpjsBulan - jpBulan))
      + (bonus ? resRow('Bonus/THR (TER terpisah)', rp(bonus * getTERTarif(bonus, ptkpKode))) : '')
      + rekonsiliasi;

    if(pmkEl) {
      pmkEl.style.display = 'block';
      if(bulan === 12) {
        document.getElementById('p21-pmk-info-text').innerHTML = `
          <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Bulan Desember</b>: rekonsiliasi wajib dilakukan menggunakan <b>Tarif Ps.17</b>.<br>
          <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Selisih antara total TER Jan–Des vs PPh tahunan = <b>lebih/kurang bayar</b> yang harus diselesaikan.<br>
          <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Isi "Total PPh Jan–Nov Aktual" untuk hasil rekonsiliasi yang tepat (jika gaji tidak sama tiap bulan).<br>
          <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tabel TER Kategori: <b>${getTERKategori(ptkpKode)}</b> (${ptkpKode})
        `;
      } else {
        document.getElementById('p21-pmk-info-text').innerHTML = `
          <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Tarif TER diterapkan tiap bulan</b> Jan–Nov. Desember dilakukan rekonsiliasi menggunakan tarif Pasal 17.<br>
          <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tarif TER dipilih berdasarkan <b>penghasilan bruto bulanan</b> & status PTKP.<br>
          <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Berlaku mulai <b>1 Januari 2024</b> sesuai PMK 168 Tahun 2023.<br>
          <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tabel TER Kategori: <b>${getTERKategori(ptkpKode)}</b> (${ptkpKode})
        `;
      }
    }
  setTimeout(addInputBtnToPPH21, 80);
}

// Helper: tarif marginal Pasal 17 berdasarkan PKP setahun
function getTarifPs17Marginal(pkpSetahun) {
  if(pkpSetahun <= 60000000) return 0.05;
  if(pkpSetahun <= 250000000) return 0.15;
  if(pkpSetahun <= 500000000) return 0.25;
  if(pkpSetahun <= 5000000000) return 0.30;
  return 0.35;
}

function hitungTarifProgresif(pkp) {
  const tiers = [{b:60000000,r:0.05},{b:250000000,r:0.15},{b:500000000,r:0.25},{b:5000000000,r:0.30},{b:Infinity,r:0.35}];
  let sisa = pkp, total = 0, prev = 0;
  for(const t of tiers) {
    if(sisa<=0) break;
    const kena = Math.min(sisa, t.b - prev);
    total += kena * t.r;
    sisa -= kena; prev = t.b;
  }
  return total;
}
function hitungTarifProgresifDetail(pkp) {
  const tiers = [{b:60000000,r:0.05},{b:250000000,r:0.15},{b:500000000,r:0.25},{b:5000000000,r:0.30},{b:Infinity,r:0.35}];
  let sisa = pkp, total = 0, prev = 0, rows = [];
  for(const t of tiers) {
    if(sisa<=0) break;
    const kena = Math.min(sisa, t.b - prev);
    const pajak = kena * t.r;
    total += pajak;
    rows.push(`<tr><td>${rp(prev)} — ${t.b===Infinity?'~':rp(t.b)}</td><td>${pct(t.r*100)}</td><td class="kredit">${rp(pajak)}</td></tr>`);
    sisa -= kena; prev = t.b;
  }
  return {pajak: total, rows};
}

function setTTMode(mode) {
  const btnH = document.getElementById('p21-tt-mode-harian');
  const btnB = document.getElementById('p21-tt-mode-bulanan');
  const divH = document.getElementById('p21-tt-input-harian');
  const divB = document.getElementById('p21-tt-input-bulanan');
  if (!btnH) return;
  if (mode === 'harian') {
    btnH.style.borderColor = 'var(--accent2)'; btnH.style.background = 'rgba(34,211,238,0.1)'; btnH.style.color = 'var(--accent2)';
    btnB.style.borderColor = 'var(--border)'; btnB.style.background = 'var(--surface2)'; btnB.style.color = 'var(--muted)';
    divH.style.display = ''; divB.style.display = 'none';
    document.getElementById('p21-ptkp-tt').onchange = hitungPPh21TidakTetap;
  } else {
    btnB.style.borderColor = 'var(--accent2)'; btnB.style.background = 'rgba(34,211,238,0.1)'; btnB.style.color = 'var(--accent2)';
    btnH.style.borderColor = 'var(--border)'; btnH.style.background = 'var(--surface2)'; btnH.style.color = 'var(--muted)';
    divH.style.display = 'none'; divB.style.display = '';
    document.getElementById('p21-ptkp-tt').onchange = hitungPPh21TidakTetapBulanan;
  }
  window._ttMode = mode;
  document.getElementById('pph21-hasil').innerHTML = '<span style="color:var(--muted);font-size:13px;">Isi parameter.</span>';
}

function hitungPPh21TidakTetapBulanan() {
  const upahBulan = parseFloat(document.getElementById('p21-upah-bulanan').value)||0;
  const ptkpKode = document.getElementById('p21-ptkp-tt').value;
  const npwp = document.getElementById('p21-npwp-tt').value;
  const el = document.getElementById('pph21-hasil');
  if (!upahBulan) return;

  // Untuk pegawai tidak tetap gaji bulanan: TER bulanan
  const multiplier = npwp === 'tidak' ? 1.2 : 1;
  const tarif = getTERTarif(upahBulan, ptkpKode);
  const pph21 = Math.round(upahBulan * tarif * multiplier);

  window._lastPPh21 = { gaji: upahBulan, pph: pph21, jht: 0, kategori: 'tidak-tetap' };
  el.innerHTML = resRow('Penghasilan Bruto/Bulan', rp(upahBulan))
    + resRow('Tarif TER (' + ptkpKode + ')', (tarif*100).toFixed(2) + '%')
    + (npwp==='tidak' ? resRow('Koreksi Non-NPWP (+20%)', '+20%') : '')
    + resRow('PPh 21 Bulan Ini', '<span class="kredit" style="font-size:18px">' + rp(pph21) + '</span>')
    + resRow('Take Home Pay', rp(upahBulan - pph21));

  document.getElementById('p21-tabel-wrap').style.display = 'none';
  setTimeout(addInputBtnToPPH21, 80);
}

function hitungPPh21TidakTetap() {
  const upahHarian = parseFloat(document.getElementById('p21-upah-harian').value)||0;
  // Enable/disable hari-kerja based on whether upah-harian has value
  const hariInput = document.getElementById('p21-hari-kerja');
  if (hariInput) {
    hariInput.disabled = !upahHarian;
    hariInput.style.opacity = upahHarian ? '1' : '0.5';
    hariInput.style.cursor = upahHarian ? '' : 'not-allowed';
  }
  const hariKerja = parseFloat(hariInput ? hariInput.value : 0)||0;
  const ptkpKode = document.getElementById('p21-ptkp-tt').value;
  const npwp = document.getElementById('p21-npwp-tt').value;
  const el = document.getElementById('pph21-hasil');
  const tw = document.getElementById('p21-tabel-wrap');
  if(!upahHarian || !hariKerja) return;

  const upahBulan = upahHarian * hariKerja;

  // PMK 168/2023: aturan pemotongan upah harian
  // Batas bebas pajak harian = Rp450.000/hari (sesuai PMK 168/2023)
  let pajakHarian = 0, catatan = '';
  if(upahHarian <= 450000) {
    pajakHarian = 0;
    catatan = 'Upah ≤ Rp450.000/hari — tidak dipotong PPh 21 (TER Harian)';
  } else if(upahHarian <= 2500000) {
    // Rp450.001 – Rp2.500.000/hari: TER Harian 0,5% × Ph.Bruto Harian (PMK 168/2023)
    pajakHarian = upahHarian * 0.005;
    catatan = 'Upah Rp450rb–Rp2,5jt/hari — TER Harian: 0,5% × Ph.Bruto Harian (PMK 168/2023)';
  } else {
    // > Rp2.500.000/hari: Ph.Bruto × 50% × Tarif Ps.17 (sesuai PMK 168/2023)
    const dasarPengenaan = upahHarian * 0.5;
    const dasarBulanan = dasarPengenaan * hariKerja;
    const pkpProyeksi = dasarBulanan * 12;
    const tarifPs17 = getTarifPs17Marginal(pkpProyeksi);
    pajakHarian = dasarPengenaan * tarifPs17;
    catatan = `Upah > Rp2,5jt/hari — Ph.Bruto × 50% × Tarif Ps.17 (${(tarifPs17*100).toFixed(0)}%)`;
  }
  const pajakBulan = pajakHarian * hariKerja;
  const multiplier = npwp === 'tidak' ? 1.2 : 1;
  const pajakFinal = Math.round(pajakBulan * multiplier);

  window._lastPPh21 = { gaji: upahBulan, pph: pajakFinal, jht: 0, kategori: 'tidak-tetap' };
  el.innerHTML = resRow('Upah Harian', rp(upahHarian))
    + resRow('Hari Kerja', hariKerja + ' hari')
    + resRow('Upah Bulanan', rp(upahBulan))
    + resRow('Aturan PMK 168', '<span style="color:var(--accent2);font-size:12px">' + catatan + '</span>')
    + resRow('PPh 21/Hari', rp(pajakHarian))
    + (npwp==='tidak' ? resRow('Koreksi Non-NPWP (+20%)', '+20%') : '')
    + resRow('PPh 21 Bulan Ini', '<span class="kredit" style="font-size:18px">' + rp(pajakFinal) + '</span>')
    + resRow('Take Home Pay', rp(upahBulan - pajakFinal));

    tw.style.display = 'none';
  const pmkEl = document.getElementById('p21-pmk-info');
  if(pmkEl) {
    pmkEl.style.display = 'block';
    document.getElementById('p21-pmk-info-text').innerHTML = `
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Perhitungan berdasarkan <b>PMK 168 Tahun 2023</b> untuk pegawai tidak tetap.<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Upah ≤ Rp450.000/hari: <b>tidak dipotong</b> (TER Harian PMK 168).<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Upah Rp450rb–Rp2,5jt/hari: dipotong <b>5%</b> dari selisih di atas Rp450rb.<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Upah > Rp2,5jt/hari: <b>Ph.Bruto × 50% × Tarif Ps.17</b>.<br>
      ${npwp==='tidak' ? '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tanpa NPWP: tarif ditambah <b>20%</b> dari nilai pajak.' : ''}
    `;
  }
  setTimeout(addInputBtnToPPH21, 80);
}

function hitungPPh21Komisaris() {
  const honor = parseFloat(document.getElementById('p21-komisaris-honor').value)||0;
  const ptkpKode = document.getElementById('p21-komisaris-ptkp').value;
  const el = document.getElementById('pph21-hasil');
  const tw = document.getElementById('p21-tabel-wrap');
  if(!honor) return;

  // Komisaris/Pengawas penghasilan tidak teratur: Ph.Bruto × TER Bulanan
  const tarif = getTERTarif(honor, ptkpKode);
  const pph21 = Math.round(honor * tarif);

  window._lastPPh21 = { gaji: honor, pph: pph21, jht: 0, kategori: 'komisaris' };
  el.innerHTML = resRow('Honor / Penghasilan Bruto', rp(honor))
    + resRow('Tarif TER Bulanan (' + ptkpKode + ')', (tarif*100).toFixed(2) + '%')
    + resRow('PPh 21 (TER Bulanan)', '<span class="kredit" style="font-size:18px">' + rp(pph21) + '</span>')
    + resRow('Penghasilan Diterima (Netto)', rp(honor - pph21));


  tw.style.display = 'none';
  const pmkEl = document.getElementById('p21-pmk-info');
  if(pmkEl) {
    pmkEl.style.display = 'block';
    document.getElementById('p21-pmk-info-text').innerHTML = `
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Komisaris/Dewan Pengawas</b> yang menerima penghasilan <b>tidak teratur</b> (honor, tantiem, dsb).<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Formula: <b>Ph.Bruto × TER Bulanan</b> — diterapkan per masa pajak.<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Berlaku sesuai PMK 168 Tahun 2023. Kategori TER: <b>${getTERKategori(ptkpKode)}</b> (${ptkpKode})
    `;
  }
  setTimeout(addInputBtnToPPH21, 80);
}

function hitungPPh21BukanPegawai() {
  const honor = parseFloat(document.getElementById('p21-bukan-pegawai-honor').value)||0;
  const kumulatif = parseFloat(document.getElementById('p21-bukan-pegawai-kumulatif')?.value)||0;
  const npwp = document.getElementById('p21-bukan-pegawai-npwp').value;
  const el = document.getElementById('pph21-hasil');
  const tw = document.getElementById('p21-tabel-wrap');
  if(!honor) return;

  const isBerk = _p21BukanPegawaiMode === 'berkesinambungan';
  const multiplier = npwp === 'tidak' ? 1.2 : 1;

  let pph21, dasarPengenaan, pkpSekarang, kumulatifEfektif;

  if(isBerk) {
    // Berkesinambungan: akumulatif progresif
    dasarPengenaan = honor * 0.5;
    const pkpKumulatif = kumulatif * 0.5;
    pkpSekarang = pkpKumulatif + dasarPengenaan;
    const pajakKumulatif = hitungTarifProgresif(pkpKumulatif);
    const pajakTotal = hitungTarifProgresif(pkpSekarang);
    const pajakPeriode = Math.round(Math.max(0, pajakTotal - pajakKumulatif));
    pph21 = Math.round(pajakPeriode * multiplier);
    kumulatifEfektif = kumulatif;
  } else {
    // Tidak berkesinambungan: per pembayaran, tanpa akumulasi
    dasarPengenaan = honor * 0.5;
    pkpSekarang = dasarPengenaan;
    kumulatifEfektif = 0;
    const pajakPeriode = Math.round(hitungTarifProgresif(pkpSekarang));
    pph21 = Math.round(pajakPeriode * multiplier);
  }

  window._lastPPh21 = { gaji: honor, pph: pph21, jht: 0, kategori: 'bukan-pegawai' };
  el.innerHTML = resRow('Honor / Penghasilan Bruto', rp(honor))
    + resRow('Dasar Pengenaan (50% Bruto)', rp(dasarPengenaan))
    + (isBerk && kumulatifEfektif ? resRow('Kumulatif Bruto s.d. sebelumnya', rp(kumulatifEfektif)) : '')
    + resRow('Tarif Ps.17 (Progresif)', isBerk ? 'Berdasarkan PKP kumulatif' : 'Per pembayaran')
    + (npwp==='tidak' ? resRow('Koreksi Non-NPWP (+20%)', '+20%') : '')
    + resRow('PPh 21 Masa Ini', '<span class="kredit" style="font-size:18px">' + rp(pph21) + '</span>')
    + resRow('Penghasilan Diterima (Netto)', rp(honor - pph21));

  tw.style.display = 'block';
  document.getElementById('p21-tabel-title').textContent = isBerk
    ? 'Lapisan Tarif Progresif — Bukan Pegawai (Berkesinambungan)'
    : 'Lapisan Tarif Progresif — Bukan Pegawai (Tidak Berkesinambungan)';
  document.getElementById('p21-th1').textContent = isBerk ? 'PKP Kumulatif Lapisan' : 'PKP Lapisan';
  const {rows} = hitungTarifProgresifDetail(pkpSekarang);
  document.getElementById('p21-tabel-body').innerHTML = rows.join('');

  const pmkEl = document.getElementById('p21-pmk-info');
  if(pmkEl) {
    pmkEl.style.display = 'block';
    document.getElementById('p21-pmk-info-text').innerHTML = isBerk
      ? `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Bukan Pegawai Berkesinambungan</b> — penghasilan rutin dari satu pemberi kerja.<br>
         <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Formula: <b>Ph.Bruto × 50% × Tarif Ps.17</b> dihitung secara akumulatif per masa pajak.<br>
         <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Isi kumulatif bruto sebelumnya agar lapisan tarif progresif dihitung tepat.<br>
         ${npwp==='tidak' ? '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tanpa NPWP: tarif ditambah <b>20%</b> dari nilai pajak.' : ''}`
      : `<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Bukan Pegawai Tidak Berkesinambungan</b> — honor sekali/tidak rutin.<br>
         <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Formula: <b>Ph.Bruto × 50% × Tarif Ps.17</b> — dihitung per pembayaran, tanpa akumulasi.<br>
         ${npwp==='tidak' ? '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tanpa NPWP: tarif ditambah <b>20%</b> dari nilai pajak.' : ''}`;
  }
  setTimeout(addInputBtnToPPH21, 80);
}

function hitungPPh21PesertaKegiatan() {
  const honor = parseFloat(document.getElementById('p21-peserta-kegiatan-honor').value)||0;
  const kumulatif = parseFloat(document.getElementById('p21-peserta-kegiatan-kumulatif').value)||0;
  const npwp = document.getElementById('p21-peserta-kegiatan-npwp').value;
  const el = document.getElementById('pph21-hasil');
  const tw = document.getElementById('p21-tabel-wrap');
  if(!honor) return;

  // Peserta Kegiatan: Ph.Bruto × Tarif Ps.17 (langsung, tanpa 50%)
  const pkpKumulatif = kumulatif;
  const pkpSekarang = pkpKumulatif + honor;
  const pajakKumulatif = hitungTarifProgresif(pkpKumulatif);
  const pajakTotal = hitungTarifProgresif(pkpSekarang);
  const pajakPeriode = Math.round(Math.max(0, pajakTotal - pajakKumulatif));
  const multiplier = npwp === 'tidak' ? 1.2 : 1;
  const pph21 = Math.round(pajakPeriode * multiplier);

  window._lastPPh21 = { gaji: honor, pph: pph21, jht: 0, kategori: 'peserta-kegiatan' };
  el.innerHTML = resRow('Hadiah / Penghasilan Bruto', rp(honor))
    + (kumulatif ? resRow('Kumulatif s.d. sebelumnya', rp(kumulatif)) : '')
    + resRow('Dasar Pengenaan', rp(honor) + ' (100% bruto)')
    + resRow('Tarif Ps.17 (Progresif)', 'Berdasarkan PKP kumulatif')
    + (npwp==='tidak' ? resRow('Koreksi Non-NPWP (+20%)', '+20%') : '')
    + resRow('PPh 21 Masa Ini', '<span class="kredit" style="font-size:18px">' + rp(pph21) + '</span>')
    + resRow('Penghasilan Diterima (Netto)', rp(honor - pph21));

  tw.style.display = 'block';
  document.getElementById('p21-tabel-title').textContent = 'Lapisan Tarif Progresif — Peserta Kegiatan';
  document.getElementById('p21-th1').textContent = 'PKP Kumulatif Lapisan';
  const {rows} = hitungTarifProgresifDetail(pkpSekarang);
  document.getElementById('p21-tabel-body').innerHTML = rows.join('');

  const pmkEl = document.getElementById('p21-pmk-info');
  if(pmkEl) {
    pmkEl.style.display = 'block';
    document.getElementById('p21-pmk-info-text').innerHTML = `
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Peserta Kegiatan</b> (lomba, rapat, konferensi, pelatihan, dll).<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Formula: <b>Ph.Bruto × Tarif Ps.17</b> — per masa pajak/saat terutang.<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Dasar pengenaan pajak = 100% penghasilan bruto (tanpa pengurangan 50%).<br>
      ${npwp==='tidak' ? '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tanpa NPWP: tarif ditambah <b>20%</b> dari nilai pajak.' : ''}
    `;
  }
  setTimeout(addInputBtnToPPH21, 80);
}

function hitungPPh21Pensiun() {
  const bruto = parseFloat(document.getElementById('p21-pensiun-bruto').value)||0;
  const kumulatif = parseFloat(document.getElementById('p21-pensiun-kumulatif').value)||0;
  const el = document.getElementById('pph21-hasil');
  const tw = document.getElementById('p21-tabel-wrap');
  if(!bruto) return;

  // Peserta Program Pensiun (Pegawai): Ph.Bruto × Tarif Ps.17
  const pkpKumulatif = kumulatif;
  const pkpSekarang = pkpKumulatif + bruto;
  const pajakKumulatif = hitungTarifProgresif(pkpKumulatif);
  const pajakTotal = hitungTarifProgresif(pkpSekarang);
  const pph21 = Math.round(Math.max(0, pajakTotal - pajakKumulatif));

  window._lastPPh21 = { gaji: bruto, pph: pph21, jht: 0, kategori: 'pensiun' };
  el.innerHTML = resRow('Jumlah Penarikan Dana Pensiun', rp(bruto))
    + (kumulatif ? resRow('Kumulatif Penarikan s.d. sebelumnya', rp(kumulatif)) : '')
    + resRow('Tarif Ps.17 (Progresif)', 'Berdasarkan kumulatif penarikan')
    + resRow('PPh 21 Masa Ini', '<span class="kredit" style="font-size:18px">' + rp(pph21) + '</span>')
    + resRow('Jumlah Diterima (Netto)', rp(bruto - pph21));

  tw.style.display = 'block';
  document.getElementById('p21-tabel-title').textContent = 'Lapisan Tarif Progresif — Penarikan Dana Pensiun';
  document.getElementById('p21-th1').textContent = 'PKP Kumulatif Lapisan';
  const {rows} = hitungTarifProgresifDetail(pkpSekarang);
  document.getElementById('p21-tabel-body').innerHTML = rows.join('');

  const pmkEl = document.getElementById('p21-pmk-info');
  if(pmkEl) {
    pmkEl.style.display = 'block';
    document.getElementById('p21-pmk-info-text').innerHTML = `
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Peserta Program Pensiun (Pegawai)</b> — atas penarikan dana pensiun di awal.<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Formula: <b>Ph.Bruto × Tarif Ps.17</b> — diterapkan per masa pajak.<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tarif progresif dihitung berdasarkan kumulatif penarikan dalam setahun.
    `;
  }
  setTimeout(addInputBtnToPPH21, 80);
}

function hitungPPh21MantanPegawai() {
  const bruto = parseFloat(document.getElementById('p21-mantan-bruto').value)||0;
  const kumulatif = parseFloat(document.getElementById('p21-mantan-kumulatif').value)||0;
  const npwp = document.getElementById('p21-mantan-npwp').value;
  const el = document.getElementById('pph21-hasil');
  const tw = document.getElementById('p21-tabel-wrap');
  if(!bruto) return;

  // Mantan Pegawai: Ph.Bruto × Tarif Ps.17
  const pkpKumulatif = kumulatif;
  const pkpSekarang = pkpKumulatif + bruto;
  const pajakKumulatif = hitungTarifProgresif(pkpKumulatif);
  const pajakTotal = hitungTarifProgresif(pkpSekarang);
  const pajakPeriode = Math.round(Math.max(0, pajakTotal - pajakKumulatif));
  const multiplier = npwp === 'tidak' ? 1.2 : 1;
  const pph21 = Math.round(pajakPeriode * multiplier);

  window._lastPPh21 = { gaji: bruto, pph: pph21, jht: 0, kategori: 'mantan-pegawai' };
  el.innerHTML = resRow('Jasa Produksi / Bonus / Gratifikasi', rp(bruto))
    + (kumulatif ? resRow('Kumulatif s.d. sebelumnya', rp(kumulatif)) : '')
    + resRow('Dasar Pengenaan', rp(bruto) + ' (100% bruto)')
    + resRow('Tarif Ps.17 (Progresif)', 'Berdasarkan PKP kumulatif')
    + (npwp==='tidak' ? resRow('Koreksi Non-NPWP (+20%)', '+20%') : '')
    + resRow('PPh 21 Masa Ini', '<span class="kredit" style="font-size:18px">' + rp(pph21) + '</span>')
    + resRow('Penghasilan Diterima (Netto)', rp(bruto - pph21));

  tw.style.display = 'block';
  document.getElementById('p21-tabel-title').textContent = 'Lapisan Tarif Progresif — Mantan Pegawai';
  document.getElementById('p21-th1').textContent = 'PKP Kumulatif Lapisan';
  const {rows} = hitungTarifProgresifDetail(pkpSekarang);
  document.getElementById('p21-tabel-body').innerHTML = rows.join('');

  const pmkEl = document.getElementById('p21-pmk-info');
  if(pmkEl) {
    pmkEl.style.display = 'block';
    document.getElementById('p21-pmk-info-text').innerHTML = `
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>Mantan Pegawai</b> — atas jasa produksi, tantiem, gratifikasi, bonus, atau imbalan lain.<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Formula: <b>Ph.Bruto × Tarif Ps.17</b> — per masa pajak.<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tarif progresif dihitung berdasarkan kumulatif penghasilan dalam setahun.<br>
      ${npwp==='tidak' ? '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tanpa NPWP: tarif ditambah <b>20%</b> dari nilai pajak.' : ''}
    `;
  }
  setTimeout(addInputBtnToPPH21, 80);
}

// PPh 21 — PNS/TNI/POLRI/Pejabat Negara (PMK 168/2023)
function hitungPPh21PNS() {
  const gaji = parseFloat(document.getElementById('p21-pns-gaji').value)||0;
  const tunjangan = parseFloat(document.getElementById('p21-pns-tunjangan').value)||0;
  const tunjanganKel = parseFloat(document.getElementById('p21-pns-tunjangan-kel').value)||0;
  const gaji13 = parseFloat(document.getElementById('p21-pns-gaji13').value)||0;
  const iuran = parseFloat(document.getElementById('p21-pns-iuran').value)||0;
  const ptkpKode = document.getElementById('p21-pns-ptkp').value;
  const bulan = parseInt(document.getElementById('p21-pns-bulan').value)||1;
  const el = document.getElementById('pph21-hasil');
  const tw = document.getElementById('p21-tabel-wrap');
  if(!gaji) return;

  const ptkpTbl = {
    TK0:54000000, TK1:58500000, TK2:63000000, TK3:67500000,
    K0:58500000, K1:63000000, K2:67500000, K3:72000000
  };
  const ptkp = ptkpTbl[ptkpKode]||58500000;

  // Penghasilan bruto bulan ini (termasuk gaji ke-13 jika ada)
  const brutoBulan = gaji + tunjangan + tunjanganKel + gaji13;

  // PMK 168/2023: PNS/TNI/POLRI menggunakan TER Bulanan untuk Jan-Nov
  // Masa pajak terakhir = rekonsiliasi Ps.17
  const tarif = getTERTarif(brutoBulan, ptkpKode);
  const pphTER = Math.round(brutoBulan * tarif);

  let rekHTML = '';
  if(bulan === 12) {
    // Rekonsiliasi akhir tahun dengan Pasal 17 (PMK 168/2023)
    const brutoBulananTetap = gaji + tunjangan + tunjanganKel;
    const brutoSetahun = brutoBulananTetap * 12 + gaji13;
    const iuranSetahun = iuran * 12;
    const biayaJabatan = Math.min(brutoSetahun * 0.05, 6000000);
    const netoSetahun = brutoSetahun - biayaJabatan - iuranSetahun;
    const pkp = Math.max(0, Math.floor((netoSetahun - ptkp)/1000)*1000);
    const {pajak: pajTahunan, rows: lapisanRows} = hitungTarifProgresifDetail(pkp);
    const pphJanNov = Math.round(getTERTarif(brutoBulananTetap, ptkpKode) * brutoBulananTetap) * 11;
    const pphDes = Math.round(pajTahunan - pphJanNov);

    window._lastPPh21 = { gaji: brutoBulan, pph: pphDes, jht: iuran, kategori: 'pns' };

    tw.style.display = 'block';
    document.getElementById('p21-tabel-title').textContent = 'Lapisan Tarif Ps.17 — Rekonsiliasi Desember (PNS)';
    document.getElementById('p21-th1').textContent = 'PKP Lapisan';
    document.getElementById('p21-tabel-body').innerHTML = lapisanRows.join('');

    rekHTML = '<div style="margin-top:12px;border-radius:10px;border:1px solid rgba(245,158,11,0.3);overflow:hidden;">'
      + '<div style="background:rgba(245,158,11,0.1);padding:10px 14px;font-weight:700;color:var(--accent3);font-size:12.5px;">📆 Rekonsiliasi Akhir Tahun — Pasal 17</div>'
      + '<div style="padding:12px 14px;">'
      + resRow('Penghasilan Bruto Setahun', rp(brutoSetahun))
      + resRow('Biaya Jabatan (maks Rp6jt)', rp(biayaJabatan))
      + resRow('Iuran Pensiun/JHT Setahun', rp(iuranSetahun))
      + resRow('Penghasilan Neto Setahun', rp(netoSetahun))
      + resRow('PTKP (' + ptkpKode + ')', rp(ptkp))
      + resRow('PKP Setahun', rp(pkp))
      + '<div style="height:1px;background:var(--border);margin:8px 0;"></div>'
      + resRow('PPh 21 Tahunan (Ps.17)', '<b>' + rp(pajTahunan) + '</b>')
      + resRow('PPh dipotong Jan-Nov (est.)', rp(pphJanNov))
      + resRow('PPh Desember (Rekonsiliasi)', '<b style="color:var(--accent3)">' + rp(pphDes) + '</b>')
      + '</div></div>';

    el.innerHTML = resRow('Penghasilan Bruto Bulan Ini', rp(brutoBulan))
      + resRow('Tarif TER Desember (' + ptkpKode + ')', (tarif*100).toFixed(2) + '%')
      + resRow('PPh 21 Desember (Rekonsiliasi Ps.17)', '<span class="' + (pphDes >= 0 ? 'kredit' : 'debit') + '" style="font-size:18px">' + (pphDes < 0 ? '(Lebih Potong) ' : '') + rp(Math.abs(pphDes)) + '</span>')
      + resRow('Iuran Pensiun/JHT', rp(iuran))
      + resRow('Take Home Pay (Desember)', rp(brutoBulan - Math.max(0, pphDes) - iuran))
      + rekHTML;
  } else {
    window._lastPPh21 = { gaji: brutoBulan, pph: pphTER, jht: iuran, kategori: 'pns' };
    tw.style.display = 'block';
    document.getElementById('p21-tabel-title').textContent = 'Tabel TER Bulan ke-' + bulan + ' (PNS — TER ' + getTERKategori(ptkpKode) + ', ' + ptkpKode + ')';
    document.getElementById('p21-th1').textContent = 'Penghasilan Bruto Bulanan ≤';
    const tbl = getTERTable(ptkpKode);
    let activeIdx = tbl.findIndex(([batas]) => brutoBulan <= batas);
    if(activeIdx < 0) activeIdx = tbl.length - 1;
    document.getElementById('p21-tabel-body').innerHTML = tbl.map(([batas, rate], idx, arr) => {
      const isActive = idx === activeIdx;
      const batasLabel = batas === Infinity ? '> ' + rp(arr[idx-1]?.[0] || 0) : '≤ ' + rp(batas);
      return '<tr ' + (isActive ? 'style="background:rgba(245,158,11,0.12);font-weight:700;color:var(--accent3)"' : '') + '>'
        + '<td>' + batasLabel + (isActive ? ' ✓' : '') + '</td>'
        + '<td>' + (rate*100).toFixed(2) + '%</td>'
        + '<td class="kredit">' + rp(Math.round(brutoBulan * rate)) + '</td>'
        + '</tr>';
    }).join('') + '<tr><td colspan="3" style="text-align:center;color:var(--muted);font-size:11px;padding:8px;">Baris <b style="color:var(--accent3)">kuning ✓</b> = tarif aktif untuk penghasilan bruto Rp' + brutoBulan.toLocaleString('id-ID') + '</td></tr>';

    el.innerHTML = resRow('Penghasilan Bruto Bulan Ini', rp(brutoBulan))
      + (gaji13 ? resRow('⭐ Termasuk Gaji ke-13/14', rp(gaji13)) : '')
      + resRow('Tarif TER Kategori ' + getTERKategori(ptkpKode) + ' (' + ptkpKode + ')', (tarif*100).toFixed(2) + '%')
      + resRow('PPh 21 Bulan Ini (TER)', '<span class="kredit" style="font-size:18px">' + rp(pphTER) + '</span>')
      + resRow('Iuran Pensiun/JHT', rp(iuran))
      + resRow('Take Home Pay', rp(brutoBulan - pphTER - iuran))
      + '<div style="margin-top:10px;padding:10px 14px;background:rgba(74,222,128,0.06);border-radius:8px;border:1px solid rgba(74,222,128,0.15);font-size:12px;color:var(--muted);">📌 Bulan ' + bulan + ' dari 11 masa pajak TER. PPh Desember = rekonsiliasi Pasal 17.</div>';
  }

  const pmkEl = document.getElementById('p21-pmk-info');
  if(pmkEl) {
    pmkEl.style.display = 'block';
    document.getElementById('p21-pmk-info-text').innerHTML = `
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> <b>PNS/TNI/POLRI/Pejabat Negara</b> — penghasilan tetap teratur (PMK 168/2023).<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Masa Jan–Nov: <b>TER Bulanan × Penghasilan Bruto</b>. Kategori TER: <b>${getTERKategori(ptkpKode)}</b>.<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Masa Desember: rekonsiliasi wajib menggunakan <b>Tarif Pasal 17</b>.<br>
      <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Gaji ke-13/14 digabung ke penghasilan bruto bulan diterima.
    `;
  }
  setTimeout(addInputBtnToPPH21, 80);
}


function hitungPPh23() {
  const bruto = parseFloat(document.getElementById('p23-bruto').value)||0;
  const jenis = document.getElementById('p23-jenis').value;
  const npwp = document.getElementById('p23-npwp').value;
  const tarifMap = {dividen:0.15,bunga:0.15,royalti:0.15,hadiah:0.15,sewa:0.02,jasa:0.02,'jasa-lain':0.02};
  let tarif = jenis==='custom' ? (parseFloat(document.getElementById('p23-tarif-custom').value)||2)/100 : (tarifMap[jenis]||0.02);
  if(npwp==='tidak') tarif *= 2;
  const pajak = bruto * tarif;
  const bersih = bruto - pajak;
  const el = document.getElementById('pph23-hasil');
  if(!bruto) return;
  el.innerHTML = resRow('Jumlah Bruto', rp(bruto))
    + resRow('Tarif PPh 23'+(npwp==='tidak'?' (+100% tanpa NPWP)':''), pct(tarif*100))
    + resRow('PPh 23 Dipotong', `<span style="color:var(--red);font-size:18px">${rp(pajak)}</span>`)
    + resRow('Jumlah Diterima Bersih', rp(bersih))
    + resRow('Bukti Potong', 'Wajib diterbitkan oleh pemotong');
}

function hitungBadan() {
  const laba = parseFloat(document.getElementById('bd-laba').value)||0;
  const omzet = parseFloat(document.getElementById('bd-omzet').value)||0;
  const p25 = parseFloat(document.getElementById('bd-p25').value)||0;
  const potong = parseFloat(document.getElementById('bd-potong').value)||0;
  const koreksi = parseFloat(document.getElementById('bd-koreksi').value)||0;
  if(!laba) return;

  const pkp = laba + koreksi;
  let pajak = 0, catatan = '';

  // PP 23 tarif 0.5% untuk omzet < 4.8M
  if(omzet > 0 && omzet <= 4800000000) {
    pajak = omzet * 0.005;
    catatan = 'Tarif PP 23/2018: 0.5% dari omzet (UMKM ≤ 4,8 Milyar)';
  } else if(omzet > 0 && omzet <= 50000000000) {
    // fasilitas 50% untuk sebagian PKP
    const porsiDiskon = Math.min(4800000000/omzet, 1) * pkp;
    const porsiNormal = pkp - porsiDiskon;
    pajak = porsiDiskon*0.11 + porsiNormal*0.22;
    catatan = 'Sebagian mendapat fasilitas pengurangan 50% (Ps. 31E UU PPh)';
  } else {
    pajak = pkp * 0.22;
    catatan = 'Tarif umum 22% (Ps. 17 UU PPh)';
  }

  const kurangBayar = Math.max(0, pajak - p25 - potong);
  const lebihBayar = Math.max(0, p25 + potong - pajak);
  const el = document.getElementById('badan-hasil');
  el.innerHTML = resRow('Laba Sebelum Pajak', rp(laba))
    + resRow('Koreksi Fiskal', rp(koreksi))
    + resRow('PKP (Penghasilan Kena Pajak)', rp(pkp))
    + resRow('PPh Terutang', `<span style="color:var(--red);font-size:18px">${rp(pajak)}</span>`)
    + resRow('PPh Pasal 25 Dibayar', rp(p25))
    + resRow('PPh Dipotong Pihak Lain', rp(potong))
    + resRow(kurangBayar>0?'PPh Kurang Bayar (Ps. 29)':'PPh Lebih Bayar', rp(kurangBayar||lebihBayar))
    + `<div style="margin-top:12px;padding:10px;background:var(--surface2);border-radius:6px;font-size:12px;color:var(--muted);">${catatan}</div>`;
}
