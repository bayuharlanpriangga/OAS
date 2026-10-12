# Roadmap OAS menuju setara Accurate

Disusun 9 Oktober 2026, direvisi 12 Oktober 2026 · 25 fase · 135 task kecil (semua ukuran S) · dirancang untuk Claude free tier

## 1. Cara pakai dokumen ini

Prinsip: **satu task = satu chat baru = satu commit.** Semua task berukuran kecil. Task yang dulu berukuran M sudah dipecah jadi dua task S (biasanya: fungsi murni + tes dulu, lalu dipasang ke alur lama). Kalau sebuah task tetap terasa besar waktu dikerjakan, pecah dulu sebelum lanjut.

**Progres: 7/135 task selesai.**

Checklist: kolom ✓ di tiap tabel. Setelah task lulus definisi selesai dan di-commit, ganti ☐ menjadi ☑ (boleh diminta ke Claude di akhir task).

Penomoran: fase dimulai dari **Fase 1**. ID task berbentuk `fase.urutan` (misal 4.3 = task ke-3 di Fase 4). Tiap fase maksimal 9 task dan aman dihentikan di akhir task mana pun.

### Ukuran task

- **S**: sekitar 100 baris kode atau kurang; satu file baru, atau satu fungsi diubah. Task riset/desain tanpa kode juga S.
- **Tidak ada M atau L.** Batas free tier bisa berubah dan bergantung pada panjang percakapan, jadi ukuran ini adalah perkiraan yang sengaja konservatif, bukan angka pasti.
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
- **FM** = docs/FILE_MAP.md (dibuat di task 1.1) untuk mencari fungsi, lalu tempel potongan fungsinya saja
- **INV** = potongan pembuatan objek invoice + jurnalnya di 11-kontak-invoice.js
- **STK** = potongan mutasi stok di 08-kartu-stock.js / 09-produk.js
- **IDX** = potongan index.html tempat page/navigasi terkait
- **TES** = tests/cloud-records.test.js sebagai contoh gaya tes
- Angka seperti 4.3 = keluaran task tersebut (kode atau dokumen hasilnya)

### Definisi selesai (semua task)

node --check lulus · tes lama (akuntansi.test.js, cloud-records.test.js) tetap lulus · tes baru lulus bila ada logika hitung · satu skenario dicoba manual di browser · SCHEMA.md diperbarui bila menambah data · commit.

### Template prompt

Task [ID] dari docs/ROADMAP.md: [salin baris tugas]. Konteks terlampir. Aturan: kode baru di modul baru; hook ke file lama maksimal 10 baris; sertakan tes Node untuk logika hitung; jalankan node --check; jangan ubah apa pun di luar task. Kalau menemukan bug di kode yang disentuh, perbaiki langsung, atau tanya keputusannya sambil tawarkan solusi. Jawab ringkas: file hasil saja.

## 2. Urutan dan titik rilis

- Fase 1 dikerjakan lebih dulu. Task 1.1 dan 1.7-1.8 dipakai fase lain.
- Fase 2 (umur piutang) adalah kemenangan cepat. Fase 3 (akses tim) independen, boleh kapan saja setelah Fase 1.
- Fase 4-10 berurutan: tagihan pembelian → pembayaran → kartu → penjualan → surat jalan → pembelian → retur.
- Fase 11-13 (pajak) butuh tagihan pembelian (4.1-4.6) dan pembayaran bill (5.5).
- Fase 14-20 saling independen setelah Fase 1; multi-gudang (Fase 14) mulai dari investigasi.
- Fase 21-22 (bank) butuh pembayaran (Fase 5); impor Accurate (Fase 23) butuh Fase 4-10 selesai.

**Titik rilis**

- **Rilis A** (Fase 1-2): data aman antar perangkat + umur piutang.
- **Rilis B** (Fase 4-10): alur dagang lengkap.
- **Rilis C** (Fase 11-13): siap PKP.
- **Rilis D** (Fase 14-20, pilih yang perlu): operasional.
- **Rilis E** (Fase 21-25): integrasi.

