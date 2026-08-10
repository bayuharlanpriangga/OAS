
function deteksiPenyesuaianOtomatis() {
  if (!jurnalEntries.length) {
    showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Belum ada jurnal yang tercatat. Input transaksi dulu!');
    return;
  }
  showOpSpinner('Menganalisis Jurnal...', 'Memindai & mendeteksi yang perlu disesuaikan');

  setTimeout(() => {
    _autoDetectResults = [];
    const today = new Date();
    const periodeAktif = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
    const idSet = new Set(); // FIX BUG 1: dedup — satu ID hanya boleh muncul sekali

    // ── Helpers ─────────────────────────────────────────────
    /** Saldo bersih akun dari semua jurnal (debit - kredit) */
    function getSaldoDebit(kode) {
      let s = 0;
      jurnalEntries.forEach(j => j.lines.forEach(l => {
        if (l.akun === kode) s += (l.debit||0) - (l.kredit||0);
      }));
      return s;
    }
    /** Saldo kredit bersih (untuk akun liabilitas) */
    function getSaldoKredit(kode) {
      let s = 0;
      jurnalEntries.forEach(j => j.lines.forEach(l => {
        if (l.akun === kode) s += (l.kredit||0) - (l.debit||0);
      }));
      return s;
    }
    /** Cek apakah sudah ada jurnal penyesuaian bulan ini yang menyentuh akun tertentu */
    function sudahAdaAdjAkun(kodeAkun) {
      return jurnalEntries.some(j =>
        j.tanggal?.startsWith(periodeAktif) &&
        (j.jenis === 'Penyesuaian' || j.no?.startsWith('ADJ') || j.ket?.toLowerCase().includes('penyesuaian')) &&
        j.lines.some(l => l.akun === kodeAkun)
      );
    }
    /** Tambah hasil hanya jika ID unik */
    function push(item) {
      if (idSet.has(item.id)) return;
      idSet.add(item.id);
      _autoDetectResults.push(item);
    }

    // ── 1. BEBAN DIBAYAR DIMUKA (akun 1601) ─────────────────
    const saldoBDD = getSaldoDebit('1601');
    if (saldoBDD > 10000 && !sudahAdaAdjAkun('1601')) {
      // Cari semua jurnal masuk ke akun 1601
      const masukList = jurnalEntries.filter(j => j.lines.some(l => l.akun==='1601' && (l.debit||0)>0));
      // Ambil yang paling besar (kemungkinan pembayaran terbaru)
      const jTerbaru = masukList.sort((a,b) => (b.tanggal||'') > (a.tanggal||'') ? 1:-1)[0];
      if (jTerbaru) {
        const nilaiAwal = jTerbaru.lines.find(l=>l.akun==='1601'&&l.debit>0)?.debit || saldoBDD;
        const tglMasuk = new Date(jTerbaru.tanggal);
        const bulanBerlalu = Math.max(1,
          (today.getFullYear()-tglMasuk.getFullYear())*12 + (today.getMonth()-tglMasuk.getMonth())
        );
        const perBulan = Math.round(nilaiAwal / 12);
        const nilaiSesuaikan = Math.min(perBulan, saldoBDD); // hanya 1 bulan, bukan kumulatif
        if (nilaiSesuaikan > 0) {
          push({
            id: 'adj_bdd',
            tipe: 'beban_dibayar_dimuka',
            level: 'warning',
            judul: '📅 Beban Dibayar Dimuka Belum Diakui',
            deskripsi: `Akun <b>1601 — Biaya Dibayar Dimuka</b> saldo <b>${rp(saldoBDD)}</b>. Dibayar ${jTerbaru.tanggal} senilai <b>${rp(nilaiAwal)}</b>. Estimasi beban bulan ini: <b>${rp(nilaiSesuaikan)}</b> (1/12 nilai).`,
            alasan: 'Biaya dibayar dimuka diakui sebagai beban pada periode yang dinikmati (matching principle).',
            nilaiSuggested: nilaiSesuaikan,
            lines: [
              { akun:'6201', ket:'Beban Dibayar Dimuka (terpakai)', debit: nilaiSesuaikan, kredit: 0 },
              { akun:'1601', ket:'Biaya Dibayar Dimuka (dikurangi)', debit: 0, kredit: nilaiSesuaikan }
            ],
            checked: false, perluInput: true
          });
        }
      }
    }

    // ── 2. PENDAPATAN DITERIMA DIMUKA (2201, 2202) ───────────
    [
      {kode:'2201', nama:'Pendapatan Diterima Dimuka'},
      {kode:'2202', nama:'Uang Muka Penjualan'},
    ].forEach(({kode, nama}) => {
      const saldo = getSaldoKredit(kode);
      if (saldo > 10000 && !sudahAdaAdjAkun(kode)) {
        const perBulan = Math.round(saldo / 12);
        const nilaiEarned = Math.min(perBulan, saldo);
        if (nilaiEarned > 0) {
          push({
            id: 'adj_pdd_' + kode,
            tipe: 'pendapatan_diterima_dimuka',
            level: 'info',
            judul: `💰 ${nama} Harus Diakui`,
            deskripsi: `Akun <b>${kode} — ${nama}</b> saldo <b>${rp(saldo)}</b>. Estimasi yang sudah earned bulan ini: <b>${rp(nilaiEarned)}</b>.`,
            alasan: 'Pendapatan diterima dimuka dipindahkan ke akun pendapatan saat jasa/produk sudah diserahkan.',
            nilaiSuggested: nilaiEarned,
            lines: [
              { akun: kode,   ket: nama + ' (diakui bulan ini)', debit: nilaiEarned, kredit: 0 },
              { akun: '4101', ket: 'Pendapatan Jasa/Penjualan',  debit: 0, kredit: nilaiEarned }
            ],
            checked: false, perluInput: true
          });
        }
      }
    });

    // ── 3. PENYUSUTAN ASET TETAP ─────────────────────────────
    // FIX BUG 2: akun beban penyusutan harus sesuai aset, bukan hardcode 6303
    // FIX BUG 2: penyusutan hanya dari aset tetap sesungguhnya, BUKAN dari perlengkapan
    const asetTetapPairs = [
      {aset:'1702', akum:'1703', beban:'6301', nama:'Bangunan',            umur:20},
      {aset:'1711', akum:'1712', beban:'6302', nama:'Kendaraan',           umur:5},
      {aset:'1721', akum:'1722', beban:'6303', nama:'Peralatan Kantor',    umur:5},
      {aset:'1731', akum:'1732', beban:'6304', nama:'Mesin & Produksi',    umur:10},
      {aset:'1741', akum:'1742', beban:'6305', nama:'Inventaris & Furnitur',umur:8},
      {aset:'1751', akum:'1752', beban:'6305', nama:'Komputer & Laptop',   umur:4},
    ];
    asetTetapPairs.forEach(({aset, akum, beban, nama, umur}) => {
      const nilaiAset = getSaldoDebit(aset);
      if (nilaiAset < 500000) return; // skip jika tidak ada aset ini
      if (sudahAdaAdjAkun(akum)) return; // sudah ada penyusutan bulan ini untuk aset ini
      const penyBulan = Math.round(nilaiAset / (umur * 12));
      if (penyBulan <= 0) return;
      push({
        id: 'adj_peny_' + aset,
        tipe: 'penyusutan',
        level: 'warning',
        judul: `[Penyusutan] Penyusutan ${nama} Belum Dicatat`,
        deskripsi: `Aset <b>${aset} — ${nama}</b> senilai <b>${rp(nilaiAset)}</b>. Umur ${umur} tahun → penyusutan garis lurus <b>${rp(penyBulan)}/bulan</b>. Bulan ${periodeAktif} belum ada.`,
        alasan: 'Penyusutan dicatat tiap bulan agar nilai aset di neraca akurat (accrual basis).',
        nilaiSuggested: penyBulan,
        lines: [
          { akun: beban, ket: `Beban Penyusutan ${nama}`,        debit: penyBulan, kredit: 0 },
          { akun: akum,  ket: `Akumulasi Penyusutan ${nama}`,    debit: 0,         kredit: penyBulan }
        ],
        checked: true
      });
    });

    // ── 4. PEMAKAIAN PERLENGKAPAN (1401, 1402) ───────────────
    // FIX BUG 2: akun beban perlengkapan = 6205, BUKAN 6302
    [
      {kode:'1401', beban:'6205', nama:'Perlengkapan Kantor'},
      {kode:'1402', beban:'6205', nama:'Perlengkapan Toko'},
    ].forEach(({kode, beban, nama}) => {
      const saldo = getSaldoDebit(kode);
      if (saldo < 10000) return;
      if (sudahAdaAdjAkun(kode)) return;
      const estimasi = Math.round(saldo * 0.3); // estimasi 30%, perlu diisi manual
      push({
        id: 'adj_perlengkapan_' + kode,
        tipe: 'perlengkapan',
        level: 'info',
        judul: `<i class="ti ti-package" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Pemakaian ${nama} Belum Disesuaikan`,
        deskripsi: `Akun <b>${kode} — ${nama}</b> saldo <b>${rp(saldo)}</b>. Perlengkapan yang terpakai harus diakui sebagai beban. Isi nilai yang benar-benar terpakai bulan ini.`,
        alasan: 'Perlengkapan yang sudah digunakan dipindahkan ke Beban Perlengkapan agar saldo neraca akurat.',
        nilaiSuggested: estimasi,
        lines: [
          { akun: beban, ket: `Beban Perlengkapan Terpakai`,  debit: estimasi, kredit: 0 },
          { akun: kode,  ket: `${nama} (terpakai)`,           debit: 0,        kredit: estimasi }
        ],
        checked: false, perluInput: true
      });
    });

    // ── 5. BEBAN AKRUAL (gaji/listrik/sewa belum dicatat) ────
    const bebanRutin = [
      { kode:'6101', nama:'Beban Gaji & Upah',   utang:'2101' },
      { kode:'6201', nama:'Beban Listrik & Air',  utang:'2104' },
      { kode:'6205', nama:'Beban Sewa',           utang:'2104' },
    ];
    bebanRutin.forEach(({kode, nama, utang}) => {
      const pernahAda = jurnalEntries.some(j =>
        j.tanggal && !j.tanggal.startsWith(periodeAktif) &&
        j.lines.some(l => l.akun===kode && (l.debit||0)>0)
      );
      const sudahBulanIni = jurnalEntries.some(j =>
        j.tanggal?.startsWith(periodeAktif) &&
        j.lines.some(l => l.akun===kode && (l.debit||0)>0)
      );
      if (!pernahAda || sudahBulanIni) return;
      // Rata-rata dari entri sebelumnya (maks 6 bulan, bagi 3)
      const totalHistori = jurnalEntries
        .filter(j => !j.tanggal?.startsWith(periodeAktif) && j.lines.some(l=>l.akun===kode))
        .slice(-6)
        .reduce((s,j)=>s+j.lines.filter(l=>l.akun===kode).reduce((ss,l)=>ss+(l.debit||0),0),0);
      const rataRata = Math.round(totalHistori / 3) || 0;
      if (rataRata <= 0) return;
      push({
        id: 'adj_akrual_' + kode,
        tipe: 'beban_akrual',
        level: 'warning',
        judul: `💼 ${nama} Bulan Ini Belum Dicatat`,
        deskripsi: `Akun <b>${kode} — ${nama}</b> biasanya ada setiap bulan tapi bulan <b>${periodeAktif}</b> belum ada. Rata-rata historis: <b>${rp(rataRata)}</b>.`,
        alasan: 'Beban yang sudah terjadi tapi belum dibayar dicatat sebagai utang akrual agar laporan laba rugi akurat.',
        nilaiSuggested: rataRata,
        lines: [
          { akun: kode,  ket: nama + ' (akrual)',                   debit: rataRata, kredit: 0 },
          { akun: utang, ket: 'Utang ' + nama.replace('Beban ',''), debit: 0,        kredit: rataRata }
        ],
        checked: false, perluInput: true
      });
    });

    // ── 6. CADANGAN KERUGIAN PIUTANG ─────────────────────────
    const saldoPiutang = getSaldoDebit('1201');
    const saldoCadangan = getSaldoKredit('1203');
    if (saldoPiutang > 1000000 && !sudahAdaAdjAkun('1203')) {
      const cadanganIdeal = Math.round(saldoPiutang * 0.02);
      const selisih = cadanganIdeal - saldoCadangan;
      if (selisih > 0) {
        push({
          id: 'adj_cadangan_piutang',
          tipe: 'cadangan_piutang',
          level: 'info',
          judul: '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Cadangan Kerugian Piutang Kurang',
          deskripsi: `Piutang <b>${rp(saldoPiutang)}</b>, cadangan baru <b>${rp(saldoCadangan)}</b>. Standar 2% = <b>${rp(cadanganIdeal)}</b>. Perlu tambah: <b>${rp(selisih)}</b>.`,
          alasan: 'Konservatisme: estimasi piutang tak tertagih dicatat sebagai beban kerugian.',
          nilaiSuggested: selisih,
          lines: [
            { akun:'6401', ket:'Beban Kerugian Piutang',    debit: selisih, kredit: 0 },
            { akun:'1203', ket:'Cadangan Kerugian Piutang', debit: 0,       kredit: selisih }
          ],
          checked: false
        });
      }
    }

    hideOpSpinner();
    renderAutoDetectModal(_autoDetectResults);
    openModal('modal-auto-penyesuaian');
  }, 900);
}

