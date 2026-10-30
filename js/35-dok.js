// ═══════════════════════════════════════════════════════════
// MODEL DOKUMEN GENERIK (task 6.3, Roadmap.md)
//
// Satu bentuk record untuk semua dokumen alur dagang di luar invoice/bill: penawaran, pesanan penjualan,
// surat jalan, pesanan pembelian, penerimaan barang, retur penjualan, retur pembelian. Fase 7-10 memakai model
// ini, jadi tiap fase cukup menambah form dan pemasangan, bukan model baru. Bentuk record: docs/SCHEMA.md §4.5d.
// State dokList disinkron lewat cloud-records (kind `dok`, 22-cloud-records.js). Belum ada UI dan belum ada key
// mode tamu; keduanya menyusul di 7.1-7.2 bersama form.
//
// Isi file: tabel jenis (awalan nomor, nama, alur status), dan fungsi murni (tanpa DOM, state, localStorage):
//   dokStatusBerikut(jenis, status)        status yang boleh dituju dari status sekarang
//   transisiDok(dok, statusBaru, opsi)     dokumen baru dengan status berpindah, atau { ok:false, pesan }
//   nomorDokBerikut(jenis, tahun, daftar, counterList)   nomor berikutnya (23-penomoran.js)
//   susunDok(f, daftar)                    validasi isi form lalu susun record (status awal selalu 'draft')
//   totalDok(dok)                          Σ qty × harga item, dibulatkan ke sen
// Diuji di tests/dok.test.js. Dimuat setelah 34-kartu-kontak.js.
//
// Yang SENGAJA belum diputuskan di sini (tiap task Fase 7-10 memutuskan untuk jenisnya sendiri):
// efek ke stok dan jurnal, qty terpenuhi/terkirim per item (7.6), dan jenis dokumen mana boleh menunjuk jenis mana
// lewat ref asal (di sini ref hanya diperiksa bentuknya, lihat susunDok).
// ═══════════════════════════════════════════════════════════

let dokList = [];

// Awalan nomor (huruf/angka saja, syarat nomorBerikut), label, dan alur status. `transisi` memetakan status ->
// status tujuan yang diizinkan; status tanpa tujuan (kosong) adalah status akhir. Dokumen baru selalu 'draft'.
const DOK_JENIS = {
  penawaran:    { awalan: 'QUO', label: 'Penawaran',          transisi: { draft: ['terkirim', 'batal'], terkirim: ['disetujui', 'ditolak', 'batal'], disetujui: ['selesai', 'batal'], ditolak: [], selesai: [], batal: [] } },
  pesanan_jual: { awalan: 'SO',  label: 'Pesanan Penjualan',  transisi: { draft: ['dikonfirmasi', 'batal'], dikonfirmasi: ['sebagian', 'selesai', 'batal'], sebagian: ['selesai', 'batal'], selesai: [], batal: [] } },
  surat_jalan:  { awalan: 'SJ',  label: 'Surat Jalan',        transisi: { draft: ['dikirim', 'batal'], dikirim: ['selesai'], selesai: [], batal: [] } },
  pesanan_beli: { awalan: 'PO',  label: 'Pesanan Pembelian',  transisi: { draft: ['dipesan', 'batal'], dipesan: ['sebagian', 'selesai', 'batal'], sebagian: ['selesai', 'batal'], selesai: [], batal: [] } },
  penerimaan:   { awalan: 'GRN', label: 'Penerimaan Barang',  transisi: { draft: ['diterima', 'batal'], diterima: [], batal: [] } },
  retur_jual:   { awalan: 'RJ',  label: 'Retur Penjualan',    transisi: { draft: ['diproses', 'batal'], diproses: ['selesai'], selesai: [], batal: [] } },
  retur_beli:   { awalan: 'RB',  label: 'Retur Pembelian',    transisi: { draft: ['diproses', 'batal'], diproses: ['selesai'], selesai: [], batal: [] } }
};

