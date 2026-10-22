// Tes upgradeSelectToOptPicker (js/03-widgets.js): dipanggil berulang tidak boleh menambah tombol.
// Jalankan: node tests/opt-picker.test.js
const fs = require('fs'), vm = require('vm'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'js', '03-widgets.js'), 'utf8');
const a = src.indexOf('function upgradeSelectToOptPicker'), b = src.indexOf('// UPGRADE PERIOD FILTERS');
if (a < 0 || b < a) { console.log('  GAGAL fungsi tidak ditemukan'); process.exit(1); }

let pass = 0, fail = 0;
const ok = (c, m) => { c ? pass++ : fail++; console.log((c ? '  ok   ' : '  GAGAL ') + m); };

// DOM minimal: parent berisi anak berurutan
const mkEl = (tag) => { const e = { tag, dataset: {}, style: {}, children: [], classList: { contains(c) { return (e.className || '').split(' ').includes(c); } },
  addEventListener() {}, querySelector(sel) { return sel === '.opt-picker-label' ? e._label : null; },
  get nextElementSibling() { const p = e.parentNode; return p ? p.children[p.children.indexOf(e) + 1] || null : null; } };
  return e; };
const parent = mkEl('div');
const select = mkEl('select'); select.parentNode = parent; parent.children.push(select);
select.options = [{ value: 'viewer', textContent: 'Viewer', dataset: {} }, { value: 'member', textContent: 'Member', dataset: {} }];
select.value = 'member'; select.closest = () => null;
parent.insertBefore = (el, ref) => { el.parentNode = parent; const i = parent.children.indexOf(ref); parent.children.splice(i < 0 ? parent.children.length : i, 0, el); };
const doc = { createElement: t => { const e = mkEl(t); Object.defineProperty(e, 'innerHTML', { set(v) { e._label = { textContent: (v.match(/opt-picker-label">([^<]*)</) || [])[1] }; } }); return e; } };
const ctx = { document: doc, escapeHtml: x => String(x), MutationObserver: function () { this.observe = () => {}; }, Array };
vm.createContext(ctx); vm.runInContext(src.slice(a, b), ctx);
const up = (...x) => vm.runInContext('upgradeSelectToOptPicker', ctx)(...x);
const tombol = () => parent.children.filter(c => c.className === 'opt-picker-btn');

up(select, {});
ok(tombol().length === 1, 'pemanggilan pertama membuat satu tombol');
ok(tombol()[0]._label.textContent === 'Member', 'label sesuai nilai awal');
select.value = 'viewer'; up(select, {});
ok(tombol().length === 1, 'dipanggil lagi: tetap satu tombol (tidak menduplikat)');
ok(tombol()[0]._label.textContent === 'Viewer', 'dipanggil lagi: label ikut nilai select');
for (let i = 0; i < 5; i++) up(select, {});
ok(tombol().length === 1, 'dibuka berkali-kali: tetap satu tombol');

console.log(`\nHasil: ${pass} lulus, ${fail} gagal`);
process.exit(fail ? 1 : 0);
