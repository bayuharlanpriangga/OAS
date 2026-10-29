# Roadmap OAS menuju setara Accurate

Disusun 9 Oktober 2026, direvisi 12 Oktober 2026 · 25 fase · 139 task kecil (semua ukuran S) · dirancang untuk Claude free tier

## 1. Cara pakai dokumen ini

Prinsip: **satu task = satu chat baru = satu commit.** Semua task berukuran kecil. Task yang dulu berukuran M sudah dipecah jadi dua task S (biasanya: fungsi murni + tes dulu, lalu dipasang ke alur lama). Kalau sebuah task tetap terasa besar waktu dikerjakan, pecah dulu sebelum lanjut.

**Progres: 30/139 task selesai.**

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
| 1 | Fondasi data | 8/8 |
| 2 | Umur piutang | 4/4 |
| 3 | Akses anggota tim | 7/7 |
| 4 | Tagihan pembelian (bill) | 8/9 |
| 5 | Pembayaran | 1/7 |
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
| ☑ | 1.2 | Uji manual sinkron di Supabase asli: jalankan SQL, login, unggah data lama, buat invoice, buka di browser lain, hapus invoice, ganti bisnis, putus internet saat simpan. Catat yang gagal (tanpa AI) | checklist ini |
| ☑ | 1.3 | Tambah kind `jurnal_berulang` dan `anggaran` ke CLOUD_RECORD_KINDS + tes | CR, TES, potongan saveFiturBaru |
| ☑ | 1.4 | Tambah kind `alert` dan `kurs` (cek dulu bentuknya: array atau objek) | CR, potongan deklarasi di 01-state.js |
| ☑ | 1.5 | Reset Data dengan pilihan jenis data (jurnal, invoice, kontak, aset, produk, dll); yang dipilih ikut terhapus dari cloud | CR, potongan doResetAll di 15-storage.js |
| ☑ | 1.6 | Pastikan `js/db-adapter.js` tidak dipakai (grep), lalu hapus duplikatnya | hasil grep |
| ☑ | 1.7 | `js/23-penomoran.js`: fungsi murni nomorBerikut(jenis, tahun, daftarNomor) + tes | TES |
| ☑ | 1.8 | Simpan counter ke cloud (kind `counter`) dan pakai untuk nomor invoice, menggantikan length+1 | 23-penomoran.js, CR, potongan nomor invoice di 19-fitur-tambahan.js |

**Temuan uji 1.2 (sudah diperbaiki di `22-cloud-records.js`, `23-penomoran.js`, `18-audit-permission.js`, dll.; tes di `tests/cloud-records.test.js`, `tests/penomoran.test.js`):**
- Invoice yang dibuat saat offline hilang kalau halaman di-refresh setelah online (cache ditimpa data cloud). Sekarang perubahan yang belum tersinkron dideteksi lewat snapshot hash (`oas_rec_snaph_<cid>`), diterapkan di atas data cloud, lalu dikirim ulang.
- Gagal sinkron hanya tercatat di Console. Sekarang user diberi peringatan (sekali per rentetan gagal), dan request yang menggantung diberi batas waktu 20 detik supaya tidak memblokir antrean.
- Dialog "Unggah Data Lokal ke Cloud?" muncul di browser kedua untuk data yang sebenarnya sudah ada di cloud. Sekarang hanya data yang baru/berbeda dari cloud yang ditawarkan.
- Dropdown pindah akun mati begitu akun kedua ditambahkan: `escJsAttr` dipanggil di `21-settings.js` (switcher) dan `05-akun.js` (tombol Restore akun terhapus) tetapi tidak pernah didefinisikan. Diganti `escapeForJsAttr`; tes `tests/akun-switcher.test.js` ikut memeriksa semua helper `esc*` terdefinisi.
- Dropdown akun muncul di bawah field Bisnis (bukan menempel di bawah chip akun): chip + panel dibungkus `#acc-switch-wrap`, panel `top:100%` dan chip ikut "terbuka". Tombol Diagnosa Supabase dihapus dari layar bisnis kosong (akun baru bukan error); dialog diagnosa diperbaiki (baris baru, URL tidak meluber, email di-escape).
- 8c (reload saat offline), hasil tinjauan kode: data AMAN (cache `oas_rec_*` dan hash snapshot tidak disentuh), tetapi `afterLogin` gagal memuat daftar bisnis lalu masuk Mode Tamu, jadi bisnis tidak terbuka selama offline. Invoice yang dibuat di Mode Tamu itu masuk key lama `oas_invoices` dan tidak ditawarkan ke cloud nanti. Celah ini belum ditutup (perlu "ingat bisnis terakhir" agar bisa dibuka dari cache). Diperbaiki: `loadDataFromSupabase` mengabaikan error query jurnal/akun, sehingga koneksi putus di tengah pemuatan bisa menulis ulang COA default ke cloud; sekarang berhenti dan membaca cache. Belum diuji di browser.
- 9 (reset data & role anggota join code): Tombol Reset Data di modal Kelola Data Tersimpan (`#storage-reset-btn`) sekarang disembunyikan untuk member/non-admin; `confirmResetAll()` dan `doResetAll()` diproteksi guard `isAdmin()`. Bug badge label audit trail dan role anggota join code yang melompat jadi Admin disebabkan oleh tidak dipanggilnya `loadOrgMembers()` dan `enforcePermissions()` saat beralih bisnis di `selectCompany()`, fallback `_getActorRole()` yang mengasumsikan owner, dan setting `_currentMemberRole = 'admin'` di `loadOrgMembers()` untuk owner yang bocor ke bisnis berikutnya. Sekarang diperbaiki: `selectCompany()` mereset state peran lalu memuat peran bisnis baru; `_getActorRole()` fallback ke `member` saat di bisnis orang lain; kecocokan anggota di `org_members` memeriksa user_id dan email.
- 10 (bentrok penomoran offline HP & laptop bersamaan): Transaksi offline di dua perangkat bersamaan menghasilkan nomor invoice kembar (mis. keduanya mendapat `INV-2026-002`). Ditambahkan fungsi murni `selesaikanBentrokNomorInvoice()` dan integrasi `periksaDanSelesaikanBentrokInvoice()` di `23-penomoran.js`: invoice dengan waktu pembuatan lebih lama mempertahankan nomor, invoice kedua otomatis disesuaikan ke nomor urut berikutnya yang unik (`INV-2026-003`), keterangan jurnal terkait disinkronkan, counter dinaikkan, cloud diperbarui, dan pengguna diberi notifikasi ramah. Diuji di `tests/penomoran.test.js` (skenario 2 kembar, 3 kembar, jurnal, dan counter).

## Fase 2 — Umur piutang (4 task)

