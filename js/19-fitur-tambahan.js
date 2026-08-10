
// ══════════════════════════════════════════════════════════════
// JURNAL BERULANG
// ══════════════════════════════════════════════════════════════
function openModalJurnalBerulang(editId) {
  // Reset picker buttons
  ['jb-akun-debit','jb-akun-kredit'].forEach(id => {
    const hidden = document.getElementById(id); if(hidden) hidden.value = '';
    const btn = document.getElementById(id+'-btn'); if(btn) btn.textContent = 'Pilih Akun...';
  });
  document.getElementById('jb-tgl-mulai').value = new Date().toISOString().split('T')[0];
  if(editId) {
    const item = jurnalBerulangList.find(j=>j.id===editId);
    if(item) {
      ['nama','frekuensi','tgl-mulai','tgl-akhir','nominal','keterangan'].forEach(f=>{
        const el = document.getElementById('jb-'+f); if(el) el.value = item[f.replace('-','')] || '';
      });
      // Set hidden inputs + update btn labels for akun picker
      const setAkunBtn = (id, kode) => {
        const hidden = document.getElementById(id); if(hidden) hidden.value = kode;
        const akun = akuns.find(a=>a.kode===kode);
        const btn = document.getElementById(id+'-btn');
        if(btn && akun) { btn.innerHTML = `<span class="picker-kode-badge">${escapeHtml(akun.kode)}</span> ${escapeHtml(akun.nama)} <span style="margin-left:auto;color:var(--muted);font-size:10px;">▾</span>`; btn.classList.add('has-value'); }
      };
      setAkunBtn('jb-akun-debit', item.akunDebit);
      setAkunBtn('jb-akun-kredit', item.akunKredit);
    }
    document.getElementById('modal-jb')._editId = editId;
  } else {
    document.getElementById('modal-jb')._editId = null;
    ['jb-nama','jb-nominal','jb-keterangan','jb-tgl-akhir'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
  }
  openModal('modal-jb');
  setTimeout(upgradeFormPickers, 80);
}

function simpanJurnalBerulang() {
  const nama = document.getElementById('jb-nama').value.trim();
  const nominal = parseFloat(document.getElementById('jb-nominal').value)||0;
  const akunDebit = document.getElementById('jb-akun-debit').value;
  const akunKredit = document.getElementById('jb-akun-kredit').value;
  const frekuensi = document.getElementById('jb-frekuensi').value;
  const tglMulai = document.getElementById('jb-tgl-mulai').value;
  if(!nama || !nominal || !akunDebit || !akunKredit || !tglMulai) {
    showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lengkapi semua field wajib'); return;
  }
  showOpSpinner('Menyimpan Jurnal Berulang...', 'Memvalidasi & menjadwalkan');
  setTimeout(()=>{
    const editId = document.getElementById('modal-jb')._editId;
    const item = {
      id: editId || 'jb_'+Date.now(),
      nama, frekuensi, akunDebit, akunKredit, nominal,
      keterangan: document.getElementById('jb-keterangan').value||nama,
      tglMulai, tglAkhir: document.getElementById('jb-tgl-akhir').value||null,
      aktif: true,
      berikutnya: hitungTanggalBerikutnya(tglMulai, frekuensi),
      createdAt: new Date().toISOString()
    };
    if(editId) {
      const idx = jurnalBerulangList.findIndex(j=>j.id===editId);
      if(idx>=0) jurnalBerulangList[idx] = item;
    } else {
      jurnalBerulangList.unshift(item);
    }
    saveFiturBaru();
    closeModal('modal-jb');
    renderJurnalBerulang();
    showAlert('✓ Jurnal berulang berhasil disimpan!');
    hideOpSpinner();
  }, 600);
}

function hitungTanggalBerikutnya(tglMulai, frekuensi) {
  const d = new Date(tglMulai);
  const now = new Date();
  while(d <= now) {
    if(frekuensi==='harian') d.setDate(d.getDate()+1);
    else if(frekuensi==='mingguan') d.setDate(d.getDate()+7);
    else if(frekuensi==='bulanan') d.setMonth(d.getMonth()+1);
    else if(frekuensi==='triwulan') d.setMonth(d.getMonth()+3);
    else if(frekuensi==='tahunan') d.setFullYear(d.getFullYear()+1);
    else break;
  }
  return d.toISOString().split('T')[0];
}

function renderJurnalBerulang() {
  const tbody = document.getElementById('jb-tbody');
  if(!tbody) return;
  if(!jurnalBerulangList.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px;">Belum ada jurnal berulang. Klik <b>+ Tambah Berulang</b>.</td></tr>`;
  } else {
    const today = new Date().toISOString().split('T')[0];
    tbody.innerHTML = jurnalBerulangList.map(j=>{
      const aD = akuns.find(a=>a.kode===j.akunDebit); const aK = akuns.find(a=>a.kode===j.akunKredit);
      const terlambat = j.berikutnya < today;
      const statusBadge = !j.aktif ? `<span style="background:rgba(100,116,139,0.15);color:var(--muted);padding:2px 8px;border-radius:6px;font-size:11px;">Nonaktif</span>`
        : terlambat ? `<span style="background:rgba(248,113,113,0.15);color:var(--red);padding:2px 8px;border-radius:6px;font-size:11px;"><i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tertunda</span>`
        : `<span style="background:rgba(74,222,128,0.12);color:var(--accent);padding:2px 8px;border-radius:6px;font-size:11px;"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Aktif</span>`;
      return `<tr>
        <td style="font-weight:600">${j.nama}</td>
        <td style="text-transform:capitalize">${j.frekuensi}</td>
        <td style="font-family:var(--mono);font-size:12px;${terlambat?'color:var(--red);':''}">${j.berikutnya}</td>
        <td style="font-size:12px">${aD?aD.nama:j.akunDebit}</td>
        <td style="font-size:12px">${aK?aK.nama:j.akunKredit}</td>
        <td class="debit" style="font-family:var(--mono)">${rp(j.nominal)}</td>
        <td>${statusBadge}</td>
        <td style="display:flex;gap:6px;flex-wrap:wrap;">
          <button class="btn btn-ghost btn-sm" onclick="jalankanJurnalBerulang('${j.id}')"><i class="ti ti-player-play" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i></button>
          <button class="btn btn-ghost btn-sm" onclick="openModalJurnalBerulang('${j.id}')">[Edit]</button>
          <button class="btn btn-ghost btn-sm" onclick="toggleAktifJB('${j.id}')">${j.aktif?'<i class="ti ti-player-pause" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>':'<i class="ti ti-player-play" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>'}</button>
          <button class="btn btn-danger btn-sm" onclick="hapusJurnalBerulang('${j.id}')"><i class="ti ti-trash" style="font-size:14px;"></i></button>
        </td>
      </tr>`;
    }).join('');
  }
  const hbody = document.getElementById('jb-history-tbody');
  if(hbody) {
    if(!jurnalBerulangHistory.length) {
      hbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:20px;">Belum ada riwayat eksekusi</td></tr>`;
    } else {
      hbody.innerHTML = [...jurnalBerulangHistory].slice(0,30).map(h=>`<tr>
        <td style="font-family:var(--mono);font-size:12px">${h.tgl}</td>
        <td>${escapeHtml(h.nama)}</td>
        <td class="debit" style="font-family:var(--mono)">${rp(h.nominal)}</td>
        <td><span style="background:rgba(74,222,128,0.12);color:var(--accent);padding:2px 8px;border-radius:6px;font-size:11px;"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Berhasil</span></td>
      </tr>`).join('');
    }
  }
}

function jalankanJurnalBerulang(id) {
  const j = jurnalBerulangList.find(x=>x.id===id);
  if(!j) return;
  showOpSpinner('Menjalankan Jurnal Berulang...', `Membuat jurnal: ${j.nama}`);
  setTimeout(()=>{
    const tgl = new Date().toISOString().split('T')[0];
    const entry = {
      id:'JRN_'+Date.now(), tanggal:tgl, jenis:'Manual',
      keterangan:`[Auto] ${j.nama}`,
      lines:[{akun:j.akunDebit,debit:j.nominal,kredit:0},{akun:j.akunKredit,debit:0,kredit:j.nominal}]
    };
    jurnalEntries.push(entry);
    jurnalBerulangHistory.unshift({tgl, nama:j.nama, nominal:j.nominal, jurnalId:entry.id});
    j.berikutnya = hitungTanggalBerikutnya(j.berikutnya, j.frekuensi);
    saveFiturBaru(); saveToStorage(false);
    renderJurnalBerulang();
    showAlert(`✓ Jurnal "${j.nama}" berhasil dibuat!`);
    hideOpSpinner();
    cekNotifikasi();
  }, 800);
}

function jalankanSemuaJurnalBerulang() {
  const today = new Date().toISOString().split('T')[0];
  const tertunda = jurnalBerulangList.filter(j=>j.aktif && j.berikutnya <= today);
  if(!tertunda.length) { showAlert('Tidak ada jurnal yang tertunda'); return; }
  showOpSpinner(`Menjalankan ${tertunda.length} Jurnal Tertunda...`, 'Memproses batch...');
  let i = 0;
  function next() {
    if(i >= tertunda.length) {
      saveFiturBaru(); saveToStorage(false); renderJurnalBerulang();
      showAlert(`✓ ${tertunda.length} jurnal berhasil dieksekusi!`);
      hideOpSpinner(); cekNotifikasi(); return;
    }
    const j = tertunda[i++];
    const tgl = new Date().toISOString().split('T')[0];
    const entry = {
      id:'JRN_'+Date.now()+'_'+i, tanggal:tgl, jenis:'Manual',
      keterangan:`[Auto] ${j.nama}`,
      lines:[{akun:j.akunDebit,debit:j.nominal,kredit:0},{akun:j.akunKredit,debit:0,kredit:j.nominal}]
    };
    jurnalEntries.push(entry);
    jurnalBerulangHistory.unshift({tgl, nama:j.nama, nominal:j.nominal, jurnalId:entry.id});
    j.berikutnya = hitungTanggalBerikutnya(j.berikutnya, j.frekuensi);
    setTimeout(next, 150);
  }
  next();
}

function hapusJurnalBerulang(id) {
  if(!confirm('Hapus jurnal berulang ini?')) return;
  showOpSpinner('Menghapus...','');
  setTimeout(()=>{
    jurnalBerulangList = jurnalBerulangList.filter(j=>j.id!==id);
    saveFiturBaru(); renderJurnalBerulang();
    showAlert('✓ Jurnal berulang dihapus'); hideOpSpinner();
  }, 400);
}

function toggleAktifJB(id) {
  const j = jurnalBerulangList.find(x=>x.id===id);
  if(j) { j.aktif = !j.aktif; saveFiturBaru(); renderJurnalBerulang(); }
}

// ══════════════════════════════════════════════════════════════
// INVOICE & PIUTANG
// ══════════════════════════════════════════════════════════════
let _invItems = [];

function openModalInvoice(editId) {
  _invItems = [{ nama:'', qty:1, harga:0 }];
  const tgl = new Date().toISOString().split('T')[0];
  const due = new Date(Date.now()+30*86400000).toISOString().split('T')[0];
  document.getElementById('inv-tgl').value = tgl;
  document.getElementById('inv-jatuh-tempo').value = due;
  document.getElementById('inv-no').value = 'INV-'+new Date().getFullYear()+'-'+String(invoiceList.length+1).padStart(3,'0');
  document.getElementById('inv-pelanggan').value = '';
  document.getElementById('inv-deskripsi').value = '';

  // Set default akun via hidden inputs + update btn label
  const setPickerDefault = (hiddenId, btnId, kode) => {
    const h=document.getElementById(hiddenId); if(h) h.value=kode;
    const akun=akuns.find(a=>a.kode===kode);
    const btn=document.getElementById(btnId);
    if(btn&&akun){btn.innerHTML=`<span class="picker-kode-badge">${escapeHtml(akun.kode)}</span> ${escapeHtml(akun.nama)} <span style="margin-left:auto;color:var(--muted);font-size:10px;">▾</span>`;btn.classList.add('has-value');}
  };
  const piutangDefault = akuns.find(a=>a.tipe==='Aset'&&a.nama.toLowerCase().includes('piutang'));
  const pendDefault = akuns.find(a=>a.tipe==='Pendapatan');
  if(piutangDefault) setPickerDefault('inv-akun-piutang','inv-akun-piutang-btn',piutangDefault.kode);
  if(pendDefault) setPickerDefault('inv-akun-pend','inv-akun-pend-btn',pendDefault.kode);

  renderInvoiceItems();
  openModal('modal-invoice');
  setTimeout(upgradeFormPickers, 80);
}

function parseCSVBank(lines, bank) {
  const result = [];
  // Skip header rows
  lines.slice(1).forEach(line => {
    const cols = line.split(',').map(c=>c.replace(/"/g,'').trim());
    if(cols.length < 3) return;
    let tgl='', ket='', nominal=0;
    try {
      if(bank==='bca') { tgl=cols[0];ket=cols[1];nominal=parseFloat((cols[2]||'0').replace(/\./g,'').replace(',','.'))||0; }
      else if(bank==='mandiri') { tgl=cols[0];ket=cols[2];nominal=parseFloat((cols[3]||'0').replace(/\./g,'').replace(',','.'))||0; }
      else { tgl=cols[0];ket=cols[1];nominal=parseFloat((cols[2]||'0').replace(/[^0-9.-]/g,''))||0; }
      if(tgl && nominal) result.push({tgl,ket,nominal,status:'belum',jurnalId:null});
    } catch(e){}
  });
  return result;
}

function prosesRekonsiliasi() {
  if(!rekonData.baris.length) { showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Upload CSV mutasi bank terlebih dahulu'); return; }
  showOpSpinner('Mencocokkan Data...', 'Membandingkan mutasi vs jurnal');
  setTimeout(()=>{
    rekonData.baris.forEach(b=>{
      const match = jurnalEntries.find(j=>{
        if(j.tanggal !== b.tgl) return false;
        const totalLine = j.lines.reduce((s,l)=>s+Math.max(l.debit,l.kredit),0);
        return Math.abs(totalLine - Math.abs(b.nominal)) < 1000;
      });
      if(match) {
        const totalLine = match.lines.reduce((s,l)=>s+Math.max(l.debit,l.kredit),0);
        b.status = Math.abs(totalLine-Math.abs(b.nominal))<1 ? 'cocok' : 'beda';
        b.jurnalId = match.id;
        b.nominalJurnal = totalLine;
      } else { b.status='belum'; b.jurnalId=null; }
    });
    const cocok = rekonData.baris.filter(b=>b.status==='cocok').length;
    const beda = rekonData.baris.filter(b=>b.status==='beda').length;
    const belum = rekonData.baris.filter(b=>b.status==='belum').length;
    document.getElementById('rekon-summary').innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">
        <div class="stat-card" style="padding:12px;"><div style="font-size:18px"></div><div class="stat-label">Cocok</div><div style="font-size:20px;font-weight:700;color:var(--accent);font-family:var(--mono);">${cocok}</div></div>
        <div class="stat-card" style="padding:12px;"><div style="font-size:18px"></div><div class="stat-label">Beda Nominal</div><div style="font-size:20px;font-weight:700;color:var(--accent3);font-family:var(--mono);">${beda}</div></div>
        <div class="stat-card" style="padding:12px;"><div style="font-size:18px"></div><div class="stat-label">Belum Cocok</div><div style="font-size:20px;font-weight:700;color:var(--red);font-family:var(--mono);">${belum}</div></div>
      </div>`;
    renderRekonTable('all');
    document.getElementById('rekon-result-card').style.display='';
    hideOpSpinner();
    showAlert(`✓ Rekonsiliasi selesai: ${cocok} cocok, ${belum} perlu perhatian`);
  }, 1200);
}

let _rekonFilter = 'all';
function filterRekon(f) {
  _rekonFilter = f;
  ['all','cocok','belum','beda'].forEach(x=>{
    const btn=document.getElementById('rekon-btn-'+x);
    if(btn) btn.className='btn btn-'+(f===x?'primary':'ghost')+' btn-sm';
  });
  renderRekonTable(f);
}

function renderRekonTable(filter) {
  const tbody = document.getElementById('rekon-tbody'); if(!tbody) return;
  const list = filter==='all' ? rekonData.baris : rekonData.baris.filter(b=>b.status===filter);
  tbody.innerHTML = list.map((b,i)=>{
    const clr = b.status==='cocok'?'var(--accent)':b.status==='beda'?'var(--accent3)':'var(--red)';
    const icon = b.status==='cocok'?'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>':b.status==='beda'?'<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>':'<i class="ti ti-question-mark" style="color:var(--red);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>';
    const j = b.jurnalId ? jurnalEntries.find(x=>x.id===b.jurnalId) : null;
    return `<tr>
      <td style="font-size:12px;font-family:var(--mono)">${b.tgl}</td>
      <td style="font-size:12px;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(b.ket)}</td>
      <td style="font-family:var(--mono);font-size:12px">${rp(Math.abs(b.nominal))}</td>
      <td style="font-size:12px;color:var(--muted)">${j?j.keterangan:'—'}</td>
      <td style="font-family:var(--mono);font-size:12px">${b.nominalJurnal?rp(b.nominalJurnal):'—'}</td>
      <td><span style="color:${clr};font-size:12px;font-weight:600;">${icon} ${b.status}</span></td>
      <td>${b.status==='belum'?`<button class="btn btn-ghost btn-sm" onclick="importSatuRekon(${rekonData.baris.indexOf(b)})"><i class="ti ti-download ti-inline"></i> Import</button>`:''}
      </td>
    </tr>`;
  }).join('');
}

function importSatuRekon(idx) {
  const b = rekonData.baris[idx]; if(!b) return;
  showOpSpinner('Membuat Jurnal...', 'Mengimpor transaksi bank');
  setTimeout(()=>{
    const masuk = b.nominal > 0;
    const kas = akuns.find(a=>a.kode==='1101');
    const oth = akuns.find(a=>a.tipe==='Pendapatan');
    if(!kas||!oth) { hideOpSpinner(); showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Akun kas/pendapatan tidak ditemukan'); return; }
    const entry = {
      id:'JRN_REKON_'+Date.now(), tanggal:b.tgl, jenis:'Manual',
      keterangan:`[Rekon] ${b.ket}`,
      lines: masuk
        ? [{akun:kas.kode,debit:Math.abs(b.nominal),kredit:0},{akun:oth.kode,debit:0,kredit:Math.abs(b.nominal)}]
        : [{akun:oth.kode,debit:Math.abs(b.nominal),kredit:0},{akun:kas.kode,debit:0,kredit:Math.abs(b.nominal)}]
    };
    jurnalEntries.push(entry);
    b.status='cocok'; b.jurnalId=entry.id; b.nominalJurnal=Math.abs(b.nominal);
    saveToStorage(false); renderRekonTable(_rekonFilter);
    showAlert('✓ Jurnal berhasil dibuat dari mutasi bank');
    hideOpSpinner();
  }, 700);
}

function importRekonSebagaiJurnal() {
  const belum = rekonData.baris.filter(b=>b.status==='belum');
  if(!belum.length) { showAlert('Tidak ada transaksi yang belum cocok'); return; }
  if(!confirm(`Import ${belum.length} transaksi belum cocok sebagai jurnal baru?`)) return;
  showOpSpinner(`Mengimpor ${belum.length} Transaksi...`, 'Membuat jurnal dari mutasi bank');
  let i=0;
  function next() {
    if(i>=belum.length) {
      saveToStorage(false); renderRekonTable(_rekonFilter);
      showAlert(`✓ ${belum.length} transaksi berhasil diimpor`);
      hideOpSpinner(); return;
    }
    importSatuRekonDirect(belum[i++]); setTimeout(next, 100);
  }
  function importSatuRekonDirect(b) {
    const kas=akuns.find(a=>a.kode==='1101'); const oth=akuns.find(a=>a.tipe==='Pendapatan');
    if(!kas||!oth) return;
    const entry={id:'JRN_REKON_'+Date.now()+'_'+i,tanggal:b.tgl,jenis:'Manual',keterangan:`[Rekon] ${b.ket}`,
      lines:b.nominal>0?[{akun:kas.kode,debit:Math.abs(b.nominal),kredit:0},{akun:oth.kode,debit:0,kredit:Math.abs(b.nominal)}]
        :[{akun:oth.kode,debit:Math.abs(b.nominal),kredit:0},{akun:kas.kode,debit:0,kredit:Math.abs(b.nominal)}]};
    jurnalEntries.push(entry); b.status='cocok'; b.jurnalId=entry.id; b.nominalJurnal=Math.abs(b.nominal);
  }
  next();
}

// ══════════════════════════════════════════════════════════════
// MULTI MATA UANG / KURS
// ══════════════════════════════════════════════════════════════
const MATA_UANG = ['USD','IDR','SGD','EUR','MYR','JPY'];
const KURS_DEMO = {USD:1,IDR:16200,SGD:1.35,EUR:0.92,MYR:4.72,JPY:156.3};

function renderKursPage() {
  renderKursCards();
  renderKursManualInputs();
  hitungKonversi();
}

function renderKursCards() {
  const el = document.getElementById('kurs-cards'); if(!el) return;
  const base = kursData.IDR||16200;
  el.innerHTML = MATA_UANG.map(k=>{
    const val = k==='IDR' ? 1 : (kursData.IDR||16200)/(kursData[k]||1);
    const currencyIcons = {
      USD: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
      IDR: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><text x="2" y="17" font-size="14" font-weight="bold" fill="currentColor" stroke="none" font-family="sans-serif">Rp</text></svg>`,
      SGD: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/><path d="M8 5h1"/></svg>`,
      EUR: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 5h-5a7 7 0 100 14h5M4 10h11M4 14h11"/></svg>`,
      MYR: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h7"/><circle cx="17" cy="18" r="3"/></svg>`,
      JPY: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l8 8 8-8M4 14h16M12 14v6"/></svg>`
    };
    return `<div class="stat-card" style="padding:14px 16px;">
      <div style="font-size:22px;margin-bottom:4px;color:var(--accent2);">${currencyIcons[k] || currencyIcons.USD}</div>
      <div class="stat-label">${k}</div>
      <div style="font-size:15px;font-weight:700;color:var(--accent2);font-family:var(--mono);margin-top:4px;">${k==='IDR'?'Base':rp(val).replace('Rp','').trim()}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px;">1 ${k==='IDR'?'IDR':'USD'} = ${k==='IDR'?rp(1):(rp(val))}</div>
    </div>`;
  }).join('');
}

function renderKursManualInputs() {
  const el = document.getElementById('kurs-manual-inputs'); if(!el) return;
  el.innerHTML = MATA_UANG.filter(k=>k!=='USD').map(k=>`
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
      <span style="font-weight:700;min-width:40px;font-family:var(--mono);">${k}</span>
      <input type="number" id="kurs-input-${k}" value="${kursData[k]||KURS_DEMO[k]}" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:7px 10px;color:var(--text);font-size:13px;font-family:var(--mono);">
      <span style="font-size:11px;color:var(--muted);">per USD</span>
    </div>`).join('');
}

function simpanKursManual() {
  showOpSpinner('Menyimpan Kurs...', 'Memperbarui data mata uang');
  setTimeout(()=>{
    MATA_UANG.filter(k=>k!=='USD').forEach(k=>{
      const v = parseFloat(document.getElementById('kurs-input-'+k)?.value)||KURS_DEMO[k];
      kursData[k] = v;
    });
    kursData.USD=1; kursData.updatedAt=new Date().toISOString();
    saveFiturBaru(); renderKursCards(); hitungKonversi();
    showAlert('✓ Kurs berhasil disimpan!'); hideOpSpinner();
  }, 600);
}

function refreshKursOtomatis() {
  showOpSpinner('Mengambil Kurs Terbaru...', 'Menghubungi API nilai tukar');
  // Simulasi fetch kurs (dalam app nyata: fetch dari API)
  setTimeout(()=>{
    // Variasi kecil dari KURS_DEMO untuk simulasi
    MATA_UANG.filter(k=>k!=='USD').forEach(k=>{
      kursData[k] = KURS_DEMO[k] * (1 + (Math.random()-0.5)*0.02);
    });
    kursData.USD=1; kursData.updatedAt=new Date().toISOString();
    saveFiturBaru(); renderKursCards(); hitungKonversi(); renderKursManualInputs();
    showAlert('✓ Kurs berhasil diperbarui!'); hideOpSpinner();
  }, 1500);
}

function hitungKonversi() {
  const nominal = parseFloat(document.getElementById('kurs-nominal')?.value)||0;
  const dari = document.getElementById('kurs-dari')?.value||'IDR';
  const ke = document.getElementById('kurs-ke')?.value||'USD';
  if(!nominal) { const el=document.getElementById('kurs-hasil-detail'); if(el) el.textContent='Masukkan nominal untuk konversi'; return; }
  // Konversi via USD
  const toUSD = dari==='USD' ? nominal : nominal/(kursData[dari]||1);
  const hasil = ke==='USD' ? toUSD : toUSD*(kursData[ke]||1);
  const fmt=(v,c)=>v.toLocaleString('id-ID',{minimumFractionDigits:c==='JPY'?0:2,maximumFractionDigits:c==='JPY'||c==='IDR'?0:4});
  const el=document.getElementById('kurs-hasil-angka'); if(el) el.textContent=`${ke} ${fmt(hasil,ke)}`;
  const el2=document.getElementById('kurs-hasil-detail'); if(el2) el2.textContent=`${fmt(nominal,dari)} ${dari} = ${fmt(hasil,ke)} ${ke} · Kurs: 1 ${dari} = ${fmt(hasil/nominal,ke)} ${ke}`;
}

// ══════════════════════════════════════════════════════════════
// NOTIFIKASI & ALERT
// ══════════════════════════════════════════════════════════════
function openModalAlertBaru() { renderAlertForm(); openModal('modal-alert-baru'); setTimeout(upgradeFormPickers, 80); }

function renderAlertForm() {
  const tipe = document.getElementById('alert-tipe')?.value;
  const el = document.getElementById('alert-form-extra'); if(!el) return;
  if(tipe==='anggaran-terlampaui') el.innerHTML=`<div class="form-group"><label>Batas (%)</label><input type="number" id="alert-batas" value="90" placeholder="90"></div>`;
  else if(tipe==='invoice-jatuh-tempo') el.innerHTML=`<div class="form-group"><label>H- (hari sebelum jatuh tempo)</label><input type="number" id="alert-batas" value="3" placeholder="3"></div>`;
  else if(tipe==='saldo-akun-bawah') el.innerHTML=`<div class="form-group"><label>Akun</label><select id="alert-akun" style="width:100%">${akuns.map(a=>`<option value="${a.kode}">${a.kode} - ${a.nama}</option>`).join('')}</select></div><div class="form-group"><label>Batas Saldo Minimum (Rp)</label><input type="number" id="alert-batas" placeholder="1000000"></div>`;
  else el.innerHTML='';
}

function simpanAlertBaru() {
  const nama = document.getElementById('alert-nama')?.value.trim();
  const tipe = document.getElementById('alert-tipe')?.value;
  if(!nama) { showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Masukkan nama alert'); return; }
  showOpSpinner('Menyimpan Alert...','');
  setTimeout(()=>{
    notifAlerts.push({
      id:'alert_'+Date.now(), nama, tipe,
      batas: parseFloat(document.getElementById('alert-batas')?.value)||null,
      akun: document.getElementById('alert-akun')?.value||null,
      aktif:true, createdAt:new Date().toISOString()
    });
    saveFiturBaru(); closeModal('modal-alert-baru'); renderNotifikasiPage();
    showAlert('✓ Alert berhasil ditambahkan!'); hideOpSpinner();
    cekNotifikasi();
  }, 500);
}

function cekNotifikasi() {
  const today = new Date().toISOString().split('T')[0];
  const notifs = [];
  notifAlerts.filter(a=>a.aktif).forEach(a=>{
    if(a.tipe==='arus-kas-negatif') {
      const kasIn = jurnalEntries.reduce((s,j)=>s+j.lines.filter(l=>l.akun==='1101').reduce((ss,l)=>ss+l.debit,0),0);
      const kasOut = jurnalEntries.reduce((s,j)=>s+j.lines.filter(l=>l.akun==='1101').reduce((ss,l)=>ss+l.kredit,0),0);
      if(kasIn-kasOut<0) notifs.push({tipe:'danger',msg:`<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${a.nama}: Arus kas negatif (${rp(kasIn-kasOut)})`, alertId:a.id});
    }
    if(a.tipe==='invoice-jatuh-tempo') {
      const hariLimit = a.batas||3;
      invoiceList.filter(i=>i.status!=='lunas').forEach(i=>{
        const diff = (new Date(i.jatuhTempo)-new Date())/86400000;
        if(diff>=0&&diff<=hariLimit) notifs.push({tipe:'warning',msg:`🔔 Invoice ${i.noInvoice} (${i.pelanggan}) jatuh tempo dalam ${Math.ceil(diff)} hari`, alertId:a.id});
        if(diff<0) notifs.push({tipe:'danger',msg:`<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Invoice ${i.noInvoice} (${i.pelanggan}) SUDAH JATUH TEMPO ${Math.abs(Math.ceil(diff))} hari lalu`, alertId:a.id});
      });
    }
    if(a.tipe==='laba-negatif') {
      const pend=jurnalEntries.reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const ac=akuns.find(x=>x.kode===l.akun);return ss+(ac&&ac.tipe==='Pendapatan'?l.kredit:0)},0),0);
      const beban=jurnalEntries.reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const ac=akuns.find(x=>x.kode===l.akun);return ss+(ac&&ac.tipe==='Beban'?l.debit:0)},0),0);
      if(pend-beban<0) notifs.push({tipe:'danger',msg:`📉 ${a.nama}: Laba bersih negatif (${rp(pend-beban)})`, alertId:a.id});
    }
  });
  if(notifs.length) {
    notifs.forEach(n=>{ notifHistory.unshift({...n, tgl:today, dibaca:false}); });
    if(notifHistory.length>100) notifHistory=notifHistory.slice(0,100);
    saveFiturBaru();
    // Badge pada nav
    updateNotifBadge(notifs.length);
  }
  return notifs;
}

