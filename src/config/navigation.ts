import type { NavGroup, PageMeta } from "@/types";

export const NAV_GROUPS: readonly NavGroup[] = [
  {
    label: "Utama",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        icon: "layout-dashboard",
        dataPage: "dashboard",
        defaultActive: true,
        action: { type: "page", pageId: "dashboard" },
      },
    ],
  },
  {
    label: "Pembelian",
    items: [
      {
        id: "pembelian",
        label: "Pembelian",
        icon: "shopping-cart",
        dataPage: "pembelian",
        action: { type: "page", pageId: "pembelian" },
      },
      {
        id: "pesanan-pembelian",
        label: "Pesanan Pembelian",
        icon: "clipboard-list",
        dataPage: "pesanan-pembelian",
        action: { type: "page", pageId: "pesanan-pembelian" },
      },
    ],
  },
  {
    label: "Penjualan",
    items: [
      {
        id: "penjualan",
        label: "Penjualan",
        icon: "receipt",
        dataPage: "penjualan",
        action: { type: "page", pageId: "penjualan" },
      },
      {
        id: "pesanan-jual",
        label: "Pesanan Penjualan",
        icon: "clipboard-list",
        dataPage: "pesanan-jual",
        action: { type: "page", pageId: "pesanan-jual" },
      },
      {
        id: "invoice",
        label: "Invoice",
        icon: "file-spreadsheet",
        dataPage: "invoice",
        action: { type: "page", pageId: "invoice" },
      },
    ],
  },
  {
    label: "Perusahaan",
    items: [
      {
        id: "pengiriman",
        label: "Pengiriman",
        icon: "truck",
        dataPage: "pengiriman",
        action: { type: "page", pageId: "pengiriman" },
      },
    ],
  },
  {
    label: "Jurnal",
    items: [
      {
        id: "jurnal-umum",
        label: "Jurnal Umum",
        icon: "book",
        dataPage: "jurnal-umum",
        action: { type: "page", pageId: "jurnal-umum" },
      },
      {
        id: "jurnal-kas",
        label: "Jurnal Kas",
        icon: "banknote",
        dataPage: "jurnal-kas",
        action: { type: "page", pageId: "jurnal-kas" },
      },
      {
        id: "jurnal-penjualan",
        label: "Jurnal Jual",
        icon: "receipt",
        dataPage: "jurnal-penjualan",
        action: { type: "page", pageId: "jurnal-penjualan" },
      },
      {
        id: "jurnal-pembelian",
        label: "Jurnal Beli",
        icon: "shopping-cart",
        dataPage: "jurnal-pembelian",
        action: { type: "page", pageId: "jurnal-pembelian" },
      },
    ],
  },
  {
    label: "Laporan",
    items: [
      {
        id: "buku-besar",
        label: "Buku Besar",
        icon: "library",
        dataPage: "buku-besar",
        action: { type: "page", pageId: "buku-besar" },
      },
      {
        id: "neraca-saldo",
        label: "Neraca Saldo",
        icon: "scale",
        dataPage: "neraca-saldo",
        action: { type: "page", pageId: "neraca-saldo" },
      },
      {
        id: "laba-rugi",
        label: "Laba Rugi",
        icon: "trending-up",
        dataPage: "laba-rugi",
        action: { type: "page", pageId: "laba-rugi" },
      },
      {
        id: "neraca",
        label: "Neraca",
        icon: "landmark",
        dataPage: "neraca",
        action: { type: "page", pageId: "neraca" },
      },
      {
        id: "arus-kas",
        label: "Arus Kas",
        icon: "arrow-left-right",
        dataPage: "arus-kas",
        action: { type: "page", pageId: "arus-kas" },
      },
      {
        id: "perubahan-ekuitas",
        label: "P. Ekuitas",
        icon: "area-chart",
        dataPage: "perubahan-ekuitas",
        action: { type: "page", pageId: "perubahan-ekuitas" },
      },
      {
        id: "analitik",
        label: "Analitik",
        icon: "bar-chart-3",
        dataPage: "analitik",
        action: { type: "page", pageId: "analitik" },
      },
    ],
  },
  {
    label: "Master",
    singleColumn: true,
    items: [
      {
        id: "kalk-persediaan",
        label: "Persediaan",
        icon: "package",
        dataPage: "kalk-persediaan",
        action: { type: "page", pageId: "kalk-persediaan" },
      },
      {
        id: "akun",
        label: "Chart of Accounts",
        icon: "list",
        dataPage: "akun",
        action: { type: "page", pageId: "akun" },
      },
      {
        id: "aset-tetap",
        label: "Aset Tetap",
        icon: "factory",
        dataPage: "aset-tetap",
        action: { type: "page", pageId: "aset-tetap" },
      },
      {
        id: "kontak",
        label: "Kontak",
        icon: "users",
        dataPage: "kontak",
        action: { type: "page", pageId: "kontak" },
      },
    ],
  },
  {
    label: "Kalkulator",
    items: [
      {
        id: "kalk-penyusutan",
        label: "Penyusutan",
        icon: "building-2",
        dataPage: "kalk-penyusutan",
        action: { type: "page", pageId: "kalk-penyusutan" },
      },
      {
        id: "kalk-bunga",
        label: "Bunga",
        icon: "candlestick-chart",
        dataPage: "kalk-bunga",
        action: { type: "page", pageId: "kalk-bunga" },
      },
      {
        id: "kalk-rasio",
        label: "Rasio",
        icon: "ruler",
        dataPage: "kalk-rasio",
        action: { type: "page", pageId: "kalk-rasio" },
      },
      {
        id: "kalk-bep",
        label: "BEP & Margin",
        icon: "zap",
        dataPage: "kalk-bep",
        action: { type: "page", pageId: "kalk-bep" },
      },
    ],
  },
  {
    label: "Fitur Baru",
    items: [
      {
        id: "jurnal-berulang",
        label: "J. Berulang",
        icon: "refresh-cw",
        dataPage: "jurnal-berulang",
        action: { type: "page", pageId: "jurnal-berulang" },
      },
      {
        id: "rekonsiliasi",
        label: "Rekonsiliasi",
        icon: "git-compare",
        dataPage: "rekonsiliasi",
        action: { type: "page", pageId: "rekonsiliasi" },
      },
      {
        id: "anggaran",
        label: "Anggaran",
        icon: "target",
        dataPage: "anggaran",
        action: { type: "page", pageId: "anggaran" },
      },
      {
        id: "pajak",
        label: "Pajak Auto",
        icon: "receipt-text",
        dataPage: "pajak",
        action: { type: "page", pageId: "pajak" },
      },
    ],
  },
  {
    label: "Lainnya",
    items: [
      {
        id: "tutorial",
        label: "Tutorial",
        icon: "graduation-cap",
        dataPage: "tutorial",
        accentClass: "tut-card-nav",
        action: { type: "page", pageId: "tutorial" },
      },
      {
        id: "ai-assistant",
        label: "Orias AI",
        icon: "bot",
        dataPage: "ai-assistant",
        accentClass: "ai-card",
        action: { type: "page", pageId: "ai-assistant" },
      },
      {
        id: "audit-trail",
        label: "Audit Trail",
        icon: "shield-check",
        dataPage: "audit-trail",
        accentClass: "nav-accent2",
        action: { type: "page", pageId: "audit-trail" },
      },
      {
        id: "export",
        label: "Export",
        icon: "upload",
        accentClass: "nav-accent3",
        action: {
          type: "global",
          fn: "openExportModal",
          closeSidebarAfter: true,
          dataAction: "openExportModal",
        },
      },
      {
        id: "theme",
        label: "Tema Gelap",
        icon: "moon",
        elementId: "theme-nav-card",
        iconId: "theme-nav-icon",
        labelId: "theme-nav-label",
        action: { type: "global", fn: "toggleTheme" },
      },
      {
        id: "user-mgmt",
        label: "Kelola Tim",
        icon: "users",
        accentClass: "nav-accent2",
        elementId: "nav-user-mgmt",
        action: { type: "global", fn: "openUserMgmtModal" },
      },
      {
        id: "join-code",
        label: "Gabung Bisnis",
        icon: "log-in",
        elementId: "nav-join-code",
        action: { type: "global", fn: "openJoinWithCodeModal" },
      },
      {
        id: "settings",
        label: "Settings",
        icon: "settings",
        elementId: "nav-settings",
        action: { type: "page", pageId: "settings" },
      },
    ],
  },
];