Kemenangan cepat. Selesai fase ini = Rilis A.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☑ | 2.1 | Fungsi murni hitungAging(daftar, tanggalAcuan) dengan bucket 0-30, 31-60, 61-90, >90 hari + tes | INV (bentuk objek invoice) |
| ☑ | 2.2 | Halaman 'Umur Piutang' kosong + item navigasi | IDX |
| ☑ | 2.3 | Isi tabel umur piutang per kontak memakai 2.1 | 2.1, potongan render tabel invoice |
| ☑ | 2.4 | Ekspor umur piutang ke CSV dan cetak | 2.3 |

## Fase 3 — Akses anggota tim (7 task)

Independen: boleh dikerjakan kapan saja setelah Fase 1.

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☑ | 3.1 | Desain akses anggota tim: baca RLS dan alur gabung bisnis, hasilkan keputusan desain 1 halaman (tanpa kode) | SCH bagian RLS, potongan daftar bisnis di 16 |
| ☑ | 3.2a | SQL: fungsi bantu peran + policy `companies`, `org_members`, `company_join_codes` + fungsi `gabung`, `klaim_undangan`, `buat_kode_gabung` (`docs/migrations/002_akses_tim_inti.sql`, tes `002_akses_tim_inti.test.sql`). Lulus tes T1-T6 di Supabase pada 13 Oktober 2026; dua policy lama `companies` ("Anyone can read company with active join code", "Members can read joined companies") di-drop manual | 3.1 |
| ☑ | 3.2b | SQL policy `company_records`, `jurnal_entries`, `akuns`, `company_profiles` sesuai matriks D2 pada 3.1 | 3.2a, SQL 001, hasil 3.1 |
| ☑ | 3.3 | Client: tampilkan bisnis tempat user menjadi anggota di daftar bisnis. Modul `js/26-daftar-bisnis.js` (fungsi murni `susunDaftarBisnis`, tes `tests/daftar-bisnis.test.js`); `getMyCompanies()` hanya memuat keanggotaan `active`, memanggil rpc `klaim_undangan` (gagal diabaikan), dan memberi `_role` tiap bisnis; kartu bisnis menampilkan "Anggota (Viewer/Member/Admin)"; Hapus Bisnis hanya untuk pemilik | potongan selectCompany + daftar bisnis di 16 |
| ☑ | 3.3b | Client: alur gabung pindah ke rpc. `_processJoinCode` → `gabung(kode)` (hasil `bergabung`/`diaktifkan`/`sudah_anggota`, pesan lewat `ringkasHasilGabung` di `26-daftar-bisnis.js`, peran awal Viewer), `getOrCreateJoinCode` → `buat_kode_gabung(cid)`, update `user_id` langsung di `loadOrgMembers` dihapus (diganti `klaim_undangan` di `getMyCompanies`). Perlu uji manual dua akun | 3.3, hasil dump fungsi 002 |
| ☑ | 3.4 | Client: muat `company_records` bisnis anggota ke state. `cloudLoadRecords()` sudah memuat per `company_id` (RLS `cr_select` dari 3.2b mengizinkan anggota active), jadi yang diperbaiki adalah `cloudOfferLocalMigration` di `22-cloud-records.js`: data lama di key global (milik user sendiri) tidak lagi ditawarkan ke bisnis tempat user menjadi anggota; tes di bagian [5] `tests/cloud-records.test.js`. Perlu uji manual dua akun | CR, 3.3 |
| ☑ | 3.5 | Peran viewer = hanya baca: blok tulis di cloudSyncRecords dan tombol simpan. Fungsi murni `peranBolehMenulis`, `peranAktifBisnis`, `bisnisHanyaBaca` di `26-daftar-bisnis.js`; `isReadOnly()`, `guardHanyaBaca()` dan `hasPerm` (viewer hanya `read`) di `18-audit-permission.js`; guard di `22-cloud-records.js` (sync, muat, tawaran migrasi, hapus massal) dan semua penyimpan di `16-auth-company.js` + `addJurnal`. Tes: `tests/hanya-baca.test.js`, bagian [10] `daftar-bisnis.test.js`, [6] `cloud-records.test.js`. Perlu uji manual akun viewer | CR, potongan izin peran |

**Temuan task 3.3:**
- Hapus Bisnis di layar pilih bisnis tidak dibatasi pemilik. Setelah 3.2b, admin boleh menghapus `jurnal_entries`, jadi anggota admin yang menekan lama lalu Hapus bisa menghapus jurnal bisnis (hapus `companies` gagal diam-diam sesudahnya). Sudah diperbaiki: tombol disembunyikan untuk non-pemilik dan `showDeleteCompanyConfirm`/`confirmDeleteCompany` diberi guard `adalahPemilikBisnis`.
- Alur gabung di `18-audit-permission.js` masih memakai insert langsung ke `org_members` dan select langsung `company_join_codes`; keduanya ditolak policy baru dari 3.2a, jadi join code tidak bisa dipakai. Sudah dipindah ke rpc di task 3.3b. File `002_akses_tim_inti.sql` dijalankan langsung di SQL Editor dan salinannya tidak ada di repo; tanda tangan fungsinya dicatat di `docs/SCHEMA.md`.
- Deteksi redirect OAuth memakai `includes('code=')`, yang juga cocok dengan `error_code=` pada redirect error Supabase (`flow_state_expired`); setelah tukar kode gagal, penanda redirect tidak dilepas sehingga app macet di "Menghubungkan...". Diperbaiki dengan `bacaParamOAuth` di `js/27-oauth-url.js` (tes `tests/oauth-url.test.js`) dan pelepasan penanda saat tukar gagal.
- `exportExcelFormula` di `14-export.js` memakai `saldo` padahal `const saldo = computeSaldoAll();` ter-comment, sehingga ekspor Excel dengan formula error. Baris itu diaktifkan kembali.

**Temuan task 3.4:**
- Memuat record bisnis anggota ke state ternyata sudah jalan sejak 3.3: `loadDataFromSupabase` → `cloudLoadRecords()` hanya memfilter `company_id`, tidak `user_id`, dan policy `cr_select` mengizinkan viewer/member/admin. Tes baru memastikan invoice, kontak, produk, dan counter bisnis anggota masuk ke state dan cache per bisnis (`oas_rec_<kind>_<cid>`) tidak bercampur.
- Bug yang ditemukan dan sudah diperbaiki: `cloudOfferLocalMigration` menawarkan data lama di key global (`oas_invoices`, `oas_kontak`, `oas_jb`, `oas_anggaran`, `oas_alerts`, dll.) ke bisnis mana pun yang sedang dibuka. Di bisnis anggota (cloud masih kosong, atau ada kind `legacyOnce` yang belum diputuskan), data pribadi user bisa terunggah ke bisnis orang lain bila perannya member/admin, dan tanda `oas_rec_legacy_claimed*` ikut terpasang sehingga data itu tidak bisa lagi dipindah ke bisnis sendiri. Sekarang tawaran data lama hanya untuk pemilik (`adalahPemilikBisnis`).
- Belum ditutup, ikut task 3.5: viewer masih bisa memicu tulis ke cloud (ditolak RLS, user hanya melihat peringatan gagal sinkron), dan `loadDataFromSupabase` memanggil `saveAkunsToSupabase()` bila `akuns` kosong; di bisnis anggota ini seharusnya tidak terjadi karena pemilik sudah mengisi COA.