function renderAutoDetectModal(results) {
  const body = document.getElementById('auto-peny-result-body');
  const btn  = document.getElementById('auto-peny-input-all-btn');

  if (!results.length) {
    body.innerHTML = `<div style="text-align:center;padding:40px 20px;">
      <div style="font-size:48px;margin-bottom:12px;"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i></div>
      <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:8px;">Tidak Ada Penyesuaian Terdeteksi</div>
      <div style="font-size:13px;color:var(--muted);line-height:1.6;">Semua akun sudah tercatat dengan baik untuk periode ini.<br>Tidak ada beban dibayar dimuka, penyusutan, pendapatan dimuka, atau akrual yang tertinggal.</div>
    </div>`;
    btn.style.display = 'none';
    return;
  }

  btn.style.display = '';
  const colorMap  = { warning:'rgba(245,158,11,0.08)',  info:'rgba(34,211,238,0.06)',  danger:'rgba(248,113,113,0.08)' };
  const borderMap = { warning:'rgba(245,158,11,0.3)',   info:'rgba(34,211,238,0.2)',   danger:'rgba(248,113,113,0.25)' };

  body.innerHTML = `<div style="font-size:12px;color:var(--muted);padding:0 0 14px;line-height:1.6;">
    Ditemukan <b style="color:var(--text)">${results.length} item</b> yang perlu disesuaikan.
    Centang item yang ingin diinput, edit nilainya jika perlu, lalu klik <b>Input Semua yang Dipilih</b>.
    <span style="color:var(--accent3);"><i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Item bertanda "Edit nilai" perlu diisi nominal aktual.</span>
  </div>` +
  results.map((r, i) => `
  <div style="background:${colorMap[r.level]||colorMap.info};border:1px solid ${borderMap[r.level]||borderMap.info};border-radius:12px;padding:14px 16px;margin-bottom:10px;" id="adj-card-${i}">
    <div style="display:flex;align-items:flex-start;gap:10px;">
      <input type="checkbox" id="adj-check-${i}" ${r.checked?'checked':''}
        style="width:17px;height:17px;accent-color:var(--accent);flex-shrink:0;margin-top:3px;cursor:pointer;">
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:5px;">${r.judul}</div>
        <div style="font-size:12px;color:var(--muted);line-height:1.6;margin-bottom:8px;">${r.deskripsi}</div>
        <div style="font-size:11px;padding:6px 10px;background:rgba(0,0,0,0.15);border-radius:6px;color:var(--muted);margin-bottom:10px;font-style:italic;">
          💡 ${r.alasan}
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:12px;color:var(--muted);">Nilai:</span>
            <input type="number" id="adj-nilai-${i}" value="${r.nilaiSuggested}" min="1"
              style="background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:5px 9px;color:var(--text);font-size:12px;font-family:var(--mono);width:150px;outline:none;"
              oninput="_autoDetectResults[${i}].nilaiSuggested=parseFloat(this.value)||0;_syncAdjLines(${i})">
            ${r.perluInput?'<span style="color:var(--accent3);font-size:10px;font-weight:600;">← Edit nilai aktual</span>':''}
          </div>
          <button onclick="_toggleAdjPreview(${i})" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 9px;font-size:11px;color:var(--muted);cursor:pointer;"><i class="ti ti-eye" style="font-size:14px;vertical-align:-2px;margin-right:4px;"></i> Preview</button>
          <button onclick="inputSatuAutoDetect(${i})" style="background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);border-radius:6px;padding:4px 12px;font-size:11px;color:var(--accent);cursor:pointer;font-weight:600;">
            ▶ Input Ini
          </button>
        </div>
        <div id="adj-preview-${i}" style="display:none;margin-top:10px;border-radius:8px;overflow:hidden;border:1px solid var(--border);">
          <table style="width:100%;font-size:11px;border-collapse:collapse;">
            <thead><tr style="background:var(--surface2);">
              <th style="padding:5px 9px;text-align:left;color:var(--muted);font-weight:600;border-bottom:1px solid var(--border);">Akun</th>
              <th style="padding:5px 9px;text-align:right;color:var(--muted);font-weight:600;border-bottom:1px solid var(--border);">Debit</th>
              <th style="padding:5px 9px;text-align:right;color:var(--muted);font-weight:600;border-bottom:1px solid var(--border);">Kredit</th>
            </tr></thead>
            <tbody id="adj-preview-tbody-${i}">
              ${r.lines.map(l=>{
                const nama = akuns.find(a=>a.kode===l.akun)?.nama||l.akun;
                return `<tr>
                  <td style="padding:5px 9px;">${l.akun} — ${nama}</td>
                  <td style="padding:5px 9px;text-align:right;font-family:var(--mono);color:${l.debit?'var(--accent3)':'var(--muted)'};">${l.debit?rp(l.debit):'—'}</td>
                  <td style="padding:5px 9px;text-align:right;font-family:var(--mono);color:${l.kredit?'var(--accent)':'var(--muted)'};">${l.kredit?rp(l.kredit):'—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>`).join('');
}

function _syncAdjLines(idx) {
  const r = _autoDetectResults[idx]; if (!r) return;
  const nominal = r.nilaiSuggested;
  r.lines.forEach(l => {
    if (l.debit  > 0) l.debit  = nominal;
    if (l.kredit > 0) l.kredit = nominal;
  });
  // Update preview table jika terbuka
  const tbody = document.getElementById('adj-preview-tbody-' + idx);
  if (tbody) {
    tbody.querySelectorAll('tr').forEach((tr, li) => {
      const l = r.lines[li]; if (!l) return;
      const tds = tr.querySelectorAll('td');
      if (tds[1]) tds[1].textContent = l.debit  ? rp(l.debit)  : '—';
      if (tds[2]) tds[2].textContent = l.kredit ? rp(l.kredit) : '—';
    });
  }
}

function _toggleAdjPreview(idx) {
  const el = document.getElementById('adj-preview-' + idx);
  if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
}

function inputSatuAutoDetect(idx) {
  const r = _autoDetectResults[idx];
  if (!r) return;
  if (r._done) { showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Item ini sudah diinput sebelumnya'); return; }
  if (!r.nilaiSuggested || r.nilaiSuggested <= 0) { showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Isi nilai yang valid (lebih dari 0)'); return; }
  // Sync nilai ke lines dulu
  _syncAdjLines(idx);
  _buatJurnalPenyesuaianAuto([r]);
  r._done = true;
  // Visual feedback: redup card
  const card = document.getElementById('adj-card-' + idx);
  if (card) {
    card.style.opacity = '0.45';
    card.style.pointerEvents = 'none';
    card.insertAdjacentHTML('beforeend', '<div style="text-align:center;padding:6px;font-size:12px;color:var(--accent);font-weight:700;"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Sudah diinput ke Jurnal Umum</div>');
  }
  showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Jurnal penyesuaian berhasil dibuat!');
}

function inputSemuaAutoDetect() {
  // Kumpulkan yang di-centang, belum done, dan nilai valid
  const terpilih = _autoDetectResults.filter((r, i) => {
    const chk = document.getElementById('adj-check-' + i);
    return chk?.checked && !r._done && (r.nilaiSuggested||0) > 0;
  });
  if (!terpilih.length) {
    showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Pilih minimal 1 penyesuaian dan pastikan nilainya terisi (lebih dari 0)');
    return;
  }
  // Sync semua nilai dulu
  _autoDetectResults.forEach((r, i) => _syncAdjLines(i));
  showOpSpinner(`Membuat ${terpilih.length} Jurnal Penyesuaian...`, 'Menyimpan ke Jurnal Umum');
  setTimeout(() => {
    _buatJurnalPenyesuaianAuto(terpilih);
    // Tandai done
    _autoDetectResults.forEach((r, i) => {
      const chk = document.getElementById('adj-check-' + i);
      if (chk?.checked && !r._done) {
        r._done = true;
        const card = document.getElementById('adj-card-' + i);
        if (card) { card.style.opacity='0.45'; card.style.pointerEvents='none'; }
      }
    });
    hideOpSpinner();
    closeModal('modal-auto-penyesuaian');
    showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${terpilih.length} jurnal penyesuaian berhasil dibuat dan disimpan ke Jurnal Umum!`);
  }, 700);
}

function _buatJurnalPenyesuaianAuto(items) {
  const today = new Date().toISOString().split('T')[0];
  items.forEach(r => {
    const kode = nextKode('ADJ');
    // FIX BUG 1: Pastikan lines memakai nilai terbaru (bukan stale dari saat render)
    const lines = r.lines.map(l => ({
      akun: l.akun,
      ket:  l.ket,
      debit:  l.debit  || 0,
      kredit: l.kredit || 0
    }));
    jurnalEntries.push({
      no: kode,
      tanggal: today,
      ket: 'J. Penyesuaian — ' + r.judul.replace(/[^\w\s\-]/gu,'').trim().slice(0,60),
      jenis: 'Penyesuaian',
      lines
    });
  });
  saveToStorage(false);
  cekNotifikasi();
}

function fillPenyesuaian(type) {
  closeModal('modal-penyesuaian');
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('man-tanggal').value = today;

  const templates = {
    penyusutan: {
      ket: 'Jurnal Penyesuaian — Penyusutan Aset',
      no: 'ADJ-PEN',
      lines: [
        { akun: '6303', def: 0, label: 'Beban Penyusutan Peralatan' },
        { akun: '1722', def: 0, label: 'Akum. Penyusutan Peralatan' },
      ],
      hint: 'Isi nilai penyusutan dari Kalkulator Penyusutan'
    },
    perlengkapan: {
      ket: 'Jurnal Penyesuaian — Pemakaian Perlengkapan',
      no: 'ADJ-PRL',
      lines: [
        { akun: '6205', def: 0, label: 'Beban Perlengkapan Kantor' },
        { akun: '1401', def: 0, label: 'Perlengkapan Kantor' },
      ]
    },
    beban_akrual: {
      ket: 'Jurnal Penyesuaian — Beban Terutang (Akrual)',
      no: 'ADJ-AKR',
      lines: [
        { akun: '6101', def: 0, label: 'Beban Gaji (belum dibayar)' },
        { akun: '2201', def: 0, label: 'Utang Gaji' },
      ]
    },
    beban_dibayar_dimuka: {
      ket: 'Jurnal Penyesuaian — Beban Dibayar Dimuka (terpakai)',
      no: 'ADJ-BDD',
      lines: [
        { akun: '6504', def: 0, label: 'Beban Asuransi (terpakai)' },
        { akun: '1601', def: 0, label: 'Biaya Dibayar Dimuka' },
      ]
    },
    pendapatan_diterima_dimuka: {
      ket: 'Jurnal Penyesuaian — Pendapatan Diterima Dimuka (diakui)',
      no: 'ADJ-PDD',
      lines: [
        { akun: '2401', def: 0, label: 'Pendapatan Diterima di Muka' },
        { akun: '4102', def: 0, label: 'Pendapatan Jasa (diakui)' },
      ]
    },
    pendapatan_akrual: {
      ket: 'Jurnal Penyesuaian — Pendapatan Masih Harus Diterima',
      no: 'ADJ-PAK',
      lines: [
        { akun: '1201', def: 0, label: 'Piutang Usaha (akrual)' },
        { akun: '4102', def: 0, label: 'Pendapatan Jasa' },
      ]
    },
    koreksi_persediaan: {
      ket: 'Jurnal Penyesuaian — Koreksi Persediaan Akhir',
      no: 'ADJ-PSR',
      lines: [
        { akun: '1301', def: 0, label: 'Persediaan Barang Dagangan' },
        { akun: '5101', def: 0, label: 'HPP (penyesuaian)' },
      ]
    },
    cadangan_piutang: {
      ket: 'Jurnal Penyesuaian — Cadangan Kerugian Piutang',
      no: 'ADJ-CKP',
      lines: [
        { akun: '6701', def: 0, label: 'Beban Kerugian Piutang' },
        { akun: '1203', def: 0, label: 'Cadangan Kerugian Piutang' },
      ]
    },
  };

  const tmpl = templates[type];
  if(!tmpl) return;

  document.getElementById('man-ket').value = tmpl.ket;
  document.getElementById('man-no').value = nextKode(tmpl.no);

  // Clear and fill manual lines
  const linesEl = document.getElementById('manual-lines');
  linesEl.innerHTML = '';

  tmpl.lines.forEach((line, i) => {
    let manualLineId_local = i;
    const div = document.createElement('div');
    div.className = 'jurnal-line-row';
    div.id = `ml-adj-${i}`;
    const akunOpts = akuns.map(a =>
      `<option value="${escapeHtml(a.kode)}" ${a.kode===line.akun?'selected':''}>${escapeHtml(a.kode)} - ${escapeHtml(a.nama)}</option>`
    ).join('');
    const isDebit = i === 0;
    const selAkun = akuns.find(a=>a.kode===line.akun);
    const btnLabel = selAkun ? escapeHtml(selAkun.kode+' — '+selAkun.nama) : 'Pilih Akun...';
    div.innerHTML = `
      <select onchange="syncAkunTrigger(this)">${akunOpts}</select>
      <button class="akun-trigger-btn" type="button" onclick="openAkunPicker(this)" data-line-id="ml-adj-${i}">${btnLabel}</button>
      <input type="text" value="${escapeHtml(line.label)}" placeholder="Keterangan">
      <input type="number" placeholder="0" ${isDebit?'':'readonly'} oninput="updateBalance()">
      <input type="number" placeholder="0" ${!isDebit?'':'readonly'} oninput="updateBalance()">
      <button class="remove-line" onclick="document.getElementById('ml-adj-${i}').remove();updateBalance()">✕</button>`;
    linesEl.appendChild(div);
  });

  updateBalance();
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Template "${tmpl.ket}" sudah diisi. Masukkan nilainya lalu klik Simpan.`);
}

// ===== KARTU STOCK / CATATAN PERSEDIAAN =====
// Struktur storage: kartuStockData[metode] = [{tgl, ket, mQty, mHarga, kQty, kHarga, saldoQty, saldoHarga, keluarLayers, saldoLayers, id}]
let kartuStockData = { fifo:[], lifo:[], wa:[], mwa:[] };
let kartuStockTab = 'fifo';
let kartuStockIdCounter = 0;

// ── MULTI KARTU STOCK ─────────────────────────────────────────
// Format baru:
// { [cardId]: { id, nama, satuan, createdAt,
//   kategori: { [katId]: { id, nama, satuan, deskripsi, data:{fifo,lifo,wa,mwa} } }
// } }
let multiKartuStock = {};         // semua card kartu stock
let activeKartuStockId = null;    // ID card yang sedang aktif
let activeKategoriId = null;      // ID kategori yang sedang aktif dalam card

function _ksDefaultData() {
  return { fifo:[], lifo:[], wa:[], mwa:[] };
}

/** Ambil kategori aktif dari card aktif */
function getActiveKategori() {
  const card = multiKartuStock[activeKartuStockId];
  if (!card || !card.kategori) return null;
  return card.kategori[activeKategoriId] || null;
}

/** Ambil kartuStockData dari kategori aktif */
function syncKartuStockDataFromKategori() {
  const kat = getActiveKategori();
  if (kat) {
    // Deep copy agar tidak shared reference — modifikasi kartuStockData tidak mempengaruhi kategori lain
    kartuStockData = JSON.parse(JSON.stringify(kat.data));
  }
}

/** Simpan kartuStockData kembali ke kategori aktif */
function syncKategoriFromKartuStockData() {
  if (!activeKartuStockId || !activeKategoriId) return;
  const card = multiKartuStock[activeKartuStockId];
  if (card && card.kategori && card.kategori[activeKategoriId]) {
    // Deep copy wajib — agar data tiap kategori benar-benar independen
    card.kategori[activeKategoriId].data = JSON.parse(JSON.stringify(kartuStockData));
  }
}

/** getKsSaldo compat: bisa terima card (iterate semua kategori) atau kategori langsung */
function getKsSaldoKat(kat) {
  // kat = { id, nama, data:{fifo,lifo,wa,mwa} }
  // Pastikan fakeKs tidak punya property 'kategori' agar tidak trigger infinite recursion
  const data = (kat && kat.data && typeof kat.data === 'object') ? kat.data : {};
  const fakeKs = { data };
  return getKsSaldo(fakeKs);
}

/** Hitung saldo total semua kategori dalam sebuah card */
function getCardSaldo(card, _depth) {
  const _empty = { totalQty:0, totalNilai:0, hppRata:0 };
  if (!card || (_depth || 0) > 2) return _empty;
  let totalQty = 0, totalNilai = 0;
  Object.values(card.kategori || {}).forEach(kat => {
    const s = getKsSaldoKat(kat);
    totalQty   += s.totalQty;
    totalNilai += s.totalNilai;
  });
  const hppRata = totalQty > 0 ? totalNilai / totalQty : 0;
  return { totalQty, totalNilai, hppRata };
}

/** Inisialisasi: jika belum ada multi KS, migrate data lama ke struktur baru */
function initMultiKartuStock() {
  // Hanya load dari localStorage jika multiKartuStock masih kosong
  // (jika sudah diisi dari cloud via loadKartuStockFromData, jangan di-overwrite)
  if (Object.keys(multiKartuStock || {}).length === 0) {
    const stored = localStorage.getItem('oas_mks_' + (window.currentCompany?.id || 'guest'));
    if (stored) {
      try { multiKartuStock = JSON.parse(stored); } catch(e) { multiKartuStock = {}; }
    }
  }

  // Migrate format lama (langsung punya data) ke format baru (card → kategori → data)
  let needsMigrate = false;
  Object.values(multiKartuStock).forEach(card => {
    if (card.data && !card.kategori) needsMigrate = true;
  });
  if (needsMigrate) {
    const migrated = {};
    Object.values(multiKartuStock).forEach(card => {
      const katId = 'kat_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
      migrated[card.id] = {
        id: card.id, nama: card.nama, satuan: card.satuan || 'unit',
        createdAt: card.createdAt || new Date().toISOString(),
        kategori: {
          [katId]: { id: katId, nama: card.nama, satuan: card.satuan || 'unit',
            deskripsi: card.deskripsi || '', data: JSON.parse(JSON.stringify(card.data || _ksDefaultData())) }
        }
      };
    });
    multiKartuStock = migrated;
    saveMKS();
  }

  const hasOldData = Object.values(kartuStockData).some(arr => arr.length > 0);
  if (Object.keys(multiKartuStock).length === 0) {
    const cardId = 'card_' + Date.now();
    const katId  = 'kat_'  + Date.now();
    multiKartuStock[cardId] = {
      id: cardId, nama: 'Persediaan Barang', satuan: 'unit',
      createdAt: new Date().toISOString(),
      kategori: {
        [katId]: { id: katId, nama: 'Barang Dagangan', satuan: 'unit',
          deskripsi: '', data: hasOldData ? JSON.parse(JSON.stringify(kartuStockData)) : _ksDefaultData() }
      }
    };
    activeKartuStockId = cardId;
    activeKategoriId   = katId;
    saveMKS();
  } else {
    if (!activeKartuStockId || !multiKartuStock[activeKartuStockId]) {
      activeKartuStockId = Object.keys(multiKartuStock)[0];
    }
    const card = multiKartuStock[activeKartuStockId];
    if (!activeKategoriId || !card?.kategori?.[activeKategoriId]) {
      activeKategoriId = card?.kategori ? Object.keys(card.kategori)[0] : null;
    }
  }
  // Sync kartuStockData dengan active KS (gunakan syncKartuStockDataFromKategori agar pakai struktur baru)
  syncKartuStockDataFromKategori();
  renderKartuStockSelector();
}

function saveMKS(skipSync) {
  // Sync data aktif ke kategori sebelum save — kecuali kalau skipSync=true
  // (digunakan oleh addKartuStockOnBuy/deductKartuStockOnSale yang sudah
  // langsung menulis ke kat.data, sehingga sync tidak perlu dan justru berbahaya
  // karena bisa overwrite data baru dengan kartuStockData lama yang belum di-refresh)
  if (!skipSync) syncKategoriFromKartuStockData();
  const key = 'oas_mks_' + (window.currentCompany?.id || 'guest');
  try { localStorage.setItem(key, JSON.stringify(multiKartuStock)); } catch(e) {}
  saveKartuStockToCloud();
}

// Flag untuk mencegah syncKategoriFromKartuStockData menimpa data baru
// yang baru saja ditulis langsung ke kat.data oleh addKartuStockOnBuy / deductKartuStockOnSale
let _ksJustWroteDirectly = false;

function switchActiveKS(cardId, katId) {
  if (!multiKartuStock[cardId]) return;
  // Simpan data aktif sekarang ke kategori sebelumnya
  // KECUALI jika addKartuStockOnBuy/deductKartuStockOnSale baru saja menulis
  // langsung ke kat.data — dalam kasus itu kartuStockData masih state lama
  // sehingga sync-nya justru akan overwrite data baru yang baru saja tersimpan
  if (!_ksJustWroteDirectly) {
    syncKategoriFromKartuStockData();
  }
  _ksJustWroteDirectly = false;
  saveMKS();

  activeKartuStockId = cardId;
  const card = multiKartuStock[cardId];

  // Jika katId diberikan pakai itu, kalau tidak pakai kategori pertama
  if (katId && card.kategori?.[katId]) {
    activeKategoriId = katId;
  } else {
    activeKategoriId = card.kategori ? Object.keys(card.kategori)[0] : null;
  }

  syncKartuStockDataFromKategori();
  renderKartuStockSelector();
  renderKartuStock();
}

function switchActiveKategori(katId) {
  syncKategoriFromKartuStockData();
  activeKategoriId = katId;
  syncKartuStockDataFromKategori();
  renderKartuStock();
  renderKartuStockSelector();
}

function renderKartuStockSelector() {
  const container = document.getElementById('ks-selector-wrap');
  if (!container) return;
  const cards = Object.values(multiKartuStock);
  const activeCard = multiKartuStock[activeKartuStockId];

  // Ambil semua kategori dari card aktif sebagai "kartu" yang bisa dipilih
  const katList = activeCard ? Object.values(activeCard.kategori || {}) : [];
  const activeKat = activeCard?.kategori?.[activeKategoriId];

  // Nama card sebagai judul yang bisa diedit
  const cardSaldoMain = activeCard ? getCardSaldo(activeCard) : null;
  const katListMain   = activeCard ? Object.values(activeCard.kategori||{}) : [];
  const firstKat      = katListMain[0];
  const selKatLabel   = activeKat
    ? activeKat.nama
    : (firstKat ? firstKat.nama : 'Belum ada kategori');

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
      <span style="font-size:13px;font-weight:700;color:var(--accent2);">${escapeHtml(activeCard?.nama||'')}</span>
      <span style="font-size:11px;color:var(--muted);">${cardSaldoMain ? cardSaldoMain.totalQty.toLocaleString('id-ID')+' '+(activeCard?.satuan||'unit') : ''}</span>
      <button onclick="openModalEditCard('${activeKartuStockId}')" title="Edit nama kartu stock" style="background:none;border:none;color:var(--muted);cursor:pointer;padding:2px 4px;line-height:1;vertical-align:middle;border-radius:4px;transition:color .15s;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--muted)'"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
    </div>
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
      <span style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">KARTU STOCK:</span>
      <button class="opt-picker-btn" type="button" id="ks-selector-picker-btn" onclick="openKsSelectorPicker()" style="min-width:200px;max-width:300px;">
        <span class="opt-picker-label" id="ks-selector-picker-label">${escapeHtml(selKatLabel)}</span>
        <span class="opt-picker-arrow">▾</span>
      </button>
      <button onclick="openModalTambahKategori('${activeKartuStockId}')" class="btn btn-sm" style="background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.3);color:var(--accent2);font-size:11px;white-space:nowrap;">+ Kategori</button>
      <button onclick="openModalKelolaKategoriCard('${activeKartuStockId}')" class="btn btn-sm" style="background:var(--surface2);border:1px solid var(--border);color:var(--muted);font-size:11px;"><i class="ti ti-settings ti-inline"></i> Kelola</button>
      <button onclick="openKonversiKartuStock()" class="btn btn-sm" style="background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.3);color:var(--accent2);font-size:12px;white-space:nowrap;">↔ Konversi Metode</button>
      <button onclick="clearKartuStock()" class="btn btn-danger btn-sm" style="font-size:12px;white-space:nowrap;"><i class="ti ti-trash ti-btn"></i> Hapus Semua Catatan</button>
      <button id="ks-lock-header-btn" onclick="toggleKartuStockLock('${activeKartuStockId}')" title="${multiKartuStock[activeKartuStockId]?.lockedFromTrx ? 'Dikunci dari transaksi — klik untuk buka' : 'Klik untuk kunci dari picker transaksi'}" style="padding:5px 8px;${multiKartuStock[activeKartuStockId]?.lockedFromTrx ? 'background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:var(--red);' : 'background:var(--surface2);border:1px solid var(--border);color:var(--muted);'}" class="btn btn-sm">${multiKartuStock[activeKartuStockId]?.lockedFromTrx ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'}</button>
    </div>
  `;

  // Update active tab label
  const tabLabel = document.getElementById('ks-active-tab-label');
  if(tabLabel) {
    const activeCard2 = multiKartuStock[activeKartuStockId];
    const activeKat2  = activeCard2?.kategori?.[activeKategoriId];
    const katList2    = activeCard2 ? Object.values(activeCard2.kategori||{}) : [];
    tabLabel.textContent = `${activeKat2 ? activeKat2.nama : (katList2[0]?.nama||'')} · Metode: ${kartuStockTab.toUpperCase()}`;
    tabLabel.style.display = '';
  }

  // Render kartu stock tambahan (hasil + Kartu Stock)
  _renderExtraKsCards();
  _updateLockHeaderBtn();
  // Tampilkan/sembunyikan tombol Hapus Kartu Stock
  const hapusBtn = document.getElementById('hapus-extra-card-btn');
  if (hapusBtn) hapusBtn.style.display = Object.keys(multiKartuStock).length > 1 ? '' : 'none';
  fixKsTableStickyHeaders();
}

function _renderExtraKsCards() {
  const container = document.getElementById('ks-extra-cards-container');
  if (!container) return;
  const cards = Object.values(multiKartuStock);
  // Tampilkan semua card KECUALI yang sedang aktif (activeKartuStockId tampil di section utama)
  const extraCards = cards.filter(card => card.id !== activeKartuStockId);
  if (!extraCards.length) { container.innerHTML = ''; return; }

  container.innerHTML = extraCards.map(card => {
    const isActive  = card.id === activeKartuStockId;
    const katList   = Object.values(card.kategori || {});
    const activeKat = isActive ? card.kategori?.[activeKategoriId] : katList[0];
    const metodeLabel = {fifo:'FIFO (First In First Out)',lifo:'LIFO (Last In First Out)',wa:'Weighted Average',mwa:'Moving Average'};
    const cardMetode  = isActive ? kartuStockTab : 'fifo';
    const saldoNow    = getCardSaldo(card);

    // Render tabel untuk kategori aktif card ini
    const katForTable = isActive ? (card.kategori?.[activeKategoriId] || katList[0]) : katList[0];
    const storageForTable = katForTable ? (JSON.parse(JSON.stringify(katForTable.data?.[cardMetode] || []))) : [];

    // Selector label
    const selLabel = (()=>{
      const s = getCardSaldo(card);
      return card.nama + ' (Stok: ' + s.totalQty.toLocaleString('id-ID') + ' ' + (card.satuan||'unit') + ')';
    })();

    return `<div class="table-card" style="margin-top:0;" id="ks-extra-${card.id}">
      <div class="table-header" style="flex-wrap:wrap;gap:8px;">
        <div class="table-title"><i class="ti ti-clipboard-list ti-inline"></i> Catatan Persediaan / Kartu Stock</div>
        <div style="display:flex;gap:8px;align-items:center;">
          <button class="opt-picker-btn" type="button" onclick="openKsExtraMetodePicker('${card.id}')" style="min-width:180px;max-width:220px;padding:7px 12px;">
            <span class="opt-picker-label" id="ks-extra-metode-label-${card.id}">${metodeLabel[cardMetode]||cardMetode}</span>
            <span class="opt-picker-arrow">▾</span>
          </button>
          <input type="hidden" id="ks-extra-metode-val-${card.id}" value="${cardMetode}">
        </div>
      </div>
      <div style="padding:12px 16px;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <span style="font-size:13px;font-weight:700;color:var(--accent2);">${card.nama}</span>
          <span style="font-size:11px;color:var(--muted);">${saldoNow.totalQty.toLocaleString('id-ID')} ${card.satuan||'unit'}</span>
          <button onclick="openModalEditCard('${card.id}')" title="Edit nama kartu stock" style="background:none;border:none;color:var(--muted);cursor:pointer;padding:2px 4px;line-height:1;vertical-align:middle;border-radius:4px;transition:color .15s;" onmouseover="this.style.color='var(--accent)'" onmouseout="this.style.color='var(--muted)'"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:10px;">
          <span style="font-size:11px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:0.06em;">KARTU STOCK:</span>
          <button class="opt-picker-btn" type="button" onclick="openKsExtraKatPicker('${card.id}')" style="min-width:200px;max-width:300px;">
            <span class="opt-picker-label" id="ks-extra-sel-label-${card.id}">${(()=>{ const ak=activeKat||katList[0]; return ak ? ak.nama : 'Pilih kategori...'; })()}</span>
            <span class="opt-picker-arrow">▾</span>
          </button>
          <button onclick="openModalTambahKategori('${card.id}')" class="btn btn-sm" style="background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.3);color:var(--accent2);font-size:11px;white-space:nowrap;">+ Kategori</button>
          <button onclick="openModalKelolaKSExtra('${card.id}')" class="btn btn-sm" style="background:var(--surface2);border:1px solid var(--border);color:var(--muted);font-size:11px;white-space:nowrap;"><i class="ti ti-settings ti-inline"></i> Kelola</button>
          <button onclick="openKonversiKartuStock()" class="btn btn-sm" style="background:rgba(34,211,238,0.1);border:1px solid rgba(34,211,238,0.3);color:var(--accent2);font-size:12px;white-space:nowrap;">↔ Konversi Metode</button>
          <button onclick="clearExtraCard('${card.id}')" class="btn btn-danger btn-sm" style="font-size:12px;white-space:nowrap;"><i class="ti ti-trash ti-btn"></i> Hapus Semua Catatan</button>
          <button onclick="toggleKartuStockLock('${card.id}')" class="btn btn-sm" title="${card.lockedFromTrx ? 'Dikunci dari transaksi — klik untuk buka' : 'Klik untuk kunci dari transaksi'}" style="padding:5px 8px;${card.lockedFromTrx ? 'background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:var(--red);' : 'background:var(--surface2);border:1px solid var(--border);color:var(--muted);'}">${card.lockedFromTrx ? '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>' : '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'}</button>
        </div>
        <div style="font-size:12px;color:var(--accent);margin-bottom:8px;font-weight:600;" id="ks-extra-active-label-${card.id}">${(()=>{ const ak=activeKat||katList[0]; return (ak?ak.nama:'')+' · Metode: '+cardMetode.toUpperCase(); })()}</div>


        <div class="ks-table-wrap"><table>
    <thead><tr>
          <th style="min-width:72px">Tgl</th>
          <th style="min-width:90px">Ket</th>
          <th colspan="3" style="text-align:center;border-left:1px solid var(--border)">MASUK</th>
          <th colspan="3" style="text-align:center;border-left:1px solid var(--border)">KELUAR</th>
          <th colspan="3" style="text-align:center;border-left:1px solid var(--border)">SALDO</th>
          <th style="min-width:40px">AK</th>
        </tr><tr>
          <th></th><th></th>
          <th style="border-left:1px solid var(--border);min-width:50px">Qty</th>
          <th style="min-width:90px">Hrg Beli</th>
          <th style="min-width:100px">Jumlah</th>
          <th style="border-left:1px solid var(--border);min-width:50px">Qty</th>
          <th style="min-width:90px">HPP/Unit</th>
          <th style="min-width:100px">Jumlah</th>
          <th style="border-left:1px solid var(--border);min-width:50px">Qty</th>
          <th style="min-width:90px">Hrg</th>
          <th style="min-width:100px">Jumlah</th>
          <th></th>
        </tr></thead>
          <tbody id="ks-extra-tbody-${card.id}">
            ${(()=>{
              if(!storageForTable.length) return '<tr><td colspan="12">Belum ada catatan.</td></tr>';
              const isLayeredE = (cardMetode==='fifo'||cardMetode==='lifo');
              const tdS = (row) => {
                const q = row ? row.qty : 0, h = row ? row.harga : 0;
                return '<td style="border-left:1px solid var(--border)" class="num">'+(q||0)+'</td><td class="num">'+rp(h||0)+'</td><td class="num">'+rp((q||0)*(h||0))+'</td>';
              };
              const getRows = (e) => {
                if (!isLayeredE) {
                  const tq = (e.saldoLayers||[]).reduce((s,x)=>s+x.qty,0);
                  const tv = (e.saldoLayers||[]).reduce((s,x)=>s+x.qty*x.harga,0);
                  return [{qty:tq, harga:tq?tv/tq:0}];
                }
                const l = (e.saldoLayers||[]).filter(x=>x.qty>0);
                return l.length ? l : [{qty:0,harga:0}];
              };
              let html = '';
              storageForTable.forEach((e, idx) => {
                const saldoRows = getRows(e);
                const nS = saldoRows.length;
                if(e.mQty > 0) {
                  html += '<tr>'
                    +'<td rowspan="'+nS+'" style="font-size:11px;vertical-align:top">'+e.tgl+'</td>'
                    +'<td rowspan="'+nS+'" style="font-size:12px;vertical-align:top">'+(e.ket||'masuk')+'</td>'
                    +'<td rowspan="'+nS+'" style="border-left:1px solid var(--border)" class="num debit">'+e.mQty+'</td>'
                    +'<td rowspan="'+nS+'" class="num">'+rp(e.mHarga)+'</td>'
                    +'<td rowspan="'+nS+'" class="debit">'+rp(e.mQty*e.mHarga)+'</td>'
                    +'<td rowspan="'+nS+'" style="border-left:1px solid var(--border)" class="num"></td>'
                    +'<td rowspan="'+nS+'" class="num"></td>'
                    +'<td rowspan="'+nS+'" class="num"></td>'
                    +tdS(saldoRows[0])
                    +'<td rowspan="'+nS+'" style="text-align:center;vertical-align:top"><i class="ti ti-trash" style="color:var(--muted);font-size:13px;"></i></td>'
                    +'</tr>';
                  for(let i=1;i<nS;i++) html += '<tr>'+tdS(saldoRows[i])+'</tr>';
                } else {
                  const kRows = (isLayeredE && e.keluarLayers && e.keluarLayers.length>1) ? e.keluarLayers : null;
                  const nK = kRows ? kRows.length : 1;
                  const maxR = Math.max(nK, nS);
                  if (!kRows) {
                    html += '<tr>'
                      +'<td rowspan="'+maxR+'" style="font-size:11px;vertical-align:top">'+e.tgl+'</td>'
                      +'<td rowspan="'+maxR+'" style="font-size:12px;vertical-align:top">'+(e.ket||'keluar')+'</td>'
                      +'<td rowspan="'+maxR+'" style="border-left:1px solid var(--border)" class="num"></td>'
                      +'<td rowspan="'+maxR+'" class="num"></td>'
                      +'<td rowspan="'+maxR+'" class="num"></td>'
                      +'<td rowspan="'+maxR+'" style="border-left:1px solid var(--border)" class="num kredit">'+e.kQty+'</td>'
                      +'<td rowspan="'+maxR+'" class="num">'+rp(e.kHarga)+'</td>'
                      +'<td rowspan="'+maxR+'" class="num kredit">'+rp(e.kJml)+'</td>'
                      +tdS(saldoRows[0])
                      +'<td rowspan="'+maxR+'" style="text-align:center;vertical-align:top"><i class="ti ti-trash" style="color:var(--muted);font-size:13px;"></i></td>'
                      +'</tr>';
                    for(let i=1;i<maxR;i++) html += '<tr>'+tdS(saldoRows[i]||null)+'</tr>';
                  } else {
                    html += '<tr>'
                      +'<td rowspan="'+maxR+'" style="font-size:11px;vertical-align:top">'+e.tgl+'</td>'
                      +'<td rowspan="'+maxR+'" style="font-size:12px;vertical-align:top">'+(e.ket||'keluar')+'</td>'
                      +'<td rowspan="'+maxR+'" style="border-left:1px solid var(--border)" class="num"></td>'
                      +'<td rowspan="'+maxR+'" class="num"></td>'
                      +'<td rowspan="'+maxR+'" class="num"></td>'
                      +'<td style="border-left:1px solid var(--border)" class="num kredit">'+kRows[0].qty+'</td>'
                      +'<td class="num">'+rp(kRows[0].harga)+'</td>'
                      +'<td class="num kredit">'+rp(kRows[0].qty*kRows[0].harga)+'</td>'
                      +tdS(saldoRows[0]||null)
                      +'<td rowspan="'+maxR+'" style="text-align:center;vertical-align:top"><i class="ti ti-trash" style="color:var(--muted);font-size:13px;"></i></td>'
                      +'</tr>';
                    for(let i=1;i<maxR;i++) {
                      const kr=kRows[i]||null, sr=saldoRows[i]||null;
                      const tdK = kr
                        ? '<td style="border-left:1px solid var(--border)" class="num kredit">'+kr.qty+'</td><td class="num">'+rp(kr.harga)+'</td><td class="num kredit">'+rp(kr.qty*kr.harga)+'</td>'
                        : '<td style="border-left:1px solid var(--border)" class="num"></td><td class="num"></td><td class="num"></td>';
                      html += '<tr>'+tdK+tdS(sr)+'</tr>';
                    }
                  }
                }
              });
              return html;
            })()}
          </tbody>
        </table></div>
        <div id="ks-extra-summary-${card.id}" style="margin-top:12px;${saldoNow.totalQty>0?'':'display:none'}">
          <div style="grid-template-columns:1fr 1fr 1fr;" class="kalk-grid">
            <div class="stat-card green"><div class="stat-label">Saldo Qty</div><div class="stat-value">${saldoNow.totalQty.toLocaleString('id-ID')}</div></div>
            <div class="stat-card blue"><div class="stat-label">Nilai Persediaan</div><div class="stat-value">${fmtRp(saldoNow.totalNilai)}</div></div>
            <div class="stat-card yellow"><div class="stat-label">Total HPP Tercatat</div><div class="stat-value">${fmtRp(Object.values(card.kategori||{}).reduce((s,k)=>s+Object.values(k.data||{}).flat().reduce((ss,r)=>ss+(r.kJml||0),0),0))}</div></div>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');
  fixKsTableStickyHeaders();
}

function openKsExtraKatPicker(cardId) {
  const card = multiKartuStock[cardId]; if(!card) return;
  const kats = Object.values(card.kategori || {});
  openOptPicker({
    title: 'Pilih Kategori — ' + card.nama,
    options: kats.map(kat => { const s=getKsSaldoKat(kat); return {value:kat.id, label:kat.nama, sub:`Stok: ${s.totalQty} · HPP: ${fmtRp(s.hppNext)}`}; }),
    currentValue: activeKategoriId,
    onSelect: (katId) => {
      // Track kategori aktif per extra card untuk clearExtraCard
      if (!window._ksExtraKatId) window._ksExtraKatId = {};
      window._ksExtraKatId[cardId] = katId;
      // Update label kategori di extra card
      const selLbl = document.getElementById('ks-extra-sel-label-' + cardId);
      const selKat = card.kategori?.[katId];
      if (selLbl && selKat) selLbl.textContent = selKat.nama;
      switchActiveKS(cardId, katId);
    }
  });
}

function openModalKelolaKSExtra(cardId) {
  openModalKelolaKategoriCard(cardId);
}

/** Modal kelola kategori dalam satu card tertentu */
function openModalKelolaKategoriCard(cardId) {
  const card = multiKartuStock[cardId]; if(!card) return;
  const kats = Object.values(card.kategori || {});
  document.getElementById('mks-kelola-list').innerHTML =
    `<div style="font-size:12px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">
       <i class="ti ti-tag" style="font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Kategori Barang — <span style="color:var(--text)">${escapeHtml(card.nama)}</span>
     </div>` +
    (kats.length === 0
      ? `<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px 0;">Belum ada kategori barang.</div>`
      : kats.map(kat => {
          const s = getKsSaldoKat(kat);
          const isAktif = (cardId === activeKartuStockId && kat.id === activeKategoriId);
          return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border-radius:10px;border:1px solid ${isAktif?'var(--accent)':'var(--border)'};margin-bottom:8px;">
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${isAktif?'▶ ':''}${kat.nama}</div>
              <div style="font-size:11px;color:var(--muted);">Satuan: ${kat.satuan||card.satuan||'unit'} · Stok: ${s.totalQty.toLocaleString('id-ID')}</div>
            </div>
            <button onclick="switchActiveKS('${cardId}','${kat.id}');closeModal('mks-kelola-modal')" class="btn btn-ghost btn-sm" ${isAktif?'disabled':''}>${isAktif?'Aktif':'Buka'}</button>
            <button onclick="openModalEditKategori('${cardId}','${kat.id}');closeModal('mks-kelola-modal')" class="btn btn-ghost btn-sm"><i class="ti ti-pencil" style="font-size:13px;vertical-align:-2px;"></i></button>
            ${kats.length > 1 ? `<button onclick="hapusKategori('${cardId}','${kat.id}')" class="btn btn-danger btn-sm" ${isAktif?'disabled':''}><i class="ti ti-trash" style="font-size:13px;vertical-align:-2px;"></i></button>` : ''}
          </div>`;
        }).join('')
    ) +
    `<button onclick="openModalTambahKategori('${cardId}');closeModal('mks-kelola-modal')" class="btn btn-primary btn-sm" style="margin-top:10px;width:100%;padding:10px;">
       <i class="ti ti-plus" style="font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Tambah Kategori Baru
     </button>`;
  // Update judul modal
  document.getElementById('mks-kelola-modal').querySelector('.modal-title').textContent = 'Kelola Kategori Barang';
  openModal('mks-kelola-modal');
}

function hapusKategori(cardId, katId) {
  const card = multiKartuStock[cardId]; if(!card) return;
  const kat = card.kategori?.[katId]; if(!kat) return;
  _ksConfirm('Hapus kategori "' + kat.nama + '"? Data entri akan hilang permanen.', '<i class="ti ti-trash" style="color:var(--red);font-size:18px;"></i>', function() {
    _doHapusKategori(cardId, katId);
  });
}
function _doHapusKategori(cardId, katId) {
  const card = multiKartuStock[cardId]; if(!card) return;
  const kat = card.kategori?.[katId]; if(!kat) return;
  if (cardId === activeKartuStockId && katId === activeKategoriId) {
    const remaining = Object.keys(card.kategori).filter(k => k !== katId);
    if (remaining.length) { syncKategoriFromKartuStockData(); activeKategoriId = remaining[0]; syncKartuStockDataFromKategori(); }
  }
  delete card.kategori[katId];
  saveMKS();
  renderKartuStockSelector();
  renderKartuStock();
  showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Kategori berhasil dihapus');
}

function clearExtraCard(cardId) {
  const card = multiKartuStock[cardId]; if(!card) return;
  // Baca metode yang sedang aktif di extra card ini
  const hiddenVal = document.getElementById('ks-extra-metode-val-' + cardId);
  const activeMetode = hiddenVal?.value || 'fifo';
  // Baca kategori aktif extra card (ambil dari ks-extra-sel-label atau kategori pertama)
  // Kategori aktif extra card ditrack via _ksExtraKatId
  const extraKatId = window._ksExtraKatId?.[cardId];
  const katList = Object.values(card.kategori || {});
  const activeKat = (extraKatId && card.kategori?.[extraKatId]) ? card.kategori[extraKatId] : katList[0];

  if (!activeKat || !(activeKat.data?.[activeMetode]?.length > 0)) {
    showAlert('<i class="ti ti-info-circle" style="color:var(--accent2);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tidak ada catatan metode ' + activeMetode.toUpperCase() + ' di kategori ini.');
    return;
  }
  const metodeLabel = {fifo:'FIFO',lifo:'LIFO',wa:'Weighted Average',mwa:'Moving Average'};
  _ksConfirm(
    'Hapus semua catatan metode ' + (metodeLabel[activeMetode]||activeMetode.toUpperCase()) + ' di "' + (activeKat.nama||card.nama) + '"?',
    '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>',
    () => {
      if (activeKat.data) activeKat.data[activeMetode] = [];
      saveMKS();
      _renderExtraKsCards();
      showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Catatan metode ' + (metodeLabel[activeMetode]||activeMetode.toUpperCase()) + ' di "' + (activeKat.nama||card.nama) + '" berhasil dihapus.');
    }
  );
}

function hapusExtraCardPicker() {
  // Sekarang fungsi ini membuka modal Kelola Kartu Stock (bukan hanya hapus)
  openModalKelolaSemuaKartuStock();
}

/** Modal kelola semua kartu stock: edit nama + hapus */
function openModalKelolaSemuaKartuStock() {
  const cards = Object.values(multiKartuStock);
  document.getElementById('mks-kelola-list').innerHTML =
    `<div style="font-size:12px;font-weight:700;color:var(--accent2);text-transform:uppercase;letter-spacing:.08em;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid var(--border);">
       Semua Kartu Stock
     </div>` +
    cards.map(card => {
      const s = getCardSaldo(card);
      const nKat = Object.keys(card.kategori||{}).length;
      const isAktif = card.id === activeKartuStockId;
      return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border-radius:10px;border:1px solid ${isAktif?'var(--accent)':'var(--border)'};margin-bottom:8px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;">${isAktif?'▶ ':''}${card.nama}</div>
          <div style="font-size:11px;color:var(--muted);">${nKat} kategori · Stok: ${s.totalQty.toLocaleString('id-ID')} ${card.satuan||'unit'}</div>
        </div>
        <button onclick="switchActiveKS('${card.id}');closeModal('mks-kelola-modal')" class="btn btn-ghost btn-sm" ${isAktif?'disabled':''}>${isAktif?'Aktif':'Buka'}</button>
        <button onclick="openModalEditCard('${card.id}');closeModal('mks-kelola-modal')" class="btn btn-ghost btn-sm"><i class="ti ti-pencil" style="font-size:13px;vertical-align:-2px;"></i></button>
        <button onclick="toggleKartuStockLock('${card.id}')" class="btn btn-sm" title="${card.lockedFromTrx?'Dikunci dari transaksi':'Klik untuk kunci dari transaksi'}" style="padding:4px 8px;${card.lockedFromTrx?'background:rgba(239,68,68,0.15);border:1px solid rgba(239,68,68,0.4);color:var(--red);':'background:var(--surface2);border:1px solid var(--border);color:var(--muted);'}">${card.lockedFromTrx?'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>':'<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>'}</button>
        ${cards.length > 1 ? `<button onclick="hapusCardDenganValidasi('${card.id}')" class="btn btn-danger btn-sm"><i class="ti ti-trash" style="font-size:13px;vertical-align:-2px;"></i></button>` : ''}
      </div>`;
    }).join('') +
    `<button onclick="openModalTambahKS();closeModal('mks-kelola-modal')" class="btn btn-sm" style="margin-top:10px;width:100%;padding:10px;background:rgba(74,222,128,0.1);border:1px solid rgba(74,222,128,0.3);color:var(--accent);">
       <i class="ti ti-plus" style="font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Tambah Kartu Stock Baru
     </button>`;
  document.getElementById('mks-kelola-modal').querySelector('.modal-title').textContent = 'Kelola Kartu Stock';
  openModal('mks-kelola-modal');
}

function hapusCardDenganValidasi(cardId) {
  const card = multiKartuStock[cardId]; if(!card) return;
  const isAktif = (cardId === activeKartuStockId);
  const sisaCards = Object.keys(multiKartuStock).filter(k => k !== cardId);
  _ksConfirm('Hapus kartu stock "' + card.nama + '"?\nSemua data akan hilang permanen.', '<i class="ti ti-trash" style="color:var(--red);font-size:18px;"></i>', function() {
    _doHapusCard(cardId);
  });
}
function _doHapusCard(cardId) {
  const card = multiKartuStock[cardId]; if(!card) return;
  const isAktif = (cardId === activeKartuStockId);
  const sisaCards = Object.keys(multiKartuStock).filter(k => k !== cardId);
  if (sisaCards.length === 0) {
    delete multiKartuStock[cardId];
    activeKartuStockId = null; activeKategoriId = null; kartuStockData = _ksDefaultData();
    saveMKS(); renderKartuStockSelector(); renderKartuStock();
    closeModal('mks-kelola-modal');
    showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Semua kartu stock dihapus. Silakan buat kartu stock baru.');
    setTimeout(() => openModalTambahKS(), 500);
    return;
  }
  if (isAktif) {
    const newActiveId = sisaCards[0];
    syncKategoriFromKartuStockData();
    delete multiKartuStock[cardId];
    activeKartuStockId = newActiveId;
    const newCard = multiKartuStock[newActiveId];
    activeKategoriId = newCard?.kategori ? Object.keys(newCard.kategori)[0] : null;
    syncKartuStockDataFromKategori();
  } else {
    delete multiKartuStock[cardId];
  }
  saveMKS(); renderKartuStockSelector(); renderKartuStock();
  closeModal('mks-kelola-modal');
  showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Kartu stock "' + card.nama + '" berhasil dihapus');
}

function openKsSelectorPicker() {
  const card = multiKartuStock[activeKartuStockId];
  if(!card) return;
  const katList = Object.values(card.kategori || {});
  if(!katList.length) { showAlert('Belum ada kategori. Klik + Kategori untuk menambah.'); return; }

  openOptPicker({
    title: 'Pilih Kategori',
    options: katList.map(kat => {
      const s = getKsSaldoKat(kat);
      return {
        value: kat.id,
        label: kat.nama,
        sub: `Stok: ${s.totalQty.toLocaleString('id-ID')} · HPP: ${fmtRp(s.hppNext)}`,
      };
    }),
    currentValue: activeKategoriId,
    onSelect: (katId) => { switchActiveKategori(katId); }
  });
}

function openKsExtraMetodePicker(cardId) {
  openOptPicker({
    title: 'Pilih Metode',
    options: [
      {value:'fifo', label:'FIFO', sub:'First In First Out'},
      {value:'lifo', label:'LIFO', sub:'Last In First Out'},
      {value:'wa',   label:'Weighted Average', sub:'Rata-rata Tertimbang'},
      {value:'mwa',  label:'Moving Average', sub:'Rata-rata Bergerak'},
    ],
    currentValue: kartuStockTab,
    onSelect: (val, label) => {
      const lbl = document.getElementById('ks-extra-metode-label-' + cardId);
      if(lbl) lbl.textContent = label;
      // Simpan metode aktif ke hidden input
      const hiddenVal = document.getElementById('ks-extra-metode-val-' + cardId);
      if(hiddenVal) hiddenVal.value = val;
      // Switch ke card ini dan render tabelnya
      switchActiveKS(cardId);
      const tabMap = {fifo:'FIFO',lifo:'LIFO',wa:'Weighted Average (Rata-rata Tertimbang)',mwa:'Moving Average (Rata-rata Bergerak)'};
      if(typeof switchKartuStockTab === 'function') {
        const el = document.getElementById('ks-tab-' + val) || _makeKsTabEl(val);
        switchKartuStockTab(val, el);
      }
    }
  });
}

function openModalTambahKS() {
  document.getElementById('mks-modal-title').textContent = '+ Tambah Kartu Stock';
  document.getElementById('mks-input-nama').value = '';
  document.getElementById('mks-input-satuan').value = 'unit';
  document.getElementById('mks-label-nama').innerHTML = 'Nama Kartu Stock <span style="color:var(--red)">*</span>';
  document.getElementById('mks-field-satuan').style.display = 'none'; // kartu stock tidak perlu satuan
  document.getElementById('mks-modal')._editId = null;
  document.getElementById('mks-modal')._mode = 'card';
  openModal('mks-modal');
  setTimeout(()=>document.getElementById('mks-input-nama')?.focus(), 100);
}

function openModalTambahKategori(cardId) {
  document.getElementById('mks-modal-title').textContent = '+ Tambah Barang / Kategori';
  document.getElementById('mks-input-nama').value = '';
  document.getElementById('mks-label-nama').innerHTML = 'Nama Barang <span style="color:var(--red)">*</span>';
  document.getElementById('mks-field-satuan').style.display = ''; // kategori barang perlu satuan
  document.getElementById('mks-input-satuan').value = multiKartuStock[cardId]?.satuan || 'unit';
  document.getElementById('mks-modal')._editId = null;
  document.getElementById('mks-modal')._mode = 'kategori';
  document.getElementById('mks-modal')._cardId = cardId;
  openModal('mks-modal');
  setTimeout(()=>document.getElementById('mks-input-nama')?.focus(), 100);
}

function openModalEditCard(cardId) {
  const card = multiKartuStock[cardId]; if(!card) return;
  document.getElementById('mks-modal-title').textContent = 'Ganti Nama';
  document.getElementById('mks-input-nama').value = card.nama;
  document.getElementById('mks-label-nama').innerHTML = 'Nama Kartu Stock <span style="color:var(--red)">*</span>';
  document.getElementById('mks-field-satuan').style.display = 'none';
  document.getElementById('mks-modal')._editId = cardId;
  document.getElementById('mks-modal')._mode = 'editcard';
  openModal('mks-modal');
  setTimeout(()=>document.getElementById('mks-input-nama')?.focus(), 100);
}

function openModalEditKS(ksId) {
  // Legacy: ksId bisa card atau kategori — coba card dulu
  openModalEditCard(ksId);
}

function openModalEditKategori(cardId, katId) {
  const card = multiKartuStock[cardId]; if(!card) return;
  const kat = card.kategori?.[katId]; if(!kat) return;
  document.getElementById('mks-modal-title').textContent = 'Edit Kategori';
  document.getElementById('mks-input-nama').value = kat.nama;
  document.getElementById('mks-input-desc').value = kat.deskripsi || '';
  document.getElementById('mks-input-satuan').value = kat.satuan || card.satuan || 'unit';
  document.getElementById('mks-modal')._editId = katId;
  document.getElementById('mks-modal')._mode = 'editkategori';
  document.getElementById('mks-modal')._cardId = cardId;
  openModal('mks-modal');
}

function simpanModalKS() {
  const nama   = document.getElementById('mks-input-nama').value.trim();
  const desc   = document.getElementById('mks-input-desc').value.trim();
  const satuan = document.getElementById('mks-input-satuan').value.trim() || 'unit';
  if (!nama) { showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Nama wajib diisi'); return; }

  const modal  = document.getElementById('mks-modal');
  const mode   = modal._mode || 'card';
  const editId = modal._editId;
  const cardId = modal._cardId;

  if (mode === 'card') {
    // Buat CARD baru — section terpisah di bawah
    const newCardId = 'card_' + Date.now();
    const newKatId  = 'kat_'  + Date.now();
    syncKategoriFromKartuStockData();
    multiKartuStock[newCardId] = {
      id: newCardId, nama, satuan, createdAt: new Date().toISOString(),
      kategori: {
        [newKatId]: { id: newKatId, nama, satuan, deskripsi: desc, data: _ksDefaultData() }
      }
    };
    // Tidak switch active — card baru tampil di section tambahan
    showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Kartu stock "${nama}" berhasil dibuat!`);

  } else if (mode === 'kategori') {
    // Tambah KATEGORI ke card
    const card = multiKartuStock[cardId]; if(!card) return;
    const newKatId = 'kat_' + Date.now();
    if (!card.kategori) card.kategori = {};
    card.kategori[newKatId] = { id: newKatId, nama, satuan, deskripsi: desc, data: _ksDefaultData() };
    // Switch ke kategori baru
    if (cardId === activeKartuStockId) {
      syncKategoriFromKartuStockData();
      activeKategoriId = newKatId;
      syncKartuStockDataFromKategori();
    }
    showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Kategori "${nama}" berhasil ditambahkan!`);

  } else if (mode === 'editcard') {
    // Edit CARD
    if (multiKartuStock[editId]) {
      multiKartuStock[editId].nama   = nama;
      multiKartuStock[editId].satuan = satuan;
    }
    showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> "${nama}" berhasil diperbarui`);

  } else if (mode === 'editkategori') {
    // Edit KATEGORI
    const card = multiKartuStock[cardId];
    if (card?.kategori?.[editId]) {
      card.kategori[editId].nama    = nama;
      card.kategori[editId].satuan  = satuan;
      card.kategori[editId].deskripsi = desc;
    }
    showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> "${nama}" berhasil diperbarui`);
  }

  closeModal('mks-modal');
  saveMKS();
  renderKartuStockSelector();
  renderKartuStock();
}

function openModalKelolaKS() {
  const list = Object.values(multiKartuStock);
  const el = document.getElementById('mks-kelola-modal');
  document.getElementById('mks-kelola-list').innerHTML = list.map(ks => {
    const total = Object.values(ks.kategori || {}).reduce((s, kat) =>
      s + Object.values(kat.data || {}).reduce((ss, arr) => ss + (arr?.length || 0), 0), 0);
    const isActive = ks.id === activeKartuStockId;
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border-radius:10px;border:1px solid ${isActive?'var(--accent)':'var(--border)'};margin-bottom:8px;">
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:600;">${isActive?'▶ ':''} ${escapeHtml(ks.nama)}</div>
        <div style="font-size:11px;color:var(--muted);">${ks.deskripsi||'—'} · ${escapeHtml(ks.satuan)} · ${total} entri</div>
      </div>
      <button onclick="switchActiveKS('${ks.id}');closeModal('mks-kelola-modal')" class="btn btn-ghost btn-sm" ${isActive?'disabled':''}>
        ${isActive?'Aktif':'Buka'}
      </button>
      <button onclick="openModalEditKS('${ks.id}');closeModal('mks-kelola-modal')" class="btn btn-ghost btn-sm">[Edit]</button>
      ${list.length>1 ? `<button onclick="hapusKS('${ks.id}')" class="btn btn-danger btn-sm" ${isActive?'disabled':''}><i class="ti ti-trash" style="font-size:14px;"></i></button>` : ''}
    </div>`;
  }).join('');
  openModal('mks-kelola-modal');
}

function hapusKS(ksId) {
  if (ksId === activeKartuStockId) { showAlert('❌ Tidak bisa hapus kartu stock yang sedang aktif'); return; }
  const ks = multiKartuStock[ksId];
  if (!ks) return;
  if (!confirm(`Hapus kartu stock "${ks.nama}"? Semua data di kartu ini akan hilang.`)) return;
  delete multiKartuStock[ksId];
  saveMKS();
  closeModal('mks-kelola-modal');
  renderKartuStockSelector();
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Kartu stock "${ks.nama}" dihapus`);
}

/** Popup pilih kartu stock saat user klik Input dari preview persediaan */
function showPilihKartuStockPopup(onSelectKat, tujuanMetode) {
  // onSelectKat dipanggil dengan katId (kategori), bukan cardId
  const cards = Object.values(multiKartuStock);
  if(!cards.length) { showAlert('Belum ada kartu stock.'); return; }

  const mLabel = {fifo:'FIFO',lifo:'LIFO',wa:'WA',mwa:'MWA'};

  // Jika hanya 1 card, skip level 1
  if(cards.length === 1) {
    const kats = Object.values(cards[0].kategori || {});
    if(kats.length === 0) { showAlert('Kartu stock belum punya barang. Tambah dulu di Persediaan.'); return; }
    if(kats.length === 1) { _doSelectKartuForInput(kats[0].id, onSelectKat); return; }
    // 1 card, >1 kategori — langsung ke level 2
    const card = cards[0];
    const mLabel = {fifo:'FIFO',lifo:'LIFO',wa:'WA',mwa:'MWA'};
    openOptPicker({
      title: 'Pilih Barang — ' + card.nama,
      options: kats.map(kat => {
        const s = getKsSaldoKat(kat);
        const total = (kat.data?.[tujuanMetode||kartuStockTab] || []).length;
        return { value: kat.id, label: kat.nama,
          sub: `Stok: ${s.totalQty} · ${total} entri` };
      }),
      currentValue: activeKategoriId,
      onSelect: (katId) => { _doSelectKartuForInput(katId, onSelectKat); }
    });
    return;
  }

  // Level 1: pilih kartu stock (card)
  openOptPicker({
    title: 'Pilih Kartu Stock',
    options: cards.map(card => {
      const s = getCardSaldo(card);
      return {
        value: card.id,
        label: card.nama,
        sub: `Stok: ${s.totalQty.toLocaleString('id-ID')} ${card.satuan||'unit'} · ${Object.keys(card.kategori||{}).length} barang`,
      };
    }),
    currentValue: activeKartuStockId,
    onSelect: (cardId) => {
      const card = multiKartuStock[cardId]; if(!card) return;
      const kats = Object.values(card.kategori || {});
      if(!kats.length) { showAlert('Kartu stock ini belum punya barang.'); return; }
      if(kats.length === 1) { _doSelectKartuForInput(kats[0].id, onSelectKat); return; }
      // Level 2: pilih kategori/barang
      openOptPicker({
        title: 'Pilih Barang — ' + card.nama,
        options: kats.map(kat => {
          const s = getKsSaldoKat(kat);
          const metodeKey = tujuanMetode || kartuStockTab;
          const total = (kat.data?.[metodeKey] || []).length;
          return {
            value: kat.id,
            label: kat.nama,
            sub: `Stok: ${s.totalQty} · ${total} entri · Tujuan: ${(mLabel[tujuanMetode]||tujuanMetode||'FIFO').toUpperCase()}`,
          };
        }),
        currentValue: activeKategoriId,
        onSelect: (katId) => { _doSelectKartuForInput(katId, onSelectKat); }
      });
    }
  });
}

function _doSelectKartuForInput(katId, onSelectKat) {
  // Switch ke card+kategori yang dipilih, lalu jalankan callback
  const found = _findKatById(katId);
  if(!found) return;
  switchActiveKS(found.card.id, katId);
  onSelectKat(katId);
}


// ── KONVERSI KARTU STOCK ANTAR METODE ─────────────────────────

let _ksConvDari = 'fifo';
let _ksConvKe   = 'wa';
let _ksConvOpt  = 'gabung'; // 'gabung' | 'timpa'
let _ksHapusLama = false;          // checkbox independen: hapus data sumber setelah konversi
const _ksLabel  = { fifo:'FIFO', lifo:'LIFO', wa:'Weighted Avg', mwa:'Moving WA' };
const _ksIcon   = { fifo:'🔼', lifo:'🔽', wa:'<i class="ti ti-scale ti-inline"></i>', mwa:'<i class="ti ti-chart-bar ti-inline"></i>' };

function openKonversiKartuStock() {
  _ksConvDari = kartuStockTab;
  // Default tujuan: metode lain
  const allM = ['fifo','lifo','wa','mwa'];
  _ksConvKe = allM.find(m => m !== _ksConvDari) || 'wa';
  // Update button states
  document.querySelectorAll('.ks-conv-dari').forEach(b => {
    b.classList.toggle('active', b.dataset.val === _ksConvDari);
  });
  document.querySelectorAll('.ks-conv-ke').forEach(b => {
    b.classList.toggle('active', b.dataset.val === _ksConvKe);
  });
  // Reset opsi ke default
  _ksConvOpt = 'gabung';
  _ksHapusLama = false;
  selectKsConvOpt('gabung');
  _updateKsHapusLamaUI();
  updateKsConvPreview();
  document.getElementById('ks-conv-preview-rows').style.display = 'none';
  openModal('modal-konversi-ks');
}

function selectKsConvDari(val, el) {
  _ksConvDari = val;
  document.querySelectorAll('.ks-conv-dari').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  // Jika sama dengan tujuan, swap tujuan
  if (_ksConvDari === _ksConvKe) {
    const allM = ['fifo','lifo','wa','mwa'];
    _ksConvKe = allM.find(m => m !== _ksConvDari) || 'wa';
    document.querySelectorAll('.ks-conv-ke').forEach(b => {
      b.classList.toggle('active', b.dataset.val === _ksConvKe);
    });
  }
  updateKsConvPreview();
  document.getElementById('ks-conv-preview-rows').style.display = 'none';
}

function selectKsConvKe(val, el) {
  _ksConvKe = val;
  document.querySelectorAll('.ks-conv-ke').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  if (_ksConvKe === _ksConvDari) {
    const allM = ['fifo','lifo','wa','mwa'];
    _ksConvDari = allM.find(m => m !== _ksConvKe) || 'fifo';
    document.querySelectorAll('.ks-conv-dari').forEach(b => {
      b.classList.toggle('active', b.dataset.val === _ksConvDari);
    });
  }
  updateKsConvPreview();
  document.getElementById('ks-conv-preview-rows').style.display = 'none';
}

function selectKsConvOpt(val) {
  // val: 'gabung' | 'timpa' — radio group, pilih salah satu
  _ksConvOpt = val;
  const opts = ['gabung', 'timpa'];
  opts.forEach(o => {
    const lbl   = document.getElementById('ks-opt-label-' + o);
    const radio = document.getElementById('ks-opt-radio-' + o);
    if (!lbl || !radio) return;
    if (o === val) {
      lbl.style.border   = '2px solid var(--accent)';
      radio.style.border = '2px solid var(--accent)';
      radio.innerHTML    = '<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);"></div>';
    } else {
      lbl.style.border   = '1px solid var(--border)';
      radio.style.border = '2px solid var(--muted)';
      radio.innerHTML    = '';
    }
  });
}

function toggleKsHapusLama() {
  // Checkbox independen — bisa aktif bersamaan dengan gabung atau timpa
  _ksHapusLama = !_ksHapusLama;
  _updateKsHapusLamaUI();
}

function _updateKsHapusLamaUI() {
  const lbl   = document.getElementById('ks-opt-label-hapus');
  const check = document.getElementById('ks-opt-check-hapus');
  if (!lbl || !check) return;
  if (_ksHapusLama) {
    lbl.style.border   = '2px solid var(--accent3)';
    check.style.border = '2px solid var(--accent3)';
    check.style.background = 'var(--accent3)';
    check.innerHTML    = '<svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="2,6 5,9 10,3"/></svg>';
  } else {
    lbl.style.border   = '1px solid var(--border)';
    check.style.border = '2px solid var(--muted)';
    check.style.background = 'transparent';
    check.innerHTML    = '';
  }
}

function updateKsConvPreview() {
  const srcData  = kartuStockData[_ksConvDari] || [];
  const dstData  = kartuStockData[_ksConvKe]   || [];
  const srcMasuk = srcData.filter(e => e.mQty > 0);
  const dstMasuk = dstData.filter(e => e.mQty > 0);

  document.getElementById('ks-conv-label-dari').textContent  = _ksLabel[_ksConvDari];
  document.getElementById('ks-conv-label-ke').textContent    = _ksLabel[_ksConvKe];
  document.getElementById('ks-conv-count-dari').textContent  = srcMasuk.length + ' entri masuk tersedia';
  document.getElementById('ks-conv-count-ke').textContent    = dstMasuk.length + ' entri sudah ada';
  document.getElementById('ks-dari-info').innerHTML =
    srcData.length ? `${srcData.length} total baris (${srcMasuk.length} masuk, ${srcData.filter(e=>e.kQty>0).length} keluar)` : '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Belum ada data di metode ini';
  document.getElementById('ks-ke-info').innerHTML =
    dstData.length ? `${dstData.length} total baris (${dstMasuk.length} masuk, ${dstData.filter(e=>e.kQty>0).length} keluar)` : 'Kosong — akan diisi dari konversi';
}

/** Ambil entri MASUK dari sumber dan kembalikan sebagai array baru */
function _getEntriesMasukFromSource(sumber) {
  return (kartuStockData[sumber] || [])
    .filter(e => e.mQty > 0)
    .map(e => ({ tgl: e.tgl, ket: e.ket || 'Masuk', mQty: e.mQty, mHarga: e.mHarga }));
}

/**
 * Gabungkan + sort entri masuk berdasarkan tanggal (terlama di atas).
 * Untuk FIFO dan LIFO: layer yang lebih lama harus di-assign id lebih rendah.
 * Untuk WA dan MWA: urutan masuk mempengaruhi rata-rata running.
 */
function _buildMergedMasuk(sumberEntries, tujuan) {
  const existing = (kartuStockData[tujuan] || [])
    .filter(e => e.mQty > 0)
    .map(e => ({ tgl: e.tgl, ket: e.ket, mQty: e.mQty, mHarga: e.mHarga }));

  const merged = [...existing, ...sumberEntries];

  // Sort berdasarkan tanggal ascending (terlama di atas)
  // Untuk metode yang tidak memerlukan urutan (WA/MWA sama saja, hasilnya identik)
  // Untuk FIFO/LIFO, urutan tanggal sangat penting
  merged.sort((a, b) => {
    const da = new Date(a.tgl), db = new Date(b.tgl);
    if (da < db) return -1;
    if (da > db) return 1;
    return 0; // jika tanggal sama, pertahankan urutan relatif
  });

  return merged;
}

/**
 * Rebuild kartu stock dari awal berdasarkan entri masuk yang sudah diurutkan,
 * lalu terapkan metode perhitungan yang sesuai.
 * Entri KELUAR tidak dikonversi — dihapus dari tujuan agar tidak confuse.
 */
function _rekalkulasiKartuStock(mergedMasuk, metode) {
  const newStorage = [];
  let runningStock = [];

  mergedMasuk.forEach(e => {
    const id = kartuStockIdCounter++;

    // Masukkan ke running stock sesuai metode
    if (metode === 'wa') {
      const tq = runningStock.reduce((s,x)=>s+x.qty,0) + e.mQty;
      const tv = runningStock.reduce((s,x)=>s+x.qty*x.harga,0) + e.mQty*e.mHarga;
      runningStock = [{ qty: tq, harga: tq ? tv/tq : 0 }];
    } else if (metode === 'mwa') {
      const tq = runningStock.reduce((s,x)=>s+x.qty,0) + e.mQty;
      const tv = runningStock.reduce((s,x)=>s+x.qty*x.harga,0) + e.mQty*e.mHarga;
      runningStock = [{ qty: tq, harga: tq ? tv/tq : 0 }];
    } else {
      // fifo / lifo: tambahkan layer baru
      runningStock.push({ qty: e.mQty, harga: e.mHarga });
    }

    const sl = runningStock.filter(x=>x.qty>0).map(x=>({...x}));
    newStorage.push({
      id, tgl: e.tgl, ket: e.ket,
      mQty: e.mQty, mHarga: e.mHarga,
      kQty: 0, kHarga: 0, kJml: 0,
      saldoLayers: sl,
      jurnalDone: false,
      _converted: true  // penanda baris hasil konversi
    });
  });

  return newStorage;
}

function previewKonversiKS() {
  const srcEntries = _getEntriesMasukFromSource(_ksConvDari);
  if (!srcEntries.length) {
    showAlert(`<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tidak ada entri masuk di kartu stock ${_ksLabel[_ksConvDari]}`);
    return;
  }
  const merge  = _ksConvOpt === 'gabung'; // radio: gabung atau timpa
  const merged = merge ? _buildMergedMasuk(srcEntries, _ksConvKe) : srcEntries.slice().sort((a,b)=>new Date(a.tgl)-new Date(b.tgl));

  const el = document.getElementById('ks-conv-preview-rows');
  el.style.display = 'block';
  el.innerHTML = `<div style="font-weight:700;margin-bottom:6px;color:var(--text);">Preview urutan entri MASUK → ${_ksLabel[_ksConvKe]} (${merged.length} entri):</div>` +
    merged.map((e, i) => {
      const isNew = srcEntries.some(s => s.tgl===e.tgl && s.mQty===e.mQty && s.mHarga===e.mHarga);
      return `<div style="display:flex;gap:8px;padding:4px 6px;border-radius:4px;background:${isNew?'rgba(34,211,238,0.07)':'transparent'};margin-bottom:2px;">
        <span style="min-width:20px;color:var(--muted);">${i+1}</span>
        <span style="min-width:90px;font-family:var(--mono);">${e.tgl}</span>
        <span style="flex:1;">${e.ket}</span>
        <span style="color:var(--accent);">+${e.mQty} × ${rp(e.mHarga)}</span>
        ${isNew?'<span style="color:var(--accent2);font-size:10px;">✨ dari sumber</span>':'<span style="color:var(--muted);font-size:10px;">sudah ada</span>'}
      </div>`;
    }).join('');
}

function eksekusiKonversiKS() {
  const srcEntries = _getEntriesMasukFromSource(_ksConvDari);
  if (!srcEntries.length) {
    showAlert(`<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tidak ada entri masuk di kartu stock ${_ksLabel[_ksConvDari]}`);
    return;
  }
  if (_ksConvDari === _ksConvKe) {
    showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Metode sumber dan tujuan tidak boleh sama');
    return;
  }

  const merge        = _ksConvOpt === 'gabung'; // radio group
  const replace      = _ksConvOpt === 'timpa';  // radio group
  const deleteSource = _ksHapusLama;             // checkbox independen

  showOpSpinner(`Mengkonversi ${_ksLabel[_ksConvDari]} → ${_ksLabel[_ksConvKe]}...`, 'Mengurutkan & menghitung ulang');

  setTimeout(() => {
    try {
      let mergedMasuk;
      if (merge) {
        mergedMasuk = _buildMergedMasuk(srcEntries, _ksConvKe);
      } else {
        // Timpa/Hapus: hanya dari sumber, sort tanggal
        mergedMasuk = srcEntries.slice().sort((a,b) => new Date(a.tgl)-new Date(b.tgl));
      }

      // Rebuild kartu tujuan dari entri yang sudah diurutkan
      const newData = _rekalkulasiKartuStock(mergedMasuk, _ksConvKe);
      kartuStockData[_ksConvKe] = newData;

      // Hapus data sumber jika opsi 'hapus'
      if (deleteSource) {
        kartuStockData[_ksConvDari] = [];
      }
      // Catatan: jika gabung atau timpa, data sumber TIDAK diubah sama sekali

      // Switch ke tab tujuan
      closeModal('modal-konversi-ks');
      const tabEl = document.getElementById('ks-tab-' + _ksConvKe);
      if (tabEl) switchKartuStockTab(_ksConvKe, tabEl);
      else { kartuStockTab = _ksConvKe; renderKartuStock(); }

      saveKartuStockToCloud();
      hideOpSpinner();

      const modeStr  = merge ? 'digabung ke' : 'timpa ke';
      const hapusStr = deleteSource ? ' · <b>Data sumber dihapus</b>' : '';
      const infoOpt  = `${srcEntries.length} entri ${_ksLabel[_ksConvDari]} ${modeStr} ${_ksLabel[_ksConvKe]}${hapusStr}`;
      showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Konversi berhasil! ${infoOpt} → ${_ksLabel[_ksConvKe]}. Total: ${newData.length} entri, diurutkan berdasarkan tanggal.`);

      // Scroll ke kartu stock
      setTimeout(() => {
        const wrap = document.getElementById('catatan-persediaan-wrap');
        if (wrap) wrap.scrollIntoView({ behavior:'smooth', block:'start' });
      }, 300);

    } catch(e) {
      hideOpSpinner();
      showAlert('❌ Gagal konversi: ' + e.message);
    }
  }, 900);
}

function switchKartuStockTab(tab, el) {
  kartuStockTab = tab;
  document.querySelectorAll('#kartu-stock-tabs button').forEach(b => {
    b.style.background = 'var(--surface2)';
    b.style.border = '1px solid var(--border)';
    b.style.color = 'var(--muted)';
  });
  if (el && el.style) {
    el.style.background = 'rgba(74,222,128,0.1)';
    el.style.border = '1px solid var(--accent)';
    el.style.color = 'var(--accent)';
  }
  const lbl = {fifo:'FIFO',lifo:'LIFO',wa:'Weighted Average',mwa:'Moving Weighted Avg'};
  const lblFull = {
    fifo:'FIFO (First In First Out)',
    lifo:'LIFO (Last In First Out)',
    wa:'Weighted Average (Rata-rata Tertimbang)',
    mwa:'Moving Average (Rata-rata Bergerak)'
  };
  // Sync label di header tabel bawah
  const activeTabLbl = document.getElementById('ks-active-tab-label');
  if (activeTabLbl) activeTabLbl.textContent = 'Metode: ' + (lbl[tab]||tab);
  // Sync label di picker kanan atas (ks-metode-picker-label) — element statis di index.html
  const pickerLbl = document.getElementById('ks-metode-picker-label');
  if (pickerLbl) pickerLbl.textContent = lblFull[tab] || (lbl[tab]||tab);
  const pickerCur = document.getElementById('ks-metode-current');
  if (pickerCur) pickerCur.value = tab;
  renderKartuStock();
}

function inputKeKartuStock() {
  const kartu = window._invKartu;
  // Selalu ambil metode dari picker "Metode & Transaksi" (inv-metode), bukan dari kartuStockTab (filter)
  const metode = document.getElementById('inv-metode')?.value || window._invMetode || 'fifo';
  if(!kartu || !kartu.length) { showAlert('Hitung persediaan dulu!'); return; }

  // Kirim tujuanMetode ke popup agar keterangan tampil benar
  showPilihKartuStockPopup((katId) => {
    // _doSelectKartuForInput sudah switch active, langsung input
    _doInputKeKartuStock(kartu, metode);
  }, metode);
}

function _doInputKeKartuStock(kartu, metode) {
  // Ambil langsung dari kategori aktif (bukan kartuStockData yang sudah deep copy)
  const activeKat = getActiveKategori();
  if(!activeKat) { showAlert('Pilih kategori terlebih dahulu!'); return; }
  if(!activeKat.data[metode]) activeKat.data[metode] = [];
  const storage = activeKat.data[metode];
  // Sync kartuStockData agar render benar
  kartuStockData = activeKat.data;
  let runningStock = rebuildStockFromKartu(storage, metode);

  kartu.forEach(k => {
    const id = kartuStockIdCounter++;
    if(k.mQty !== '') {
      // MASUK — process into running stock
      if(metode === 'wa') {
        const tq = runningStock.reduce((s,x)=>s+x.qty,0) + k.mQty;
        const tv = runningStock.reduce((s,x)=>s+x.qty*x.harga,0) + k.mQty*k.mHarga;
        runningStock = [{qty:tq, harga:tv/tq}];
      } else if(metode === 'mwa') {
        const tq = runningStock.reduce((s,x)=>s+x.qty,0) + k.mQty;
        const tv = runningStock.reduce((s,x)=>s+x.qty*x.harga,0) + k.mQty*k.mHarga;
        runningStock = [{qty:tq, harga:tq?tv/tq:0}];
      } else {
        runningStock.push({qty:k.mQty, harga:k.mHarga});
      }
      const sl = runningStock.filter(x=>x.qty>0).map(x=>({...x}));
      storage.push({id, tgl:k.tgl, ket:k.ket, mQty:k.mQty, mHarga:k.mHarga, kQty:0, kHarga:0, kJml:0, saldoLayers:sl, jurnalDone:false});
    } else {
      // KELUAR — re-process from running stock
      let qSisa = k.kQty;
      let hppBatch = 0;
      let keluarLayers = [];
      if(metode === 'fifo') {
        while(qSisa > 0 && runningStock.length) {
          const layer = runningStock[0];
          const ambil = Math.min(layer.qty, qSisa);
          hppBatch += ambil * layer.harga;
          keluarLayers.push({qty:ambil, harga:layer.harga});
          layer.qty -= ambil; qSisa -= ambil;
          if(layer.qty <= 0) runningStock.shift();
        }
      } else if(metode === 'lifo') {
        while(qSisa > 0 && runningStock.length) {
          const layer = runningStock[runningStock.length-1];
          const ambil = Math.min(layer.qty, qSisa);
          hppBatch += ambil * layer.harga;
          keluarLayers.push({qty:ambil, harga:layer.harga});
          layer.qty -= ambil; qSisa -= ambil;
          if(layer.qty <= 0) runningStock.pop();
        }
      } else {
        const tq = runningStock.reduce((s,x)=>s+x.qty,0);
        const tv = runningStock.reduce((s,x)=>s+x.qty*x.harga,0);
        const ha = tq ? tv/tq : 0;
        hppBatch = ha * k.kQty;
        keluarLayers = [{qty:k.kQty, harga:ha}];
        let sisa2 = k.kQty;
        for(let i=0;i<runningStock.length&&sisa2>0;i++) {
          const ambil = Math.min(runningStock[i].qty, sisa2);
          runningStock[i].qty -= ambil; sisa2 -= ambil;
        }
        runningStock = runningStock.filter(x=>x.qty>0);
      }
      const sl = runningStock.filter(x=>x.qty>0).map(x=>({...x}));
      const hppPerUnit = k.kQty ? hppBatch/k.kQty : 0;
      storage.push({id, tgl:k.tgl, ket:k.ket, mQty:0, mHarga:0, kQty:k.kQty, kHarga:hppPerUnit, kJml:hppBatch, keluarLayers, saldoLayers:sl, jurnalDone:false});
    }
  });

  // Switch ke tab metode yg baru diinput
  kartuStockTab = metode;
  const tabEl = document.getElementById('ks-tab-'+metode);
  if(tabEl) switchKartuStockTab(metode, tabEl);
  else renderKartuStock();

  const ksNama = multiKartuStock[activeKartuStockId]?.nama || '';
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Berhasil disimpan ke "${ksNama}" (${metode.toUpperCase()})!`);
  saveMKS();
  setTimeout(()=>{ const el=document.getElementById('catatan-persediaan-wrap'); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }, 200);
}

function rebuildStockFromKartu(storage, metode) {
  let stock = [];
  storage.forEach(e => {
    if(e.mQty > 0) {
      if(metode==='wa'||metode==='mwa') {
        const tq = stock.reduce((s,x)=>s+x.qty,0)+e.mQty;
        const tv = stock.reduce((s,x)=>s+x.qty*x.harga,0)+e.mQty*e.mHarga;
        stock = [{qty:tq,harga:tq?tv/tq:0}];
      } else { stock.push({qty:e.mQty,harga:e.mHarga}); }
    } else if(e.kQty > 0) {
      let sisa=e.kQty;
      if(metode==='fifo') { while(sisa>0&&stock.length){const l=stock[0];const a=Math.min(l.qty,sisa);l.qty-=a;sisa-=a;if(l.qty<=0)stock.shift();} }
      else if(metode==='lifo') { while(sisa>0&&stock.length){const l=stock[stock.length-1];const a=Math.min(l.qty,sisa);l.qty-=a;sisa-=a;if(l.qty<=0)stock.pop();} }
      else { let s2=sisa;for(let i=0;i<stock.length&&s2>0;i++){const a=Math.min(stock[i].qty,s2);stock[i].qty-=a;s2-=a;}stock=stock.filter(x=>x.qty>0); }
    }
  });
  return stock;
}

function _buildKartuStockTable(storage) {
  const isLayered = (kartuStockTab==='fifo'||kartuStockTab==='lifo');
  let html = `<div class="ks-table-wrap"><table>
    <thead><tr>
          <th style="min-width:72px">Tgl</th>
          <th style="min-width:90px">Ket</th>
          <th colspan="3" style="text-align:center;border-left:1px solid var(--border)">MASUK</th>
          <th colspan="3" style="text-align:center;border-left:1px solid var(--border)">KELUAR</th>
          <th colspan="3" style="text-align:center;border-left:1px solid var(--border)">SALDO</th>
          <th style="min-width:40px">AK</th>
        </tr><tr>
          <th></th><th></th>
          <th style="border-left:1px solid var(--border);min-width:50px">Qty</th>
          <th style="min-width:90px">Hrg Beli</th>
          <th style="min-width:100px">Jumlah</th>
          <th style="border-left:1px solid var(--border);min-width:50px">Qty</th>
          <th style="min-width:90px">HPP/Unit</th>
          <th style="min-width:100px">Jumlah</th>
          <th style="border-left:1px solid var(--border);min-width:50px">Qty</th>
          <th style="min-width:90px">Hrg</th>
          <th style="min-width:100px">Jumlah</th>
          <th></th>
        </tr></thead>
    <tbody id="ks-table-body">`;

  storage.forEach((e, idx) => {
    const saldoRows = isLayered
      ? e.saldoLayers
      : [{qty: e.saldoLayers.reduce((s,x)=>s+x.qty,0), harga: e.saldoLayers.length ? e.saldoLayers.reduce((s,x)=>s+x.qty*x.harga,0)/e.saldoLayers.reduce((s,x)=>s+x.qty,0) : 0}];

    if(e.mQty > 0) {
      const rowspan = Math.max(saldoRows.length, 1);
      html += `<tr>
        <td rowspan="${rowspan}" style="font-size:11px">${e.tgl}</td>
        <td rowspan="${rowspan}" style="font-size:12px">${e.ket||'masuk'}</td>
        <td rowspan="${rowspan}" style="border-left:1px solid var(--border)" class="num debit">${e.mQty}</td>
        <td rowspan="${rowspan}" class="num">${rp(e.mHarga)}</td>
        <td rowspan="${rowspan}" class="debit">${rp(e.mQty*e.mHarga)}</td>
        <td rowspan="${rowspan}" style="border-left:1px solid var(--border)" class="num"></td>
        <td rowspan="${rowspan}" class="num"></td>
        <td rowspan="${rowspan}" class="num"></td>
        <td style="border-left:1px solid var(--border)" class="num">${saldoRows[0]?.qty||0}</td>
        <td class="num">${rp(saldoRows[0]?.harga||0)}</td>
        <td class="num">${rp((saldoRows[0]?.qty||0)*(saldoRows[0]?.harga||0))}</td>
        <td rowspan="${rowspan}" style="text-align:center"><button class="ks-hapus-btn" data-idx="${idx}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;padding:4px 8px;"><i class="ti ti-trash ti-btn"></i></button></td>
      </tr>`;
      for(let i=1;i<saldoRows.length;i++) {
        html += `<tr><td style="border-left:1px solid var(--border)" class="num">${saldoRows[i].qty}</td><td class="num">${rp(saldoRows[i].harga)}</td><td class="num">${rp(saldoRows[i].qty*saldoRows[i].harga)}</td></tr>`;
      }
    } else {
      const keluarRows = (isLayered && e.keluarLayers && e.keluarLayers.length > 1) ? e.keluarLayers : null;
      const maxRows = Math.max(keluarRows?keluarRows.length:1, saldoRows.length||1);
      const jurnalBadge = e.jurnalDone
        ? '<span style="color:var(--accent);font-size:10px;display:block;margin-bottom:4px;"><i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;"></i>jurnal</span>'
        : `<button class="ks-jurnal-btn" data-idx="${idx}" style="background:rgba(34,211,238,0.1);border:1px solid var(--accent2);color:var(--accent2);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;font-family:var(--sans);display:block;margin-bottom:4px;"><i class="ti ti-download ti-inline"></i> Jurnal</button>`;
      if(!keluarRows) {
        html += `<tr>
          <td rowspan="${maxRows}" style="font-size:11px">${e.tgl}</td>
          <td rowspan="${maxRows}" style="font-size:12px">${e.ket||'keluar'}</td>
          <td rowspan="${maxRows}" style="border-left:1px solid var(--border)" class="num"></td>
          <td rowspan="${maxRows}" class="num"></td><td rowspan="${maxRows}" class="num"></td>
          <td rowspan="${maxRows}" style="border-left:1px solid var(--border)" class="num kredit">${e.kQty}</td>
          <td rowspan="${maxRows}" class="num">${rp(e.kHarga)}</td>
          <td rowspan="${maxRows}" class="num kredit">${rp(e.kJml)}</td>
          <td style="border-left:1px solid var(--border)" class="num">${saldoRows[0]?.qty||0}</td>
          <td class="num">${rp(saldoRows[0]?.harga||0)}</td>
          <td class="num">${rp((saldoRows[0]?.qty||0)*(saldoRows[0]?.harga||0))}</td>
          <td rowspan="${maxRows}" style="text-align:center;vertical-align:middle;padding:6px;">${jurnalBadge}<button class="ks-hapus-btn" data-idx="${idx}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;padding:4px 8px;"><i class="ti ti-trash ti-btn"></i></button></td>
        </tr>`;
        for(let i=1;i<saldoRows.length;i++) {
          html += `<tr><td style="border-left:1px solid var(--border)" class="num">${saldoRows[i]?.qty||0}</td><td class="num">${rp(saldoRows[i]?.harga||0)}</td><td class="num">${rp((saldoRows[i]?.qty||0)*(saldoRows[i]?.harga||0))}</td></tr>`;
        }
      }
    }
  });
  html += '</tbody></table></div>';

  // Attach events after render
  setTimeout(() => {
    const tbody = document.getElementById('ks-table-body');
    if(tbody) _attachKartuStockEvents(tbody);
  }, 50);

  return html;
}


/** Koreksi top offset sticky header row-2 — dipanggil setelah DOM fully painted */
function fixKsTableStickyHeaders() {
  // Double rAF memastikan browser sudah layout + paint sebelum kita baca ukuran
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('.ks-table-wrap').forEach(wrap => {
        const row1 = wrap.querySelector('thead tr:first-child');
        const row2ths = wrap.querySelectorAll('thead tr:nth-child(2) th');
        if(!row1 || !row2ths.length) return;
        // getBoundingClientRect lebih akurat untuk ukuran visual aktual
        const h = row1.getBoundingClientRect().height;
        if(h > 0) {
          row2ths.forEach(th => { th.style.top = Math.round(h) + 'px'; });
        }
      });
    });
  });
}
function renderKartuStock() {
  const storage = kartuStockData[kartuStockTab] || [];
  const tbody = document.getElementById('ks-table-body');
  const isLayered = (kartuStockTab==='fifo'||kartuStockTab==='lifo');
  if(!storage.length) {
    tbody.innerHTML = '<tr><td colspan="12">Belum ada catatan.</td></tr>';
    document.getElementById('ks-stock-summary').style.display='none';
    _attachKartuStockEvents(tbody);
    return;
  }

  // Helper: normalisasi saldoLayers sesuai metode
  function getSaldoRows(e) {
    if (!isLayered) {
      const totalQty   = (e.saldoLayers||[]).reduce((s,x)=>s+x.qty, 0);
      const totalNilai = (e.saldoLayers||[]).reduce((s,x)=>s+x.qty*x.harga, 0);
      const harga = totalQty > 0 ? totalNilai / totalQty : 0;
      return [{qty: totalQty, harga}];
    }
    const layers = (e.saldoLayers||[]).filter(x=>x.qty>0);
    return layers.length ? layers : [{qty:0, harga:0}];
  }

  // Helper: render sel SALDO (3 kolom)
  function tdSaldo(row) {
    const qty   = row ? row.qty   : 0;
    const harga = row ? row.harga : 0;
    return `<td style="border-left:1px solid var(--border)" class="num">${qty||0}</td>`
         + `<td class="num">${rp(harga||0)}</td>`
         + `<td class="num">${rp((qty||0)*(harga||0))}</td>`;
  }

  // Helper: render sel kosong (n kolom)
  function tdEmpty(n) { return '<td></td>'.repeat(n); }

  let html = '';
  storage.forEach((e, idx) => {
    const saldoRows = getSaldoRows(e);
    const nSaldo    = saldoRows.length;   // jumlah baris yang dibutuhkan untuk saldo

    if (e.mQty > 0) {
      // ── BARIS MASUK ──────────────────────────────────────────────
      // Baris pertama: semua kolom + saldo baris pertama
      html += `<tr>
        <td rowspan="${nSaldo}" style="font-size:11px;vertical-align:top">${e.tgl}</td>
        <td rowspan="${nSaldo}" style="font-size:12px;vertical-align:top">${e.ket||'masuk'}</td>
        <td rowspan="${nSaldo}" style="border-left:1px solid var(--border)" class="num debit">${e.mQty}</td>
        <td rowspan="${nSaldo}" class="num">${rp(e.mHarga)}</td>
        <td rowspan="${nSaldo}" class="debit">${rp(e.mQty*e.mHarga)}</td>
        <td rowspan="${nSaldo}" style="border-left:1px solid var(--border)" class="num"></td>
        <td rowspan="${nSaldo}" class="num"></td>
        <td rowspan="${nSaldo}" class="num"></td>
        ${tdSaldo(saldoRows[0])}
        <td rowspan="${nSaldo}" style="text-align:center;vertical-align:top">
          <button class="ks-hapus-btn" data-idx="${idx}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;padding:4px 8px;" title="Hapus baris">
            <i class="ti ti-trash ti-btn"></i>
          </button>
        </td>
      </tr>`;
      // Baris tambahan untuk layer saldo ke-2, ke-3, dst
      for (let i = 1; i < nSaldo; i++) {
        html += `<tr>${tdSaldo(saldoRows[i])}</tr>`;
      }

    } else {
      // ── BARIS KELUAR ─────────────────────────────────────────────
      const keluarRows = (isLayered && e.keluarLayers && e.keluarLayers.length > 1) ? e.keluarLayers : null;
      const nKeluar    = keluarRows ? keluarRows.length : 1;
      const maxRows    = Math.max(nKeluar, nSaldo);

      const jurnalBadge = e.jurnalDone
        ? `<span style="color:var(--accent);font-size:10px;display:block;margin-bottom:4px;">
             <i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>jurnal
           </span>`
        : `<button class="ks-jurnal-btn" data-idx="${idx}"
             style="background:rgba(34,211,238,0.1);border:1px solid var(--accent2);color:var(--accent2);
                    border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;
                    font-family:var(--sans);display:block;margin-bottom:4px;">
             <i class="ti ti-download ti-inline"></i> Jurnal
           </button>`;

      if (!keluarRows) {
        // Keluar tidak multi-layer — kolom KELUAR pakai rowspan penuh
        html += `<tr>
          <td rowspan="${maxRows}" style="font-size:11px;vertical-align:top">${e.tgl}</td>
          <td rowspan="${maxRows}" style="font-size:12px;vertical-align:top">${e.ket||'keluar'}</td>
          <td rowspan="${maxRows}" style="border-left:1px solid var(--border)" class="num"></td>
          <td rowspan="${maxRows}" class="num"></td>
          <td rowspan="${maxRows}" class="num"></td>
          <td rowspan="${maxRows}" style="border-left:1px solid var(--border)" class="num kredit">${e.kQty}</td>
          <td rowspan="${maxRows}" class="num">${rp(e.kHarga)}</td>
          <td rowspan="${maxRows}" class="num kredit">${rp(e.kJml)}</td>
          ${tdSaldo(saldoRows[0])}
          <td rowspan="${maxRows}" style="text-align:center;vertical-align:top;padding:6px;">
            ${jurnalBadge}
            <button class="ks-hapus-btn" data-idx="${idx}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;padding:4px 8px;" title="Hapus">
              <i class="ti ti-trash ti-btn"></i>
            </button>
          </td>
        </tr>`;
        for (let i = 1; i < maxRows; i++) {
          html += `<tr>${tdSaldo(saldoRows[i]||null)}</tr>`;
        }
      } else {
        // Keluar multi-layer (FIFO/LIFO) — render baris per layer keluar + saldo
        html += `<tr>
          <td rowspan="${maxRows}" style="font-size:11px;vertical-align:top">${e.tgl}</td>
          <td rowspan="${maxRows}" style="font-size:12px;vertical-align:top">${e.ket||'keluar'}</td>
          <td rowspan="${maxRows}" style="border-left:1px solid var(--border)" class="num"></td>
          <td rowspan="${maxRows}" class="num"></td>
          <td rowspan="${maxRows}" class="num"></td>
          <td style="border-left:1px solid var(--border)" class="num kredit">${keluarRows[0].qty}</td>
          <td class="num">${rp(keluarRows[0].harga)}</td>
          <td class="num kredit">${rp(keluarRows[0].qty*keluarRows[0].harga)}</td>
          ${tdSaldo(saldoRows[0]||null)}
          <td rowspan="${maxRows}" style="text-align:center;vertical-align:top;padding:6px;">
            ${jurnalBadge}
            <button class="ks-hapus-btn" data-idx="${idx}" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:18px;padding:4px 8px;">
              <i class="ti ti-trash ti-btn"></i>
            </button>
          </td>
        </tr>`;
        for (let i = 1; i < maxRows; i++) {
          const kr = keluarRows[i] || null;
          const sr = saldoRows[i]  || null;
          const tdK = kr
            ? `<td style="border-left:1px solid var(--border)" class="num kredit">${kr.qty}</td><td class="num">${rp(kr.harga)}</td><td class="num kredit">${rp(kr.qty*kr.harga)}</td>`
            : `<td style="border-left:1px solid var(--border)" class="num"></td><td class="num"></td><td class="num"></td>`;
          html += `<tr>${tdK}${tdSaldo(sr)}</tr>`;
        }
      }
    }
  });

  if (tbody) { tbody.innerHTML = html; _attachKartuStockEvents(tbody); }

  // Update summary
  const lastEntry  = storage[storage.length-1];
  const sl         = lastEntry ? (lastEntry.saldoLayers||[]) : [];
  const saldoQty   = sl.reduce((s,x)=>s+x.qty, 0);
  const saldoNilai = sl.reduce((s,x)=>s+x.qty*x.harga, 0);
  const totalHppTercatat = storage.filter(e=>e.kQty>0).reduce((s,e)=>s+e.kJml, 0);
  document.getElementById('ks-saldo-qty').textContent   = saldoQty.toLocaleString('id-ID');
  document.getElementById('ks-saldo-nilai').textContent = rp(saldoNilai);
  document.getElementById('ks-total-hpp').textContent   = rp(totalHppTercatat);
  document.getElementById('ks-stock-summary').style.display='block';
  fixKsTableStickyHeaders();
}

function _ksConfirm(msg, icon, onOk) {
  const modal = document.getElementById('ks-confirm-modal');
  document.getElementById('ks-confirm-msg').textContent = msg;
  document.getElementById('ks-confirm-icon').innerHTML = icon || '<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i>';
  modal.style.display = 'flex';
  // clone buttons to remove old listeners
  const okBtn = document.getElementById('ks-confirm-ok');
  const cancelBtn = document.getElementById('ks-confirm-cancel');
  const newOk = okBtn.cloneNode(true);
  const newCancel = cancelBtn.cloneNode(true);
  okBtn.parentNode.replaceChild(newOk, okBtn);
  cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);
  newOk.addEventListener('click', function() {
    modal.style.display = 'none';
    onOk();
  });
  newCancel.addEventListener('click', function() {
    modal.style.display = 'none';
  });
}

function _attachKartuStockEvents(tbody) {
  tbody.querySelectorAll('.ks-hapus-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const idx = parseInt(this.getAttribute('data-idx'));
      if(isNaN(idx)) return;
      _ksConfirm('Hapus entri ini dari Kartu Stock?', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>', function() {
        kartuStockData[kartuStockTab].splice(idx, 1);
        syncKategoriFromKartuStockData();
        renderKartuStock();
        saveMKS();
      });
    });
  });
  tbody.querySelectorAll('.ks-jurnal-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      const idx = parseInt(this.getAttribute('data-idx'));
      if(!isNaN(idx)) bukaPopupJurnalSingle(idx);
    });
  });
}

