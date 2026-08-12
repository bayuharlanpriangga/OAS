# OAS — Orias Accounting System

**Software akuntansi lengkap berbasis web** untuk UMKM dan bisnis kecil-menengah: jurnal otomatis, laporan keuangan standar, invoice, kalkulator akuntansi, analitik bisnis, dan asisten AI — semua dalam satu aplikasi.

🔗 **Demo:** [bayuharlanpriangga.github.io/OAS](https://bayuharlanpriangga.github.io/OAS)

---

## ✨ Fitur Utama

### 📒 Pencatatan & Jurnal
- Input transaksi cepat (kas masuk/keluar, penjualan, pembelian) tanpa perlu paham debit-kredit
- Jurnal manual dengan validasi balance otomatis
- Jurnal berulang (recurring) untuk gaji, sewa, cicilan, langganan
- Jurnal penyesuaian siap pakai (penyusutan, akrual, dibayar dimuka, dll)

### 📊 Laporan Keuangan
- Buku Besar, Neraca Saldo
- Laba Rugi, Neraca (Balance Sheet)
- Arus Kas (metode tidak langsung, PSAK 2)
- Perubahan Ekuitas (PSAK 1)
- Export ke PDF (multi template), Excel (dengan formula aktif), dan CSV

### 🧮 Kalkulator Akuntansi
- Penyusutan aset (Garis Lurus, Saldo Menurun, Sum of Years, Unit Produksi)
- Persediaan (FIFO, LIFO, Weighted Average, Moving Average)
- PPN & PPh (PPh 21, PPh 23, PPh Badan — tarif terbaru PMK 168/2023)
- BEP & Margin (contribution margin, margin of safety)
- Rasio Keuangan (20+ rasio likuiditas, solvabilitas, profitabilitas, aktivitas, pasar)
- Bunga & Anuitas (bunga tunggal/majemuk, PV/FV, cicilan kredit, diskonto wesel)

### 🧾 Operasional Bisnis
- Invoice & Piutang dengan tracking status pembayaran
- Rekonsiliasi bank otomatis (BCA, Mandiri, BNI, BRI, CIMB — upload CSV)
- Multi mata uang (IDR, USD, SGD, EUR, MYR, JPY)
- Anggaran vs Aktual dengan variance analysis
- Notifikasi & alert (arus kas negatif, jatuh tempo invoice, anggaran terlampaui)
- Master data produk, kontak (pelanggan/supplier), dan Chart of Accounts

### 📈 Analitik & AI
- 10+ grafik analitik: tren laba, arus kas, proyeksi 3 bulan (regresi linear), waterfall laba rugi, dan lainnya
- **Orias Assisten** — AI accounting assistant (Llama 3.3 70B via Groq API, gratis) yang bisa mencatat transaksi dari kalimat natural, menghitung kalkulasi, dan memberi analisis laporan keuangan

### 👥 Multi-bisnis & Tim
- Kelola banyak bisnis dalam satu akun
- Kolaborasi tim dengan role & izin akses per modul
- Sinkronisasi cloud (Supabase) + fallback localStorage, backup/restore file `.bhp`

---

## 🛠️ Teknologi

- **Frontend:** Vanilla HTML, CSS, JavaScript (single-page app)
- **Backend:** [Supabase](https://supabase.com) (autentikasi & database), dengan `localStorage` sebagai cache/fallback offline
- **AI:** Groq API (Llama 3.3 70B) untuk fitur Orias Assisten
- **PWA:** Bisa di-install sebagai aplikasi di desktop maupun mobile

---

## 📚 Dokumentasi Teknis

- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — struktur modul, urutan load, alur boot, dan dependency antar file JS
- [`docs/SCHEMA.md`](./docs/SCHEMA.md) — skema database Supabase, struktur `localStorage`, dan bentuk state runtime

---

## 🚀 Menjalankan

Aplikasi ini adalah single-page web app statis. Untuk menjalankan secara lokal:

```bash
git clone https://github.com/bayuharlanpriangga/OAS.git
cd OAS
# buka index.html langsung di browser, atau jalankan local server:
python -m http.server 8000
```

Untuk fitur sinkronisasi cloud dan Orias Assisten, dibutuhkan konfigurasi:
- **Supabase** — URL & anon key project Supabase Anda
- **Groq API key** — didapat gratis di [console.groq.com/keys](https://console.groq.com/keys), disimpan langsung di browser (tidak dikirim ke server manapun)

---

## 📄 Lisensi

Dikembangkan oleh **Bayu Harlan Priangga**.