## 3. Daftar fase

| Fase | Nama | Selesai |
| --- | --- | --- |
| 1 | Fondasi data | 7/8 |
| 2 | Umur piutang | 0/4 |
| 3 | Akses anggota tim | 0/5 |
| 4 | Tagihan pembelian (bill) | 0/7 |
| 5 | Pembayaran | 0/7 |
| 6 | Kartu piutang/hutang dan model dokumen | 0/3 |
| 7 | Penawaran sampai faktur | 0/6 |
| 8 | Surat jalan | 0/3 |
| 9 | Pesanan dan penerimaan pembelian | 0/5 |
| 10 | Retur | 0/7 |
| 11 | Pajak: dasar dan PPN keluaran | 0/8 |
| 12 | Pajak: PPN masukan dan SPT | 0/3 |
| 13 | Pajak: PPh dan ekspor | 0/8 |
| 14 | Multi-gudang | 0/7 |
| 15 | Batch dan kedaluwarsa | 0/4 |
| 16 | Proyek / departemen | 0/4 |
| 17 | Approval | 0/4 |
| 18 | Payroll: dasar | 0/5 |
| 19 | Payroll: jurnal dan laporan | 0/4 |
| 20 | Selisih kurs | 0/5 |
| 21 | Bank: impor mutasi | 0/4 |
| 22 | Bank: pencocokan dan rekonsiliasi | 0/5 |
| 23 | Impor dari Accurate | 0/6 |
| 24 | API | 0/7 |
| 25 | POS (opsional, hanya bila menyasar toko) | 0/6 |

## Fase 1 — Fondasi data (8 task)

Dikerjakan paling awal. 1.1 dan 1.7-1.8 dipakai fase lain.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☑ | 1.1 | Skrip `tools/gen-file-map.js` (dijalankan lokal, tanpa AI) yang menulis `docs/FILE_MAP.md`: daftar fungsi + rentang baris tiap file js/ | tidak ada |
| ☐ | 1.2 | Uji manual sinkron di Supabase asli: jalankan SQL, login, unggah data lama, buat invoice, buka di browser lain, hapus invoice, ganti bisnis, putus internet saat simpan. Catat yang gagal (tanpa AI) | checklist ini |
| ☑ | 1.3 | Tambah kind `jurnal_berulang` dan `anggaran` ke CLOUD_RECORD_KINDS + tes | CR, TES, potongan saveFiturBaru |
| ☑ | 1.4 | Tambah kind `alert` dan `kurs` (cek dulu bentuknya: array atau objek) | CR, potongan deklarasi di 01-state.js |
| ☑ | 1.5 | Reset Data dengan pilihan jenis data (jurnal, invoice, kontak, aset, produk, dll); yang dipilih ikut terhapus dari cloud | CR, potongan doResetAll di 15-storage.js |
| ☑ | 1.6 | Pastikan `js/db-adapter.js` tidak dipakai (grep), lalu hapus duplikatnya | hasil grep |
| ☑ | 1.7 | `js/23-penomoran.js`: fungsi murni nomorBerikut(jenis, tahun, daftarNomor) + tes | TES |
| ☑ | 1.8 | Simpan counter ke cloud (kind `counter`) dan pakai untuk nomor invoice, menggantikan length+1 | 23-penomoran.js, CR, potongan nomor invoice di 19-fitur-tambahan.js |

