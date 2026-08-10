
// PERIOD FILTER HELPERS
function getPeriodRange() {
  const filter = document.getElementById('dash-filter-period')?.value || 'all';
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth();

  if(filter === 'all') return { from: null, to: null, label: 'Semua Periode' };
  if(filter === 'this-month') {
    const from = new Date(y, m, 1), to = new Date(y, m+1, 0);
    return { from, to, label: `${from.toLocaleDateString('id-ID',{month:'long',year:'numeric'})}` };
  }
  if(filter === 'last-month') {
    const from = new Date(y, m-1, 1), to = new Date(y, m, 0);
    return { from, to, label: `Bulan Lalu — ${from.toLocaleDateString('id-ID',{month:'long',year:'numeric'})}` };
  }
  if(filter === 'this-quarter') {
    const q = Math.floor(m/3);
    const from = new Date(y, q*3, 1), to = new Date(y, q*3+3, 0);
    return { from, to, label: `Q${q+1} ${y}` };
  }
  if(filter === 'this-year') {
    return { from: new Date(y,0,1), to: new Date(y,11,31), label: `Tahun ${y}` };
  }
  if(filter === 'custom') {
    document.getElementById('dash-custom-range').classList.add('show');
    const fromVal = document.getElementById('dash-from')?.value;
    const toVal = document.getElementById('dash-to')?.value;
    if(fromVal && toVal) return { from: new Date(fromVal), to: new Date(toVal), label: `${fromVal} s/d ${toVal}` };
    return { from: null, to: null, label: 'Pilih rentang' };
  }
  return { from: null, to: null, label: '' };
}

function filterJurnalByPeriod(from, to) {
  if(!from && !to) return jurnalEntries;
  return jurnalEntries.filter(j => {
    const d = new Date(j.tanggal);
    if(from && d < from) return false;
    if(to && d > to) return false;
    return true;
  });
}


// ═══════════════════════════════════════
// ANALITIK — ENGINE LENGKAP
// ═══════════════════════════════════════
// ── Analitik Period POPUP (tengah layar) ──
function openAnPeriodPopup() {
  document.getElementById('an-period-popup-overlay').classList.add('open');
}
function closeAnPeriodPopup(e) {
  if(e.target === document.getElementById('an-period-popup-overlay')) closeAnPeriodPopupDirect();
}
function closeAnPeriodPopupDirect() {
  document.getElementById('an-period-popup-overlay').classList.remove('open');
}
function setAnPeriodPopup(el) {
  const val = el.dataset.val;
  const label = el.dataset.label;
  document.getElementById('analitik-period').value = val;
  document.getElementById('an-period-label').textContent = label;
  // Update active state
  document.querySelectorAll('.an-period-popup-item').forEach(item => item.classList.remove('active'));
  el.classList.add('active');
  closeAnPeriodPopupDirect();
  triggerAnalitikRefresh(null);
}

// ── Refresh button with spin animation ──
function triggerAnalitikRefresh(btn) {
  const icon = document.getElementById('an-refresh-icon');
  if(icon) {
    icon.style.animation = 'none';
    icon.offsetHeight; // reflow
    icon.style.animation = 'spinOnce 0.6s ease-out';
  }
  renderAnalitik();
}

// ── GLOBAL OPERATION SPINNER + NOTIFIKASI SUKSES (morph spinner → checklist) ──
let _opSpinnerDepth = 0;
let _opSpinnerTimer = null;
let _successLock = false;   // true selama checklist sukses sedang tampil — hideOpSpinner() tidak boleh menutup paksa
let _successTimer = null;

function showOpSpinner(label, sub) {
  if (_successLock) return; // sedang menampilkan checklist sukses, jangan dibuka ulang jadi spinner
  _opSpinnerDepth++;
  if (_opSpinnerTimer) { clearTimeout(_opSpinnerTimer); _opSpinnerTimer = null; }
  const overlay = document.getElementById('op-spinner-overlay');
  const card = document.getElementById('op-spinner-card');
  const labelEl = document.getElementById('op-spinner-label');
  const subEl = document.getElementById('op-spinner-sub');
  if(card) card.classList.remove('success');
  if(labelEl) labelEl.textContent = label || 'Memproses...';
  if(subEl) subEl.textContent = sub || '';
  if(overlay) overlay.classList.add('active');
}
function hideOpSpinner() {
  if (_successLock) return; // biarkan showAlert() yang mengatur penutupan
  _opSpinnerDepth = Math.max(0, _opSpinnerDepth - 1);
  if(_opSpinnerDepth > 0) return;
  const overlay = document.getElementById('op-spinner-overlay');
  if(overlay) {
    const card = document.getElementById('op-spinner-card');
    if(card) card.style.animation = 'opSpinnerIn 0.15s ease reverse both';
    _opSpinnerTimer = setTimeout(() => {
      if(overlay) overlay.classList.remove('active');
      if(card) { card.style.animation = ''; card.classList.remove('success'); }
      _opSpinnerTimer = null;
    }, 150);
  }
}

function renderAnalitik() {
  const periodSel = document.getElementById('analitik-period')?.value || '12';
  const now = new Date();
  let nBulan = parseInt(periodSel) || 12;

  // Bangun array bulan
  let months = [];
  if(periodSel === 'all') {
    // Ambil rentang dari jurnal terlama
    if(!jurnalEntries.length) { renderAnalitikEmpty(); return; }
    const tanggals = jurnalEntries.map(j=>j.tanggal).sort();
    const first = new Date(tanggals[0]);
    const last = new Date(tanggals[tanggals.length-1]);
    let cur = new Date(first.getFullYear(), first.getMonth(), 1);
    const end = new Date(last.getFullYear(), last.getMonth(), 1);
    while(cur <= end) {
      months.push({ year: cur.getFullYear(), month: cur.getMonth(), label: cur.toLocaleDateString('id-ID',{month:'short'}) + '\n' + cur.getFullYear() });
      cur = new Date(cur.getFullYear(), cur.getMonth()+1, 1);
    }
  } else {
    for(let i=nBulan-1; i>=0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      months.push({ year: d.getFullYear(), month: d.getMonth(), label: d.toLocaleDateString('id-ID',{month:'short'}) + '\n' + d.getFullYear() });
    }
  }

  // Inisialisasi data per bulan
  months.forEach(m => {
    m.pendapatan = 0; m.hpp = 0; m.beban = 0; m.kasIn = 0; m.kasOut = 0;
    m.aset = 0; m.liabilitas = 0; m.ekuitas = 0;
  });

  // Hitung per bulan dari jurnal
  // Saldo akumulatif untuk aset/liabilitas/ekuitas
  const saldoMap = {}; // kode -> saldo berjalan sampai akhir bulan ini
  const allTgl = [...new Set(jurnalEntries.map(j=>j.tanggal))].sort();

  jurnalEntries.forEach(j => {
    const d = new Date(j.tanggal);
    const mi = months.findIndex(m => m.year===d.getFullYear() && m.month===d.getMonth());
    j.lines.forEach(l => {
      const a = akuns.find(x=>x.kode===l.akun);
      if(!a) return;
      const db = l.debit||0, kr = l.kredit||0;
      if(mi >= 0) {
        if(a.tipe==='Pendapatan') months[mi].pendapatan += kr;
        if(a.tipe==='HPP') months[mi].hpp += db;
        if(a.tipe==='Beban') months[mi].beban += db;
        if(l.akun==='1101') { months[mi].kasIn += db; months[mi].kasOut += kr; }
      }
    });
  });

  // Hitung saldo akun per bulan untuk posisi keuangan
  months.forEach((m,mi) => {
    const endDate = new Date(m.year, m.month+1, 0).toISOString().split('T')[0];
    let aset=0, liab=0, ekuitas=0;
    const snap = {};
    jurnalEntries.forEach(j => {
      if(j.tanggal > endDate) return;
      j.lines.forEach(l => {
        if(!snap[l.akun]) snap[l.akun] = 0;
        snap[l.akun] += (l.debit||0) - (l.kredit||0);
      });
    });
    Object.keys(snap).forEach(kode => {
      const a = akuns.find(x=>x.kode===kode);
      if(!a) return;
      const saldo = a.normal==='D' ? snap[kode] : -snap[kode];
      if(a.tipe==='Aset') aset += Math.max(0,saldo);
      if(a.tipe==='Liabilitas') liab += Math.max(0,saldo);
      if(a.tipe==='Ekuitas') ekuitas += Math.max(0,saldo);
    });
    m.aset = aset; m.liabilitas = liab; m.ekuitas = ekuitas;
    m.labaKotor = m.pendapatan - m.hpp;
    m.labaBersih = m.pendapatan - m.hpp - m.beban;
    m.aruKas = m.kasIn - m.kasOut;
    m.marginKotor = m.pendapatan ? (m.labaKotor/m.pendapatan*100) : 0;
    m.marginBersih = m.pendapatan ? (m.labaBersih/m.pendapatan*100) : 0;
  });

  const labels = months.map(m=>m.label);
  const isDark = !document.body.classList.contains('light-mode');
  const textClr = isDark ? 'rgba(226,232,240,0.7)' : 'rgba(15,23,42,0.6)';
  const gridClr = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';

  // ── KPI Cards ──
  const totPend = months.reduce((s,m)=>s+m.pendapatan,0);
  const totLaba = months.reduce((s,m)=>s+m.labaBersih,0);
  const totKas = months.reduce((s,m)=>s+m.aruKas,0);
  const lastM = months[months.length-1] || {};
  const kpiData = [
    { label:'Total Pendapatan', val: rp(totPend), icon:'<i class="ti ti-trending-up" style="font-size:14px;"></i>', clr:'var(--accent)' },
    { label:'Laba Bersih Periode', val: rp(totLaba), icon:'<i class="ti ti-trending-up" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', clr: totLaba>=0?'var(--accent)':'var(--red)' },
    { label:'Arus Kas Bersih', val: rp(totKas), icon:'<i class="ti ti-cash" style="font-size:14px;"></i>', clr: totKas>=0?'var(--accent)':'var(--red)' },
    { label:'Aset Akhir', val: rp(lastM.aset||0), icon:'<i class="ti ti-building-bank" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>', clr:'var(--accent2)' },
    { label:'Liabilitas Akhir', val: rp(lastM.liabilitas||0), icon:'<i class="ti ti-clipboard-list ti-inline"></i>', clr:'var(--accent3)' },
    { label:'Ekuitas Akhir', val: rp(lastM.ekuitas||0), icon:'<i class="ti ti-diamond" style="font-size:14px;"></i>', clr:'var(--accent2)' },
    { label:'Margin Bersih Rata²', val: (months.filter(m=>m.pendapatan).reduce((s,m)=>s+m.marginBersih,0)/(months.filter(m=>m.pendapatan).length||1)).toFixed(1)+'%', icon:'%', clr:'var(--accent3)' },
    { label:'Jumlah Jurnal', val: jurnalEntries.length, icon:'<i class="ti ti-notebook" style="font-size:14px;"></i>', clr:'var(--muted)' },
  ];
  document.getElementById('analitik-kpi').innerHTML = kpiData.map(k=>`
    <div class="stat-card" style="padding:14px 16px;">
      <div style="font-size:22px;margin-bottom:4px;">${k.icon}</div>
      <div class="stat-label">${escapeHtml(k.label)}</div>
      <div style="font-size:16px;font-weight:700;color:${k.clr};font-family:var(--mono);margin-top:4px;">${k.val}</div>
    </div>`).join('');

  // Helper: clear dan buat context canvas
  function getCtx(id) {
    const c = document.getElementById(id);
    if(!c) return null;
    const par = c.parentElement;
    const w = par.offsetWidth - 24 || 400;
    c.width = w; c.height = parseInt(c.getAttribute('height'))||200;
    const ctx = c.getContext('2d');
    ctx.clearRect(0,0,c.width,c.height);
    return { ctx, w: c.width, h: c.height, c };
  }

  // ── Chart 1: Pendapatan vs Beban (Bar grouped) ──
  anDrawGroupedBar('an-chart-pend-beban', labels,
    [{ label:'Pendapatan', data: months.map(m=>m.pendapatan), color:'rgba(74,222,128,' },
     { label:'HPP+Beban', data: months.map(m=>m.hpp+m.beban), color:'rgba(248,113,113,' }],
    textClr, gridClr);

  // ── Chart 2: Tren Laba Bersih (Line with fill) ──
  anDrawLine('an-chart-laba', labels, [{ data: months.map(m=>m.labaBersih), color:'#22d3ee', fill:true }], textClr, gridClr);

  // ── Chart 3: Arus Kas (Bar, negatif merah) ──
  anDrawBarSignedColor('an-chart-kas', labels, months.map(m=>m.aruKas), textClr, gridClr);

  // ── Chart 4: Donut Komposisi Beban per akun ──
  anDrawBebanDonut('an-chart-beban-donut', textClr);

  // ── Chart 5: Posisi Keuangan (Stacked area line) ──
  anDrawLine('an-chart-posisi', labels, [
    { data: months.map(m=>m.aset), color:'#4ade80', fill:false, label:'Aset' },
    { data: months.map(m=>m.liabilitas), color:'#f87171', fill:false, label:'Liabilitas' },
    { data: months.map(m=>m.ekuitas), color:'#22d3ee', fill:false, label:'Ekuitas' },
  ], textClr, gridClr);

  // ── Chart 6: Rasio Keuangan ──
  anDrawRasio(lastM, months);

  // ── Chart 7: Waterfall Laba Rugi ──
  anDrawWaterfall('an-chart-waterfall', lastM, textClr, gridClr);

  // ── Chart 8: Pertumbuhan MoM % ──
  const growthData = months.map((m,i) => {
    if(i===0 || !months[i-1].pendapatan) return 0;
    return ((m.pendapatan - months[i-1].pendapatan)/months[i-1].pendapatan*100);
  });
  anDrawBarSignedColor('an-chart-growth', labels, growthData, textClr, gridClr, true);

  // ── Chart 9: Heatmap Aktivitas ──
  anDrawHeatmap(months);

  // ── Chart 10: Top 8 Akun ──
  anDrawTopAkun('an-chart-top-akun', textClr, gridClr);

  // ── Chart 11: Margin % ──
  anDrawLine('an-chart-margin', labels, [
    { data: months.map(m=>m.marginKotor), color:'#4ade80', fill:false, label:'Margin Kotor' },
    { data: months.map(m=>m.marginBersih), color:'#22d3ee', fill:false, label:'Margin Bersih' },
  ], textClr, gridClr);

  // ── Chart 12: Proyeksi Linear Regression ──
  anDrawProyeksi('an-chart-proyeksi', months, labels, textClr, gridClr);

  // ── Chart 13: Kas Kumulatif ──
  let kasKum = 0;
  const kasKumData = months.map(m => { kasKum += m.aruKas; return kasKum; });
  anDrawLine('an-chart-kas-kumulatif', labels, [{ data: kasKumData, color:'#f59e0b', fill:true }], textClr, gridClr);

  // ── Period Compare ──
  anDrawPeriodCompare(months);

  // ── Tabel Ringkasan ──
  const tbody = document.getElementById('an-tabel-bulan');
  if(tbody) {
    tbody.innerHTML = months.map(m=>`<tr>
      <td style="font-weight:600">${escapeHtml(m.label)}</td>
      <td class="debit">${rp(m.pendapatan)}</td>
      <td class="num">${rp(m.hpp)}</td>
      <td style="color:${m.labaKotor>=0?'var(--accent)':'var(--red)'}">${rp(m.labaKotor)}</td>
      <td class="kredit">${rp(m.beban)}</td>
      <td style="color:${m.labaBersih>=0?'var(--accent)':'var(--red)'};">${rp(m.labaBersih)}</td>
      <td class="debit">${rp(m.kasIn)}</td>
      <td class="kredit">${rp(m.kasOut)}</td>
      <td style="color:${m.aruKas>=0?'var(--accent)':'var(--red)'}">${rp(m.aruKas)}</td>
      <td style="color:${m.marginBersih>=0?'var(--accent)':'var(--red)'}">${m.marginBersih.toFixed(1)}%</td>
    </tr>`).join('');
  }
}

