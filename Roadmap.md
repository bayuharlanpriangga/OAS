# Roadmap OAS menuju setara Accurate

Disusun 9 Oktober 2026 · 105 task kecil (ukuran S/M) · dirancang untuk Claude free tier

## 1. Cara pakai dokumen ini

Prinsip: **satu task = satu chat baru = satu commit.** Tidak ada task berukuran besar. Kalau sebuah task terasa besar waktu dikerjakan, pecah dulu sebelum lanjut.

### Ukuran task

- **S**: sekitar 100 baris kode atau kurang; satu file baru, atau satu fungsi diubah. Task riset/desain tanpa kode juga S.
- **M**: sekitar 100-250 baris; maksimal dua file baru plus hook kecil di file lama.
- **Tidak ada L.** Batas free tier bisa berubah dan bergantung pada panjang percakapan, jadi ukuran ini adalah perkiraan yang sengaja konservatif, bukan angka pasti.
- Tanda ⚠ = menyentuh stok atau jurnal. Ekspor backup .oas dulu dan kerjakan di branch terpisah.

### Aturan agar hemat limit

1. Jangan lampirkan seluruh zip. File besar (14-export.js ±188 KB, 13-analitik-dashboard.js ±98 KB, 16-auth-company.js ±84 KB) cukup ditempel potongan fungsi yang relevan saja.
2. Fitur baru ditulis di modul baru (js/23-xxx.js dan seterusnya) dan hanya menyentuh file lama lewat hook maksimal 10 baris. Dengan begitu task tidak perlu membaca file besar.
3. Urutan kerja tiap fitur: fungsi murni + tes Node dulu, lalu halaman kosong + navigasi, lalu isi UI, lalu pasang ke alur lama. Tiap tahap berdiri sendiri, jadi berhenti di tengah tidak merusak perilaku lama.
4. Minta Claude menjawab dengan file hasil saja, tanpa penjelasan panjang.
5. Kalau limit habis di tengah task: simpan keluaran yang sudah ada, jalankan node --check, commit hanya kalau lulus. Lanjutkan di chat baru dengan: 'Lanjutkan task X. Sudah ada: ... Sisa: ...'.

### Kode di kolom Lampirkan

- **SCH** = potongan docs/SCHEMA.md yang relevan
- **CR** = js/22-cloud-records.js (kecil, boleh utuh)
- **FM** = docs/FILE\_MAP.md (dibuat di task 0.1) untuk mencari fungsi, lalu tempel potongan fungsinya saja
- **INV** = potongan pembuatan objek invoice + jurnalnya di 11-kontak-invoice.js
- **STK** = potongan mutasi stok di 08-kartu-stock.js / 09-produk.js
- **IDX** = potongan index.html tempat page/navigasi terkait
- **TES** = tests/cloud-records.test.js sebagai contoh gaya tes

### Definisi selesai (semua task)

node --check lulus · tes lama (akuntansi.test.js, cloud-records.test.js) tetap lulus · tes baru lulus bila ada logika hitung · satu skenario dicoba manual di browser · SCHEMA.md diperbarui bila menambah data · commit.

### Template prompt

Task \[ID\] dari docs/ROADMAP.md: \[salin baris tugas\]. Konteks terlampir. Aturan: kode baru di modul baru; hook ke file lama maksimal 10 baris; sertakan tes Node untuk logika hitung; jalankan node --check; jangan ubah apa pun di luar task. Kalau menemukan bug di kode yang disentuh, perbaiki langsung, atau tanya keputusannya sambil tawarkan solusi. Jawab ringkas: file hasil saja.

## 2. Urutan dan titik rilis

