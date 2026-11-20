// ═══════════════════════════════════════════════════════════
// PESANAN PENJUALAN → INVOICE — fungsi murni (task 7.4, Roadmap.md)
//
// pesananKeInvoice(pesanan, opsi) menyusun objek invoice (bentuk docs/SCHEMA.md §4.5, sama dengan yang dibuat
// simpanInvoice di 11-kontak-invoice.js) dari pesanan penjualan `dikonfirmasi`. BELUM DIPASANG ke UI, alur simpan, jurnal,
// maupun status pesanan: task 7.5 yang memanggilnya dari tombol \"Buat faktur\" di halaman pesanan, menyimpan hasilnya,
// dan menandai pesanan terpenuhi. Tes menjaga batas itu (tests/pesanan-invoice.test.js).
//
//   pesananKeInvoice(pesanan, opsi)   { ok:true, invoice } atau { ok:false, pesan }   (murni; tanpa DOM/state/jam)
//   opsi : { id, noInvoice, tanggal 'YYYY-MM-DD', createdAt, akunPiutang, akunPend,
//            jatuhTempo? (default tanggal + 30 hari, seperti form invoice), daftarInvoice? (cek id/nomor kembar) }
// Invoice hasil berstatus `draft` (belum ada jurnal; jurnal piutang dibuat saat dikirim lewat kirimInvoice), dengan item
// disalin (nama, qty, harga), subtotal/ppn/total memakai hitungPpn (02-utils.js, pembulatan sama dengan form invoice), dan
// penaut ke pesanan asal lewat field opsional `refJenis: 'pesanan_jual'`, `refId`, `refNo` (nama sama dengan di model dok;
// SCHEMA.md §4.5 ditambah saat 7.5 memasangnya). Dimuat setelah 38-pesanan-jual-ui.js.
// ═══════════════════════════════════════════════════════════

function _pinvTanggalValid(t) {
  if (typeof t !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const d = new Date(t + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === t;
}

function pesananKeInvoice(pesanan, opsi) {
  const gagal = pesan => ({ ok: false, pesan });
  opsi = opsi || {};
  const teks = v => (typeof v === 'string' ? v.trim() : '');
  if (!pesanan || typeof pesanan !== 'object' || pesanan.jenis !== 'pesanan_jual') return gagal('Pesanan penjualan tidak ditemukan.');
  if (pesanan.status !== 'dikonfirmasi') {
    return gagal(pesanan.status === 'sebagian'
      ? 'Pesanan ' + pesanan.no + ' sudah sebagian difakturkan; faktur sisa menunggu pencatatan qty terkirim.'
      : 'Hanya pesanan berstatus dikonfirmasi yang bisa difakturkan (pesanan ' + pesanan.no + ' berstatus ' + pesanan.status + ').');
  }
  const id = teks(opsi.id), noInvoice = teks(opsi.noInvoice).toUpperCase();
  if (!id) return gagal('ID invoice kosong.');
  if (!noInvoice) return gagal('Nomor invoice kosong.');
  const ada = Array.isArray(opsi.daftarInvoice) ? opsi.daftarInvoice.filter(i => i && typeof i === 'object') : [];
  if (ada.some(i => i.id === id)) return gagal('ID invoice sudah dipakai.');
  if (ada.some(i => String(i.noInvoice || '').trim().toUpperCase() === noInvoice)) return gagal('Nomor invoice ' + noInvoice + ' sudah dipakai.');
  const tanggal = teks(opsi.tanggal);
  if (!_pinvTanggalValid(tanggal)) return gagal('Tanggal invoice tidak valid.');
  let jatuhTempo = teks(opsi.jatuhTempo);
  if (jatuhTempo) {
    if (!_pinvTanggalValid(jatuhTempo)) return gagal('Tanggal jatuh tempo tidak valid.');
    if (jatuhTempo < tanggal) return gagal('Jatuh tempo tidak boleh sebelum tanggal invoice.');
  } else {
    const d = new Date(tanggal + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 30);
    jatuhTempo = d.toISOString().slice(0, 10);
  }
  const akunPiutang = teks(opsi.akunPiutang), akunPend = teks(opsi.akunPend);
  if (!akunPiutang || !akunPend) return gagal('Akun piutang dan akun pendapatan wajib diisi supaya invoice bisa dijurnal.');
  const createdAt = teks(opsi.createdAt);
  if (!createdAt) return gagal('Waktu pembuatan invoice kosong.');
  const pelanggan = teks(pesanan.kontak);
  if (!pelanggan) return gagal('Pesanan tidak punya nama pelanggan.');

  const items = [];
  for (const it of (Array.isArray(pesanan.items) ? pesanan.items : [])) {
    if (!it || typeof it !== 'object') continue;
    const nama = teks(it.nama);
    const qty = typeof it.qty === 'number' && isFinite(it.qty) ? it.qty : 0;
    const harga = typeof it.harga === 'number' && isFinite(it.harga) ? it.harga : 0;
    if (!nama || qty <= 0 || harga < 0) return gagal('Item pesanan ' + pesanan.no + ' tidak valid' + (nama ? ': ' + nama : '') + '.');
    items.push({ nama, qty, harga });
  }
  if (!items.length) return gagal('Pesanan tidak punya item.');
  const subtotal = Math.round(items.reduce((s, it) => s + it.qty * it.harga, 0) * 100) / 100;
  if (!(subtotal > 0)) return gagal('Total pesanan ' + pesanan.no + ' Rp 0. Isi harga item dulu sebelum difakturkan.');
  const tarif = typeof pesanan.ppnTarif === 'number' && isFinite(pesanan.ppnTarif) && pesanan.ppnTarif > 0 ? pesanan.ppnTarif : 0;
  const ppn = tarif ? hitungPpn(subtotal, tarif) : 0;
  const total = subtotal + ppn;

  const invoice = {
    id, noInvoice, pelanggan, tanggal, jatuhTempo,
    deskripsi: teks(pesanan.catatan) || ('Pesanan ' + pesanan.no),
    items, subtotal, ppn, ppnTarif: tarif, total, sisaTagihan: total, status: 'draft',
    akunPiutang, akunPend, createdAt,
    refJenis: 'pesanan_jual', refId: pesanan.id, refNo: pesanan.no
  };
  return { ok: true, invoice };
}
