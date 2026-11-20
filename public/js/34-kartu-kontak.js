// ═══════════════════════════════════════════════════════════
// KARTU PIUTANG & KARTU HUTANG per kontak (task 6.1 dan 6.2, Roadmap.md)
//
// Satu kartu = riwayat satu pelanggan (piutang: invoice dan pembayarannya) atau satu supplier (hutang: tagihan
// dan pembayarannya), urut tanggal, dengan saldo berjalan. Satu fungsi murni melayani keduanya (parameter `jenis`
// 'piutang' | 'hutang'), jadi aturan saldo tidak bisa berbeda antara kartu piutang dan hutang.
//
// Baris kartu:
//   dokumen : invoice (piutang) atau tagihan (hutang)   -> menambah saldo
//   bayar   : record pembayaran (31-pembayaran.js)      -> mengurangi saldo
//   lama    : pembayaran yang dicatat lewat alur lama ("Tandai Lunas" tanpa record, field dibayarLama)
//             -> mengurangi saldo, bertanggal sama dengan dokumennya karena tanggal aslinya tidak tersimpan
// Saldo akhir sebuah dokumen = sisaTagihan() dari 31-pembayaran.js, jadi total kartu sama dengan Umur Piutang/Hutang.
//
// Yang masuk kartu: invoice terkirim/sebagian/lunas (draft tidak); tagihan diterima/sebagian/lunas yang jurnalnya
// tidak dibalik, ditambah pembelian kredit lama yang hanya ada sebagai jurnal (sama dengan Umur Hutang, 4.7).
// Kontak dicocokkan lewat NAMA (invoice.pelanggan / bill.supplier bukan FK), tanpa beda huruf besar/kecil.
//
// Fungsi murni (tanpa DOM/state/localStorage), diuji di tests/kartu-kontak.test.js: susunKartuKontak,
// daftarKontakKartu, dokumenHutangKartu, kartuKontakHtml. Render ke halaman ada di bagian bawah.
// Dimuat setelah 33-urut-jurnal.js (butuh 31-pembayaran.js, 28-bill.js, 30-aging-hutang.js).
// ═══════════════════════════════════════════════════════════

const KARTU_CFG = {
  piutang: { jenisDok: 'invoice', namaField: 'pelanggan', noField: 'noInvoice', status: ['terkirim', 'sebagian', 'lunas'],
    labelDok: 'Invoice', labelKontak: 'Pelanggan', kosong: 'invoice', id: 'kartu-piutang' },
  hutang: { jenisDok: 'bill', namaField: 'supplier', noField: 'noBill', status: ['diterima', 'sebagian', 'lunas'],
    labelDok: 'Tagihan', labelKontak: 'Supplier', kosong: 'tagihan', id: 'kartu-hutang' }
};

function _kartuNama(s) { return String(s === undefined || s === null ? '' : s).trim().toLowerCase(); }
function _kartuTgl(s) { return (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}/.test(s)) ? s.slice(0, 10) : ''; }

// Nama kontak unik (huruf besar/kecil pertama yang ditemui) yang punya dokumen di kartu `jenis`, urut abjad.
// `dokumen` = invoiceList (piutang) atau hasil dokumenHutangKartu (hutang). Nama kosong dilewati.
function daftarKontakKartu(jenis, dokumen) {
  const C = KARTU_CFG[jenis]; if (!C) return [];
  const peta = new Map();
  (Array.isArray(dokumen) ? dokumen : []).forEach(d => {
    if (!d || typeof d !== 'object' || !C.status.includes(d.status)) return;
    const nama = String(d[C.namaField] || '').trim();
    if (nama && !peta.has(_kartuNama(nama))) peta.set(_kartuNama(nama), nama);
  });
  return [...peta.values()].sort((a, b) => a.localeCompare(b, 'id'));
}

// Dokumen kartu hutang: bill non-draft yang jurnalnya tidak dibalik + pembelian kredit lama tanpa bill.
// Murni; mengembalikan array record bill (asli, tidak disalin) dan record turunan untuk pembelian kredit lama.
function dokumenHutangKartu(daftarBill, daftarJurnal) {
  const bills = (Array.isArray(daftarBill) ? daftarBill : []).filter(b => b && typeof b === 'object');
  const jurnal = Array.isArray(daftarJurnal) ? daftarJurnal : [];
  const aktif = bills.filter(b => KARTU_CFG.hutang.status.includes(b.status) && jurnalBillStatus(b, jurnal, bills).status !== 'dibalik');
  return aktif.concat(pembelianKreditTanpaBill(bills, jurnal));
}

