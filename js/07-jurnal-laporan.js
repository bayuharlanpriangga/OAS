
// RENDER DASHBOARD
// Old renderDashboard removed — new version below

function jeninsBadge(j){
  if(j==='Kas') return 'badge-blue';
  if(j==='Penjualan') return 'badge-green';
  if(j==='Pembelian') return 'badge-yellow';
  return 'badge-gray';
}

// RENDER JURNAL UMUM
function renderJurnalUmum() {
  const search = document.getElementById('filter-ju')?.value?.toLowerCase()||'';
  const type = document.getElementById('filter-ju-type')?.value||'';
  const body = document.getElementById('jurnal-umum-body');
  // Always sync attachments from localStorage before render
  const allAttach = getAttachments();
  let rows=[];
  const filtered = jurnalEntries.filter(j=>{
    if(type && j.jenis!==type) return false;
    if(search && !j.ket.toLowerCase().includes(search)) return false;
    return true;
  });
  filtered.forEach(j=>{
    const idx = jurnalEntries.indexOf(j);
    // Sync attachment count from localStorage
    const attachCount = (allAttach[j.no]||[]).length;
    j.lines.forEach((l,i)=>{
      const a=akuns.find(x=>x.kode===l.akun);
      rows.push(`<tr>
        ${i===0?`<td rowspan="${j.lines.length}">${fmtDate(j.tanggal)}</td>
                 <td rowspan="${j.lines.length}" style="font-family:var(--mono);font-size:12px;">${j.no}</td>
                 <td rowspan="${j.lines.length}">${j.ket}${j.kodeRef?`<span style="font-size:9px;color:var(--muted);display:block;font-family:var(--mono);">${j.kodeRef}</span>`:''}</td>
                 <td rowspan="${j.lines.length}"><span class="badge ${jeninsBadge(j.jenis)}">${j.jenis}</span></td>`:''}
        <td style="${l.debit?'':'padding-left:28px'}">${a?.nama||l.akun}</td>
        <td class="debit">${l.debit?fmtRp(l.debit):''}</td>
        <td class="kredit">${l.kredit?fmtRp(l.kredit):''}</td>
        ${i===0?`<td rowspan="${j.lines.length}" style="text-align:center;vertical-align:middle;padding:4px 2px;">
            <button onclick="openAttachModal(${idx})" title="Lampiran" style="background:none;border:none;cursor:pointer;padding:4px 5px;border-radius:6px;transition:all 0.15s;opacity:${attachCount?'1':'0.35'};display:flex;align-items:center;gap:3px;color:${attachCount?'var(--accent2)':'var(--muted)'};" onmouseover="this.style.opacity='1';this.style.background='rgba(34,211,238,0.08)'" onmouseout="this.style.opacity='${attachCount?1:0.35}';this.style.background='none'"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>${attachCount?`<span style="font-size:10px;font-weight:600;font-family:var(--mono)">${attachCount}</span>`:''}</button>
          </td>
          <td rowspan="${j.lines.length}" style="text-align:center;vertical-align:middle;">
          <button onclick="konfirmasiHapusJurnal(${idx})" data-tooltip="Hapus Jurnal"
            style="background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.25);border-radius:6px;padding:5px 8px;cursor:pointer;color:var(--red);font-size:13px;transition:all 0.15s;"
            onmouseover="this.style.background='rgba(248,113,113,0.25)'" onmouseout="this.style.background='rgba(248,113,113,0.1)'"><i class="ti ti-trash" style="font-size:14px;"></i></button>
        </td>`:''}
      </tr>`);
    });
  });
  body.innerHTML = rows.length ? rows.join('') : `<tr><td colspan="9">${emptyState('Belum ada jurnal')}</td></tr>`;
}