function clearKartuStock() {
  // Cek apakah ada catatan sama sekali di semua metode kategori aktif
  const activeKat = getActiveKategori();
  const hasAny = activeKat && Object.values(activeKat.data || {}).some(arr => arr && arr.length > 0);
  if (!hasAny) {
    showAlert('<i class="ti ti-info-circle" style="color:var(--accent2);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Tidak ada catatan yang terdeteksi di kategori ini.');
    return;
  }
  _ksConfirm('Hapus semua catatan metode ' + kartuStockTab.toUpperCase() + '?', '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>', function() {
    // Hapus data di kategori aktif untuk metode yg dipilih
    const kat = getActiveKategori();
    if (kat && kat.data) kat.data[kartuStockTab] = [];
    // Sync kartuStockData dari kategori (agar render benar)
    syncKartuStockDataFromKategori();
    renderKartuStock();
    saveMKS();
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Semua catatan metode ' + kartuStockTab.toUpperCase() + ' berhasil dihapus.');
  });
}

function bukaPopupJurnalSingle(idx) {
  // Buka popup dengan 1 transaksi keluar yang dipilih
  const popup = document.getElementById('ks-jurnal-popup');
  const list = document.getElementById('ks-jurnal-popup-list');
  const e = kartuStockData[kartuStockTab][idx];
  if(!e) return;
  list.innerHTML = `
    <div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div>
          <div style="font-size:13px;font-weight:700;">${e.tgl} — ${escapeHtml(e.ket||'keluar')}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px;">Qty Keluar: <b>${e.kQty}</b> unit | HPP Total: <b>${rp(e.kJml)}</b></div>
        </div>
        <span style="color:var(--accent2);font-size:12px;font-weight:700;">${kartuStockTab.toUpperCase()}</span>
      </div>
      <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
        <input type="checkbox" id="ks-j-check-single" checked style="width:16px;height:16px;accent-color:var(--accent);">
        <span style="font-size:13px;">Konfirmasi input ke Jurnal</span>
      </label>
    </div>`;
  popup.dataset.singleIdx = idx;
  popup.style.display = 'flex';
}