// Susun kartu satu kontak.
//   jenis      : 'piutang' | 'hutang'
//   kontak     : nama kontak
//   dokumen    : invoiceList (piutang) atau dokumenHutangKartu(...) (hutang)
//   pembayaran : pembayaranList
//   opsi       : { dari?, sampai? } 'YYYY-MM-DD'. Mutasi sebelum `dari` dijumlah menjadi saldoAwal; sesudah `sampai` dibuang.
// Mengembalikan { jenis, kontak, dari, sampai, saldoAwal, baris:[{tanggal,tipe,no,ket,tambah,kurang,saldo}],
//                 total:{tambah,kurang}, saldoAkhir, tidakValid } (tidakValid = jumlah dokumen tanpa total/tanggal valid, dilewati).
// Urutan baris: tanggal, lalu dokumen sebelum pembayaran lama sebelum pembayaran, lalu urutan data.
function susunKartuKontak(jenis, kontak, dokumen, pembayaran, opsi) {
  const C = KARTU_CFG[jenis];
  if (!C) throw new TypeError('susunKartuKontak: jenis harus piutang atau hutang');
  opsi = opsi || {};
  const dari = _kartuTgl(opsi.dari), sampai = _kartuTgl(opsi.sampai);
  const kunci = _kartuNama(kontak);
  const mentah = [];
  let tidakValid = 0, urut = 0;
  (Array.isArray(dokumen) ? dokumen : []).forEach(d => {
    if (!d || typeof d !== 'object' || !C.status.includes(d.status) || _kartuNama(d[C.namaField]) !== kunci) return;
    const tgl = _kartuTgl(d.tanggal);
    if (!tgl || typeof d.total !== 'number' || !isFinite(d.total) || d.total <= 0) { tidakValid++; return; }
    const no = String(d[C.noField] || d.no || '');
    mentah.push({ tanggal: tgl, tipe: 'dokumen', o: 0, n: urut++, no, ket: C.labelDok + (d.deskripsi ? ' — ' + String(d.deskripsi).trim() : ''), tambah: _bayarBulat(d.total), kurang: 0 });
    const lama = dibayarLamaTurunan(d, pembayaran, C.jenisDok);
    if (lama > 0) mentah.push({ tanggal: tgl, tipe: 'lama', o: 1, n: urut++, no, ket: 'Pembayaran sebelum pencatatan (alur lama)', tambah: 0, kurang: lama });
    pembayaranDokumen(pembayaran, C.jenisDok, d.id).forEach(p => {
      const tp = _kartuTgl(p.tanggal) || tgl;
      mentah.push({ tanggal: tp, tipe: 'bayar', o: 2, n: urut++, no, ket: 'Pembayaran' + (p.metode ? ' · ' + p.metode : ''), tambah: 0, kurang: _bayarBulat(p.jumlah) });
    });
  });
  mentah.sort((a, b) => a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : (a.o - b.o) || (a.n - b.n));

  let saldo = 0, saldoAwal = 0, tambah = 0, kurang = 0;
  const baris = [];
  mentah.forEach(r => {
    saldo = _bayarBulat(saldo + r.tambah - r.kurang);
    if (dari && r.tanggal < dari) { saldoAwal = saldo; return; }
    if (sampai && r.tanggal > sampai) return;
    tambah = _bayarBulat(tambah + r.tambah); kurang = _bayarBulat(kurang + r.kurang);
    baris.push({ tanggal: r.tanggal, tipe: r.tipe, no: r.no, ket: r.ket, tambah: r.tambah, kurang: r.kurang, saldo });
  });
  return { jenis, kontak: String(kontak === undefined || kontak === null ? '' : kontak), dari, sampai, saldoAwal, baris,
    total: { tambah, kurang }, saldoAkhir: _bayarBulat(saldoAwal + tambah - kurang), tidakValid };
}

