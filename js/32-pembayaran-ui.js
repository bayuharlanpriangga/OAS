// ═══════════════════════════════════════════════════════════
// FORM BAYAR INVOICE (task 5.2, Roadmap.md)
//
// Modal `#modal-bayar-inv`: tanggal, jumlah (boleh sebagian), akun kas/bank, metode, catatan, dan riwayat
// pembayaran invoice itu. Validasi dan penyusunan record ada di susunPembayaran (31-pembayaran.js, murni);
// file ini hanya membaca form, memanggilnya, lalu mencatat hasilnya lewat catatPembayaran.
// Task 5.3: tiap pembayaran dijurnal (Dr Kas/Bank, Cr Piutang) lewat postJurnalLegacy (kunci periode, nomor JRN, sync
// cloud, audit log), sama seperti jurnal bill (29-bill-ui.js). Jurnal dibuat LEBIH DULU; bila gagal (mis. periode
// terkunci) pembayaran tidak dicatat, jadi tidak ada pembayaran baru tanpa jurnal. Nomor jurnal disimpan di
// pembayaran.jurnalNo. Record lama dari 5.2 (tanpa jurnalNo) dijurnalkan lewat jurnalkanPembayaranInvoiceLama
// (tombol di banner halaman Invoice). Tombol lama "Lunas" kini membuka form yang sama (11-kontak-invoice.js).
// Dimuat setelah 31-pembayaran.js.
// ═══════════════════════════════════════════════════════════

let _bayarInvId = null;

function _bayarSet(id, v) { const el = document.getElementById(id); if (el) el.value = v; }

// Baris ringkasan (total, sudah dibayar, sisa) dan riwayat pembayaran satu invoice, sebagai HTML.
function _bayarInvRingkasHtml(inv) {
  const lama = dibayarLamaTurunan(inv, pembayaranList, 'invoice');
  const sisa = sisaTagihan(Object.assign({}, inv, { dibayarLama: lama }), pembayaranList, 'invoice');
  const baris = (l, v, clr) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:4px;"><span style="color:var(--muted);">${l}</span><span style="font-family:var(--mono);${clr ? 'color:' + clr + ';' : ''}font-weight:600;">${v}</span></div>`;
  const riwayat = pembayaranDokumen(pembayaranList, 'invoice', inv.id).slice().sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)));
  const itemRiwayat = (t, j, ket, payId) => `<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:12px;padding:4px 0;border-top:1px solid var(--border);"><span>${escapeHtml(t)}${ket ? ` <span style="color:var(--accent3);">· ${escapeHtml(ket)}</span>` : ''}</span><span style="display:flex;align-items:center;gap:8px;"><span style="font-family:var(--mono);">${rp(j)}</span>${payId ? `<button type="button" class="btn btn-danger btn-sm" title="Hapus pembayaran ini (jurnalnya dibalik)" onclick="hapusPembayaranInvoice('${escapeForJsAttr(payId)}')"><i class="ti ti-trash" style="font-size:12px;"></i></button>` : ''}</span></div>`;
  let rw = '';
  if (lama > 0) rw += itemRiwayat('Dibayar sebelumnya (tanpa rincian)', lama, '');
  riwayat.forEach(p => { rw += itemRiwayat(p.tanggal + (p.metode ? ' · ' + p.metode : ''), p.jumlah, p.jurnalNo ? '' : 'belum dijurnal', p.id); });
  return baris('Total invoice', rp(inv.total)) + baris('Sudah dibayar', rp(Math.max(0, inv.total - sisa)), 'var(--accent)') + baris('Sisa tagihan', rp(sisa), 'var(--accent3)')
    + (rw ? `<div style="margin-top:10px;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;">Riwayat pembayaran</div>${rw}` : '');
}

// Form pembayaran (#bayar-inv-form + tombol simpan) disembunyikan di mode riwayat (task 5.3b): invoice lunas tidak bisa
// dibayar lagi, tetapi pembayarannya tetap perlu bisa dilihat dan dihapus bila salah.
function _bayarFormTampil(tampil) {
  const f = document.getElementById('bayar-inv-form'); if (f && f.style) f.style.display = tampil ? '' : 'none';
  const b = document.getElementById('bayar-inv-simpan'); if (b && b.style) b.style.display = tampil ? '' : 'none';
}

// Tombol "Riwayat" di baris invoice yang punya pembayaran tercatat (dipanggil renderInvoiceList, 11-kontak-invoice.js).
function _bayarTombolRiwayat(inv) {
  if (!inv || !pembayaranDokumen(pembayaranList, 'invoice', inv.id).length) return '';
  return `<button class="btn btn-ghost btn-sm" onclick="openRiwayatPembayaranInvoice('${escapeForJsAttr(inv.id)}')" title="Riwayat pembayaran (hapus yang salah)"><i class="ti ti-history" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> Riwayat</button>`;
}