**Temuan task 3.5:**
- `hasPerm()` tidak memperhitungkan peran: anggota yang ada di `org_members` dianggap boleh semuanya kecuali yang di-set `false` di `permissions`, jadi viewer (permissions kosong) tampil punya hak buat/ubah/hapus di UI. Sudah diperbaiki: viewer hanya mendapat `read`, apa pun isi `permissions`.
- Viewer yang mengubah data lalu sync: dulu perubahan itu masuk cache lokal dan ditolak RLS, lalu diterapkan lagi di atas data cloud pada pemuatan berikutnya (lewat jalur perubahan belum tersinkron) sambil terus memunculkan peringatan gagal sinkron. Sekarang viewer tidak menulis ke cloud maupun cache, dan perubahan lokal lama diabaikan saat memuat.
- Peran diambil dari `_role` daftar bisnis (org_members) lebih dulu, bukan dari `_currentMemberRole`, karena `loadOrgMembers` jatuh ke `member` bila query gagal dan itu menaikkan viewer jadi bisa menulis.
- Ditemukan saat uji manual (sudah diperbaiki): (a) menyimpan jurnal sebagai viewer memunculkan peringatan tetapi spinner "Menyimpan Jurnal..." berputar terus karena `addJurnal` melempar error setelah spinner tampil. Sekarang `guardHanyaBaca` menutup spinner dan wrapper simpan Kas/Penjualan/Pembelian/Manual di `03-widgets.js` memeriksa peran sebelum menampilkan spinner. (b) Layar Kelola Anggota milik pemilik menampilkan viewer sebagai "Member" dan pilihan role hanya Member/Admin, sehingga menyimpan perubahan anggota viewer menurunkan/menaikkan perannya tanpa disadari. Sekarang ada opsi Viewer di form tambah/edit anggota dan badge Viewer di daftar. Join code memang memberi peran awal Viewer (keputusan di 3.2a).
- Ditemukan saat uji manual (sudah diperbaiki): dropdown Role di modal Edit/Tambah Anggota bertambah satu tombol setiap modal dibuka. `openEditMember` dan `openInviteModal` menghapus penanda `dataset.upgraded` lalu memanggil `upgradeSelectToOptPicker` lagi, dan tiap panggilan menambah tombol baru tanpa membuang yang lama (bug lama, baru kelihatan karena tombolnya menumpuk). Sekarang penanda tidak dihapus; `upgradeSelectToOptPicker` yang sudah terpasang hanya menyamakan label dengan nilai select. Tes: `tests/opt-picker.test.js`.
- Keputusan (setelah uji manual): izin per modul di modal Edit Anggota **hanya Lihat**. Kolom Buat/Edit/Hapus dihapus karena tidak pernah berfungsi (tidak ada elemen yang memakai class yang dicari `enforcePermissions`) dan server memang tidak membedakan per modul; hak ubah/hapus ditentukan peran (viewer/member/admin). Dikerjakan: `MODUL_HALAMAN` + `modulUntukHalaman()` di `26-daftar-bisnis.js` mengikat setiap halaman ke satu modul (sebelumnya modul Jurnal tidak mengontrol halaman jurnal mana pun, dan Buku Besar, Neraca Saldo, Produk, Aset Tetap, Kurs, Kalkulator selalu terbuka); `showPage` dan `enforcePermissions` memakainya; modul Export kini benar-benar mengunci tombol dan `openExportModal`; baris "Reset Data" dihapus dari tabel (selalu khusus admin); menu yang modulnya tidak boleh dilihat tidak disembunyikan, hanya diberi tanda terkunci (redup, kursor terlarang, tooltip) dan kliknya ditolak oleh `showPage`/`openExportModal` dengan pesan akses ditolak (class `.perm-locked` di `css/components.css`); keadaan terkunci dibersihkan lagi saat pindah ke bisnis yang izinnya penuh. Halaman yang sengaja selalu terbuka: Settings, Tutorial, Audit Trail, Notifikasi. Data lama berisi create/update/delete diabaikan. Tes: bagian [11] `daftar-bisnis.test.js` (memeriksa semua `showPage` di index.html terikat ke modul) dan [3] `hanya-baca.test.js`.
- Catatan: Audit Trail masih terbuka untuk semua anggota. Kalau ingin dikunci (mis. hanya admin), itu keputusan terpisah.
- Belum ditutup: tombol/form tidak disembunyikan semua. `enforcePermissions` hanya menyembunyikan tombol dengan selector tertentu (`.btn-tambah`, `[data-action]`, dst.), jadi di beberapa halaman viewer masih bisa membuka form dan mengubah tampilan lokal; hasilnya tidak tersimpan (user diberi pesan "Kamu Viewer...") dan hilang saat muat ulang. Perapian per halaman bisa dijadikan task kecil sendiri.