function updateNotifBadge(n) {
  const cards = document.querySelectorAll('.nav-card[data-page="notifikasi"]');
  cards.forEach(c=>{
    let badge = c.querySelector('.notif-badge');
    if(n>0) {
      if(!badge) { badge=document.createElement('span'); badge.className='notif-badge'; badge.style.cssText='position:absolute;top:4px;right:4px;background:var(--red);color:white;border-radius:50%;width:16px;height:16px;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:700;'; c.appendChild(badge); }
      badge.textContent=n>9?'9+':n;
    } else if(badge) badge.remove();
  });
}

function renderNotifikasiPage() {
  const aktifNotifs = cekNotifikasi();
  const alertEl = document.getElementById('notif-alert-list');
  if(alertEl) {
    if(!aktifNotifs.length) {
      alertEl.innerHTML=`<div style="background:rgba(74,222,128,0.08);border:1px solid rgba(74,222,128,0.2);border-radius:12px;padding:16px;text-align:center;color:var(--accent);"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Semua kondisi keuangan normal. Tidak ada alert aktif.</div>`;
    } else {
      alertEl.innerHTML=aktifNotifs.map(n=>`
        <div style="background:${n.tipe==='danger'?'rgba(248,113,113,0.1)':'rgba(245,158,11,0.1)'};border:1px solid ${n.tipe==='danger'?'rgba(248,113,113,0.3)':'rgba(245,158,11,0.3)'};border-radius:12px;padding:14px 16px;margin-bottom:10px;animation:fadeInUp 0.3s ease;">
          <div style="font-weight:600;color:${n.tipe==='danger'?'var(--red)':'var(--accent3)'};">${escapeHtml(n.msg)}</div>
        </div>`).join('');
    }
  }
  const configEl = document.getElementById('notif-config-list');
  if(configEl) {
    configEl.innerHTML = notifAlerts.length ? notifAlerts.map(a=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:10px;background:var(--surface2);border-radius:10px;margin-bottom:8px;border:1px solid var(--border);">
        <div><div style="font-size:13px;font-weight:600;">${escapeHtml(a.nama)}</div><div style="font-size:11px;color:var(--muted);margin-top:2px;">${a.tipe.replace(/-/g,' ')}</div></div>
        <div style="display:flex;gap:6px;">
          <button onclick="toggleAlert('${a.id}')" class="btn btn-ghost btn-sm">${a.aktif?'<i class="ti ti-player-pause" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>':'<i class="ti ti-player-play" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>'}</button>
          <button onclick="hapusAlert('${a.id}')" class="btn btn-danger btn-sm"><i class="ti ti-trash" style="font-size:14px;"></i></button>
        </div>
      </div>`).join('') : `<div style="color:var(--muted);font-size:13px;text-align:center;padding:24px;">Belum ada alert. Klik + Tambah Alert.</div>`;
  }
  const histEl = document.getElementById('notif-history');
  if(histEl) {
    histEl.innerHTML = notifHistory.slice(0,20).map(n=>`
      <div style="padding:10px 14px;border-bottom:1px solid var(--border);">
        <div style="font-size:12px;color:${n.tipe==='danger'?'var(--red)':'var(--accent3)'};">${escapeHtml(n.msg)}</div>
        <div style="font-size:10px;color:var(--muted);margin-top:2px;">${n.tgl}</div>
      </div>`).join('') || `<div style="color:var(--muted);font-size:12px;padding:20px;text-align:center;">Belum ada riwayat notifikasi</div>`;
  }
}

function toggleAlert(id) {
  const a=notifAlerts.find(x=>x.id===id); if(a){a.aktif=!a.aktif;saveFiturBaru();renderNotifikasiPage();}
}
function hapusAlert(id) {
  notifAlerts=notifAlerts.filter(x=>x.id!==id);saveFiturBaru();renderNotifikasiPage();showAlert('✓ Alert dihapus');
}

// ══════════════════════════════════════════════════════════════
// ANGGARAN vs AKTUAL
// ══════════════════════════════════════════════════════════════
function openModalAnggaran(editId) {
  // Reset akun picker button
  const h=document.getElementById('ang-akun'); if(h) h.value='';
  const btn=document.getElementById('ang-akun-btn'); if(btn){btn.textContent='Pilih Akun...';btn.classList.remove('has-value');}
  const now=new Date();
  const angPer = document.getElementById('ang-periode');
  const angPerDisp = document.getElementById('ang-periode-text');
  const angPerVal = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  if(angPer) angPer.value = angPerVal;
  if(angPerDisp) { const [y,m]=angPerVal.split('-'); const months=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; angPerDisp.textContent=`${months[parseInt(m)-1]} ${y}`; }
  document.getElementById('ang-nominal').value='';
  document.getElementById('ang-catatan').value='';
  openModal('modal-anggaran');
  setTimeout(upgradeFormPickers, 80);
}

function simpanAnggaran() {
  const akunKode=document.getElementById('ang-akun')?.value;
  const periode=document.getElementById('ang-periode')?.value;
  const nominal=parseFloat(document.getElementById('ang-nominal')?.value)||0;
  if(!akunKode||!periode||!nominal){showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Lengkapi semua field');return;}
  showOpSpinner('Menyimpan Anggaran...','');
  setTimeout(()=>{
    const exist=anggaranList.findIndex(a=>a.akunKode===akunKode&&a.periode===periode);
    const item={id:'ang_'+Date.now(),akunKode,periode,nominal,catatan:document.getElementById('ang-catatan')?.value||''};
    if(exist>=0) anggaranList[exist]=item; else anggaranList.push(item);
    saveFiturBaru(); closeModal('modal-anggaran'); renderAnggaranPage();
    showAlert('✓ Anggaran berhasil disimpan!'); hideOpSpinner();
  }, 500);
}

function renderAnggaranPage() {
  const now=new Date();
  const periodeAktif=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const angBulanIni=anggaranList.filter(a=>a.periode===periodeAktif);

  // Hitung aktual per akun bulan ini
  function getAktual(kode) {
    return jurnalEntries.filter(j=>j.tanggal.startsWith(periodeAktif)).reduce((s,j)=>
      s+j.lines.filter(l=>l.akun===kode).reduce((ss,l)=>ss+Math.max(l.debit,l.kredit),0),0);
  }

  // KPI
  const kpiEl=document.getElementById('ang-kpi');
  if(kpiEl) {
    const totAng=angBulanIni.reduce((s,a)=>s+a.nominal,0);
    const totAkt=angBulanIni.reduce((s,a)=>s+getAktual(a.akunKode),0);
    const variance=totAng-totAkt;
    kpiEl.innerHTML=[
      {label:'Total Anggaran',val:rp(totAng),icon:'<i class="ti ti-target" style="font-size:14px;"></i>',clr:'var(--accent2)'},
      {label:'Total Aktual',val:rp(totAkt),icon:'<i class="ti ti-chart-bar ti-inline"></i>',clr:'var(--accent)'},
      {label:'Variance',val:rp(variance),icon:variance>=0?'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>':'<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>',clr:variance>=0?'var(--accent)':'var(--red)'},
      {label:'Akun Dianggarkan',val:angBulanIni.length,icon:'<i class="ti ti-clipboard-list ti-inline"></i>',clr:'var(--muted)'},
    ].map(k=>`<div class="stat-card" style="padding:14px 16px;"><div style="font-size:22px;margin-bottom:4px;">${k.icon}</div><div class="stat-label">${escapeHtml(k.label)}</div><div style="font-size:16px;font-weight:700;color:${k.clr};font-family:var(--mono);margin-top:4px;">${k.val}</div></div>`).join('');
  }

  // Progress bars
  const progEl=document.getElementById('ang-progress-list');
  if(progEl) {
    if(!angBulanIni.length) { progEl.innerHTML=`<div style="color:var(--muted);text-align:center;padding:32px;font-size:13px;">Belum ada anggaran bulan ini. Klik <b>+ Set Anggaran</b>.</div>`; }
    else progEl.innerHTML=angBulanIni.map(a=>{
      const aktual=getAktual(a.akunKode);
      const pct=Math.min(aktual/a.nominal*100,100);
      const over=aktual>a.nominal;
      const nama=akuns.find(x=>x.kode===a.akunKode)?.nama||a.akunKode;
      return `<div style="margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:13px;font-weight:600;">${escapeHtml(nama)}</span>
          <span style="font-size:12px;color:${over?'var(--red)':'var(--muted)'};font-family:var(--mono);">${rp(aktual)} / ${rp(a.nominal)}</span>
        </div>
        <div style="background:var(--surface2);border-radius:999px;height:8px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${over?'var(--red)':pct>80?'var(--accent3)':'var(--accent)'};border-radius:999px;transition:width 0.6s cubic-bezier(0.34,1.56,0.64,1);"></div>
        </div>
        <div style="font-size:10px;color:${over?'var(--red)':'var(--muted)'};margin-top:2px;">${pct.toFixed(1)}% terpakai${over?' — MELEBIHI ANGGARAN':''}</div>
      </div>`;
    }).join('');
  }

  // Tabel detail
  const tbody=document.getElementById('ang-tbody');
  if(tbody) {
    const all=anggaranList.map(a=>{
      const aktual=getAktual(a.akunKode);
      const variance=a.nominal-aktual;
      const pct=a.nominal?aktual/a.nominal*100:0;
      const over=aktual>a.nominal;
      const nama=akuns.find(x=>x.kode===a.akunKode)?.nama||a.akunKode;
      const tipe=akuns.find(x=>x.kode===a.akunKode)?.tipe||'—';
      return `<tr>
        <td style="font-weight:600">${nama}</td>
        <td style="font-size:12px">${tipe}</td>
        <td style="font-family:var(--mono)">${rp(a.nominal)}</td>
        <td style="font-family:var(--mono)">${rp(aktual)}</td>
        <td style="font-family:var(--mono);color:${variance>=0?'var(--accent)':'var(--red)'};">${rp(Math.abs(variance))} ${variance>=0?'↑ Sisa':'↓ Lebih'}</td>
        <td style="font-family:var(--mono);color:${over?'var(--red)':pct>80?'var(--accent3)':'var(--accent)'};">${pct.toFixed(1)}%</td>
        <td><span style="background:${over?'rgba(248,113,113,0.12)':'rgba(74,222,128,0.1)'};color:${over?'var(--red)':'var(--accent)'};padding:2px 8px;border-radius:6px;font-size:11px;">${over?'<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Melebihi':'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> On Track'}</span></td>
        <td><button class="btn btn-danger btn-sm" onclick="hapusAnggaran('${a.id}')"><i class="ti ti-trash" style="font-size:14px;"></i></button></td>
      </tr>`;
    }).join('');
    tbody.innerHTML=all||`<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px;">Belum ada data anggaran</td></tr>`;
  }

  // Chart
  if(angBulanIni.length) {
    const labels=angBulanIni.map(a=>akuns.find(x=>x.kode===a.akunKode)?.nama?.slice(0,10)||a.akunKode);
    const angData=angBulanIni.map(a=>a.nominal);
    const aktData=angBulanIni.map(a=>getAktual(a.akunKode));
    const isDark=!document.body.classList.contains('light-mode');
    const textClr=isDark?'rgba(226,232,240,0.7)':'rgba(15,23,42,0.6)';
    const gridClr=isDark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.06)';
    anDrawGroupedBar('ang-chart',labels,
      [{label:'Anggaran',data:angData,color:'rgba(34,211,238,'},{label:'Aktual',data:aktData,color:'rgba(74,222,128,'}],
      textClr,gridClr);
  }
}

