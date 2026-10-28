// ═══════════════════════════════════════════════════════════
// UMUR PIUTANG — tampilan tabel per pelanggan (task 2.3).
// Perhitungan ada di 24-aging.js (hitungAging); file ini hanya menyusun HTML.
// agingPiutangHtml(hasil) murni (bergantung pada escapeHtml & rp saja) dan diuji di
// tests/aging-ui.test.js. renderAgingPiutang() membaca invoiceList + #aging-acuan.
// Ekspor (task 2.4): agingCsv(hasil) dan agingCetakHtml(hasil, namaPerusahaan) juga murni dan diuji;
// exportAgingPiutangCSV() / cetakAgingPiutang() yang menyentuh browser.
// Dipanggil dari showPage('umur-piutang') (04-navigasi-tema.js). Dimuat setelah 24-aging.js.
// ═══════════════════════════════════════════════════════════

// 'YYYY-MM-DD' menurut jam lokal perangkat (toISOString memakai UTC → salah hari sebelum jam 07.00 WIB).
function agingHariIni() {
  const d = new Date();
  const p = n => String(n).padStart(2, '0');
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

const _AGING_KOLOM = [
  ['lancar', 'Belum JT', 'var(--text)'],
  ['b0_30', '1–30 hari', 'var(--accent2)'],
  ['b31_60', '31–60 hari', 'var(--accent3)'],
  ['b61_90', '61–90 hari', 'var(--accent3)'],
  ['b90plus', '>90 hari', 'var(--red)']
];

// hasil: keluaran hitungAging(). Mengembalikan string <table> atau pesan kosong.
function agingPiutangHtml(hasil) {
  const sel = (v, warna, tebal) => v > 0
    ? `<td style="font-family:var(--mono);text-align:right;color:${warna};${tebal ? 'font-weight:700;' : ''}">${rp(v)}</td>`
    : `<td style="text-align:right;color:var(--muted);">–</td>`;
  let html = '';
  if (!hasil.perKontak.length) {
    html = '<div style="padding:24px 16px;text-align:center;color:var(--muted);font-size:13px;">Tidak ada piutang belum lunas pada tanggal acuan ini.</div>';
  } else {
    const kepala = _AGING_KOLOM.map(k => `<th style="text-align:right;">${k[1]}</th>`).join('');
    const baris = hasil.perKontak.map((k, i) => {
      const detail = k.dokumen.map(d => `<tr>
        <td style="font-family:var(--mono);font-size:11px;">${escapeHtml(d.no || '-')}</td>
        <td style="font-size:11px;">JT ${escapeHtml(String(d.jatuhTempo || '').slice(0, 10))}</td>
        <td style="font-size:11px;color:${d.umur > 0 ? 'var(--red)' : 'var(--muted)'};">${d.umur > 0 ? 'telat ' + d.umur + ' hari' : 'belum jatuh tempo'}</td>
        <td style="font-family:var(--mono);font-size:11px;text-align:right;">${rp(d.sisa)}</td></tr>`).join('');
      return `<tr style="cursor:pointer;" onclick="toggleAgingDetail(${i})" title="Klik untuk lihat rincian invoice">
        <td><i class="ti ti-chevron-right" id="aging-chev-${i}" style="font-size:12px;margin-right:4px;"></i>${escapeHtml(k.kontak)} <span style="color:var(--muted);font-size:11px;">(${k.dokumen.length})</span></td>
        ${_AGING_KOLOM.map(c => sel(k[c[0]], c[2], c[0] === 'b90plus')).join('')}
        <td style="font-family:var(--mono);text-align:right;font-weight:600;">${rp(k.total)}</td></tr>
        <tr id="aging-det-${i}" style="display:none;background:var(--surface2);"><td colspan="7" style="padding:6px 16px 10px 32px;">
          <table style="width:100%;"><tbody>${detail}</tbody></table></td></tr>`;
    }).join('');
    const t = hasil.total;
    const persen = t.total > 0 ? ' <span style="color:var(--muted);font-size:11px;">(' + Math.round(t.b90plus / t.total * 100) + '% &gt;90 hari)</span>' : '';
    const t0 = hasil.total;
    const lewat = t0.b0_30 + t0.b31_60 + t0.b61_90 + t0.b90plus;
    const ringkas = `<div class="aging-ringkas">
      <div><div class="lbl">Total piutang</div><div class="val">${rp(t0.total)}</div></div>
      <div><div class="lbl">Lewat jatuh tempo</div><div class="val" style="color:${lewat > 0 ? 'var(--red)' : 'var(--muted)'};">${rp(lewat)}</div></div></div>`;
    const kartu = '<div class="aging-kartu">' + hasil.perKontak.map((k, i) => {
      const chips = _AGING_KOLOM.filter(c => k[c[0]] > 0).map(c => `<span class="aging-chip" style="color:${c[2]};">${c[1]} · ${rp(k[c[0]])}</span>`).join('');
      const rinci = k.dokumen.map(d => `<div><span style="font-family:var(--mono);">${escapeHtml(d.no || '-')}</span><span style="color:${d.umur > 0 ? 'var(--red)' : 'var(--muted)'};">${d.umur > 0 ? 'telat ' + d.umur + ' hari' : 'belum JT'}</span><span style="font-family:var(--mono);">${rp(d.sisa)}</span></div>`).join('');
      return `<div class="aging-kartu-item" onclick="toggleAgingDetail(${i})">
        <div class="aging-kartu-head"><span class="aging-kartu-nama"><i class="ti ti-chevron-right" id="aging-kchev-${i}" style="font-size:12px;margin-right:4px;"></i>${escapeHtml(k.kontak)} <span style="color:var(--muted);font-size:11px;font-weight:400;">(${k.dokumen.length})</span></span><span class="aging-kartu-total">${rp(k.total)}</span></div>
        <div class="aging-chips">${chips}</div>
        <div class="aging-kartu-det" id="aging-kdet-${i}">${rinci}</div></div>`;
    }).join('') + '</div>';
    html = `<div class="table-scroll aging-tabel"><table id="aging-piutang-table">
      <thead><tr><th>Pelanggan</th>${kepala}<th style="text-align:right;">Total</th></tr></thead>
      <tbody>${baris}</tbody>
      <tfoot><tr style="font-weight:700;border-top:2px solid var(--border);"><td>Total${persen}</td>
        ${_AGING_KOLOM.map(c => `<td style="font-family:var(--mono);text-align:right;">${rp(t[c[0]])}</td>`).join('')}
        <td style="font-family:var(--mono);text-align:right;">${rp(t.total)}</td></tr></tfoot>
    </table></div>`;
    html = ringkas + html + kartu;
  }
  if (hasil.tidakValid.length) {
    html += `<div style="padding:10px 16px;font-size:12px;color:var(--accent3);">${hasil.tidakValid.length} invoice tidak ikut dihitung karena tanggal tidak valid.</div>`;
  }
  return html;
}

const _agingBuka = {};
function toggleAgingDetail(i) {
  const buka = !_agingBuka[i];
  _agingBuka[i] = buka;
  const row = document.getElementById('aging-det-' + i), kdet = document.getElementById('aging-kdet-' + i);
  if (row) row.style.display = buka ? 'table-row' : 'none';
  if (kdet) kdet.style.display = buka ? 'block' : 'none';
  ['aging-chev-', 'aging-kchev-'].forEach(p => { const c = document.getElementById(p + i); if (c) c.style.transform = buka ? 'rotate(90deg)' : ''; });
}

// Hasil hitungAging untuk invoiceList + tanggal di #aging-acuan (kosong/tidak valid -> hari ini).
function _agingHasilSaatIni() {
  const inp = document.getElementById('aging-acuan');
  let acuan = inp && inp.value ? inp.value : agingHariIni();
  try { return hitungAging(invoiceList, acuan); }
  catch (e) { acuan = agingHariIni(); return hitungAging(invoiceList, acuan); }
  finally { if (inp) inp.value = acuan; }
}

function renderAgingPiutang() {
  const el = document.getElementById('aging-piutang-body'); if (!el) return;
  el.removeAttribute('style');
  Object.keys(_agingBuka).forEach(k => delete _agingBuka[k]);
  el.innerHTML = agingPiutangHtml(_agingHasilSaatIni());
}

// ── Ekspor CSV & cetak (task 2.4) ────────────────────────────

// Sel CSV: kutip ganda; awalan = + - @ diberi ' agar tidak dibaca sebagai rumus di Excel/Sheets.
function _agingSel(v) {
  let t = String(v === null || v === undefined ? '' : v);
  if (/^[=+\-@\t\r]/.test(t) && typeof v !== 'number') t = "'" + t;
  return '"' + t.replace(/"/g, '""') + '"';
}

// Dua bagian: ringkasan per pelanggan (+ baris total) lalu rincian per invoice. Angka mentah (tanpa 'Rp').
function agingCsv(hasil) {
  const baris = a => a.map(_agingSel).join(',');
  const lab = _AGING_KOLOM.map(k => k[1]);
  const out = [baris(['UMUR PIUTANG per ' + hasil.tanggalAcuan]), baris(['Pelanggan', ...lab, 'Total'])];
  hasil.perKontak.forEach(k => out.push(baris([k.kontak, ..._AGING_KOLOM.map(c => k[c[0]]), k.total])));
  out.push(baris(['TOTAL', ..._AGING_KOLOM.map(c => hasil.total[c[0]]), hasil.total.total]));
  out.push('', baris(['RINCIAN INVOICE']), baris(['Pelanggan', 'No Invoice', 'Jatuh Tempo', 'Umur (hari lewat JT)', 'Kelompok', 'Sisa Tagihan']));
  hasil.perKontak.forEach(k => k.dokumen.forEach(d => out.push(baris([
    k.kontak, d.no, String(d.jatuhTempo || '').slice(0, 10), d.umur,
    (_AGING_KOLOM.find(c => c[0] === d.bucket) || [0, d.bucket])[1], d.sisa]))));
  return out.join('\n');
}

function _agingTgl(s) { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s); }

// Dokumen HTML lengkap siap cetak: ringkasan + rincian semua invoice (hitam-putih, A4 landscape).
function agingCetakHtml(hasil, namaPerusahaan) {
  const n = v => v > 0 ? Math.round(v).toLocaleString('id-ID') : '–';
  const th = '<th style="text-align:right">';
  const ringkas = hasil.perKontak.map(k => `<tr><td>${escapeHtml(k.kontak)}</td>${_AGING_KOLOM.map(c => '<td class="n">' + n(k[c[0]]) + '</td>').join('')}<td class="n b">${n(k.total)}</td></tr>`).join('');
  const rinci = hasil.perKontak.map(k => `<tr class="grp"><td colspan="5">${escapeHtml(k.kontak)}</td></tr>` +
    k.dokumen.map(d => `<tr><td>${escapeHtml(d.no || '-')}</td><td>${escapeHtml(_agingTgl(String(d.jatuhTempo || '').slice(0, 10)))}</td><td class="n">${d.umur > 0 ? d.umur + ' hari' : 'belum JT'}</td><td>${escapeHtml((_AGING_KOLOM.find(c => c[0] === d.bucket) || [0, ''])[1])}</td><td class="n">${n(d.sisa)}</td></tr>`).join('')).join('');
  const kosong = hasil.perKontak.length ? '' : '<p>Tidak ada piutang belum lunas pada tanggal acuan ini.</p>';
  const t = hasil.total;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Umur Piutang ${escapeHtml(_agingTgl(hasil.tanggalAcuan))}</title><style>
@page{size:A4 landscape;margin:14mm}body{font-family:Arial,sans-serif;font-size:12px;color:#111}
h2,p.sub{text-align:center;margin:2px 0}p.sub{color:#555;font-size:11px;margin-bottom:14px}h3{margin:18px 0 6px;font-size:13px}
table{width:100%;border-collapse:collapse}th,td{padding:5px 8px;border-bottom:1px solid #ccc;text-align:left}th{background:#f1f1f1}
td.n{text-align:right;font-variant-numeric:tabular-nums}.b{font-weight:700}tfoot td{font-weight:700;border-top:2px solid #333}
tr.grp td{background:#fafafa;font-weight:600}tr{page-break-inside:avoid}</style></head><body>
<h2>${escapeHtml(namaPerusahaan || 'Perusahaan')}</h2><p class="sub">Umur Piutang per ${escapeHtml(_agingTgl(hasil.tanggalAcuan))} · dihitung dari jatuh tempo · dalam Rupiah</p>${kosong}
${hasil.perKontak.length ? `<table><thead><tr><th>Pelanggan</th>${_AGING_KOLOM.map(c => th + c[1] + '</th>').join('')}${th}Total</th></tr></thead><tbody>${ringkas}</tbody>
<tfoot><tr><td>Total</td>${_AGING_KOLOM.map(c => '<td class="n">' + n(t[c[0]]) + '</td>').join('')}<td class="n">${n(t.total)}</td></tr></tfoot></table>
<h3>Rincian Invoice</h3><table><thead><tr><th>No Invoice</th><th>Jatuh Tempo</th>${th}Umur</th><th>Kelompok</th>${th}Sisa</th></tr></thead><tbody>${rinci}</tbody></table>` : ''}
</body></html>`;
}

function exportAgingPiutangCSV() {
  const hasil = _agingHasilSaatIni();
  if (!hasil.perKontak.length) { showAlert('Tidak ada piutang belum lunas untuk diekspor.'); return; }
  const blob = new Blob(['\uFEFF' + agingCsv(hasil)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'umur-piutang-' + hasil.tanggalAcuan + '.csv';
  a.click(); URL.revokeObjectURL(url);
  if (typeof auditLog === 'function') auditLog('export', 'system', 'Export umur piutang CSV — ' + hasil.perKontak.length + ' pelanggan');
}

function cetakAgingPiutang() {
  const hasil = _agingHasilSaatIni();
  if (!hasil.perKontak.length) { showAlert('Tidak ada piutang belum lunas untuk dicetak.'); return; }
  const profil = JSON.parse(localStorage.getItem('oas_profil') || localStorage.getItem('oas_profil_v1') || '{}');
  const nama = profil.nama || (typeof currentCompany !== 'undefined' && currentCompany && currentCompany.name) || 'Perusahaan';
  const win = window.open('', '_blank');
  if (!win) { showAlert('Pop-up diblokir browser. Izinkan pop-up untuk situs ini lalu coba lagi.'); return; }
  win.document.write(agingCetakHtml(hasil, nama)); win.document.close();
  setTimeout(() => win.print(), 500);
}
