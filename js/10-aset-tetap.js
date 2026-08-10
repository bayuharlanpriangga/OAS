
function hitungPenyusutanAset(aset){
  const tglPerolehan=new Date(aset.tglPerolehan),now=new Date();
  const bulanBerjalan=Math.max(0,(now.getFullYear()-tglPerolehan.getFullYear())*12+(now.getMonth()-tglPerolehan.getMonth()));
  const harga=aset.hargaPerolehan,residu=aset.nilaiResidu||0,umurBln=aset.umurEkonomis*12;
  let akumPenyusutan=0;
  if(aset.metode==='garis-lurus'){akumPenyusutan=Math.min(((harga-residu)/umurBln)*bulanBerjalan,harga-residu);}
  else{const tarif=2/aset.umurEkonomis;let nb=harga;for(let i=0;i<Math.min(bulanBerjalan,umurBln);i++){const p=(nb*tarif)/12;akumPenyusutan+=p;nb-=p;if(nb<=residu){akumPenyusutan=harga-residu;break;}}}
  return{akumPenyusutan:Math.round(akumPenyusutan),nilaiBuku:Math.max(residu,Math.round(harga-akumPenyusutan))};
}

function simpanAsetTetap(){
  const nama=document.getElementById('at-nama').value.trim(),harga=parseFloat(document.getElementById('at-harga').value)||0;
  if(!nama||!harga){showAlert('Nama aset dan harga perolehan wajib diisi.');return;}
  const editId=document.getElementById('at-edit-id').value;
  const aset={id:editId||'AT_'+Date.now(),nama,hargaPerolehan:harga,kategori:document.getElementById('at-kategori').value,tglPerolehan:document.getElementById('at-tgl-perolehan').value,nilaiResidu:parseFloat(document.getElementById('at-residu').value)||0,umurEkonomis:parseInt(document.getElementById('at-umur').value)||5,metode:document.getElementById('at-metode').value,lokasi:document.getElementById('at-lokasi').value,status:'aktif',createdAt:editId?(asetTetapList.find(a=>a.id===editId)?.createdAt||new Date().toISOString()):new Date().toISOString()};
  if(editId){const idx=asetTetapList.findIndex(a=>a.id===editId);if(idx>=0)asetTetapList[idx]={...asetTetapList[idx],...aset};}
  else{
    asetTetapList.unshift(aset);
    // Nilai aset tetap dihitung real-time dari asetTetapList di dashboard (nilai buku bersih).
    // Jurnal perolehan (Dr.Aset/Kr.Kas) tidak dibuat otomatis karena dashboard sudah
    // menghitung aset tetap langsung dari asetTetapList. Jika jurnal Kr.Kas ikut dibuat,
    // total aset lancar berkurang tapi aset tetap tidak bertambah di CoA (sudah dari list) = 0 atau minus.
    // User bisa input jurnal perolehan manual via Jurnal Umum jika dibutuhkan untuk laporan lengkap.
    saveToStorage(false);
  }
  saveFiturBaru();closeModal('modal-aset-tetap');renderAsetTetap();renderAsetTetapKPI();if(typeof renderDashboard==='function')renderDashboard();
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Aset "<b>${nama}</b>" berhasil disimpan!`);
}
// ── Auto Penyusutan ───────────────────────────────────────────────────────
const AT_AUTO_KEY='oas_at_auto', AT_LAST_RUN_KEY='oas_at_last_run';
function atGetAutoEnabled(){return localStorage.getItem(AT_AUTO_KEY)!=='off';}
function atToggleAuto(on){localStorage.setItem(AT_AUTO_KEY,on?'on':'off');atUpdateAutoUI();if(on)atCheckAndRunAutoPenyusutan(true);}
function atUpdateAutoUI(){
  const on=atGetAutoEnabled(),tog=document.getElementById('at-auto-toggle'),warn=document.getElementById('at-warn-banner'),sub=document.getElementById('at-auto-sub');
  const lastRun=localStorage.getItem(AT_LAST_RUN_KEY);
  if(tog)tog.checked=on;
  if(warn)warn.style.display=on?'none':'';
  if(sub)sub.textContent=on?(lastRun?`Terakhir: ${new Date(lastRun).toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}`:'Belum pernah dijalankan — berjalan otomatis tiap bulan'):'Nonaktif — jurnal tidak dibuat otomatis';
}
function atCheckAndRunAutoPenyusutan(force=false){
  if(!atGetAutoEnabled()&&!force)return;
  const aktif=asetTetapList.filter(a=>a.status==='aktif');if(!aktif.length)return;
  const now=new Date(),thisMonth=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const lastRun=localStorage.getItem(AT_LAST_RUN_KEY)||'';
  if(!force&&lastRun.substring(0,7)===thisMonth)return;
  const tgl=now.toISOString().split('T')[0];let total=0;const lines=[];
  aktif.forEach(aset=>{
    const harga=aset.hargaPerolehan,residu=aset.nilaiResidu||0,umurBln=aset.umurEkonomis*12;
    let penyBulan=aset.metode==='garis-lurus'?(harga-residu)/umurBln:(harga*(2/aset.umurEkonomis))/12;
    penyBulan=Math.round(Math.max(0,penyBulan));if(!penyBulan)return;
    const{nilaiBuku}=hitungPenyusutanAset(aset);if(nilaiBuku<=(aset.nilaiResidu||0))return;
    total+=penyBulan;
    const akunBeban=akuns.find(a=>a.tipe==='Beban'&&a.nama.toLowerCase().includes('penyusutan'));
    const akunAkum=akuns.find(a=>a.tipe==='Aset'&&a.kat==='Kontra'&&a.nama.toLowerCase().includes('penyusutan'));
    if(akunBeban&&akunAkum){lines.push({akun:akunBeban.kode,ket:`Penyusutan ${aset.nama}`,debit:penyBulan,kredit:0});lines.push({akun:akunAkum.kode,ket:`Akum. Penyusutan ${aset.nama}`,debit:0,kredit:penyBulan});}
  });
  if(!lines.length){if(force)showAlert('Tidak ada akun penyusutan di CoA atau semua aset sudah habis disusutkan.');return;}
  jurnalEntries.push({id:'JRN_PENY_'+Date.now(),tanggal:tgl,jenis:'Manual',keterangan:`Penyusutan Otomatis ${now.toLocaleDateString('id-ID',{month:'long',year:'numeric'})} — ${aktif.length} aset`,lines});
  saveToStorage(false);localStorage.setItem(AT_LAST_RUN_KEY,now.toISOString());atUpdateAutoUI();
  if(force){showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Jurnal penyusutan <b>${rp(total)}</b> dibuat untuk <b>${aktif.length} aset</b>!`);renderAsetTetap();renderAsetTetapKPI();if(typeof renderDashboard==='function')renderDashboard();}
}
function buatJurnalPenyusutanBulanan(){if(!asetTetapList.filter(a=>a.status==='aktif').length){showAlert('Tidak ada aset aktif.');return;}atCheckAndRunAutoPenyusutan(true);}
function disposalAset(id){const aset=asetTetapList.find(a=>a.id===id);if(!aset)return;if(!confirm(`Disposal aset "${aset.nama}"?`))return;aset.status='disposal';aset.tglDisposal=new Date().toISOString().split('T')[0];saveFiturBaru();renderAsetTetap();renderAsetTetapKPI();if(typeof renderDashboard==='function')renderDashboard();showAlert(`Aset "${aset.nama}" ditandai disposal.`);}
function hapusAset(id){
  const aset=asetTetapList.find(a=>a.id===id);if(!aset)return;
  showCustomConfirmGeneral({
    icon:'<i class="ti ti-trash" style="font-size:18px;color:var(--red);"></i>',
    iconColor:'rgba(239,68,68,0.15)',
    iconBorder:'rgba(239,68,68,0.3)',
    title:'Hapus Aset Permanen?',
    subtitle:`Aset <b>${aset.nama}</b> akan dihapus beserta seluruh data fotonya.`,
    rows:[
      {label:'Nama Aset', value:aset.nama, color:'var(--text)'},
      {label:'Harga Perolehan', value:rp(aset.hargaPerolehan), color:'var(--accent3)'},
      {label:'Kategori', value:aset.kategori, color:'var(--muted)'},
    ],
    warning:'<i class="ti ti-alert-triangle" style="vertical-align:-2px;margin-right:4px;"></i> Tindakan ini tidak dapat dibatalkan.',
    btnLabel:'🗑️ Ya, Hapus Permanen',
    btnGradient:'linear-gradient(135deg,#ef4444,#dc2626)',
  }).then(ok => {
    if(!ok) return;
    const fotoAll=atGetFotoAll();delete fotoAll[id];atSaveFotoAll(fotoAll);
    asetTetapList=asetTetapList.filter(a=>a.id!==id);
    saveFiturBaru();renderAsetTetap();renderAsetTetapKPI();
    if(typeof renderDashboard==='function')renderDashboard();
    showAlert('Aset dihapus.');
  });
}
function atInitOnLoad(){atUpdateAutoUI();atCheckAndRunAutoPenyusutan(false);}