**Temuan uji 1.2 (sudah diperbaiki di `22-cloud-records.js`, tes di `tests/cloud-records.test.js`):**
- Invoice yang dibuat saat offline hilang kalau halaman di-refresh setelah online (cache ditimpa data cloud). Sekarang perubahan yang belum tersinkron dideteksi lewat snapshot hash (`oas_rec_snaph_<cid>`), diterapkan di atas data cloud, lalu dikirim ulang.
- Gagal sinkron hanya tercatat di Console. Sekarang user diberi peringatan (sekali per rentetan gagal), dan request yang menggantung diberi batas waktu 20 detik supaya tidak memblokir antrean.
- Dialog "Unggah Data Lokal ke Cloud?" muncul di browser kedua untuk data yang sebenarnya sudah ada di cloud. Sekarang hanya data yang baru/berbeda dari cloud yang ditawarkan.
- Dropdown pindah akun mati begitu akun kedua ditambahkan: `escJsAttr` dipanggil di `21-settings.js` (switcher) dan `05-akun.js` (tombol Restore akun terhapus) tetapi tidak pernah didefinisikan. Diganti `escapeForJsAttr`; tes `tests/akun-switcher.test.js` ikut memeriksa semua helper `esc*` terdefinisi.
- Langkah 1.2 yang belum diuji: 8c (reload saat offline), 9 (reset data), 10 (penomoran lintas browser).

## Fase 2 — Umur piutang (4 task)

Kemenangan cepat. Selesai fase ini = Rilis A.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 2.1 | Fungsi murni hitungAging(daftar, tanggalAcuan) dengan bucket 0-30, 31-60, 61-90, >90 hari + tes | INV (bentuk objek invoice) |
| ☐ | 2.2 | Halaman 'Umur Piutang' kosong + item navigasi | IDX |
| ☐ | 2.3 | Isi tabel umur piutang per kontak memakai 2.1 | 2.1, potongan render tabel invoice |
| ☐ | 2.4 | Ekspor umur piutang ke CSV dan cetak | 2.3 |

## Fase 3 — Akses anggota tim (5 task)

Independen: boleh dikerjakan kapan saja setelah Fase 1.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 3.1 | Desain akses anggota tim: baca RLS dan alur gabung bisnis, hasilkan keputusan desain 1 halaman (tanpa kode) | SCH bagian RLS, potongan daftar bisnis di 16 |
| ☐ | 3.2 | SQL policy `company_records` untuk anggota sesuai peran dari 3.1 | SQL 001, hasil 3.1 |
| ☐ | 3.3 | Client: tampilkan bisnis tempat user menjadi anggota di daftar bisnis | potongan selectCompany + daftar bisnis di 16 |
| ☐ | 3.4 | Client: muat `company_records` bisnis anggota ke state | CR, 3.3 |
| ☐ | 3.5 | Peran viewer = hanya baca: blok tulis di cloudSyncRecords dan tombol simpan | CR, potongan izin peran |

## Fase 4 — Tagihan pembelian (bill) (7 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 4.1 | Model data bill (kind `bill`) di CLOUD_RECORD_KINDS + update SCHEMA.md | CR, SCH |
| ☐ | 4.2 | Halaman 'Tagihan Pembelian' kosong + navigasi | IDX |
| ☐ | 4.3 | Form bill: tampilan input (supplier, tanggal, jatuh tempo, item, PPN), belum menyimpan | 4.1, INV sebagai pola |
| ☐ | 4.4 | Simpan bill ke cloud + daftar bill, belum ada jurnal | 4.3, CR |
| ☐ | 4.5 | Fungsi murni buatJurnalBill(bill): Dr Persediaan/Beban + PPN Masukan, Cr Utang Usaha + tes (belum dipasang) | INV (jurnal invoice sebagai pola) |
| ☐ | 4.6 | ⚠ Pasang jurnal bill ke alur simpan bill lewat hook | 4.5, 4.4 |
| ☐ | 4.7 | Halaman 'Umur Hutang' memakai 2.1 | 2.1, 4.2 |