## Fase 4 — Tagihan pembelian (bill) (9 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☑ | 4.1 | Model data bill (kind `bill`) di CLOUD_RECORD_KINDS + update SCHEMA.md. State `billList` di `js/28-bill.js` (dimuat di index.html), kind `bill` di `22-cloud-records.js` (tanpa migrasi key global), bentuk record di `docs/SCHEMA.md` §4.5b, checkbox "Tagihan Pembelian" di modal Reset Data. Tes: bagian [bill] `tests/cloud-records.test.js` | CR, SCH |
| ☑ | 4.2 | Halaman 'Tagihan Pembelian' kosong + navigasi. `#page-bill` di index.html (isi placeholder `#bill-body`), kartu menu "Tagihan Beli" di grup Fitur Baru, judul di `pageTitles` (04-navigasi-tema.js), izin modul mengikuti Invoice (`MODUL_HALAMAN.bill`). Tes: `daftar-bisnis.test.js` | IDX |
| ☑ | 4.3 | Form bill: tampilan input (supplier, tanggal, jatuh tempo, item, PPN), belum menyimpan. `#modal-bill` di index.html (tombol "+ Buat Tagihan" di halaman bill), `js/29-bill-ui.js` (form, hitung total langsung, akun debit per item, akun Utang Usaha), fungsi murni `hitungTotalBill` dan `nomorBillBerikut` di `28-bill.js`, filter picker `utang` di `05-akun.js`. Tombol simpan hanya menampilkan pemberitahuan. Tes: `tests/bill.test.js` | 4.1, INV sebagai pola |
| ☑ | 4.4 | Simpan bill ke cloud + daftar bill, belum ada jurnal. `susunBill` (validasi + bentuk record, murni), `tambahBill`, `hapusBillById`, `simpanBillState` di `js/28-bill.js` (bisnis login: cloud kind `bill` + `counter`; mode tamu: `oas_bill` + `oas_counter`); `nomorBillBerikut` memakai counter; `simpanBill`, `renderBillList`, `hapusBill` di `js/29-bill-ui.js` (viewer diblokir `guardHanyaBaca`); hook: `showPage('bill')`, `doResetAll` (counter BILL + render ulang), `bill` legacyOnce + label di `22-cloud-records.js`; `counterTanpaJenis`/`resetCounterJenis` di `23-penomoran.js`. Tes: `tests/bill.test.js`, bagian [bill] `cloud-records.test.js`, [13] `penomoran.test.js`. Perlu uji manual di browser | 4.3, CR |
| ☑ | 4.5 | Fungsi murni buatJurnalBill(bill): Dr Persediaan/Beban + PPN Masukan, Cr Utang Usaha + tes (belum dipasang). `buatJurnalBill(bill, opsi)` dan `cariAkunPpnMasukan(daftarAkun)` di `js/28-bill.js`; konstanta `JENIS_JURNAL.BILL` (`'Tagihan Pembelian'`) di `02-utils.js` (1 baris, tanpa efek). Hanya bill `diterima`; hasil `{ ok, jurnal }` atau `{ ok:false, pesan }`. Tes: bagian [cariAkunPpnMasukan] dan [buatJurnalBill] `tests/bill.test.js` | INV (jurnal invoice sebagai pola) |
| ☑ | 4.6 | ⚠ Pasang jurnal bill ke alur simpan bill lewat hook. Termasuk bill `diterima` yang sudah tersimpan di 4.4 tanpa jurnal (lihat temuan 4.4) dan pemeriksaan jurnal di `hapusBill`. Tanpa hook ke file lama: semuanya di `js/29-bill-ui.js` dan `js/28-bill.js`. `postingJurnalBill` (membuat jurnal lewat `buatJurnalBill` + `postJurnalLegacy`, mengisi `bill.jurnalNo`), `simpanBill` (status Diterima memposting jurnal lebih dulu; gagal = bill tidak tersimpan), tombol "Buat Jurnal" (`buatJurnalUntukBill`) untuk bill diterima tanpa jurnal aktif, `hapusBill` (bill yang sudah dijurnal dihapus lewat jurnal pembalik, bukan menghapus jurnal), dan fungsi murni `jurnalBillStatus` + `tanggalPembalikBill` di `28-bill.js`. Tes: bagian [jurnalBillStatus] dan [jurnal bill] `tests/bill.test.js` (memakai `buatJurnalPembalik` asli). Perlu uji manual di browser | 4.5, 4.4 |
| ☑ | 4.6b | Laporan pembelian ikut membaca jurnal bill. Fungsi bantu di `js/02-utils.js`: `adalahJurnalPembelian(j)` (jenis `Pembelian` atau `Tagihan Pembelian`), `jurnalPembelianAktif(daftar)` (menyaring jurnal yang dibalik beserta pembaliknya) dan `ringkasJurnalPembelian(j)` (baris debit, total kredit, tunai/kredit, nomor dokumen). Dipakai di `renderJurnalPembelian` + badge (`07-jurnal-laporan.js`, semua baris debit tampil termasuk PPN), rekap Siap Setor (`13-analitik-dashboard.js`), total pembelian pajak (`19-fitur-tambahan.js`), ekspor Excel dan PDF (`14-export.js`), dan `recalcKontakTotalTrx` (`11-kontak-invoice.js`). Tes: `tests/jurnal-pembelian.test.js`. Perlu uji manual di browser | 4.6, hasil grep `jenis==='Pembelian'` |
| ☑ | 4.6c | Edit draft bill (temuan 4.4 dan 4.6, tidak ada di rencana awal). Tombol pensil di daftar untuk bill `draft` membuka form yang sama; simpan sebagai draft mengganti bill di tempat, dan "Simpan & Diterima" dari draft membuat jurnal lewat `postingJurnalBill` yang sama dengan bill baru. Tanpa hook ke file lama. `bisaEditBill`, `formDariBill`, `perbaruiBill` di `js/28-bill.js`; `editBill`, `_billBukaForm`, `_billSetAkunUtang`, `_billTombolEdit` dan mode edit di `simpanBill` (`_billEditId`) di `js/29-bill-ui.js`; judul modal diberi id `bill-modal-judul` di index.html. Tes: bagian [edit draft] `tests/bill.test.js`. Perlu uji manual di browser | 4.6 |
| ☑ | 4.7 | Halaman 'Umur Hutang' memakai 2.1. Halaman baru `#page-umur-hutang` (kartu "Umur Hutang" di grup Fitur Baru, judul di `pageTitles`, izin mengikuti Invoice) berisi tabel per supplier, ringkasan, kartu HP, ekspor CSV, dan cetak, memakai `hitungAging` apa adanya. Modul baru `js/30-aging-hutang.js`: `billUntukAging` (murni: bill `diterima` yang jurnalnya tidak dibalik), `renderAgingHutang`, `exportAgingHutangCSV`, `cetakAgingHutang`. `js/25-aging-ui.js` diberi parameter `jenis` (`'piutang'` default, `'hutang'`) untuk teks dan awalan id rincian; keluaran piutang tidak berubah. Hook ke file lama: `index.html` (script, kartu, halaman), `04-navigasi-tema.js` (2 baris), `26-daftar-bisnis.js` (1 baris). Tes: `tests/aging-hutang.test.js`, baris umur hutang di `tests/daftar-bisnis.test.js`. Perlu uji manual di browser | 2.1, 4.2 |

**Temuan task 4.1:**
- Bill memakai `supplier` (nama kontak, bukan FK, sama seperti `invoice.pelanggan`) dan `akun` per item, supaya jurnal 4.5 bisa memisah Persediaan dan Beban per baris. Status sementara `draft | diterima | lunas`; status turunan dari pembayaran (belum, sebagian, lunas, jatuh tempo) diputuskan di 5.4.
- Penomoran: fungsi murni `nomorBerikut('BILL', tahun, ...)` sudah mendukung jenis apa pun, tetapi pembungkusnya (`nomorInvoiceBerikut`, `catatNomorInvoice`) khusus invoice. Di 4.3/4.4 perlu pembungkus serupa untuk bill. Kalau memakai counter, `doResetAll` (15-storage.js) hanya ikut menghapus `counter` bersama Invoice, jadi tambahkan kasus bill di sana.
- Checkbox "Tagihan Pembelian" di modal Reset Data ditambahkan sekarang (1 baris di index.html) supaya record bill tidak jadi tak terhapus.

**Temuan task 4.3:**
- `nomorBillBerikut` memakai `nomorBerikut('BILL', ...)` tanpa counter, jadi menghapus bill terakhir membuat nomornya dipakai lagi. Counter bill (dan penghapusannya di `doResetAll`) dikerjakan di 4.4 bersama pencatatan nomor.
- Akun debit per item dipilih lewat `<select>` berisi akun Aset/Beban/HPP (filter `beli`), default 1301, bukan picker per baris, supaya baris yang dirender ulang tidak kehilangan pilihan.
- Nama supplier dari Kontak (tipe supplier/keduanya) muncul sebagai saran (datalist); nama baru tetap boleh diketik, sama seperti pelanggan di invoice.

