// ═══════════════════════════════════════════════════════════
// PENAWARAN → PESANAN PENJUALAN (task 7.3, Roadmap.md)
//
// Penawaran berstatus `disetujui` dibuatkan pesanan penjualan (jenis `pesanan_jual`, model 35-dok.js): item, kontak,
// PPN, dan catatan disalin, ref asal ditautkan (refJenis 'penawaran', refId, refNo), lalu penawaran otomatis menjadi
// `selesai` lewat transisiDok (status yang sengaja tidak punya tombol manual, lihat 7.2b). Pesanan baru berstatus draft.
// Pesanan tidak menjurnal dan tidak menyentuh stok. Belum ada halaman/daftar pesanan (dikerjakan bersama 7.5);
// nomor pesanan ditampilkan di daftar penawaran.
//
// Fungsi murni (tanpa DOM/state), diuji di tests/pesanan-jual.test.js:
//   pesananDariPenawaran(penawaran, daftar, opsi)   { ok, pesanan, penawaran } atau { ok:false, pesan }
//   pesananDariRef(daftar, penawaranId)             pesanan penjualan yang menunjuk penawaran itu (atau null)
// Efek samping: buatPesananDariPenawaran(id) — satu kali simpan untuk pesanan baru + penawaran selesai + counter.
// Dimuat setelah 36-penawaran-ui.js.
// ═══════════════════════════════════════════════════════════

// Pesanan penjualan pertama yang menunjuk penawaran `penawaranId` (pesanan batal tidak dihitung), atau null.
function pesananDariRef(daftar, penawaranId) {
  const d = (Array.isArray(daftar) ? daftar : []).find(x => x && x.jenis === 'pesanan_jual' && x.refJenis === 'penawaran'
    && x.refId === penawaranId && x.status !== 'batal');
  return d || null;
}

// Susun pesanan penjualan dari penawaran (murni: penawaran dan daftar tidak diubah).
// opsi : { id, tanggal 'YYYY-MM-DD', createdAt, waktu?, counterList? }  (id/tanggal/waktu dari pemanggil; fungsi murni tidak membaca jam)
// Aturan: penawaran harus ada, berjenis penawaran, berstatus `disetujui`, dan belum punya pesanan aktif. Nomor memakai
// nomorDokBerikut('pesanan_jual') dengan tahun tanggal pesanan. Item disalin dalam (mengubah pesanan tidak mengubah penawaran).
// Hasil: { ok:true, pesanan, penawaran } — penawaran = versi baru berstatus `selesai` (dengan riwayat), atau { ok:false, pesan }.
function pesananDariPenawaran(penawaran, daftar, opsi) {
  const gagal = pesan => ({ ok: false, pesan });
  opsi = opsi || {};
  if (!penawaran || typeof penawaran !== 'object' || penawaran.jenis !== 'penawaran') return gagal('Penawaran tidak ditemukan.');
  const ada = Array.isArray(daftar) ? daftar : [];
  if (penawaran.status !== 'disetujui') {
    return gagal('Hanya penawaran berstatus disetujui yang bisa dibuatkan pesanan (penawaran ' + penawaran.no + ' berstatus ' + penawaran.status + ').');
  }
  const sudah = pesananDariRef(ada, penawaran.id);
  if (sudah) return gagal('Penawaran ' + penawaran.no + ' sudah dibuatkan pesanan ' + sudah.no + '.');
  const tanggal = typeof opsi.tanggal === 'string' ? opsi.tanggal : '';
  const tahun = parseInt(tanggal.slice(0, 4), 10);
  if (!Number.isInteger(tahun)) return gagal('Tanggal pesanan tidak valid.');

  const no = nomorDokBerikut('pesanan_jual', tahun, ada, opsi.counterList);
  const r = susunDok({
    id: opsi.id, jenis: 'pesanan_jual', no, tanggal, kontak: penawaran.kontak,
    items: (penawaran.items || []).map(it => ({ nama: it.nama, qty: it.qty, harga: it.harga, satuan: it.satuan })),
    catatan: penawaran.catatan, ppnTarif: penawaran.ppnTarif,
    refJenis: 'penawaran', refId: penawaran.id, refNo: penawaran.no, createdAt: opsi.createdAt
  }, ada);
  if (!r.ok) return gagal(r.pesan);
  const t = transisiDok(penawaran, 'selesai', { waktu: opsi.waktu });
  if (!t.ok) return gagal(t.pesan);
  return { ok: true, pesanan: r.dok, penawaran: t.dok };
}

// Buat pesanan dari penawaran `id` di state dokList. Satu kali simpan (pesanan + penawaran selesai + counter),
// jadi keduanya tidak berpisah di tengah jalan. Mengembalikan hasil pesananDariPenawaran.
function buatPesananDariPenawaran(id) {
  if (typeof guardHanyaBaca === 'function' && guardHanyaBaca('Pesanan Penjualan')) return { ok: false, pesan: 'Mode baca.' };
  const p = dokList.find(x => x && x.id === id && x.jenis === 'penawaran');
  const now = new Date();
  const r = pesananDariPenawaran(p, dokList, {
    id: idDokBaru(dokList, now.getTime()), tanggal: now.toISOString().split('T')[0],
    createdAt: now.toISOString(), waktu: now.toISOString(), counterList: typeof counterList !== 'undefined' ? counterList : []
  });
  if (!r.ok) return r;
  dokList = dokList.map(d => (d && d.id === id ? r.penawaran : d));
  dokList.unshift(r.pesanan);
  if (typeof counterSetelahPakai === 'function') counterList = counterSetelahPakai(counterList, r.pesanan.no);
  simpanDokState();
  return r;
}

// ── Pemasangan ke daftar penawaran (dipanggil dari 36-penawaran-ui.js) ──

function _pnwNoPesanan(d) {
  const p = typeof pesananDariRef === 'function' ? pesananDariRef(dokList, d.id) : null;
  return p ? `<div style="font-size:11px;color:var(--muted);margin-top:2px;">→ ${escapeHtml(p.no)}</div>` : '';
}

function buatPesananPenawaran(id) {
  const d = dokList.find(x => x && x.id === id && x.jenis === 'penawaran'); if (!d) return;
  if (!confirm('Buat pesanan penjualan dari penawaran ' + d.no + ' (' + d.kontak + ')? Penawaran akan berstatus selesai.')) return;
  const r = buatPesananDariPenawaran(id);
  if (!r.ok) { _pnwAlertPeringatan(r.pesan); return; }
  renderPenawaranList();
  showAlert('✓ Pesanan penjualan ' + escapeHtml(r.pesanan.no) + ' dibuat dari penawaran ' + escapeHtml(d.no) + ' (draft).');
}

// Tombol "Buat Pesanan" untuk penawaran disetujui (string HTML kosong untuk status lain).
function _pnwTombolPesanan(d) {
  return d && d.status === 'disetujui'
    ? `<button class="btn btn-sm btn-primary" style="margin-right:4px;" onclick="buatPesananPenawaran('${escapeForJsAttr(d.id)}')">Buat Pesanan</button>` : '';
}