// ── View toggle ───────────────────────────────────────────────────────────
let _atView='grid';
function atSetView(v){
  _atView=v;
  document.getElementById('at-grid-view').style.display=v==='grid'?'':'none';
  document.getElementById('at-table-view').style.display=v==='table'?'':'none';
  document.getElementById('at-view-btn-grid').classList.toggle('active',v==='grid');
  document.getElementById('at-view-btn-table').classList.toggle('active',v==='table');
  renderAsetTetap();
}

// ── KPI ───────────────────────────────────────────────────────────────────
function renderAsetTetapKPI(){
  const el=document.getElementById('at-kpi');if(!el)return;
  const aktif=asetTetapList.filter(a=>a.status==='aktif');
  const totalPerolehan=aktif.reduce((s,a)=>s+a.hargaPerolehan,0);
  const totalAkum=aktif.reduce((s,a)=>s+hitungPenyusutanAset(a).akumPenyusutan,0);
  const totalNilaiBuku=aktif.reduce((s,a)=>s+hitungPenyusutanAset(a).nilaiBuku,0);
  const pctSusut=totalPerolehan?Math.round((totalAkum/totalPerolehan)*100):0;
  const kpis=[
    {label:'Jumlah Aset Aktif',val:aktif.length+' aset',icon:'building-factory',clr:'var(--accent2)'},
    {label:'Total Harga Perolehan',val:rp(totalPerolehan),icon:'cash',clr:'var(--accent)'},
    {label:'Akum. Penyusutan',val:rp(totalAkum)+` (${pctSusut}%)`,icon:'trending-down',clr:'var(--red)'},
    {label:'Total Nilai Buku',val:rp(totalNilaiBuku),icon:'file-text',clr:'var(--accent3)'},
  ];
  el.innerHTML=kpis.map(k=>`<div style="flex:1;min-width:140px;background:var(--surface);border:0.5px solid var(--border);border-radius:12px;padding:12px 14px;"><div style="font-size:11px;color:var(--muted);display:flex;align-items:center;gap:5px;"><i class="ti ti-${k.icon}"></i> ${escapeHtml(k.label)}</div><div style="font-size:15px;font-weight:600;color:${k.clr};margin-top:4px;">${k.val}</div></div>`).join('');
}