## Fase 5 — Pembayaran (7 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 5.1 | Model pembayaran (kind `pembayaran`: jenis dokumen, id, tanggal, jumlah, akun kas) + fungsi murni sisaTagihan + tes | CR, SCH |
| ☐ | 5.2 | Form bayar invoice (boleh parsial), simpan record pembayaran, belum ada jurnal | 5.1, INV |
| ☐ | 5.3 | ⚠ Jurnal bayar invoice: Dr Kas, Cr Piutang, dipasang lewat hook | 5.2, INV |
| ☐ | 5.4 | Status invoice otomatis dari total pembayaran (belum, sebagian, lunas, jatuh tempo) | potongan pemakaian status invoice |
| ☐ | 5.5 | ⚠ Bayar bill (parsial) + jurnal, meniru pola 5.3 | 5.3, 4.4 |
| ☐ | 5.6 | Fungsi murni alokasi satu pembayaran ke beberapa faktur + tes | 5.1 |
| ☐ | 5.7 | UI alokasi pembayaran ke beberapa faktur sekaligus | 5.6, 5.3 |

## Fase 6 — Kartu piutang/hutang dan model dokumen (3 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 6.1 | Kartu piutang per kontak: invoice, pembayaran, saldo berjalan | 5.1, 2.3 |
| ☐ | 6.2 | Kartu hutang per kontak | 6.1, 4.7 |
| ☐ | 6.3 | Model dokumen generik (kind `dok`: jenis, nomor, status, ref asal, item) + fungsi transisi status + tes | CR, 23-penomoran.js |

## Fase 7 — Penawaran sampai faktur (6 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 7.1 | Penawaran: form input (belum menyimpan) | 6.3, IDX |
| ☐ | 7.2 | Penawaran: simpan + daftar (belum ada jurnal) | 7.1 |
| ☐ | 7.3 | Penawaran → Pesanan Penjualan (salin item, tautkan ref) | 6.3, 7.2 |
| ☐ | 7.4 | Fungsi murni pesananKeInvoice(pesanan) yang menyalin item jadi objek invoice + tes (belum dipasang) | 7.3, INV |
| ☐ | 7.5 | Tombol 'Buat faktur' di pesanan: pakai 7.4, tandai terpenuhi | 7.4, INV |
| ☐ | 7.6 | Pesanan sebagian: qty dipesan vs terkirim | 7.5 |

## Fase 8 — Surat jalan (3 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 8.1 | Surat Jalan: dokumen + cetak (belum menyentuh stok) | 6.3 |
| ☐ | 8.2 | Fungsi murni mutasi stok keluar dari surat jalan + tes (belum dipasang) | 8.1, STK |
| ☐ | 8.3 | ⚠ Surat Jalan mengurangi stok: pasang 8.2 lewat hook ke mutasi stok | 8.2, STK |

## Fase 9 — Pesanan dan penerimaan pembelian (5 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 9.1 | Pesanan Pembelian: form input memakai model dok | 6.3, 4.3 |
| ☐ | 9.2 | Pesanan Pembelian: simpan + daftar | 9.1 |
| ☐ | 9.3 | Fungsi murni mutasi stok masuk dari penerimaan barang + tes (belum dipasang) | 9.2, STK |
| ☐ | 9.4 | ⚠ Penerimaan Barang menambah stok: pasang 9.3 lewat hook | 9.3, STK |
| ☐ | 9.5 | Pesanan Pembelian → Bill | 9.2, 4.4 |

## Fase 10 — Retur (7 task)

Selesai fase 4-10 = Rilis B.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 10.1 | Retur Penjualan: dokumen + validasi qty tidak melebihi yang terjual | 6.3, 7.5 |
| ☐ | 10.2 | Fungsi murni jurnal pembalik + mutasi stok masuk untuk retur penjualan + tes (belum dipasang) | 10.1, INV |
| ☐ | 10.3 | ⚠ Pasang 10.2 ke alur retur penjualan lewat hook | 10.2, STK |
| ☐ | 10.4 | Retur Pembelian: dokumen + validasi | 6.3, 9.5 |
| ☐ | 10.5 | Fungsi murni jurnal pembalik + mutasi stok keluar untuk retur pembelian + tes (belum dipasang) | 10.4, STK |
| ☐ | 10.6 | ⚠ Pasang 10.5 ke alur retur pembelian lewat hook | 10.5, STK |
| ☐ | 10.7 | Tampilkan retur di kartu piutang dan hutang | 6.1, 6.2 |