**Temuan task 4.4:**
- `saveFiturBaru` (13-analitik-dashboard.js) tidak menyertakan `bill`, dan menambahkannya berarti setiap simpan bill ikut menyinkronkan tujuh kind lain. Dibuat penyimpan sendiri `simpanBillState()` di `28-bill.js` (cloud: `['bill','counter']`; tamu: `oas_bill` + `oas_counter`), jadi tidak ada hook ke file lama untuk simpan.
- Reset Data: counter hanya ikut terhapus bersama Invoice, jadi mereset Tagihan Pembelian saja membuat nomor tidak mulai lagi dari 001. Sudah diperbaiki: `counterTanpaJenis` dan `resetCounterJenis('BILL')` di `23-penomoran.js`, dipanggil 1 baris di `doResetAll`; counter `INV-*` tidak ikut terhapus. Reset Invoice tetap menghapus semua counter seperti sebelumnya (bill yang masih ada tetap melanjutkan dari nomor tertingginya).
- Mode tamu mulai menulis `oas_bill`. Supaya data itu tidak terdampar saat user login dan ikut terhapus oleh Reset Data mode tamu, kind `bill` diubah ke `legacyKey: 'oas_bill'` + `legacyOnce` (ditawarkan sekali ke bisnis pemilik, tidak ke bisnis tempat user menjadi anggota). Dialog migrasi sebelumnya tidak punya label untuk `bill` (akan tampil "undefined"); label ditambahkan. Tes 4.1 "bill: tidak ada migrasi dari key global" diganti sesuai perilaku baru.
- Record bill mendapat field `ppnTarif` (sama seperti `invoice.ppnTarif`), dipakai rekap PPN Masukan (12.2). SCHEMA.md §4.5b diperbarui.
- Status `diterima` di 4.4 hanya menyimpan data, tanpa jurnal; alert simpan menyebutnya. Task 4.6 harus menangani bill `diterima` yang sudah ada tanpa jurnal (mis. field `jurnalId` + tombol posting untuk yang belum punya) dan `hapusBill` harus memeriksa jurnal sebelum menghapus.
- Ditemukan saat uji di HP (bug form 4.3, sudah diperbaiki): (a) baris item melebar keluar modal tanpa scrollbar karena grid `1fr 72px 120px 32px` tanpa `minmax(0, ...)`; sekarang tiap item disusun bertumpuk (nama, qty + harga, akun) dan header kolom di `index.html` dihapus. (b) Akun per item memakai `<select>` bawaan browser karena `upgradeFormPickers` hanya meng-upgrade select ber-id tertentu; sekarang memakai picker akun yang sama dengan Akun Utang Usaha (`openSimplePicker`, input hidden per baris, dibaca lewat `_billSinkronAkun` sebelum tambah/hapus/simpan). Tes: bagian [item] `tests/bill.test.js`.
- ~~Belum ditutup: bill belum bisa diedit, jadi draft hanya bisa dihapus lalu dibuat ulang.~~ Ditutup di task 4.6c (Edit draft bill).

**Temuan task 4.5:**
- Bentuk jurnal: Dr akun tiap item (item berakun sama digabung, ket = nama item), Dr PPN Masukan (`1502`, atau hasil `cariAkunPpnMasukan(akuns)` lewat `opsi.akunPpnMasukan`), Cr `akunUtang` sebesar total debit. Pola entri sama seperti invoice (`keterangan`, `_ppnTarif`, `lines`), jadi 4.6 memasangnya lewat `postJurnalLegacy`. Nominal dibulatkan ke rupiah dan selisih pembulatan antar akun dibebankan ke baris debit terbesar, jadi jurnal selalu seimbang (diuji untuk qty/harga desimal).
- Rekap pajak sudah bisa membaca jurnal bill tanpa perubahan: `ppnDariJurnal` mengenali debit `1502` / ket "PPN Masukan" dan membaca tarif dari `_ppnTarif` atau dari "NN%" di ket. Tes memastikan DPP dan PPN terbaca benar, termasuk saat `_ppnTarif` tidak ikut tersimpan.
- Hanya `no`, `tanggal`, `ket`, `jenis`, `lines`, dan `meta` (`sumber`, `_ppnTarif`, `_ksId`) yang disimpan ke tabel `jurnal_entries`; `id` dan `ref` tidak ikut tersimpan. Untuk 4.6: penaut bill ke jurnalnya jangan memakai `id` jurnal. Pakai nomor jurnal (`JRN-xxx`, diisi `addJurnal`) yang disimpan di record bill (mis. field `jurnalNo`); nomor bill yang ada di `ket` jurnal jadi cadangan pencarian.
- Jurnal bill memakai jenis sendiri `Tagihan Pembelian` (bukan `Pembelian`), sesuai catatan di `02-utils.js` agar jenis lama tidak dipakai ulang. Akibatnya jurnal bill belum ikut dihitung di tempat yang membaca `jenis === 'Pembelian'`: halaman Jurnal Pembelian (`07-jurnal-laporan.js`), total pembelian di dashboard/rekap (`13-analitik-dashboard.js`, `19-fitur-tambahan.js`), ekspor (`14-export.js`), dan total pembelian per kontak (`11-kontak-invoice.js`). Lihat keputusan terbuka no. 5.
- Tes `bill.test.js` memeriksa `buatJurnalBill` belum dipasang ke file mana pun (jaga batas task 4.5 dan 4.6).