// Buka modal hanya untuk melihat riwayat pembayaran satu invoice (terkirim atau lunas) dan menghapus yang salah.
function openRiwayatPembayaranInvoice(id) {
  const inv = invoiceList.find(i => i && i.id === id); if (!inv) return;
  _bayarInvId = null; // mode riwayat: tidak ada pembayaran baru yang bisa disimpan dari modal ini
  const judul = document.getElementById('bayar-inv-judul'); if (judul) judul.textContent = 'Riwayat Pembayaran ' + inv.noInvoice;
  const ringkas = document.getElementById('bayar-inv-ringkas'); if (ringkas) { ringkas.dataset.invId = inv.id; ringkas.innerHTML = _bayarInvRingkasHtml(inv); }
  _bayarFormTampil(false);
  openModal('modal-bayar-inv');
}

// Hapus satu pembayaran invoice. Jurnal pembayaran yang masih berlaku DIBALIK (jurnal pembalik bertanggal hari ini,
// atau tanggal jurnal asal bila lebih baru), bukan dihapus; lalu record dibuang dan sisa/status invoice dihitung ulang.
// Urutan: jurnal pembalik dulu; bila gagal (mis. periode terkunci) tidak ada yang berubah.
function hapusPembayaranInvoice(payId) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const p = pembayaranList.find(x => x && x.id === payId); if (!p) return;
  const inv = invoiceList.find(i => i && String(i.id) === String(p.dokId)) || null;
  const hasil = susunHapusPembayaran(payId, inv, pembayaranList, jurnalEntries);
  if (!hasil.ok) { _bayarPeringatan(hasil.pesan); return; }
  const label = (inv ? inv.noInvoice : (p.noDok || '')) + ' — ' + rp(p.jumlah) + ' (' + p.tanggal + ')';
  if (hasil.jurnalStatus === 'aktif') {
    const hariIni = new Date().toISOString().split('T')[0];
    const tgl = tanggalPembalikBill(hasil.jurnal.tanggal, hariIni); // aturan sama dengan hapusBill: tidak lebih awal dari jurnal asal
    if (!confirm('Hapus pembayaran ' + label + '? Jurnalnya (' + hasil.jurnal.no + ') dibalik dengan jurnal pembalik bertanggal ' + tgl + ', dan sisa tagihan invoice naik kembali' + (inv && inv.status === 'lunas' ? ' (status kembali Terkirim)' : '') + '.')) return;
    if (!guardPeriode(tgl, 'dibuatkan jurnal pembalik')) return;
    let balik = null;
    try { balik = buatJurnalPembalik(hasil.jurnal, { tanggal: tgl, alasan: 'Pembayaran ' + label + ' dihapus' }); }
    catch (e) { if (!(e instanceof PeriodeTerkunciError)) throw e; return; }
    if (!balik) return; // alert sudah tampil; pembayaran tetap ada
    if (typeof saveToStorage === 'function') saveToStorage(false);
  } else if (!confirm('Hapus pembayaran ' + label + '? ' + (hasil.jurnalStatus === 'dibalik' ? 'Jurnalnya sudah dibalik sebelumnya.' : 'Pembayaran ini belum punya jurnal.'))) return;
  terapkanHapusPembayaran(inv, hasil);
  try { if (typeof auditLog === 'function') auditLog('delete', 'invoice', 'Hapus pembayaran invoice ' + label, { ref: inv ? inv.noInvoice : (p.noDok || '') }); } catch (e) {}
  // Modal masih terbuka: segarkan ringkasan dan riwayatnya; tutup bila tidak ada lagi yang ditampilkan.
  const ringkas = document.getElementById('bayar-inv-ringkas');
  if (inv && ringkas) {
    if (!pembayaranDokumen(pembayaranList, 'invoice', inv.id).length && !(inv.dibayarLama > 0)) closeModal('modal-bayar-inv');
    else ringkas.innerHTML = _bayarInvRingkasHtml(inv);
  }
  renderInvoiceList(); renderInvoiceKPI();
  showAlert('✓ Pembayaran dihapus' + (hasil.jurnalStatus === 'aktif' ? ' dan jurnalnya dibalik' : '') + (inv ? '. Sisa tagihan ' + escapeHtml(inv.noInvoice) + ' sekarang ' + rp(hasil.sisaBaru) + '.' : '.'));
  if (typeof cekNotifikasi === 'function') cekNotifikasi();
}

function openModalBayarInvoice(id) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const inv = invoiceList.find(i => i && i.id === id); if (!inv) return;
  // Pemeriksaan status dan sisa dipakai bersama dengan simpan (susunPembayaran), jadi cukup dites tanpa jumlah di sini.
  if (!['terkirim','sebagian'].includes(inv.status)) { showAlert(inv.status === 'lunas' ? 'Invoice ini sudah lunas.' : 'Invoice draft belum bisa dibayar. Kirim dulu invoicenya.'); return; }
  _bayarInvId = inv.id;
  _bayarFormTampil(true);
  const lama = dibayarLamaTurunan(inv, pembayaranList, 'invoice');
  const sisa = sisaTagihan(Object.assign({}, inv, { dibayarLama: lama }), pembayaranList, 'invoice');
  const judul = document.getElementById('bayar-inv-judul'); if (judul) judul.textContent = 'Bayar Invoice ' + inv.noInvoice;
  const ringkas = document.getElementById('bayar-inv-ringkas'); if (ringkas) ringkas.innerHTML = _bayarInvRingkasHtml(inv);
  const tgl = new Date().toISOString().split('T')[0];
  _bayarSet('bayar-inv-tgl', (inv.tanggal && tgl < inv.tanggal) ? inv.tanggal : tgl);
  _bayarSet('bayar-inv-jumlah', sisa);
  _bayarSet('bayar-inv-metode', '');
  _bayarSet('bayar-inv-catatan', '');
  const kas = akuns.find(a => a.kode === '1101') || akuns.find(a => a.tipe === 'Aset');
  _bayarSet('bayar-inv-akun', kas ? kas.kode : '');
  const btn = document.getElementById('bayar-inv-akun-btn');
  if (btn) {
    if (kas) { btn.innerHTML = `<span class="picker-kode-badge">${escapeHtml(kas.kode)}</span> ${escapeHtml(kas.nama)}`; btn.classList.add('has-value'); }
    else { btn.textContent = 'Pilih Akun...'; btn.classList.remove('has-value'); }
  }
  openModal('modal-bayar-inv');
  setTimeout(upgradeFormPickers, 80);
}

