// Tes dropdown pindah akun (js/21-settings.js) + pengaman nama helper escape.
// Jalankan: node tests/akun-switcher.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

// ── 1. Setiap helper esc*() yang dipanggil harus terdefinisi (bug escJsAttr) ──
console.log('[1] helper esc*() yang dipanggil semuanya terdefinisi');
{
  const files = fs.readdirSync(path.join(__dirname, '..', 'js')).filter(f => f.endsWith('.js'));
  const all = files.map(f => [f, read('js/' + f)]);
  const defined = new Set();
  all.forEach(([, t]) => { for (const m of t.matchAll(/\bfunction\s+(esc[A-Za-z0-9_]*)\s*\(/g)) defined.add(m[1]); });
  const undef = [];
  all.forEach(([f, t]) => {
    for (const m of t.matchAll(/(?<![.\w$])(esc[A-Z][A-Za-z0-9_]*)\s*\(/g)) {
      if (!defined.has(m[1])) undef.push(f + ': ' + m[1]);
    }
  });
  ok(undef.length === 0, 'tidak ada panggilan helper esc* yang tak terdefinisi' + (undef.length ? ' -> ' + [...new Set(undef)].join(', ') : ''));
}

// ── 2. Render dropdown dengan 2+ akun tersimpan ──
console.log('[2] renderAccountSwitcher dengan beberapa akun');
{
  const ut = read('js/02-utils.js');
  const grab = (src, name) => { const i = src.indexOf('function ' + name + '('); let d = 0, j = src.indexOf('{', i); for (let k = j; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) return src.slice(i, k + 1); } };
  const st = read('js/21-settings.js');
  const code = [grab(ut, 'escapeHtml'), grab(ut, 'escapeForJsAttr'), grab(st, 'renderAccountSwitcher')].join('\n');
  const panel = { innerHTML: '' };
  let saved = [], uid = 'u1';
  const ctx = { document: { getElementById: id => id === 'account-switcher-panel' ? panel : null }, _getSavedAccounts: () => saved, currentUser: { id: 'u1' }, ACCOUNT_SWITCHER_MAX: 5 };
  vm.createContext(ctx); vm.runInContext(code, ctx);
  const render = () => { ctx.currentUser = { id: uid }; panel.innerHTML = ''; vm.runInContext('renderAccountSwitcher()', ctx); return panel.innerHTML; };

  saved = [{ uid: 'u1', nama: 'Satu', email: 'satu@x.com' }];
  let html, err = null;
  try { html = render(); } catch (e) { err = e; }
  ok(!err && /Satu/.test(html), '1 akun: dropdown tampil');

  saved = [{ uid: 'u1', nama: 'Satu', email: 'satu@x.com' }, { uid: 'u2', nama: 'Dua', email: 'dua@x.com', avatarUrl: 'https://x/y.png' }];
  err = null; try { html = render(); } catch (e) { err = e; }
  ok(!err, '2 akun: tidak melempar error' + (err ? ' (' + err.message + ')' : ''));
  ok(html && html.includes("switchToAccount('u2')"), 'akun non-aktif punya handler pindah akun');
  ok(html && html.includes("removeAccountFromSwitcher('u2')"), 'akun non-aktif punya tombol hapus');
  ok(html && !html.includes("switchToAccount('u1')"), 'akun aktif tidak bisa diklik pindah');
  ok(html && html.includes('Tambah Akun'), 'menu Tambah Akun masih tersedia (< 5 akun)');

  // uid berisi tanda kutip tidak boleh keluar dari string JS di atribut onclick
  saved = [{ uid: 'u1', nama: 'Satu', email: 's@x.com' }, { uid: "a'b\"c", nama: 'Aneh', email: 'a@x.com' }];
  err = null; try { html = render(); } catch (e) { err = e; }
  ok(!err && html.includes("switchToAccount('a\\&#39;b&quot;c')"), 'uid dengan kutip di-escape untuk atribut onclick');

  saved = Array.from({ length: 5 }, (_, i) => ({ uid: 'u' + (i + 1), nama: 'N' + i, email: i + '@x.com' }));
  err = null; try { html = render(); } catch (e) { err = e; }
  ok(!err && /Maks 5 akun/.test(html) && !html.includes('Tambah Akun'), '5 akun: tombol tambah diganti keterangan maksimal');
}

console.log('\nHasil: ' + pass + ' lulus, ' + fail + ' gagal');
process.exit(fail ? 1 : 0);
