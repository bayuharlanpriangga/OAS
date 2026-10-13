// Daftar bisnis: gabungan bisnis milik sendiri + bisnis tempat user menjadi anggota (task 3.3).
// Fungsi murni, tanpa akses DOM/Supabase, supaya bisa dites di Node (tests/daftar-bisnis.test.js).

const PERAN_BISNIS_LABEL = { owner: 'Pemilik', admin: 'Admin', member: 'Member', viewer: 'Viewer' };

/** Label peran untuk ditampilkan; peran tak dikenal jatuh ke hak terkecil (Viewer). */
function labelPeranBisnis(role) {
  return PERAN_BISNIS_LABEL[role] || PERAN_BISNIS_LABEL.viewer;
}

/** True bila user adalah pemilik bisnis ini (dipakai untuk membatasi hapus bisnis). */
function adalahPemilikBisnis(company, userId) {
  if (!company || !userId) return false;
  return company._role === 'owner' || company.user_id === userId;
}

/**
 * Susun daftar bisnis untuk layar pilih bisnis.
 * owned           : baris companies milik user (companies.user_id = user)
 * memberships     : baris org_members milik user ({company_id, role, status})
 * memberCompanies : baris companies yang terbaca lewat keanggotaan
 * Hanya keanggotaan berstatus 'active' yang dihitung (pending belum punya akses).
 * Tiap hasil diberi _role: 'owner' | 'admin' | 'member' | 'viewer'. Pemilik menang bila ada duplikat.
 */
function susunDaftarBisnis(owned, memberships, memberCompanies, userId) {
  const hasil = [];
  const sudah = new Set();
  (Array.isArray(owned) ? owned : []).forEach(c => {
    if (!c || sudah.has(c.id)) return;
    sudah.add(c.id);
    hasil.push({ ...c, _role: 'owner' });
  });
  const peranPerBisnis = new Map();
  (Array.isArray(memberships) ? memberships : []).forEach(m => {
    if (m && m.status === 'active') peranPerBisnis.set(m.company_id, m.role || 'viewer');
  });
  (Array.isArray(memberCompanies) ? memberCompanies : []).forEach(c => {
    if (!c || sudah.has(c.id) || c.user_id === userId) return;
    if (!peranPerBisnis.has(c.id)) return;
    sudah.add(c.id);
    hasil.push({ ...c, _role: peranPerBisnis.get(c.id) });
  });
  return hasil;
}

/**
 * Ringkas balikan rpc gabung(kode) menjadi pesan untuk user.
 * res: {company_id, nama, peran, hasil}; hasil = 'bergabung' | 'diaktifkan' | 'sudah_anggota'.
 * Return {berhasil, pesan}: berhasil=true bila user baru masuk/aktif (daftar bisnis perlu dimuat ulang).
 */
function ringkasHasilGabung(res) {
  const r = res || {};
  const esc = typeof escapeHtml === 'function' ? escapeHtml : (x => String(x));
  const nama = esc(r.nama || 'bisnis ini');
  const peran = labelPeranBisnis(r.peran);
  if (r.hasil === 'sudah_anggota' && r.peran === 'owner') {
    return { berhasil: false, pesan: `ℹ Kamu adalah pemilik bisnis "${nama}".` };
  }
  if (r.hasil === 'sudah_anggota') {
    return { berhasil: false, pesan: `ℹ Kamu sudah terdaftar di bisnis "${nama}" sebagai ${peran}.<br>Pilih bisnis tersebut dari daftar bisnis kamu.` };
  }
  if (r.hasil === 'diaktifkan') {
    return { berhasil: true, pesan: `✅ Undanganmu ke bisnis "${nama}" sebagai ${peran} sudah aktif.` };
  }
  if (r.hasil === 'bergabung') {
    return { berhasil: true, pesan: `✅ Berhasil bergabung ke bisnis "${nama}" sebagai ${peran}.<br>Admin bisa mengubah peran dan izin aksesmu.` };
  }
  return { berhasil: false, pesan: 'ℹ Permintaan gabung diproses, tetapi hasilnya tidak dikenali. Muat ulang daftar bisnis.' };
}