function bukaPopupJurnalSemua() {
  const storage = kartuStockData[kartuStockTab];
  const keluarList = storage.filter(e=>e.kQty>0 && !e.jurnalDone);
  const popup = document.getElementById('ks-jurnal-popup');
  const list = document.getElementById('ks-jurnal-popup-list');
  delete popup.dataset.singleIdx;
  if(!keluarList.length) {
    list.innerHTML = '<div style="color:var(--muted);font-size:13px;text-align:center;padding:20px;">Semua transaksi keluar sudah diinput ke jurnal.</div>';
    popup.style.display='flex';
    return;
  }
  list.innerHTML = keluarList.map((e,i) => {
    const origIdx = storage.indexOf(e);
    return `<div style="background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:14px 16px;">
      <label style="display:flex;gap:10px;cursor:pointer;align-items:flex-start;">
        <input type="checkbox" class="ks-j-check" data-idx="${origIdx}" checked style="width:16px;height:16px;accent-color:var(--accent);flex-shrink:0;margin-top:2px;">
        <div>
          <div style="font-size:13px;font-weight:700;">${e.tgl} — ${escapeHtml(e.ket||'keluar')}</div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px;">Qty Keluar: <b>${e.kQty}</b> unit | HPP Total: <b>${rp(e.kJml)}</b></div>
        </div>
      </label>
    </div>`;
  }).join('');
  popup.style.display='flex';
}

