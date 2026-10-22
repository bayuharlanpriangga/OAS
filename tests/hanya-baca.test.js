// Tes izin viewer (task 3.5): isReadOnly, guardHanyaBaca, hasPerm di js/18-audit-permission.js.
// Jalankan: node tests/hanya-baca.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const bisnis = fs.readFileSync(path.join(__dirname, '..', 'js', '26-daftar-bisnis.js'), 'utf8');
const izin = fs.readFileSync(path.join(__dirname, '..', 'js', '18-audit-permission.js'), 'utf8');
// Hanya potongan isAdmin .. sebelum enforcePermissions (file penuh butuh DOM/Supabase).
const a = izin.indexOf('function isAdmin()'), b = izin.indexOf('function enforcePermissions()');
if (a < 0 || b < 0 || b < a) { console.log('  GAGAL potongan izin tidak ditemukan'); process.exit(1); }
const potongan = izin.slice(a, b);

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

function env(company, memberRole, orgMembers) {
  const alerts = []; let spinnerHidden = 0;
  const ctx = { Date, hideOpSpinner: () => { spinnerHidden++; }, _spin: () => spinnerHidden, currentUser: { id: 'u-me', email: 'me@x.id' }, currentCompany: company,
    _currentMemberRole: memberRole, _orgMembers: orgMembers || [], showAlert: m => alerts.push(m) };
  vm.createContext(ctx);
  vm.runInContext(bisnis, ctx);
  vm.runInContext(potongan, ctx);
  return { ctx, alerts, spin: () => spinnerHidden, run: c => vm.runInContext(c, ctx) };
}
const lain = { id: 'c2', user_id: 'u-lain' };

console.log('[1] viewer');
let e = env({ ...lain, _role: 'viewer' }, 'viewer', [{ user_id: 'u-me', role: 'viewer', permissions: {} }]);
ok(e.run('isReadOnly()') === true, 'viewer terdeteksi hanya baca');
ok(e.run("hasPerm('invoice','read')") === true, 'viewer boleh melihat');
ok(['create', 'update', 'delete'].every(act => e.run(`hasPerm('invoice','${act}')`) === false), 'viewer tidak boleh buat/ubah/hapus walau permissions kosong');
ok(e.run('isAdmin()') === false, 'viewer bukan admin');
ok(e.run("guardHanyaBaca('Jurnal')") === true && e.alerts.length === 1, 'guard memblokir dan memberi tahu user');
e.run("guardHanyaBaca('Jurnal'); guardHanyaBaca('Jurnal')");
ok(e.alerts.length === 1, 'pemberitahuan tidak membanjir (maks sekali per 5 detik)');

ok(e.spin() >= 1, 'guard menutup spinner "Menyimpan..." yang sudah tampil (tidak nyangkut)');
e = env({ ...lain, _role: 'member' }, 'member', []);
e.run("guardHanyaBaca('x')");
ok(e.spin() === 0, 'member: spinner tidak disentuh');

console.log('[2] peran lain tidak terdampak');
for (const peran of ['member', 'admin']) {
  e = env({ ...lain, _role: peran }, peran, [{ user_id: 'u-me', role: peran, permissions: {} }]);
  ok(e.run('isReadOnly()') === false && e.run("guardHanyaBaca('x')") === false && e.alerts.length === 0, peran + ': tidak diblokir');
  ok(e.run("hasPerm('invoice','create')") === true, peran + ': boleh membuat');
}
e = env({ id: 'c1', user_id: 'u-me', _role: 'owner' }, 'owner', []);
ok(e.run('isReadOnly()') === false && e.run("hasPerm('reset','delete')") === true, 'pemilik: penuh');
e = env(null, null, []);
ok(e.run('isReadOnly()') === false && e.run("guardHanyaBaca()") === false, 'mode tamu: tidak dibatasi');

console.log('[3] izin per modul = hanya Lihat');
e = env({ ...lain, _role: 'member' }, 'member', [{ user_id: 'u-me', role: 'member', permissions: { invoice: { read: false }, kontak: { read: true } } }]);
ok(e.run("hasPerm('invoice','read')") === false, 'member: modul yang di-Lihat-nya dimatikan admin tertutup');
ok(e.run("hasPerm('kontak','read')") === true && e.run("hasPerm('jurnal','read')") === true, 'member: modul lain (termasuk yang tidak tercatat) terbuka');
ok(e.run("hasPerm('invoice','delete')") === true && e.run("hasPerm('invoice','create')") === true, 'member: hak ubah/hapus tidak lagi per modul (ikut peran)');
ok(e.run("hasPerm('invoice')") === false, 'tanpa argumen aksi dianggap Lihat');
e = env({ ...lain, _role: 'member' }, 'member', [{ user_id: 'u-me', role: 'member', permissions: { invoice: { read: true, create: false, update: false, delete: false } } }]);
ok(e.run("hasPerm('invoice','read')") === true, 'data lama berisi create/update/delete=false: diabaikan, Lihat tetap berlaku');

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