function hapusAnggaran(id) {
  anggaranList=anggaranList.filter(a=>a.id!==id);saveFiturBaru();renderAnggaranPage();showAlert('✓ Anggaran dihapus');
}

// ══════════════════════════════════════════════════════════════
// PAJAK OTOMATIS
// ══════════════════════════════════════════════════════════════
function renderPajakOtomatis() {
  showOpSpinner('Menghitung Pajak...', 'Menganalisis transaksi kena pajak');
  setTimeout(()=>{
    // Hanya hitung dari jurnal jenis 'PPN' yang dibuat otomatis saat transaksi
    const ppnJurnals = jurnalEntries.filter(j => j.jenis === 'PPN');
    let ppnKeluaran = 0, totalDppKeluaran = 0;
    let ppnMasukan  = 0, totalDppMasukan  = 0;
    const ppnRows = [], ppnMasukanRows = [];
    ppnJurnals.forEach(j => {
      // PPN Keluaran: kredit ke akun 2301 (Utang PPN Keluaran)
      const krdKeluaran = j.lines.find(l => l.kredit > 0 && (l.akun === '2301' || (l.akun?.startsWith('23') && !l.ket?.toLowerCase().includes('masukan'))));
      // PPN Masukan: debit ke akun 1502 (PPN Masukan / Pajak Dibayar Dimuka)
      const dbtMasukan  = j.lines.find(l => l.debit  > 0 && (l.akun === '1502' || l.ket?.toLowerCase().includes('masukan')));
      if (krdKeluaran && krdKeluaran.kredit > 0) {
        const ppnVal = krdKeluaran.kredit;
        const tarifPct = j._ppnTarif || 0;
        const dpp = tarifPct > 0 ? Math.round(ppnVal / (tarifPct/100)) : 0;
        ppnKeluaran += ppnVal; totalDppKeluaran += dpp;
        ppnRows.push({ j, ppnVal, dpp, tarifPct });
      } else if (dbtMasukan && dbtMasukan.debit > 0) {
        const ppnVal = dbtMasukan.debit;
        const tarifPct = j._ppnTarif || 0;
        const dpp = tarifPct > 0 ? Math.round(ppnVal / (tarifPct/100)) : 0;
        ppnMasukan += ppnVal; totalDppMasukan += dpp;
        ppnMasukanRows.push({ j, ppnVal, dpp, tarifPct });
      }
    });
    const ppnKurang = ppnKeluaran - ppnMasukan;

    // Fallback: kalau belum ada jurnal PPN sama sekali, tetap tampil info
    const totalPenjualan=jurnalEntries.filter(j=>j.jenis==='Penjualan').reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const a=akuns.find(x=>x.kode===l.akun);return ss+(a&&a.tipe==='Pendapatan'?l.kredit:0)},0),0);
    const totalPembelian=jurnalEntries.filter(j=>j.jenis==='Pembelian').reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const a=akuns.find(x=>x.kode===l.akun);return ss+(a&&(a.tipe==='HPP'||a.tipe==='Beban')?l.debit:0)},0),0);

    // KPI
    const kpiEl=document.getElementById('pajak-kpi');
    if(kpiEl) kpiEl.innerHTML=[
      {label:'PPN Keluaran',val:rp(ppnKeluaran),icon:'<i class="ti ti-arrow-up-circle" style="font-size:14px;"></i>',clr:'var(--red)'},
      {label:'PPN Masukan',val:rp(ppnMasukan),icon:'<i class="ti ti-arrow-down-circle" style="font-size:14px;"></i>',clr:'var(--accent)'},
      {label:'PPN Kurang/Lebih Bayar',val:rp(Math.abs(ppnKurang)),icon:ppnKurang>0?'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--red);vertical-align:-2px"><path d="M12 19V5M5 12l7-7 7 7"/></svg>':'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="color:var(--accent);vertical-align:-2px"><path d="M12 5v14M5 12l7 7 7-7"/></svg>',clr:ppnKurang>0?'var(--red)':'var(--accent)'},
      {label:'Transaksi Terdeteksi PPN',val:(ppnRows.length+ppnMasukanRows.length)+' jurnal',icon:'<i class="ti ti-clipboard-list ti-inline"></i>',clr:'var(--muted)'},
    ].map(k=>`<div class="stat-card" style="padding:14px 16px;"><div style="font-size:22px;margin-bottom:4px;">${k.icon}</div><div class="stat-label">${k.label}</div><div style="font-size:15px;font-weight:700;color:${k.clr};font-family:var(--mono);margin-top:4px;">${k.val}</div></div>`).join('');

    // PPN Detail
    const ppnEl=document.getElementById('pajak-ppn-detail');
    if(ppnEl) ppnEl.innerHTML=`
      <div style="display:flex;flex-direction:column;gap:12px;">
        <div style="background:var(--surface2);border-radius:10px;padding:14px;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">PPN KELUARAN (dari penjualan berPPN)</div>
          <div style="font-size:22px;font-weight:700;color:var(--red);font-family:var(--mono);">${rp(ppnKeluaran)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">DPP: ${rp(totalDppKeluaran)} · ${ppnRows.length} transaksi · Tarif per produk</div>
        </div>
        <div style="background:var(--surface2);border-radius:10px;padding:14px;border:1px solid var(--border);">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">PPN MASUKAN (dari pembelian berPPN)</div>
          <div style="font-size:22px;font-weight:700;color:var(--accent);font-family:var(--mono);">${rp(ppnMasukan)}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:4px;">DPP: ${rp(totalDppMasukan)} · ${ppnMasukanRows.length} transaksi · Tarif per produk</div>
          ${ppnMasukanRows.length===0?'<div style="font-size:11px;color:var(--muted);margin-top:6px;"><i class="ti ti-info-circle" style="color:var(--accent2);"></i> Belum ada pembelian produk ber-PPN.</div>':''}
        </div>
        <div style="background:${ppnKurang>0?'rgba(248,113,113,0.1)':'rgba(74,222,128,0.1)'};border-radius:10px;padding:14px;border:1px solid ${ppnKurang>0?'rgba(248,113,113,0.3)':'rgba(74,222,128,0.3)'};">
          <div style="font-size:11px;color:var(--muted);margin-bottom:6px;">${ppnKurang>0?'PPN KURANG BAYAR':'PPN LEBIH BAYAR'}</div>
          <div style="font-size:22px;font-weight:700;color:${ppnKurang>0?'var(--red)':'var(--accent)'};font-family:var(--mono);">${rp(Math.abs(ppnKurang))}</div>
        </div>
        ${(ppnRows.length+ppnMasukanRows.length)===0?'<div style="background:rgba(34,211,238,0.06);border:1px solid rgba(34,211,238,0.2);border-radius:10px;padding:12px 14px;font-size:12px;color:var(--muted);"><i class="ti ti-info-circle" style="color:var(--accent2);font-size:13px;vertical-align:-2px;margin-right:4px;"></i>Belum ada transaksi kena PPN. Set tarif PPN di <b>Master Produk</b> lalu lakukan penjualan.</div>':''}
      </div>`;

    // SPT Summary
    const sptEl=document.getElementById('pajak-spt-summary');
    if(sptEl) {
      const yr=new Date().getFullYear();
      sptEl.innerHTML=`
        <div style="font-size:13px;font-weight:700;margin-bottom:12px;"><i class="ti ti-file-text" style="font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Ringkasan SPT ${yr}</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${[
            ['Penghasilan Bruto', rp(totalPenjualan), 'var(--accent)'],
            ['HPP & Biaya', rp(totalPembelian), 'var(--red)'],
            ['Penghasilan Neto', rp(totalPenjualan-totalPembelian), totalPenjualan-totalPembelian>=0?'var(--accent)':'var(--red)'],
            ['PPN Wajib Bayar', rp(Math.max(0,ppnKurang)), 'var(--accent3)'],
          ].map(([l,v,c])=>`<div style="display:flex;justify-content:space-between;padding:8px 10px;background:var(--surface2);border-radius:8px;">
            <span style="font-size:13px;color:var(--muted);">${l}</span>
            <span style="font-family:var(--mono);font-size:13px;color:${c};font-weight:600;">${v}</span>
          </div>`).join('')}
        </div>`;
    }

    // Tabel transaksi — jurnal PPN otomatis (keluaran + masukan)
    const tbody=document.getElementById('pajak-tbody');
    if(tbody) {
      const allPpnRows = [
        ...ppnRows.map(r=>({...r,tipe:'Keluaran',tipeBg:'rgba(248,113,113,0.1)',tipeClr:'var(--red)'})),
        ...ppnMasukanRows.map(r=>({...r,tipe:'Masukan',tipeBg:'rgba(74,222,128,0.1)',tipeClr:'var(--accent)'})),
      ].sort((a,b)=>(a.j.tanggal||'').localeCompare(b.j.tanggal||''));
      tbody.innerHTML=allPpnRows.slice(0,50).map(({j,ppnVal,dpp,tarifPct,tipe,tipeBg,tipeClr})=>`<tr>
          <td style="font-size:12px;font-family:var(--mono)">${j.tanggal}</td>
          <td style="font-size:12px">${escapeHtml(j.keterangan||'—')}</td>
          <td style="font-family:var(--mono)">${rp(dpp)}</td>
          <td><span style="background:${tipeBg};color:${tipeClr};padding:2px 8px;border-radius:6px;font-size:11px;">PPN ${tipe}</span></td>
          <td style="font-family:var(--mono)">${tarifPct}%</td>
          <td style="font-family:var(--mono);color:var(--accent3)">${rp(ppnVal)}</td>
          <td><span style="background:rgba(74,222,128,0.1);color:var(--accent);padding:2px 8px;border-radius:6px;font-size:11px;"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Otomatis</span></td>
        </tr>`).join('')||`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px;">Belum ada transaksi kena PPN. Set tarif PPN di Master Produk terlebih dahulu.</td></tr>`;
    }

    hideOpSpinner();
  }, 1000);
}