function renderAnalitikEmpty() {
  document.getElementById('analitik-kpi').innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--muted);">Belum ada data jurnal. Input transaksi terlebih dahulu.</div>`;
}

// ── DRAWING HELPERS ──────────────────────────────

function anDrawGroupedBar(id, labels, datasets, textClr, gridClr) {
  const el = document.getElementById(id); if(!el) return;
  const par = el.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const W = par.offsetWidth - 24 || 400; const H = parseInt(el.getAttribute('height'))||180;
  el.width = W * dpr; el.height = H * dpr;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  const ctx = el.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,W,H);
  const pad = {l:52,r:12,t:16,b:46};
  const cW = W-pad.l-pad.r; const cH = H-pad.t-pad.b;
  const n = labels.length;
  const ds = datasets.length;
  const gW = cW/n; const bW = Math.min(gW*0.35, 28);
  const allVals = datasets.flatMap(d=>d.data);
  const maxV = Math.max(...allVals,1);

  // Grid
  for(let g=0;g<=4;g++) {
    const y = pad.t + (g/4)*cH;
    ctx.strokeStyle = gridClr; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
    ctx.fillStyle = textClr; ctx.font='10px sans-serif'; ctx.textAlign='right';
    ctx.fillText(anFmtShort(maxV*(4-g)/4), pad.l-4, y+3);
  }

  datasets.forEach((ds_,di) => {
    ds_.data.forEach((v,i) => {
      const x = pad.l + i*gW + gW*0.15 + di*(bW+2);
      const bH = (v/maxV)*cH;
      const grad = ctx.createLinearGradient(0,pad.t+cH-bH,0,pad.t+cH);
      grad.addColorStop(0, ds_.color+'0.85)'); grad.addColorStop(1, ds_.color+'0.2)');
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(x, pad.t+cH-bH, bW, Math.max(bH,2), [3,3,0,0]); ctx.fill();
    });
  });

  // X labels (2 baris: bulan + tahun)
  ctx.textAlign='center';
  labels.forEach((l,i) => {
    const x = pad.l + i*gW + gW/2;
    anFillLabel2(ctx, l, x, H-24, textClr);
  });
}

function anDrawLine(id, labels, datasets, textClr, gridClr) {
  const el = document.getElementById(id); if(!el) return;
  const par = el.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const W = par.offsetWidth - 24 || 400; const H = parseInt(el.getAttribute('height'))||180;
  el.width = W * dpr; el.height = H * dpr;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  const ctx = el.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,W,H);
  const pad = {l:52,r:12,t:16,b:46};
  const cW = W-pad.l-pad.r; const cH = H-pad.t-pad.b;
  const n = labels.length;
  const allVals = datasets.flatMap(d=>d.data);
  const maxV = Math.max(...allVals,1);
  const minV = Math.min(...allVals,0);
  const range = maxV-minV || 1;

  for(let g=0;g<=4;g++) {
    const y = pad.t + (g/4)*cH;
    ctx.strokeStyle = gridClr; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
    ctx.fillStyle = textClr; ctx.font='10px sans-serif'; ctx.textAlign='right';
    ctx.fillText(anFmtShort(maxV - (maxV-minV)*(g/4)), pad.l-4, y+3);
  }

  const toY = v => pad.t + cH - ((v-minV)/range)*cH;
  const toX = i => n<=1 ? pad.l+cW/2 : pad.l + (i/(n-1))*cW;

  datasets.forEach(ds => {
    const pts = ds.data.map((v,i)=>({x:toX(i),y:toY(v)}));
    if(ds.fill && pts.length) {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pad.t+cH);
      pts.forEach(p=>ctx.lineTo(p.x,p.y));
      ctx.lineTo(pts[pts.length-1].x, pad.t+cH);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0,pad.t,0,pad.t+cH);
      grad.addColorStop(0, ds.color.replace('#','').length===6 ? hexToRgba(ds.color,0.25) : ds.color+'40');
      grad.addColorStop(1, ds.color.replace('#','').length===6 ? hexToRgba(ds.color,0.02) : ds.color+'05');
      ctx.fillStyle = grad; ctx.fill();
    }
    if(pts.length) {
      ctx.beginPath(); ctx.moveTo(pts[0].x,pts[0].y);
      pts.forEach(p=>ctx.lineTo(p.x,p.y));
      ctx.strokeStyle = ds.color; ctx.lineWidth=2.5; ctx.lineJoin='round'; ctx.stroke();
      // Dots
      pts.forEach(p=>{
        ctx.beginPath(); ctx.arc(p.x,p.y,3,0,Math.PI*2);
        ctx.fillStyle=ds.color; ctx.fill();
      });
    }
  });

  ctx.textAlign='center';
  labels.forEach((l,i)=>anFillLabel2(ctx, l, toX(i), H-24, textClr));
}

function anDrawBarSignedColor(id, labels, data, textClr, gridClr, isPercent=false) {
  const el = document.getElementById(id); if(!el) return;
  const par = el.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const W = par.offsetWidth - 24 || 400; const H = parseInt(el.getAttribute('height'))||180;
  el.width = W * dpr; el.height = H * dpr;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  const ctx = el.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,W,H);
  const pad = {l:52,r:12,t:16,b:46};
  const cW = W-pad.l-pad.r; const cH = H-pad.t-pad.b;
  const n = labels.length;
  const maxV = Math.max(...data.map(Math.abs),1);
  const bW = Math.min(cW/n*0.55, 36);
  const zeroY = pad.t + cH/2;

  ctx.strokeStyle = gridClr; ctx.lineWidth=1;
  for(let g=0;g<=4;g++) {
    const y = pad.t+(g/4)*cH;
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(W-pad.r,y); ctx.stroke();
    const v = maxV*(2-g*1)/2;
    ctx.fillStyle = textClr; ctx.font='10px sans-serif'; ctx.textAlign='right';
    if(g===2) { ctx.fillText('0', pad.l-4, y+3); }
    else ctx.fillText((isPercent?'':'')+(anFmtShort(v*(g<2?1:-1)))+(isPercent?'%':''), pad.l-4, y+3);
  }
  // Zero line
  ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.moveTo(pad.l,zeroY); ctx.lineTo(W-pad.r,zeroY); ctx.stroke();

  data.forEach((v,i) => {
    const x = pad.l + i*(cW/n) + (cW/n - bW)/2;
    const bH = Math.abs(v)/maxV * (cH/2);
    const y = v>=0 ? zeroY-bH : zeroY;
    const clr = v>=0 ? '#4ade80' : '#f87171';
    const grad = ctx.createLinearGradient(0,y,0,y+bH);
    grad.addColorStop(0,clr+'CC'); grad.addColorStop(1,clr+'33');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.roundRect(x,y,bW,Math.max(bH,2),[3,3,0,0]); ctx.fill();
  });
  ctx.textAlign='center';
  labels.forEach((l,i)=>anFillLabel2(ctx, l, pad.l+(i+0.5)*(cW/n), H-24, textClr));
}

function anDrawBebanDonut(id, textClr) {
  const el = document.getElementById(id); if(!el) return;
  const par = el.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const W = par.offsetWidth - 24 || 300; const H = 200;
  el.width = W * dpr; el.height = H * dpr;
  el.style.width = W + 'px'; el.style.height = H + 'px';
  const ctx = el.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0,0,W,H);

  // Hitung beban per akun
  const bebanAkun = {};
  jurnalEntries.forEach(j=>j.lines.forEach(l=>{
    const a = akuns.find(x=>x.kode===l.akun);
    if(a && (a.tipe==='Beban'||a.tipe==='HPP') && l.debit>0) {
      bebanAkun[a.nama] = (bebanAkun[a.nama]||0) + l.debit;
    }
  }));
  const sorted = Object.entries(bebanAkun).sort((a,b)=>b[1]-a[1]).slice(0,7);
  if(!sorted.length) { ctx.fillStyle=textClr; ctx.font='13px sans-serif'; ctx.textAlign='center'; ctx.fillText('Belum ada beban', W/2, H/2); return; }
  const total = sorted.reduce((s,[,v])=>s+v,0);
  const colors = ['#4ade80','#22d3ee','#f59e0b','#f87171','#a78bfa','#fb923c','#34d399'];
  const cx=W/2-40, cy=H/2, r=Math.min(cx,cy)-20, rIn=r*0.55;
  let angle=-Math.PI/2;
  sorted.forEach(([name,val],i)=>{
    const sweep = (val/total)*Math.PI*2;
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,angle,angle+sweep); ctx.closePath();
    ctx.fillStyle=colors[i%colors.length]; ctx.fill();
    angle+=sweep;
  });
  ctx.beginPath(); ctx.arc(cx,cy,rIn,0,Math.PI*2); ctx.fillStyle='var(--surface)'; ctx.fill();
  ctx.fillStyle=textClr; ctx.font='bold 12px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText('Beban', cx, cy-7); ctx.fillText('Total', cx, cy+7);

  // Legend
  const lx = W/2 + 25; let ly = 20;
  sorted.forEach(([name,val],i)=>{
    ctx.fillStyle=colors[i%colors.length]; ctx.fillRect(lx,ly,10,10);
    ctx.fillStyle=textClr; ctx.font='10px sans-serif'; ctx.textAlign='left'; ctx.textBaseline='top';
    const pct = (val/total*100).toFixed(0)+'%';
    ctx.fillText(name.length>14?name.slice(0,12)+'…':name, lx+14, ly);
    ctx.fillStyle='rgba(100,116,139,0.8)'; ctx.fillText(pct, lx+14, ly+12);
    ly += 26;
  });
}

