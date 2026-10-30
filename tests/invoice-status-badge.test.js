// Regression test: warna badge status invoice harus memakai token tema yang tersedia.
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, '..', 'js', '11-kontak-invoice.js'), 'utf8');
const match = source.match(/const statusMap = \{([^}]+)\};/);
if (!match) throw new Error('statusMap badge invoice tidak ditemukan');
const map = match[1];
for (const status of ['draft', 'terkirim', 'sebagian', 'lunas']) {
  if (!map.includes(`${status}:`)) throw new Error(`Status ${status} tidak memiliki mapping warna`);
}
if (!map.includes("sebagian:'var(--accent3)'")) {
  throw new Error('Status sebagian harus memakai token tema --accent3');
}
if (map.includes('var(--yellow)')) {
  throw new Error('Token --yellow tidak tersedia; jangan digunakan pada badge invoice');
}
console.log('✓ Semua status invoice memiliki mapping warna dan status sebagian memakai --accent3');