// ── Foto system ───────────────────────────────────────────────────────────
const AT_FOTO_KEY='oas_at_foto';
function atGetFotoAll(){try{return JSON.parse(localStorage.getItem(AT_FOTO_KEY)||'{}');}catch{return{};}}
function atSaveFotoAll(d){localStorage.setItem(AT_FOTO_KEY,JSON.stringify(d));}
function atGetFoto(id){return atGetFotoAll()[id]||[];}

function openFotoAset(asetId){
  const aset=asetTetapList.find(a=>a.id===asetId);if(!aset)return;
  document.getElementById('at-foto-aset-id').value=asetId;
  document.getElementById('at-foto-title').textContent=`Foto — ${aset.nama}`;
  renderFotoGrid(asetId);openModal('modal-aset-foto');
}
function renderFotoGrid(asetId){
  const fotos=atGetFoto(asetId),grid=document.getElementById('at-foto-grid'),empty=document.getElementById('at-foto-empty');
  if(!grid)return;
  if(empty)empty.style.display=fotos.length?'none':'block';
  grid.innerHTML=fotos.map((f,i)=>`
    <div class="at-foto-item" onclick="atViewFoto('${asetId}',${i})">
      <img src="${escapeHtml(f.data)}" alt="${escapeHtml(f.name)}" loading="lazy">
      <button class="at-foto-item-del" onclick="event.stopPropagation();atDelFoto('${asetId}',${i})"><i class="ti ti-x" style="font-size:11px;"></i></button>
    </div>`).join('')
  +`<div class="at-foto-add" onclick="document.getElementById('at-foto-input').click()"><i class="ti ti-camera-plus"></i><span>${fotos.length?'Tambah':'Tambah Foto'}</span></div>`;
}
function handleAtFotoUpload(input){
  const asetId=document.getElementById('at-foto-aset-id').value;
  if(!asetId||!input.files.length)return;
  const file=input.files[0];
  if(file.size>5*1024*1024){showAlert('❌ File terlalu besar (maks 5MB)');return;}
  const reader=new FileReader();
  reader.onload=(e)=>{
    const all=atGetFotoAll();if(!all[asetId])all[asetId]=[];
    all[asetId].push({name:file.name,data:e.target.result,date:new Date().toLocaleDateString('id-ID')});
    atSaveFotoAll(all);renderFotoGrid(asetId);renderAsetTetap();
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Foto berhasil ditambahkan!');
  };
  reader.readAsDataURL(file);input.value='';
}
function atDelFoto(asetId,idx){
  if(!confirm('Hapus foto ini?'))return;
  const all=atGetFotoAll();if(all[asetId]){all[asetId].splice(idx,1);atSaveFotoAll(all);renderFotoGrid(asetId);renderAsetTetap();}
}
function atViewFoto(asetId,idx){
  const f=atGetFoto(asetId)[idx];if(!f)return;
  const lb=document.getElementById('attach-lightbox');
  if(lb){lb.innerHTML=`<div style="position:fixed;inset:0;background:rgba(0,0,0,0.95);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;" onclick="this.remove()"><img src="${escapeHtml(f.data)}" style="max-width:92vw;max-height:85vh;object-fit:contain;border-radius:8px;"><div style="color:rgba(255,255,255,0.6);font-size:12px;">${escapeHtml(f.name)} · Klik untuk tutup</div></div>`;lb.style.display='';}
}