function konfirmasiInputJurnalKartu() {
  const popup = document.getElementById('ks-jurnal-popup');
  const storage = kartuStockData[kartuStockTab];
  const metode = kartuStockTab;
  let selectedEntries = [];

  if(popup.dataset.singleIdx !== undefined) {
    // Single mode
    const chk = document.getElementById('ks-j-check-single');
    if(chk && chk.checked) selectedEntries.push(parseInt(popup.dataset.singleIdx));
  } else {
    // Multi mode
    document.querySelectorAll('.ks-j-check:checked').forEach(chk => {
      selectedEntries.push(parseInt(chk.dataset.idx));
    });
  }

  if(!selectedEntries.length) { showAlert('Pilih minimal 1 transaksi.'); return; }

  const kode = nextKode('INV');
  const today = new Date().toISOString().split('T')[0];
  const jurnals = [];

  selectedEntries.forEach(idx => {
    const e = storage[idx];
    if(!e || e.kJml <= 0) return;
    jurnals.push({
      tanggal: e.tgl || today,
      ket: `Pengakuan HPP ${metode.toUpperCase()} - ${e.ket||'keluar'} [${kode}]`,
      jenis: 'Manual',
      lines: [
        { akun:'5101', ket:'HPP - Harga Pokok Penjualan', debit:e.kJml, kredit:0 },
        { akun:'1301', ket:'Persediaan Barang Dagangan', debit:0, kredit:e.kJml }
      ]
    });
    e.jurnalDone = true;
  });

  if(!jurnals.length) { showAlert('Tidak ada transaksi valid.'); return; }

  checkAndInputKalkulator(kode, jurnals,
    `Jurnal HPP ${metode.toUpperCase()} dari Kartu Stock (${selectedEntries.length} transaksi) diinput`,
    (k) => { lastKalkInput = {kode:k, jurnalIndices:[]}; }
  );

  popup.style.display='none';
  syncKategoriFromKartuStockData();
  renderKartuStock();
  saveMKS();
  showAlert(`<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${selectedEntries.length} jurnal HPP berhasil diinput!`);
}