// RENDER JURNAL KAS
function renderJurnalKas() {
  const body = document.getElementById('jurnal-kas-body');
  let saldo=0, totalIn=0, totalOut=0;
  const rows=[];
  jurnalEntries.forEach(j=>{
    j.lines.forEach(l=>{
      if(l.akun==='1101'){
        const masuk=l.debit||0, keluar=l.kredit||0;
        saldo+=masuk-keluar; totalIn+=masuk; totalOut+=keluar;
        if(masuk||keluar) rows.push(`<tr>
          <td>${fmtDate(j.tanggal)}</td>
          <td style="font-family:var(--mono);font-size:12px;">${j.no}</td>
          <td>${j.ket}</td>
          <td class="debit">${masuk?fmtRp(masuk):''}</td>
          <td class="kredit">${keluar?fmtRp(keluar):''}</td>
          <td class="num" style="color:${saldo>=0?'var(--accent)':'var(--red)'};">${fmtRp(saldo)}</td>
        </tr>`);
      }
    });
  });
  body.innerHTML = rows.join('') || `<tr><td colspan="6">${emptyState('Belum ada transaksi kas')}</td></tr>`;
  document.getElementById('jurnal-kas-total').innerHTML=
    `<span style="font-size:12.5px;color:var(--muted);">Total Penerimaan: <b style="color:var(--accent);font-family:var(--mono);">${fmtRp(totalIn)}</b> &nbsp;|&nbsp; Total Pengeluaran: <b style="color:var(--red);font-family:var(--mono);">${fmtRp(totalOut)}</b> &nbsp;|&nbsp; Saldo Akhir Kas: <b style="color:var(--accent2);font-family:var(--mono);">${fmtRp(saldo)}</b></span>`;
}

// RENDER JURNAL PENJUALAN
function renderJurnalPenjualan() {
  const body = document.getElementById('jurnal-penjualan-body');
  const rows=[];
  jurnalEntries.filter(j=>j.jenis==='Penjualan').forEach(j=>{
    const kasLine=j.lines.find(l=>['1101','1201'].includes(l.akun));
    const jualLine=j.lines.find(l=>l.akun==='4101');
    if(jualLine) rows.push(`<tr>
      <td>${fmtDate(j.tanggal)}</td>
      <td style="font-family:var(--mono);font-size:12px;">${j.ref||j.no}</td>
      <td>${j.ket}</td>
      <td><span class="badge ${kasLine?.akun==='1101'?'badge-green':'badge-blue'}">${kasLine?.akun==='1101'?'Tunai':'Kredit'}</span></td>
      <td class="debit">${fmtRp(kasLine?.debit||0)}</td>
      <td class="kredit">${fmtRp(jualLine?.kredit||0)}</td>
    </tr>`);
  });
  body.innerHTML = rows.join('') || `<tr><td colspan="6">${emptyState('Belum ada penjualan')}</td></tr>`;
}

// RENDER JURNAL PEMBELIAN
function renderJurnalPembelian() {
  const body = document.getElementById('jurnal-pembelian-body');
  const rows=[];
  jurnalEntries.filter(j=>j.jenis==='Pembelian').forEach(j=>{
    const krLine=j.lines.find(l=>['1101','2101'].includes(l.akun)&&l.kredit);
    const drLine=j.lines.find(l=>l.debit&&l.akun!=='1101'&&l.akun!=='2101');
    if(drLine) rows.push(`<tr>
      <td>${fmtDate(j.tanggal)}</td>
      <td style="font-family:var(--mono);font-size:12px;">${j.ref||j.no}</td>
      <td>${j.ket}</td>
      <td><span class="badge ${krLine?.akun==='1101'?'badge-green':'badge-yellow'}">${krLine?.akun==='1101'?'Tunai':'Kredit'}</span></td>
      <td>${akuns.find(a=>a.kode===drLine.akun)?.nama||drLine.akun} — <span class="debit">${fmtRp(drLine.debit)}</span></td>
      <td class="kredit">${fmtRp(krLine?.kredit||0)}</td>
    </tr>`);
  });
  body.innerHTML = rows.join('') || `<tr><td colspan="6">${emptyState('Belum ada pembelian')}</td></tr>`;
}