function parseBankStatement(input) {
  const file = input.files[0];
  if(!file) return;
  const ext = file.name.split('.').pop().toLowerCase();
  
  if(ext === 'csv') {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const rows = parseBankCSV(text);
      processBankRows(rows, file.name);
    };
    reader.readAsText(file, 'UTF-8');
  } else if(['xlsx','xls'].includes(ext)) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(new Uint8Array(e.target.result), {type:'array'});
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws, {header:1, defval:''});
        const rows = parseBankExcel(data);
        processBankRows(rows, file.name);
      } catch(err) {
        showAlert('❌ Gagal baca Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  }
  input.value = '';
}

function parseBankStatementFromDrop(e) {
  const file = e.dataTransfer.files[0];
  if(!file) return;
  document.getElementById('bank-file-input').files = e.dataTransfer.files;
  parseBankStatement(document.getElementById('bank-file-input'));
}

function parseBankCSV(text) {
  const lines = text.trim().split('\n').map(l => l.split(/[;,]/).map(c => c.trim().replace(/^"|"$/g,'')));
  // Find header row
  let headerIdx = 0;
  for(let i=0; i<Math.min(5, lines.length); i++) {
    const h = lines[i].map(x => x.toLowerCase());
    if(h.some(x => x.includes('tanggal') || x.includes('date') || x.includes('tgl'))) {
      headerIdx = i; break;
    }
  }
  const headers = lines[headerIdx].map(h => h.toLowerCase());
  const getCol = (names) => { for(const n of names) { const i = headers.findIndex(h=>h.includes(n)); if(i>=0) return i; } return -1; };
  const tglCol = getCol(['tanggal','date','tgl']);
  const ketCol = getCol(['keterangan','description','ket','uraian','berita']);
  const debCol = getCol(['debet','debit','db','masuk','penarikan']);
  const kreCol = getCol(['kredit','credit','cr','keluar','setoran','penyetoran']);
  
  return lines.slice(headerIdx+1).filter(r => r.length >= 2 && r[tglCol]).map(r => ({
    tanggal: parseFlexDate(r[tglCol] || ''),
    keterangan: r[ketCol] || '',
    debit: parseRp(r[debCol] || '0'),
    kredit: parseRp(r[kreCol] || '0'),
  })).filter(r => r.tanggal && (r.debit || r.kredit));
}

function parseBankExcel(data) {
  if(!data.length) return [];
  let headerIdx = 0;
  for(let i=0; i<Math.min(8, data.length); i++) {
    const row = data[i].map(x => String(x).toLowerCase());
    if(row.some(x => x.includes('tanggal') || x.includes('date') || x.includes('tgl'))) {
      headerIdx = i; break;
    }
  }
  const headers = data[headerIdx].map(h => String(h).toLowerCase());
  const getCol = (names) => { for(const n of names) { const i = headers.findIndex(h=>h.includes(n)); if(i>=0) return i; } return -1; };
  const tglCol = getCol(['tanggal','date','tgl']);
  const ketCol = getCol(['keterangan','description','ket','uraian','berita']);
  const debCol = getCol(['debet','debit','db','masuk','penarikan']);
  const kreCol = getCol(['kredit','credit','cr','keluar','setoran']);

  return data.slice(headerIdx+1).filter(r => r[tglCol]).map(r => ({
    tanggal: parseFlexDate(String(r[tglCol] || '')),
    keterangan: String(r[ketCol] || ''),
    debit: parseRp(String(r[debCol] || '0')),
    kredit: parseRp(String(r[kreCol] || '0')),
  })).filter(r => r.tanggal && (r.debit || r.kredit));
}

function parseFlexDate(str) {
  if(!str) return null;
  // Try DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const clean = str.trim();
  const m1 = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if(m1) {
    const y = m1[3].length === 2 ? '20'+m1[3] : m1[3];
    return `${y}-${m1[2].padStart(2,'0')}-${m1[1].padStart(2,'0')}`;
  }
  const m2 = clean.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if(m2) return `${m2[1]}-${m2[2].padStart(2,'0')}-${m2[3].padStart(2,'0')}`;
  // Excel serial date
  if(/^\d+$/.test(clean)) {
    const d = new Date((parseInt(clean)-25569)*86400000);
    return d.toISOString().split('T')[0];
  }
  return null;
}

function parseRp(str) {
  if(!str || str==='-') return 0;
  return parseFloat(String(str).replace(/[^\d,\.]/g,'').replace(',','.')) || 0;
}

function processBankRows(rows, filename) {
  if(!rows.length) { showAlert('❌ Tidak ada baris data ditemukan. Cek format file.'); return; }
  
  bankRows = rows.map(r => {
    // Try to find matching journal entry (same date, similar amount)
    const amount = r.debit || r.kredit;
    const match = jurnalEntries.find(j => {
      const jDate = j.tanggal;
      const jAmt = j.lines.reduce((s,l)=>s+Math.max(l.debit||0,l.kredit||0),0);
      const sameDate = jDate === r.tanggal;
      const sameAmt = Math.abs(jAmt - amount) < 1;
      const nearDate = !sameDate && jDate && Math.abs(new Date(jDate)-new Date(r.tanggal)) < 3*86400000 && sameAmt;
      return (sameDate && sameAmt) || nearDate;
    });
    return { ...r, status: match ? 'verified' : 'missing', matchedJurnal: match };
  });

  showBankResults(filename);
}

function showBankResults(filename) {
  const verified = bankRows.filter(r=>r.status==='verified').length;
  const missing = bankRows.filter(r=>r.status==='missing').length;
  
  document.getElementById('bank-upload-area').style.display = 'none';
  document.getElementById('bank-format-guide').style.display = 'none';
  const results = document.getElementById('bank-rekon-results');
  results.style.display = 'block';
  
  document.getElementById('bank-stat-match').textContent = verified;
  document.getElementById('bank-stat-miss').textContent = missing;
  document.getElementById('bank-stat-total').textContent = bankRows.length;
  
  renderBankTable('all');
  
  if(missing > 0) {
    showAlert(`<i class="ti ti-chart-bar ti-inline"></i> Analisis selesai: ${verified} cocok <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>, ${missing} belum tercatat <i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>\n\nKlik tombol "Buat Jurnal" pada baris yang belum tercatat.`);
  } else {
    showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Semua ${verified} transaksi sudah tercatat di jurnal!`);
  }
}

function renderBankTable(filter='all') {
  const tbody = document.getElementById('bank-rekon-body');
  const rows = filter === 'miss' ? bankRows.filter(r=>r.status==='missing') : bankRows;
  
  ['bank-filter-all','bank-filter-miss'].forEach(id => {
    const btn = document.getElementById(id);
    if(btn) btn.style.borderColor = id.includes(filter) ? 'var(--accent)' : 'var(--border)';
  });
  
  tbody.innerHTML = rows.map((r, i) => {
    const isVerified = r.status === 'verified';
    const amt = r.debit || r.kredit;
    const isIn = r.debit > 0;
    return `<tr style="${isVerified?'opacity:0.65':''}">
      <td style="font-size:12px;white-space:nowrap;">${r.tanggal||'-'}</td>
      <td style="font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(r.keterangan)}">${escapeHtml(r.keterangan)}</td>
      <td class="debit">${r.debit?fmtRp(r.debit):''}</td>
      <td class="kredit">${r.kredit?fmtRp(r.kredit):''}</td>
      <td><span class="badge ${isVerified?'badge-green':'badge-yellow'}">${isVerified?'<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tercatat':'<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Belum'}</span></td>
      <td>${!isVerified?`<button onclick="buatJurnalDariBankRow(${i})" class="btn btn-primary btn-sm" style="font-size:11px;padding:4px 8px;"><i class="ti ti-robot" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Buat Jurnal</button>`:'<span style="color:var(--muted);font-size:11px;">${r.matchedJurnal?.no||""}</span>'}</td>
    </tr>`;
  }).join('') || `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--muted);">Tidak ada data</td></tr>`;
}

function filterBankRows(filter) { renderBankTable(filter); }

async function buatJurnalDariBankRow(idx) {
  const row = bankRows[idx];
  if(!row) return;
  
  // Use Groq AI to suggest journal entry
  const isIn = row.debit > 0;
  const amt = row.debit || row.kredit;
  const prompt = `Dari mutasi bank: "${row.keterangan}" tanggal ${row.tanggal}, ${isIn?'DEBIT (uang masuk)':'KREDIT (uang keluar)'} Rp ${fmtRp(amt)}. Buatkan jurnal akuntansi yang tepat.`;
  
  showAlert(`<i class="ti ti-robot" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Orias sedang menganalisis transaksi...\n"${row.keterangan}"\n\nBuka Orias Assisten untuk melihat hasilnya.`);
  showPage('ai-assistant');
  setTimeout(() => {
    const inp = document.getElementById('ai-input');
    if(inp) { inp.value = prompt; sendAI(); }
  }, 300);
}

// FEATURE 2: ATTACH BUKTI TRANSAKSI
const ATTACHMENTS_KEY = 'oas_attachments';

function getAttachments() {
  try { return JSON.parse(localStorage.getItem(ATTACHMENTS_KEY) || '{}'); } catch { return {}; }
}

function openAttachModal(jurnalIdx) {
  const j = jurnalEntries[jurnalIdx];
  if(!j) return;
  
  // Build modal content dynamically
  const allAttach = getAttachments();
  const jAttach = allAttach[j.no] || [];
  
  document.getElementById('attach-modal-title').textContent = ` Lampiran — ${j.no}`;
  document.getElementById('attach-jurnal-ket').textContent = j.ket;
  document.getElementById('attach-jurnal-idx').value = jurnalIdx;
  renderAttachList(j.no);
  document.getElementById('modal-attach').classList.add('open');
}

function renderAttachList(jurnalNo) {
  const allAttach = getAttachments();
  const attachments = allAttach[jurnalNo] || [];
  const container = document.getElementById('attach-list');
  
  if(!attachments.length) {
    container.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px;"><i class="ti ti-folder-open" style="font-size:14px;width:14px;height:14px;vertical-align:-2px;"></i> Belum ada lampiran</div>';
    // Hide download-all button
    const dlAllBtn = document.getElementById('attach-dl-all-btn');
    if(dlAllBtn) dlAllBtn.style.display = 'none';
    return;
  }

  // Show download-all button
  const dlAllBtn = document.getElementById('attach-dl-all-btn');
  if(dlAllBtn) dlAllBtn.style.display = '';
  
  container.innerHTML = attachments.map((a, i) => `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:8px;">
      <span style="font-size:24px;">${a.type.startsWith('image')?'<i class="ti ti-photo" style="font-size:22px;"></i>':'<i class="ti ti-file" style="font-size:22px;"></i>'}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(a.name)}</div>
        <div style="font-size:11px;color:var(--muted);">${a.size} · ${a.date}</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="viewAttachment('${jurnalNo}',${i})" class="slot-btn primary" title="Lihat"><i class="ti ti-eye" style="font-size:15px;"></i></button>
        <button onclick="downloadAttachment('${jurnalNo}',${i})" class="slot-btn primary" title="Unduh" style="color:var(--accent2);border-color:rgba(34,211,238,0.3);"><i class="ti ti-download" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i></button>
        <button onclick="deleteAttachment('${jurnalNo}',${i})" class="slot-btn danger" title="Hapus"><i class="ti ti-trash" style="font-size:14px;"></i></button>
      </div>
    </div>`).join('');
}

function addAttachment() {
  document.getElementById('attach-file-input').click();
}

// handleAttachFile() versi lengkap ada di bawah (~baris 19607) — sudah termasuk
// sync ke Supabase. Duplikat lama di sini dihapus.

function viewAttachment(jurnalNo, idx) {
  const allAttach = getAttachments();
  const a = (allAttach[jurnalNo]||[])[idx];
  if(!a) return;

  // In-page lightbox — tidak perlu popup (popup sering diblokir di mobile)
  const existing = document.getElementById('attach-lightbox');
  if (existing) existing.remove();

  const lb = document.createElement('div');
  lb.id = 'attach-lightbox';
  lb.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.96);display:flex;flex-direction:column;align-items:center;justify-content:center;';

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
  closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);border:1px solid rgba(255,255,255,0.2);color:#fff;cursor:pointer;z-index:1;display:flex;align-items:center;justify-content:center;';
  closeBtn.onclick = () => lb.remove();
  lb.appendChild(closeBtn);

  const fnLabel = document.createElement('div');
  fnLabel.textContent = a.name;
  fnLabel.style.cssText = 'position:absolute;top:16px;left:14px;right:60px;color:rgba(255,255,255,0.6);font-size:11px;font-family:monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
  lb.appendChild(fnLabel);

  if (a.type && a.type.startsWith('image')) {
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;padding:52px 0 12px;box-sizing:border-box;';
    const img = document.createElement('img');
    img.src = a.data;
    img.alt = a.name;
    img.style.cssText = 'max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;display:block;border-radius:4px;';
    wrapper.appendChild(img);
    lb.appendChild(wrapper);
  } else {
    const iframe = document.createElement('iframe');
    iframe.src = a.data;
    iframe.style.cssText = 'width:100vw;height:100vh;border:none;display:block;margin-top:44px;';
    lb.appendChild(iframe);
  }

  lb.addEventListener('click', (e) => { if (e.target === lb) lb.remove(); });
  document.body.appendChild(lb);
}

