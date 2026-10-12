// ═══════════════════════════════════════════════════════════
// PENOMORAN — pembuat nomor dokumen berurutan per jenis dan per tahun.
//
// Format: <JENIS>-<TAHUN>-<URUTAN min. 3 digit>, contoh INV-2026-001.
// Urutan diambil dari nomor TERBESAR yang pernah dipakai, bukan dari jumlah
// dokumen (length+1). Dua pengaman:
//  1. Nomor terbesar di daftar dokumen yang ada, jadi menghapus dokumen di
//     tengah tidak membuat nomor berikutnya bentrok.
//  2. "Counter" per jenis+tahun (kind `counter` di company_records) yang mencatat
//     nomor tertinggi yang pernah disimpan, jadi menghapus dokumen TERAKHIR
//     tidak membuat nomornya dipakai lagi. Counter hanya naik, tidak pernah turun.
//
// Bagian 1 = fungsi murni (tanpa state/DOM/localStorage), diuji di
// tests/penomoran.test.js. Bagian 2 = pembungkus ke state aplikasi (invoice).
// Counter dinaikkan saat dokumen DISIMPAN, bukan saat form dibuka, supaya form
// yang dibatalkan tidak membuang nomor.
// Dimuat setelah 22-cloud-records.js.
// ═══════════════════════════════════════════════════════════

// ── 1. Fungsi murni ────────────────────────────────────────

// 'inv-2026-007' -> { jenis:'INV', tahun:2026, urut:7 }. Selain format itu -> null.
function parseNomor(no) {
  const m = typeof no === 'string' && no.trim().toUpperCase().match(/^([A-Z0-9]+)-(\d{4})-(\d{1,9})$/);
  return m ? { jenis: m[1], tahun: parseInt(m[2], 10), urut: parseInt(m[3], 10) } : null;
}

// jenis        : awalan dokumen, huruf/angka saja, mis. 'INV', 'BILL', 'PO'
// tahun        : bilangan bulat 4 digit (mis. 2026)
// daftarNomor  : array nomor yang sudah ada (string). Nomor jenis/tahun lain atau format
//                lama diabaikan. null/undefined = kosong.
// counterList  : (opsional) array record counter { id:'INV-2026', terakhir:N }. Dipakai
//                sebagai batas bawah: hasil tidak pernah <= counter.terakhir.
// Mengembalikan string nomor berikutnya. Melempar TypeError kalau jenis/tahun tidak valid.
function nomorBerikut(jenis, tahun, daftarNomor, counterList) {
  if (typeof jenis !== 'string' || !/^[A-Za-z0-9]+$/.test(jenis)) {
    throw new TypeError('nomorBerikut: jenis harus berupa huruf/angka tanpa spasi atau tanda hubung');
  }
  if (!Number.isInteger(tahun) || tahun < 1000 || tahun > 9999) {
    throw new TypeError('nomorBerikut: tahun harus bilangan bulat 4 digit');
  }
  const J = jenis.toUpperCase();
  let maks = 0;
  (Array.isArray(daftarNomor) ? daftarNomor : []).forEach(no => {
    const p = parseNomor(no);
    if (p && p.jenis === J && p.tahun === tahun && p.urut > maks) maks = p.urut;
  });
  const id = J + '-' + tahun;
  (Array.isArray(counterList) ? counterList : []).forEach(r => {
    if (r && r.id === id && Number.isInteger(r.terakhir) && r.terakhir > maks) maks = r.terakhir;
  });
  return id + '-' + String(maks + 1).padStart(3, '0');
}

// Counter setelah `nomor` dipakai. Murni: tidak mengubah counterList.
// Mengembalikan counterList YANG SAMA (referensi sama) bila tidak ada yang perlu naik
// (nomor tidak berformat, atau counter sudah >= urutannya); selain itu array baru.
function counterSetelahPakai(counterList, nomor) {
  const p = parseNomor(nomor);
  if (!p) return counterList;
  const list = Array.isArray(counterList) ? counterList : [];
  const id = p.jenis + '-' + p.tahun;
  const i = list.findIndex(r => r && r.id === id);
  if (i >= 0 && Number.isInteger(list[i].terakhir) && list[i].terakhir >= p.urut) return counterList;
  const rec = { id, jenis: p.jenis, tahun: p.tahun, terakhir: p.urut };
  const hasil = list.slice();
  if (i >= 0) hasil[i] = rec; else hasil.push(rec);
  return hasil;
}