// RENDER BUKU BESAR
function renderBukuBesar() {
  const kode = document.getElementById('bb-akun-filter-val')?.value || '';
  const cont=document.getElementById('buku-besar-content');
  if(!kode){cont.innerHTML=`<div style="color:var(--muted);padding:32px;text-align:center;">Pilih akun untuk melihat buku besar</div>`;return;}
  const akun=akuns.find(a=>a.kode===kode);
  let saldo=0;
  const rows=[];
  jurnalEntries.forEach(j=>{
    j.lines.forEach(l=>{
      if(l.akun===kode){
        const n=akun?.normal;
        if(n==='D') saldo+=l.debit-(l.kredit||0);
        else saldo+=(l.kredit||0)-l.debit;
        rows.push(`<tr>
          <td>${fmtDate(j.tanggal)}</td>
          <td style="font-family:var(--mono);font-size:12px;">${j.no}</td>
          <td>${j.ket}</td>
          <td class="debit" style="text-align:right;">${l.debit?fmtRp(l.debit):''}</td>
          <td class="kredit" style="text-align:right;">${l.kredit?fmtRp(l.kredit):''}</td>
          <td class="num" style="text-align:right;color:${saldo>=0?'var(--accent)':'var(--red)'};">${fmtRp(Math.abs(saldo))} ${saldo>=0?(n==='D'?'D':'K'):(n==='D'?'K':'D')}</td>
        </tr>`);
      }
    });
  });
  cont.innerHTML=`
    <div style="font-size:13px;color:var(--muted);margin-bottom:12px;">Akun: <b style="color:var(--text);">${escapeHtml(akun?.kode)} - ${escapeHtml(akun?.nama)}</b> &nbsp;|&nbsp; Tipe: ${akun?.tipe} &nbsp;|&nbsp; Normal: ${akun?.normal==='D'?'Debit':'Kredit'}</div>
    <div class="table-card"><div class="table-scroll"><table style="min-width:600px;">
      <thead><tr><th>Tanggal</th><th>No. Jurnal</th><th>Keterangan</th><th style="text-align:right;">Debit</th><th style="text-align:right;">Kredit</th><th style="text-align:right;">Saldo</th></tr></thead>
      <tbody>${rows.join('')||`<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--muted);">Tidak ada mutasi</td></tr>`}</tbody>
      <tfoot><tr class="total-row"><td colspan="5" style="text-align:right;">Saldo Akhir</td><td class="num" style="text-align:right;">${fmtRp(Math.abs(saldo))}</td></tr></tfoot>
    </table></div></div>`;
}

function openBukuBesarPicker() {
  // Use the existing akun picker bottom sheet in "simple picker" mode
  _simplePickerHiddenId = 'bb-akun-filter-val';
  _simplePickerBtnId = 'bb-akun-filter-btn';
  _simplePickerFilter = null; // show all akuns
  document.getElementById('akun-picker-search').value = '';
  const currentVal = document.getElementById('bb-akun-filter-val')?.value || '';
  renderFilteredPickerList('', currentVal, null);
  document.getElementById('akun-picker-backdrop').classList.add('open');
  setTimeout(()=>document.getElementById('akun-picker-search').focus(), 200);
}

// NERACA SALDO
// Old renderNeracaSaldo removed — filtered version below

// LABA RUGI
// Old renderLabaRugi removed — filtered version below

// NERACA
function renderNeraca() {
  let aset=0,liab=0,ekuitas=0;
  const asetRows=[],liabRows=[],ekRows=[];
  const labaBersih = (() => {
    let p=0,b=0;
    akuns.forEach(a=>{const s=getSaldoAkun(a.kode);if(a.tipe==='Pendapatan')p+=s;if(['Beban','HPP'].includes(a.tipe))b+=s;});
    return p-b;
  })();
  akuns.forEach(a=>{
    const s=getSaldoAkun(a.kode);
    if(!s&&a.tipe!=='Ekuitas') return;
    if(a.tipe==='Aset'){
      const v=a.normal==='D'?s:-s;
      aset+=v; asetRows.push([a.nama,v]);
    }
    if(a.tipe==='Liabilitas'){liab+=s;liabRows.push([a.nama,s]);}
    if(a.tipe==='Ekuitas'){
      // normal K (Modal, Laba Ditahan) → +ekuitas; normal D (Prive) → -ekuitas
      // Nilai s dari getSaldoAkun sudah positif (misal Prive = 500.000)
      // Di tabel: Prive tampil (500.000) sebagai pengurang, total ekuitas = modal + laba - prive
      if(a.normal==='D'){
        ekuitas -= s;       // dikurangi dari total ekuitas
        if(s) ekRows.push([a.nama, s, true]); // flag isPrive=true
      } else {
        if(s) ekuitas += s;
        ekRows.push([a.nama, s, false]);
      }
    }
  });
  // labaBersih ditambahkan ke ekuitas HANYA sekali — jangan double count
  const totalEkuitas = ekuitas + labaBersih;
  const secHtml=(title,rows,total,color)=>`
    <div class="table-card" style="margin-bottom:16px;">
      <div class="table-header"><div class="table-title">${title}</div></div>
      <table><tbody>
        ${rows.map(([n,v,isPrive])=>`<tr>
          <td style="padding-left:24px">${escapeHtml(n)}${isPrive?` <span style="font-size:10px;color:var(--muted);">(pengurang)</span>`:''}</td>
          <td class="num" style="text-align:right;color:${isPrive?'var(--red)':color};">${isPrive?'('+fmtRp(v)+')':fmtRp(v)}</td>
        </tr>`).join('')}
        ${title==='Ekuitas'?`<tr><td style="padding-left:24px">Laba Periode Berjalan</td><td class="num" style="text-align:right;color:var(--accent);">${fmtRp(labaBersih)}</td></tr>`:''}
      </tbody><tfoot><tr class="total-row"><td>Total ${title}</td><td class="num" style="text-align:right;">${fmtRp(total)}</td></tr></tfoot></table>
    </div>`;
  document.getElementById('neraca-content').innerHTML=`
    <div class="grid-2" style="align-items:start;">
      <div>${secHtml('Aset',asetRows,aset,'var(--accent)')}</div>
      <div>
        ${secHtml('Liabilitas',liabRows,liab,'var(--red)')}
        ${secHtml('Ekuitas',ekRows,totalEkuitas,'var(--accent2)')}
        <div class="table-card"><table><tbody>
          <tr class="total-row"><td>TOTAL LIAB + EKUITAS</td><td class="num" style="text-align:right;">${fmtRp(liab+totalEkuitas)}</td></tr>
        </tbody></table></div>
      </div>
    </div>
    <div style="font-size:12px;color:${Math.abs(aset-(liab+totalEkuitas))<1?'var(--accent)':'var(--red)'};margin-top:8px;font-family:var(--mono);">
      ${Math.abs(aset-(liab+totalEkuitas))<1?'✓ Neraca Balance':'✗ Neraca Tidak Balance — selisih: '+fmtRp(Math.abs(aset-(liab+totalEkuitas)))}
    </div>`;
}
function exportArusKasPDF(){const el=document.getElementById('arus-kas-content');if(!el||!el.innerHTML.trim()){showAlert('Tidak ada data.');return;}const profil=JSON.parse(localStorage.getItem('oas_profil')||localStorage.getItem('oas_profil_v1')||'{}');const win=window.open('','_blank');win.document.write(`<!DOCTYPE html><html><head><title>Laporan Arus Kas</title>\u003cstyle\u003ebody{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:32px;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}td{padding:6px 10px;}.total-row td{font-weight:700;border-top:1.5px solid #333;}\u003c/style\u003e</head><body><h2 style="text-align:center">${escapeHtml(profil.nama||'Perusahaan')}</h2><p style="text-align:center;color:#666;font-size:11px;">Laporan Arus Kas · Metode Tidak Langsung (PSAK 2)</p>${el.innerHTML}

</body></html>`);win.document.close();setTimeout(()=>win.print(),500);}

// ══════════════════════════════════════════════════════════════
// LAPORAN PERUBAHAN EKUITAS (PSAK 1)
// ══════════════════════════════════════════════════════════════
function renderPerubahanEkuitas(){
  const periodVal=document.getElementById('pe-period')?.value||'all';
  const saldoMap=getFilteredSaldo(periodVal);
  const el=document.getElementById('pe-content');if(!el)return;
  const profil=JSON.parse(localStorage.getItem('oas_profil')||localStorage.getItem('oas_profil_v1')||'{}');
  const getSaldo=(kode)=>{const a=akuns.find(x=>x.kode===kode);if(!a)return 0;const s=saldoMap[kode]||{debit:0,kredit:0};return a.normal==='D'?s.debit-s.kredit:s.kredit-s.debit;};
  const modalDisetor=getSaldo('3101'),prive=getSaldo('3102'),labaDitahan=getSaldo('3201');
  const labaBersih=akuns.filter(a=>a.tipe==='Pendapatan').reduce((acc,a)=>acc+getSaldo(a.kode),0)-akuns.filter(a=>['HPP','Beban'].includes(a.tipe)).reduce((acc,a)=>acc+getSaldo(a.kode),0);
  const totalEkuitas=modalDisetor-prive+labaDitahan+labaBersih;
  const ekuitasAwal=labaDitahan+modalDisetor;
  const rpR=v=>{const f='Rp '+Math.abs(Math.round(v)).toLocaleString('id-ID');return v<0?`<span style="color:var(--red);">(${f})</span>`:`<span>${f}</span>`;};
  const rpN=v=>{const f='Rp '+Math.abs(Math.round(v)).toLocaleString('id-ID');return v<0?`(${f})`:f;};
  const sel=document.getElementById('pe-period');const lbl=sel?sel.options[sel.selectedIndex].text:'Semua Periode';
  el.innerHTML=`<div class="table-card" style="margin-bottom:16px;"><div class="table-header"><div class="table-title"><i class="ti ti-chart-area ti-btn"></i> Perubahan Ekuitas Pemilik</div></div><table><thead><tr><th>Keterangan</th><th style="text-align:right">Modal Disetor</th><th style="text-align:right">Laba Ditahan</th><th style="text-align:right">Total Ekuitas</th></tr></thead><tbody>
      <tr><td style="color:var(--muted);font-size:13px;">Saldo Awal Periode</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">${rpR(modalDisetor)}</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">${rpR(labaDitahan)}</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">${rpR(ekuitasAwal)}</td></tr>
      ${modalDisetor?`<tr><td style="padding-left:24px;color:var(--muted);font-size:13px;">+ Setoran Modal</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">${rpR(modalDisetor)}</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">—</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">${rpR(modalDisetor)}</td></tr>`:''}
      <tr><td style="padding-left:24px;color:var(--muted);font-size:13px;">+ Laba Bersih Periode</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">—</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">${rpR(labaBersih)}</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">${rpR(labaBersih)}</td></tr>
      ${prive?`<tr><td style="padding-left:24px;color:var(--muted);font-size:13px;">- Prive / Pengambilan Pribadi</td><td style="text-align:right;font-family:var(--mono);font-size:13px;">—</td><td style="text-align:right;font-family:var(--mono);font-size:13px;color:var(--red);">(Rp ${Math.round(prive).toLocaleString('id-ID')})</td><td style="text-align:right;font-family:var(--mono);font-size:13px;color:var(--red);">(Rp ${Math.round(prive).toLocaleString('id-ID')})</td></tr>`:''}
    </tbody><tfoot><tr class="total-row"><td>TOTAL EKUITAS AKHIR PERIODE</td><td style="text-align:right;font-family:var(--mono);">—</td><td style="text-align:right;font-family:var(--mono);">—</td><td style="text-align:right;font-family:var(--mono);color:${totalEkuitas>=0?'var(--accent)':'var(--red)'};">${rpN(totalEkuitas)}</td></tr></tfoot></table></div>`;
}
function exportPerubahanEkuitasPDF(){const el=document.getElementById('pe-content');if(!el||!el.innerHTML.trim()){showAlert('Tidak ada data.');return;}const profil=JSON.parse(localStorage.getItem('oas_profil')||localStorage.getItem('oas_profil_v1')||'{}');const win=window.open('','_blank');win.document.write(`<!DOCTYPE html><html><head><title>Laporan Perubahan Ekuitas</title>\u003cstyle\u003ebody{font-family:Arial,sans-serif;font-size:13px;color:#111;margin:32px;}table{width:100%;border-collapse:collapse;margin-bottom:16px;}td,th{padding:7px 10px;}th{background:#f5f5f5;font-weight:600;}.total-row td{font-weight:700;border-top:2px solid #333;}\u003c/style\u003e</head><body><h2 style="text-align:center">${escapeHtml(profil.nama||'Perusahaan')}</h2><p style="text-align:center;color:#666;font-size:11px;">Laporan Perubahan Ekuitas (PSAK 1)</p>${el.innerHTML}</body></html>`);win.document.close();setTimeout(()=>win.print(),500);}

// ══════════════════════════════════════════════════════════════
// REGISTER ASET TETAP (UPGRADED: card view, foto, auto-penyusutan)
// ══════════════════════════════════════════════════════════════
function openModalAsetTetap(editId=null){
  try{
    const f=editId?asetTetapList.find(a=>a.id===editId):null;
    const setVal=(id,v)=>{const el=document.getElementById(id);if(el){el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}));}};
    setVal('at-edit-id',editId||'');setVal('at-nama',f?.nama||'');setVal('at-kategori',f?.kategori||'Kendaraan');
    setVal('at-tgl-perolehan',f?.tglPerolehan||new Date().toISOString().split('T')[0]);
    setVal('at-harga',f?.hargaPerolehan||'');setVal('at-residu',f?.nilaiResidu||0);
    setVal('at-umur',f?.umurEkonomis||5);setVal('at-metode',f?.metode||'garis-lurus');setVal('at-lokasi',f?.lokasi||'');
    const chk=document.getElementById('at-buat-jurnal');if(chk)chk.checked=!editId;
    openModal('modal-aset-tetap');setTimeout(upgradeFormPickers,80);
  }catch(e){console.error('openModalAsetTetap:',e);}
}

