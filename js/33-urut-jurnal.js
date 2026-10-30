// ═══════════════════════════════════════════════════════════
// URUTAN TABEL JURNAL (klik header kolom)
//
// Tabel Jurnal Umum, Jurnal Kas, Jurnal Penjualan, Jurnal Pembelian dan Buku Besar (per akun): header kolom Tanggal dan nomor (No. Jurnal /
// No. Invoice / No. Faktur) bisa diklik untuk mengubah urutan.
//  - Tanggal : bergantian antara urutan awal tabel itu dan kebalikannya (Umum/Kas awalnya terbaru di atas,
//    Penjualan/Pembelian/Buku Besar awalnya terlama di atas; klik pertama selalu membalik).
//  - Nomor   : tidak diurutkan (awal) -> kecil ke besar -> besar ke kecil -> tidak diurutkan.
//  - Bila keduanya aktif, kolom yang TERAKHIR diklik jadi urutan utama dan yang lain jadi pembanding kedua
//    (mis. tanggal utama: entri sehari yang sama diurutkan menurut nomornya).
// Tanpa klik apa pun urutan tiap tabel tetap seperti sebelumnya. Urutan tidak disimpan (per sesi).
// Fungsi urutkanJurnalUmum murni (tanpa DOM/state); diuji di tests/urut-jurnal.test.js.
// Dimuat setelah 07-jurnal-laporan.js.
// ═══════════════════════════════════════════════════════════

// Angka dari nomor jurnal ("JRN-021" -> 21, "INV-2026-006" -> 6). Tanpa angka di ujung -> null (ditaruh paling akhir).
function _nomorJurnalAngka(no) {
  const m = /(\d+)\s*$/.exec(String(no == null ? '' : no));
  return m ? parseInt(m[1], 10) : null;
}

// Urutkan daftar (murni; tidak mengubah daftar asli). Tiap elemen punya `tanggal` dan `no` (jurnal, atau baris tabel
// berbentuk { tanggal, no, html }).
// urut = { awal: 'desc'|'asc', tglAktif: bool, tgl: 'desc'|'asc', no: null|'asc'|'desc', utama: 'tgl'|'no' }
//   awal: urutan masuk bawaan tabel: 'desc' = yang masuk terakhir di atas, 'asc' = yang masuk pertama di atas.
// Seri yang sama (tanggal sama, atau nomor sama) mengikuti urutan masuk searah dengan arah tanggal yang berlaku
// (arah awal bila tanggal belum diklik).
function urutkanJurnalUmum(daftar, urut) {
  const arr = (Array.isArray(daftar) ? daftar : []).map((j, i) => ({ j, i }));
  urut = urut || {};
  const awalDesc = urut.awal !== 'asc';
  const tglOn = !!urut.tglAktif, noOn = urut.no === 'asc' || urut.no === 'desc';
  const tglDesc = tglOn ? urut.tgl !== 'asc' : awalDesc;
  const cmpTgl = (a, b) => {
    const x = String((a.j && a.j.tanggal) || '').slice(0, 10), y = String((b.j && b.j.tanggal) || '').slice(0, 10);
    if (x === y) return 0;
    return (x < y ? -1 : 1) * (tglDesc ? -1 : 1);
  };
  const cmpNo = (a, b) => {
    const x = _nomorJurnalAngka(a.j && a.j.no), y = _nomorJurnalAngka(b.j && b.j.no);
    if (x === y) return 0;
    if (x === null) return 1;                    // tanpa nomor selalu di akhir
    if (y === null) return -1;
    return (x < y ? -1 : 1) * (urut.no === 'desc' ? -1 : 1);
  };
  const kunci = [];
  if (tglOn && noOn) kunci.push(...(urut.utama === 'no' ? [cmpNo, cmpTgl] : [cmpTgl, cmpNo]));
  else if (noOn) kunci.push(cmpNo);
  else if (tglOn) kunci.push(cmpTgl);
  arr.sort((a, b) => {
    for (const k of kunci) { const r = k(a, b); if (r) return r; }
    return tglDesc ? b.i - a.i : a.i - b.i;
  });
  return arr.map(x => x.j);
}

// Tabel yang bisa diurutkan: nama -> { awal (urutan masuk bawaan), render (fungsi gambar ulang) }.
const _TABEL_URUT_JURNAL = {
  umum: { awal: 'desc', render: 'renderJurnalUmum' },
  kas:  { awal: 'desc', render: 'renderJurnalKas' },
  jual: { awal: 'asc',  render: 'renderJurnalPenjualan' },
  beli: { awal: 'asc',  render: 'renderJurnalPembelian' },
  bb:   { awal: 'asc',  render: 'renderBukuBesar' },
};

// State urutan per tabel (per sesi; tidak disimpan).
const _urutJurnal = {};
Object.keys(_TABEL_URUT_JURNAL).forEach(t => { _urutJurnal[t] = { awal: _TABEL_URUT_JURNAL[t].awal, tglAktif: false, tgl: _TABEL_URUT_JURNAL[t].awal, no: null, utama: 'tgl' }; });

// Klik header. tabel: 'umum' | 'kas' | 'jual' | 'beli' | 'bb'; kolom: 'tgl' | 'no'.
function ubahUrutJurnal(tabel, kolom) {
  const u = _urutJurnal[tabel]; if (!u) return;
  if (kolom === 'tgl') {
    u.tgl = (u.tgl === 'desc') ? 'asc' : 'desc';
    u.tglAktif = true;
    u.utama = 'tgl';
  } else if (kolom === 'no') {
    u.no = u.no === null ? 'asc' : (u.no === 'asc' ? 'desc' : null);
    u.utama = u.no ? 'no' : 'tgl';               // nomor dimatikan: tanggal (bila aktif) kembali jadi utama
  } else return;
  const fn = _TABEL_URUT_JURNAL[tabel].render;
  if (typeof globalThis[fn] === 'function') globalThis[fn]();
}

// Urutkan baris tabel ({ tanggal, no, html }) sesuai urutan tabel itu, lalu gabungkan HTML-nya.
// `rows` HARUS dalam urutan masuk (terlama dulu) seperti saat dibuat.
function urutkanBarisJurnal(tabel, rows) {
  return urutkanJurnalUmum(rows, _urutJurnal[tabel]).map(r => r.html).join('');
}

// Panah di header sesuai urutan aktif. Tanggal: ↓ terbaru di atas, ↑ terbaru di bawah. Nomor: ↑ kecil ke besar, ↓ besar ke kecil.
function perbaruiIndikatorUrutJurnal(tabel) {
  const u = _urutJurnal[tabel]; if (!u) return;
  const set = (id, teks, aktif, arah) => {
    const th = document.getElementById(id); if (!th) return;
    const ind = th.querySelector('.sort-ind'); if (ind) ind.textContent = teks;
    th.classList.toggle('sort-aktif', !!aktif);
    th.setAttribute('aria-sort', aktif ? arah : 'none');
  };
  set('urut-' + tabel + '-tgl', u.tglAktif ? (u.tgl === 'desc' ? '↓' : '↑') : '↕', u.tglAktif, u.tgl === 'desc' ? 'descending' : 'ascending');
  set('urut-' + tabel + '-no', u.no ? (u.no === 'asc' ? '↑' : '↓') : '↕', !!u.no, u.no === 'asc' ? 'ascending' : 'descending');
}