// Jenis dokumen yang boleh jadi ref asal: dokumen model ini, atau invoice/bill (record lama, bukan di dokList).
const DOK_REF_LAIN = ['invoice', 'bill'];

function _dokBulat(n) { return Math.round(n * 100) / 100; }

// Status tujuan yang boleh dari `status` untuk `jenis`. Jenis atau status tidak dikenal -> [].
function dokStatusBerikut(jenis, status) {
  const J = DOK_JENIS[jenis];
  return (J && Array.isArray(J.transisi[status])) ? J.transisi[status].slice() : [];
}

// Pindahkan status dokumen (murni: dok asli tidak diubah). Hasil: { ok:true, dok } dengan `status` baru dan satu entri
// ditambahkan ke `riwayat` { dari, ke, waktu? }, atau { ok:false, pesan }.
// opsi.waktu : teks waktu (mis. ISO) untuk riwayat; kosong = entri tanpa waktu (fungsi murni tidak membaca jam).
function transisiDok(dok, statusBaru, opsi) {
  const gagal = pesan => ({ ok: false, pesan });
  if (!dok || typeof dok !== 'object') return gagal('Dokumen tidak ditemukan.');
  const J = DOK_JENIS[dok.jenis];
  if (!J) return gagal('Jenis dokumen tidak dikenal.');
  if (!Array.isArray(J.transisi[dok.status])) return gagal('Status dokumen tidak dikenal: ' + dok.status + '.');
  const boleh = J.transisi[dok.status];
  if (!boleh.includes(statusBaru)) {
    return gagal(boleh.length
      ? J.label + ' berstatus ' + dok.status + ' hanya bisa menjadi: ' + boleh.join(', ') + '.'
      : J.label + ' berstatus ' + dok.status + ' sudah final dan tidak bisa diubah lagi.');
  }
  const waktu = opsi && typeof opsi.waktu === 'string' ? opsi.waktu.trim() : '';
  const entri = { dari: dok.status, ke: statusBaru };
  if (waktu) entri.waktu = waktu;
  return { ok: true, dok: Object.assign({}, dok, { status: statusBaru, riwayat: (Array.isArray(dok.riwayat) ? dok.riwayat : []).concat([entri]) }) };
}

// Nomor berikutnya untuk satu jenis, mis. SO-2026-001. daftar = dokList; counterList = counter penomoran (boleh kosong).
// Awalan tiap jenis berbeda, jadi nomor jenis lain di daftar tidak ikut terhitung (parseNomor memeriksa awalan).
function nomorDokBerikut(jenis, tahun, daftar, counterList) {
  const J = DOK_JENIS[jenis];
  if (!J) throw new TypeError('nomorDokBerikut: jenis dokumen tidak dikenal');
  return nomorBerikut(J.awalan, tahun, (Array.isArray(daftar) ? daftar : []).map(d => d && d.no), counterList);
}

// Total dokumen: Σ qty × harga (harga kosong = 0), dibulatkan ke sen. dok tanpa items -> 0.
function totalDok(dok) {
  const items = dok && Array.isArray(dok.items) ? dok.items : [];
  return _dokBulat(items.reduce((s, it) => {
    const q = it && typeof it.qty === 'number' && isFinite(it.qty) && it.qty > 0 ? it.qty : 0;
    const h = it && typeof it.harga === 'number' && isFinite(it.harga) && it.harga > 0 ? it.harga : 0;
    return s + q * h;
  }, 0));
}