function renderReportWithPeriod(pageId, periodVal) {
  // Temporarily set dashboard filter and call render
  if(pageId === 'laba-rugi') renderLabaRugiFiltered(periodVal);
  else if(pageId === 'neraca-saldo') renderNeracaSaldoFiltered(periodVal);
  // Update label
  const page = document.getElementById('page-'+pageId);
  const sel = page?.querySelector('.report-period-sel');
  if(sel) sel.value = periodVal;
}

function getFilteredSaldo(periodVal) {
  const now = new Date(); const y=now.getFullYear(), m=now.getMonth();
  let from=null, to=null;
  if(periodVal==='this-month'){from=new Date(y,m,1);to=new Date(y,m+1,0);}
  else if(periodVal==='last-month'){from=new Date(y,m-1,1);to=new Date(y,m,0);}
  else if(periodVal==='this-quarter'){const q=Math.floor(m/3);from=new Date(y,q*3,1);to=new Date(y,q*3+3,0);}
  else if(periodVal==='this-year'){from=new Date(y,0,1);to=new Date(y,11,31);}

  const filtJurnals = from ? jurnalEntries.filter(j=>{const d=new Date(j.tanggal);return d>=from&&d<=to;}) : jurnalEntries;
  const map = {};
  filtJurnals.forEach(j=>j.lines.forEach(l=>{
    if(!map[l.akun]) map[l.akun]={debit:0,kredit:0};
    map[l.akun].debit+=l.debit||0; map[l.akun].kredit+=l.kredit||0;
  }));
  return map;
}