**Temuan task 4.6:**
- Alur: Simpan & Diterima membuat jurnal lebih dulu (`postingJurnalBill`), baru menyimpan bill dengan `jurnalNo`. Kalau periode terkunci, jurnal tidak bisa diposting dan bill juga tidak disimpan (tidak ada bill diterima tanpa jurnal). Jurnal diposting lewat `postJurnalLegacy` (kunci periode, nomor JRN, sync cloud, audit log), sama seperti invoice. Viewer diblokir sebelum jurnal dibuat.
- Penaut bill ke jurnal memakai `bill.jurnalNo` (nomor `JRN-xxx`) dan ket jurnal (`Tagihan <noBill> — <supplier>`), karena `id`/`ref` jurnal tidak tersimpan ke cloud. `jurnalBillStatus` memeriksa keduanya (nomor jurnal bisa berulang setelah Reset Data, jadi nomor saja tidak cukup) dan mengabaikan jurnal pembalik, yang mewarisi jenis `Tagihan Pembelian` dari jurnal asalnya. Kalau `jurnalNo` hilang tetapi jurnalnya ada (mis. simpan bill gagal di tengah jalan), tombol Buat Jurnal hanya menautkan ulang, tidak membuat jurnal ganda.
- Hapus bill yang sudah dijurnal membuat jurnal pembalik (jurnal asal tidak dihapus) bertanggal hari ini, atau tanggal jurnal asal bila bill bertanggal lebih akhir (aturan `buatJurnalPembalik`). Kalau pembalik gagal dibuat (mis. periode hari ini terkunci), bill tetap ada. Bill yang jurnalnya sudah dibalik manual dari Jurnal Umum dihapus tanpa pembalik kedua, dan daftar menandainya "(dibalik)" dengan tombol Buat Jurnal untuk menjurnal ulang.
- Bill diterima lama dari 4.4 tampil dengan keterangan "belum dijurnal" dan tombol Buat Jurnal. Jurnalnya bertanggal sama dengan tanggal bill; kalau periodenya sudah dikunci, jurnal tidak bisa dibuat sampai kunci dibuka (tanggal tidak diganti diam-diam).
- ~~Belum ditutup: bill berstatus `draft` belum bisa dijadikan `diterima` atau diedit.~~ Ditutup di task 4.6c: draft kini bisa diedit dan dijadikan Diterima (jurnal ikut dibuat).
- Ditemukan saat uji manual (sudah diperbaiki): jurnal pembalik menampilkan baris debit di bawah (Cr Persediaan, Cr PPN Masukan, lalu Dr Utang Usaha) karena `buatJurnalPembalik` (`19-fitur-tambahan.js`) hanya menukar debit/kredit tanpa mengubah urutan baris. Sekarang baris debit selalu ditulis di atas kredit (sort stabil), berlaku untuk semua jurnal pembalik. Jurnal pembalik lama yang sudah tersimpan tidak berubah. Tes: `tests/bill.test.js`.
- ~~Jurnal bill belum ikut laporan pembelian (jenis berbeda dari `Pembelian`).~~ Selesai di 4.6b sesuai keputusan no. 5.

**Temuan task 4.6c:**
- Hanya bill `draft` yang bisa diedit. Bill `diterima`/`lunas` sudah punya jurnal (atau akan), jadi koreksinya tetap lewat hapus (jurnal pembalik) lalu buat ulang. Ini disengaja, bukan kekurangan: mengedit nominal bill yang sudah dijurnal akan membuat bill dan jurnalnya tidak cocok.
- Form edit memakai modal yang sama dengan bill baru. `openModalBill` dipecah: `_billBukaForm(f, judul)` mengisi form dari objek bentuk `formDariBill`, dipakai tagihan baru maupun edit. `_billEditId` menandai mode edit dan selalu direset di `openModalBill`, jadi "+ Buat Tagihan" setelah edit tidak menimpa draft.
- `simpanBill` mode edit memeriksa ulang bahwa draft masih ada dan masih berstatus draft (bisa berubah dari tab/perangkat lain); kalau tidak, simpan ditolak dan tidak ada bill yang dibuat diam-diam. Nomor milik draft itu sendiri tidak dianggap kembar; nomor bill lain tetap ditolak.
- Record hasil edit menggabungkan record lama dengan hasil `susunBill` (`id` dan `createdAt` dipertahankan), dan menggantikan bill di posisi yang sama. Kalau nomor diubah ke nomor yang lebih tinggi, counter ikut naik (`perbaruiBill`).
- Jalur draft ke jurnal: "Simpan & Diterima" dari form edit memposting jurnal lebih dulu (`postingJurnalBill` dengan `baru: true`), sama seperti bill baru. Periode terkunci = draft tidak berubah dan modal tetap terbuka.
- Refactor `openModalBill` memindahkan id form ke helper `set(id, v)`, sehingga tes "id di 29-bill-ui.js ada di index.html" tidak lagi melihatnya lewat `getElementById('...')`. Tes itu sekarang juga membaca `set('bill-...')` supaya cakupannya tidak turun.

**Temuan task 4.6b:**
- Ada enam tempat yang membaca `jenis === 'Pembelian'` (Jurnal Pembelian, Siap Setor, total pembelian pajak, ekspor Excel, ekspor PDF, kontak). Semuanya kini lewat helper di `02-utils.js` (bukan `28-bill.js`) karena dipakai file lama, dan tes memastikan tidak ada lagi `jenis === 'Pembelian'` di luar helper.
- Jurnal pembalik mewarisi jenis jurnal asal, jadi tanpa penyaringan bill yang dihapus tetap terhitung sebagai pembelian (asal terhitung, pembalik tidak mengurangi). `jurnalPembelianAktif` membuang pasangan asal + pembalik, sama seperti `rekapPpnJurnal`. Akibatnya perbaikan ini berlaku juga untuk pembelian produk yang dibalik: sebelumnya hanya Jurnal Pembelian yang menyaringnya, sedangkan Siap Setor, total pembelian pajak, dan kedua ekspor tidak.
- Jurnal Pembelian kini menampilkan semua baris debit (Persediaan/Beban dan PPN Masukan), bukan hanya baris pertama; ini juga berlaku untuk pembelian produk ber-PPN. Kolom kredit bill memakai total semua baris kredit, karena akun utang bill dipilih pengguna dan tidak selalu `2101`. Nomor dokumen bill dibaca dari ket jurnal ("Tagihan <noBill> — ..."), karena `ref` jurnal tidak tersimpan ke cloud; tanpa itu kolom No. Faktur menampilkan nomor JRN.
- Filter "Pembelian" di Jurnal Umum tetap hanya jenis `Pembelian`; jurnal bill muncul di opsi "Tagihan Pembelian" (opsi jenis lain dibuat otomatis oleh `syncJurnalTypeFilter`). Badge jenis bill diberi warna kuning seperti Pembelian.
- Belum ditutup: total pembelian per kontak. Satu-satunya pembaca di `11-kontak-invoice.js` adalah `recalcKontakTotalTrx`, yang saat ini tidak dipanggil dari mana pun, dan jurnal bill tidak membawa `kontakId` (supplier bill hanya berupa nama). Jadi tidak ada perubahan yang terlihat di halaman Kontak. Bila total pembelian per supplier perlu mencakup bill, butuh task kecil sendiri (mis. mencocokkan nama supplier bill ke kontak dan memanggil `updateKontakTotalTrx`).
- Ditemukan saat uji manual (sudah diperbaiki, bug lama yang terpicu): halaman Analitik error `createLinearGradient ... non-finite` di `anDrawTopAkun` (`13-analitik-dashboard.js`) sehingga grafik di bawahnya kosong. Penyebabnya `saldo/maxV` dengan `maxV = 0` saat semua saldo akun 0, mis. bisnis uji yang jurnalnya hanya bill yang sudah dihapus (jurnal asal + pembalik saling meniadakan). Akun bersaldo 0 sekarang dibuang dari grafik, dan tanpa akun bersaldo grafik tidak digambar. Grafik lain di file itu sudah memakai `Math.max(..., 1)`. Tes: `tests/analitik-topakun.test.js`.
- Total "HPP & Biaya" di pajak (19) dan DPP masukan di Siap Setor (13) hanya menjumlah debit akun bertipe HPP/Beban. Bill yang item-nya ke Persediaan (default 1301) tidak masuk ke angka itu, sama seperti pembelian produk ke Persediaan; perilaku lama ini tidak diubah.

