// Regression audit 5.7.1: status harus konsisten setelah cicilan dan penghapusan.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ctx = { console, JSON, Math, Promise, isFinite, isNaN,
  localStorage: { getItem: () => null, setItem: () => {} },
  currentCompany: null, invoiceList: [], billList: [] };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname, '../js/31-pembayaran.js'), 'utf8'), ctx);
const run = code => vm.runInContext(code, ctx);

const inv = { id: 'INV-1', noInvoice: 'INV-1', total: 100000, sisaTagihan: 100000, status: 'terkirim' };
const bill = { id: 'BILL-1', noBill: 'BILL-1', total: 80000, sisaTagihan: 80000, status: 'diterima' };
const p = (id, jenis, dokId, jumlah) => ({ id, jenis, dokId, jumlah, tanggal: '2026-10-01', akunKas: '1101', createdAt: '2026-10-01T00:00:00Z' });

// Invoice: terkirim -> sebagian -> lunas.
let payments = [p('P1', 'invoice', 'INV-1', 30000)];
assert.equal(run(`statusDariPembayaran(${JSON.stringify({...inv, sisaTagihan:70000})}, ${JSON.stringify(payments)}, 'invoice')`), 'sebagian');
payments.push(p('P2', 'invoice', 'INV-1', 70000));
assert.equal(run(`statusDariPembayaran(${JSON.stringify({...inv, status:'sebagian', sisaTagihan:0})}, ${JSON.stringify(payments)}, 'invoice')`), 'lunas');

// Hapus satu dari dua cicilan: lunas -> sebagian. Hapus sisanya: sebagian -> terkirim.
ctx.__inv = {...inv, status:'lunas', sisaTagihan:0};
ctx.__payments = payments;
let h = run("susunHapusPembayaran('P1', __inv, __payments, [])");
assert.equal(h.statusBaru, 'sebagian');
ctx.__payments = h.daftarBaru;
ctx.__inv = {...ctx.__inv, status:h.statusBaru, sisaTagihan:h.sisaBaru, dibayarLama:h.dibayarLama};
h = run("susunHapusPembayaran('P2', __inv, __payments, [])");
assert.equal(h.statusBaru, 'terkirim');
assert.equal(h.sisaBaru, 100000);

// Bill: diterima -> sebagian -> lunas -> sebagian -> diterima.
payments = [p('B1', 'bill', 'BILL-1', 30000), p('B2', 'bill', 'BILL-1', 50000)];
assert.equal(run(`statusDariPembayaran(${JSON.stringify({...bill, status:'sebagian', sisaTagihan:0})}, ${JSON.stringify(payments)}, 'bill')`), 'lunas');
ctx.__bill = {...bill, status:'lunas', sisaTagihan:0};
ctx.__payments = payments;
h = run("susunHapusPembayaran('B1', __bill, __payments, [])");
assert.equal(h.statusBaru, 'sebagian');
ctx.__payments = h.daftarBaru;
ctx.__bill = {...ctx.__bill, status:h.statusBaru, sisaTagihan:h.sisaBaru, dibayarLama:h.dibayarLama};
h = run("susunHapusPembayaran('B2', __bill, __payments, [])");
assert.equal(h.statusBaru, 'diterima');
assert.equal(h.sisaBaru, 80000);

// Draft dan status asing tidak boleh berubah oleh kalkulasi pembayaran.
assert.equal(run(`statusDariPembayaran(${JSON.stringify({...inv, status:'draft'})}, [], 'invoice')`), 'draft');
assert.equal(run(`statusDariPembayaran(${JSON.stringify({...inv, status:'arsip'})}, [], 'invoice')`), 'arsip');
console.log('pembayaran-integrity: 11 assertions passed');