## Fase 11 — Pajak: dasar dan PPN keluaran (8 task)

Aturan pajak berubah. Sebelum 11.4, 13.1, dan 13.7 dikerjakan, pastikan 11.1 sudah menghasilkan rujukan terbaru dari sumber resmi DJP, jangan mengandalkan ingatan model.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 11.1 | Riset (chat dengan web search, tanpa kode): format dan aturan terbaru e-Faktur/Coretax, tarif PPN, PPh 23 dan 4(2). Hasil: `docs/PAJAK_REF.md` maksimal 1 halaman dengan sumber | tidak ada |
| ☐ | 11.2 | Field NPWP/NIK pada kontak + validasi format | potongan form kontak |
| ☐ | 11.3 | Profil bisnis: NPWP, status PKP, alamat (cek dulu apa yang sudah ada) | potongan profil di 16 |
| ☐ | 11.4 | Model faktur pajak (kind `fp`: nomor seri, tanggal, DPP, PPN, ref invoice) + tes hitung | 11.1, CR |
| ☐ | 11.5 | Tombol 'Buat faktur pajak' di detail invoice: tampilan dan pemanggilan model | 11.4, INV |
| ☐ | 11.6 | Simpan faktur pajak dan tautkan ke invoice | 11.5, CR |
| ☐ | 11.7 | Daftar faktur pajak + status draf, terbit, batal | 11.4, IDX |
| ☐ | 11.8 | Rekap PPN keluaran per masa | 11.4 |

## Fase 12 — Pajak: PPN masukan dan SPT (3 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 12.1 | Catat nomor faktur pajak supplier pada bill | 4.4 |
| ☐ | 12.2 | Rekap PPN masukan per masa | 12.1 |
| ☐ | 12.3 | Ringkasan SPT Masa PPN: keluaran dikurangi masukan, kompensasi | 11.8, 12.2 |

## Fase 13 — Pajak: PPh dan ekspor (8 task)

Selesai fase 11-13 = Rilis C.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 13.1 | Tabel tarif PPh 23 dan 4(2) + fungsi hitung + tes | 11.1 |
| ☐ | 13.2 | Fungsi murni jurnal potong PPh saat bayar bill (Utang PPh) + tes (belum dipasang) | 13.1, 5.5 |
| ☐ | 13.3 | ⚠ Pasang 13.2 ke alur bayar bill lewat hook | 13.2, 5.5 |
| ☐ | 13.4 | Daftar bukti potong yang diterbitkan | 13.3 |
| ☐ | 13.5 | Cetak bukti potong (HTML siap print) | 13.4 |
| ☐ | 13.6 | Rekap bulanan PPh untuk pelaporan | 13.4 |
| ☐ | 13.7 | Fungsi murni pembuat CSV/XML sesuai format dari 11.1 + tes | 11.1, 11.4 |
| ☐ | 13.8 | Tombol ekspor CSV/XML di daftar faktur pajak | 13.7, 11.7 |

## Fase 14 — Multi-gudang (7 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 14.1 | Investigasi struktur multiKartuStock dan mutasi stok: ringkasan 1 halaman, tanpa kode | STK, SCH bagian stok |
| ☐ | 14.2 | Master gudang (kind `gudang`) | CR |
| ☐ | 14.3 | ⚠ Tambah field gudang pada struktur data mutasi stok (default gudang utama, data lama tetap valid) + tes | 14.1, STK |
| ☐ | 14.4 | ⚠ Pembuat mutasi stok yang ada memakai gudang default lewat hook | 14.3, STK |
| ☐ | 14.5 | Model transfer stok antar gudang + tes | 14.4 |
| ☐ | 14.6 | UI transfer stok | 14.5, IDX |
| ☐ | 14.7 | Laporan stok per gudang | 14.3 |