**Temuan task 4.7:**
- Yang dihitung sebagai utang: bill berstatus `diterima` dengan `sisaTagihan > 0`. Draft dan lunas tidak ikut (aturan `hitungAging`). Bill `diterima` yang belum dijurnal tetap ikut, karena tagihannya sah dan masih harus dibayar. Bill yang jurnalnya sudah dibalik manual dari Jurnal Umum (`jurnalBillStatus` = `dibalik`) tidak ikut, karena utangnya sudah dibatalkan; ini konsisten dengan `hapusBill` dan `jurnalPembelianAktif` (4.6b).
- Umur dihitung dari jatuh tempo, sama seperti Umur Piutang. Bill tanpa jatuh tempo memakai tanggal bill; kalau keduanya tidak valid, bill dikeluarkan dan jumlahnya diberitahukan di bawah tabel.
- `sisaTagihan` bill belum berkurang sebelum 5.5 (bayar bill), jadi untuk sementara Umur Hutang menampilkan total bill `diterima`. Setelah 5.5, halaman ini otomatis ikut tanpa perubahan.
- Cakupan: hanya tagihan pembelian (bill). Pembelian produk yang dicatat langsung lewat jurnal `Pembelian` kredit tidak punya jatuh tempo atau sisa tagihan, jadi tidak muncul di sini. Kalau kelak perlu, butuh keputusan terpisah (mis. dijadikan bill).
- Dua halaman umur ada di DOM bersamaan, jadi id rincian hutang diberi awalan `h` (`aging-det-h0`, dst.) dan `toggleAgingDetail(i, 'h')`; id dan onclick piutang tidak berubah. Tes memastikan tidak ada id yang bertabrakan.
- Teks halaman: Supplier, Total utang, "No Tagihan", "Rincian Tagihan", dan CSV `UMUR HUTANG per <tanggal>`; nama berkas `umur-hutang-<tanggal>.csv`.

## Fase 5 — Pembayaran (7 task)

| ✓ | ID | Tugas | Lampirkan |
| :---: | --- | --- | --- |
| ☑ | 5.1 | Model pembayaran (kind `pembayaran`: jenis dokumen, id, tanggal, jumlah, akun kas) + fungsi murni sisaTagihan + tes. Modul baru `js/31-pembayaran.js`: state `pembayaranList`, `pembayaranDokumen`, `totalDibayar`, `sisaTagihan(dok, daftar, jenis)` (murni; sisa = total − `dibayarLama` − Σ pembayaran). Kind `pembayaran` di `CLOUD_RECORD_KINDS` (`22-cloud-records.js`, tanpa key mode tamu) + label dialog migrasi; checkbox "Pembayaran" di modal Reset Data; bentuk record di `docs/SCHEMA.md` §4.5c (+ field opsional `dibayarLama` di invoice dan bill). Belum ada form, simpan, jurnal, atau perubahan di invoice/bill. Tes: `tests/pembayaran.test.js`, bagian [pembayaran] `tests/cloud-records.test.js` | CR, SCH |
| ☑ | 5.2 | Form bayar invoice (boleh parsial), simpan record pembayaran, belum ada jurnal. Modal `#modal-bayar-inv` (tanggal, jumlah default = sisa, akun kas, metode, catatan, ringkasan + riwayat pembayaran) dan tombol "Bayar" di daftar invoice terkirim yang masih bersisa. Modul baru `js/32-pembayaran-ui.js` (`openModalBayarInvoice`, `simpanPembayaranInvoice`); di `js/31-pembayaran.js`: `susunPembayaran` (validasi + record, murni), `dibayarLamaTurunan` (murni), `catatPembayaran`, `simpanPembayaranState`, dan `pembayaranList` kini dimuat dari `oas_pembayaran` (mode tamu); kind `pembayaran` berubah jadi `legacyKey: 'oas_pembayaran'` + `legacyOnce` di `22-cloud-records.js`. Hook ke file lama: `11-kontak-invoice.js` (1 baris, tombol Bayar), `index.html` (script + modal). Tes: `tests/pembayaran-form.test.js`, bagian [pembayaran] `cloud-records.test.js`, `pembayaran.test.js`. Perlu uji manual di browser | 5.1, INV |
| ☐ | 5.3 | ⚠ Jurnal bayar invoice: Dr Kas, Cr Piutang, dipasang lewat hook | 5.2, INV |
| ☐ | 5.4 | Status invoice otomatis dari total pembayaran (belum, sebagian, lunas, jatuh tempo) | potongan pemakaian status invoice |
| ☐ | 5.5 | ⚠ Bayar bill (parsial) + jurnal, meniru pola 5.3 | 5.3, 4.4 |
| ☐ | 5.6 | Fungsi murni alokasi satu pembayaran ke beberapa faktur + tes | 5.1 |
| ☐ | 5.7 | UI alokasi pembayaran ke beberapa faktur sekaligus | 5.6, 5.3 |

**Temuan task 5.1:**
- Sisa tagihan dihitung dari pembayaran, bukan dikurangi di tempat: `sisaTagihan = max(0, total − dibayarLama − Σ jumlah)`. Dengan begitu menghapus atau mengoreksi pembayaran tidak membuat sisa tidak sinkron. Field `sisaTagihan` di invoice/bill tetap ada karena dibaca daftar, ekspor, dan aging (`hitungAging`, 4.7); alur bayar (5.2, 5.5) wajib mengisinya ulang dari fungsi ini setiap kali pembayaran ditambah atau dihapus, jadi Umur Piutang/Hutang ikut tanpa perubahan.
- Alur lama sudah ada: `konfirmasiLunasInvoice` (`11-kontak-invoice.js`, tombol "Tandai Lunas") sudah mendukung bayar sebagian, jurnal `JRN_LNS_` (Dr Kas, Cr Piutang), dan `status = 'lunas'`, tetapi hanya mengurangi `sisaTagihan` tanpa catatan pembayaran. Karena itu ada `dibayarLama`: pembayaran pertama di invoice yang sudah dibayar lewat alur lama (5.2) mengisinya dengan `total − sisaTagihan`. Tanpa itu, sisa lama hidup lagi (diuji). 5.2 dan 5.3 harus mengganti isi `konfirmasiLunasInvoice` supaya hanya ada satu jalur dan semua pembayaran punya record.
- `dokId` memakai `id` dokumen, bukan nomor (nomor bisa berulang setelah Reset Data). Pencocokan juga memeriksa `jenis`, jadi id invoice dan id bill yang kebetulan sama tidak saling memengaruhi. Record rusak (jumlah bukan angka > 0), jenis tidak dikenal, atau milik dokumen yang sudah dihapus diabaikan.
- Kelebihan bayar tidak menghasilkan sisa negatif (dijepit di 0). Menolak pembayaran yang melebihi sisa adalah tugas validasi `susun...` di 5.2.
- Pembulatan ke sen supaya cicilan desimal (0,1 + 0,2 untuk 0,3) melunasi tepat.
- Tanpa migrasi SQL: `company_records.kind` berupa teks bebas (kind `bill` di 4.1 juga tanpa migrasi). Mode tamu belum menyimpan pembayaran (`legacyKey: null`, state hanya di memori); 5.2 harus menambah `oas_pembayaran` bila mode tamu didukung, dan menyesuaikan `legacyKey`/`legacyOnce` seperti yang dilakukan 4.4 untuk bill.
- Reset Data: checkbox Pembayaran berdiri sendiri. Mereset Invoice atau Tagihan Pembelian tidak ikut menghapus pembayarannya; pembayaran yatim itu aman karena diabaikan `sisaTagihan`, tetapi daftar riwayat pembayaran di 5.2 harus menyaringnya (atau reset invoice/bill diputuskan ikut menghapus pembayaran jenisnya).