- Fase 0 dikerjakan lebih dulu. Task 0.1 dan 0.7-0.8 dipakai fase lain.
- Fase 1 berurutan per kelompok (A, B, C, ...). Kelompok A adalah kemenangan cepat.
- Fase 2 butuh tagihan pembelian (1.5-1.8) untuk PPN masukan dan PPh.
- Fase 3 saling independen setelah Fase 0; gudang mulai dari 3.1.
- Fase 4: rekonsiliasi bank butuh kelompok 1C; impor Accurate butuh Fase 1 selesai.

**Titik rilis**

- **Rilis A** (0.1-0.8 + 1.1-1.4): data aman antar perangkat + umur piutang.
- **Rilis B** (Fase 1 selesai): alur dagang lengkap.
- **Rilis C** (Fase 2): siap PKP.
- **Rilis D** (Fase 3, pilih yang perlu): operasional.
- **Rilis E** (Fase 4): integrasi.

## 3. Fase 0 — Fondasi (12 task)

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 0.1 | Skrip tools/gen-file-map.js (dijalankan lokal, tanpa AI) yang menulis docs/FILE\_MAP.md: daftar fungsi + rentang baris tiap file js/ | S | tidak ada |
| 0.2 | Uji manual sinkron di Supabase asli: jalankan SQL, login, unggah data lama, buat invoice, buka di browser lain, hapus invoice, ganti bisnis, putus internet saat simpan. Catat yang gagal | S (tanpa AI) | checklist ini |
| 0.3 | Tambah kind jurnal\_berulang dan anggaran ke CLOUD\_RECORD\_KINDS + tes | S | CR, TES, potongan saveFiturBaru |
| 0.4 | Tambah kind alert dan kurs (cek dulu bentuknya: array atau objek) | S | CR, potongan deklarasi di 01-state.js |
| 0.5 | Reset Semua Data ikut menghapus semua record cloud (setelah cakupan reset diputuskan) | S | CR, potongan doResetAll di 15-storage.js |
| 0.6 | Pastikan js/db-adapter.js tidak dipakai (grep), lalu hapus duplikatnya | S | hasil grep |
| 0.7 | js/23-penomoran.js: fungsi murni nomorBerikut(jenis, tahun, daftarNomor) + tes | S | TES |
| 0.8 | Simpan counter ke cloud (kind counter) dan pakai untuk nomor invoice, menggantikan length+1 | S | 23-penomoran.js, CR, potongan nomor invoice di 19-fitur-tambahan.js |
| 0.9 | Desain akses anggota tim: baca RLS dan alur gabung bisnis, hasilkan keputusan desain 1 halaman (tanpa kode) | S | SCH bagian RLS, potongan daftar bisnis di 16 |
| 0.10 | SQL policy company\_records untuk anggota sesuai peran dari 0.9 | S | SQL 001, hasil 0.9 |
| 0.11 | Client: tampilkan bisnis tempat user menjadi anggota dan muat company\_records-nya | M | potongan selectCompany + daftar bisnis di 16, CR |
| 0.12 | Peran viewer = hanya baca: blok tulis di cloudSyncRecords dan tombol simpan | S | CR, potongan izin peran |

## 4. Fase 1 — Alur transaksi (31 task)

### 1A. Umur piutang

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 1.1 | Fungsi murni hitungAging(daftar, tanggalAcuan) dengan bucket 0-30, 31-60, 61-90, >90 hari + tes | S | INV (bentuk objek invoice) |
| 1.2 | Halaman 'Umur Piutang' kosong + item navigasi | S | IDX |
| 1.3 | Isi tabel umur piutang per kontak memakai 1.1 | S | 1.1, potongan render tabel invoice |
| 1.4 | Ekspor umur piutang ke CSV dan cetak | S | 1.3 |