/**
 * Hitung HPP lines untuk penjualan qty unit dari kartu stock ks.
 * FIFO: bisa multi-layer. WA/LIFO/MWA: satu baris rata-rata.
 */
/**
 * Otomatis kurangi stok di kartu stock saat ada penjualan.
 */
function addKartuStockOnBuy(katId, qty, hargaPerUnit, tanggal, ket) {
  console.log('[BUY] dipanggil katId='+katId+' qty='+qty+' harga='+hargaPerUnit);
  const found = _findKatById(katId);
  console.log('[BUY] found=', found ? 'YA ('+found.kat.nama+')' : 'TIDAK - katId tidak ketemu di multiKartuStock!');
  if (!found || qty <= 0 || hargaPerUnit < 0) {
    console.log('[BUY] RETURN AWAL - found:'+!!found+' qty:'+qty+' harga:'+hargaPerUnit);
    return;
  }
  const kat    = found.kat;
  const metode = getKsSaldo(kat).metode || 'fifo';
  console.log('[BUY] metode='+metode+' storage sebelum='+( kat.data[metode]||[]).length+' entri');
  if (!kat.data[metode]) kat.data[metode] = [];
  const storage = kat.data[metode];

  // Rebuild running stock
  let runningStock = rebuildStockFromKartu(storage, metode);

  // Tambah layer baru
  if (metode === 'wa') {
    const tq = runningStock.reduce((s,x)=>s+x.qty,0) + qty;
    const tv = runningStock.reduce((s,x)=>s+x.qty*x.harga,0) + qty*hargaPerUnit;
    runningStock = [{qty:tq, harga:tv/tq}];
  } else if (metode === 'mwa') {
    const tq = runningStock.reduce((s,x)=>s+x.qty,0) + qty;
    const tv = runningStock.reduce((s,x)=>s+x.qty*x.harga,0) + qty*hargaPerUnit;
    runningStock = [{qty:tq, harga:tq?tv/tq:0}];
  } else {
    // FIFO / LIFO: tambah layer baru
    runningStock.push({qty, harga: hargaPerUnit});
  }

  const sl = runningStock.filter(x=>x.qty>0).map(x=>({...x}));
  const id  = kartuStockIdCounter++;
  storage.push({
    id, tgl: tanggal, ket: ket || 'Pembelian',
    mQty: qty, mHarga: hargaPerUnit,
    kQty: 0, kHarga: 0, kJml: 0,
    saldoLayers: sl, jurnalDone: true
  });
  console.log('[BUY] BERHASIL push ke storage, total entri sekarang='+storage.length);
  _ksJustWroteDirectly = true;
  saveMKS(true);
  console.log('[BUY] saveMKS selesai');
}

function deductKartuStockOnSale(katId, qty, tanggal, ket) {
  // Cari kategori dari katId di semua card
  const found = _findKatById(katId);
  if (!found || qty <= 0) return { hppBatch: 0, keluarLayers: [], qtySell: 0 };
  const ks = found.kat;
  const metode = getKsSaldo(ks).metode || 'fifo';
  if (!ks.data[metode]) ks.data[metode] = [];
  const storage = ks.data[metode];
  let runningStock = rebuildStockFromKartu(storage, metode);
  const maxQty = runningStock.reduce((s,x)=>s+x.qty,0);
  if (maxQty <= 0) return { hppBatch: 0, keluarLayers: [], qtySell: 0 };
  const qtySell = Math.min(qty, maxQty);
  let qSisa = qtySell, hppBatch = 0, keluarLayers = [];

  if (metode === 'fifo') {
    // FIFO: ambil dari layer paling lama (depan) dulu
    // Contoh: jual 209, layer1=200@199, layer2=99@399
    // → 200×199=39.800 + 9×399=3.591 = total HPP 43.391
    while (qSisa > 0 && runningStock.length) {
      const layer = runningStock[0];
      const ambil = Math.min(layer.qty, qSisa);
      hppBatch += ambil * layer.harga;
      keluarLayers.push({ qty: ambil, harga: layer.harga });
      layer.qty -= ambil;
      qSisa -= ambil;
      if (layer.qty <= 0) runningStock.shift(); // layer habis, buang, lanjut ke layer berikutnya
    }
  } else if (metode === 'lifo') {
    // LIFO: ambil dari layer paling baru (belakang) dulu
    while (qSisa > 0 && runningStock.length) {
      const layer = runningStock[runningStock.length - 1];
      const ambil = Math.min(layer.qty, qSisa);
      hppBatch += ambil * layer.harga;
      keluarLayers.push({ qty: ambil, harga: layer.harga });
      layer.qty -= ambil;
      qSisa -= ambil;
      if (layer.qty <= 0) runningStock.pop(); // layer habis, buang, lanjut ke layer sebelumnya
    }
  } else {
    // WA / MWA: rata-rata tertimbang
    const tq = runningStock.reduce((s,x)=>s+x.qty,0);
    const tv = runningStock.reduce((s,x)=>s+x.qty*x.harga,0);
    const ha = tq ? tv/tq : 0;
    hppBatch = ha * qtySell;
    keluarLayers = [{ qty: qtySell, harga: ha }];
    let sisa2 = qtySell;
    for (let i = 0; i < runningStock.length && sisa2 > 0; i++) {
      const ambil = Math.min(runningStock[i].qty, sisa2);
      runningStock[i].qty -= ambil;
      sisa2 -= ambil;
    }
    runningStock = runningStock.filter(x => x.qty > 0);
  }

  const sl = runningStock.filter(x=>x.qty>0).map(x=>({...x}));
  const hppPerUnit = qtySell ? hppBatch / qtySell : 0;
  const id = kartuStockIdCounter++;
  storage.push({
    id, tgl: tanggal, ket: ket||'Penjualan', mQty: 0, mHarga: 0,
    kQty: qtySell, kHarga: hppPerUnit, kJml: hppBatch,
    keluarLayers, saldoLayers: sl, jurnalDone: true
  });
  // skipSync=true: data sudah ditulis langsung ke kat.data, hindari overwrite
  _ksJustWroteDirectly = true;
  saveMKS(true);

  // Return hasil HPP untuk dipakai langsung di jurnal simpanPenjualan
  return { hppBatch, keluarLayers, qtySell, metode };
}

function getHppLayersForSale(ks, qtySell) {
  // ks bisa berupa kategori ({data:{}}) atau card lama
  const { metode, layers, hppRata, totalQty } = getKsSaldo(ks);

  if(qtySell > totalQty) qtySell = totalQty; // cap di stok tersedia
  if(qtySell <= 0) return [];

  if(metode === 'fifo') {
    // FIFO: ambil layer per layer dari depan
    const result = [];
    let sisa = qtySell;
    const snapLayers = layers.map(l => ({...l})); // copy agar tidak mutate
    for(const layer of snapLayers) {
      if(sisa <= 0) break;
      const ambil = Math.min(layer.qty, sisa);
      result.push({ qty: ambil, harga: layer.harga });
      sisa -= ambil;
    }
    return result;
  } else {
    // WA / LIFO / MWA: satu layer dengan harga rata-rata
    return [{ qty: qtySell, harga: hppRata }];
  }
}