function anDrawRasio(lastM, months) {
  const el = document.getElementById('an-rasio-grid'); if(!el) return;
  const currentRatio = lastM.liabilitas ? (lastM.aset/lastM.liabilitas) : null;
  const debtToEquity = lastM.ekuitas ? (lastM.liabilitas/lastM.ekuitas) : null;
  const avgPend = months.filter(m=>m.pendapatan).reduce((s,m)=>s+m.pendapatan,0)/(months.filter(m=>m.pendapatan).length||1);
  const avgLaba = months.filter(m=>m.pendapatan).reduce((s,m)=>s+m.labaBersih,0)/(months.filter(m=>m.pendapatan).length||1);
  const npm = avgPend ? (avgLaba/avgPend*100) : 0;
  const gpm = avgPend ? (months.filter(m=>m.pendapatan).reduce((s,m)=>s+m.labaKotor,0)/(months.filter(m=>m.pendapatan).length||1)/avgPend*100) : 0;

  const rasios = [
    { label:'Current Ratio', val: currentRatio ? currentRatio.toFixed(2)+'x' : '-', note:'Aset ÷ Liabilitas', ok: currentRatio && currentRatio>=2, warn: currentRatio && currentRatio<1 },
    { label:'Debt to Equity', val: debtToEquity ? debtToEquity.toFixed(2)+'x' : '-', note:'Liabilitas ÷ Ekuitas', ok: debtToEquity && debtToEquity<0.5, warn: debtToEquity && debtToEquity>2 },
    { label:'Net Profit Margin', val: npm.toFixed(1)+'%', note:'Laba Bersih ÷ Pendapatan', ok: npm>10, warn: npm<0 },
    { label:'Gross Profit Margin', val: gpm.toFixed(1)+'%', note:'Laba Kotor ÷ Pendapatan', ok: gpm>30, warn: gpm<10 },
    { label:'Aset Lancar', val: rp(lastM.aset||0), note:'Total nilai aset', ok: true, warn: false },
    { label:'Total Ekuitas', val: rp(lastM.ekuitas||0), note:'Modal pemilik bersih', ok: lastM.ekuitas>0, warn: lastM.ekuitas<=0 },
  ];
  el.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">` +
    rasios.map(r=>`<div style="background:var(--surface2);border-radius:10px;padding:12px;border:1px solid var(--border);">
      <div style="font-size:11px;color:var(--muted);margin-bottom:2px;">${r.label}</div>
      <div style="font-size:18px;font-weight:700;color:${r.warn?'var(--red)':r.ok?'var(--accent)':'var(--accent3)'};font-family:var(--mono);">${r.val}</div>
      <div style="font-size:10px;color:var(--muted);margin-top:2px;">${r.note}</div>
    </div>`).join('') + `</div>`;
}

function anDrawWaterfall(id, m, textClr, gridClr) {
  const el = document.getElementById(id); if(!el) return;
  const par = el.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const W = par.offsetWidth-24||400; const H = 200;
  el.width=W*dpr; el.height=H*dpr;
  el.style.width=W+'px'; el.style.height=H+'px';
  const ctx = el.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);
  const items = [
    { label:'Pendapatan', val: m.pendapatan||0, type:'pos' },
    { label:'HPP', val: -(m.hpp||0), type:'neg' },
    { label:'Laba Kotor', val: m.labaKotor||0, type:'total' },
    { label:'Beban', val: -(m.beban||0), type:'neg' },
    { label:'Laba Bersih', val: m.labaBersih||0, type:'total' },
  ];
  const pad={l:12,r:12,t:20,b:36};
  const cW=W-pad.l-pad.r; const cH=H-pad.t-pad.b;
  const n=items.length; const bW=Math.min(cW/n*0.55,40);
  const allVals = items.map(x=>Math.abs(x.val));
  const maxV = Math.max(...allVals, 1);
  const baseY = pad.t + cH;
  let running = 0;

  items.forEach((item,i)=>{
    const x = pad.l + i*(cW/n) + (cW/n-bW)/2;
    let startY, bH;
    if(item.type==='total') {
      bH = Math.abs(item.val)/maxV*cH;
      startY = item.val>=0 ? baseY-bH : baseY;
      running = item.val;
    } else {
      const from = running;
      const to = running + item.val;
      bH = Math.abs(item.val)/maxV*cH;
      startY = item.val>=0 ? baseY-to/maxV*cH-bH : baseY-from/maxV*cH;
      running = to;
    }
    const clr = item.type==='total' ? '#22d3ee' : item.val>=0 ? '#4ade80' : '#f87171';
    const grad = ctx.createLinearGradient(0,startY,0,startY+bH);
    grad.addColorStop(0,clr+'CC'); grad.addColorStop(1,clr+'44');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.roundRect(x,startY,bW,Math.max(bH,3),[3,3,0,0]); ctx.fill();
    ctx.fillStyle=textClr; ctx.font='10px sans-serif'; ctx.textAlign='center';
    ctx.fillText(anFmtShort(Math.abs(item.val)), x+bW/2, startY-4);
    ctx.fillText(item.label, x+bW/2, H-8);
  });
}

function anDrawTopAkun(id, textClr, gridClr) {
  const el = document.getElementById(id); if(!el) return;
  const par = el.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const W = par.offsetWidth-24||400; const H = parseInt(el.getAttribute('height'))||220;
  el.width=W*dpr; el.height=H*dpr;
  el.style.width=W+'px'; el.style.height=H+'px';
  const ctx = el.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);

  const snap = {};
  jurnalEntries.forEach(j=>j.lines.forEach(l=>{
    if(!snap[l.akun]) snap[l.akun]=0;
    snap[l.akun] += (l.debit||0)-(l.kredit||0);
  }));
  const items = Object.entries(snap).map(([kode,raw])=>{
    const a = akuns.find(x=>x.kode===kode);
    if(!a) return null;
    const saldo = a.normal==='D' ? raw : -raw;
    return { nama: a.nama, saldo: Math.abs(saldo), tipe: a.tipe };
  }).filter(Boolean).sort((a,b)=>b.saldo-a.saldo).slice(0,8);
  if(!items.length) return;

  const pad={l:130,r:16,t:12,b:12}; const cW=W-pad.l-pad.r; const cH=H-pad.t-pad.b;
  const bH = cH/items.length*0.65;
  const maxV = items[0].saldo;
  const colors = { Aset:'#4ade80', Liabilitas:'#f87171', Ekuitas:'#22d3ee', Pendapatan:'#a78bfa', Beban:'#fb923c', HPP:'#f59e0b' };

  items.forEach((item,i)=>{
    const y = pad.t + i*(cH/items.length) + (cH/items.length-bH)/2;
    const bW = (item.saldo/maxV)*cW;
    const clr = colors[item.tipe] || '#64748b';
    const grad = ctx.createLinearGradient(pad.l,0,pad.l+bW,0);
    grad.addColorStop(0,clr+'CC'); grad.addColorStop(1,clr+'44');
    ctx.fillStyle=grad;
    ctx.beginPath(); ctx.roundRect(pad.l,y,Math.max(bW,3),bH,[0,3,3,0]); ctx.fill();
    ctx.fillStyle=textClr; ctx.font='11px sans-serif'; ctx.textAlign='right';
    const nama = item.nama.length>16?item.nama.slice(0,14)+'…':item.nama;
    ctx.fillText(nama, pad.l-6, y+bH/2+4);
    ctx.font='10px sans-serif'; ctx.fillStyle='rgba(100,116,139,0.8)'; ctx.textAlign='left';
    ctx.fillText(anFmtShort(item.saldo), pad.l+bW+4, y+bH/2+4);
  });
}

function anDrawProyeksi(id, months, labels, textClr, gridClr) {
  const el = document.getElementById(id); if(!el) return;
  const data = months.map(m=>m.pendapatan);
  const n = data.length;
  if(n<2) { return; }

  // Linear regression
  const xs = data.map((_,i)=>i);
  const mx = xs.reduce((s,x)=>s+x,0)/n;
  const my = data.reduce((s,y)=>s+y,0)/n;
  const slope = xs.reduce((s,x,i)=>s+(x-mx)*(data[i]-my),0) / (xs.reduce((s,x)=>s+(x-mx)**2,0)||1);
  const intercept = my - slope*mx;
  const proj = [0,1,2].map(k=>Math.max(0, intercept + slope*(n+k)));

  const extLabels = [...labels, '+1', '+2', '+3'];
  const extData = [...data, ...proj];
  const projected = [...new Array(n).fill(null), ...proj];

  const par = el.parentElement;
  const dpr = window.devicePixelRatio || 1;
  const W = par.offsetWidth-24||400; const H = parseInt(el.getAttribute('height'))||180;
  el.width=W*dpr; el.height=H*dpr;
  el.style.width=W+'px'; el.style.height=H+'px';
  const ctx = el.getContext('2d');
  ctx.scale(dpr,dpr);
  ctx.clearRect(0,0,W,H);
  const pad={l:52,r:12,t:16,b:46};
  const cW=W-pad.l-pad.r; const cH=H-pad.t-pad.b;
  const nn=extLabels.length;
  const maxV=Math.max(...extData,1);
  const toX=i=>pad.l+(i/(nn-1))*cW;
  const toY=v=>pad.t+cH-(v/maxV)*cH;

  for(let g=0;g<=4;g++){
    const y=pad.t+(g/4)*cH;
    ctx.strokeStyle=gridClr;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(pad.l,y);ctx.lineTo(W-pad.r,y);ctx.stroke();
    ctx.fillStyle=textClr;ctx.font='10px sans-serif';ctx.textAlign='right';
    ctx.fillText(anFmtShort(maxV*(4-g)/4),pad.l-4,y+3);
  }

  // Actual line
  ctx.beginPath(); ctx.moveTo(toX(0),toY(data[0]));
  data.forEach((v,i)=>ctx.lineTo(toX(i),toY(v)));
  ctx.strokeStyle='#4ade80'; ctx.lineWidth=2; ctx.stroke();

  // Projection line dashed
  ctx.setLineDash([5,4]);
  ctx.beginPath(); ctx.moveTo(toX(n-1),toY(data[n-1]));
  proj.forEach((v,i)=>ctx.lineTo(toX(n+i),toY(v)));
  ctx.strokeStyle='#f59e0b'; ctx.lineWidth=2; ctx.stroke();
  ctx.setLineDash([]);

  // Projection area fill
  ctx.beginPath();
  ctx.moveTo(toX(n-1), pad.t+cH);
  ctx.lineTo(toX(n-1), toY(data[n-1]));
  proj.forEach((v,i)=>ctx.lineTo(toX(n+i),toY(v)));
  ctx.lineTo(toX(n+2), pad.t+cH); ctx.closePath();
  ctx.fillStyle='rgba(245,158,11,0.1)'; ctx.fill();

  ctx.textAlign='center';
  extLabels.forEach((l,i)=>{
    if(i%Math.ceil(nn/10)===0 || i>=n) anFillLabel2(ctx, l, toX(i), H-24, textClr);
  });
  // Legend
  ctx.fillStyle='#4ade80'; ctx.fillRect(pad.l,4,24,3);
  ctx.fillStyle=textClr; ctx.font='10px sans-serif'; ctx.textAlign='left'; ctx.fillText('Aktual',pad.l+28,8);
  ctx.fillStyle='#f59e0b'; ctx.fillRect(pad.l+90,4,24,3);
  ctx.fillStyle=textClr; ctx.fillText('Proyeksi',pad.l+118,8);
}

function anDrawHeatmap(months) {
  const el = document.getElementById('an-heatmap'); if(!el) return;
  // Count jurnal per hari (30 hari terakhir)
  const now = new Date();
  const days = [];
  for(let i=29;i>=0;i--) {
    const d = new Date(now.getFullYear(),now.getMonth(),now.getDate()-i);
    const key = d.toISOString().split('T')[0];
    days.push({key, label: d.toLocaleDateString('id-ID',{weekday:'short',day:'numeric'}), count:0});
  }
  jurnalEntries.forEach(j=>{
    const d = days.find(x=>x.key===j.tanggal);
    if(d) d.count++;
  });
  const max = Math.max(...days.map(d=>d.count),1);
  el.innerHTML = `<div style="font-size:11px;color:var(--muted);margin-bottom:8px;">30 Hari Terakhir — lebih gelap = lebih banyak jurnal</div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;">` +
    days.map(d=>{
      const intensity = d.count/max;
      const alpha = 0.1 + intensity*0.85;
      const bg = d.count===0 ? 'var(--surface2)' : `rgba(74,222,128,${alpha})`;
      return `<div title="${d.label}: ${d.count} jurnal" style="width:28px;height:28px;border-radius:5px;background:${bg};border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:9px;color:${d.count?'#000':'var(--muted)'};">${d.count||''}</div>`;
    }).join('') + `</div>`;
}

