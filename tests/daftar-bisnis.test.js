// Tes js/26-daftar-bisnis.js. Jalankan: node tests/daftar-bisnis.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', '26-daftar-bisnis.js'), 'utf8');
const ctx = { escapeHtml: x => String(x).replace(/</g, '&lt;') }; vm.createContext(ctx); vm.runInContext(src, ctx);
const sus = (...a) => vm.runInContext('susunDaftarBisnis', ctx)(...a);
const lbl = (...a) => vm.runInContext('labelPeranBisnis', ctx)(...a);
const rg = (...a) => vm.runInContext('ringkasHasilGabung', ctx)(...a);
const own = (...a) => vm.runInContext('adalahPemilikBisnis', ctx)(...a);

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };
const eq = (a, b, m) => ok(a === b, m + (a === b ? '' : ' (dapat ' + JSON.stringify(a) + ', mau ' + JSON.stringify(b) + ')'));

const ME = 'u-me', OTHER = 'u-lain';
const milik = { id: 'c1', name: 'Toko Saya', user_id: ME };
const bisnisLain = { id: 'c2', name: 'CV Lain', user_id: OTHER };
const bisnisLain3 = { id: 'c3', name: 'PT Tiga', user_id: OTHER };

console.log('[1] pemilik saja');
let r = sus([milik], [], [], ME);
eq(r.length, 1, 'satu bisnis');
eq(r[0]._role, 'owner', 'peran owner');
eq(r[0].name, 'Toko Saya', 'data bisnis tetap');

console.log('[2] anggota active tampil dengan peran dari org_members');
r = sus([milik], [{ company_id: 'c2', role: 'viewer', status: 'active' }], [bisnisLain], ME);
eq(r.length, 2, 'dua bisnis');
eq(r[1]._role, 'viewer', 'peran viewer');
r = sus([], [{ company_id: 'c2', role: 'admin', status: 'active' }], [bisnisLain], ME);
eq(r[0]._role, 'admin', 'peran admin');

console.log('[3] hanya baris active');
r = sus([], [{ company_id: 'c2', role: 'member', status: 'pending' }], [bisnisLain], ME);
eq(r.length, 0, 'pending tidak tampil');
r = sus([], [{ company_id: 'c2', role: 'member', status: 'active' }, { company_id: 'c3', role: 'member', status: 'pending' }], [bisnisLain, bisnisLain3], ME);
eq(r.length, 1, 'campuran: hanya yang active');
eq(r[0].id, 'c2', 'yang active adalah c2');

console.log('[4] bisnis tanpa keanggotaan tidak ikut (jangan percaya hasil query companies saja)');
r = sus([], [], [bisnisLain], ME);
eq(r.length, 0, 'tanpa baris org_members -> tidak tampil');

console.log('[5] duplikat dan pemilik menang');
r = sus([milik], [{ company_id: 'c1', role: 'viewer', status: 'active' }], [milik], ME);
eq(r.length, 1, 'bisnis sendiri tidak dobel');
eq(r[0]._role, 'owner', 'tetap owner walau ada baris anggota');
r = sus([], [{ company_id: 'c2', role: 'member', status: 'active' }], [bisnisLain, bisnisLain], ME);
eq(r.length, 1, 'duplikat bisnis anggota dibuang');

console.log('[6] input rusak tidak melempar');
eq(sus(null, undefined, null, ME).length, 0, 'semua null -> kosong');
eq(sus([null], [null], [null], ME).length, 0, 'elemen null diabaikan');
r = sus([], [{ company_id: 'c2', status: 'active' }], [bisnisLain], ME);
eq(r[0]._role, 'viewer', 'peran kosong -> viewer (hak terkecil)');

console.log('[7] tidak mengubah objek asal');
const asal = { id: 'c1', name: 'X', user_id: ME };
sus([asal], [], [], ME);
eq('_role' in asal, false, 'objek input tidak dimutasi');