// ── Card icons ────────────────────────────────────────────────────────────
const AT_CATEGORY_ICON={Kendaraan:'ti-car',Bangunan:'ti-building',Peralatan:'ti-tools',Mesin:'ti-engine',Komputer:'ti-device-laptop',Inventaris:'ti-armchair',Tanah:'ti-map-pin',Lainnya:'ti-package'};

// ── Main render ───────────────────────────────────────────────────────────
function renderAsetTetap(){
  const search=(document.getElementById('at-search')?.value||'').toLowerCase();
  const filter=document.getElementById('at-filter-status')?.value||'all';
  const list=asetTetapList.filter(a=>(filter==='all'||a.status===filter)&&(!search||a.nama.toLowerCase().includes(search)));
  atUpdateAutoUI();

  if(_atView==='grid'){
    const grid=document.getElementById('at-card-grid');if(!grid)return;
    if(!list.length){grid.innerHTML=`<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);"><i class="ti ti-building-factory" style="font-size:36px;display:block;margin-bottom:12px;opacity:0.3;"></i>Belum ada aset. Klik <b>Tambah Aset</b> untuk mulai.</div>`;return;}
    grid.innerHTML=list.map(a=>atRenderCard(a)).join('');
    return;
  }

  const tbody=document.getElementById('at-tbody');if(!tbody)return;
  if(!list.length){tbody.innerHTML=`<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:32px;">Belum ada aset</td></tr>`;return;}
  tbody.innerHTML=list.map(a=>{
    const{akumPenyusutan,nilaiBuku}=hitungPenyusutanAset(a);
    const fotoCount=atGetFoto(a.id).length;
    const badge=a.status==='aktif'?`<span style="background:var(--accent)22;color:var(--accent);padding:2px 8px;border-radius:6px;font-size:11px;">Aktif</span>`:`<span style="background:var(--red)22;color:var(--red);padding:2px 8px;border-radius:6px;font-size:11px;">Disposal</span>`;
    return `<tr><td style="font-weight:500">${a.nama}</td><td><span style="background:var(--accent2)22;color:var(--accent2);padding:2px 8px;border-radius:6px;font-size:11px;">${a.kategori}</span></td><td style="font-size:12px;color:var(--muted)">${a.tglPerolehan}</td><td style="text-align:right;font-family:var(--mono)">${rp(a.hargaPerolehan)}</td><td style="text-align:right;font-family:var(--mono);color:var(--red)">${rp(akumPenyusutan)}</td><td style="text-align:right;font-family:var(--mono);font-weight:600;color:${nilaiBuku>0?'var(--accent)':'var(--muted)'}">${rp(nilaiBuku)}</td><td style="font-size:11px;color:var(--muted)">${a.metode==='garis-lurus'?'Garis Lurus':'Saldo Menurun'}</td><td>${badge}</td><td style="display:flex;gap:4px;"><button class="btn btn-ghost btn-sm" onclick="openFotoAset('${a.id}')" style="${fotoCount?'color:var(--accent2);':''}"><i class="ti ti-camera" style="font-size:12px;"></i>${fotoCount?`<span style="font-size:10px;">${fotoCount}</span>`:''}</button><button class="btn btn-ghost btn-sm" onclick="openModalAsetTetap('${a.id}')"><i class="ti ti-pencil"></i></button>${a.status==='aktif'?`<button class="btn btn-ghost btn-sm" onclick="disposalAset('${a.id}')"><i class="ti ti-upload"></i></button>`:''}<button class="btn btn-danger btn-sm" onclick="hapusAset('${a.id}')"><i class="ti ti-trash"></i></button></td></tr>`;
  }).join('');
}