function deleteAttachment(jurnalNo, idx) {
  showCustomConfirmGeneral({
    icon: '<i class="ti ti-trash ti-btn"></i>', iconColor: 'rgba(248,113,113,0.15)', iconBorder: 'rgba(248,113,113,0.3)',
    title: 'Hapus Lampiran?',
    subtitle: 'Lampiran ini akan dihapus permanen.',
    rows: [{ label: 'Perhatian', value: 'Tidak bisa dikembalikan setelah dihapus.' }],
    warning: null,
    btnLabel: '<i class="ti ti-trash ti-btn"></i> Hapus Lampiran',
    btnGradient: 'linear-gradient(135deg,#f87171,#ef4444)'
  }).then(confirmed => {
    if (!confirmed) return;
    const allAttach = getAttachments();
    allAttach[jurnalNo].splice(idx, 1);
    if(!allAttach[jurnalNo].length) delete allAttach[jurnalNo];
    localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify(allAttach));
    const j = jurnalEntries.find(x=>x.no===jurnalNo);
    if(j) j.attachments = allAttach[jurnalNo] || [];
    renderAttachList(jurnalNo);
    renderJurnalUmum();
    showAlert('<i class="ti ti-trash ti-btn"></i> Lampiran dihapus');
  });
}

// Download single attachment
function downloadAttachment(jurnalNo, idx) {
  const allAttach = getAttachments();
  const a = (allAttach[jurnalNo]||[])[idx];
  if(!a) return;
  const link = document.createElement('a');
  link.href = a.data;
  link.download = a.name;
  link.click();
  showAlert('<i class="ti ti-download" style="color:var(--accent2);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Mengunduh: ' + a.name);
}