### 1B. Tagihan pembelian (bill)

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 1.5 | Model data bill (kind bill) di CLOUD\_RECORD\_KINDS + update SCHEMA.md | S | CR, SCH |
| 1.6 | Halaman 'Tagihan Pembelian' kosong + navigasi | S | IDX |
| 1.7 | Form bill (supplier, tanggal, jatuh tempo, item, PPN): simpan saja, belum ada jurnal | M | 1.5, INV sebagai pola |
| 1.8 | ⚠ Jurnal otomatis bill: Dr Persediaan/Beban + PPN Masukan, Cr Utang Usaha + tes | M | INV (jurnal invoice sebagai pola) |
| 1.9 | Halaman 'Umur Hutang' memakai 1.1 | S | 1.1, 1.6 |

### 1C. Pembayaran

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 1.10 | Model pembayaran (kind pembayaran: jenis dokumen, id, tanggal, jumlah, akun kas) + fungsi murni sisaTagihan + tes | S | CR, SCH |
| 1.11 | ⚠ Form bayar invoice (boleh parsial) + jurnal Dr Kas, Cr Piutang | M | 1.10, INV |
| 1.12 | Status invoice otomatis dari total pembayaran (belum, sebagian, lunas, jatuh tempo) | S | potongan pemakaian status invoice |
| 1.13 | ⚠ Bayar bill (parsial) + jurnal, meniru pola 1.11 | S | 1.11, 1.7 |
| 1.14 | Alokasi satu pembayaran ke beberapa faktur sekaligus | M | 1.10, 1.11 |

### 1D. Kartu piutang dan hutang

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 1.15 | Kartu piutang per kontak: invoice, pembayaran, saldo berjalan | S | 1.10, 1.3 |
| 1.16 | Kartu hutang per kontak | S | 1.15, 1.9 |

### 1E. Rantai penjualan

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 1.17 | Model dokumen generik (kind dok: jenis, nomor, status, ref asal, item) + fungsi transisi status + tes | S | CR, 23-penomoran.js |
| 1.18 | Penawaran: form + daftar (belum ada jurnal) | M | 1.17, IDX |
| 1.19 | Penawaran → Pesanan Penjualan (salin item, tautkan ref) | S | 1.17, 1.18 |
| 1.20 | Pesanan → Faktur (buat invoice dari pesanan, tandai terpenuhi) | M | 1.19, INV |
| 1.21 | Pesanan sebagian: qty dipesan vs terkirim | S | 1.20 |
| 1.22 | Surat Jalan: dokumen + cetak (belum menyentuh stok) | S | 1.17 |
| 1.23 | ⚠ Surat Jalan mengurangi stok lewat hook ke mutasi stok | M | 1.22, STK |

### 1F. Rantai pembelian

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 1.24 | Pesanan Pembelian memakai model dok | M | 1.17, 1.7 |
| 1.25 | ⚠ Penerimaan Barang menambah stok | M | 1.24, STK |
| 1.26 | Pesanan Pembelian → Bill | S | 1.24, 1.7 |

### 1G. Retur

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 1.27 | Retur Penjualan: dokumen + validasi qty tidak melebihi yang terjual | S | 1.17, 1.20 |
| 1.28 | ⚠ Jurnal pembalik + stok masuk untuk retur penjualan | M | 1.27, STK, INV |
| 1.29 | Retur Pembelian: dokumen + validasi | S | 1.17, 1.26 |
| 1.30 | ⚠ Jurnal pembalik + stok keluar untuk retur pembelian | M | 1.29, STK |
| 1.31 | Tampilkan retur di kartu piutang dan hutang | S | 1.15, 1.16 |

## 5. Fase 2 — Pajak (16 task)