function simpanPembayaranInvoice() {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const inv = invoiceList.find(i => i && i.id === _bayarInvId);
  if (!inv) { showAlert('Invoice tidak ditemukan. Tutup form lalu coba lagi.'); return; }
  const v = id => (document.getElementById(id) || {}).value || '';
  // Id unik walau dua pembayaran tercatat dalam milidetik yang sama.
  let idBaru = 'PAY_' + Date.now(), n = 1;
  while (pembayaranList.some(p => p && p.id === idBaru)) idBaru = 'PAY_' + Date.now() + '_' + (n++);
  const hasil = susunPembayaran({
    id: idBaru, createdAt: new Date().toISOString(),
    tanggal: v('bayar-inv-tgl'), jumlah: parseFloat(v('bayar-inv-jumlah')), akunKas: v('bayar-inv-akun'),
    metode: v('bayar-inv-metode'), catatan: v('bayar-inv-catatan')
  }, inv, pembayaranList, 'invoice');
  if (!hasil.ok) { showAlert(hasil.pesan); return; }
  // Jurnal dulu (5.3): gagal = tidak ada yang dicatat. Hasilnya mengisi hasil.pembayaran.jurnalNo sebelum disimpan.
  const pj = postingJurnalPembayaranInvoice(hasil.pembayaran, inv, { baru: true });
  if (!pj.ok) { if (pj.pesan) _bayarPeringatan(pj.pesan); return; }
  catatPembayaran(inv, hasil);
  _bayarInvId = null; // proses sinkron: klik ganda berikutnya tidak menemukan invoice, jadi tidak mencatat dua kali
  closeModal('modal-bayar-inv');
  renderInvoiceList(); renderInvoiceKPI();
  try { if (typeof auditLog === 'function') auditLog('create', 'invoice', `Pembayaran invoice ${inv.noInvoice} — ${rp(hasil.pembayaran.jumlah)}${hasil.lunas ? ' (lunas)' : ''}`, { ref: inv.noInvoice }); } catch (e) {}
  showAlert(`✓ Pembayaran ${rp(hasil.pembayaran.jumlah)} untuk ${escapeHtml(inv.noInvoice)} dicatat. ${hasil.lunas ? 'Invoice LUNAS.' : 'Sisa tagihan ' + rp(hasil.sisaBaru) + '.'}<br><span style="font-size:12px;color:var(--muted);">Jurnal ${escapeHtml(pj.jurnalNo)} dibuat (Kas bertambah, Piutang berkurang).</span>`);
  if (typeof cekNotifikasi === 'function') cekNotifikasi();
}

function _bayarPeringatan(pesan) {
  showAlert('<i class="ti ti-alert-triangle" style="color:var(--accent3);font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ' + escapeHtml(pesan));
}

// Posting jurnal satu pembayaran invoice (efek samping). pembayaran.jurnalNo diisi bila berhasil.
// opsi.baru = true: pembayaran baru disusun, jadi tidak perlu mencari jurnal lama yang cocok.
// opsi.tanpaGuard = true: pemanggil sudah memastikan periode tidak terkunci (jurnalkan massal), jadi tidak ada alert.
// Mengembalikan { ok:true, jurnalNo, sudahAda? } atau { ok:false, pesan? } (tanpa pesan = sudah ada alert, mis. periode terkunci).
function postingJurnalPembayaranInvoice(pembayaran, inv, opsi) {
  opsi = opsi || {};
  if (!opsi.baru) {
    const st = jurnalPembayaranStatus(pembayaran, inv, jurnalEntries, pembayaranList);
    if (st.status === 'aktif') { pembayaran.jurnalNo = st.jurnal.no; return { ok: true, jurnalNo: st.jurnal.no, sudahAda: true }; }
  }
  if (!opsi.tanpaGuard && !guardPeriode(pembayaran.tanggal, 'diposting')) return { ok: false };
  // Cadangan bila invoice tidak menyimpan akunPiutang: 1201, atau akun pertama yang namanya memuat "piutang".
  const daftarAkun = (typeof akuns !== 'undefined' && Array.isArray(akuns)) ? akuns : [];
  const piutang = daftarAkun.find(a => a && a.kode === '1201') || daftarAkun.find(a => a && String(a.nama || '').toLowerCase().includes('piutang')) || null;
  const r = buatJurnalPembayaranInvoice(pembayaran, inv, { akunPiutang: piutang ? piutang.kode : '' });
  if (!r.ok) return { ok: false, pesan: r.pesan };
  const entry = postJurnalLegacy(r.jurnal);
  if (!entry) return { ok: false };
  pembayaran.jurnalNo = entry.no;
  if (typeof saveToStorage === 'function') saveToStorage(false);
  return { ok: true, jurnalNo: entry.no };
}