// Download all attachments for a jurnal as a simple zip (using JSZip if available, else one by one)
async function downloadAllAttachments(jurnalNo) {
  const allAttach = getAttachments();
  const attachments = allAttach[jurnalNo] || [];
  if(!attachments.length) { showAlert('❌ Tidak ada lampiran'); return; }
  
  // Try to use JSZip (loaded dynamically)
  if(typeof JSZip === 'undefined') {
    // Load JSZip dynamically
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  
  showAlert('<i class="ti ti-package" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Menyiapkan ZIP...');
  const zip = new JSZip();
  attachments.forEach(a => {
    // Extract base64 data
    const base64 = a.data.split(',')[1];
    zip.file(a.name, base64, {base64: true});
  });
  
  const blob = await zip.generateAsync({type: 'blob'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Lampiran_${jurnalNo}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${attachments.length} lampiran diunduh sebagai ZIP`);
}

// FEATURE 3: NOTIFIKASI PAJAK
const PAJAK_NOTIF_KEY = 'oas_pajak_notif_dismissed';

function getPajakNotifications() {
  const dismissed = JSON.parse(localStorage.getItem(PAJAK_NOTIF_KEY) || '[]');
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const notifications = [];

  // Check akun utang pajak for balance
  const utangPPN = Math.abs(computeSaldoBersih('2301'));
  const utangPPh21 = Math.abs(computeSaldoBersih('2302'));
  const utangPPh23 = Math.abs(computeSaldoBersih('2303'));
  const utangPPhBadan = Math.abs(computeSaldoBersih('2304'));

  const key = (id) => `${id}-${month}-${year}`;
  
  // PPh 21: setor paling lambat tanggal 10 bulan berikutnya
  if(utangPPh21 > 0 && day >= 1 && day <= 10 && !dismissed.includes(key('pph21'))) {
    notifications.push({
      id: key('pph21'), icon: 'ti-calculator', type: 'warn',
      judul: `PPh 21 — Jatuh Tempo ${day <= 10 ? 'Tanggal 10' : 'Segera'}`,
      isi: `Utang PPh 21 sebesar ${fmtRp(utangPPh21)} perlu disetor ke kas negara paling lambat tanggal 10 bulan ini.`,
      aksi: "showPage('kalk-ppn')"
    });
  }
  // PPN: lapor & setor paling lambat akhir bulan berikutnya
  if(utangPPN > 0 && day >= 20 && !dismissed.includes(key('ppn'))) {
    notifications.push({
      id: key('ppn'), icon: 'ti-receipt', type: 'warn',
      judul: `PPN — Lapor Bulan Ini`,
      isi: `PPN terutang ${fmtRp(utangPPN)} perlu dilaporkan di SPT Masa PPN.`,
      aksi: "showPage('kalk-ppn')"
    });
  }
  // PPh 23: setor tanggal 10 bulan berikutnya
  if(utangPPh23 > 0 && day >= 1 && day <= 10 && !dismissed.includes(key('pph23'))) {
    notifications.push({
      id: key('pph23'), icon: '<i class="ti ti-clipboard-list ti-inline"></i>', type: 'info',
      judul: `PPh 23 — Setor Paling Lambat Tanggal 10`,
      isi: `Utang PPh 23 sebesar ${fmtRp(utangPPh23)} perlu disetor bulan ini.`,
      aksi: "showPage('kalk-ppn')"
    });
  }
  // PPh Badan: April
  if(utangPPhBadan > 0 && month === 4 && !dismissed.includes(key('pphbadan'))) {
    notifications.push({
      id: key('pphbadan'), icon: 'ti-building', type: 'warn',
      judul: `PPh Badan — Jatuh Tempo April`,
      isi: `PPh Badan ${fmtRp(utangPPhBadan)} — pastikan SPT Tahunan sudah dilaporkan sebelum 30 April.`,
      aksi: "showPage('kalk-ppn')"
    });
  }
  return notifications;
}

function dismissPajakNotif(id) {
  const dismissed = JSON.parse(localStorage.getItem(PAJAK_NOTIF_KEY) || '[]');
  if(!dismissed.includes(id)) dismissed.push(id);
  localStorage.setItem(PAJAK_NOTIF_KEY, JSON.stringify(dismissed));
  renderDashboard();
}

// Pajak notifications are merged in renderDashboard directly

// Show pajak panel on dashboard
function renderPajakPanel() {
  const notifs = getPajakNotifications();
  const container = document.getElementById('dash-pajak-panel');
  if(!container) return;
  if(!notifs.length) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  container.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;"><i class="ti ti-scale ti-inline"></i> Pengingat Pajak</div>
    ${notifs.map(n => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:8px;margin-bottom:8px;">
        <span style="font-size:20px;flex-shrink:0;">${n.icon}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px;">${n.judul}</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.6;">${n.isi}</div>
        </div>
        <button onclick="dismissPajakNotif('${n.id}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;flex-shrink:0;padding:2px 4px;" title="Tutup">✕</button>
      </div>`).join('')}`;
}

// HAPUS & RESET
function konfirmasiHapusJurnal(idx) {
  const j = jurnalEntries[idx];
  if(!j) return;
  const totalDebit = j.lines.reduce((s,l)=>s+(l.debit||0),0);
  document.getElementById('hapus-jurnal-info').innerHTML =
    `<b>No:</b> ${j.no}<br>
     <b>Tanggal:</b> ${fmtDate(j.tanggal)}<br>
     <b>Keterangan:</b> ${escapeHtml(j.ket)}<br>
     <b>Jenis:</b> ${j.jenis}<br>
     <b>Jumlah Baris:</b> ${j.lines.length} baris<br>
     <b>Total:</b> ${fmtRp(totalDebit)}`;
  document.getElementById('hapus-jurnal-confirm-btn').onclick = async () => {
    const entry = jurnalEntries[idx];
    jurnalEntries.splice(idx, 1);
    closeModal('modal-hapus-jurnal');
    renderJurnalUmum();
    renderDashboard();
    // Hapus dari Supabase/cloud jika sudah tersimpan
    if (entry && entry._id && typeof deleteJurnalFromSupabase === 'function') {
      try {
        await deleteJurnalFromSupabase(entry);
        showAlert('[Hapus] Jurnal berhasil dihapus & tersinkron ke cloud');
      } catch(e) {
        showAlert('[Hapus] Jurnal dihapus (lokal), tapi gagal sinkron cloud — coba simpan ulang');
      }
    } else {
      showAlert('[Hapus] Jurnal berhasil dihapus');
    }
  };
  document.getElementById('modal-hapus-jurnal').classList.add('open');
}

function confirmResetAll() {
  document.getElementById('reset-confirm-input').value = '';
  document.getElementById('modal-reset-all').classList.add('open');
  setTimeout(() => document.getElementById('reset-confirm-input').focus(), 200);
}

// doResetAll moved to storage system above

// SALDO AWAL
function openModalSaldoAwal() {
  const tgl = new Date().toISOString().split('T')[0];
  const saldoTglInput = document.getElementById('saldo-awal-tgl');
  if (saldoTglInput && saldoTglInput._oasSetDate) saldoTglInput._oasSetDate(tgl);
  else if (saldoTglInput) saldoTglInput.value = tgl;

  // Populate rows: show Aset, Liabilitas, Ekuitas accounts
  const tbody = document.getElementById('saldo-awal-rows');
  const relevant = akuns.filter(a => ['Aset','Liabilitas','Ekuitas'].includes(a.tipe) && a.normal !== 'K' || a.tipe === 'Liabilitas' || a.tipe === 'Ekuitas');
  tbody.innerHTML = akuns.filter(a => a.kode !== '1502').map(a => `
    <tr>
      <td>
        <div style="font-size:12px;font-weight:600;">${escapeHtml(a.nama)}</div>
        <div style="font-size:10px;color:var(--muted);font-family:var(--mono);">${escapeHtml(a.kode)}</div>
      </td>
      <td><span class="badge ${tipeBadge(a.tipe)}">${a.tipe}</span></td>
      <td style="text-align:right;">
        <input type="number" data-kode="${escapeHtml(a.kode)}" data-tipe="${a.tipe}" data-normal="${a.normal}"
          placeholder="0" min="0"
          style="background:var(--surface2);border:1px solid var(--border);border-radius:5px;padding:5px 8px;color:var(--text);font-size:12px;width:140px;text-align:right;font-family:var(--mono);"
          oninput="updateSaldoAwalBalance()">
      </td>
    </tr>`).join('');
  updateSaldoAwalBalance();
  document.getElementById('modal-saldo-awal').classList.add('open');
}

function updateSaldoAwalBalance() {
  let totalD = 0, totalK = 0;
  document.querySelectorAll('#saldo-awal-rows input').forEach(inp => {
    const val = parseFloat(inp.value)||0;
    if(!val) return;
    const normal = inp.dataset.normal;
    if(normal === 'D') totalD += val;
    else totalK += val;
  });
  const diff = totalD - totalK;
  const el = document.getElementById('saldo-awal-balance');
  el.innerHTML = `Debit: <span style="color:var(--accent)">${fmtRp(totalD)}</span> &nbsp;|&nbsp; Kredit: <span style="color:var(--red)">${fmtRp(totalK)}</span> &nbsp;|&nbsp; `
    + (Math.abs(diff) < 1
      ? `<span style="color:var(--accent)">✓ Balance</span>`
      : `<span style="color:var(--accent3)">Selisih: ${fmtRp(Math.abs(diff))} — perlu akun penyeimbang (misal Modal)</span>`);
}

function simpanSaldoAwal() {
  const tgl = document.getElementById('saldo-awal-tgl').value;
  const ket = document.getElementById('saldo-awal-ket').value || 'Saldo awal pembukaan';
  if(!tgl) { showAlert('Isi tanggal saldo awal dulu!'); return; }

  const lines = [];
  document.querySelectorAll('#saldo-awal-rows input').forEach(inp => {
    const val = parseFloat(inp.value)||0;
    if(!val) return;
    const kode = inp.dataset.kode;
    const normal = inp.dataset.normal;
    const akunNama = akuns.find(a=>a.kode===kode)?.nama || kode;
    lines.push({
      akun: kode,
      ket: akunNama,
      debit: normal === 'D' ? val : 0,
      kredit: normal === 'K' ? val : 0
    });
  });

  if(lines.length === 0) { showAlert('Isi minimal satu akun!'); return; }

  const td = lines.reduce((s,l)=>s+(l.debit||0),0);
  const tk = lines.reduce((s,l)=>s+(l.kredit||0),0);
  if(Math.abs(td-tk) > 1) {
    showAlert('❌ Jurnal tidak balance! Seimbangkan debit dan kredit.');
    return;
  }

  addJurnal({ tanggal: tgl, ket, jenis: 'Saldo Awal', lines });
  closeModal('modal-saldo-awal');
  renderDashboard();
  renderJurnalUmum();
  showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Saldo awal berhasil disimpan!');
}

// UTILS
function autoNo(prefix) {
  const n=jurnalEntries.filter(j=>j.ref?.startsWith(prefix)).length+1;
  return `${prefix}-${String(n).padStart(3,'0')}`;
}

function handlePwaInstall() {
  if (_pwaInstalled) {
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> OAS sudah terinstall di perangkat ini!');
    return;
  }
  if (_pwaPrompt) {
    _pwaPrompt.prompt();
    _pwaPrompt.userChoice.then(result => {
      if (result.outcome === 'accepted') {
        _pwaInstalled = true;
        _pwaPrompt = null;
        updatePwaBtn();
        showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> OAS berhasil diinstall!');
      }
    });
    return;
  }
  // Langsung tampilkan panduan — tidak perlu nunggu event apapun
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSamsung = /SamsungBrowser/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  let steps = [];
  if (isIOS) {
    steps = [
      { icon:'1️⃣', text:'Buka di <b>Safari</b> (bukan Chrome iOS)' },
      { icon:'2️⃣', text:'Ketuk ikon <b>Bagikan</b> (□↑) di bawah layar' },
      { icon:'3️⃣', text:'Scroll & pilih <b>"Tambahkan ke Layar Utama"</b>' },
      { icon:'4️⃣', text:'Ketuk <b>"Tambah"</b> — selesai!' },
    ];
  } else if (isSamsung) {
    steps = [
      { icon:'1️⃣', text:'Ketuk ikon <b>Menu</b> (<svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="0" y1="1" x2="18" y2="1"/><line x1="0" y1="7" x2="18" y2="7"/><line x1="0" y1="13" x2="18" y2="13"/></svg>) di bawah' },
      { icon:'2️⃣', text:'Pilih <b>"Tambahkan halaman ke"</b>' },
      { icon:'3️⃣', text:'Pilih <b>"Layar Utama"</b>' },
      { icon:'4️⃣', text:'Ketuk <b>"Tambah"</b> — selesai!' },
    ];
  } else if (isAndroid) {
    steps = [
      { icon:'1️⃣', text:'Ketuk ikon <b>⋮</b> (3 titik) kanan atas' },
      { icon:'2️⃣', text:'Pilih <b>"Tambahkan ke layar utama"</b><br><small style="color:var(--muted);">atau "Install App" / "Add to Home Screen"</small>' },
      { icon:'3️⃣', text:'Ketuk <b>"Tambah"</b> atau <b>"Install"</b>' },
      { icon:'4️⃣', text:'OAS muncul di home screen seperti aplikasi! <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>' },
    ];
  } else {
    steps = [
      { icon:'1️⃣', text:'Klik ikon <b>⊕</b> di address bar kanan' },
      { icon:'2️⃣', text:'Klik <b>"Install OAS..."</b>' },
      { icon:'3️⃣', text:'Klik <b>"Install"</b> pada dialog konfirmasi' },
    ];
  }

  document.getElementById('pwa-guide-modal')?.remove();
  const el = document.createElement('div');
  el.id = 'pwa-guide-modal';
  el.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.75);display:flex;align-items:flex-end;justify-content:center;';

  // Detect in-app browser (Instagram, Facebook, TikTok, Line, etc.)
  const ua = navigator.userAgent;
  const isInAppBrowser = /Instagram|FBAN|FBAV|FB_IAB|LineBrowser|Twitter|TikTok|Snapchat|Pinterest|LinkedIn|WhatsApp/.test(ua);

  if (isInAppBrowser) {
    el.innerHTML = `
    <div style="background:var(--surface);border-radius:24px 24px 0 0;padding:8px 20px 40px;width:100%;max-width:480px;border-top:1px solid var(--border);animation:slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1);">
      <div style="width:36px;height:4px;background:var(--border);border-radius:4px;margin:12px auto 20px;"></div>
      <div style="text-align:center;margin-bottom:20px;">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;"><i class="ti ti-alert-triangle" style="font-size:24px;width:24px;height:24px;color:var(--accent3);"></i></div>
        <div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:6px;">Buka di Browser Dulu</div>
        <div style="font-size:13px;color:var(--muted);line-height:1.6;">Fitur install app tidak tersedia di browser bawaan aplikasi ini.<br>Buka OAS di <b style="color:var(--text)">Chrome</b> atau <b style="color:var(--text)">browser lain</b> untuk bisa menginstall.</div>
      </div>
      <div style="background:var(--surface2);border-radius:12px;padding:14px 16px;margin-bottom:20px;border:1px solid var(--border);">
        <div style="font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Cara membuka di browser:</div>
        <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:8px;">
          <div style="width:22px;height:22px;border-radius:50%;background:rgba(34,211,238,0.15);border:1px solid rgba(34,211,238,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--accent2);flex-shrink:0;">1</div>
          <span style="font-size:13px;color:var(--text);line-height:1.5;">Ketuk ikon <b>⋮</b> atau <b>...</b> di pojok browser ini</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:10px;">
          <div style="width:22px;height:22px;border-radius:50%;background:rgba(34,211,238,0.15);border:1px solid rgba(34,211,238,0.3);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:var(--accent2);flex-shrink:0;">2</div>
          <span style="font-size:13px;color:var(--text);line-height:1.5;">Pilih <b>"Buka di Chrome"</b> atau <b>"Open in Browser"</b></span>
        </div>
      </div>
      <button onclick="document.getElementById('pwa-guide-modal').remove()" style="width:100%;background:var(--accent);color:#0d0f14;border:none;border-radius:14px;padding:16px;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--sans);">Mengerti</button>
    </div>`;
    el.onclick = e => { if(e.target===el) el.remove(); };
    document.body.appendChild(el);
    return;
  }

  el.innerHTML = `
    <div style="background:var(--surface);border-radius:24px 24px 0 0;padding:8px 20px 40px;width:100%;max-width:480px;border-top:1px solid var(--border);animation:slideUp 0.35s cubic-bezier(0.34,1.2,0.64,1);">
      <div style="width:36px;height:4px;background:var(--border);border-radius:4px;margin:12px auto 20px;"></div>
      <div style="text-align:center;margin-bottom:20px;">
        <div style="width:56px;height:56px;border-radius:50%;background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;"><i class="ti ti-device-mobile-down" style="font-size:26px;width:26px;height:26px;color:var(--accent);"></i></div>
        <div style="font-size:17px;font-weight:700;color:var(--text);margin-bottom:4px;">Install OAS ke Home Screen</div>
        <div style="font-size:13px;color:var(--muted);">Akses seperti aplikasi native, tanpa buka browser</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px;">
        ${steps.map((s,i)=>`
          <div style="display:flex;align-items:flex-start;gap:12px;background:var(--surface2);border-radius:12px;padding:12px 14px;border:1px solid var(--border);">
            <div style="width:26px;height:26px;border-radius:50%;background:rgba(34,211,238,0.15);border:1px solid rgba(34,211,238,0.3);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:var(--accent2);flex-shrink:0;">${i+1}</div>
            <span style="font-size:13px;color:var(--text);line-height:1.5;">${s.text}</span>
          </div>`).join('')}
      </div>
      <button onclick="document.getElementById('pwa-guide-modal').remove()" style="width:100%;background:var(--accent);color:#0d0f14;border:none;border-radius:14px;padding:16px;font-size:15px;font-weight:700;cursor:pointer;font-family:var(--sans);"><i class="ti ti-circle-check" style="font-size:15px;width:15px;height:15px;vertical-align:-2px;margin-right:6px;color:#0d0f14;"></i> Siap, Saya Install!</button>
    </div>`;
  el.onclick = e => { if(e.target===el) el.remove(); };
  document.body.appendChild(el);
}

function showPwaGuideModal(msg) {
  // Remove existing
  document.getElementById('pwa-guide-modal')?.remove();
  const el = document.createElement('div');
  el.id = 'pwa-guide-modal';
  el.style.cssText = `position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;animation:fadeIn 0.2s ease;`;
  el.innerHTML = `
    <div style="background:var(--surface);border-radius:20px 20px 0 0;padding:28px 24px 40px;width:100%;max-width:480px;border-top:1px solid var(--border);animation:slideUp 0.3s cubic-bezier(0.34,1.2,0.64,1);">
      <div style="width:40px;height:4px;background:var(--border);border-radius:4px;margin:0 auto 20px;"></div>
      <div style="width:56px;height:56px;border-radius:50%;background:rgba(74,222,128,0.12);border:1px solid rgba(74,222,128,0.3);display:flex;align-items:center;justify-content:center;margin:0 auto 12px;"><i class="ti ti-device-mobile-down" style="font-size:26px;width:26px;height:26px;color:var(--accent);"></i></div>
      <div style="font-size:16px;font-weight:700;color:var(--text);text-align:center;margin-bottom:8px;">Install OAS sebagai App</div>
      <div style="font-size:13px;color:var(--muted);text-align:center;margin-bottom:20px;">Akses lebih cepat tanpa buka browser</div>
      <div style="background:var(--surface2);border-radius:12px;padding:16px 18px;font-size:13px;color:var(--text);line-height:1.8;white-space:pre-line;border:1px solid var(--border);">${escapeHtml(msg)}</div>
      <button onclick="document.getElementById('pwa-guide-modal').remove()" style="width:100%;margin-top:16px;background:var(--accent);color:#0d0f14;border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--sans);">Mengerti</button>
    </div>`;
  el.onclick = e => { if(e.target===el) el.remove(); };
  document.body.appendChild(el);
}

// Tangkap event beforeinstallprompt (Chrome/Edge/Samsung)
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _pwaPrompt = e;
  updatePwaBtn();
});

// Deteksi sudah terinstall
window.addEventListener('appinstalled', () => {
  _pwaInstalled = true;
  _pwaPrompt = null;
  updatePwaBtn();
  if(typeof showAlert === 'function') showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> OAS berhasil diinstall di perangkat ini!');
});

// Init state setelah DOM siap
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(updatePwaBtn, 500);
});

// ═══ CUSTOM MONTH PICKER ═══
(function() {
  const MONTHS_ID = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];

  let _targetInputId = null;
  let _targetBtnId = null;
  let _curYear = new Date().getFullYear();
  let _curMonth = new Date().getMonth(); // 0-indexed

  function createPickerDOM() {
    if(document.getElementById('month-picker-backdrop')) return;
    const style = document.createElement('style');
    style.textContent = `
      #month-picker-backdrop {
        display:none; position:fixed; inset:0;
        background:rgba(0,0,0,0.55); backdrop-filter:blur(4px);
        z-index:9500; align-items:flex-end; justify-content:center;
      }
      #month-picker-backdrop.open { display:flex; }
      #month-picker-sheet {
        width:100%; max-width:420px;
        background:var(--surface);
        border-radius:20px 20px 0 0;
        border-top:1px solid var(--border);
        padding-bottom:env(safe-area-inset-bottom,12px);
        animation:slideUpSheet 0.28s cubic-bezier(0.34,1.56,0.64,1);
        overflow:hidden;
        box-shadow:0 -8px 40px rgba(0,0,0,0.3);
      }
      @media(min-width:600px){
        #month-picker-backdrop{align-items:center;}
        #month-picker-sheet{border-radius:16px;margin:20px;border:1px solid var(--border);animation:popIn 0.25s cubic-bezier(0.34,1.4,0.64,1);}
      }
      #month-picker-header {
        padding:14px 18px 12px; border-bottom:1px solid var(--border);
        display:flex; align-items:center; gap:10px;
      }
      #month-picker-title {
        flex:1; font-size:14px; font-weight:600;
        color:var(--text); font-family:var(--mono); letter-spacing:0.02em;
      }
      #month-picker-close {
        width:28px;height:28px;border-radius:50%;
        background:var(--surface2);border:1px solid var(--border);
        color:var(--muted);cursor:pointer;
        display:flex;align-items:center;justify-content:center;
        font-size:13px;transition:all 0.15s;
      }
      #month-picker-close:hover{background:var(--red);color:#fff;border-color:var(--red);}
      #month-picker-year-nav {
        display:flex;align-items:center;justify-content:center;
        gap:16px; padding:14px 18px 8px;
      }
      #month-picker-year-nav button {
        width:32px;height:32px;border-radius:8px;
        background:var(--surface2);border:1px solid var(--border);
        color:var(--text);cursor:pointer;font-size:16px;
        display:flex;align-items:center;justify-content:center;
        transition:all 0.15s;
      }
      #month-picker-year-nav button:hover{border-color:var(--accent);color:var(--accent);}
      #month-picker-year-label {
        font-size:16px;font-weight:700;color:var(--text);
        font-family:var(--mono);min-width:60px;text-align:center;
      }
      #month-picker-grid {
        display:grid; grid-template-columns:repeat(3,1fr);
        gap:8px; padding:8px 18px 18px;
      }
      .mp-month-btn {
        padding:10px 6px; border-radius:10px;
        background:var(--surface2); border:1px solid var(--border);
        color:var(--text); font-size:13px; font-family:var(--sans);
        cursor:pointer; text-align:center; transition:all 0.15s;
      }
      .mp-month-btn:hover { border-color:var(--accent); color:var(--accent); }
      .mp-month-btn.selected {
        background:var(--accent); color:#000; border-color:var(--accent);
        font-weight:700; box-shadow:0 0 12px rgba(74,222,128,0.35);
      }
      .mp-month-btn.today-month {
        border-color:rgba(74,222,128,0.4);
      }
      #month-picker-handle {
        width:36px;height:4px;background:var(--border);
        border-radius:2px;margin:12px auto 0;
      }
      @media(min-width:600px){#month-picker-handle{display:none;}}
    `;
    document.head.appendChild(style);

    const backdrop = document.createElement('div');
    backdrop.id = 'month-picker-backdrop';
    backdrop.innerHTML = `
      <div id="month-picker-sheet">
        <div id="month-picker-handle"></div>
        <div id="month-picker-header">
          <i class="ti ti-calendar" style="font-size:16px;width:16px;height:16px;color:var(--accent);flex-shrink:0;"></i>
          <div id="month-picker-title">Pilih Periode Bulan</div>
          <button id="month-picker-close" onclick="closeMonthPicker()">✕</button>
        </div>
        <div id="month-picker-year-nav">
          <button onclick="monthPickerChangeYear(-1)">‹</button>
          <span id="month-picker-year-label">2026</span>
          <button onclick="monthPickerChangeYear(1)">›</button>
        </div>
        <div id="month-picker-grid"></div>
      </div>
    `;
    backdrop.addEventListener('click', function(e){ if(e.target===this) closeMonthPicker(); });
    document.body.appendChild(backdrop);
  }

  function renderGrid() {
    const now = new Date();
    const grid = document.getElementById('month-picker-grid');
    if(!grid) return;
    document.getElementById('month-picker-year-label').textContent = _curYear;

    // Get currently selected value
    let selYear = -1, selMonth = -1;
    if(_targetInputId) {
      const val = document.getElementById(_targetInputId)?.value;
      if(val) { const p=val.split('-'); selYear=parseInt(p[0]); selMonth=parseInt(p[1])-1; }
    }

    grid.innerHTML = MONTHS_ID.map((name,i) => {
      const isSelected = (selYear===_curYear && selMonth===i);
      const isToday = (now.getFullYear()===_curYear && now.getMonth()===i);
      return `<button class="mp-month-btn${isSelected?' selected':''}${isToday&&!isSelected?' today-month':''}"
        onclick="monthPickerSelect(${i})">${MONTHS_SHORT[i]}<br><small style="font-size:10px;opacity:0.7">${String(i+1).padStart(2,'0')}</small></button>`;
    }).join('');
  }

  window.openMonthPicker = function(inputId, btnId) {
    _targetInputId = inputId;
    _targetBtnId = btnId;
    // Init year from current value or today
    const val = document.getElementById(inputId)?.value;
    if(val) { _curYear = parseInt(val.split('-')[0]); }
    else { _curYear = new Date().getFullYear(); }
    createPickerDOM();
    renderGrid();
    document.getElementById('month-picker-backdrop').classList.add('open');
    const btn = btnId ? document.getElementById(btnId) : null;
    if(btn) btn.classList.add('open');
  };

  window.closeMonthPicker = function() {
    const bd = document.getElementById('month-picker-backdrop');
    if(bd) bd.classList.remove('open');
    if(_targetBtnId) { const btn=document.getElementById(_targetBtnId); if(btn) btn.classList.remove('open'); }
  };

  window.monthPickerChangeYear = function(delta) {
    _curYear += delta;
    renderGrid();
  };

  window.monthPickerSelect = function(monthIdx) {
    const val = `${_curYear}-${String(monthIdx+1).padStart(2,'0')}`;
    if(_targetInputId) {
      const inp = document.getElementById(_targetInputId);
      if(inp) inp.value = val;
    }
    // Update display text (ang-periode-text or similar pattern)
    const textEl = document.getElementById(_targetInputId + '-text') ||
                   document.getElementById(_targetInputId.replace('ang-periode','ang-periode-text'));
    if(textEl) textEl.textContent = `${MONTHS_SHORT[monthIdx]} ${_curYear}`;
    else {
      // Try btn label
      const btn = _targetBtnId ? document.getElementById(_targetBtnId) : null;
      if(btn) {
        const lbl = btn.querySelector('.opt-picker-label');
        if(lbl) lbl.textContent = `${MONTHS_SHORT[monthIdx]} ${_curYear}`;
      }
    }
    closeMonthPicker();
  };
})();

// Placeholder — functions moved to main script block above

function showOrgMembersSQL() {
  const sql = '-- Jalankan di Supabase SQL Editor:\n\n'
    + '-- 1. Tabel org_members\n'
    + 'CREATE TABLE org_members (\n'
    + '  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n'
    + '  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,\n'
    + '  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,\n'
    + '  email text NOT NULL,\n'
    + '  nama text, nik text, jabatan text,\n'
    + '  role text DEFAULT \'member\',\n'
    + '  permissions jsonb DEFAULT \'{}\',\n'
    + '  status text DEFAULT \'pending\',\n'
    + '  invited_by uuid REFERENCES auth.users(id),\n'
    + '  created_at timestamptz DEFAULT now()\n'
    + ');\n'
    + 'ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;\n'
    + 'CREATE POLICY "Org members access" ON org_members FOR ALL\n'
    + '  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()) OR user_id = auth.uid());\n'
    + 'CREATE INDEX idx_org_members_company ON org_members(company_id);\n'
    + 'CREATE INDEX idx_org_members_email ON org_members(email);\n\n'
    + '-- 2. Tabel company_join_codes\n'
    + 'CREATE TABLE company_join_codes (\n'
    + '  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n'
    + '  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,\n'
    + '  code text NOT NULL UNIQUE,\n'
    + '  created_by uuid REFERENCES auth.users(id),\n'
    + '  expires_at timestamptz NOT NULL,\n'
    + '  created_at timestamptz DEFAULT now()\n'
    + ');\n'
    + 'ALTER TABLE company_join_codes ENABLE ROW LEVEL SECURITY;\n'
    + 'CREATE POLICY "Join codes access" ON company_join_codes FOR ALL\n'
    + '  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));\n'
    + 'CREATE POLICY "Anyone can read join code by code value"\n'
    + '  ON company_join_codes FOR SELECT USING (true);';

  const w = window.open('', '_blank');
  if (!w) { showAlert('Popup diblokir browser. Izinkan popup untuk melihat SQL.'); return; }
  w.document.write('<!DOCTYPE html><html><head><title>SQL Multi-User OAS<\/title>'
    + '\u003cstyle\u003ebody{font-family:monospace;background:#0d0f14;color:#e2e8f0;padding:24px;margin:0;}'
    + 'pre{background:#141720;border:1px solid #252a3a;border-radius:10px;padding:20px;white-space:pre-wrap;font-size:13px;line-height:1.6;}'
    + 'h2{color:#4ade80;margin-bottom:16px;}'
    + 'button{background:#4ade80;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;color:#0d0f14;margin-bottom:16px;}'
    + '\u003c\/style\u003e\u003c\/head\u003e\u003cbody\u003e'
    + '\u003ch2\u003eSQL: Multi-User System untuk OAS\u003c\/h2\u003e'
    + '\u003cbutton onclick="navigator.clipboard.writeText(document.querySelector(\'pre\').textContent).then(()=\u003ethis.textContent=\'✓ Copied!\')"\u003eCopy SQL\u003c\/button\u003e'
    + '\u003cpre\u003e' + sql.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '\u003c\/pre\u003e'
    + '\u003c\/body\u003e\u003c\/html\u003e');
  w.document.close();
}