function anDrawPeriodCompare(months) {
  const el = document.getElementById('an-period-compare'); if(!el) return;
  const half = Math.floor(months.length/2);
  if(half<1) { el.innerHTML='<div style="color:var(--muted);font-size:13px;">Butuh minimal 2 bulan data.</div>'; return; }
  const prev = months.slice(0,half);
  const curr = months.slice(half);
  const sum = arr => ({
    pend: arr.reduce((s,m)=>s+m.pendapatan,0),
    laba: arr.reduce((s,m)=>s+m.labaBersih,0),
    kas: arr.reduce((s,m)=>s+m.aruKas,0),
    beban: arr.reduce((s,m)=>s+m.beban,0),
  });
  const p = sum(prev), c = sum(curr);
  const pct = (a,b) => b===0?'-':((a-b)/Math.abs(b)*100).toFixed(1)+'%';
  const rows = [
    ['Pendapatan', c.pend, p.pend],
    ['Laba Bersih', c.laba, p.laba],
    ['Arus Kas', c.kas, p.kas],
    ['Total Beban', c.beban, p.beban],
  ];
  el.innerHTML = `<div style="font-size:11px;color:var(--muted);margin-bottom:10px;">Membandingkan ${curr.length} bulan terakhir vs ${prev.length} bulan sebelumnya</div>
  <div style="display:grid;grid-template-columns:auto 1fr 1fr auto;gap:8px 14px;align-items:center;">
    <div style="font-size:11px;color:var(--muted);font-weight:600;">Metrik</div>
    <div style="font-size:11px;color:var(--muted);">Sekarang</div>
    <div style="font-size:11px;color:var(--muted);">Sebelumnya</div>
    <div style="font-size:11px;color:var(--muted);">Δ</div>` +
    rows.map(([label,cur,prv])=>{
      const delta = cur-prv;
      const dPct = pct(cur,prv);
      const clr = delta>=0?'var(--accent)':'var(--red)';
      const arrow = delta>=0?'▲':'▼';
      return `<div style="font-size:12px;font-weight:600;">${label}</div>
        <div style="font-size:13px;font-family:var(--mono);color:var(--text);">${rp(cur)}</div>
        <div style="font-size:13px;font-family:var(--mono);color:var(--muted);">${rp(prv)}</div>
        <div style="font-size:12px;color:${clr};font-weight:700;">${arrow} ${dPct}</div>`;
    }).join('') + `</div>`;
}