// Memeriksa dan menyelesaikan bentrok nomor invoice kembar (misal akibat transaksi
// offline bersamaan di HP & laptop). Murni: tidak mengubah input asli.
// Mengembalikan { invoices, bentrok, counterList }
function selesaikanBentrokNomorInvoice(invoices, counters) {
  if (!Array.isArray(invoices) || invoices.length <= 1) {
    return { invoices: Array.isArray(invoices) ? invoices : [], bentrok: [], counterList: Array.isArray(counters) ? counters : [] };
  }
  // Kelompokkan invoice berdasarkan nomor (hanya nomor valid yang punya format)
  const byNo = new Map();
  invoices.forEach(inv => {
    const no = (inv && inv.noInvoice && String(inv.noInvoice).trim().toUpperCase()) || '';
    if (!no) return;
    if (!byNo.has(no)) byNo.set(no, []);
    byNo.get(no).push(inv);
  });

  let adaBentrok = false;
  byNo.forEach(list => { if (list.length > 1) adaBentrok = true; });
  if (!adaBentrok) {
    return { invoices, bentrok: [], counterList: Array.isArray(counters) ? counters : [] };
  }

  let curCounters = Array.isArray(counters) ? counters.slice() : [];
  const hasilInvoices = invoices.map(inv => ({ ...inv }));

  const semuaNomor = new Set(
    hasilInvoices.map(i => i && i.noInvoice && String(i.noInvoice).trim().toUpperCase()).filter(Boolean)
  );

  const daftarBentrok = [];

  byNo.forEach((list, no) => {
    if (list.length <= 1) return;
    const p = parseNomor(no);
    if (!p) return; // format bebas tidak disentuh otomatis

    // Dokumen diurutkan: yang dibuat lebih awal (createdAt) atau id terkecil tetap memakai nomor aslinya.
    const sorted = list.slice().sort((a, b) => {
      const ta = (a && a.createdAt) || '', tb = (b && b.createdAt) || '';
      if (ta !== tb) return ta < tb ? -1 : 1;
      const ida = (a && a.id) || '', idb = (b && b.id) || '';
      return ida < idb ? -1 : 1;
    });

    for (let k = 1; k < sorted.length; k++) {
      const targetInv = sorted[k];
      const targetId = targetInv.id;
      const targetIdx = hasilInvoices.findIndex(i => i.id === targetId);
      if (targetIdx < 0) continue;

      const noBaru = nomorBerikut(p.jenis, p.tahun, Array.from(semuaNomor), curCounters);
      semuaNomor.add(noBaru);
      curCounters = counterSetelahPakai(curCounters, noBaru);

      daftarBentrok.push({
        id: targetId,
        noLama: targetInv.noInvoice,
        noBaru,
        pelanggan: targetInv.pelanggan || '-'
      });

      hasilInvoices[targetIdx].noInvoice = noBaru;
    }
  });

  return {
    invoices: hasilInvoices,
    bentrok: daftarBentrok,
    counterList: curCounters
  };
}

// ── 2. Pemasangan ke state aplikasi ────────────────────────

// State counter. Bisnis login: dimuat/disimpan lewat cloud-records (kind `counter`).
// Mode tamu: key localStorage `oas_counter`.
let counterList = (() => {
  try { const a = JSON.parse(localStorage.getItem('oas_counter') || '[]'); return Array.isArray(a) ? a : []; }
  catch (e) { return []; }
})();

// Nomor invoice berikutnya untuk tahun tertentu (default: tahun ini).
function nomorInvoiceBerikut(tahun) {
  const y = Number.isInteger(tahun) ? tahun : new Date().getFullYear();
  return nomorBerikut('INV', y, invoiceList.map(i => i && i.noInvoice), counterList);
}

// Panggil SETELAH invoice disimpan. Menaikkan counter bila nomornya lebih tinggi.
// Nomor yang diketik manual dengan format lain diabaikan. Mengembalikan true bila counter naik.
function catatNomorInvoice(nomor) {
  const baru = counterSetelahPakai(counterList, nomor);
  if (baru === counterList) return false;
  counterList = baru;
  if (typeof currentCompany !== 'undefined' && currentCompany && typeof cloudSyncRecords === 'function') {
    cloudSyncRecords(['counter']);
  } else {
    try { localStorage.setItem('oas_counter', JSON.stringify(counterList)); } catch (e) {}
  }
  return true;
}

// Periksa dan atasi bentrok invoice di state aplikasi, lalu perbarui jurnal & cloud.
async function periksaDanSelesaikanBentrokInvoice() {
  if (typeof invoiceList === 'undefined' || !Array.isArray(invoiceList) || invoiceList.length <= 1) return [];
  const res = selesaikanBentrokNomorInvoice(invoiceList, counterList);
  if (!res.bentrok || !res.bentrok.length) return [];

  invoiceList = res.invoices;
  counterList = res.counterList;

  // Sesuaikan nomor invoice pada jurnal terkait (jika ada)
  let jurnalBerubah = false;
  if (typeof jurnalEntries !== 'undefined' && Array.isArray(jurnalEntries)) {
    res.bentrok.forEach(b => {
      jurnalEntries.forEach(j => {
        if (!j) return;
        const ketStr = j.ket || j.keterangan || '';
        const matchPel = !b.pelanggan || b.pelanggan === '-' || ketStr.includes(b.pelanggan);
        if (matchPel && ketStr.includes(b.noLama)) {
          if (j.ket) j.ket = j.ket.split(b.noLama).join(b.noBaru);
          if (j.keterangan) j.keterangan = j.keterangan.split(b.noLama).join(b.noBaru);
          jurnalBerubah = true;
        }
      });
    });
  }

  // Simpan hasil ke cloud atau localStorage
  if (typeof currentCompany !== 'undefined' && currentCompany && typeof cloudSyncRecords === 'function') {
    await cloudSyncRecords(['invoice', 'counter']);
    if (jurnalBerubah && typeof saveToStorage === 'function') {
      saveToStorage(false);
    }
  } else {
    try {
      localStorage.setItem('oas_invoices', JSON.stringify(invoiceList));
      localStorage.setItem('oas_counter', JSON.stringify(counterList));
    } catch (e) {}
  }

  const rincian = res.bentrok.map(b =>
    `Invoice "${escapeHtml(b.pelanggan)}" disesuaikan: <b>${escapeHtml(b.noLama)}</b> ➔ <b>${escapeHtml(b.noBaru)}</b>`
  ).join('<br>');
  if (typeof showAlert === 'function') {
    showAlert(`⚠️ Terdeteksi ${res.bentrok.length} nomor invoice kembar saat offline:<br>${rincian}`);
  }

  if (typeof renderInvoiceList === 'function') renderInvoiceList();
  if (typeof renderInvoiceKPI === 'function') renderInvoiceKPI();
  return res.bentrok;
}