/**
 * Buat jurnal HPP lines dari hasil getHppLayersForSale.
 * Jika FIFO multi-layer → beberapa baris jurnal.
 */
function buildHppJurnalLines(hppLayers, akunHpp, akunPersediaan) {
  return hppLayers.map(layer => ([
    { akun: akunHpp,        ket: `HPP Persediaan (${layer.qty} unit × ${fmtRp(layer.harga)})`, debit: layer.qty * layer.harga, kredit: 0 },
    { akun: akunPersediaan, ket: `Keluar persediaan ${layer.qty} unit`,                        debit: 0, kredit: layer.qty * layer.harga },
  ])).flat();
}

/**
 * Render tabel Master Produk — baca dari multiKartuStock
 */
function openProdukFilterCardPicker() {
  const cards = Object.values(multiKartuStock || {});
  openOptPicker({
    title: 'Filter Kartu Stock',
    options: [
      { value: '', label: 'Semua Kartu', sub: 'Tampilkan semua kategori' },
      ...cards.map(c => ({ value: c.id, label: c.nama, sub: `${Object.keys(c.kategori||{}).length} kategori` }))
    ],
    currentValue: document.getElementById('produk-filter-card')?.value || '',
    onSelect: (val, label) => {
      document.getElementById('produk-filter-card').value = val;
      document.getElementById('produk-filter-card-label').textContent = label || 'Semua Kartu';

      renderProduk();
    }
  });
}

// ══════════════════════════════════════════════════════════
// FIFO/LIFO METHOD PICKER — ganti tab button jadi opt-picker
// ══════════════════════════════════════════════════════════
function openKsMetodePicker() {
  const cur = document.getElementById('ks-metode-current')?.value || 'fifo';
  const opts = [
    { value:'fifo', label:'FIFO', sub:'First In First Out — Barang masuk pertama, keluar pertama' },
    { value:'lifo', label:'LIFO', sub:'Last In First Out — Barang masuk terakhir, keluar pertama' },
    { value:'wa',   label:'Weighted Average', sub:'Rata-rata Tertimbang — rata-rata dari semua pembelian' },
    { value:'mwa',  label:'Moving Average', sub:'Rata-rata Bergerak — diperbarui setiap transaksi masuk' },
  ];
  openOptPicker({
    title: 'Pilih Metode Persediaan',
    options: opts,
    currentValue: cur,
    onSelect: (val, label) => {
      document.getElementById('ks-metode-current').value = val;
      const btn = document.getElementById('ks-metode-picker-btn');
      const lbl = document.getElementById('ks-metode-picker-label');
      // Tampilkan label lengkap dengan penjelasan dalam kurung — konsisten
      const foundOpt = opts.find(o=>o.value===val);
      const subPart = foundOpt?.sub ? foundOpt.sub.split(' — ')[0] : ''; // ambil bagian singkatan saja
      if(lbl) lbl.textContent = (foundOpt?.label || label) + (subPart ? ' (' + subPart + ')' : '');
      // Trigger the original tab switch
      const tabEl = document.getElementById('ks-tab-' + val) || _makeKsTabEl(val);
      if(typeof switchKartuStockTab === 'function') switchKartuStockTab(val, tabEl);
    }
  });
}
// Helper to create a fake element for switchKartuStockTab if original buttons removed
function _makeKsTabEl(val) {
  const el = document.createElement('button');
  el.id = 'ks-tab-' + val;
  return el;
}

// ── Patch switchKartuStockTab to sync picker label ──
(function(){
  const _origKS = typeof switchKartuStockTab === 'function' ? switchKartuStockTab : null;
  if(!_origKS) return;
  window.switchKartuStockTab = function(tab, el) {
    _origKS(tab, el);
    const lbl = document.getElementById('ks-metode-picker-label');
    const cur = document.getElementById('ks-metode-current');
    const map = {
      fifo:'FIFO (First In First Out)',
      lifo:'LIFO (Last In First Out)',
      wa:'Weighted Average (Rata-rata Tertimbang)',
      mwa:'Moving Average (Rata-rata Bergerak)'
    };
    if(lbl) lbl.textContent = map[tab] || tab;
    if(cur) cur.value = tab;
  };
})();

// ══════════════════════════════════════════════════════════
// PRODUK PICKER UNTUK FORM PENJUALAN
// ══════════════════════════════════════════════════════════

// Helper: cari kategori dari katId di semua card
function _findKatById(katId) {
  for (const card of Object.values(multiKartuStock)) {
    if (card.kategori?.[katId]) return { kat: card.kategori[katId], card };
  }
  return null;
}
function openProdukPickerJual() {
  // Filter hanya kartu stock yang TIDAK di-lock (locked = disembunyikan dari transaksi)
  const cards = Object.values(multiKartuStock || {}).filter(card => !card.lockedFromTrx);
  if (!cards.length) {
    showAlert('Tidak ada produk tersedia. Aktifkan kartu stock di menu Persediaan (klik ikon gembok).');
    return;
  }
  const cur = document.getElementById('jual-produk-id')?.value || '';

  // Jika hanya 1 kartu stock → langsung tampilkan kategorinya
  if (cards.length === 1) {
    _openProdukPickerLevel2Jual(cards[0], cur);
    return;
  }

  // Level 1: pilih kartu stock
  openOptPicker({
    title: 'Pilih Kartu Stock',
    options: cards.map(card => {
      const s = getCardSaldo(card);
      const nKat = Object.keys(card.kategori || {}).length;
      return {
        value: card.id,
        label: card.nama,
        sub: `${nKat} barang · Stok: ${s.totalQty.toLocaleString('id-ID')} ${card.satuan||'unit'}`
      };
    }),
    currentValue: '',
    onSelect: (cardId) => {
      const card = multiKartuStock[cardId]; if(!card) return;
      _openProdukPickerLevel2Jual(card, cur);
    }
  });
}

function _openProdukPickerLevel2Jual(card, cur) {
  const kats = Object.values(card.kategori || {});
  if (!kats.length) { showAlert('Kartu stock ini belum punya barang.'); return; }

  // Jika hanya 1 kategori → langsung pilih
  if (kats.length === 1) {
    _selectProdukJual(kats[0].id); return;
  }

  const mLabel = {fifo:'FIFO',lifo:'LIFO',wa:'WA',mwa:'MWA'};
  openOptPicker({
    title: 'Pilih Barang — ' + card.nama,
    options: kats.map(kat => {
      const saldo   = getKsSaldo(kat);
      const override = produkList.find(p => p.ksId === kat.id);
      const hJual   = override?.hargaJual || 0;
      return {
        value: kat.id,
        label: kat.nama,
        sub: `${mLabel[saldo.metode]||'FIFO'} · Stok: ${saldo.totalQty} · HPP: ${fmtRp(saldo.hppNext)} · Jual: ${hJual ? fmtRp(hJual) : 'Belum diset'}`
      };
    }),
    currentValue: cur,
    onSelect: (katId) => { _selectProdukJual(katId); }
  });
}

function _selectProdukJual(katId) {
  const found = _findKatById(katId);
  if(!found) return;
  const { kat, card } = found;
  const saldo    = getKsSaldo(kat);
  const override = produkList.find(p => p.ksId === katId);
  document.getElementById('jual-produk-id').value = katId;
  const lbl = document.getElementById('jual-produk-label');
  if(lbl) { lbl.textContent = kat.nama; lbl.style.color = 'var(--text)'; }
  const qty = parseFloat(document.getElementById('jual-produk-qty')?.value)||1;
  _updateJualHargaDisplay(override, qty);
  document.getElementById('jual-hpp').value = Math.round(saldo.hppNext * qty);
  if(!document.getElementById('jual-ket').value) document.getElementById('jual-ket').value = kat.nama;
}

/** Update readonly display box harga jual + warning jika belum diset */
function _updateJualHargaDisplay(override, qty) {
  const dispText = document.getElementById('jual-harga-display-text');
  const hiddenInput = document.getElementById('jual-jumlah');
  // Hapus warning lama jika ada
  const oldWarn = document.getElementById('jual-harga-warning');
  if(oldWarn) oldWarn.remove();

  if(override?.hargaJual && override.hargaJual > 0) {
    const total = override.hargaJual * qty;
    if(hiddenInput) hiddenInput.value = total;
    if(dispText) {
      dispText.style.color = 'var(--text)';
      dispText.innerHTML = fmtRp(total);
    }
  } else {
    // Harga belum diset — tampilkan warning
    if(hiddenInput) hiddenInput.value = '0';
    if(dispText) {
      dispText.style.color = 'var(--muted)';
      dispText.innerHTML = '—';
    }
    // Tampilkan notifikasi gaya showAlert (hijau, konsisten dengan UI lain)
    showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;vertical-align:-2px;margin-right:4px;"></i> Produk dipilih — harga jual belum diset di Master Produk.');
  }
}

function onJualQtyChange() {
  const katId = document.getElementById('jual-produk-id')?.value;
  if(!katId) return;
  const found = _findKatById(katId);
  if(!found) return;
  const saldo    = getKsSaldo(found.kat);
  const override = produkList.find(p => p.ksId === katId);
  const qty      = parseFloat(document.getElementById('jual-produk-qty')?.value)||1;
  _updateJualHargaDisplay(override, qty);
  document.getElementById('jual-hpp').value = Math.round(saldo.hppNext * qty);
}


// ── GEMBOK KARTU STOCK (sembunyikan dari picker transaksi) ───────
function toggleKartuStockLock(cardId) {
  const card = multiKartuStock[cardId]; if(!card) return;
  card.lockedFromTrx = !card.lockedFromTrx;
  saveMKS();
  renderKartuStockSelector(); // re-render toolbar + gembok sekaligus
  const status = card.lockedFromTrx ? 'dikunci (tidak muncul di transaksi)' : 'dibuka (muncul di transaksi)';
  showAlert('<i class="ti ti-circle-check" style="color:var(--accent);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ' + card.nama + ' ' + status);
}

function _updateLockHeaderBtn() {
  // Fix: tidak memanggil renderKartuStockSelector() karena itu menyebabkan infinite loop
  // (renderKartuStockSelector → _updateLockHeaderBtn → renderKartuStockSelector → ...)
  const btn = document.getElementById('ks-lock-header-btn');
  if (!btn) return;
  const card = multiKartuStock[activeKartuStockId];
  if (!card) return;
  const isLocked = card.lockedFromTrx === true;
  const svgLocked = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const svgUnlocked = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>';
  btn.innerHTML = isLocked ? svgLocked : svgUnlocked;
  btn.title = isLocked ? 'Dikunci dari transaksi — klik untuk buka' : 'Klik untuk kunci dari picker transaksi';
  btn.style.background = isLocked ? 'rgba(239,68,68,0.15)' : 'var(--surface2)';
  btn.style.border = isLocked ? '1px solid rgba(239,68,68,0.4)' : '1px solid var(--border)';
  btn.style.color = isLocked ? 'var(--red)' : 'var(--muted)';
}