function renderLabaRugiFiltered(periodVal='all') {
  const saldoMap = getFilteredSaldo(periodVal);
  const getSaldo = (kode) => {
    const a=akuns.find(x=>x.kode===kode); if(!a) return 0;
    const s=saldoMap[kode]||{debit:0,kredit:0};
    return a.normal==='D'?s.debit-s.kredit:s.kredit-s.debit;
  };
  let tP=0,tH=0,tB=0;
  const pRows=[],hRows=[],bRows=[];
  akuns.forEach(a=>{const s=getSaldo(a.kode);if(!s)return;
    if(a.tipe==='Pendapatan'){tP+=s;pRows.push([a.nama,s]);}
    if(a.tipe==='HPP'){tH+=s;hRows.push([a.nama,s]);}
    if(a.tipe==='Beban'){tB+=s;bRows.push([a.nama,s]);}});
  const labaK=tP-tH,labaB=labaK-tB;
  const secHtml=(title,rows,total,color)=>`
    <div class="table-card" style="margin-bottom:16px;">
      <div class="table-header"><div class="table-title">${title}</div></div>
      <table><tbody>
        ${rows.map(([n,v])=>`<tr><td style="padding-left:24px">${escapeHtml(n)}</td><td class="num" style="text-align:right;color:${color};">${fmtRp(v)}</td></tr>`).join('')}
      </tbody><tfoot><tr class="total-row"><td>Total ${title}</td><td class="num" style="text-align:right;">${fmtRp(total)}</td></tr></tfoot></table>
    </div>`;
  document.getElementById('laba-rugi-content').innerHTML=
    secHtml('Pendapatan',pRows,tP,'var(--accent)')+
    secHtml('HPP',hRows,tH,'var(--red)')+
    `<div class="table-card" style="margin-bottom:16px;"><table><tbody><tr class="total-row"><td>Laba Kotor</td><td class="num" style="text-align:right;color:var(--accent2);">${fmtRp(labaK)}</td></tr></tbody></table></div>`+
    secHtml('Beban Operasional',bRows,tB,'var(--red)')+
    `<div class="table-card"><table><tbody><tr class="total-row"><td>LABA BERSIH</td><td class="num" style="text-align:right;color:${labaB>=0?'var(--accent)':'var(--red)'};">${fmtRp(labaB)}</td></tr></tbody></table></div>`;
}