## Fase 15 — Batch dan kedaluwarsa (4 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 15.1 | Model batch (nomor, kedaluwarsa, qty) + tes | 14.1 |
| ☐ | 15.2 | ⚠ Input batch saat penerimaan barang | 15.1, STK |
| ☐ | 15.3 | ⚠ Pilih batch urut FEFO saat penjualan | 15.1, STK |
| ☐ | 15.4 | Laporan batch dan kedaluwarsa | 15.1 |

## Fase 16 — Proyek / departemen (4 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 16.1 | Master dimensi (proyek, departemen) | CR |
| ☐ | 16.2 | Fungsi murni pemberi tag dimensi pada baris jurnal + tes (belum dipasang) | 16.1, FM |
| ☐ | 16.3 | ⚠ Pasang 16.2 lewat hook di fungsi pembuat jurnal | 16.2, FM |
| ☐ | 16.4 | Laporan laba rugi per dimensi | 16.3 |

## Fase 17 — Approval (4 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 17.1 | Model aturan + status (draf, diajukan, disetujui, ditolak) + tes | TES |
| ☐ | 17.2 | UI ajukan dan setujui | 17.1 |
| ☐ | 17.3 | Catat pengajuan/persetujuan di audit trail | 17.2, potongan auditLog |
| ☐ | 17.4 | Pasang ke bill dan jurnal manual dengan ambang nominal | 17.3, 4.4 |

## Fase 18 — Payroll: dasar (5 task)

Aturan PPh 21 dan BPJS harus dicek dari sumber resmi lewat 18.2.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 18.1 | Master karyawan (kind `karyawan`) | CR |
| ☐ | 18.2 | Riset (web search, tanpa kode): aturan PPh 21 terbaru, PTKP, BPJS. Hasil: `docs/PAYROLL_REF.md` | tidak ada |
| ☐ | 18.3 | Fungsi murni PTKP + PPh 21 berdasarkan 18.2 + tes | 18.2 |
| ☐ | 18.4 | Fungsi murni BPJS + gaji bersih memakai 18.3 + tes | 18.3 |
| ☐ | 18.5 | Input gaji bulanan (tunjangan, potongan) | 18.1, 18.4 |

## Fase 19 — Payroll: jurnal dan laporan (4 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 19.1 | Fungsi murni jurnal gaji: Dr Beban Gaji, Cr Utang Gaji, Utang PPh 21, Utang BPJS + tes (belum dipasang) | 18.5, INV |
| ☐ | 19.2 | ⚠ Pasang 19.1 ke alur input gaji lewat hook | 19.1 |
| ☐ | 19.3 | Slip gaji cetak | 18.5 |
| ☐ | 19.4 | Rekap PPh 21 bulanan | 19.2 |

## Fase 20 — Selisih kurs (5 task)

Selesai fase 14-20 = Rilis D. Pilih fase yang dibutuhkan saja.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 20.1 | Field mata uang dan kurs pada transaksi | potongan data kurs |
| ☐ | 20.2 | Fungsi murni selisih kurs realisasi saat pembayaran + tes (belum dipasang) | 20.1 |
| ☐ | 20.3 | ⚠ Pasang 20.2 ke alur pembayaran + jurnal selisih kurs | 20.2, 5.3 |
| ☐ | 20.4 | Fungsi murni revaluasi akhir periode + tes (belum dipasang) | 20.2 |
| ☐ | 20.5 | ⚠ UI revaluasi + jurnal | 20.4 |

## Fase 21 — Bank: impor mutasi (4 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 21.1 | Parser CSV mutasi bank dengan pemetaan kolom (tanggal, keterangan, debit, kredit) + tes | satu contoh CSV yang sudah dianonimkan |
| ☐ | 21.2 | UI impor: pilih file dan pratinjau | 21.1, IDX |
| ☐ | 21.3 | UI impor: atur pemetaan kolom | 21.2 |
| ☐ | 21.4 | Model mutasi bank (kind `mutasi`) + simpan ke cloud | CR |

