
// DATA
let akuns = [
  // ═══════ ASET LANCAR ═══════
  {kode:'1101',nama:'Kas',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1102',nama:'Bank BCA',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1103',nama:'Bank Mandiri',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1104',nama:'Kas Kecil (Petty Cash)',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1201',nama:'Piutang Usaha',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1202',nama:'Piutang Lain-lain',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1203',nama:'Cadangan Kerugian Piutang',tipe:'Aset',kat:'Kontra',normal:'K'},
  {kode:'1301',nama:'Persediaan Barang Dagangan',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1302',nama:'Persediaan Bahan Baku',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1303',nama:'Persediaan Barang Dalam Proses',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1304',nama:'Persediaan Barang Jadi',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1401',nama:'Perlengkapan Kantor',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1402',nama:'Perlengkapan Toko',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1501',nama:'Uang Muka Pembelian',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1502',nama:'PPN Masukan (Pajak Dibayar Dimuka)',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1503',nama:'PPh Dibayar Dimuka (Uang Muka Pajak)',tipe:'Aset',kat:'Lancar',normal:'D'},
  {kode:'1601',nama:'Biaya Dibayar Dimuka',tipe:'Aset',kat:'Lancar',normal:'D'},
  // ═══════ ASET TETAP ═══════
  {kode:'1701',nama:'Tanah',tipe:'Aset',kat:'Tetap',normal:'D'},
  {kode:'1702',nama:'Bangunan',tipe:'Aset',kat:'Tetap',normal:'D'},
  {kode:'1703',nama:'Akumulasi Penyusutan Bangunan',tipe:'Aset',kat:'Kontra',normal:'K'},
  {kode:'1711',nama:'Kendaraan',tipe:'Aset',kat:'Tetap',normal:'D'},
  {kode:'1712',nama:'Akumulasi Penyusutan Kendaraan',tipe:'Aset',kat:'Kontra',normal:'K'},
  {kode:'1721',nama:'Peralatan Kantor',tipe:'Aset',kat:'Tetap',normal:'D'},
  {kode:'1722',nama:'Akumulasi Penyusutan Peralatan Kantor',tipe:'Aset',kat:'Kontra',normal:'K'},
  {kode:'1731',nama:'Mesin & Alat Produksi',tipe:'Aset',kat:'Tetap',normal:'D'},
  {kode:'1732',nama:'Akumulasi Penyusutan Mesin',tipe:'Aset',kat:'Kontra',normal:'K'},
  {kode:'1741',nama:'Inventaris & Furnitur',tipe:'Aset',kat:'Tetap',normal:'D'},
  {kode:'1742',nama:'Akumulasi Penyusutan Inventaris',tipe:'Aset',kat:'Kontra',normal:'K'},
  {kode:'1751',nama:'Komputer & Laptop',tipe:'Aset',kat:'Tetap',normal:'D'},
  {kode:'1752',nama:'Akumulasi Penyusutan Komputer',tipe:'Aset',kat:'Kontra',normal:'K'},
  // ═══════ ASET LAIN-LAIN ═══════
  {kode:'1801',nama:'Aset Tidak Berwujud (Goodwill/Lisensi)',tipe:'Aset',kat:'Tidak Berwujud',normal:'D'},
  {kode:'1802',nama:'Amortisasi Aset Tidak Berwujud',tipe:'Aset',kat:'Kontra',normal:'K'},
  {kode:'1901',nama:'Investasi Jangka Panjang',tipe:'Aset',kat:'Investasi',normal:'D'},
  // ═══════ LIABILITAS LANCAR ═══════
  {kode:'2101',nama:'Utang Usaha',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2102',nama:'Utang Lain-lain',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2201',nama:'Utang Gaji',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2202',nama:'Utang Bonus & THR',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2301',nama:'Utang PPN Keluaran',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2302',nama:'Utang PPh 21 (Karyawan)',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2303',nama:'Utang PPh 23 (Hutang ke Negara)',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2304',nama:'Utang PPh Badan (Pasal 29)',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2401',nama:'Pendapatan Diterima di Muka',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2402',nama:'Uang Muka Pelanggan',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2501',nama:'Utang Bunga',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2502',nama:'Biaya yang Masih Harus Dibayar',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2601',nama:'Utang Dividen',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2701',nama:'Utang BPJS Kesehatan',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  {kode:'2702',nama:'Utang BPJS Ketenagakerjaan',tipe:'Liabilitas',kat:'Lancar',normal:'K'},
  // ═══════ LIABILITAS JANGKA PANJANG ═══════
  {kode:'2801',nama:'Utang Bank Jangka Panjang',tipe:'Liabilitas',kat:'Jk Panjang',normal:'K'},
  {kode:'2802',nama:'Utang Leasing',tipe:'Liabilitas',kat:'Jk Panjang',normal:'K'},
  {kode:'2803',nama:'Utang Obligasi',tipe:'Liabilitas',kat:'Jk Panjang',normal:'K'},
  // ═══════ EKUITAS ═══════
  {kode:'3101',nama:'Modal Pemilik / Modal Disetor',tipe:'Ekuitas',kat:'Modal',normal:'K'},
  {kode:'3102',nama:'Prive / Pengambilan Pribadi',tipe:'Ekuitas',kat:'Modal',normal:'D'},
  {kode:'3201',nama:'Laba Ditahan',tipe:'Ekuitas',kat:'Laba',normal:'K'},
  {kode:'3202',nama:'Laba Tahun Berjalan',tipe:'Ekuitas',kat:'Laba',normal:'K'},
  // ═══════ PENDAPATAN ═══════
  {kode:'4101',nama:'Penjualan Barang',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
  {kode:'4102',nama:'Penjualan Jasa',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
  {kode:'4105',nama:'Penjualan Produk Manufaktur',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
  {kode:'4106',nama:'Pendapatan Properti / Sewa',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
  {kode:'4107',nama:'Penjualan Bahan Baku',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
  {kode:'4103',nama:'Retur & Potongan Penjualan',tipe:'Pendapatan',kat:'Kontra',normal:'D'},
  {kode:'4104',nama:'Diskon Penjualan',tipe:'Pendapatan',kat:'Kontra',normal:'D'},
  {kode:'4201',nama:'Pendapatan Komisi',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
  {kode:'4202',nama:'Pendapatan Sewa',tipe:'Pendapatan',kat:'Operasional',normal:'K'},
  {kode:'4203',nama:'Pendapatan Bunga',tipe:'Pendapatan',kat:'Non-Operasional',normal:'K'},
  {kode:'4204',nama:'Pendapatan Dividen',tipe:'Pendapatan',kat:'Non-Operasional',normal:'K'},
  {kode:'4205',nama:'Pendapatan Non-Operasional Lainnya',tipe:'Pendapatan',kat:'Non-Operasional',normal:'K'},
  {kode:'4301',nama:'Keuntungan Penjualan Aset',tipe:'Pendapatan',kat:'Non-Operasional',normal:'K'},
  // ═══════ HPP ═══════
  {kode:'5101',nama:'HPP - Harga Pokok Penjualan',tipe:'HPP',kat:'HPP',normal:'D'},
  {kode:'5102',nama:'Pembelian Barang Dagangan',tipe:'HPP',kat:'HPP',normal:'D'},
  {kode:'5103',nama:'Retur & Potongan Pembelian',tipe:'HPP',kat:'Kontra HPP',normal:'K'},
  {kode:'5104',nama:'Biaya Angkut Pembelian',tipe:'HPP',kat:'HPP',normal:'D'},
  {kode:'5201',nama:'Biaya Bahan Baku Langsung',tipe:'HPP',kat:'Produksi',normal:'D'},
  {kode:'5202',nama:'Biaya Tenaga Kerja Langsung',tipe:'HPP',kat:'Produksi',normal:'D'},
  {kode:'5203',nama:'Biaya Overhead Pabrik',tipe:'HPP',kat:'Produksi',normal:'D'},
  // ═══════ BEBAN OPERASIONAL ═══════
  {kode:'6101',nama:'Beban Gaji & Upah',tipe:'Beban',kat:'SDM',normal:'D'},
  {kode:'6102',nama:'Beban Lembur',tipe:'Beban',kat:'SDM',normal:'D'},
  {kode:'6103',nama:'Beban THR & Bonus',tipe:'Beban',kat:'SDM',normal:'D'},
  {kode:'6104',nama:'Beban BPJS Kesehatan (Pemberi Kerja)',tipe:'Beban',kat:'SDM',normal:'D'},
  {kode:'6105',nama:'Beban BPJS Ketenagakerjaan',tipe:'Beban',kat:'SDM',normal:'D'},
  {kode:'6106',nama:'Beban Pelatihan & Pengembangan',tipe:'Beban',kat:'SDM',normal:'D'},
  {kode:'6201',nama:'Beban Sewa Gedung & Tempat',tipe:'Beban',kat:'Operasional',normal:'D'},
  {kode:'6202',nama:'Beban Listrik & Air',tipe:'Beban',kat:'Operasional',normal:'D'},
  {kode:'6203',nama:'Beban Telepon & Internet',tipe:'Beban',kat:'Operasional',normal:'D'},
  {kode:'6204',nama:'Beban Bahan Bakar & Transportasi',tipe:'Beban',kat:'Operasional',normal:'D'},
  {kode:'6205',nama:'Beban Perlengkapan Kantor',tipe:'Beban',kat:'Operasional',normal:'D'},
  {kode:'6206',nama:'Beban Pemeliharaan & Perbaikan',tipe:'Beban',kat:'Operasional',normal:'D'},
  {kode:'6207',nama:'Beban Kebersihan & Keamanan',tipe:'Beban',kat:'Operasional',normal:'D'},
  {kode:'6301',nama:'Beban Penyusutan Bangunan',tipe:'Beban',kat:'Penyusutan',normal:'D'},
  {kode:'6302',nama:'Beban Penyusutan Kendaraan',tipe:'Beban',kat:'Penyusutan',normal:'D'},
  {kode:'6303',nama:'Beban Penyusutan Peralatan Kantor',tipe:'Beban',kat:'Penyusutan',normal:'D'},
  {kode:'6304',nama:'Beban Penyusutan Mesin',tipe:'Beban',kat:'Penyusutan',normal:'D'},
  {kode:'6305',nama:'Beban Penyusutan Komputer',tipe:'Beban',kat:'Penyusutan',normal:'D'},
  {kode:'6306',nama:'Beban Amortisasi Aset Tak Berwujud',tipe:'Beban',kat:'Penyusutan',normal:'D'},
  {kode:'6401',nama:'Beban Iklan & Promosi',tipe:'Beban',kat:'Pemasaran',normal:'D'},
  {kode:'6402',nama:'Beban Komisi Penjualan',tipe:'Beban',kat:'Pemasaran',normal:'D'},
  {kode:'6403',nama:'Beban Pengiriman & Ongkos Kirim',tipe:'Beban',kat:'Pemasaran',normal:'D'},
  {kode:'6501',nama:'Beban Administrasi & Umum',tipe:'Beban',kat:'Administrasi',normal:'D'},
  {kode:'6502',nama:'Beban Perjalanan Dinas',tipe:'Beban',kat:'Administrasi',normal:'D'},
  {kode:'6503',nama:'Beban Konsultan & Profesional',tipe:'Beban',kat:'Administrasi',normal:'D'},
  {kode:'6504',nama:'Beban Asuransi',tipe:'Beban',kat:'Administrasi',normal:'D'},
  {kode:'6505',nama:'Beban Perizinan & Legalitas',tipe:'Beban',kat:'Administrasi',normal:'D'},
  // ═══════ BEBAN NON-OPERASIONAL ═══════
  {kode:'6601',nama:'Beban Bunga Pinjaman',tipe:'Beban',kat:'Non-Operasional',normal:'D'},
  {kode:'6602',nama:'Beban Administrasi Bank',tipe:'Beban',kat:'Non-Operasional',normal:'D'},
  {kode:'6603',nama:'Kerugian Penjualan Aset',tipe:'Beban',kat:'Non-Operasional',normal:'D'},
  {kode:'6604',nama:'Beban Pajak (PPh Badan)',tipe:'Beban',kat:'Non-Operasional',normal:'D'},
  {kode:'6701',nama:'Beban Lain-lain',tipe:'Beban',kat:'Lain-lain',normal:'D'},
];

let jurnalEntries = []; // [{no,tanggal,ket,jenis,lines:[{akun,ket,debit,kredit}]}]
let jurnalCounter = 1;
let produkList = []; // [{id,kode,nama,kat,satuan,hargaJual,hpp,stok,stokMin,akunPend,akunHpp,deskripsi}]

// Seed sample data
function seedData() {
  const today = new Date().toISOString().split('T')[0];
  const [y,m] = today.split('-');
  addJurnal({tanggal:`${y}-${m}-01`,ket:'Modal awal pemilik',jenis:'Manual',lines:[
    {akun:'1101',ket:'Kas masuk',debit:50000000,kredit:0},
    {akun:'3101',ket:'Modal pemilik',debit:0,kredit:50000000},
  ]});
  addJurnal({tanggal:`${y}-${m}-05`,ket:'Penjualan tunai INV-001',jenis:'Penjualan',ref:'INV-001',lines:[
    {akun:'1101',ket:'Kas masuk',debit:15000000,kredit:0},
    {akun:'4101',ket:'Penjualan',debit:0,kredit:15000000},
  ]});
  addJurnal({tanggal:`${y}-${m}-05`,ket:'HPP penjualan',jenis:'Penjualan',ref:'INV-001',lines:[
    {akun:'5101',ket:'HPP',debit:9000000,kredit:0},
    {akun:'1301',ket:'Persediaan',debit:0,kredit:9000000},
  ]});
  addJurnal({tanggal:`${y}-${m}-10`,ket:'Pembelian persediaan PO-001',jenis:'Pembelian',ref:'PO-001',lines:[
    {akun:'1301',ket:'Persediaan',debit:8000000,kredit:0},
    {akun:'1101',ket:'Kas keluar',debit:0,kredit:8000000},
  ]});
  addJurnal({tanggal:`${y}-${m}-15`,ket:'Beban gaji karyawan',jenis:'Kas',lines:[
    {akun:'6101',ket:'Beban gaji',debit:5000000,kredit:0},
    {akun:'1101',ket:'Kas keluar',debit:0,kredit:5000000},
  ]});
  addJurnal({tanggal:`${y}-${m}-20`,ket:'Penjualan kredit INV-002',jenis:'Penjualan',ref:'INV-002',lines:[
    {akun:'1201',ket:'Piutang usaha',debit:12000000,kredit:0},
    {akun:'4101',ket:'Penjualan',debit:0,kredit:12000000},
  ]});
  addJurnal({tanggal:`${y}-${m}-25`,ket:'Beban sewa kantor',jenis:'Kas',lines:[
    {akun:'6102',ket:'Beban sewa',debit:2500000,kredit:0},
    {akun:'1101',ket:'Kas keluar',debit:0,kredit:2500000},
  ]});
}

let currentPage = 'dashboard';


// FITUR BARU — DATA STORES
let jurnalBerulangList = JSON.parse(localStorage.getItem('oas_jb') || '[]');
let jurnalBerulangHistory = JSON.parse(localStorage.getItem('oas_jb_hist') || '[]');
let invoiceList = JSON.parse(localStorage.getItem('oas_invoices') || '[]');
let rekonData = { baris: [], csvFile: null };
let kursData = JSON.parse(localStorage.getItem('oas_kurs') || 'null') || { USD:1, IDR:16200, SGD:12100, EUR:18300, MYR:3500, JPY:107, updatedAt:null };
let notifAlerts = JSON.parse(localStorage.getItem('oas_alerts') || '[]');
let notifHistory = JSON.parse(localStorage.getItem('oas_notif_hist') || '[]');
let anggaranList = JSON.parse(localStorage.getItem('oas_anggaran') || '[]');
let asetTetapList = JSON.parse(localStorage.getItem('oas_aset_tetap') || '[]');
let kontakList = JSON.parse(localStorage.getItem('oas_kontak') || '[]');

// AI ASSISTANT
let aiHistory = [];
let aiThinking = false;

// STATE GLOBAL

let currentUser = null;       // Supabase user object
let currentCompany = null;    // { id, name, type, user_id }
let _authReady = false;

// GUEST MODE STATE

let isGuestMode = false;
let _afterLoginRunning = false; // Cegah double-call