Aturan pajak berubah. Sebelum 2.4, 2.11, dan 2.15 dikerjakan, pastikan 2.1 sudah menghasilkan rujukan terbaru dari sumber resmi DJP, jangan mengandalkan ingatan model.

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 2.1 | Riset (chat dengan web search, tanpa kode): format dan aturan terbaru e-Faktur/Coretax, tarif PPN, PPh 23 dan 4(2). Hasil: docs/PAJAK\_REF.md maksimal 1 halaman dengan sumber | S | tidak ada |
| 2.2 | Field NPWP/NIK pada kontak + validasi format | S | potongan form kontak |
| 2.3 | Profil bisnis: NPWP, status PKP, alamat (cek dulu apa yang sudah ada) | S | potongan profil di 16 |
| 2.4 | Model faktur pajak (kind fp: nomor seri, tanggal, DPP, PPN, ref invoice) + tes hitung | S | 2.1, CR |
| 2.5 | Tombol 'Buat faktur pajak' di detail invoice | M | 2.4, INV |
| 2.6 | Daftar faktur pajak + status draf, terbit, batal | S | 2.4, IDX |
| 2.7 | Rekap PPN keluaran per masa | S | 2.4 |
| 2.8 | Catat nomor faktur pajak supplier pada bill | S | 1.7 |
| 2.9 | Rekap PPN masukan per masa | S | 2.8 |
| 2.10 | Ringkasan SPT Masa PPN: keluaran dikurangi masukan, kompensasi | S | 2.7, 2.9 |
| 2.11 | Tabel tarif PPh 23 dan 4(2) + fungsi hitung + tes | S | 2.1 |
| 2.12 | ⚠ Potong PPh saat bayar bill (jurnal Utang PPh) | M | 2.11, 1.13 |
| 2.13 | Daftar bukti potong yang diterbitkan | S | 2.12 |
| 2.14 | Cetak bukti potong (HTML siap print) | S | 2.13 |
| 2.15 | Ekspor CSV/XML sesuai format dari 2.1 | M | 2.1, 2.6 |
| 2.16 | Rekap bulanan PPh untuk pelaporan | S | 2.13 |

## 6. Fase 3 — Operasional (25 task, pilih yang dibutuhkan)

### 3A. Multi-gudang

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 3.1 | Investigasi struktur multiKartuStock dan mutasi stok: ringkasan 1 halaman, tanpa kode | S | STK, SCH bagian stok |
| 3.2 | Master gudang (kind gudang) | S | CR |
| 3.3 | ⚠ Tambah dimensi gudang pada mutasi stok (default gudang utama, data lama tetap valid) | M | 3.1, STK |
| 3.4 | Model transfer stok antar gudang + tes | S | 3.3 |
| 3.5 | UI transfer stok | S | 3.4, IDX |
| 3.6 | Laporan stok per gudang | S | 3.3 |

### 3B. Serial dan batch

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 3.7 | Model batch (nomor, kedaluwarsa, qty) + tes | S | 3.1 |
| 3.8 | ⚠ Input batch saat penerimaan dan penjualan, urut FEFO | M | 3.7, STK |
| 3.9 | Laporan batch dan kedaluwarsa | S | 3.7 |

### 3C. Proyek / departemen

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 3.10 | Master dimensi (proyek, departemen) | S | CR |
| 3.11 | ⚠ Tag dimensi pada baris jurnal lewat hook di fungsi pembuat jurnal | M | 3.10, FM |
| 3.12 | Laporan laba rugi per dimensi | S | 3.11 |

### 3D. Approval

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 3.13 | Model aturan + status (draf, diajukan, disetujui, ditolak) + tes | S | TES |
| 3.14 | UI ajukan dan setujui, tercatat di audit trail | M | 3.13, potongan auditLog |
| 3.15 | Pasang ke bill dan jurnal manual dengan ambang nominal | S | 3.14, 1.7 |

### 3E. Payroll sederhana

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 3.16 | Master karyawan (kind karyawan) | S | CR |
| 3.17 | Riset (web search, tanpa kode): aturan PPh 21 terbaru, PTKP, BPJS. Hasil: docs/PAYROLL\_REF.md | S | tidak ada |
| 3.18 | Fungsi murni hitung gaji bersih berdasarkan 3.17 + tes | M | 3.17 |
| 3.19 | Input gaji bulanan (tunjangan, potongan) | S | 3.16, 3.18 |
| 3.20 | ⚠ Jurnal gaji: Dr Beban Gaji, Cr Utang Gaji, Utang PPh 21, Utang BPJS | M | 3.19, INV |
| 3.21 | Slip gaji cetak | S | 3.19 |
| 3.22 | Rekap PPh 21 bulanan | S | 3.20 |