function atRenderCard(a){
  const{akumPenyusutan,nilaiBuku}=hitungPenyusutanAset(a);
  const pct=a.hargaPerolehan?Math.max(0,Math.min(100,Math.round((nilaiBuku/a.hargaPerolehan)*100))):0;
  const fotos=atGetFoto(a.id),icon=AT_CATEGORY_ICON[a.kategori]||'ti-package';
  const isLow=pct<25,isDisp=a.status==='disposal';
  const photoPart=fotos.length?`<img src="${fotos[0].data}" alt="${a.nama}" style="width:100%;height:100%;object-fit:cover;">`:`<i class="ti ${icon}" style="font-size:48px;opacity:0.3;color:var(--accent2);"></i>`;
  const statusBadge=isDisp?`<span style="position:absolute;top:8px;right:8px;background:rgba(239,68,68,0.8);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;">Disposal</span>`:pct<20?`<span style="position:absolute;top:8px;right:8px;background:rgba(239,68,68,0.8);color:#fff;font-size:10px;font-weight:700;padding:2px 8px;border-radius:6px;">Hampir Habis</span>`:'';
  return `<div style="background:var(--surface);border:1px solid var(--border);border-radius:14px;overflow:hidden;display:flex;flex-direction:column;transition:all 0.15s;${isDisp?'opacity:0.55;':''}" onmouseover="this.style.borderColor='var(--accent2)'" onmouseout="this.style.borderColor='var(--border)'">
    <div style="width:100%;height:140px;background:var(--surface2);display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;flex-shrink:0;">
      ${photoPart}${statusBadge}
      <button onclick="openFotoAset('${a.id}')" style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.55);border:1px solid rgba(255,255,255,0.15);color:#fff;border-radius:8px;padding:4px 9px;font-size:11px;cursor:pointer;display:flex;align-items:center;gap:4px;">
        <i class="ti ti-camera" style="font-size:11px;"></i>${fotos.length?fotos.length+' Foto':'+ Foto'}
      </button>
    </div>
    <div style="padding:12px 14px;flex:1;display:flex;flex-direction:column;gap:8px;">
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--text);">${a.nama}</div>
        <span style="font-size:10px;font-weight:600;padding:2px 8px;border-radius:5px;background:rgba(34,211,238,0.1);color:var(--accent2);">${a.kategori}</span>
      </div>
      <div>
        <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:3px;"><span>Nilai Buku tersisa</span><span style="font-weight:700;color:${isLow?'var(--red)':'var(--accent)'};">${pct}%</span></div>
        <div style="height:5px;background:rgba(255,255,255,0.08);border-radius:3px;overflow:hidden;"><div style="height:100%;width:${pct}%;border-radius:3px;background:${isLow?'linear-gradient(to right,#ef4444,#f97316)':'linear-gradient(to right,var(--accent),var(--accent2))'}; transition:width 0.4s;"></div></div>
      </div>
      <div style="display:flex;gap:8px;">
        <div style="flex:1;background:var(--surface2);border-radius:8px;padding:6px 10px;text-align:center;">
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;">Nilai Buku</div>
          <div style="font-size:12px;font-weight:700;color:${isLow?'var(--red)':'var(--accent)'};font-family:var(--mono);margin-top:1px;">${rp(nilaiBuku)}</div>
        </div>
        <div style="flex:1;background:var(--surface2);border-radius:8px;padding:6px 10px;text-align:center;">
          <div style="font-size:9px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;">Disusutkan</div>
          <div style="font-size:12px;font-weight:700;color:var(--red);font-family:var(--mono);margin-top:1px;">${rp(akumPenyusutan)}</div>
        </div>
      </div>
      <div style="font-size:10px;color:var(--muted);display:flex;gap:10px;flex-wrap:wrap;">
        <span><i class="ti ti-calendar" style="font-size:10px;vertical-align:-1px;"></i> ${a.tglPerolehan}</span>
        <span><i class="ti ti-chart-line" style="font-size:10px;vertical-align:-1px;"></i> ${a.metode==='garis-lurus'?'Garis Lurus':'Saldo Menurun'}</span>
        <span><i class="ti ti-clock" style="font-size:10px;vertical-align:-1px;"></i> ${a.umurEkonomis} thn</span>
      </div>
    </div>
    <div style="display:flex;border-top:1px solid var(--border);flex-shrink:0;">
      <button onclick="openFotoAset('${a.id}')" style="flex:1;background:none;border:none;border-right:1px solid var(--border);color:var(--muted);padding:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;gap:4px;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='none'">
        <i class="ti ti-camera" style="font-size:12px;"></i>${fotos.length?`<span style="font-size:10px;font-weight:700;color:var(--accent2);">${fotos.length}</span>`:'Foto'}
      </button>
      <button onclick="openModalAsetTetap('${a.id}')" style="flex:1;background:none;border:none;border-right:1px solid var(--border);color:var(--muted);padding:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;gap:4px;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='none'">
        <i class="ti ti-pencil" style="font-size:12px;"></i> Edit
      </button>
      ${a.status==='aktif'?`<button onclick="disposalAset('${a.id}')" style="flex:1;background:none;border:none;border-right:1px solid var(--border);color:var(--muted);padding:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='rgba(255,255,255,0.04)'" onmouseout="this.style.background='none'"><i class="ti ti-arrow-up" style="font-size:12px;"></i></button>`:''}
      <button onclick="hapusAset('${a.id}')" style="flex:1;background:none;border:none;color:var(--muted);padding:8px;cursor:pointer;font-size:12px;display:flex;align-items:center;justify-content:center;" onmouseover="this.style.background='rgba(239,68,68,0.08)';this.style.color='var(--red)'" onmouseout="this.style.background='none';this.style.color='var(--muted)'">
        <i class="ti ti-trash" style="font-size:12px;"></i>
      </button>
    </div>
  </div>`;
}


// ══════════════════════════════════════════════════════════════
// MASTER KONTAK
// ══════════════════════════════════════════════════════════════
let _kontakFilter='semua';
function filterKontak(tipe){_kontakFilter=tipe;document.querySelectorAll('.kontak-tab').forEach(b=>b.classList.remove('oas-active-tab'));document.getElementById('kontak-tab-'+tipe)?.classList.add('oas-active-tab');renderKontak();}