**Temuan task 5.2:**
- **Pembayaran dari form ini belum dijurnal.** Sisa tagihan invoice berkurang, tetapi Kas dan Piutang di buku besar tidak berubah sampai 5.3. Form dan alert menyebutnya terus terang, dan riwayat menandai tiap record tanpa `jurnalNo` dengan "belum dijurnal". 5.3 wajib menjurnalkan semua record `pembayaran` berjenis invoice yang `jurnalNo`-nya kosong (pola tombol "Buat Jurnal" di 4.6), bukan hanya pembayaran baru; periode terkunci pada tanggal pembayaran baru ketahuan saat itu.
- Dua jalur bayar hidup berdampingan: tombol baru "Bayar" (record, tanpa jurnal) dan tombol lama "Lunas" (`konfirmasiLunasInvoice`, jurnal tanpa record) tidak diubah supaya perilaku lama tidak rusak. 5.3 harus menyatukannya (isi `konfirmasiLunasInvoice` diganti agar memakai `susunPembayaran` + jurnal), lalu tombol "Lunas" cukup membuka form yang sama.
- Keduanya aman dipakai bergantian: `dibayarLamaTurunan` = `max(dibayarLama, total − sisaTagihan tersimpan − Σ record)`, jadi bagian yang dibayar lewat "Lunas" (tanpa record) otomatis dipindah ke `dibayarLama` pada pembayaran berikutnya, baik sebelum maupun sesudah ada record. Ini memperluas aturan 5.1 ("pembayaran pertama"), yang hanya benar bila "Lunas" tidak dipakai sesudah ada record. Batas bayar di form = `sisaTagihan` tersimpan, bukan total.
- Aturan validasi (`susunPembayaran`): invoice harus `terkirim` (draft dan lunas ditolak dengan pesan sendiri), jumlah > 0 dan ≤ sisa (dibulatkan ke sen; kelebihan bayar ditolak, bukan dijepit), akun kas wajib, tanggal valid dan **tidak boleh sebelum tanggal invoice** (keputusan baru: jurnal 5.3 akan mengkredit piutang yang belum ada pada tanggal itu; ubah bila ingin membolehkan uang muka), id tidak kembar. Fungsi yang sama dipakai 5.5 untuk bill (`jenis` `'bill'`, status `diterima`).
- Status: sisa 0 otomatis `lunas` (sama seperti alur lama); status sebagian/jatuh tempo diturunkan di 5.4. Sengaja tidak dibiarkan `terkirim` dengan sisa 0, karena tombol "Lunas" lama akan muncul pada invoice yang sudah tidak punya sisa.
- Simpan: bisnis login mengirim `['invoice','pembayaran']` dalam satu antrean sinkron (invoice dan record tidak berpisah di tengah jalan); mode tamu menulis `oas_pembayaran` + `oas_invoices`. Mode tamu sekarang didukung, jadi kind `pembayaran` memakai `legacyKey` + `legacyOnce` seperti `bill` (ditawarkan sekali ke bisnis pemilik, tidak ke bisnis tempat user menjadi anggota; Reset Data di mode tamu ikut membuang key-nya). Tes lama "tidak ada migrasi dari key global" diganti sesuai perilaku baru.
- Klik ganda tidak mencatat dua kali: simpan berjalan sinkron dan melepas `_bayarInvId` setelah sukses. Viewer diblokir `guardHanyaBaca` di buka form maupun simpan. Tanggal default form = hari ini, atau tanggal invoice bila invoice bertanggal lebih akhir.
- **Belum ada hapus/koreksi pembayaran.** Record yang salah ketik belum bisa dibatalkan dari UI. Sengaja ditunda: menghapus record yang sudah dijurnal butuh jurnal pembalik (pola `hapusBill`, 4.6). Disarankan sebagai task kecil sesudah 5.3, sebelum fase ini dianggap siap rilis. Sampai itu ada, kesalahan input hanya bisa diperbaiki lewat Reset Data > Pembayaran (menghapus semua pembayaran; `sisaTagihan` invoice yang sudah berkurang tetap, jadi bagian itu dianggap `dibayarLama`).
- Reset Data > Invoice tidak menghapus pembayaran invoice itu (record yatim, diabaikan `sisaTagihan`); riwayat di form hanya menampilkan record milik invoice yang ada, jadi tidak tampil di mana pun.
- Catatan lingkungan (bukan bagian task): di working tree `js/13-analitik-dashboard.js` dan `tests/analitik-topakun.test.js` tampil berubah di `git status` (hanya akhir baris CRLF/LF; `git diff --ignore-space-at-eol` kosong). Tidak disentuh dan tidak ikut commit task ini.

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
2. **Akses anggota tim** (3.1): desain selesai di `docs/DESAIN_AKSES_TIM.md` (peran owner/admin/member/viewer, penegakan per tingkat peran, masuk lewat fungsi server). 3.2 dipecah jadi 3.2a/3.2b dan peran awal join code = viewer (dikerjakan di 3.2a; ubah bila tidak setuju). Setelah 3.2a dijalankan, client `_processJoinCode`, `getOrCreateJoinCode`, dan `loadOrgMembers` harus pindah ke rpc (`gabung`, `buat_kode_gabung`, `klaim_undangan`) — catatan ada di akhir file SQL; usul dijadikan task kecil sebelum 3.3.
3. **Target pengguna**: dagang, jasa, atau keduanya. Ini menentukan apakah Fase 14-20 (gudang, batch, dst.) dan POS (Fase 25) perlu dikerjakan.
4. **Aturan pajak dan payroll** harus dicek ulang dari sumber resmi saat 11.1 dan 18.2 dikerjakan; jangan memakai angka dari ingatan model.
5. ~~**Jurnal bill di laporan pembelian**~~ — diputuskan: jurnal bill tetap berjenis `Tagihan Pembelian`, dan laporan pembelian dibuat membaca kedua jenis lewat fungsi bantu di task 4.6b.