### 3F. Selisih kurs

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 3.23 | Field mata uang dan kurs pada transaksi | S | potongan data kurs |
| 3.24 | ⚠ Selisih kurs realisasi saat pembayaran + jurnal | M | 3.23, 1.11 |
| 3.25 | Revaluasi akhir periode | M | 3.24 |

## 7. Fase 4 — Integrasi (21 task)

### 4A. Bank

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 4.1 | Parser CSV mutasi bank dengan pemetaan kolom (tanggal, keterangan, debit, kredit) + tes | S | satu contoh CSV yang sudah dianonimkan |
| 4.2 | UI impor: pilih file, pratinjau, atur pemetaan | M | 4.1, IDX |
| 4.3 | Model mutasi bank (kind mutasi) + simpan ke cloud | S | CR |
| 4.4 | Pencocokan otomatis tepat: nominal sama dan tanggal dalam selisih sekian hari | S | 4.3, 1.10 |
| 4.5 | Aturan kata kunci → akun, bisa disimpan | S | 4.3 |
| 4.6 | ⚠ Buat jurnal dari baris mutasi | M | 4.5, INV |
| 4.7 | Laporan rekonsiliasi: saldo bank vs saldo buku | S | 4.3, 4.6 |

### 4B. Impor dari Accurate

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 4.8 | Analisis format ekspor Accurate dari contoh file milikmu (anonimkan), tanpa kode | S | contoh file |
| 4.9 | Pemetaan akun COA Accurate → OAS | S | 4.8 |
| 4.10 | ⚠ Impor saldo awal | S | 4.9 |
| 4.11 | Impor kontak dan produk | S | 4.8, CR |
| 4.12 | ⚠ Impor invoice dan bill yang masih terbuka | M | 4.8, 1.10 |

### 4C. API

Catatan: OAS di GitHub Pages bersifat statis, jadi API perlu Supabase Edge Function atau PostgREST dengan kunci API.

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 4.13 | Desain API (endpoint, autentikasi, batas akses), tanpa kode | S | SCH |
| 4.14 | Tabel api\_keys (simpan hash) + RLS | S | SQL 001 sebagai pola |
| 4.15 | Edge Function: baca invoice | M | 4.13, 4.14 |
| 4.16 | Edge Function: buat invoice | M | 4.15, INV |
| 4.17 | Dokumentasi API di docs/API.md | S | 4.15, 4.16 |

### 4D. POS (opsional, hanya bila menyasar toko)

| ID | Tugas | Uk | Lampirkan |
| --- | --- | --- | --- |
| 4.18 | Model penjualan tunai + keranjang + tes | S | 1.17 |
| 4.19 | UI kasir | M | 4.18, IDX |
| 4.20 | Cetak struk | S | 4.19 |
| 4.21 | ⚠ Tutup kasir harian + jurnal ringkasan | M | 4.19, INV |

## 8. Keputusan yang masih terbuka

1. **Cakupan Reset Semua Data** (menentukan 0.5): jurnal saja, atau juga invoice, kontak, aset, dan produk. Usulan: semua, dengan teks konfirmasi yang menyebut satu per satu.
2. **Akses anggota tim** (0.9): anggota boleh baca/tulis apa saja per peran? Sekarang RLS hanya untuk pemilik.
3. **Target pengguna**: dagang, jasa, atau keduanya. Ini menentukan apakah Fase 3 (gudang, batch) dan POS perlu dikerjakan.
4. **Aturan pajak dan payroll** harus dicek ulang dari sumber resmi saat 2.1 dan 3.17 dikerjakan; jangan memakai angka dari ingatan model.
