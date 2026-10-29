// ═══════════════════════════════════════════════════════════
// TAGIHAN PEMBELIAN (BILL) — state, model data, dan penyimpanan (task 4.1 dan 4.4, Roadmap.md)
//
// Bill = tagihan dari supplier yang belum dibayar (padanan invoice di sisi pembelian).
// Bentuk record: lihat docs/SCHEMA.md §4.5b.
//
// State billList. Bisnis login: dimuat/disimpan lewat cloud-records (kind `bill`,
// 22-cloud-records.js). Mode tamu: key localStorage `oas_bill`.
// Modul ini berisi state, fungsi murni (hitung total, nomor, susun record), dan penyimpan.
// Form dan daftar ada di 29-bill-ui.js. Fungsi murni jurnal bill ada di sini (4.5, status/penaut 4.6); pemasangannya ke alur simpan, daftar, dan hapus ada di 29-bill-ui.js (4.6).
// ═══════════════════════════════════════════════════════════
let billList = (() => {
  try { const a = JSON.parse(localStorage.getItem('oas_bill') || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
})();

// ── Fungsi murni ───────────────────────────────────────────

// Hitung subtotal, PPN, dan total bill dari daftar item. Memakai hitungPpn (02-utils.js).
// items     : [{ qty, harga }]; nilai bukan angka / negatif dianggap 0
// ppnAktif  : true bila bill memakai PPN Masukan
// tarifPct  : tarif PPN dalam persen (mis. 11); kosong = tarif standar
// Mengembalikan { subtotal, ppn, total }.
function hitungTotalBill(items, ppnAktif, tarifPct) {
  const angka = v => (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;
  const subtotal = (Array.isArray(items) ? items : []).reduce((s, it) => s + angka(it && it.qty) * angka(it && it.harga), 0);
  const ppn = ppnAktif ? hitungPpn(subtotal, tarifPct) : 0;
  return { subtotal, ppn, total: subtotal + ppn };
}

// Nomor bill berikutnya (BILL-<tahun>-<urut>). Memakai counter (kind `counter`) sebagai batas bawah,
// jadi menghapus bill terakhir tidak membuat nomornya dipakai lagi.
function nomorBillBerikut(tahun) {
  const y = Number.isInteger(tahun) ? tahun : new Date().getFullYear();
  const counters = (typeof counterList !== 'undefined' && Array.isArray(counterList)) ? counterList : [];
  return nomorBerikut('BILL', y, billList.map(b => b && b.noBill), counters);
}

const BILL_STATUS_SIMPAN = ['draft', 'diterima'];

// Validasi isi form lalu susun record bill (murni: tanpa DOM, state, atau localStorage).
// f : { id, noBill, supplier, tanggal, jatuhTempo, deskripsi, items:[{nama,qty,harga,akun}],
//       ppnAktif, ppnTarif, akunUtang, status, createdAt }
// daftarNomor : nomor bill yang sudah ada (untuk cek kembar)
// Baris item kosong (qty atau harga <= 0) dibuang. Status 'diterima' mewajibkan akun utang dan akun tiap item
// (jurnal 4.5-4.6 membutuhkannya); 'draft' boleh belum lengkap.
// Mengembalikan { ok:true, bill } atau { ok:false, pesan }.
function susunBill(f, daftarNomor) {
  const gagal = pesan => ({ ok: false, pesan });
  f = f || {};
  const teks = v => (typeof v === 'string' ? v.trim() : '');
  const angka = v => (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;
  const status = f.status;
  if (!BILL_STATUS_SIMPAN.includes(status)) return gagal('Status tagihan tidak valid.');

  const noBill = teks(f.noBill).toUpperCase();
  const supplier = teks(f.supplier);
  if (!supplier) return gagal('Isi nama supplier.');
  if (!noBill) return gagal('Isi nomor tagihan.');
  if ((Array.isArray(daftarNomor) ? daftarNomor : []).some(n => String(n || '').trim().toUpperCase() === noBill)) {
    return gagal('Nomor tagihan ' + noBill + ' sudah dipakai. Ganti nomornya, atau tutup lalu buka form baru untuk nomor otomatis.');
  }
  const tanggal = teks(f.tanggal);
  const jatuhTempo = teks(f.jatuhTempo);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return gagal('Isi tanggal tagihan.');
  if (jatuhTempo && (!/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempo) || jatuhTempo < tanggal)) return gagal('Jatuh tempo tidak boleh sebelum tanggal tagihan.');

  const items = (Array.isArray(f.items) ? f.items : [])
    .filter(it => it && angka(it.qty) > 0 && angka(it.harga) > 0)
    .map(it => ({ nama: teks(it.nama), qty: it.qty, harga: it.harga, akun: teks(it.akun) }));
  if (!items.length) return gagal('Isi minimal 1 item dengan jumlah dan harga lebih dari 0.');

  const akunUtang = teks(f.akunUtang);
  if (status === 'diterima') {
    if (!akunUtang) return gagal('Pilih akun Utang Usaha sebelum menyimpan sebagai Diterima.');
    if (items.some(it => !it.akun)) return gagal('Pilih akun untuk setiap item sebelum menyimpan sebagai Diterima.');
  }

  const tarif = (typeof f.ppnTarif === 'number' && isFinite(f.ppnTarif) && f.ppnTarif > 0) ? f.ppnTarif : undefined;
  const h = hitungTotalBill(items, !!f.ppnAktif, tarif);
  return {
    ok: true,
    bill: {
      id: teks(f.id) || ('BILL_' + Date.now()),
      noBill, supplier, tanggal, jatuhTempo,
      deskripsi: teks(f.deskripsi),
      items,
      subtotal: h.subtotal, ppn: h.ppn, ppnTarif: f.ppnAktif ? (tarif !== undefined ? tarif : PPN_TARIF_STANDAR) : 0, total: h.total,
      sisaTagihan: h.total,
      status,
      akunUtang,
      createdAt: teks(f.createdAt) || new Date().toISOString()
    }
  };
}

// ── Edit draft bill (task 4.6c) ────────────────────────────

// Hanya bill berstatus draft yang boleh diedit. Bill diterima/lunas sudah (atau akan) punya jurnal,
// jadi koreksinya lewat hapus (jurnal pembalik) lalu buat ulang, bukan edit langsung.
function bisaEditBill(bill) {
  return !!bill && typeof bill === 'object' && bill.status === 'draft';
}

// Ubah record bill menjadi isian form (kebalikan susunBill). Murni; item disalin supaya mengedit
// form tidak mengubah record sebelum disimpan. ppnTarif record = 0 bila bill tanpa PPN, jadi
// ppnAktif dibaca dari ppnTarif > 0 dan tarif form kembali ke tarif standar.
function formDariBill(bill) {
  const b = bill && typeof bill === 'object' ? bill : {};
  const aktif = typeof b.ppnTarif === 'number' && isFinite(b.ppnTarif) && b.ppnTarif > 0;
  return {
    id: b.id || '', noBill: b.noBill || '', supplier: b.supplier || '',
    tanggal: b.tanggal || '', jatuhTempo: b.jatuhTempo || '', deskripsi: b.deskripsi || '',
    items: (Array.isArray(b.items) ? b.items : []).filter(it => it && typeof it === 'object')
      .map(it => ({ nama: it.nama || '', qty: it.qty, harga: it.harga, akun: it.akun || '' })),
    ppnAktif: aktif, ppnTarif: aktif ? b.ppnTarif : PPN_TARIF_STANDAR,
    akunUtang: b.akunUtang || '', createdAt: b.createdAt || ''
  };
}

// ── Jurnal bill (task 4.5, fungsi murni; belum dipasang ke alur simpan, itu task 4.6) ──

// Kode akun PPN Masukan dari daftar akun: 1502 bila ada, kalau tidak akun yang namanya memuat
// 'ppn masukan' (sama dengan pencarian di pembelian produk ber-PPN), kalau tidak ketemu: '1502'.
function cariAkunPpnMasukan(daftarAkun) {
  const a = (Array.isArray(daftarAkun) ? daftarAkun : []).filter(x => x && x.kode);
  if (a.some(x => x.kode === '1502')) return '1502';
  const f = a.find(x => /ppn masukan/i.test(x.nama || ''));
  return f ? f.kode : '1502';
}

// Susun entri jurnal dari satu bill berstatus 'diterima' (murni: tidak menyimpan apa pun).
//   Dr akun tiap item (Persediaan/Beban, item berakun sama digabung)
//   Dr PPN Masukan (bila bill.ppn > 0)
//   Cr Utang Usaha (bill.akunUtang) = total debit
// opsi.akunPpnMasukan : kode akun PPN Masukan (default 1502; lihat cariAkunPpnMasukan)
// Nominal dibulatkan ke rupiah; selisih pembulatan antar akun dibebankan ke baris debit terbesar
// supaya jurnal selalu seimbang. Baris PPN memakai ket 'PPN Masukan NN%' + _ppnTarif agar terbaca
// rekap pajak (ppnDariJurnal), dan ket jurnal memuat nomor bill karena kolom `ref` tidak ikut
// tersimpan ke cloud (hanya no, tanggal, ket, jenis, lines, meta).
// Mengembalikan { ok:true, jurnal } atau { ok:false, pesan }.
function buatJurnalBill(bill, opsi) {
  const gagal = pesan => ({ ok: false, pesan });
  const teks = v => (typeof v === 'string' ? v.trim() : '');
  const angka = v => (typeof v === 'number' && isFinite(v) && v > 0) ? v : 0;
  if (!bill || typeof bill !== 'object') return gagal('Data tagihan tidak valid.');
  if (bill.status !== 'diterima') return gagal('Hanya tagihan berstatus Diterima yang dijurnal.');
  const akunUtang = teks(bill.akunUtang);
  if (!akunUtang) return gagal('Akun Utang Usaha belum dipilih.');
  const tanggal = teks(bill.tanggal);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return gagal('Tanggal tagihan tidak valid.');
  const items = (Array.isArray(bill.items) ? bill.items : []).filter(it => it && angka(it.qty) * angka(it.harga) > 0);
  if (!items.length) return gagal('Tagihan tidak punya item bernilai.');
  if (items.some(it => !teks(it.akun))) return gagal('Ada item tanpa akun. Pilih akun untuk setiap item.');

  // Gabung per akun (urutan kemunculan pertama dipertahankan)
  const grup = [];
  items.forEach(it => {
    const kode = teks(it.akun), nilai = angka(it.qty) * angka(it.harga);
    let g = grup.find(x => x.akun === kode);
    if (!g) { g = { akun: kode, nilai: 0, nama: [] }; grup.push(g); }
    g.nilai += nilai;
    const n = teks(it.nama); if (n && !g.nama.includes(n)) g.nama.push(n);
  });
  const target = Math.round(grup.reduce((s, g) => s + g.nilai, 0));
  grup.forEach(g => { g.debit = Math.round(g.nilai); });
  const selisih = target - grup.reduce((s, g) => s + g.debit, 0);
  if (selisih) grup.reduce((a, b) => (b.debit > a.debit ? b : a)).debit += selisih;
  const barisItem = grup.filter(g => g.debit > 0).map(g => ({
    akun: g.akun, ket: g.nama.join(', ').slice(0, 80) || 'Pembelian', debit: g.debit, kredit: 0
  }));
  if (!barisItem.length) return gagal('Total tagihan 0, tidak ada yang dijurnal.');

  const ppn = angka(bill.ppn) ? Math.round(bill.ppn) : 0;
  const tarif = angka(bill.ppnTarif);
  if (ppn > 0 && !tarif) return gagal('Tarif PPN tagihan tidak ada, PPN Masukan tidak bisa dijurnal.');
  const akunPpn = teks(opsi && opsi.akunPpnMasukan) || '1502';
  const lines = barisItem.slice();
  if (ppn > 0) lines.push({ akun: akunPpn, ket: 'PPN Masukan ' + tarif + '%', debit: ppn, kredit: 0 });
  const total = lines.reduce((s, l) => s + l.debit, 0);
  lines.push({ akun: akunUtang, ket: 'Utang Usaha — ' + teks(bill.supplier), debit: 0, kredit: total });

  const jurnal = {
    tanggal,
    jenis: JENIS_JURNAL.BILL,
    keterangan: 'Tagihan ' + teks(bill.noBill) + ' — ' + teks(bill.supplier),
    ref: teks(bill.noBill),
    lines
  };
  if (ppn > 0) jurnal._ppnTarif = tarif;
  return { ok: true, jurnal };
}

// Status jurnal sebuah bill, dibaca dari daftar jurnal (murni).
//   'tanpa'  : bill draft (tidak punya jurnal)
//   'belum'  : bill belum punya jurnal (mis. bill diterima dari task 4.4, sebelum jurnal bill ada)
//   'aktif'  : jurnal ada dan belum dibalik
//   'dibalik': jurnal ada tetapi sudah dibalik (jurnal pembalik)
// Penaut: bill.jurnalNo (nomor JRN-xxx) bila cocok dengan jurnal berjenis Tagihan Pembelian yang ketnya
// diawali "Tagihan <noBill> — <supplier>". Tanpa jurnalNo (atau tidak cocok, mis. nomor jurnal berulang
// setelah reset), dicari dari ket saja, dengan melewati jurnal yang nomornya sudah dipakai bill lain.
// `id` dan `ref` jurnal tidak ikut tersimpan ke cloud, jadi penaut memakai nomor jurnal dan ket.
// Jurnal pembalik (yang jenisnya diwarisi dari jurnal asal) tidak dihitung sebagai jurnal bill.
// Mengembalikan { status, jurnal }.
function jurnalBillStatus(bill, daftarJurnal, daftarBill) {
  if (!bill || typeof bill !== 'object' || bill.status === 'draft') return { status: 'tanpa', jurnal: null };
  const js = (Array.isArray(daftarJurnal) ? daftarJurnal : []).filter(j => j && typeof j === 'object');
  const ketJ = j => String(j.ket || j.keterangan || '');
  const pembalikDari = j => {
    if (j.reversalOf) return String(j.reversalOf);
    const m = /^\[Pembalik ([^\]]+)\]/.exec(ketJ(j));
    return m ? m[1].trim() : '';
  };
  const asal = js.filter(j => j.jenis === JENIS_JURNAL.BILL && !pembalikDari(j));
  const awal = 'Tagihan ' + String(bill.noBill || '').trim() + ' — ' + String(bill.supplier || '').trim();
  const dibalik = j => js.some(x => pembalikDari(x) === j.no);
  let jurnal = null;
  if (bill.jurnalNo) jurnal = asal.find(j => j.no === bill.jurnalNo && ketJ(j).startsWith(awal)) || null;
  if (!jurnal) {
    const dipakaiLain = new Set((Array.isArray(daftarBill) ? daftarBill : [])
      .filter(b => b && b !== bill && b.id !== bill.id && b.jurnalNo).map(b => b.jurnalNo));
    const cocok = asal.filter(j => ketJ(j).startsWith(awal) && !dipakaiLain.has(j.no));
    jurnal = cocok.find(j => !dibalik(j)) || cocok[0] || null;
  }
  if (!jurnal) return { status: 'belum', jurnal: null };
  return { status: dibalik(jurnal) ? 'dibalik' : 'aktif', jurnal };
}

// Tanggal jurnal pembalik untuk bill yang dihapus: hari ini, tetapi tidak boleh lebih awal dari
// tanggal jurnal asal (aturan buatJurnalPembalik). Murni; keduanya "YYYY-MM-DD".
function tanggalPembalikBill(tanggalJurnal, hariIni) {
  const t = typeof tanggalJurnal === 'string' ? tanggalJurnal.slice(0, 10) : '';
  return (t && t > hariIni) ? t : hariIni;
}

// Simpan billList dan counter: bisnis login -> cloud (cloud-records), mode tamu -> localStorage.
// Mengembalikan Promise<boolean> (false bila sinkron cloud gagal; data tetap aman di cache perangkat).
function simpanBillState() {
  if (typeof currentCompany !== 'undefined' && currentCompany && typeof cloudSyncRecords === 'function') {
    return cloudSyncRecords(['bill', 'counter']);
  }
  try {
    localStorage.setItem('oas_bill', JSON.stringify(billList));
    localStorage.setItem('oas_counter', JSON.stringify(counterList));
  } catch (e) { return Promise.resolve(false); }
  return Promise.resolve(true);
}

// Tambah bill baru ke daftar (terbaru di atas), naikkan counter nomornya, lalu simpan.
function tambahBill(bill) {
  billList.unshift(bill);
  if (typeof counterSetelahPakai === 'function') counterList = counterSetelahPakai(counterList, bill.noBill);
  return simpanBillState();
}

// Ganti satu bill (dicocokkan lewat id) dengan versi barunya di posisi yang sama, naikkan counter bila
// nomornya diubah ke nomor yang lebih tinggi, lalu simpan. Mengembalikan true bila bill ditemukan.
function perbaruiBill(bill) {
  if (!bill || typeof bill !== 'object') return false;
  const i = billList.findIndex(b => b && b.id === bill.id);
  if (i < 0) return false;
  billList[i] = bill;
  if (typeof counterSetelahPakai === 'function') counterList = counterSetelahPakai(counterList, bill.noBill);
  simpanBillState();
  return true;
}

// Hapus satu bill dari daftar lalu simpan. Mengembalikan true bila ada yang terhapus.
function hapusBillById(id) {
  const n = billList.length;
  billList = billList.filter(b => b && b.id !== id);
  if (billList.length === n) return false;
  simpanBillState();
  return true;
}