// Jurnalkan semua pembayaran invoice yang belum pernah dijurnal (record dari 5.2). Yang jurnalnya sengaja dibalik tidak disentuh.
// Yang bertanggal di periode terkunci dilewati dan disebut di ringkasan (tanggal tidak diganti diam-diam).
function jurnalkanPembayaranInvoiceLama() {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const antre = pembayaranInvoiceBelumJurnal(pembayaranList, invoiceList, jurnalEntries);
  if (!antre.length) { showAlert('Semua pembayaran invoice sudah dijurnal.'); return; }
  const terkunci = x => typeof isPeriodeTerkunci === 'function' && isPeriodeTerkunci(x.pembayaran.tanggal);
  const bisa = antre.filter(x => !terkunci(x)), dilewati = antre.length - bisa.length;
  if (!bisa.length) { _bayarPeringatan(`${dilewati} pembayaran bertanggal di periode yang sudah dikunci${typeof periodeKunciSampai !== 'undefined' && periodeKunciSampai ? ' (sampai ' + periodeKunciSampai + ')' : ''}, jadi belum bisa dijurnal. Buka kunci periode di Settings > Transaksi > Kunci Periode, lalu coba lagi.`); return; }
  const total = bisa.reduce((s, x) => s + x.pembayaran.jumlah, 0);
  if (!confirm(`Buat jurnal untuk ${bisa.length} pembayaran invoice (total ${rp(total)})? Tiap jurnal bertanggal sama dengan tanggal pembayarannya: Kas/Bank di debit, Piutang di kredit.` + (dilewati ? `\n\n${dilewati} pembayaran di periode terkunci dilewati.` : ''))) return;
  let dibuat = 0, tertaut = 0; const gagal = [];
  bisa.forEach(x => {
    const r = postingJurnalPembayaranInvoice(x.pembayaran, x.invoice, { tanpaGuard: true });
    if (!r.ok) gagal.push(x.invoice.noInvoice + (r.pesan ? ' (' + r.pesan + ')' : ''));
    else if (r.sudahAda) tertaut++; else dibuat++;
  });
  simpanPembayaranState('invoice');
  renderInvoiceList();
  showAlert(`✓ ${dibuat} jurnal pembayaran dibuat` + (tertaut ? `, ${tertaut} ditautkan ke jurnal yang sudah ada` : '') + '.'
    + (dilewati ? `<br><span style="font-size:12px;">${dilewati} pembayaran di periode terkunci dilewati.</span>` : '')
    + (gagal.length ? `<br><span style="font-size:12px;">Gagal: ${escapeHtml(gagal.join('; '))}.</span>` : ''));
}

// Banner di halaman Invoice (#inv-belum-jurnal): muncul hanya bila ada pembayaran yang belum dijurnal.
function renderPembayaranBelumJurnal() {
  const el = document.getElementById('inv-belum-jurnal'); if (!el) return;
  const n = pembayaranInvoiceBelumJurnal(pembayaranList, invoiceList, jurnalEntries).length;
  el.innerHTML = n ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:10px 14px;margin-bottom:16px;background:rgba(251,191,36,0.08);border:1px solid rgba(251,191,36,0.25);border-radius:10px;font-size:12px;color:var(--accent3);"><span><i class="ti ti-alert-triangle" style="font-size:13px;width:13px;height:13px;vertical-align:-2px;"></i> ${n} pembayaran invoice belum dijurnal, jadi Kas dan Piutang di buku besar belum berubah.</span><button class="btn btn-ghost btn-sm" onclick="jurnalkanPembayaranInvoiceLama()">Buat Jurnal</button></div>` : '';
}