function renderNeracaSaldoFiltered(periodVal='all') {
  const saldoMap = getFilteredSaldo(periodVal);
  const body=document.getElementById('neraca-saldo-body');
  let td=0,tk=0;
  const rows=akuns.map(a=>{
    const s=saldoMap[a.kode]||{debit:0,kredit:0};
    if(!s.debit && !s.kredit) return '';
    const net = s.debit - s.kredit;
    let d=0, k=0;
    if(net > 0) d=net; else if(net < 0) k=-net;
    if(!d&&!k) return '';
    td+=d; tk+=k;
    return `<tr><td style="font-family:var(--mono);font-size:12px;">${a.kode}</td><td>${a.nama}</td><td><span class="badge badge-gray">${a.tipe}</span></td><td style="text-align:right" class="debit">${d?fmtRp(d):''}</td><td style="text-align:right;padding-right:20px;" class="kredit">${k?fmtRp(k):''}</td></tr>`;
  }).filter(Boolean);
  const ok=Math.abs(td-tk)<1;
  body.innerHTML=rows.join('')+`<tr class="total-row"><td colspan="3">TOTAL</td><td style="text-align:right;font-family:var(--mono);">${fmtRp(td)}</td><td style="text-align:right;padding-right:20px;font-family:var(--mono);">${fmtRp(tk)}</td></tr>
    <tr><td colspan="5" style="text-align:right;padding:8px 20px 4px;font-size:12px;font-family:var(--mono);color:${ok?'var(--accent)':'var(--red)'};">${ok?'✓ Neraca Saldo Balance':'✗ Tidak Balance — selisih: '+fmtRp(Math.abs(td-tk))}</td></tr>`;
}