export const PAGE_META: Record<string, PageMeta> = {
  "rekonsiliasi-bank": {
    title: "Rekonsiliasi Bank",
    subtitle: "Upload & cocokkan mutasi bank",
  },
  dashboard: {
    title: "Dashboard",
    subtitle: "Ringkasan keuangan bisnis Anda",
  },
  pembelian: {
    title: "Pembelian",
    subtitle: "Pesanan pembelian dan pembelian langsung",
  },
  "pesanan-pembelian": {
    title: "Pesanan Pembelian",
    subtitle: "Daftar pesanan pembelian dan penerimaan barang ke gudang",
  },
  penjualan: {
    title: "Penjualan",
    subtitle: "Pesanan penjualan dan penjualan langsung",
  },
  pengiriman: {
    title: "Pengiriman",
    subtitle: "Daftar kategori jasa pengirim dan alamat ekspedisi",
  },
  transaksi: {
    title: "Input Transaksi",
    subtitle: "Tambah transaksi baru",
  },
  "jurnal-umum": {
    title: "Jurnal Umum",
    subtitle: "Semua entri jurnal",
  },
  "jurnal-kas": {
    title: "Jurnal Kas",
    subtitle: "Penerimaan dan pengeluaran kas",
  },
  "jurnal-penjualan": {
    title: "Jurnal Penjualan",
    subtitle: "Transaksi penjualan",
  },
  "jurnal-pembelian": {
    title: "Jurnal Pembelian",
    subtitle: "Transaksi pembelian",
  },
  "buku-besar": {
    title: "Buku Besar",
    subtitle: "Mutasi per akun",
  },
  "neraca-saldo": {
    title: "Neraca Saldo",
    subtitle: "Saldo semua akun",
  },
  "laba-rugi": {
    title: "Laporan Laba Rugi",
    subtitle: "Pendapatan & beban",
  },
  neraca: {
    title: "Neraca",
    subtitle: "Posisi keuangan",
  },
  akun: {
    title: "Chart of Accounts",
    subtitle: "Daftar akun",
  },
  "kalk-penyusutan": {
    title: "Penyusutan Aset",
    subtitle: "Garis lurus, saldo menurun, SYD, dan unit produksi",
  },
  "kalk-persediaan": {
    title: "Persediaan",
    subtitle: "Multi gudang, rak penyimpanan, daftar barang, dan transfer stok",
  },
  "kalk-bunga": {
    title: "Bunga & Anuitas",
    subtitle: "Bunga tunggal, majemuk, cicilan, dan PV/FV",
  },
  "kalk-rasio": {
    title: "Rasio Keuangan",
    subtitle: "Likuiditas, solvabilitas, profitabilitas, dan aktivitas",
  },
  "kalk-bep": {
    title: "BEP & Margin",
    subtitle: "Titik impas, margin kontribusi, dan batas aman",
  },
  "ai-assistant": {
    title: "Orias Assisten",
    subtitle: "Asisten akuntansi dan pencatatan jurnal",
  },
  tutorial: {
    title: "Tutorial",
    subtitle: "Panduan penggunaan langkah demi langkah",
  },
  analitik: {
    title: "Analitik & Tren Bisnis",
    subtitle: "Pendapatan, laba, arus kas, dan proyeksi",
  },
  "jurnal-berulang": {
    title: "Jurnal Berulang",
    subtitle: "Otomasi transaksi rutin seperti gaji, sewa, dan cicilan",
  },
  invoice: {
    title: "Invoice & Piutang",
    subtitle: "Buat invoice, lacak pembayaran, dan jurnal otomatis",
  },
  "pesanan-jual": {
    title: "Pesanan Penjualan",
    subtitle: "Daftar pesanan penjualan dari dikemas, menunggu, hingga selesai",
  },
  rekonsiliasi: {
    title: "Rekonsiliasi Bank",
    subtitle: "Cocokkan mutasi bank CSV dengan catatan jurnal",
  },
  anggaran: {
    title: "Anggaran vs Aktual",
    subtitle: "Target per akun, realisasi, dan selisih anggaran",
  },
  pajak: {
    title: "Pajak Otomatis",
    subtitle: "Perhitungan PPN, PPh 21, PPh 23, dan rekap SPT",
  },
  "arus-kas": {
    title: "Laporan Arus Kas",
    subtitle: "Metode tidak langsung (PSAK 2)",
  },
  "perubahan-ekuitas": {
    title: "Laporan Perubahan Ekuitas",
    subtitle: "Mutasi modal pemilik (PSAK 1)",
  },
  produk: {
    title: "Master Produk",
    subtitle: "Daftar produk, layanan, stok, dan harga jual",
  },
  "aset-tetap": {
    title: "Register Aset Tetap",
    subtitle: "Daftar aset, penyusutan otomatis, dan nilai buku",
  },
  kontak: {
    title: "Master Kontak",
    subtitle: "Pelanggan, supplier, dan histori transaksi",
  },
  "audit-trail": {
    title: "Audit Trail",
    subtitle: "Riwayat aktivitas pengguna dan perubahan data",
  },
  settings: {
    title: "Settings",
    subtitle: "Akun, autentikasi & pengaturan transaksi",
  },
};