// ── Task 5.7: penerimaan gabungan untuk beberapa invoice ─────────
let _alokasiBaris = [];
function _alokasiInvoiceTersedia() {
  return (Array.isArray(invoiceList) ? invoiceList : []).filter(inv => {
    if (!inv || !['terkirim','sebagian'].includes(inv.status)) return false;
    const sisa = sisaTagihan(Object.assign({}, inv, { dibayarLama: dibayarLamaTurunan(inv, pembayaranList, 'invoice') }), pembayaranList, 'invoice');
    return sisa > 0;
  });
}
function _alokasiFmt(n) { return Number(n || 0).toLocaleString('id-ID'); }
function _alokasiRender() {
  const host = document.getElementById('alokasi-inv-baris'); if (!host) return;
  const tersedia = _alokasiInvoiceTersedia();
  host.innerHTML = _alokasiBaris.map((row, idx) => {
    const inv = tersedia.find(x => String(x.id) === String(row.dokId));
    const opsi = tersedia.map(x => {
      const sisa = sisaTagihan(Object.assign({}, x, { dibayarLama: dibayarLamaTurunan(x,pembayaranList,'invoice') }),pembayaranList,'invoice');
      return `<option value="${escapeForJsAttr(x.id)}" ${String(x.id)===String(row.dokId)?'selected':''}>${escapeHtml(x.noInvoice || x.id)} · ${escapeHtml(x.pelanggan || '')} · sisa ${rp(sisa)}</option>`;
    }).join('');
    const sisa = inv ? sisaTagihan(Object.assign({},inv,{dibayarLama:dibayarLamaTurunan(inv,pembayaranList,'invoice')}),pembayaranList,'invoice') : 0;
    return `<div class="alokasi-inv-row" style="display:grid;grid-template-columns:minmax(0,1fr) minmax(120px, .55fr) auto;gap:8px;align-items:center;margin-bottom:8px;">
      <select class="form-input" onchange="ubahAlokasiInvoice(${idx},'dokId',this.value)"><option value="">Pilih invoice...</option>${opsi}</select>
      <div><input class="form-input" type="number" min="0.01" step="any" placeholder="Nominal" value="${row.jumlah || ''}" oninput="ubahAlokasiInvoice(${idx},'jumlah',this.value)" style="width:100%;"><div style="font-size:10px;color:var(--muted);margin-top:3px;">Sisa: ${rp(sisa)}</div></div>
      <button class="btn btn-danger btn-sm" type="button" onclick="hapusBarisAlokasi(${idx})" title="Hapus baris"><i class="ti ti-trash"></i></button>
    </div>`;
  }).join('') || '<div style="color:var(--muted);font-size:12px;padding:8px 0;">Belum ada invoice dipilih.</div>';
  const total = _alokasiBaris.reduce((n,x)=>n+(Number(x.jumlah)||0),0);
  const penerimaan = Number((document.getElementById('alokasi-inv-jumlah')||{}).value || 0);
  const info = document.getElementById('alokasi-inv-total');
  if (info) info.innerHTML = `<div style="display:flex;justify-content:space-between;"><span>Total alokasi</span><strong>${rp(total)}</strong></div><div style="display:flex;justify-content:space-between;margin-top:4px;"><span>Selisih dari penerimaan</span><strong style="color:${Math.round((penerimaan-total)*100)===0?'var(--accent)':'var(--accent3)'};">${rp(penerimaan-total)}</strong></div>`;
}
function ubahAlokasiInvoice(idx, field, value) {
  if (!_alokasiBaris[idx]) return;
  _alokasiBaris[idx][field] = field === 'jumlah' ? (value === '' ? '' : Number(value)) : value;
  _alokasiRender();
}
function tambahBarisAlokasi() {
  const dipakai = new Set(_alokasiBaris.map(x=>String(x.dokId)));
  const inv = _alokasiInvoiceTersedia().find(x=>!dipakai.has(String(x.id)));
  _alokasiBaris.push({ dokId: inv ? inv.id : '', jumlah: '' }); _alokasiRender();
}
function hapusBarisAlokasi(idx) { _alokasiBaris.splice(idx,1); _alokasiRender(); }
function openModalAlokasiPembayaran() {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  if (!_alokasiInvoiceTersedia().length) { showAlert('Tidak ada invoice terkirim yang masih memiliki sisa tagihan.'); return; }
  _alokasiBaris = [];
  const tgl = new Date().toISOString().slice(0,10);
  _bayarSet('alokasi-inv-tgl',tgl); _bayarSet('alokasi-inv-jumlah',''); _bayarSet('alokasi-inv-metode',''); _bayarSet('alokasi-inv-catatan','');
  const kas = akuns.find(a=>a.kode==='1101') || akuns.find(a=>a.tipe==='Aset');
  _bayarSet('alokasi-inv-akun',kas?kas.kode:'');
  const btn=document.getElementById('alokasi-inv-akun-btn');
  if(btn){if(kas){btn.innerHTML=`<span class="picker-kode-badge">${escapeHtml(kas.kode)}</span> ${escapeHtml(kas.nama)}`;btn.classList.add('has-value');}else{btn.textContent='Pilih Akun...';btn.classList.remove('has-value');}}
  tambahBarisAlokasi();
  openModal('modal-alokasi-inv'); setTimeout(upgradeFormPickers,80);
}
function simpanAlokasiPembayaran() {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const v=id=>(document.getElementById(id)||{}).value||'';
  let id='RCV_'+Date.now(), n=1; while(pembayaranList.some(p=>p&&String(p.id).startsWith(id))) id='RCV_'+Date.now()+'_'+(n++);
  const hasil=susunAlokasiPembayaran({id,createdAt:new Date().toISOString(),tanggal:v('alokasi-inv-tgl'),jumlah:Number(v('alokasi-inv-jumlah')),akunKas:v('alokasi-inv-akun'),metode:v('alokasi-inv-metode'),catatan:v('alokasi-inv-catatan'),alokasi:_alokasiBaris.map(x=>({dokId:x.dokId,jumlah:Number(x.jumlah)}))},invoiceList,pembayaranList);
  if(!hasil.ok){showAlert(hasil.pesan);return;}
  // Pra-validasi semua jurnal dan periode sebelum jurnal pertama diposting.
  const paket=[];
  for(const p of hasil.pembayaran){
    const inv=invoiceList.find(x=>String(x.id)===String(p.dokId));
    if(!guardPeriode(p.tanggal,'diposting')) return;
    const akunPiutang=(akuns.find(a=>a&&a.kode==='1201')||akuns.find(a=>a&&String(a.nama||'').toLowerCase().includes('piutang'))||null);
    const j=buatJurnalPembayaranInvoice(p,inv,{akunPiutang:akunPiutang?akunPiutang.kode:''});
    if(!j.ok){_bayarPeringatan((inv.noInvoice||'Invoice')+': '+j.pesan);return;}
    paket.push({p,inv,jurnal:j.jurnal});
  }
  if(!confirm(`Catat penerimaan ${rp(hasil.totalDialokasikan)} untuk ${paket.length} invoice? Sistem akan membuat satu jurnal Kas/Bank dan Piutang untuk setiap invoice.`)) return;
  const posted=[];
  const balikBatch = (alasan) => {
    const gagalBalik=[];
    for(const entry of posted.slice().reverse()){
      const hariIni=new Date().toISOString().slice(0,10);
      const tgl=entry.tanggal && entry.tanggal>hariIni ? entry.tanggal : hariIni;
      try {
        if(!guardPeriode(tgl,'dibuatkan jurnal pembalik')) { gagalBalik.push(entry.no); continue; }
        const pembalik=buatJurnalPembalik(entry,{tanggal:tgl,alasan:`Pembatalan otomatis penerimaan ${id}: ${alasan}`});
        if(!pembalik) gagalBalik.push(entry.no);
      } catch(e) { gagalBalik.push(entry.no); }
    }
    if(typeof saveToStorage==='function') saveToStorage(false);
    return gagalBalik;
  };
  try {
    for(const item of paket){
      const entry=postJurnalLegacy(item.jurnal);
      if(!entry) throw new Error('Posting jurnal tidak berhasil.');
      item.p.jurnalNo=entry.no; posted.push(entry);
    }
  } catch(e) {
    const gagalBalik=balikBatch(e && e.message ? e.message : 'kegagalan posting');
    _bayarPeringatan('Penerimaan dibatalkan dan tidak ada record pembayaran yang disimpan. '+posted.length+' jurnal yang sempat dibuat '+(gagalBalik.length ? 'belum seluruhnya berhasil dibalik ('+gagalBalik.join(', ')+'); periksa Jurnal Umum.' : 'sudah dinetralkan dengan jurnal pembalik.')+' Jangan ulangi sebelum memeriksa Jurnal Umum.');
    return;
  }

  // Simpan snapshot agar kegagalan sinkronisasi dapat dipulihkan tanpa meninggalkan alokasi setengah jadi.
  const snapshotPembayaran=pembayaranList.slice();
  const snapshotInvoice=paket.map(x=>({inv:x.inv,sisaTagihan:x.inv.sisaTagihan,status:x.inv.status,dibayarLama:x.inv.dibayarLama,adaDibayarLama:Object.prototype.hasOwnProperty.call(x.inv,'dibayarLama')}));
  const map=new Map(hasil.perubahan.map(x=>[String(x.dokId),x]));
  for(const item of paket){
    pembayaranList.unshift(item.p);
    const perubahan=map.get(String(item.inv.id));
    if(perubahan.dibayarLama>0)item.inv.dibayarLama=perubahan.dibayarLama;
    item.inv.sisaTagihan=perubahan.sisaBaru;
    item.inv.status=statusDariPembayaran(item.inv,pembayaranList,'invoice');
  }
  Promise.resolve().then(()=>simpanPembayaranState('invoice')).then(ok=>{
    if(ok===false){
      pembayaranList=snapshotPembayaran;
      snapshotInvoice.forEach(x=>{x.inv.sisaTagihan=x.sisaTagihan;x.inv.status=x.status;if(x.adaDibayarLama)x.inv.dibayarLama=x.dibayarLama;else delete x.inv.dibayarLama;});
      const gagalBalik=balikBatch('sinkronisasi penyimpanan gagal');
      return Promise.resolve().then(()=>simpanPembayaranState('invoice')).then(()=>{
        renderInvoiceList();renderInvoiceKPI();
        _bayarPeringatan('Penyimpanan penerimaan gagal. Alokasi dan perubahan invoice dipulihkan; jurnal '+(gagalBalik.length?'belum seluruhnya berhasil dibalik ('+gagalBalik.join(', ')+')':'sudah dinetralkan dengan jurnal pembalik')+'. Periksa Jurnal Umum dan status sinkronisasi sebelum mencoba lagi.');
      });
    }
    try{for(const item of paket)if(typeof auditLog==='function')auditLog('create','invoice',`Alokasi penerimaan ${id} ke ${item.inv.noInvoice} — ${rp(item.p.jumlah)}`,{ref:item.inv.noInvoice});}catch(e){}
    closeModal('modal-alokasi-inv'); renderInvoiceList(); renderInvoiceKPI();
    showAlert(`✓ Penerimaan ${rp(hasil.totalDialokasikan)} berhasil dialokasikan ke ${paket.length} invoice. ${posted.length} jurnal dibuat.`);
    if(typeof cekNotifikasi==='function')cekNotifikasi();
  }).catch(err=>{
    pembayaranList=snapshotPembayaran;
    snapshotInvoice.forEach(x=>{x.inv.sisaTagihan=x.sisaTagihan;x.inv.status=x.status;if(x.adaDibayarLama)x.inv.dibayarLama=x.dibayarLama;else delete x.inv.dibayarLama;});
    const gagalBalik=balikBatch('exception sinkronisasi');
    Promise.resolve().then(()=>simpanPembayaranState('invoice')).finally(()=>{
      renderInvoiceList();renderInvoiceKPI();
      _bayarPeringatan('Terjadi kesalahan penyimpanan. Perubahan pembayaran dipulihkan. '+(gagalBalik.length?'Jurnal perlu diperiksa manual: '+gagalBalik.join(', '):'Jurnal telah dinetralkan.')+' '+escapeHtml(err&&err.message||''));
    });
  });
}