// Validasi isi form lalu susun record dokumen baru (murni).
// f      : { id, jenis, no, tanggal 'YYYY-MM-DD', kontak, items:[{ nama, qty, harga?, satuan? }], catatan?,
//            refJenis?, refId?, refNo?, createdAt }
// daftar : dokList yang sudah ada (cek nomor/id kembar dan ref)
// Aturan: jenis dikenal; nomor terisi dan unik dalam jenis yang sama (tanpa beda huruf besar/kecil); id terisi dan unik;
// tanggal valid; kontak terisi; minimal 1 item bernama dengan qty > 0 (baris kosong dibuang, harga < 0 ditolak);
// ref asal opsional tetapi harus lengkap (refJenis + refId), tidak menunjuk dirinya sendiri, dan bila menunjuk dokumen
// model ini, dokumen itu harus ada di daftar. Status awal selalu 'draft'.
// Mengembalikan { ok:true, dok } atau { ok:false, pesan }.
function susunDok(f, daftar) {
  const gagal = pesan => ({ ok: false, pesan });
  f = f || {};
  const teks = v => (typeof v === 'string' ? v.trim() : '');
  const J = DOK_JENIS[f.jenis];
  if (!J) return gagal('Jenis dokumen tidak dikenal.');
  const ada = Array.isArray(daftar) ? daftar.filter(d => d && typeof d === 'object') : [];

  const id = teks(f.id);
  if (!id) return gagal('ID dokumen kosong.');
  if (ada.some(d => d.id === id)) return gagal('ID dokumen sudah dipakai.');
  const no = teks(f.no).toUpperCase();
  if (!no) return gagal('Isi nomor ' + J.label.toLowerCase() + '.');
  if (ada.some(d => d.jenis === f.jenis && String(d.no || '').trim().toUpperCase() === no)) return gagal('Nomor ' + no + ' sudah dipakai. Ganti nomornya.');
  const tanggal = teks(f.tanggal);
  const d0 = /^\d{4}-\d{2}-\d{2}$/.test(tanggal) ? new Date(tanggal + 'T00:00:00Z') : null;
  if (!d0 || isNaN(d0.getTime()) || d0.toISOString().slice(0, 10) !== tanggal) return gagal('Isi tanggal ' + J.label.toLowerCase() + ' yang valid.');
  const kontak = teks(f.kontak);
  if (!kontak) return gagal('Isi nama kontak.');
  const createdAt = teks(f.createdAt);
  if (!createdAt) return gagal('Waktu pembuatan dokumen kosong.');

  const items = [];
  for (const it of (Array.isArray(f.items) ? f.items : [])) {
    if (!it || typeof it !== 'object') continue;
    const nama = teks(it.nama);
    const qty = typeof it.qty === 'number' && isFinite(it.qty) ? it.qty : 0;
    if (!nama && qty <= 0) continue; // baris kosong
    if (!nama) return gagal('Isi nama item.');
    if (qty <= 0) return gagal('Jumlah item "' + nama + '" harus lebih dari 0.');
    const harga = it.harga === undefined || it.harga === null || it.harga === '' ? 0 : it.harga;
    if (typeof harga !== 'number' || !isFinite(harga) || harga < 0) return gagal('Harga item "' + nama + '" tidak valid.');
    const baris = { nama, qty, harga };
    const satuan = teks(it.satuan);
    if (satuan) baris.satuan = satuan;
    items.push(baris);
  }
  if (!items.length) return gagal('Isi minimal 1 item dengan jumlah lebih dari 0.');

  const refJenis = teks(f.refJenis), refId = teks(f.refId), refNo = teks(f.refNo);
  if (refJenis || refId) {
    if (!refJenis || !refId) return gagal('Ref asal harus berisi jenis dan id.');
    if (!DOK_JENIS[refJenis] && !DOK_REF_LAIN.includes(refJenis)) return gagal('Jenis ref asal tidak dikenal.');
    if (refJenis === f.jenis && refId === id) return gagal('Dokumen tidak boleh menunjuk dirinya sendiri.');
    if (DOK_JENIS[refJenis] && !ada.some(d => d.jenis === refJenis && d.id === refId)) return gagal('Dokumen asal tidak ditemukan.');
  }

  const dok = { id, jenis: f.jenis, no, tanggal, kontak, status: 'draft', items };
  const catatan = teks(f.catatan);
  if (catatan) dok.catatan = catatan;
  if (refJenis && refId) { dok.refJenis = refJenis; dok.refId = refId; if (refNo) dok.refNo = refNo; }
  dok.createdAt = createdAt;
  return { ok: true, dok };
}
