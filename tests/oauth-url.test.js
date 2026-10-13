// Tes js/27-oauth-url.js. Jalankan: node tests/oauth-url.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', '27-oauth-url.js'), 'utf8');
const ctx = { URLSearchParams }; vm.createContext(ctx); vm.runInContext(src, ctx);
const baca = (s, h) => vm.runInContext('bacaParamOAuth', ctx)(s, h);
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

console.log('[1] URL normal tanpa parameter');
let r = baca('', '#dashboard');
ok(!r.kode && !r.token && r.error === '', 'bukan redirect OAuth');
r = baca(null, undefined);
ok(!r.kode && !r.token && r.error === '', 'null/undefined tidak melempar');

console.log('[2] PKCE code asli');
r = baca('?code=abc123', '');
ok(r.kode === true && r.error === '', 'code= terdeteksi');

console.log('[3] redirect error Supabase (kasus di lapangan): bukan kode login');
r = baca('?error=invalid_request&error_code=flow_state_expired&error_description=Email+link+is+invalid+or+has+expired', '#dashboard');
ok(r.kode === false, 'error_code= tidak dikira code=');
ok(r.error.length > 0, 'error terbaca');
r = baca('?error=access_denied&error_code=otp_expired', '');
ok(r.kode === false && r.error === 'otp_expired', 'tanpa description: pakai error_code');
r = baca('?error=server_error', '');
ok(r.error === 'server_error' && r.kode === false, 'hanya error=');

console.log('[4] implicit flow di hash');
r = baca('', '#access_token=xyz&refresh_token=q');
ok(r.token === true && r.error === '', 'access_token di hash');
r = baca('', '#error=access_denied&error_description=ditolak');
ok(r.token === false && r.error === 'ditolak', 'error di hash terbaca');

console.log('[5] error menang atas code');
r = baca('?code=abc&error=access_denied', '');
ok(r.kode === false && r.error !== '', 'ada error: jangan tukar code');

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