// ── Task 5.5: pembayaran bill (Dr Utang Usaha, Cr Kas/Bank) ──
let _bayarBillId = null;
function _bayarBillRingkasHtml(b) {
  const lama = dibayarLamaTurunan(b, pembayaranList, 'bill');
  const sisa = sisaTagihan(Object.assign({}, b, { dibayarLama: lama }), pembayaranList, 'bill');
  const baris = (l, v, clr) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:13px;margin-bottom:4px;"><span style="color:var(--muted);">${l}</span><span style="font-family:var(--mono);${clr ? 'color:' + clr + ';' : ''}font-weight:600;">${v}</span></div>`;
  const riwayat = pembayaranDokumen(pembayaranList, 'bill', b.id).slice().sort((a,c) => String(a.tanggal).localeCompare(String(c.tanggal)));
  let rw = '';
  if (lama > 0) rw += `<div style="font-size:12px;padding:4px 0;border-top:1px solid var(--border);">Dibayar sebelumnya (tanpa rincian): ${rp(lama)}</div>`;
  riwayat.forEach(p => { rw += `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;padding:4px 0;border-top:1px solid var(--border);"><span>${escapeHtml(p.tanggal)}${p.metode ? ' · ' + escapeHtml(p.metode) : ''}${p.jurnalNo ? '' : ' · belum dijurnal'}</span><span style="display:flex;align-items:center;gap:8px;"><span>${rp(p.jumlah)}</span><button class="btn btn-danger btn-sm" onclick="hapusPembayaranBill('${escapeForJsAttr(p.id)}')" title="Hapus pembayaran dan balik jurnal"><i class="ti ti-trash"></i></button></span></div>`; });
  return baris('Total tagihan', rp(b.total)) + baris('Sudah dibayar', rp(Math.max(0,b.total-sisa)), 'var(--accent)') + baris('Sisa tagihan', rp(sisa), 'var(--accent3)') + (rw ? `<div style="margin-top:10px;font-size:11px;color:var(--muted);text-transform:uppercase;">Riwayat pembayaran</div>${rw}` : '');
}
function _bayarBillFormTampil(tampil) {
  const f = document.getElementById('bayar-bill-form'), btn = document.getElementById('bayar-bill-simpan');
  if (f) f.style.display = tampil ? '' : 'none'; if (btn) btn.style.display = tampil ? '' : 'none';
}
function _bayarTombolRiwayatBill(b) {
  if (!pembayaranDokumen(pembayaranList, 'bill', b.id).length) return '';
  return `<button class="btn btn-ghost btn-sm" onclick="openRiwayatPembayaranBill('${escapeForJsAttr(b.id)}')" title="Riwayat pembayaran"><i class="ti ti-history"></i> Riwayat</button>`;
}
function openModalBayarBill(id) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const b = billList.find(x => x && String(x.id) === String(id)); if (!b) return;
  if (b.status !== 'diterima') { showAlert(b.status === 'lunas' ? 'Tagihan ini sudah lunas.' : 'Hanya tagihan berstatus Diterima yang bisa dibayar.'); return; }
  _bayarBillId = b.id; _bayarBillFormTampil(true);
  const j = document.getElementById('bayar-bill-judul'); if (j) j.textContent = 'Bayar Tagihan ' + b.noBill;
  const r = document.getElementById('bayar-bill-ringkas'); if (r) r.innerHTML = _bayarBillRingkasHtml(b);
  const tgl = new Date().toISOString().slice(0,10);
  _bayarSet('bayar-bill-tgl', b.tanggal && tgl < b.tanggal ? b.tanggal : tgl);
  _bayarSet('bayar-bill-jumlah', sisaTagihan(Object.assign({},b,{dibayarLama:dibayarLamaTurunan(b,pembayaranList,'bill')}),pembayaranList,'bill'));
  _bayarSet('bayar-bill-metode',''); _bayarSet('bayar-bill-catatan','');
  const kas = akuns.find(a => a.kode === '1101') || akuns.find(a => a.tipe === 'Aset');
  _bayarSet('bayar-bill-akun', kas ? kas.kode : '');
  const btn = document.getElementById('bayar-bill-akun-btn');
  if (btn) { if (kas) { btn.innerHTML = `<span class="picker-kode-badge">${escapeHtml(kas.kode)}</span> ${escapeHtml(kas.nama)}`; btn.classList.add('has-value'); } else { btn.textContent='Pilih Akun...'; btn.classList.remove('has-value'); } }
  openModal('modal-bayar-bill'); setTimeout(upgradeFormPickers,80);
}
function simpanPembayaranBill() {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const b = billList.find(x => x && String(x.id) === String(_bayarBillId)); if (!b) { showAlert('Tagihan tidak ditemukan.'); return; }
  const v = id => (document.getElementById(id) || {}).value || '';
  let id = 'PAY_' + Date.now(), n = 1; while (pembayaranList.some(p => p && p.id === id)) id = 'PAY_' + Date.now() + '_' + n++;
  const hasil = susunPembayaran({ id, createdAt:new Date().toISOString(), tanggal:v('bayar-bill-tgl'), jumlah:parseFloat(v('bayar-bill-jumlah')), akunKas:v('bayar-bill-akun'), metode:v('bayar-bill-metode'), catatan:v('bayar-bill-catatan') }, b, pembayaranList, 'bill');
  if (!hasil.ok) { showAlert(hasil.pesan); return; }
  if (!guardPeriode(hasil.pembayaran.tanggal, 'diposting')) return;
  const r = buatJurnalPembayaranBill(hasil.pembayaran,b); if (!r.ok) { _bayarPeringatan(r.pesan); return; }
  const entry = postJurnalLegacy(r.jurnal); if (!entry) return;
  hasil.pembayaran.jurnalNo = entry.no;
  catatPembayaran(b,hasil); _bayarBillId = null; closeModal('modal-bayar-bill'); renderBillList();
  try { if (typeof auditLog === 'function') auditLog('create','bill',`Pembayaran tagihan ${b.noBill} — ${rp(hasil.pembayaran.jumlah)}`,{ref:b.noBill}); } catch(e) {}
  showAlert(`✓ Pembayaran ${rp(hasil.pembayaran.jumlah)} untuk ${escapeHtml(b.noBill)} dicatat. ${hasil.lunas ? 'Tagihan LUNAS.' : 'Sisa tagihan ' + rp(hasil.sisaBaru) + '.'}<br><span style="font-size:12px;color:var(--muted);">Jurnal ${escapeHtml(entry.no)} dibuat (Utang berkurang, Kas/Bank berkurang).</span>`);
}
function openRiwayatPembayaranBill(id) {
  const b = billList.find(x => x && String(x.id) === String(id)); if (!b) return;
  _bayarBillId = null; const j=document.getElementById('bayar-bill-judul'); if(j) j.textContent='Riwayat Pembayaran '+b.noBill;
  const r=document.getElementById('bayar-bill-ringkas'); if(r) r.innerHTML=_bayarBillRingkasHtml(b);
  _bayarBillFormTampil(false); openModal('modal-bayar-bill');
}
function hapusPembayaranBill(payId) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pembayaran')) return;
  const p=pembayaranList.find(x=>x && x.id===payId); if(!p) return;
  const b=billList.find(x=>x && String(x.id)===String(p.dokId)) || null;
  const h=susunHapusPembayaran(payId,b,pembayaranList,jurnalEntries); if(!h.ok){_bayarPeringatan(h.pesan);return;}
  const label=(b?b.noBill:(p.noDok||''))+' — '+rp(p.jumlah)+' ('+p.tanggal+')';
  if(h.jurnalStatus==='aktif') {
    const tgl=tanggalPembalikBill(h.jurnal.tanggal,new Date().toISOString().slice(0,10));
    if(!confirm('Hapus pembayaran '+label+'? Jurnal '+h.jurnal.no+' akan dibalik pada '+tgl+' dan sisa utang dipulihkan.')) return;
    if(!guardPeriode(tgl,'dibuatkan jurnal pembalik')) return;
    let balik=null; try { balik=buatJurnalPembalik(h.jurnal,{tanggal:tgl,alasan:'Pembayaran tagihan '+label+' dihapus'}); } catch(e){if(!(e instanceof PeriodeTerkunciError)) throw e; return;}
    if(!balik) return; if(typeof saveToStorage==='function') saveToStorage(false);
  } else if(!confirm('Hapus pembayaran '+label+'? '+(h.jurnalStatus==='dibalik'?'Jurnalnya sudah dibalik sebelumnya.':'Pembayaran ini belum punya jurnal.'))) return;
  terapkanHapusPembayaran(b,h);
  try { if(typeof auditLog==='function') auditLog('delete','bill','Hapus pembayaran tagihan '+label,{ref:b?b.noBill:(p.noDok||'')}); } catch(e) {}
  const r=document.getElementById('bayar-bill-ringkas'); if(b && r) { if(!pembayaranDokumen(pembayaranList,'bill',b.id).length && !(b.dibayarLama>0)) closeModal('modal-bayar-bill'); else r.innerHTML=_bayarBillRingkasHtml(b); }
  renderBillList(); showAlert('✓ Pembayaran dihapus'+(h.jurnalStatus==='aktif'?' dan jurnalnya dibalik':'')+(b?'. Sisa tagihan '+escapeHtml(b.noBill)+' sekarang '+rp(h.sisaBaru)+'.':'.'));
}