// ══════════════════════════════════════════════════════════════════════════
// OAS AUDIT TRAIL — HOOKS MENYELURUH
// Semua aktivitas penting di seluruh fitur dilog ke auditLog()
// Di-inject setelah semua fungsi sudah terdefinisi
// ══════════════════════════════════════════════════════════════════════════
(function _installAuditHooks() {
  'use strict';

  // Helper: wrap fungsi dengan audit, toleran terhadap fungsi yang belum ada
  function _wrap(fnName, before, after) {
    const orig = window[fnName];
    window[fnName] = function() {
      try { if (before) before.apply(this, arguments); } catch(e) {}
      const ret = orig ? orig.apply(this, arguments) : undefined;
      try { if (after) after.apply(this, arguments); } catch(e) {}
      return ret;
    };
    // Preserve async nature
    if (orig && orig.constructor && orig.constructor.name === 'AsyncFunction') {
      window[fnName] = async function() {
        try { if (before) before.apply(this, arguments); } catch(e) {}
        const ret = orig ? await orig.apply(this, arguments) : undefined;
        try { if (after) after.apply(this, arguments); } catch(e) {}
        return ret;
      };
    }
  }

  function _al(action, cat, desc, ref, extraMeta) {
    if (typeof auditLog === 'function') auditLog(action, cat, desc, { ref: ref || '', ...(extraMeta||{}) });
  }
  function _rp(n) { return typeof fmtRp === 'function' ? fmtRp(n) : 'Rp ' + (n||0).toLocaleString('id-ID'); }
  function _v(id) { return document.getElementById(id)?.value || ''; }

  // ── JURNAL ───────────────────────────────────────────────────────────────

  // 1. HAPUS JURNAL — wrap konfirmasiHapusJurnal langsung (bukan button patch)
  //    Masalah sebelumnya: onclick di-set ulang setiap buka modal, listener tidak jalan
  _wrap('konfirmasiHapusJurnal', function(idx) {
    // Simpan data entry SEBELUM modal terbuka (idx masih valid)
    try {
      const j = jurnalEntries[idx];
      if (j) window._auditPendingHapusJurnal = { idx, no: j.no, ket: j.ket, jenis: j.jenis, total: (j.lines||[]).reduce((s,l)=>s+(l.debit||0),0) };
    } catch(e) {}
  }, null);

  // Patch tombol konfirmasi SETELAH konfirmasiHapusJurnal dipanggil
  const _origKonfirmasiHapusJurnal = window.konfirmasiHapusJurnal;
  window.konfirmasiHapusJurnal = function(idx) {
    _origKonfirmasiHapusJurnal?.apply(this, arguments);
    // Setelah modal terbuka, patch onclick-nya
    setTimeout(function() {
      const btn = document.getElementById('hapus-jurnal-confirm-btn');
      if (!btn) return;
      const origOnclick = btn.onclick;
      btn.onclick = async function() {
        const pending = window._auditPendingHapusJurnal;
        if (pending) {
          _al('delete', 'jurnal',
            `Hapus jurnal ${pending.jenis||'Manual'}: "${pending.ket||'—'}" — ${_rp(pending.total)}`,
            pending.no || String(pending.idx),
            {jenis: pending.jenis || 'Manual'});
          window._auditPendingHapusJurnal = null;
        }
        if (origOnclick) return await origOnclick.call(this);
      };
    }, 30);
  };

  // 2. Simpan Manual — jenis: Manual
  _wrap('simpanManual', null, function() {
    try {
      const ket = _v('manual-ket') || _v('jm-ket') || _v('ket-manual') || '—';
      _al('create', 'jurnal', `Simpan Jurnal Manual: "${ket}"`, ket, {jenis:'Manual'});
    } catch(e) {}
  });

  // 3. Simpan Kas — jenis: Kas
  _wrap('simpanKas', null, function() {
    try {
      const ket = _v('kas-ket') || _v('ket-kas') || '—';
      const jml = parseFloat(_v('kas-jumlah')) || 0;
      const tipe = _v('kas-tipe') || '—';
      _al('create', 'jurnal', `Kas ${tipe}: "${ket}" — ${_rp(jml)}`, ket, {jenis:'Kas'});
    } catch(e) {}
  });

  // 4. Simpan Penjualan — jenis: Penjualan
  _wrap('simpanPenjualan', null, function() {
    try {
      const inv = _v('jual-inv') || '—';
      const jml = parseFloat(_v('jual-jumlah')) || 0;
      _al('create', 'jurnal', `Penjualan${inv !== '—' ? ' ' + inv : ''} — ${_rp(jml)}`, inv, {jenis:'Penjualan'});
    } catch(e) {}
  });

  // 5. Simpan Pembelian — jenis: Pembelian
  _wrap('simpanPembelian', null, function() {
    try {
      const po = _v('beli-po') || '—';
      const jml = parseFloat(_v('beli-jumlah')) || 0;
      _al('create', 'jurnal', `Pembelian${po !== '—' ? ' ' + po : ''} — ${_rp(jml)}`, po, {jenis:'Pembelian'});
    } catch(e) {}
  });

  // 6. Simpan Akun (Chart of Accounts)
  _wrap('simpanAkun', null, function() {
    try {
      const kode = _v('akun-kode');
      const nama = _v('akun-nama');
      const tipe = _v('akun-tipe');
      const editId = _v('akun-edit-id');
      _al(editId ? 'edit' : 'create', 'akun',
        `${editId ? 'Edit' : 'Tambah'} akun: ${kode} — ${nama} (${tipe})`, kode);
    } catch(e) {}
  });

  // 7. Hapus Akun
  _wrap('hapusAkun', function(kode) {
    try {
      const a = (typeof akuns !== 'undefined') ? akuns.find(x => x.kode === kode) : null;
      _al('delete', 'akun', `Hapus akun: ${kode} — ${a?.nama || ''}`, kode);
    } catch(e) {}
  }, null);

  // 8. Simpan Aset Tetap
  _wrap('simpanAsetTetap', null, function() {
    try {
      const nama = _v('at-nama');
      const harga = parseFloat(_v('at-harga')) || 0;
      const editId = _v('at-edit-id');
      _al(editId ? 'edit' : 'create', 'aset',
        `${editId ? 'Edit' : 'Tambah'} aset: ${nama} — ${_rp(harga)}`, editId || nama);
    } catch(e) {}
  });

  // 9. Hapus Aset
  _wrap('hapusAset', function(id) {
    try {
      const a = (typeof asetTetapList !== 'undefined') ? asetTetapList.find(x => x.id === id) : null;
      _al('delete', 'aset', `Hapus aset: ${a?.nama || id}`, id);
    } catch(e) {}
  }, null);

  // 10. Disposal Aset
  _wrap('disposalAset', function(id) {
    try {
      const a = (typeof asetTetapList !== 'undefined') ? asetTetapList.find(x => x.id === id) : null;
      _al('edit', 'aset', `Disposal aset: ${a?.nama || id}`, id);
    } catch(e) {}
  }, null);

  // 11. Simpan Kontak
  _wrap('simpanKontak', null, function() {
    try {
      const nama = _v('kontak-nama');
      const editId = _v('kontak-edit-id');
      _al(editId ? 'edit' : 'create', 'kontak',
        `${editId ? 'Edit' : 'Tambah'} kontak: ${nama}`, editId || nama);
    } catch(e) {}
  });

  // 12. Hapus Kontak
  _wrap('hapusKontak', function(id) {
    try {
      const k = (typeof kontakList !== 'undefined') ? kontakList.find(x => x.id === id) : null;
      _al('delete', 'kontak', `Hapus kontak: ${k?.nama || id}`, id);
    } catch(e) {}
  }, null);

  // 13. Simpan Invoice
  _wrap('simpanInvoice', null, function(status) {
    try {
      const no = _v('inv-no');
      _al('create', 'invoice', `${status === 'lunas' ? 'Invoice Lunas' : 'Buat invoice'}: ${no || '—'}`, no);
    } catch(e) {}
  });

  // 14. Konfirmasi Lunas Invoice
  _wrap('konfirmasiLunasInvoice', null, function() {
    try {
      _al('edit', 'invoice', 'Invoice ditandai Lunas', 'LUNAS');
    } catch(e) {}
  });

  // 15. Hapus Invoice
  _wrap('hapusInvoice', function(id) {
    try {
      const inv = (typeof invoiceList !== 'undefined') ? invoiceList.find(x => x.id === id) : null;
      _al('delete', 'invoice', `Hapus invoice ${inv?.no || id} — ${_rp(inv?.total || 0)}`, inv?.no || id);
    } catch(e) {}
  }, null);

  // 16. Simpan Produk
  _wrap('simpanProduk', null, function() {
    try {
      const ksId = _v('produk-edit-id');
      const hj = parseFloat(_v('produk-harga-jual')) || 0;
      const ppn = _v('produk-ppn');
      _al('edit', 'produk', `Update produk: harga jual ${_rp(hj)}${ppn ? ', PPN ' + ppn + '%' : ''}`, ksId);
    } catch(e) {}
  });

  // 17. Hapus Produk
  _wrap('hapusProduk', function(id) {
    try {
      _al('delete', 'produk', `Hapus produk id: ${id}`, id);
    } catch(e) {}
  }, null);

  // 18. Simpan Jurnal Berulang
  _wrap('simpanJurnalBerulang', null, function() {
    try {
      const nama = _v('jb-nama');
      const frq = _v('jb-frekuensi');
      _al('create', 'jurnal', `Buat Jurnal Berulang: ${nama} (${frq})`, nama);
    } catch(e) {}
  });

  // 19. Hapus Jurnal Berulang
  _wrap('hapusJurnalBerulang', function(id) {
    try {
      const jb = (typeof jurnalBerulangList !== 'undefined') ? jurnalBerulangList?.find(j => j.id === id) : null;
      _al('delete', 'jurnal', `Hapus Jurnal Berulang: ${jb?.nama || id}`, id);
    } catch(e) {}
  }, null);

  // 20. Buat Jurnal Penutup — dari Dashboard aksi cepat, category 'system' agar hanya muncul di semua kategori
  _wrap('buatJurnalPenutup', null, function() {
    _al('auto', 'system', 'Buat Jurnal Penutup (Closing Entries)', 'JURNAL-PENUTUP');
  });

  // 20b. Cek Rekonsiliasi Kas — dari Dashboard aksi cepat, category 'system'
  _wrap('cekRekonsiliasi', null, function() {
    _al('info', 'system', 'Rekonsiliasi Kas — cek dari Dashboard', 'REKON-KAS');
  });

  // 21. Jurnal Penyesuaian
  _wrap('openJurnalPenyesuaian', null, function() {
    _al('info', 'jurnal', 'Buka modul Jurnal Penyesuaian', 'PENYESUAIAN', {jenis:'Penyesuaian'});
  });
  _wrap('deteksiPenyesuaianOtomatis', null, function() {
    _al('auto', 'jurnal', 'Deteksi otomatis Jurnal Penyesuaian', 'AUTO-PENYESUAIAN', {jenis:'Penyesuaian'});
  });

  // 22. Buat Jurnal PPh 21 & PPh 23
  _wrap('buatJurnalPPh21', null, function() {
    _al('create', 'pajak', 'Buat Jurnal PPh 21', 'PPH21');
  });
  _wrap('buatJurnalPPh23', null, function() {
    _al('create', 'pajak', 'Buat Jurnal PPh 23', 'PPH23');
  });

  // 23. Proses Rekonsiliasi
  _wrap('prosesRekonsiliasi', null, function() {
    _al('create', 'rekonsiliasi', 'Proses rekonsiliasi bank', 'REKON');
  });
  _wrap('importRekonSebagaiJurnal', null, function() {
    _al('create', 'jurnal', 'Import rekonsiliasi sebagai jurnal', 'REKON-IMPORT');
  });

  // 24. Simpan Kurs Manual
  _wrap('simpanKursManual', null, function() {
    try {
      const mata = _v('kurs-mata') || _v('kurs-uang') || '—';
      const rate = parseFloat(_v('kurs-rate') || _v('kurs-nilai') || '0') || 0;
      _al('edit', 'system', `Update kurs ${mata}: ${rate.toLocaleString('id-ID')}`, mata);
    } catch(e) {}
  });

  // 25. Simpan Profil Perusahaan
  _wrap('saveProfil', null, function() {
    try {
      const nama = _v('profil-nama') || _v('profil-perusahaan') || '—';
      _al('edit', 'system', `Simpan profil perusahaan: ${nama}`, 'PROFIL');
    } catch(e) {}
  });

  // 26. Simpan Saldo Awal
  _wrap('simpanSaldoAwal', null, function() {
    _al('edit', 'akun', 'Simpan / update Saldo Awal', 'SALDO-AWAL');
  });

  // 27. Simpan Alert/Notifikasi
  _wrap('simpanAlertBaru', null, function() {
    try {
      const nama = _v('notif-nama') || _v('alert-nama') || '—';
      _al('create', 'system', `Tambah notifikasi/alert: ${nama}`, nama);
    } catch(e) {}
  });

  // 28. Hapus Alert
  _wrap('hapusAlert', function(id) {
    _al('delete', 'system', `Hapus notifikasi id: ${id}`, id);
  }, null);

  // 29. Simpan Anggaran
  _wrap('simpanAnggaran', null, function() {
    try {
      const period = _v('anggaran-period') || _v('ang-period') || '—';
      _al('edit', 'anggaran', `Simpan anggaran periode ${period}`, period);
    } catch(e) {}
  });

  // 30. Hapus Anggaran
  _wrap('hapusAnggaran', function(id) {
    try {
      const a = (typeof anggaranList !== 'undefined') ? anggaranList?.find(x => x.id === id) : null;
      _al('delete', 'anggaran', `Hapus anggaran: ${a?.nama || a?.period || id}`, id);
    } catch(e) {}
  }, null);

  // 31. Export Backup JSON
  _wrap('exportBackupJSON', null, function() {
    _al('export', 'system', 'Export backup data JSON', 'BACKUP-JSON');
  });

  // 32. Import Backup JSON
  _wrap('importBackupJSON', null, function() {
    _al('create', 'system', 'Import data dari backup JSON', 'IMPORT-JSON');
  });

  // 33. Manual Save
  _wrap('manualSave', null, function() {
    _al('edit', 'system', 'Simpan manual (manual save)', 'MANUAL-SAVE');
  });

  // 34. Simpan Jurnal dari AI
  _wrap('saveJurnalFromAI', null, function(parsed) {
    try {
      const lines = parsed?.lines || parsed?.entries || [];
      const ket = parsed?.keterangan || parsed?.ket || parsed?.description || '—';
      const total = lines.reduce ? lines.reduce((s, l) => s + (l.debit || 0), 0) : 0;
      _al('create', 'jurnal', `Simpan Jurnal dari AI: "${ket}" — ${_rp(total)}`, 'AI-JURNAL');
    } catch(e) {}
  });

  // 35. AI Chat — sendAI (kirim pesan ke Orias AI)
  _wrap('sendAI', function() {
    try {
      const msg = (document.getElementById('ai-input')?.value || '').trim().slice(0, 120);
      if (msg) _al('info', 'ai', `Orias AI: "${msg}"`, 'AI-CHAT');
    } catch(e) {}
  }, null);

  // 36. Clear AI Chat
  _wrap('clearAIChat', null, function() {
    _al('edit', 'ai', 'Reset riwayat chat Orias AI', 'AI-CLEAR');
  });

  // 37. Tutorial — mulai
  _wrap('startTutorialById', function(id) {
    try {
      const label = id === 'semua' ? 'Semua Tutorial' : (id || 'Tutorial');
      _al('info', 'tutorial', `Mulai tutorial: ${label}`, id);
    } catch(e) {}
  }, null);

  // 38. Tutorial — selesai/keluar
  _wrap('exitTutorial', null, function() {
    _al('info', 'tutorial', 'Keluar dari tutorial', 'TUT-EXIT');
  });

  // 39. doExport (laporan PDF/Excel/CSV)
  _wrap('doExport', null, function() {
    try {
      const fmt = (typeof exportFmt !== 'undefined' ? exportFmt : _v('exp-fmt') || '—').toUpperCase();
      const nama = _v('exp-nama-perusahaan') || '—';
      _al('export', 'system', `Export laporan ${fmt} — ${nama}`, fmt);
    } catch(e) {}
  });

  // 40. Reset Semua Data
  const _origDoResetAll = window.doResetAll;
  window.doResetAll = async function() {
    try {
      const cn = (typeof currentCompany !== 'undefined' && currentCompany?.name) || '—';
      _al('reset', 'system', `⚠️ RESET SEMUA DATA bisnis "${cn}" dieksekusi`, 'RESET-ALL');
    } catch(e) {}
    return _origDoResetAll ? await _origDoResetAll.apply(this, arguments) : undefined;
  };

  // 41. Kartu Stock — hapus entri baris (delegated event di tbody)
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.ks-hapus-btn');
    if (!btn) return;
    try {
      const idx = parseInt(btn.getAttribute('data-idx'));
      if (isNaN(idx)) return;
      const entry = (typeof kartuStockData !== 'undefined' && typeof kartuStockTab !== 'undefined')
        ? kartuStockData?.[kartuStockTab]?.[idx] : null;
      const card = (typeof multiKartuStock !== 'undefined' && typeof activeKartuStockId !== 'undefined')
        ? multiKartuStock?.[activeKartuStockId] : null;
      const kat = (card && typeof activeKategoriId !== 'undefined')
        ? card?.kategori?.[activeKategoriId] : null;
      if (entry) {
        const tipe = entry.mQty > 0 ? 'masuk' : 'keluar';
        const qty = entry.mQty > 0 ? entry.mQty : entry.kQty;
        const jml = entry.mQty > 0 ? (entry.mQty * (entry.mHarga || 0)) : (entry.kJml || 0);
        _al('delete', 'persediaan',
          `Hapus entry stock ${tipe}: ${entry.tgl || '—'} | Qty ${qty} | ${entry.ket || '—'} | ${_rp(jml)}`,
          `${kat?.nama || card?.nama || '—'} (${(typeof kartuStockTab !== 'undefined' ? kartuStockTab : '').toUpperCase()})`);
      }
    } catch(ex) {}
  }, true); // capture phase — jalan sebelum confirm dialog

  // 42. Kartu Stock — hapus semua catatan
  _wrap('clearKartuStock', function() {
    try {
      const card = (typeof multiKartuStock !== 'undefined' && typeof activeKartuStockId !== 'undefined')
        ? multiKartuStock?.[activeKartuStockId] : null;
      const kat = (card && typeof activeKategoriId !== 'undefined')
        ? card?.kategori?.[activeKategoriId] : null;
      const tab = typeof kartuStockTab !== 'undefined' ? kartuStockTab : '—';
      const count = (typeof kartuStockData !== 'undefined') ? (kartuStockData?.[tab] || []).length : 0;
      window._auditKsTabBefore = { tab, count, cardName: kat?.nama || card?.nama || '—' };
    } catch(e) {}
  }, function() {
    try {
      const b = window._auditKsTabBefore;
      if (b && b.count > 0) _al('delete', 'persediaan',
        `Hapus semua catatan ${b.tab.toUpperCase()}: ${b.count} baris di "${b.cardName}"`, 'CLEAR-KS');
    } catch(e) {}
  });

  // 43. Kartu Stock — hapus seluruh kartu
  _wrap('_doHapusCard', function(cardId) {
    try {
      const card = (typeof multiKartuStock !== 'undefined') ? multiKartuStock?.[cardId] : null;
      const nKat = Object.keys(card?.kategori || {}).length;
      window._auditKsCardToDelete = { nama: card?.nama || cardId, nKat };
    } catch(e) {}
  }, function(cardId) {
    try {
      const d = window._auditKsCardToDelete;
      if (d) _al('delete', 'persediaan', `Hapus kartu stock "${d.nama}" (${d.nKat} kategori)`, cardId);
    } catch(e) {}
  });

  // 44. Kartu Stock — tambah entry baru via saveMKS
  let _ksCountMap = {};
  const _origSaveMKS = window.saveMKS;
  window.saveMKS = function(skipSync) {
    if (!skipSync) {
      try {
        const tab = typeof kartuStockTab !== 'undefined' ? kartuStockTab : null;
        const key = `${typeof activeKartuStockId !== 'undefined' ? activeKartuStockId : ''}__${typeof activeKategoriId !== 'undefined' ? activeKategoriId : ''}__${tab}`;
        const curr = (typeof kartuStockData !== 'undefined' && tab) ? (kartuStockData?.[tab] || []).length : 0;
        const prev = _ksCountMap[key] || 0;
        if (curr > prev && tab) {
          const entry = (kartuStockData?.[tab] || []).slice(-1)[0];
          const card = (typeof multiKartuStock !== 'undefined' && typeof activeKartuStockId !== 'undefined')
            ? multiKartuStock?.[activeKartuStockId] : null;
          const kat = (card && typeof activeKategoriId !== 'undefined') ? card?.kategori?.[activeKategoriId] : null;
          if (entry) {
            const tipe = entry.mQty > 0 ? 'masuk' : 'keluar';
            const qty = entry.mQty > 0 ? entry.mQty : entry.kQty;
            const jml = entry.mQty > 0 ? (entry.mQty * (entry.mHarga || 0)) : (entry.kJml || 0);
            _al('create', 'persediaan',
              `Entry stock ${tipe}: ${entry.tgl || '—'} | Qty ${qty} | ${entry.ket || '—'} | ${_rp(jml)}`,
              `${kat?.nama || card?.nama || '—'} (${tab.toUpperCase()})`);
          }
        }
        _ksCountMap[key] = curr;
      } catch(e) {}
    }
    return _origSaveMKS ? _origSaveMKS.apply(this, arguments) : undefined;
  };

  // 45. Kalkulator Penyusutan
  _wrap('hitungPenyusutan', null, function() {
    try {
      const nama = _v('dep-nama') || _v('at-kalk-nama') || '—';
      const harga = parseFloat(_v('dep-harga') || _v('at-kalk-harga') || '0') || 0;
      const metode = _v('dep-metode') || _v('at-kalk-metode') || '—';
      _al('info', 'kalkulator', `Hitung Penyusutan: ${nama} | ${_rp(harga)} | ${metode}`, 'KALK-PENYUSUTAN');
    } catch(e) {}
  });

  // 46. Kalkulator Persediaan
  _wrap('hitungPersediaan', null, function() {
    try {
      const metode = _v('inv-metode') || '—';
      const lbl = { fifo: 'FIFO', lifo: 'LIFO', wa: 'Weighted Average', mwa: 'Moving WA' };
      _al('info', 'kalkulator', `Hitung Persediaan ${lbl[metode] || metode}`, 'KALK-PERSEDIAAN');
    } catch(e) {}
  });

  // 47. Kalkulator Bunga
  _wrap('hitungBunga', null, function() {
    try {
      const pokok = parseFloat(_v('bunga-pokok')) || 0;
      const rate = _v('bunga-rate') || '0';
      const tipe = _v('bunga-tipe') || '—';
      _al('info', 'kalkulator', `Hitung Bunga ${tipe}: pokok ${_rp(pokok)}, rate ${rate}%`, 'KALK-BUNGA');
    } catch(e) {}
  });

  // 48. Kalkulator Rasio
  _wrap('hitungRasio', null, function() {
    _al('info', 'kalkulator', 'Hitung Rasio Keuangan', 'KALK-RASIO');
  });

  // 49. Kalkulator BEP
  _wrap('hitungBEP', null, function() {
    try {
      const fc = parseFloat(_v('bep-fc')) || 0;
      _al('info', 'kalkulator', `Hitung BEP: FC ${_rp(fc)}`, 'KALK-BEP');
    } catch(e) {}
  });

  // 50. Kalkulator PPN & PPh
  _wrap('hitungPPN', null, function() {
    try {
      const dasar = parseFloat(_v('ppn-dasar') || _v('ppn-base') || '0') || 0;
      const tipe = _v('ppn-tipe') || 'PPN';
      _al('info', 'kalkulator', `Hitung ${tipe}: dasar ${_rp(dasar)}`, 'KALK-PPN');
    } catch(e) {}
  });

  // 51. showPage — log semua navigasi halaman
  const _origShowPage = window.showPage;
  window.showPage = function(id) {
    const ret = _origShowPage ? _origShowPage.apply(this, arguments) : undefined;
    try {
      const PAGE_LABELS = {
        'dashboard': null, // terlalu sering, skip
        'transaksi': 'Buka halaman Transaksi',
        'jurnal-umum': 'Buka Jurnal Umum',
        'jurnal-kas': 'Buka Jurnal Kas',
        'jurnal-penjualan': 'Buka Jurnal Penjualan',
        'jurnal-pembelian': 'Buka Jurnal Pembelian',
        'buku-besar': 'Buka Buku Besar',
        'neraca-saldo': 'Buka Neraca Saldo',
        'laba-rugi': 'Buka Laporan Laba Rugi',
        'neraca': 'Buka Neraca',
        'arus-kas': 'Buka Laporan Arus Kas',
        'perubahan-ekuitas': 'Buka Laporan Perubahan Ekuitas',
        'analitik': 'Buka Analitik',
        'produk': 'Buka Master Produk',
        'akun': 'Buka Chart of Accounts',
        'aset-tetap': 'Buka Aset Tetap',
        'kontak': 'Buka Kontak',
        'kalk-penyusutan': 'Buka Kalkulator Penyusutan',
        'kalk-persediaan': 'Buka Kalkulator Persediaan',
        'kalk-bunga': 'Buka Kalkulator Bunga',
        'kalk-rasio': 'Buka Kalkulator Rasio',
        'kalk-bep': 'Buka Kalkulator BEP & Margin',
        'kalk-ppn': 'Buka Kalkulator PPN & PPh',
        'jurnal-berulang': 'Buka Jurnal Berulang',
        'invoice': 'Buka Invoice',
        'rekonsiliasi': 'Buka Rekonsiliasi',
        'kurs': 'Buka Kurs Mata Uang',
        'notifikasi': 'Buka Notifikasi',
        'anggaran': 'Buka Anggaran',
        'pajak': 'Buka Pajak Auto',
        'tutorial': 'Buka Tutorial',
        'ai-assistant': 'Buka Orias AI Assistant',
        'audit-trail': null, // jangan log buka audit trail sendiri
      };
      const label = PAGE_LABELS[id];
      if (label) _al('info', 'navigasi', label, id);
    } catch(e) {}
    return ret;
  };

  // 52. Theme toggle
  const _origToggleTheme = window.toggleTheme;
  window.toggleTheme = function() {
    const ret = _origToggleTheme ? _origToggleTheme.apply(this, arguments) : undefined;
    try {
      const theme = document.documentElement.classList.contains('light') ? 'light' : 'dark';
      _al('edit', 'system', `Ganti tema: ${theme}`, 'TEMA');
    } catch(e) {}
    return ret;
  };

  // 53. Hapus Kategori KS
  _wrap('hapusKategori', function(cardId, katId) {
    try {
      const card = (typeof multiKartuStock !== 'undefined') ? multiKartuStock?.[cardId] : null;
      const kat = card?.kategori?.[katId];
      window._auditKatToDelete = kat?.nama || katId;
    } catch(e) {}
  }, function(cardId, katId) {
    try {
      const nm = window._auditKatToDelete || katId;
      _al('delete', 'persediaan', `Hapus kategori KS: "${nm}"`, katId);
    } catch(e) {}
  });

  // 54. Hapus KS (ksId)
  _wrap('hapusKS', function(ksId) {
    try {
      const card = (typeof multiKartuStock !== 'undefined') ? multiKartuStock?.[ksId] : null;
      window._auditKsToDelete = card?.nama || ksId;
    } catch(e) {}
  }, function(ksId) {
    try {
      _al('delete', 'persediaan', `Hapus KS: "${window._auditKsToDelete || ksId}"`, ksId);
    } catch(e) {}
  });

  // ── HOOKS LAPORAN — category: 'laporan', ref: page id ──────────────────

  // Buku Besar — hook saat filter akun berubah
  const _origRenderBB = window.renderBukuBesar;
  window.renderBukuBesar = function() {
    try {
      const kode = document.getElementById('bb-akun-filter-val')?.value || '';
      const nama = kode
        ? (typeof akuns !== 'undefined' ? akuns.find(a => a.kode === kode)?.nama || kode : kode)
        : 'Semua Akun';
      _al('info', 'laporan', `Filter Buku Besar: ${nama}`, 'buku-besar');
    } catch(e) {}
    return _origRenderBB?.apply(this, arguments);
  };

  // Laporan dengan filter periode (Laba Rugi, Neraca Saldo, Neraca)
  const _origRenderReportPeriod = window.renderReportWithPeriod;
  window.renderReportWithPeriod = function(pageId, periodVal) {
    try {
      const periodLabel = {
        'all':'Semua Periode','this-month':'Bulan Ini','last-month':'Bulan Lalu',
        'this-quarter':'Kuartal Ini','this-year':'Tahun Ini'
      }[periodVal] || periodVal;
      const pageLabel = {
        'laba-rugi':'Laba Rugi','neraca-saldo':'Neraca Saldo','neraca':'Neraca'
      }[pageId] || pageId;
      _al('info', 'laporan', `Filter ${pageLabel}: ${periodLabel}`, pageId);
    } catch(e) {}
    return _origRenderReportPeriod?.apply(this, arguments);
  };

  // Arus Kas
  const _origRenderAK = window.renderArusKas;
  window.renderArusKas = function() {
    try {
      const period = document.getElementById('ak-period')?.value
        || document.getElementById('pe-period')?.value || 'all';
      _al('info', 'laporan', `Lihat Arus Kas`, 'arus-kas');
    } catch(e) {}
    return _origRenderAK?.apply(this, arguments);
  };

  // Perubahan Ekuitas
  const _origRenderPE = window.renderPerubahanEkuitas;
  window.renderPerubahanEkuitas = function() {
    try {
      _al('info', 'laporan', 'Lihat Perubahan Ekuitas', 'perubahan-ekuitas');
    } catch(e) {}
    return _origRenderPE?.apply(this, arguments);
  };

  // Analitik
  const _origRenderAnalitik = window.renderAnalitik;
  window.renderAnalitik = function() {
    try {
      _al('info', 'laporan', 'Lihat Analitik', 'analitik');
    } catch(e) {}
    return _origRenderAnalitik?.apply(this, arguments);
  };

  // Neraca — hook renderNeraca
  const _origRenderNeraca = window.renderNeraca;
  window.renderNeraca = function() {
    try {
      _al('info', 'laporan', 'Lihat Neraca', 'neraca');
    } catch(e) {}
    return _origRenderNeraca?.apply(this, arguments);
  };

  console.log('[OAS Audit] Hooks installed — ' + new Date().toLocaleTimeString('id-ID'));
})();