console.log('[8] label dan cek pemilik');
eq(lbl('owner'), 'Pemilik', 'label owner');
eq(lbl('admin'), 'Admin', 'label admin');
eq(lbl('member'), 'Member', 'label member');
eq(lbl('viewer'), 'Viewer', 'label viewer');
eq(lbl('aneh'), 'Viewer', 'peran tak dikenal -> Viewer');
eq(own({ id: 'c1', user_id: ME }, ME), true, 'user_id cocok -> pemilik');
eq(own({ id: 'c2', user_id: OTHER, _role: 'admin' }, ME), false, 'admin bukan pemilik');
eq(own({ id: 'c1', user_id: OTHER, _role: 'owner' }, ME), true, '_role owner -> pemilik');
eq(own(null, ME), false, 'company null -> false');
eq(own({ id: 'c1', user_id: ME }, null), false, 'user null -> false');

console.log('[9] ringkasHasilGabung (balikan rpc gabung)');
r = rg({ company_id: 'c2', nama: 'CV Lain', peran: 'viewer', hasil: 'bergabung' });
eq(r.berhasil, true, 'bergabung -> berhasil');
ok(r.pesan.includes('CV Lain') && r.pesan.includes('Viewer'), 'pesan memuat nama bisnis dan peran Viewer');
r = rg({ nama: 'CV Lain', peran: 'admin', hasil: 'diaktifkan' });
eq(r.berhasil, true, 'diaktifkan -> berhasil');
ok(r.pesan.includes('Admin'), 'diaktifkan memakai peran dari server');
r = rg({ nama: 'CV Lain', peran: 'member', hasil: 'sudah_anggota' });
eq(r.berhasil, false, 'sudah_anggota -> tidak perlu muat ulang');
ok(r.pesan.includes('Member'), 'sudah_anggota menyebut peran');
r = rg({ nama: 'Toko Saya', peran: 'owner', hasil: 'sudah_anggota' });
eq(r.berhasil, false, 'pemilik -> tidak berhasil gabung');
ok(r.pesan.includes('pemilik'), 'pesan khusus pemilik');
r = rg({ nama: '<img src=x>', peran: 'viewer', hasil: 'bergabung' });
ok(!r.pesan.includes('<img'), 'nama bisnis di-escape');
eq(rg(null).berhasil, false, 'null tidak melempar');
eq(rg({ hasil: 'aneh' }).berhasil, false, 'hasil tak dikenal -> tidak berhasil');

console.log('[10] peran hanya baca (task 3.5)');
const bolehTulis = (...a) => vm.runInContext('peranBolehMenulis', ctx)(...a);
const aktif = (...a) => vm.runInContext('peranAktifBisnis', ctx)(...a);
const ro = (...a) => vm.runInContext('bisnisHanyaBaca', ctx)(...a);
eq(bolehTulis('viewer'), false, 'viewer tidak boleh menulis');
eq(bolehTulis('member') && bolehTulis('admin') && bolehTulis('owner'), true, 'member, admin, owner boleh menulis');
eq(bolehTulis('aneh') || bolehTulis(undefined) || bolehTulis(null), false, 'peran tak dikenal = tidak boleh menulis');
eq(aktif(null, ME, 'admin'), null, 'tanpa bisnis (mode tamu) tidak punya peran');
eq(aktif(milik, ME, 'viewer'), 'owner', 'pemilik tetap owner walau memberRole lain');
eq(aktif({ ...bisnisLain, _role: 'viewer' }, ME, 'member'), 'viewer', '_role dari daftar bisnis menang atas memberRole');
eq(aktif(bisnisLain, ME, 'member'), 'member', 'tanpa _role dipakai memberRole');
eq(aktif(bisnisLain, ME, null), 'viewer', 'tanpa info apa pun = viewer');
eq(ro({ ...bisnisLain, _role: 'viewer' }, ME, null), true, 'viewer = hanya baca');
eq(ro({ ...bisnisLain, _role: 'member' }, ME, null), false, 'member boleh tulis');
eq(ro(milik, ME, null), false, 'pemilik boleh tulis');
eq(ro(null, ME, null), false, 'mode tamu tidak dibatasi');
eq(ro({ ...bisnisLain, _role: 'viewer' }, ME, 'admin'), true, 'memberRole admin dari fallback tidak menaikkan viewer');

console.log(`\n${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