## Fase 22 — Bank: pencocokan dan rekonsiliasi (5 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 22.1 | Pencocokan otomatis tepat: nominal sama dan tanggal dalam selisih sekian hari | 21.4, 5.1 |
| ☐ | 22.2 | Aturan kata kunci → akun, bisa disimpan | 21.4 |
| ☐ | 22.3 | Fungsi murni jurnal dari baris mutasi + tes (belum dipasang) | 22.2, INV |
| ☐ | 22.4 | ⚠ Tombol buat jurnal dari baris mutasi: pasang 22.3 | 22.3 |
| ☐ | 22.5 | Laporan rekonsiliasi: saldo bank vs saldo buku | 21.4, 22.4 |

## Fase 23 — Impor dari Accurate (6 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 23.1 | Analisis format ekspor Accurate dari contoh file milikmu (anonimkan), tanpa kode | contoh file |
| ☐ | 23.2 | Pemetaan akun COA Accurate → OAS | 23.1 |
| ☐ | 23.3 | ⚠ Impor saldo awal | 23.2 |
| ☐ | 23.4 | Impor kontak dan produk | 23.1, CR |
| ☐ | 23.5 | Parser invoice dan bill yang masih terbuka + tes (belum menyimpan) | 23.1, 5.1 |
| ☐ | 23.6 | ⚠ Simpan hasil 23.5 sebagai invoice dan bill | 23.5 |

## Fase 24 — API (7 task)

OAS di GitHub Pages bersifat statis, jadi API perlu Supabase Edge Function atau PostgREST dengan kunci API.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 24.1 | Desain API (endpoint, autentikasi, batas akses), tanpa kode | SCH |
| ☐ | 24.2 | Tabel `api_keys` (simpan hash) + RLS | SQL 001 sebagai pola |
| ☐ | 24.3 | Edge Function: kerangka + autentikasi API key | 24.1, 24.2 |
| ☐ | 24.4 | Edge Function: endpoint baca invoice | 24.3 |
| ☐ | 24.5 | Fungsi murni validasi input buat invoice + tes | 24.1, INV |
| ☐ | 24.6 | Edge Function: endpoint buat invoice memakai 24.5 | 24.4, 24.5 |
| ☐ | 24.7 | Dokumentasi API di `docs/API.md` | 24.4, 24.6 |

## Fase 25 — POS (opsional, hanya bila menyasar toko) (6 task)

Selesai fase 21-25 = Rilis E.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☐ | 25.1 | Model penjualan tunai + keranjang + tes | 6.3 |
| ☐ | 25.2 | UI kasir: katalog dan keranjang | 25.1, IDX |
| ☐ | 25.3 | UI kasir: bayar dan simpan penjualan | 25.2 |
| ☐ | 25.4 | Cetak struk | 25.3 |
| ☐ | 25.5 | Fungsi murni jurnal ringkasan tutup kasir harian + tes (belum dipasang) | 25.1, INV |
| ☐ | 25.6 | ⚠ Tombol tutup kasir: pasang 25.5 | 25.5, 25.3 |

## Keputusan yang masih terbuka

1. ~~**Cakupan Reset Semua Data**~~ — diputuskan: custom. Modal Reset Data punya checklist jenis data; yang dicentang saja yang dihapus (task 1.5 selesai).
2. **Akses anggota tim** (3.1): anggota boleh baca/tulis apa saja per peran? Sekarang RLS hanya untuk pemilik.
3. **Target pengguna**: dagang, jasa, atau keduanya. Ini menentukan apakah Fase 14-20 (gudang, batch, dst.) dan POS (Fase 25) perlu dikerjakan.
4. **Aturan pajak dan payroll** harus dicek ulang dari sumber resmi saat 11.1 dan 18.2 dikerjakan; jangan memakai angka dari ingatan model.
