// ═══════════════════════════════════════════════════════════
// UMUR PIUTANG/HUTANG (aging) — fungsi murni, tanpa state/DOM/localStorage.
// Diuji di tests/aging.test.js. Dipakai Umur Piutang (Fase 2) dan Umur Hutang (4.7).
//
// Umur dihitung dari JATUH TEMPO sampai tanggal acuan (hari lewat jatuh tempo):
//   umur <= 0   -> lancar  (belum jatuh tempo / jatuh tempo hari ini)
//   1  - 30     -> b0_30
//   31 - 60     -> b31_60
//   61 - 90     -> b61_90
//   > 90        -> b90plus
// Dokumen yang dihitung: sisaTagihan > 0 dan status bukan 'lunas'/'draft'.
// Jatuh tempo kosong/tidak valid -> memakai `tanggal`; kalau itu juga tidak valid,
// dokumen dikeluarkan dari hitungan dan dilaporkan di `tidakValid`.
// Dimuat setelah 23-penomoran.js.
// ═══════════════════════════════════════════════════════════

const AGING_BUCKETS = ['lancar', 'b0_30', 'b31_60', 'b61_90', 'b90plus'];

// 'YYYY-MM-DD' (atau ISO datetime) -> hari sejak epoch (UTC, bebas DST). Tidak valid -> null.
function _agingHari(s) {
  const m = typeof s === 'string' && s.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const y = +m[1], mo = +m[2], d = +m[3];
  const t = Date.UTC(y, mo - 1, d);
  const dt = new Date(t);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  return Math.round(t / 86400000);
}

// umur (hari lewat jatuh tempo) -> nama bucket
function bucketAging(umur) {
  if (umur <= 0) return 'lancar';
  if (umur <= 30) return 'b0_30';
  if (umur <= 60) return 'b31_60';
  if (umur <= 90) return 'b61_90';
  return 'b90plus';
}

function _agingKosong() { return { lancar: 0, b0_30: 0, b31_60: 0, b61_90: 0, b90plus: 0, total: 0 }; }

// daftar       : array invoice/bill { pelanggan|supplier|kontak, jatuhTempo, tanggal, sisaTagihan, status, noInvoice|noBill|no }
// tanggalAcuan : 'YYYY-MM-DD' (wajib; TypeError kalau tidak valid)
// Mengembalikan:
//   { tanggalAcuan,
//     perKontak: [{ kontak, lancar, b0_30, b31_60, b61_90, b90plus, total, dokumen:[{no,jatuhTempo,sisa,umur,bucket}] }]  (urut nama kontak),
//     total: { lancar, b0_30, b31_60, b61_90, b90plus, total },
//     tidakValid: [dokumen asli] }
function hitungAging(daftar, tanggalAcuan) {
  const acuan = _agingHari(tanggalAcuan);
  if (acuan === null) throw new TypeError('hitungAging: tanggalAcuan harus berformat YYYY-MM-DD');
  const peta = new Map();
  const total = _agingKosong();
  const tidakValid = [];
  (Array.isArray(daftar) ? daftar : []).forEach(d => {
    if (!d || typeof d !== 'object') return;
    if (d.status === 'lunas' || d.status === 'draft') return;
    const sisa = Number(d.sisaTagihan);
    if (!(sisa > 0)) return;
    let jt = _agingHari(d.jatuhTempo);
    if (jt === null) jt = _agingHari(d.tanggal);
    if (jt === null) { tidakValid.push(d); return; }
    const umur = acuan - jt;
    const b = bucketAging(umur);
    const nama = String(d.pelanggan || d.supplier || d.kontak || '').trim() || '(Tanpa nama)';
    let k = peta.get(nama);
    if (!k) { k = Object.assign({ kontak: nama }, _agingKosong(), { dokumen: [] }); peta.set(nama, k); }
    k[b] += sisa; k.total += sisa;
    total[b] += sisa; total.total += sisa;
    k.dokumen.push({ no: d.noInvoice || d.noBill || d.no || '', jatuhTempo: d.jatuhTempo || d.tanggal, sisa, umur, bucket: b });
  });
  const perKontak = [...peta.values()].sort((a, b) => a.kontak.localeCompare(b.kontak, 'id'));
  return { tanggalAcuan, perKontak, total, tidakValid };
}