// HTML tabel kartu (murni; bergantung pada escapeHtml dan rp). `hasil` = keluaran susunKartuKontak.
function kartuKontakHtml(hasil) {
  const C = KARTU_CFG[hasil.jenis] || KARTU_CFG.piutang;
  const tgl = s => { const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : String(s); };
  const sel = (v, warna) => v > 0 ? `<td style="font-family:var(--mono);text-align:right;color:${warna};">${rp(v)}</td>` : `<td style="text-align:right;color:var(--muted);">–</td>`;
  if (!hasil.baris.length && !hasil.saldoAwal) {
    return `<div style="padding:24px 16px;text-align:center;color:var(--muted);font-size:13px;">Belum ada ${C.kosong} untuk ${escapeHtml(hasil.kontak || 'kontak ini')} pada periode ini.</div>`;
  }
  const awal = hasil.dari ? `<tr style="background:var(--surface2);"><td colspan="5" style="font-size:12px;">Saldo awal (sebelum ${escapeHtml(tgl(hasil.dari))})</td><td style="font-family:var(--mono);text-align:right;font-weight:600;">${rp(hasil.saldoAwal)}</td></tr>` : '';
  const isi = hasil.baris.map(r => `<tr>
    <td style="font-size:12px;white-space:nowrap;">${escapeHtml(tgl(r.tanggal))}</td>
    <td style="font-family:var(--mono);font-size:11px;">${escapeHtml(r.no || '-')}</td>
    <td style="font-size:12px;">${escapeHtml(r.ket)}</td>
    ${sel(r.tambah, 'var(--text)')}${sel(r.kurang, 'var(--accent)')}
    <td style="font-family:var(--mono);text-align:right;font-weight:600;">${rp(r.saldo)}</td></tr>`).join('');
  const bawah = `<tr style="background:var(--surface2);font-weight:600;"><td colspan="3">Total periode</td>
    <td style="font-family:var(--mono);text-align:right;">${rp(hasil.total.tambah)}</td><td style="font-family:var(--mono);text-align:right;">${rp(hasil.total.kurang)}</td>
    <td style="font-family:var(--mono);text-align:right;">${rp(hasil.saldoAkhir)}</td></tr>`;
  const catatan = hasil.tidakValid ? `<div style="padding:8px 16px;font-size:11px;color:var(--muted);">${hasil.tidakValid} ${C.kosong} tanpa total/tanggal yang valid tidak ditampilkan.</div>` : '';
  return `<div class="table-scroll"><table id="${C.id}-table"><thead><tr><th>Tanggal</th><th>No</th><th>Keterangan</th>
    <th style="text-align:right;">${C.labelDok}</th><th style="text-align:right;">Pembayaran</th><th style="text-align:right;">Saldo</th></tr></thead>
    <tbody>${awal}${isi}${bawah}</tbody></table></div>${catatan}`;
}

// ── Render ke halaman (menyentuh DOM; tidak diuji otomatis) ─────────────────────────────
function _kartuDokumen(jenis) {
  return jenis === 'hutang' ? dokumenHutangKartu(billList, jurnalEntries) : (Array.isArray(invoiceList) ? invoiceList : []);
}

function _renderKartu(jenis) {
  const C = KARTU_CFG[jenis];
  const body = document.getElementById(C.id + '-body'), pick = document.getElementById(C.id + '-kontak');
  if (!body || !pick) return;
  const dok = _kartuDokumen(jenis);
  const nama = daftarKontakKartu(jenis, dok);
  const dipilih = nama.find(n => _kartuNama(n) === _kartuNama(pick.value)) || nama[0] || '';
  pick.innerHTML = nama.length ? nama.map(n => `<option value="${escapeHtml(n)}"${n === dipilih ? ' selected' : ''}>${escapeHtml(n)}</option>`).join('') : '<option value="">(belum ada)</option>';
  if (!dipilih) { body.innerHTML = `<div style="padding:24px 16px;text-align:center;color:var(--muted);font-size:13px;">Belum ada ${C.kosong} untuk ditampilkan.</div>`; return; }
  const v = id => { const e = document.getElementById(C.id + '-' + id); return e ? e.value : ''; };
  body.innerHTML = kartuKontakHtml(susunKartuKontak(jenis, dipilih, dok, pembayaranList, { dari: v('dari'), sampai: v('sampai') }));
}
function renderKartuPiutang() { _renderKartu('piutang'); }
function renderKartuHutang() { _renderKartu('hutang'); }
