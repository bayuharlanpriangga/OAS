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
      {
        id: "transaksi",
        label: "Transaksi",
        icon: "circle-plus",
        dataPage: "transaksi",
        action: { type: "page", pageId: "transaksi" },
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
        id: "produk",
        label: "Master Produk",
        icon: "package",
        dataPage: "produk",
        action: { type: "page", pageId: "produk" },
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
        id: "kalk-persediaan",
        label: "Persediaan",
        icon: "package",
        dataPage: "kalk-persediaan",
        action: { type: "page", pageId: "kalk-persediaan" },
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
        id: "invoice",
        label: "Invoice",
        icon: "file-spreadsheet",
        dataPage: "invoice",
        action: { type: "page", pageId: "invoice" },
      },
      {
        id: "bill",
        label: "Tagihan Beli",
        icon: "file-spreadsheet",
        dataPage: "bill",
        action: { type: "page", pageId: "bill" },
      },
      {
        id: "umur-piutang",
        label: "Umur Piutang",
        icon: "clock",
        dataPage: "umur-piutang",
        action: { type: "page", pageId: "umur-piutang" },
      },
      {
        id: "umur-hutang",
        label: "Umur Hutang",
        icon: "clock",
        dataPage: "umur-hutang",
        action: { type: "page", pageId: "umur-hutang" },
      },
      {
        id: "kartu-piutang",
        label: "Kartu Piutang",
        icon: "file-spreadsheet",
        dataPage: "kartu-piutang",
        action: { type: "page", pageId: "kartu-piutang" },
      },
      {
        id: "kartu-hutang",
        label: "Kartu Hutang",
        icon: "file-spreadsheet",
        dataPage: "kartu-hutang",
        action: { type: "page", pageId: "kartu-hutang" },
      },
      {
        id: "penawaran",
        label: "Penawaran",
        icon: "file-text",
        dataPage: "penawaran",
        action: { type: "page", pageId: "penawaran" },
      },
      {
        id: "pesanan-jual",
        label: "Pesanan Jual",
        icon: "clipboard-list",
        dataPage: "pesanan-jual",
        action: { type: "page", pageId: "pesanan-jual" },
      },
      {
        id: "rekonsiliasi",
        label: "Rekonsiliasi",
        icon: "git-compare",
        dataPage: "rekonsiliasi",
        action: { type: "page", pageId: "rekonsiliasi" },
      },
      {
        id: "kurs",
        label: "Kurs",
        icon: "circle-dollar-sign",
        dataPage: "kurs",
        action: { type: "page", pageId: "kurs" },
      },
      {
        id: "notifikasi",
        label: "Notifikasi",
        icon: "bell",
        dataPage: "notifikasi",
        action: { type: "page", pageId: "notifikasi" },
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
    subtitle: "Garis Lurus · Saldo Menurun · SYD · Unit Produksi",
  },
  "kalk-persediaan": {
    title: "Persediaan",
    subtitle: "FIFO · LIFO · Weighted Average · Moving Average",
  },
  "kalk-bunga": {
    title: "Bunga & Anuitas",
    subtitle: "Bunga Tunggal · Majemuk · Cicilan · PV/FV",
  },
  "kalk-rasio": {
    title: "Rasio Keuangan",
    subtitle: "Likuiditas · Solvabilitas · Profitabilitas · Aktivitas",
  },
  "kalk-bep": {
    title: "BEP & Margin",
    subtitle: "Break Even · Contribution Margin · Margin of Safety",
  },
  "ai-assistant": {
    title: "Orias Assisten",
    subtitle: "Asisten keuangan berbasis AI",
  },
  tutorial: {
    title: "Tutorial",
    subtitle: "Panduan penggunaan software langkah demi langkah",
  },
  analitik: {
    title: "Analitik & Tren Bisnis",
    subtitle: "Pendapatan · Laba · Arus Kas · Posisi Keuangan · Proyeksi",
  },
  "jurnal-berulang": {
    title: "Jurnal Berulang",
    subtitle: "Otomasi transaksi rutin · Gaji · Sewa · Cicilan",
  },
  invoice: {
    title: "Invoice & Piutang",
    subtitle: "Buat invoice · Lacak pembayaran · Jurnal otomatis",
  },
  bill: {
    title: "Tagihan Pembelian",
    subtitle: "Tagihan dari supplier · Utang usaha · Jatuh tempo",
  },
  "umur-piutang": {
    title: "Umur Piutang",
    subtitle: "Piutang belum lunas per pelanggan · Bucket 0-30, 31-60, 61-90, >90 hari",
  },
  "umur-hutang": {
    title: "Umur Hutang",
    subtitle: "Utang usaha belum lunas per supplier · Bucket 0-30, 31-60, 61-90, >90 hari",
  },
  "kartu-piutang": {
    title: "Kartu Piutang",
    subtitle: "Invoice, pembayaran, dan saldo berjalan per pelanggan",
  },
  "kartu-hutang": {
    title: "Kartu Hutang",
    subtitle: "Tagihan, pembayaran, dan saldo berjalan per supplier",
  },
  penawaran: {
    title: "Penawaran",
    subtitle: "Penawaran harga ke pelanggan · Dasar pesanan penjualan",
  },
  "pesanan-jual": {
    title: "Pesanan Penjualan",
    subtitle: "Dibuat dari penawaran disetujui · Dasar faktur penjualan",
  },
  rekonsiliasi: {
    title: "Rekonsiliasi Bank",
    subtitle: "Cocokkan mutasi bank dengan jurnal · Upload CSV",
  },
  kurs: {
    title: "Multi Mata Uang",
    subtitle: "Kurs otomatis · Konversi transaksi · History kurs",
  },
  notifikasi: {
    title: "Notifikasi & Alert",
    subtitle: "Peringatan otomatis · Batas anggaran · Jatuh tempo",
  },
  anggaran: {
    title: "Anggaran vs Aktual",
    subtitle: "Target per akun · Monitoring realisasi · Variance",
  },
  pajak: {
    title: "Pajak Otomatis",
    subtitle: "PPN 11%/12% · PPh 21 · PPh 23 · Laporan SPT",
  },
  "arus-kas": {
    title: "Laporan Arus Kas",
    subtitle: "Metode Tidak Langsung · PSAK 2",
  },
  "perubahan-ekuitas": {
    title: "Laporan Perubahan Ekuitas",
    subtitle: "Mutasi modal pemilik · PSAK 1",
  },
  produk: {
    title: "Master Produk",
    subtitle: "Daftar produk & layanan · Stok · Harga",
  },
  "aset-tetap": {
    title: "Register Aset Tetap",
    subtitle: "Daftar aset · Penyusutan otomatis · Nilai buku",
  },
  kontak: {
    title: "Master Kontak",
    subtitle: "Pelanggan & Supplier · Histori transaksi",
  },
  "audit-trail": {
    title: "Audit Trail",
    subtitle: "Riwayat aktivitas · Role pengguna · Siapa · Kapan",
  },
  settings: {
    title: "Settings",
    subtitle: "Akun, autentikasi & pengaturan transaksi",
  },
};
