#!/usr/bin/env node
// Menulis docs/FILE_MAP.md: daftar fungsi + rentang baris tiap file js/.
// Jalankan lokal dari root repo:  node tools/gen-file-map.js
// Tanpa dependensi. Hanya mengenali deklarasi top-level (kolom 0).
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');
const JS_DIR = path.join(ROOT, 'js');
const OUT = path.join(ROOT, 'docs', 'FILE_MAP.md');

const DECL = [
  [/^(async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/, m => (m[1] ? 'async ' : '') + 'function', 2],
  [/^class\s+([A-Za-z_$][\w$]*)/, () => 'class', 1],
  [/^(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?(\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>/, m => 'arrow', 2],
  [/^(const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(async\s+)?function\b/, () => 'function', 2],
];

function parseDecl(line) {
  for (const [re, kind, nameIdx] of DECL) {
    const m = line.match(re);
    if (m) return { name: m[nameIdx], kind: kind(m) };
  }
  return null;
}

// Cek sintaks saja (tidak menjalankan kode) lewat parser bawaan Node.
function parses(code) {
  try { new vm.Script(code); return true; } catch (e) { return false; }
}

// Akhir deklarasi = baris terdekat (satu baris itu sendiri, atau penutup di
// kolom 0) yang membuat potongan i..j menjadi kode JS yang valid.
// Cara ini kebal terhadap template literal, regex, dan komentar di dalam fungsi.
function endLine(lines, i) {
  if (parses(lines[i])) return i;
  for (let j = i + 1; j < lines.length; j++) {
    if (!/^[}\])]/.test(lines[j])) continue;
    if (parses(lines.slice(i, j + 1).join('\n'))) return j;
  }
  return -1; // tidak ketemu
}

function scanFile(file) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const items = [];
  const warnings = [];
  for (let i = 0; i < lines.length; i++) {
    const d = parseDecl(lines[i]);
    if (!d) continue;
    const e = endLine(lines, i);
    if (e < 0) {
      warnings.push(`${path.basename(file)}:${i + 1} ${d.name}: akhir deklarasi tidak ditemukan, dicatat satu baris`);
      items.push({ ...d, from: i + 1, to: i + 1 });
      continue;
    }
    items.push({ ...d, from: i + 1, to: e + 1 });
    i = e; // lompati isi fungsi
  }
  return { total: lines.length, items, warnings };
}

function main() {
  const files = fs.readdirSync(JS_DIR).filter(f => f.endsWith('.js')).sort();
  const out = [
    '# FILE_MAP',
    '',
    'Dibuat otomatis oleh `node tools/gen-file-map.js`. Jangan diedit manual.',
    'Berisi deklarasi top-level tiap file di `js/` beserta rentang barisnya.',
    '',
  ];
  for (const f of files) {
    const full = path.join(JS_DIR, f);
    const { total, items, warnings } = scanFile(full);
    warnings.forEach(w => console.warn('PERINGATAN: ' + w));
    const kb = (fs.statSync(full).size / 1024).toFixed(1);
    out.push(`## js/${f} (${total} baris, ${kb} KB)`, '');
    if (!items.length) { out.push('_tidak ada deklarasi top-level_', ''); continue; }
    out.push('| Baris | Nama | Jenis |', '| --- | --- | --- |');
    for (const it of items) {
      const r = it.from === it.to ? `${it.from}` : `${it.from}-${it.to}`;
      out.push(`| ${r} | \`${it.name}\` | ${it.kind} |`);
    }
    out.push('');
  }
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, out.join('\n'));
  console.log('Ditulis: ' + path.relative(ROOT, OUT));
}

main();