function anFmtShort(v) {
  if(Math.abs(v)>=1e9) return (v/1e9).toFixed(1)+'M';
  if(Math.abs(v)>=1e6) return (v/1e6).toFixed(1)+'jt';
  if(Math.abs(v)>=1e3) return (v/1e3).toFixed(0)+'rb';
  return Math.round(v).toString();
}
function hexToRgba(hex,alpha) {
  const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

// Draw 2-line x-axis label (month on top, year below)
function anFillLabel2(ctx, label, x, yBase, textClr) {
  const parts = label.split('\n');
  if(parts.length === 2) {
    ctx.fillStyle = textClr;
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(parts[0], x, yBase);
    ctx.font = '9px sans-serif';
    ctx.fillStyle = typeof textClr === 'string' ? textClr.replace('0.7','0.45') : textClr;
    ctx.fillText(parts[1], x, yBase + 12);
    ctx.fillStyle = textClr;
    ctx.font = '10px sans-serif';
  } else {
    ctx.fillText(label, x, yBase);
  }
}

// ── CHART HD MODAL ──
function openAnChartModal(canvas) {
  const modal = document.getElementById('an-chart-modal');
  const modalCanvas = document.getElementById('an-chart-modal-canvas');
  const titleEl = document.getElementById('an-chart-modal-title');
  if(!modal || !modalCanvas || !canvas) return;

  // Jangan buka jika canvas kosong (belum render data)
  const srcCtx = canvas.getContext('2d');
  if(!srcCtx) return;

  // Find title from closest table-card
  const card = canvas.closest('.table-card');
  const titleNode = card ? card.querySelector('.table-title') : null;
  titleEl.textContent = titleNode ? titleNode.textContent : 'Chart Detail';

  // Ukuran sumber asli (CSS pixels)
  const dpr = window.devicePixelRatio || 1;
  const srcW = canvas.offsetWidth || (canvas.width / dpr);
  const srcH = canvas.offsetHeight || (canvas.height / dpr);
  if(!srcW || !srcH) return;

  // Modal canvas: fit layar, HD 3x
  const maxW = Math.min(window.innerWidth - 48, 1100);
  const scale = maxW / srcW;
  const dispW = Math.round(srcW * scale);
  const dispH = Math.round(srcH * scale);
  const hdW = Math.round(dispW * dpr);
  const hdH = Math.round(dispH * dpr);

  modalCanvas.width = hdW;
  modalCanvas.height = hdH;
  modalCanvas.style.width = dispW + 'px';
  modalCanvas.style.height = dispH + 'px';

  // Gambar background lalu copy dari sumber
  const mctx = modalCanvas.getContext('2d');
  mctx.clearRect(0, 0, hdW, hdH);

  // Fill background sesuai theme
  const isDark = !document.body.classList.contains('light-mode');
  mctx.fillStyle = isDark ? '#141720' : '#ffffff';
  mctx.fillRect(0, 0, hdW, hdH);

  // Copy chart dari canvas sumber (diperbesar)
  mctx.drawImage(canvas, 0, 0, hdW, hdH);

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAnChartModal() {
  const modal = document.getElementById('an-chart-modal');
  if(modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

// Attach click listeners after DOM ready
document.addEventListener('DOMContentLoaded', function() {
  document.addEventListener('click', function(e) {
    const c = e.target.closest('.an-chart-clickable');
    if(c) openAnChartModal(c);
  });
  const modal = document.getElementById('an-chart-modal');
  if(modal) modal.addEventListener('click', function(e) {
    if(e.target === modal) closeAnChartModal();
  });
  document.addEventListener('keydown', function(e) {
    if(e.key === 'Escape') closeAnChartModal();
  });
});
// _kontakFilter already declared above

function saveFiturBaru() {
  localStorage.setItem('oas_jb', JSON.stringify(jurnalBerulangList));
  localStorage.setItem('oas_jb_hist', JSON.stringify(jurnalBerulangHistory));
  localStorage.setItem('oas_invoices', JSON.stringify(invoiceList));
  localStorage.setItem('oas_kurs', JSON.stringify(kursData));
  localStorage.setItem('oas_alerts', JSON.stringify(notifAlerts));
  localStorage.setItem('oas_notif_hist', JSON.stringify(notifHistory));
  localStorage.setItem('oas_anggaran', JSON.stringify(anggaranList));
  localStorage.setItem('oas_aset_tetap', JSON.stringify(asetTetapList));
  localStorage.setItem('oas_kontak', JSON.stringify(kontakList));
}

function hitungPPh21Otomatis() {
  const gajiBruto=parseFloat(document.getElementById('pph21-gaji')?.value)||0;
  const jmlKaryawan=parseInt(document.getElementById('pph21-karyawan')?.value)||1;
  const el=document.getElementById('pph21-result'); if(!el) return;
  if(!gajiBruto) { el.innerHTML=''; return; }
  // Simplified PPh 21
  const setahun=gajiBruto*12;
  const biayaJabatan=Math.min(setahun*0.05,6000000);
  const ptkp=54000000;
  const pkp=Math.max(0,setahun-biayaJabatan-ptkp);
  let pph=0;
  if(pkp<=60000000) pph=pkp*0.05;
  else if(pkp<=250000000) pph=3000000+(pkp-60000000)*0.15;
  else if(pkp<=500000000) pph=31500000+(pkp-250000000)*0.25;
  else pph=93500000+(pkp-500000000)*0.30;
  const pphBulan=pph/12;
  el.innerHTML=`<div style="background:var(--surface2);border-radius:10px;padding:14px;display:flex;flex-direction:column;gap:8px;">
    ${[['PKP Setahun',rp(pkp)],['PPh 21 Setahun',rp(pph)],['PPh 21/Bulan/Karyawan',rp(pphBulan)],['Total PPh 21/Bulan',rp(pphBulan*jmlKaryawan)]].map(([l,v])=>`
    <div style="display:flex;justify-content:space-between;"><span style="font-size:12px;color:var(--muted)">${l}</span><span style="font-family:var(--mono);font-size:12px;font-weight:600;color:var(--accent3)">${v}</span></div>`).join('')}
  </div>`;
}

function hitungPPh23Otomatis() {
  const jenis=document.getElementById('pph23-jenis')?.value;
  const bruto=parseFloat(document.getElementById('pph23-bruto')?.value)||0;
  const el=document.getElementById('pph23-result'); if(!el) return;
  const tarifMap={jasa:0.02,royalti:0.15,sewa:0.02,dividen:0.15,bunga:0.15};
  const tarif=tarifMap[jenis]||0.02;
  const pph=bruto*tarif;
  el.innerHTML=`<div style="background:var(--surface2);border-radius:10px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
    <div><div style="font-size:11px;color:var(--muted);">PPh 23 (${(tarif*100).toFixed(0)}%)</div><div style="font-size:18px;font-weight:700;color:var(--accent3);font-family:var(--mono);">${rp(pph)}</div></div>
    <div><div style="font-size:11px;color:var(--muted);">Neto Diterima</div><div style="font-size:16px;font-weight:700;color:var(--accent);font-family:var(--mono);">${rp(bruto-pph)}</div></div>
  </div>`;
}

function buatJurnalPPh21() {
  const gajiBruto=parseFloat(document.getElementById('pph21-gaji')?.value)||0;
  const jmlKaryawan=parseInt(document.getElementById('pph21-karyawan')?.value)||1;
  if(!gajiBruto){showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Masukkan gaji bruto terlebih dahulu');return;}
  showOpSpinner('Membuat Jurnal PPh 21...','Memvalidasi kalkulasi pajak');
  setTimeout(()=>{
    const pphBulan=(gajiBruto*12-(Math.min(gajiBruto*12*0.05,6000000))-54000000);
    const pphReal=Math.max(0,pphBulan)*jmlKaryawan;
    const totalGaji=gajiBruto*jmlKaryawan;
    const bebanAkun=akuns.find(a=>a.tipe==='Beban'&&a.nama.toLowerCase().includes('gaji'))||akuns.find(a=>a.tipe==='Beban');
    const hutangAkun=akuns.find(a=>a.tipe==='Liabilitas')||akuns.find(a=>a.kode==='2101');
    const kasAkun=akuns.find(a=>a.kode==='1101');
    if(!bebanAkun||!kasAkun){hideOpSpinner();showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Akun beban gaji / kas tidak ditemukan');return;}
    const entry={
      id:'JRN_PPH21_'+Date.now(), tanggal:new Date().toISOString().split('T')[0],
      jenis:'Manual', keterangan:`Gaji & PPh 21 — ${jmlKaryawan} karyawan`,
      lines:[
        {akun:bebanAkun.kode,debit:totalGaji,kredit:0},
        ...(hutangAkun&&pphReal?[{akun:hutangAkun.kode,debit:0,kredit:pphReal}]:[]),
        {akun:kasAkun.kode,debit:0,kredit:totalGaji-(pphReal||0)}
      ]
    };
    jurnalEntries.push(entry); saveToStorage(false);
    showAlert(`✓ Jurnal PPh 21 dibuat! Gaji bersih: ${rp(totalGaji-(pphReal||0))}, PPh 21: ${rp(pphReal||0)}`);
    hideOpSpinner();
  }, 900);
}

function buatJurnalPPh23() {
  const jenis=document.getElementById('pph23-jenis')?.value;
  const bruto=parseFloat(document.getElementById('pph23-bruto')?.value)||0;
  if(!bruto){showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Masukkan nilai bruto');return;}
  showOpSpinner('Membuat Jurnal PPh 23...','');
  setTimeout(()=>{
    const tarifMap={jasa:0.02,royalti:0.15,sewa:0.02,dividen:0.15,bunga:0.15};
    const tarif=tarifMap[jenis]||0.02;
    const pph=bruto*tarif;
    const kasAkun=akuns.find(a=>a.kode==='1101');
    const pendAkun=akuns.find(a=>a.tipe==='Pendapatan');
    const hutangAkun=akuns.find(a=>a.tipe==='Liabilitas');
    if(!kasAkun||!pendAkun){hideOpSpinner();showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Akun tidak ditemukan');return;}
    const entry={
      id:'JRN_PPH23_'+Date.now(), tanggal:new Date().toISOString().split('T')[0],
      jenis:'Manual', keterangan:`PPh 23 — ${jenis} (${(tarif*100).toFixed(0)}%)`,
      lines:[
        {akun:kasAkun.kode,debit:bruto-pph,kredit:0},
        ...(hutangAkun?[{akun:hutangAkun.kode,debit:pph,kredit:0}]:[]),
        {akun:pendAkun.kode,debit:0,kredit:bruto}
      ]
    };
    jurnalEntries.push(entry); saveToStorage(false);
    showAlert(`✓ Jurnal PPh 23 dibuat! Bruto: ${rp(bruto)}, PPh: ${rp(pph)}, Neto: ${rp(bruto-pph)}`);
    hideOpSpinner();
  }, 800);
}

// ══════════════════════════════════════════════════════════════
// Auto-cek notifikasi saat load
setTimeout(cekNotifikasi, 2000);
// Init Multi Kartu Stock (guest mode — login mode dihandle di loadKartuStockFromData)
document.addEventListener('DOMContentLoaded', function() {
  setTimeout(function() {
    if (typeof initMultiKartuStock === 'function' && Object.keys(multiKartuStock).length === 0) {
      initMultiKartuStock();
    }
  }, 500);
});
// Auto-jalankan jurnal berulang tertunda saat load
setTimeout(function() {
  const today=new Date().toISOString().split('T')[0];
  const tertunda=jurnalBerulangList.filter(j=>j.aktif&&j.berikutnya<=today);
  if(tertunda.length) {
    setTimeout(()=>showAutoSaveToast(`<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> ${tertunda.length} jurnal berulang tertunda. Buka menu Jurnal Berulang.`, false), 3000);
  }
}, 3500);

// REMINDERS
function getReminders() {
  const reminders = [];
  const now = new Date();
  // Ambil tanggal jurnal TERBARU (bukan terakhir di array — karena bisa tidak urut)
  const lastJurnal = jurnalEntries.length > 0
    ? new Date(jurnalEntries.map(j => j.tanggal).filter(Boolean).sort().slice(-1)[0])
    : null;

  // 1. No entries in 7 days
  if(lastJurnal && !isNaN(lastJurnal.getTime())) {
    const daysSince = Math.floor((now - lastJurnal) / 86400000);
    if(daysSince >= 7) reminders.push({ type:'warn', icon:'<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', text:`Belum ada transaksi selama ${daysSince} hari`, action:"showPage('transaksi')" });
  }

  // 2. End of month approaching — hanya tampil jika belum di-dismiss di bulan ini
  const daysToEOM = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate() - now.getDate();
  if(daysToEOM <= 5 && daysToEOM >= 0) {
    const dismissKey = `oas_dismiss_penyesuaian_${now.getFullYear()}_${now.getMonth()}`;
    if(!localStorage.getItem(dismissKey)) {
      reminders.push({ type:'info', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>', text:`Akhir bulan dalam ${daysToEOM} hari — buat jurnal penyesuaian?`, action:`dismissAndOpenPenyesuaian('${dismissKey}')` });
    }
  }

  // 3. Check if neraca is balanced using double-entry rule: total debit == total kredit
  if(jurnalEntries.length > 0) {
    let totalD = 0, totalK = 0;
    jurnalEntries.forEach(j => j.lines.forEach(l => {
      totalD += l.debit||0;
      totalK += l.kredit||0;
    }));
    if(Math.abs(totalD - totalK) > 1) {
      reminders.push({ type:'warn', icon:'<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>', text:`Jurnal tidak balance — total debit (${fmtRp(totalD)}) ≠ total kredit (${fmtRp(totalK)})`, action:"showPage('neraca-saldo')" });
    }
  }

  // 4. Profil belum diisi
  const p = getProfil();
  if(!p.nama) reminders.push({ type:'info', icon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M4 21V7a2 2 0 012-2h12a2 2 0 012 2v14M9 21V11h6v10M9 11V7"/></svg>', text:'Lengkapi profil perusahaan untuk laporan yang lebih profesional', action:"openModal('modal-profil');loadProfil()" });

  // Pajak compliance reminders
  const pajakNotifs = typeof getPajakNotifications === 'function' ? getPajakNotifications() : [];
  pajakNotifs.forEach(p => reminders.push({
    type: p.type, icon: p.icon,
    text: `${p.judul} — ${p.isi.slice(0, 70)}`,
    action: p.aksi
  }));

  return reminders;
}

// ── DASHBOARD: PIUTANG & UTANG SUMMARY ──
function renderDashPiutangUtang() {
  const fmtRpShort = v => {
    if(Math.abs(v) >= 1e9) return 'Rp ' + (v/1e9).toFixed(1) + ' M';
    if(Math.abs(v) >= 1e6) return 'Rp ' + (v/1e6).toFixed(1) + ' jt';
    return fmtRp(v);
  };
  // Gunakan global emptyState() — sudah include icon SVG

  // ── PIUTANG ──
  const piutangEl  = document.getElementById('dash-piutang-content');
  const piutangSub = document.getElementById('dash-piutang-sub');
  if(piutangEl) {
    const piutangAkuns = akuns.filter(a => a.tipe === 'Aset' && a.nama.toLowerCase().includes('piutang'));
    let totalPiutang = 0;
    const pRows = [];
    piutangAkuns.forEach(a => {
      const s = computeSaldoBersih(a.kode);
      if(!s) return;
      totalPiutang += s;
      pRows.push({ nama: a.nama, kode: a.kode, saldo: s });
    });
    const penjualanKredit = jurnalEntries.filter(j =>
      j.jenis === 'Penjualan' && j.lines.some(l => l.akun === '1201' && l.debit > 0)
    ).length;
    if(pRows.length === 0) {
      piutangEl.innerHTML = emptyState('Belum ada piutang', 'Tambah transaksi baru untuk memulai');
      if(piutangSub) piutangSub.textContent = 'Semua tagihan lunas';
    } else {
      if(piutangSub) piutangSub.textContent = `${pRows.length} akun · ${penjualanKredit} transaksi kredit`;
      piutangEl.innerHTML = `
        <div style="padding:12px 16px 4px;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.15);border-radius:8px;margin-bottom:8px;">
            <span style="font-size:12px;color:var(--muted);font-weight:600;">TOTAL PIUTANG</span>
            <span style="font-family:var(--mono);font-size:15px;font-weight:700;color:var(--accent);">${fmtRp(totalPiutang)}</span>
          </div>
        </div>
        <table style="width:100%;"><tbody>
          ${pRows.map(r => `<tr style="border-bottom:1px solid var(--border);">
            <td style="padding:9px 16px;">
              <div style="font-size:13px;font-weight:500;">${r.nama}</div>
              <div style="font-size:10px;color:var(--muted);font-family:var(--mono);">${r.kode}</div>
            </td>
            <td style="padding:9px 16px;text-align:right;font-family:var(--mono);font-size:13px;font-weight:600;color:${r.saldo>0?'var(--accent)':'var(--red)'};">${fmtRpShort(Math.abs(r.saldo))}</td>
          </tr>`).join('')}
        </tbody></table>`;
    }
  }

  // ── UTANG ──
  const utangEl  = document.getElementById('dash-utang-content');
  const utangSub = document.getElementById('dash-utang-sub');
  if(utangEl) {
    const utangAkuns = akuns.filter(a => a.tipe === 'Liabilitas');
    let totalUtang = 0;
    const uRows = [];
    utangAkuns.forEach(a => {
      const s = computeSaldoBersih(a.kode);
      if(!s) return;
      totalUtang += s;
      uRows.push({ nama: a.nama, kode: a.kode, saldo: s });
    });
    if(uRows.length === 0) {
      utangEl.innerHTML = emptyState('Belum ada utang', 'Tambah transaksi baru untuk memulai');
      if(utangSub) utangSub.textContent = 'Kewajiban bersih: Rp 0';
    } else {
      uRows.sort((a,b) => b.saldo - a.saldo);
      if(utangSub) utangSub.textContent = `${uRows.length} akun · Total ${fmtRpShort(totalUtang)}`;
      utangEl.innerHTML = `
        <div style="padding:12px 16px 4px;">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(248,113,113,0.06);border:1px solid rgba(248,113,113,0.15);border-radius:8px;margin-bottom:8px;">
            <span style="font-size:12px;color:var(--muted);font-weight:600;">TOTAL KEWAJIBAN</span>
            <span style="font-family:var(--mono);font-size:15px;font-weight:700;color:var(--red);">${fmtRp(totalUtang)}</span>
          </div>
        </div>
        <table style="width:100%;"><tbody>
          ${uRows.map(r => {
            const isBank  = r.nama.toLowerCase().includes('bank') || r.nama.toLowerCase().includes('kredit');
            const isUsaha = r.nama.toLowerCase().includes('usaha') || r.kode.startsWith('210');
            const tag = isBank
              ? `<span style="font-size:9px;background:rgba(34,211,238,0.12);color:var(--accent2);padding:1px 6px;border-radius:3px;font-weight:700;margin-left:4px;">BANK</span>`
              : isUsaha
              ? `<span style="font-size:9px;background:rgba(245,158,11,0.12);color:var(--accent3);padding:1px 6px;border-radius:3px;font-weight:700;margin-left:4px;">USAHA</span>`
              : '';
            return `<tr style="border-bottom:1px solid var(--border);">
              <td style="padding:9px 16px;">
                <div style="font-size:13px;font-weight:500;display:flex;align-items:center;gap:4px;">${r.nama}${tag}</div>
                <div style="font-size:10px;color:var(--muted);font-family:var(--mono);">${r.kode}</div>
              </td>
              <td style="padding:9px 16px;text-align:right;font-family:var(--mono);font-size:13px;font-weight:600;color:var(--red);">${fmtRpShort(r.saldo)}</td>
            </tr>`;
          }).join('')}
        </tbody></table>`;
    }
  }

  // ── INFORMASI PENJUALAN ──
  const jualEl  = document.getElementById('dash-penjualan-content');
  const jualSub = document.getElementById('dash-penjualan-sub');
  if(jualEl) {
    const now2 = new Date();
    const y2 = now2.getFullYear(), m2 = now2.getMonth();
    const fromStr = `${y2}-${String(m2+1).padStart(2,'0')}-01`;
    const toStr   = new Date(y2, m2+1, 0).toISOString().split('T')[0];

    // 6 bulan terakhir
    const bulan6 = [];
    for(let i=5; i>=0; i--) {
      const d   = new Date(y2, m2-i, 1);
      const pfx = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      let total = 0;
      jurnalEntries.filter(j => j.jenis==='Penjualan' && j.tanggal.startsWith(pfx)).forEach(j => {
        j.lines.forEach(l => {
          const a = akuns.find(x=>x.kode===l.akun);
          if(a?.tipe==='Pendapatan') total += l.kredit||0;
        });
      });
      bulan6.push({ label: d.toLocaleDateString('id-ID',{month:'short'}), val: total });
    }

    const totalBulanIni  = bulan6[5].val;
    const totalBulanLalu = bulan6[4].val;
    const delta = totalBulanLalu > 0 ? ((totalBulanIni - totalBulanLalu) / totalBulanLalu * 100) : 0;
    const deltaStr = totalBulanLalu > 0
      ? `<span style="font-size:11px;font-weight:700;color:${delta>=0?'var(--accent)':'var(--red)'};">${delta>=0?'▲':'▼'} ${Math.abs(delta).toFixed(1)}%</span>`
      : '';
    const jualCount = jurnalEntries.filter(j =>
      j.jenis==='Penjualan' && j.tanggal >= fromStr && j.tanggal <= toStr
    ).length;

    // Bar chart mini
    const maxVal = Math.max(...bulan6.map(b=>b.val), 1);
    const bars = bulan6.map((b,i) => {
      const pct = Math.max(Math.round((b.val / maxVal) * 100), b.val > 0 ? 4 : 0);
      const isNow = i === 5;
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;flex:1;">
        <div style="width:100%;background:var(--surface2);border-radius:4px 4px 0 0;height:60px;display:flex;align-items:flex-end;overflow:hidden;">
          <div style="width:100%;background:${isNow?'var(--accent)':'rgba(74,222,128,0.3)'};border-radius:4px 4px 0 0;height:${pct}%;"></div>
        </div>
        <span style="font-size:9px;color:${isNow?'var(--accent)':'var(--muted)'};font-weight:${isNow?700:400};">${b.label}</span>
      </div>`;
    }).join('');

    if(jualSub) jualSub.textContent = `${jualCount} transaksi · ${now2.toLocaleDateString('id-ID',{month:'long',year:'numeric'})}`;

    jualEl.innerHTML = `
      <div style="padding:12px 16px 12px;">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;background:rgba(74,222,128,0.06);border:1px solid rgba(74,222,128,0.15);border-radius:8px;margin-bottom:12px;">
          <div>
            <div style="font-size:11px;color:var(--muted);font-weight:600;margin-bottom:2px;">PENJUALAN BULAN INI</div>
            <div style="font-family:var(--mono);font-size:16px;font-weight:700;color:var(--accent);">${fmtRp(totalBulanIni)}</div>
          </div>
          <div style="text-align:right;">
            ${deltaStr}
            <div style="font-size:10px;color:var(--muted);margin-top:2px;">vs bln lalu</div>
          </div>
        </div>
        <div style="display:flex;align-items:flex-end;gap:4px;padding:0 4px;height:80px;">
          ${bars}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px;">
          <div style="background:var(--surface2);border-radius:8px;padding:8px 10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:2px;">BLN LALU</div>
            <div style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--text);">${fmtRpShort(totalBulanLalu)}</div>
          </div>
          <div style="background:var(--surface2);border-radius:8px;padding:8px 10px;">
            <div style="font-size:10px;color:var(--muted);font-weight:600;margin-bottom:2px;">JML TRANSAKSI</div>
            <div style="font-family:var(--mono);font-size:13px;font-weight:700;color:var(--text);">${jualCount} transaksi</div>
          </div>
        </div>
      </div>`;
  }
}


// CHART (CANVAS) — masih dipakai di halaman lain
function renderChart() {
  const canvas = document.getElementById('dash-chart');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.offsetWidth || 300;
  canvas.width = W;
  canvas.height = 140;

  // Get last 6 months data
  const now = new Date();
  const months = [];
  for(let i=5; i>=0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    months.push({ label: d.toLocaleDateString('id-ID',{month:'short'}), year: d.getFullYear(), month: d.getMonth(), pend: 0, beban: 0 });
  }
  jurnalEntries.forEach(j => {
    const d = new Date(j.tanggal);
    const mi = months.findIndex(m => m.year===d.getFullYear() && m.month===d.getMonth());
    if(mi < 0) return;
    j.lines.forEach(l => {
      const a = akuns.find(x=>x.kode===l.akun);
      if(a?.tipe==='Pendapatan') months[mi].pend += l.kredit||0;
      if(['Beban','HPP'].includes(a?.tipe)) months[mi].beban += l.debit||0;
    });
  });

  const maxVal = Math.max(...months.map(m => Math.max(m.pend, m.beban)), 1);
  const pad = { left: 8, right: 8, top: 10, bottom: 28 };
  const chartW = W - pad.left - pad.right;
  const chartH = canvas.height - pad.top - pad.bottom;
  const barW = Math.floor(chartW / months.length * 0.35);
  const gap = Math.floor(chartW / months.length);

  ctx.clearRect(0, 0, W, canvas.height);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.05)';
  ctx.lineWidth = 1;
  for(let g=0; g<=4; g++) {
    const y = pad.top + (g/4) * chartH;
    ctx.beginPath(); ctx.moveTo(pad.left, y); ctx.lineTo(W-pad.right, y); ctx.stroke();
  }

  months.forEach((m, i) => {
    const x = pad.left + i * gap + gap * 0.15;
    const pendH = (m.pend / maxVal) * chartH;
    const bebanH = (m.beban / maxVal) * chartH;

    // Pendapatan bar
    const gPend = ctx.createLinearGradient(0, pad.top + chartH - pendH, 0, pad.top + chartH);
    gPend.addColorStop(0, 'rgba(74,222,128,0.8)');
    gPend.addColorStop(1, 'rgba(74,222,128,0.2)');
    ctx.fillStyle = gPend;
    ctx.beginPath();
    ctx.roundRect(x, pad.top + chartH - pendH, barW, pendH, [3,3,0,0]);
    ctx.fill();

    // Beban bar
    const gBeban = ctx.createLinearGradient(0, pad.top + chartH - bebanH, 0, pad.top + chartH);
    gBeban.addColorStop(0, 'rgba(248,113,113,0.8)');
    gBeban.addColorStop(1, 'rgba(248,113,113,0.2)');
    ctx.fillStyle = gBeban;
    ctx.beginPath();
    ctx.roundRect(x + barW + 2, pad.top + chartH - bebanH, barW, bebanH, [3,3,0,0]);
    ctx.fill();

    // Label
    ctx.fillStyle = 'rgba(100,116,139,0.8)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, x + barW, canvas.height - 8);
  });
}

// UPGRADED renderDashboard
function renderDashboard() {
  const { from, to, label } = getPeriodRange();
  const filtered = filterJurnalByPeriod(from, to);

  // Custom range visibility
  const filterEl = document.getElementById('dash-filter-period');
  if(filterEl?.value !== 'custom') {
    const cr = document.getElementById('dash-custom-range');
    if(cr) cr.classList.remove('show');
  }

  // Period label
  const lblEl = document.getElementById('dash-period-label');
  if(lblEl) lblEl.textContent = label;

  // KPI — aset always all-time, others filtered
  let tA=0, tP=0, tB=0;
  const saldoMapAll = computeSaldoAll();
  // Hitung tA hanya dari akun Aset NON-tetap (Lancar, dll.)
  // Akun aset tetap & akumulasi penyusutan DIKECUALIKAN dari CoA,
  // karena nilai buku bersih akan diambil langsung dari asetTetapList (lebih akurat & real-time)
  akuns.forEach(a => {
    const s = saldoMapAll[a.kode]||{debit:0,kredit:0};
    const b = a.normal==='D'?s.debit-s.kredit:s.kredit-s.debit;
    if(a.tipe==='Aset' && a.kat!=='Tetap') tA += b;
  });
  // Tambahkan nilai buku bersih aset tetap dari asetTetapList (selalu real-time, termasuk penyusutan)
  const atNilaiBuku = typeof asetTetapList !== 'undefined'
    ? asetTetapList.filter(a=>a.status==='aktif').reduce((s,a)=>s+(typeof hitungPenyusutanAset==='function'?hitungPenyusutanAset(a).nilaiBuku:a.hargaPerolehan),0)
    : 0;
  const tAFinal = tA + atNilaiBuku;
  // Filtered pendapatan & beban
  const filtSaldoMap = {};
  filtered.forEach(j => j.lines.forEach(l => {
    if(!filtSaldoMap[l.akun]) filtSaldoMap[l.akun] = {debit:0,kredit:0};
    filtSaldoMap[l.akun].debit += l.debit||0;
    filtSaldoMap[l.akun].kredit += l.kredit||0;
  }));
  akuns.forEach(a => {
    const s = filtSaldoMap[a.kode]||{debit:0,kredit:0};
    const b = a.normal==='D'?s.debit-s.kredit:s.kredit-s.debit;
    if(a.tipe==='Pendapatan') tP += b;
    if(['Beban','HPP'].includes(a.tipe)) tB += b;
  });
  const tL = tP - tB;

  const setEl = (id, val) => { const e=document.getElementById(id); if(e) e.textContent=val; };
  setEl('stat-aset', fmtRp(tAFinal));
  setEl('stat-pendapatan', fmtRp(tP));
  setEl('stat-beban', fmtRp(tB));
  setEl('stat-laba', fmtRp(tL));
  setEl('stat-aset-sub', 'Semua periode');
  setEl('stat-pend-sub', label || 'Periode dipilih');
  setEl('stat-beban-sub', label || 'Periode dipilih');
  const setElHTML = (id, val) => { const e=document.getElementById(id); if(e) e.innerHTML=val; };
  setElHTML('stat-laba-sub', tL >= 0 ? '<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Untung' : '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Rugi');

  // Reminders
  const remEl = document.getElementById('dash-reminders');
  if(remEl) {
    const rems = getReminders();
    if(rems.length > 0) {
      remEl.style.display = 'block';
      remEl.innerHTML = rems.map(r =>
        `<div class="reminder-card reminder-${r.type}" onclick="${r.action}">
          <span>${r.icon}</span>
          <span style="flex:1">${r.text}</span>
          <span style="font-size:12px;opacity:0.7;">→</span>
        </div>`
      ).join('');
    } else {
      remEl.style.display = 'none';
    }
  }

  // Recent transactions
  const recentEl = document.getElementById('dash-recent');
  if(recentEl) {
    const recent = [...filtered].reverse().slice(0, 7);
    if(!recent.length) {
      recentEl.innerHTML = emptyState('Belum ada transaksi');
    } else {
      const profil = getProfil();
      setEl('dash-recent-sub', `${recent.length} entri terakhir${label?' — '+label:''}`);
      recentEl.innerHTML = `<table><thead><tr><th>Tgl</th><th>Keterangan</th><th>Jenis</th><th style="text-align:right">Jumlah</th></tr></thead><tbody>
        ${recent.map(j => {
          const tot = j.lines.reduce((s,l)=>s+(l.debit||0),0);
          return `<tr style="cursor:pointer" onclick="showPage('jurnal-umum')">
            <td style="font-size:11px">${fmtDate(j.tanggal)}</td>
            <td>${j.ket}</td>
            <td><span class="badge ${jeninsBadge(j.jenis)}" style="font-size:10px">${j.jenis}</span></td>
            <td class="num" style="text-align:right">${fmtRp(tot)}</td>
          </tr>`;
        }).join('')}
      </tbody></table>`;
    }
  }

  // Neraca Saldo Utama
  const saldoEl = document.getElementById('dash-saldo');
  if(saldoEl) {
    const highlight = ['1101','1102','1201','1301','2101','2801','4101','4102','5101','6101'];
    const rows = highlight.map(k => {
      const a = akuns.find(x=>x.kode===k);
      if(!a) return '';
      const s = computeSaldoBersih(k);
      if(!s) return '';
      return `<tr><td><span style="font-size:10px;color:var(--muted);font-family:var(--mono)">${k}</span> ${a.nama}</td>
        <td class="num" style="text-align:right;color:${s>=0?'var(--accent)':'var(--red)'};">${fmtRp(Math.abs(s))}</td></tr>`;
    }).filter(Boolean);
    saldoEl.innerHTML = rows.length
      ? `<table><tbody>${rows.join('')}</tbody></table>`
      : emptyState('Belum ada saldo');
  }

  // Piutang & Utang summary
  renderDashPiutangUtang();
  // Pajak reminders
  renderPajakPanel();
}

// JURNAL PENUTUP (CLOSING ENTRIES)
function buatJurnalPenutup() {
  let totalPend = 0, totalBeban = 0;
  const pendLines = [], bebanLines = [];

  akuns.forEach(a => {
    const s = computeSaldoBersih(a.kode);
    if(!s) return;
    if(a.tipe === 'Pendapatan') {
      totalPend += s;
      pendLines.push({ akun: a.kode, ket: a.nama + ' (tutup)', debit: s, kredit: 0 });
    }
    if(['Beban','HPP'].includes(a.tipe)) {
      totalBeban += s;
      bebanLines.push({ akun: a.kode, ket: a.nama + ' (tutup)', debit: 0, kredit: s });
    }
  });

  if(!totalPend && !totalBeban) { showAlert('Tidak ada akun pendapatan/beban yang perlu ditutup.'); return; }

  const labaBersih = totalPend - totalBeban;
  const today = new Date().toISOString().split('T')[0];

  // Gunakan custom confirm modal bertema
  showCustomConfirmGeneral({
    icon: '<i class="ti ti-book-off" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    iconColor: 'rgba(245,158,11,0.15)',
    iconBorder: 'rgba(245,158,11,0.3)',
    title: 'Buat Jurnal Penutup Akhir Periode?',
    subtitle: 'Semua akun pendapatan & beban akan ditutup ke Laba Ditahan',
    rows: [
      { label: 'Total Pendapatan ditutup', value: fmtRp(totalPend), color: 'var(--accent)' },
      { label: 'Total Beban ditutup', value: fmtRp(totalBeban), color: 'var(--red)' },
      { label: 'Laba/Rugi ke Laba Ditahan', value: fmtRp(labaBersih), color: labaBersih >= 0 ? 'var(--accent)' : 'var(--red)' },
      { label: 'Total baris jurnal', value: (pendLines.length + bebanLines.length + 1) + ' baris', color: 'var(--muted)' },
    ],
    warning: '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Aksi ini akan mereset semua akun pendapatan & beban ke nol.',
    btnLabel: '<i class="ti ti-book-off" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Ya, Buat Jurnal Penutup',
    btnGradient: 'linear-gradient(135deg,#f59e0b,#f87171)',
  }).then(ok => {
    if(!ok) return;

    const kode = nextKode('CLO');

    // Jurnal 1: Tutup semua pendapatan
    if(pendLines.length) {
      addJurnal({
        tanggal: today, ket: `Jurnal Penutup — Pendapatan [${kode}]`, jenis: 'Manual', kodeRef: kode,
        lines: [...pendLines, { akun: '3201', ket: 'Laba Ditahan (transfer pendapatan)', debit: 0, kredit: totalPend }]
      });
    }
    // Jurnal 2: Tutup semua beban
    if(bebanLines.length) {
      addJurnal({
        tanggal: today, ket: `Jurnal Penutup — Beban [${kode}]`, jenis: 'Manual', kodeRef: kode,
        lines: [{ akun: '3201', ket: 'Laba Ditahan (transfer beban)', debit: totalBeban, kredit: 0 }, ...bebanLines]
      });
    }
    renderDashboard();
    showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal Penutup ${kode} dibuat! Semua akun pendapatan & beban sudah direset ke nol.`);
    showPage('jurnal-umum');
  });
}

// REKONSILIASI KAS
function cekRekonsiliasi() {
  const saldoSistem = computeSaldoBersih('1101');
  const salBank = computeSaldoBersih('1102') + computeSaldoBersih('1103');
  const totalSistem = saldoSistem + salBank;

  // Custom input modal untuk saldo fisik
  showCustomInputModal({
    icon: '<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i>',
    iconColor: 'rgba(34,211,238,0.15)',
    iconBorder: 'rgba(34,211,238,0.3)',
    title: 'Rekonsiliasi Kas',
    subtitle: 'Cocokkan saldo sistem dengan rekening fisik/bank',
    rows: [
      { label: 'Saldo Kas (1101) di Sistem', value: fmtRp(saldoSistem), color: 'var(--accent)' },
      { label: 'Saldo Bank BCA+Mandiri di Sistem', value: fmtRp(salBank), color: 'var(--accent2)' },
      { label: 'Total Saldo di Sistem', value: fmtRp(totalSistem), color: 'var(--text)' },
    ],
    inputLabel: 'Masukkan saldo fisik / rekening koran (Rp):',
    inputDefault: totalSistem,
    btnLabel: '<i class="ti ti-refresh" style="font-size:16px;width:16px;height:16px;vertical-align:-2px;margin-right:6px;"></i> Cocokkan Sekarang',
  }).then(inputVal => {
    if(inputVal === null) return;
    const saldoBank = parseFloat(inputVal);
    if(isNaN(saldoBank)) return;
    const selisih = totalSistem - saldoBank;

    if(Math.abs(selisih) < 1) {
      showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Rekonsiliasi MATCH — Saldo buku = Saldo bank!');
      return;
    }

    const selisihMsg = selisih > 0
      ? `Saldo sistem <b>lebih</b> dari rekening bank sebesar <b style="color:var(--red)">${fmtRp(Math.abs(selisih))}</b>.<br><small style="color:var(--muted)">Kemungkinan: ada pengeluaran belum dicatat, atau kesalahan input.</small>`
      : `Saldo sistem <b>kurang</b> dari rekening bank sebesar <b style="color:var(--accent)">${fmtRp(Math.abs(selisih))}</b>.<br><small style="color:var(--muted)">Kemungkinan: ada pemasukan belum dicatat, atau bunga bank belum dicatat.</small>`;

    showCustomConfirmGeneral({
      icon: '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>',
      iconColor: 'rgba(245,158,11,0.15)',
      iconBorder: 'rgba(245,158,11,0.3)',
      title: 'Selisih Rekonsiliasi Ditemukan',
      subtitle: selisihMsg,
      rows: [
        { label: 'Saldo di Sistem', value: fmtRp(totalSistem), color: 'var(--accent2)' },
        { label: 'Saldo Fisik/Bank', value: fmtRp(saldoBank), color: 'var(--text)' },
        { label: 'Selisih', value: fmtRp(Math.abs(selisih)), color: 'var(--accent3)' },
      ],
      warning: '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Akan dibuat jurnal koreksi otomatis untuk menyesuaikan selisih.',
      btnLabel: '✓ Ya, Buat Jurnal Koreksi',
      btnGradient: 'linear-gradient(135deg,#22d3ee,#4ade80)',
    }).then(ok => {
      if(!ok) return;
      addJurnal({
        tanggal: new Date().toISOString().split('T')[0],
        ket: 'Koreksi Rekonsiliasi Kas',
        jenis: 'Manual',
        lines: selisih > 0
          ? [{ akun:'6701', ket:'Selisih kas', debit:Math.abs(selisih), kredit:0 }, { akun:'1101', ket:'Koreksi kas', debit:0, kredit:Math.abs(selisih) }]
          : [{ akun:'1101', ket:'Koreksi kas', debit:Math.abs(selisih), kredit:0 }, { akun:'4203', ket:'Pendapatan Bunga/Koreksi', debit:0, kredit:Math.abs(selisih) }]
      });
      renderDashboard();
      showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal koreksi rekonsiliasi dibuat!');
    });
  });
}

// GLOBAL SEARCH
let searchIdx = -1;

function openGlobalSearch() {
  document.getElementById('global-search-wrap').classList.add('open');
  setTimeout(() => document.getElementById('global-search-input').focus(), 100);
  doGlobalSearch('');
}
function closeGlobalSearch() {
  document.getElementById('global-search-wrap').classList.remove('open');
  document.getElementById('global-search-input').value = '';
  searchIdx = -1;
}

function doGlobalSearch(q) {
  const res = document.getElementById('global-search-results');
  const query = q.toLowerCase().trim();
  const items = [];

  // Menu pages — icon classes mirror the sidebar nav exactly (same icon, no inline color)
  const ic = name => `<i class="ti ti-${name} ti-inline"></i>`;
  const pages = [
    { icon:ic('layout-dashboard'), title:'Dashboard', sub:'Ringkasan keuangan', page:'dashboard' },
    { icon:ic('circle-plus'), title:'Transaksi', sub:'Input transaksi baru', page:'transaksi' },
    { icon:ic('book'), title:'Jurnal Umum', sub:'Semua entri jurnal', page:'jurnal-umum' },
    { icon:ic('cash'), title:'Jurnal Kas', sub:'Mutasi kas', page:'jurnal-kas' },
    { icon:ic('receipt'), title:'Jurnal Penjualan', sub:'Transaksi penjualan', page:'jurnal-penjualan' },
    { icon:ic('shopping-cart'), title:'Jurnal Pembelian', sub:'Transaksi pembelian', page:'jurnal-pembelian' },
    { icon:ic('books'), title:'Buku Besar', sub:'Mutasi per akun', page:'buku-besar' },
    { icon:ic('scale'), title:'Neraca Saldo', sub:'Saldo semua akun', page:'neraca-saldo' },
    { icon:ic('trending-up'), title:'Laba Rugi', sub:'Laporan laba rugi', page:'laba-rugi' },
    { icon:ic('building-bank'), title:'Neraca', sub:'Balance sheet', page:'neraca' },
    { icon:ic('arrows-exchange'), title:'Arus Kas', sub:'Laporan arus kas', page:'arus-kas' },
    { icon:ic('chart-area'), title:'Perubahan Ekuitas', sub:'Laporan perubahan ekuitas', page:'perubahan-ekuitas' },
    { icon:ic('chart-bar'), title:'Analitik', sub:'Grafik analitik bisnis', page:'analitik' },
    { icon:ic('package'), title:'Master Produk', sub:'Daftar produk', page:'produk' },
    { icon:ic('list'), title:'Chart of Accounts', sub:'Daftar akun', page:'akun' },
    { icon:ic('building-factory'), title:'Aset Tetap', sub:'Daftar aset tetap', page:'aset-tetap' },
    { icon:ic('users'), title:'Kontak', sub:'Pelanggan & pemasok', page:'kontak' },
    { icon:ic('building-factory-2'), title:'Kalkulator Penyusutan', sub:'Hitung depresiasi aset', page:'kalk-penyusutan' },
    { icon:ic('package'), title:'Kalkulator Persediaan', sub:'FIFO/LIFO/WA', page:'kalk-persediaan' },
    { icon:ic('chart-candle'), title:'Kalkulator Bunga', sub:'Anuitas, cicilan, PV/FV', page:'kalk-bunga' },
    { icon:ic('ruler'), title:'Kalkulator Rasio', sub:'Analisis rasio keuangan', page:'kalk-rasio' },
    { icon:ic('bolt'), title:'Kalkulator BEP', sub:'Break even point', page:'kalk-bep' },
    { icon:ic('calculator'), title:'PPN & PPh', sub:'Kalkulator pajak', page:'kalk-ppn' },
    { icon:ic('refresh'), title:'Jurnal Berulang', sub:'Template transaksi otomatis', page:'jurnal-berulang' },
    { icon:ic('file-invoice'), title:'Invoice', sub:'Invoice & piutang', page:'invoice' },
    { icon:ic('git-compare'), title:'Rekonsiliasi', sub:'Rekonsiliasi bank', page:'rekonsiliasi' },
    { icon:ic('currency-dollar'), title:'Kurs', sub:'Kurs & multi mata uang', page:'kurs' },
    { icon:ic('bell'), title:'Notifikasi', sub:'Pemberitahuan', page:'notifikasi' },
    { icon:ic('target'), title:'Anggaran', sub:'Anggaran vs aktual', page:'anggaran' },
    { icon:ic('receipt-tax'), title:'Pajak Auto', sub:'Kalkulasi pajak otomatis', page:'pajak' },
    { icon:ic('robot'), title:'Orias Assisten', sub:'AI akuntansi', page:'ai-assistant' },
    { icon:ic('school'), title:'Tutorial', sub:'Panduan penggunaan', page:'tutorial' },
    { icon:ic('shield-check'), title:'Audit Trail', sub:'Riwayat aktivitas', page:'audit-trail' },
  ];

  pages.forEach(p => {
    if(!query || p.title.toLowerCase().includes(query) || p.sub.toLowerCase().includes(query)) {
      items.push({ ...p, type:'page', action: () => { showPage(p.page); closeGlobalSearch(); } });
    }
  });

  // Quick actions — not full pages, trigger a modal/behavior directly
  const actions = [
    { icon:ic('upload'), title:'Export', sub:'Export laporan keuangan', action: () => { openExportModal(); closeGlobalSearch(); } },
    { icon:ic('users'), title:'Kelola Tim', sub:'Manajemen pengguna & izin akses', action: () => { openUserMgmtModal(); closeGlobalSearch(); } },
    { icon:ic('login'), title:'Gabung Bisnis', sub:'Gabung dengan kode undangan', action: () => { openJoinWithCodeModal(); closeGlobalSearch(); } },
  ];
  actions.forEach(a => {
    if(!query || a.title.toLowerCase().includes(query) || a.sub.toLowerCase().includes(query)) {
      items.push({ ...a, type:'aksi' });
    }
  });

  // Journals
  if(query.length >= 2) {
    jurnalEntries.filter(j => j.ket.toLowerCase().includes(query) || j.no.toLowerCase().includes(query))
      .slice(0, 5).forEach(j => {
        const tot = j.lines.reduce((s,l)=>s+(l.debit||0),0);
        items.push({
          icon: jeninsBadge(j.jenis) === 'badge-green' ? '[Invoice]' : '[Jurnal]',
          title: j.ket, sub: `${j.tanggal} · ${j.no} · ${fmtRp(tot)}`,
          type: 'jurnal', badge: j.jenis,
          action: () => { showPage('jurnal-umum'); closeGlobalSearch(); setTimeout(() => { const f=document.getElementById('filter-ju'); if(f){f.value=j.ket.split(' ')[0]; renderJurnalUmum();} }, 100); }
        });
      });

    // Akun
    akuns.filter(a => a.nama.toLowerCase().includes(query) || a.kode.includes(query))
      .slice(0, 4).forEach(a => {
        items.push({
          icon: ic('list'), title: `${a.kode} — ${a.nama}`, sub: `${a.tipe} · ${a.kat}`,
          type: 'akun',
          action: () => { showPage('buku-besar'); closeGlobalSearch(); setTimeout(() => { const h=document.getElementById('bb-akun-filter-val'); const b=document.getElementById('bb-akun-filter-btn'); if(h){h.value=a.kode; if(b){b.innerHTML=`<span class="picker-kode-badge" style="font-family:var(--mono);font-size:11px;background:var(--surface2);border:1px solid var(--border);border-radius:4px;padding:2px 6px;margin-right:6px;">${escapeHtml(a.kode)}</span><span style="flex:1;">${escapeHtml(a.nama)}</span><span class="opt-picker-arrow">▾</span>`;} renderBukuBesar();} }, 100); }
        });
      });
  }

  if(!items.length) {
    res.innerHTML = `<div style="padding:24px;text-align:center;color:var(--muted);font-size:13px;">Tidak ada hasil untuk "${escapeHtml(q)}"</div>`;
    return;
  }

  searchIdx = -1;
  res.innerHTML = items.map((item, i) => `
    <div class="search-result-item" data-idx="${i}" onclick="searchItems[${i}].action()">
      <span class="sri-icon">${item.icon}</span>
      <div class="sri-text">
        <div class="sri-title">${escapeHtml(item.title)}</div>
        <div class="sri-sub">${item.sub}</div>
      </div>
      ${item.badge ? `<span class="badge ${jeninsBadge(item.badge)} sri-badge">${item.badge}</span>` : ''}
      ${item.type==='page' ? '<span style="font-size:10px;color:var(--muted);">Halaman</span>' : ''}
      ${item.type==='aksi' ? '<span style="font-size:10px;color:var(--muted);">Aksi</span>' : ''}
    </div>`).join('');

  // Store items for keyboard nav
  window.searchItems = items;
}

function handleSearchKey(e) {
  const items = document.querySelectorAll('.search-result-item');
  if(e.key === 'ArrowDown') { searchIdx = Math.min(searchIdx+1, items.length-1); highlightSearch(); e.preventDefault(); }
  else if(e.key === 'ArrowUp') { searchIdx = Math.max(searchIdx-1, 0); highlightSearch(); e.preventDefault(); }
  else if(e.key === 'Enter') { if(searchIdx >= 0 && window.searchItems?.[searchIdx]) window.searchItems[searchIdx].action(); }
  else if(e.key === 'Escape') closeGlobalSearch();
}
function highlightSearch() {
  document.querySelectorAll('.search-result-item').forEach((el,i) => el.classList.toggle('active', i===searchIdx));
  const active = document.querySelector('.search-result-item.active');
  if(active) active.scrollIntoView({ block:'nearest' });
}

// KEYBOARD SHORTCUTS
document.addEventListener('keydown', (e) => {
  // Ctrl+K or Cmd+K — Global search
  if((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); openGlobalSearch(); }
  // Ctrl+S — Save
  if((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); manualSave(); }
  // Ctrl+N — New transaction
  if((e.ctrlKey || e.metaKey) && e.key === 'n') { e.preventDefault(); showPage('transaksi'); }
  // Escape — close search if open
  if(e.key === 'Escape') {
    if(document.getElementById('global-search-wrap')?.classList.contains('open')) closeGlobalSearch();
    // Tutup tutorial selesai dengan Escape
    const tutComplete = document.getElementById('tut-complete');
    if(tutComplete && tutComplete.style.display !== 'none') tutComplete.style.display = 'none';
  }
});

// PERIOD FILTER SHOW/HIDE
document.getElementById('dash-filter-period')?.addEventListener('change', function() {
  const cr = document.getElementById('dash-custom-range');
  if(this.value === 'custom') cr?.classList.add('show');
  else cr?.classList.remove('show');
});

// FILTER PERIOD ON REPORTS
// Add period filter to laporan pages
function addPeriodFilterToReports() {
  ['laba-rugi','neraca-saldo','neraca'].forEach(id => {
    const page = document.getElementById('page-'+id);
    if(!page || page.querySelector('.report-period-filter')) return;
    const filterDiv = document.createElement('div');
    filterDiv.className = 'filter-bar report-period-filter';
    filterDiv.style.marginBottom = '14px';
    filterDiv.innerHTML = `
      <select class="report-period-sel" onchange="renderReportWithPeriod('${id}', this.value)"
        style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:7px 12px;color:var(--text);font-size:13px;font-family:var(--sans);">
        <option value="all">Semua Periode</option>
        <option value="this-month">Bulan Ini</option>
        <option value="last-month">Bulan Lalu</option>
        <option value="this-quarter">Kuartal Ini</option>
        <option value="this-year">Tahun Ini</option>
      </select>
      <span class="report-period-label" style="font-size:12px;color:var(--accent2);font-family:var(--mono);"></span>
    `;
    const header = page.querySelector('.section-header');
    if(header) header.after(filterDiv);
    else page.prepend(filterDiv);
  });
}

// ══════════════════════════════════════════════════════════
// PRIORITAS 5 — REKAP PAJAK SIAP SETOR
// ══════════════════════════════════════════════════════════

function initRekapPajakBulanSelect() {
  const sel = document.getElementById('pajak-setor-bulan');
  if(!sel) return;
  const now = new Date();
  sel.innerHTML = '';
  const monthNames = [];
  for(let i=0; i<12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const lbl = d.toLocaleDateString('id-ID',{month:'long',year:'numeric'});
    const opt = document.createElement('option');
    opt.value = val; opt.textContent = lbl;
    if(i===0) opt.selected = true;
    sel.appendChild(opt);
    monthNames.push({ val, lbl });
  }
  // Sync label to opt-picker button
  const btnLbl = document.getElementById('pajak-setor-bulan-label');
  if(btnLbl && monthNames.length) btnLbl.textContent = monthNames[0].lbl;
  renderRekapSiapSetor();
}

function openPajakBulanPicker() {
  const sel = document.getElementById('pajak-setor-bulan');
  if(!sel) return;
  const options = Array.from(sel.options).map(o => ({ value: o.value, label: o.textContent }));
  openOptPicker({
    title: 'Pilih Periode Pajak',
    options,
    currentValue: sel.value,
    onSelect: (val, lbl) => {
      sel.value = val;
      const btnLbl = document.getElementById('pajak-setor-bulan-label');
      if(btnLbl) btnLbl.textContent = lbl;
      renderRekapSiapSetor();
    }
  });
}

function renderRekapSiapSetor() {
  const bln = document.getElementById('pajak-setor-bulan')?.value;
  const el  = document.getElementById('rekap-setor-content');
  if(!el || !bln) return;

  const [y,m] = bln.split('-').map(Number);
  const fromStr = `${y}-${String(m).padStart(2,'0')}-01`;
  const toStr   = new Date(y, m, 0).toISOString().split('T')[0];
  const blnLabel = new Date(y, m-1, 1).toLocaleDateString('id-ID',{month:'long',year:'numeric'});

  const penjEntries = jurnalEntries.filter(j => j.jenis==='Penjualan' && j.tanggal>=fromStr && j.tanggal<=toStr);
  const beliEntries = jurnalEntries.filter(j => j.jenis==='Pembelian' && j.tanggal>=fromStr && j.tanggal<=toStr);

  const totalDPPKeluar = penjEntries.reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const a=akuns.find(x=>x.kode===l.akun);return ss+(a?.tipe==='Pendapatan'?l.kredit:0);},0),0);
  const totalDPPMasuk  = beliEntries.reduce((s,j)=>s+j.lines.reduce((ss,l)=>{const a=akuns.find(x=>x.kode===l.akun);return ss+(['HPP','Beban'].includes(a?.tipe)?l.debit:0);},0),0);
  const ppnKeluar  = totalDPPKeluar * 0.12;
  const ppnMasuk   = totalDPPMasuk  * 0.12;
  const kurangBayar = ppnKeluar - ppnMasuk;

  // Estimasi PPh Badan (25% dari laba bersih)
  let laba = 0;
  jurnalEntries.filter(j=>j.tanggal>=fromStr&&j.tanggal<=toStr).forEach(j=>j.lines.forEach(l=>{
    const a=akuns.find(x=>x.kode===l.akun);
    if(a?.tipe==='Pendapatan') laba += l.kredit||0;
    if(['Beban','HPP'].includes(a?.tipe)) laba -= l.debit||0;
  }));
  const pphBadan = Math.max(0, laba * 0.22);

  el.innerHTML = `
    <div style="border:2px solid var(--accent2);border-radius:12px;overflow:hidden;margin-bottom:16px;">
      <div style="background:rgba(34,211,238,0.08);padding:12px 16px;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:14px;font-weight:700;">SPT Masa PPN · ${blnLabel}</div>
        <span style="font-size:11px;color:var(--muted);">Formulir 1111</span>
      </div>
      <div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;font-weight:600;">BAGIAN I — PENYERAHAN BKP/JKP</div>
            <div style="background:var(--surface2);border-radius:8px;padding:10px 12px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:12px;color:var(--muted);">Jumlah Transaksi</span>
                <span style="font-weight:600;">${penjEntries.length} faktur</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:12px;color:var(--muted);">DPP</span>
                <span style="font-family:var(--mono);font-size:13px;">${fmtRp(totalDPPKeluar)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid var(--border);">
                <span style="font-size:12px;font-weight:700;">PPN Keluaran</span>
                <span style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--red);">${fmtRp(ppnKeluar)}</span>
              </div>
            </div>
          </div>
          <div>
            <div style="font-size:11px;color:var(--muted);margin-bottom:4px;font-weight:600;">BAGIAN II — PEROLEHAN BKP/JKP</div>
            <div style="background:var(--surface2);border-radius:8px;padding:10px 12px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:12px;color:var(--muted);">Jumlah Transaksi</span>
                <span style="font-weight:600;">${beliEntries.length} faktur</span>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span style="font-size:12px;color:var(--muted);">DPP</span>
                <span style="font-family:var(--mono);font-size:13px;">${fmtRp(totalDPPMasuk)}</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding-top:6px;border-top:1px solid var(--border);">
                <span style="font-size:12px;font-weight:700;">PPN Masukan</span>
                <span style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--accent);">${fmtRp(ppnMasuk)}</span>
              </div>
            </div>
          </div>
        </div>
        <div style="background:${kurangBayar>0?'rgba(248,113,113,0.08)':'rgba(74,222,128,0.08)'};border:1px solid ${kurangBayar>0?'rgba(248,113,113,0.3)':'rgba(74,222,128,0.3)'};border-radius:8px;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-size:12px;color:var(--muted);margin-bottom:2px;">${kurangBayar>0?'PPN KURANG BAYAR (WAJIB SETOR)':'PPN LEBIH BAYAR (DAPAT DIKOMPENSASI)'}</div>
            <div style="font-size:11px;color:var(--muted);">Batas setor: tgl 15 bulan berikutnya</div>
          </div>
          <div style="font-family:var(--mono);font-size:22px;font-weight:800;color:${kurangBayar>0?'var(--red)':'var(--accent)'};">${fmtRp(Math.abs(kurangBayar))}</div>
        </div>
      </div>
    </div>

    <div style="border:1px solid var(--border);border-radius:12px;overflow:hidden;margin-bottom:16px;">
      <div style="background:var(--surface2);padding:10px 16px;">
        <div style="font-size:14px;font-weight:700;">Estimasi PPh Badan · ${blnLabel}</div>
      </div>
      <div style="padding:14px 16px;display:flex;flex-direction:column;gap:8px;">
        ${[
          ['Penghasilan Bruto', totalDPPKeluar, 'var(--accent)'],
          ['Biaya-biaya', totalDPPMasuk, 'var(--red)'],
          ['Laba Bersih Estimasi', laba, laba>=0?'var(--text)':'var(--red)'],
          ['Estimasi PPh Badan (22%)', pphBadan, 'var(--accent3)'],
        ].map(([l,v,clr])=>`
          <div style="display:flex;justify-content:space-between;">
            <span style="font-size:13px;color:var(--muted);">${l}</span>
            <span style="font-family:var(--mono);font-size:13px;font-weight:600;color:${clr};">${fmtRp(v)}</span>
          </div>`).join('')}
        <div style="margin-top:4px;font-size:11px;color:var(--muted);background:rgba(245,158,11,0.07);border-radius:6px;padding:8px 10px;">
          ⚠️ Estimasi saja. Konsultasikan dengan akuntan/konsultan pajak untuk perhitungan resmi.
        </div>
      </div>
    </div>`;
}

function exportRekapPajakPDF() {
  showAlert('Fitur cetak PDF rekap pajak akan tersedia setelah data terisi. Gunakan Ctrl+P untuk mencetak.');
}

// ── Patch showPage to init produk & pajak pages ──
(function(){
  const _orig = showPage;
  window.showPage = function(id) {
    _orig(id);
    if(id==='produk') {
      showOpSpinner('Memuat Master Produk...');
      setTimeout(() => { try { renderProduk(); } catch(e) { console.error(e); } finally { hideOpSpinner(); } }, 200);
    }
    if(id==='pajak')  { setTimeout(initRekapPajakBulanSelect, 100); }
  };
})();

// ── Patch renderDashboard to include beban & pajak ──
(function(){
  const _origDash = renderDashboard;
  window.renderDashboard = function() {
    _origDash();
    renderDashBebanPajak();
  };
})();

// ── Patch renderRekapSiapSetor to use spinner ──
(function(){
  const _origRekap = renderRekapSiapSetor;
  window.renderRekapSiapSetor = function() {
    showOpSpinner('Menghitung rekap pajak...');
    setTimeout(() => { _origRekap(); hideOpSpinner(); }, 300);
  };
})();

// ── Init Mode Cepat default date ──
document.addEventListener('DOMContentLoaded', () => {
  // tanggal tidak auto-fill — user wajib pilih sendiri
  // Ensure simpel tab is default hidden (kas tab active in original)
  const simpelDiv = document.getElementById('trx-simpel');
  if(simpelDiv) simpelDiv.style.display = 'block'; // shown since it's the active tab now
});