// Override renderLabaRugi and renderNeracaSaldo to use filtered version
function renderLabaRugi() { renderLabaRugiFiltered('all'); setTimeout(()=>addPeriodFilterToReports(),50); }
function renderNeracaSaldo() { renderNeracaSaldoFiltered('all'); setTimeout(()=>addPeriodFilterToReports(),50); }

// CUSTOM CONFIRM DIALOG
function showAIConfirm(jurnalActions, otherActions) {
  return new Promise((resolve) => {
    const backdrop = document.getElementById('custom-confirm-backdrop');
    const journalList = document.getElementById('confirm-journal-list');
    const otherDiv = document.getElementById('confirm-other-actions');

    // Build journal list
    if(jurnalActions.length > 0) {
      journalList.innerHTML = `
        <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px;">
          [Jurnal] ${jurnalActions.length} Jurnal akan disimpan:
        </div>
        ${jurnalActions.map((j, i) => {
          const total = (j.lines||[]).reduce((s,l)=>s+(l.debit||0),0);
          return `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:8px;margin-bottom:6px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:12.5px;font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${i+1}. ${j.ket}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px;">${(j.lines||[]).length} baris jurnal</div>
            </div>
            <div style="font-size:13px;font-weight:700;color:var(--accent);font-family:var(--mono);flex-shrink:0;margin-left:10px;">${fmtRp(total)}</div>
          </div>`;
        }).join('')}`;
    } else {
      journalList.innerHTML = '';
    }

    // Other actions
    if(otherActions.length > 0) {
      otherDiv.style.display = 'block';
      otherDiv.innerHTML = `[BEP] ${otherActions.length} aksi lain: navigasi, isi kalkulator, dll`;
    } else {
      otherDiv.style.display = 'none';
    }

    // Show modal
    backdrop.style.display = 'flex';

    // Button handlers
    const okBtn = document.getElementById('confirm-ok-btn');
    const cancelBtn = document.getElementById('confirm-cancel-btn');

    function cleanup() {
      backdrop.style.display = 'none';
      okBtn.replaceWith(okBtn.cloneNode(true));
      cancelBtn.replaceWith(cancelBtn.cloneNode(true));
    }

    document.getElementById('confirm-ok-btn').onclick = () => { cleanup(); resolve(true); };
    document.getElementById('confirm-cancel-btn').onclick = () => { cleanup(); resolve(false); };
    backdrop.onclick = (e) => { if(e.target === backdrop) { cleanup(); resolve(false); } };
  });
}
