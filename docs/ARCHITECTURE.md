# ARCHITECTURE.md — OAS (Orias Accounting System)

> Dokumen ini menjelaskan arsitektur teknis aplikasi OAS: bagaimana modul-modul
> tersusun, bagaimana data mengalir dari boot sampai render, dan bagaimana
> setiap bagian saling bergantung. Ditulis berdasarkan kondisi source code
> repo `bayuharlanpriangga/OAS` per commit terakhir di branch `main`.

---

## 1. Ringkasan

OAS adalah **single-page application (SPA) client-side murni** — tidak ada
build step, tidak ada bundler (Webpack/Vite/dsb), tidak ada framework
(React/Vue/dsb). Seluruh aplikasi adalah satu `index.html` + kumpulan file
`<script>` vanilla JavaScript yang dimuat berurutan, plus CSS terpisah per
concern. Semua 21 file JS berbagi **satu global scope** (`window`) — ini
bukan ES Modules, jadi urutan `<script>` di `index.html` adalah bagian dari
kontrak arsitektur, bukan detail implementasi yang bisa diabaikan.

| Aspek | Pilihan |
|---|---|
| Bahasa | Vanilla HTML/CSS/JavaScript (ES2017+), tanpa TypeScript |
| Module system | Tidak ada (global `<script>` tags, bukan `type="module"`) |
| Build tool | Tidak ada — deploy langsung dari source |
| Hosting | GitHub Pages (`bayuharlanpriangga.github.io/OAS`) |
| Backend/DB | Supabase (Postgres + Auth), diakses lewat CDN `@supabase/supabase-js@2` |
| Local persistence | `localStorage` (cache/fallback offline + mode tamu) |
| AI | Groq API (Llama 3.3 70B), API key disimpan di browser, tidak lewat server sendiri |
| PWA | Ya — `manifest.json` + `sw.js` (service worker) |
| Export | `xlsx.full.min.js`, `jspdf` + `jspdf-autotable` (CDN, non-defer) |
| Deploy method | Push langsung ke `main` / edit via GitHub web UI (bukan CLI) |

---

## 2. Struktur Direktori

```
OAS/
├── index.html              # Satu-satunya halaman. Berisi semua markup,
│                            #  modal, inline <style>/<script> kritikal, dan
│                            #  urutan <script src="js/..."> yang memuat app.
├── manifest.json            # PWA manifest (di-generate ulang jadi Blob URL
│                            #  saat runtime agar theme_color ikut tema aktif)
├── sw.js                    # Service worker untuk PWA/offline shell caching
├── icon-192.png / icon-512.png
├── css/
│   ├── theme.css             # CSS custom properties (design tokens) per tema
│   ├── layout.css             # Grid/flex shell: sidebar, topbar, content area
│   ├── components.css         # Komponen reusable: card, modal, button, table
│   ├── pages.css               # Style spesifik per halaman/module
│   ├── icons.css                 # Setup ikon (Tabler Icons `ti ti-*`)
│   └── mobile-responsive.css      # Override breakpoint mobile
└── js/
    ├── 00-db-adapter.js     # Layer 0 — provider abstraction (Supabase)
    ├── 01-state.js          # Layer 1 — semua state global & data seed
    ├── 02-utils.js          # Layer 2 — helper murni (format, escape, dsb)
    ├── 03-widgets.js        # Layer 3 — UI primitives generik (modal, dsb)
    ├── 04-navigasi-tema.js  # Navigasi SPA, tema, tutorial onboarding
    ├── 05-akun.js           # Modul Chart of Accounts (COA)
    ├── 06-transaksi.js      # Modul input transaksi cepat & jurnal manual
    ├── 07-jurnal-laporan.js # Buku besar & laporan keuangan standar
    ├── 08-kartu-stock.js    # Modul persediaan / kartu stock (paling besar)
    ├── 09-produk.js         # Master data produk
    ├── 10-aset-tetap.js     # Aset tetap & penyusutan
    ├── 11-kontak-invoice.js # Kontak (pelanggan/supplier) & invoice
    ├── 12-kalkulator.js     # Semua kalkulator akuntansi & pajak
    ├── 13-analitik-dashboard.js # Dashboard, grafik, pencarian global
    ├── 14-export.js         # Export PDF/Excel/CSV + preview PDF
    ├── 15-storage.js        # Persistence layer: localStorage + backup
    ├── 16-auth-company.js   # Auth Supabase + manajemen multi-bisnis
    ├── 17-settings-profil.js # Profil, pengaturan akun, onboarding
    ├── 18-audit-permission.js # Audit trail, role & permission, join code
    ├── 19-fitur-tambahan.js # Kumpulan fitur pendukung (lihat §5.19)
    ├── 20-ai-chat.js        # Orias Assisten (integrasi Groq API)
    ├── 99-init.js           # Micro-patch DOM setelah semua modul dimuat
    └── db-adapter.js        # ⚠️ Duplikat lama `00-db-adapter.js`, TIDAK
                              #   di-load oleh index.html — kandidat dihapus
```

**Total:** 21 file JS aktif, ~24.750 baris kode (di luar `db-adapter.js` yang
sudah tidak terpakai).

---

## 3. Prinsip Arsitektur Inti

### 3.1 Global scope, bukan modul
Semua fungsi dan variabel `let`/`const` di top-level tiap file JS otomatis
menjadi bagian dari satu namespace global. Tidak ada `import`/`export`.
Konsekuensi:
- **Urutan `<script>` = urutan dependency.** File yang lebih belakang boleh
  memanggil fungsi/variabel dari file sebelumnya, tidak sebaliknya (kecuali
  lewat `window.addEventListener('DOMContentLoaded', ...)` yang menunda
  eksekusi sampai semua script selesai di-parse).
- **Rawan tabrakan nama.** Fungsi dengan nama sama di dua file akan saling
  menimpa tanpa error — ini pernah jadi sumber bug nyata di proyek ini
  (contoh: duplikasi `getDefaultAkuns` yang merusak logika default COA).
- Tidak ada type-checking otomatis; validasi hanya lewat `node --check` per
  file untuk syntax error, bukan logic error.

### 3.2 DB Adapter Pattern (`00-db-adapter.js`)
Ini satu-satunya titik masuk ke Supabase. Prinsipnya: **19 file JS lain tidak
pernah memanggil `supabase.createClient(...)` atau `_supa` secara langsung**
— semuanya lewat objek `DB`:

```js
DB.auth.signInWithPassword(opts)
DB.auth.getSession()
DB.table('jurnal_entries').select('*').eq('company_id', id)
```

Tujuannya eksplisit tertulis di komentar file: kalau suatu saat pindah
provider (Supabase → Firebase, backend sendiri, dll), yang perlu ditulis
ulang cukup isi `00-db-adapter.js`, selama bentuk balikan (`{data, error}`)
tetap konsisten. Catatan: implementasi `table()` saat ini masih pass-through
langsung ke query builder Supabase (`_supa.from(name)`), jadi method chaining
gaya Supabase (`.eq()`, `.upsert()`, `.single()`, dst) masih bocor ke call
site — migrasi provider nantinya tetap perlu menyentuh call site, bukan
hanya adapter.

### 3.3 State lokal in-memory + dua lapis persistence
Data aktif aplikasi hidup sebagai variabel global mutable di
`01-state.js` (`akuns`, `jurnalEntries`, `produkList`, dst). Dua mekanisme
menjaga data ini tetap ada lintas sesi:

1. **`localStorage`** — cache lokal per-perusahaan, auto-save 3 detik
   setelah perubahan terakhir (`15-storage.js`).
2. **Supabase (cloud)** — sumber kebenaran saat user login & memilih
   perusahaan, disinkronkan lewat fungsi `save*ToSupabase()` di
   `16-auth-company.js`.

Lihat [`SCHEMA.md`](./SCHEMA.md) untuk detail lengkap struktur keduanya.

### 3.4 Mode Tamu (Guest Mode) vs Mode Cloud
Aplikasi bisa dipakai tanpa akun (`isGuestMode = true`), semua data hanya di
`localStorage` dengan key generik (`oas_data_v2_guest`). Saat user login,
`offerGuestDataMigration()` menawarkan migrasi data tamu ke perusahaan cloud
pertama yang dibuat.

### 3.5 Multi-tenant per "Company"
Satu akun Supabase (`auth.users`) bisa punya banyak **company** (bisnis).
Setiap company adalah unit isolasi data: baris di `jurnal_entries`, `akuns`,
`company_profiles` semua di-scope lewat kolom `company_id`, dan RLS
(Row Level Security) Postgres yang menegakkannya di level database, bukan
hanya di client. Lihat §7 dan [`SCHEMA.md` §2](./SCHEMA.md#2-skema-cloud-supabase--postgres).

---

## 4. Alur Boot Aplikasi (Boot Sequence)

```
1. <head> inline script (index.html baris ~19-73)
   → baca 'oas_theme' dari localStorage, set background awal (anti-flicker)
   → fetch manifest.json, tulis ulang theme_color, buat Blob URL manifest baru

2. <script defer> berurutan (index.html baris 74-96):
   supabase-js CDN → 00-db-adapter.js → 01-state.js → 02-utils.js → ...
   → 20-ai-chat.js → 99-init.js
   (browser menjalankan semuanya SETELAH HTML selesai di-parse, urut sesuai
    urutan tag karena semua pakai atribut `defer`)

3. Efek samping saat load (dieksekusi langsung, bukan menunggu event):
   - 04-navigasi-tema.js baris akhir: initTheme() dipanggil langsung
     (bukan di DOMContentLoaded) supaya tema ter-apply sebelum konten terlihat

4. document.addEventListener('DOMContentLoaded', ...) — beberapa file
   mendaftarkan listener terpisah untuk tahap ini:
   - 03-widgets.js   → upgradeAllDateInputs()
   - 13-analitik-dashboard.js → (setup grafik/dashboard)
   - 14-export.js    → (setup export)
   - 15-storage.js   → checkShowOnboarding(); initSupabase();
   - 17-settings-profil.js → (load profil)
   - 19-fitur-tambahan.js  → (setup fitur tambahan)

5. initSupabase() (16-auth-company.js):
   - DB.auth.getSession() → cek apakah ada sesi tersimpan
   - Jika ada: afterLogin() → showCompanyPicker() / auto-select company
   - Jika tidak: tampilkan layar Auth (login/register) atau tombol Mode Tamu
   - checkJoinCodeInURL() → cek query param ?join=CODE untuk auto-join company

6. Setelah company dipilih → selectCompany(company):
   - Reset state runtime (jurnalEntries=[], multiKartuStock={}, dst)
   - loadDataFromSupabase() → tarik akuns, jurnal_entries, company_profiles
     dari cloud, replace state lokal
   - (fallback) jika gagal/offline → loadFromStorage() pakai localStorage

7. initStorage() (15-storage.js):
   - Baca flag autosave, panggil loadFromStorage() untuk cache lokal
   - Jadwalkan auto-save setiap ada perubahan (debounce 3 detik)

8. renderDashboard() dipanggil → halaman awal ('dashboard') dirender.
```

Poin penting: **tidak ada state management library** (bukan Redux/Zustand/
dsb). "Reactivity" dilakukan manual — tiap fungsi `simpanX()` yang mengubah
state global akan memanggil `renderX()` yang sesuai secara eksplisit
langsung setelahnya, plus `saveToStorage()`/`saveFiturBaru()`/sinkron ke
Supabase bila perlu.

---

## 5. Peta Tanggung Jawab Modul

| # | File | Baris | Tanggung Jawab | Fungsi Kunci |
|---|---|---:|---|---|
| 00 | `00-db-adapter.js` | 84 | Konfigurasi Supabase client + objek `DB` (auth & table adapter) | `DB.auth.*`, `DB.table()` |
| 01 | `01-state.js` | 189 | Semua variabel state global + seed Chart of Accounts default (~100 akun) + data contoh | `seedData()` |
| 02 | `02-utils.js` | 113 | Helper murni tanpa efek samping DOM berat: format Rupiah/tanggal, hitung saldo, escape HTML, parsing jurnal dari teks AI | `fmtRp`, `computeSaldoAll`, `parseJurnalFromAI` |
| 03 | `03-widgets.js` | 2.735 | UI primitives lintas halaman: modal alert/confirm/input kustom, crop foto profil, format input angka ribuan, opt-picker (dropdown custom) | `showAlert`, `openCropModal`, `upgradeSelectToOptPicker` |
| 04 | `04-navigasi-tema.js` | 704 | Routing SPA (`showPage`), sistem tema (dark/light), tutorial onboarding interaktif, jurnal penyesuaian cepat | `showPage`, `initTheme`, `startTutorial` |
| 05 | `05-akun.js` | 472 | CRUD Chart of Accounts, template akun per jenis bisnis, picker akun | `simpanAkun`, `getDefaultAkuns`, `applyTemplate` |
| 06 | `06-transaksi.js` | 1.275 | Form transaksi cepat (kas, jual, beli) tanpa perlu paham debit/kredit, jurnal manual dengan validasi balance | `simpanKas`, `simpanPenjualan`, `simpanManual` |
| 07 | `07-jurnal-laporan.js` | 403 | Render Jurnal Umum/Kas/Penjualan/Pembelian, Buku Besar, Neraca, Laba Rugi, Neraca Saldo, Perubahan Ekuitas | `renderBukuBesar`, `renderLabaRugi`, `renderNeraca` |
| 08 | `08-kartu-stock.js` | 3.278 | **Modul terbesar.** Kartu stock multi-kategori (FIFO layer per pembelian), deteksi penyesuaian stok otomatis, konversi antar kartu stock, jurnal HPP otomatis saat penjualan | `addKartuStockOnBuy`, `deductKartuStockOnSale`, `getHppLayersForSale` |
| 09 | `09-produk.js` | 327 | Master produk: harga jual, akun pendapatan/HPP/persediaan default, PPN per produk | `simpanProduk`, `renderProduk` |
| 10 | `10-aset-tetap.js` | 253 | CRUD aset tetap, kalkulasi & auto-posting jurnal penyusutan bulanan, foto aset, disposal aset | `hitungPenyusutanAset`, `buatJurnalPenyusutanBulanan`, `disposalAset` |
| 11 | `11-kontak-invoice.js` | 357 | CRUD kontak (pelanggan/supplier), invoice dengan tracking piutang, rekonsiliasi bank via upload CSV | `simpanInvoice`, `simpanKontak`, `handleRekonCSV` |
| 12 | `12-kalkulator.js` | 2.261 | Kalkulator: penyusutan (4 metode), persediaan (FIFO/LIFO/AVG), bunga & anuitas, rasio keuangan (20+), BEP, PPN, **PPh 21 lengkap** (TER, progresif, bukan pegawai, pensiun, dsb), PPh 23, PPh Badan | `hitungPPh21`, `hitungRasio`, `hitungBEP` |
| 13 | `13-analitik-dashboard.js` | 1.921 | Dashboard utama, 10+ jenis grafik canvas custom (bar, line, waterfall, heatmap, proyeksi regresi linear), pencarian global, rekap pajak siap setor | `renderDashboard`, `anDrawWaterfall`, `openGlobalSearch` |
| 14 | `14-export.js` | 3.033 | Export Excel (dengan formula aktif via SheetJS), PDF multi-template dengan color picker & preview interaktif (jsPDF), CSV | `exportExcelFormula`, `doExport`, `pvBuildPages` |
| 15 | `15-storage.js` | 487 | Persistence lokal: save/load `localStorage`, slot backup manual, auto-save debounce, export/import backup `.bhp` (JSON), reset data | `saveToStorage`, `exportBackupJSON`, `doResetAll` |
| 16 | `16-auth-company.js` | 1.771 | Auth Supabase (login/register/OAuth Google/reset password), manajemen banyak company per user, sinkronisasi jurnal/akun/profil ke cloud, panduan setup SQL Supabase | `doLogin`, `createCompany`, `selectCompany`, `loadDataFromSupabase` |
| 17 | `17-settings-profil.js` | 781 | Profil perusahaan, pengaturan akun (link/unlink provider, ganti password), onboarding wizard, pengaturan invoice/tahun buku/mata uang | `saveProfil`, `checkShowOnboarding`, `accsUpdatePassword` |
| 18 | `18-audit-permission.js` | 1.185 | Audit trail semua aksi, sistem role & permission per modul untuk anggota tim, join code (invite link 7 hari) | `auditLog`, `hasPerm`, `getOrCreateJoinCode`, `_processJoinCode` |
| 19 | `19-fitur-tambahan.js` | 1.759 | Kumpulan fitur: jurnal berulang, rekonsiliasi bank (parser CSV multi-bank BCA/Mandiri/BNI/BRI/CIMB), kurs multi mata uang, notifikasi/alert, anggaran vs aktual, lampiran file per jurnal, PWA install prompt | `jalankanJurnalBerulang`, `parseBankStatement`, `cekNotifikasi` |
| 20 | `20-ai-chat.js` | 1.264 | **Orias Assisten** — chat AI via Groq API dengan rotasi multi API-key & cooldown rate-limit, pencatatan transaksi dari bahasa natural | `callGroqWithRotation`, `sendAI`, `saveJurnalFromAI` |
| 99 | `99-init.js` | 14 | Patch kecil perilaku DOM (backdrop kontak picker) setelah semua modul termuat | — |

### Dependency graph (disederhanakan)

```
00-db-adapter (Supabase client + DB.*)
   └─▶ 16-auth-company, 18-audit-permission  (satu-satunya pemanggil DB.table)

01-state (semua data global)
   └─▶ SEMUA file 02–20 membaca/menulis variabel di sini

02-utils (fmtRp, escapeHtml, dst)
   └─▶ dipakai hampir di semua modul render (03, 05–14, 17–20)

03-widgets (showAlert, modal, opt-picker)
   └─▶ dipakai hampir semua modul yang punya UI interaktif

08-kartu-stock ◀──▶ 06-transaksi, 09-produk, 07-jurnal-laporan
   (transaksi jual/beli memicu update kartu stock & jurnal HPP)

15-storage ◀──▶ 01-state, 16-auth-company
   (localStorage = fallback; Supabase = source of truth saat online)

20-ai-chat ──▶ 02-utils (parseJurnalFromAI) ──▶ 06-transaksi (posting jurnal)
```

---

## 6. Manajemen State Global (ringkas)

Karena tidak ada module system, semua "state store" aplikasi adalah variabel
`let`/`const` di top-level `01-state.js` dan beberapa file lain yang
menambah state spesifik modulnya sendiri. Daftar lengkap ada di
[`SCHEMA.md` §4](./SCHEMA.md#4-skema-runtime-state-in-memory-js). Kategorinya:

- **Data akuntansi inti**: `akuns`, `jurnalEntries`, `jurnalCounter`
- **Master data**: `produkList`, `kontakList`, `asetTetapList`
- **Operasional**: `invoiceList`, `jurnalBerulangList`, `anggaranList`,
  `rekonData`, `kursData`
- **Notifikasi**: `notifAlerts`, `notifHistory`
- **Persediaan**: `multiKartuStock` (didefinisikan di `08-kartu-stock.js`)
- **Auth & tenant**: `currentUser`, `currentCompany`, `isGuestMode`,
  `_authReady`
- **AI**: `aiHistory`, `aiThinking`
- **UI**: `currentPage`

---

## 7. Model Multi-Tenant & Otorisasi

```
auth.users (Supabase Auth)
   │  1 user → banyak company (via companies.user_id)
   ▼
companies  ──┬──▶ jurnal_entries   (company_id FK, cascade delete)
             ├──▶ akuns             (company_id FK, unique per kode)
             ├──▶ company_profiles  (1:1, data JSON bebas)
             ├──▶ org_members       (anggota tim + role + permissions JSON)
             └──▶ company_join_codes (kode undangan, expire 7 hari)
```

- **Role**: `admin` (pemilik company atau `org_members.role='admin'`) vs
  `member`. Admin selalu punya akses penuh (`isAdmin()`).
- **Permission granular**: tiap member punya objek `permissions` per modul
  (`{modul: {read, create, update, delete}}`), ditegakkan di client lewat
  `hasPerm(mod, act)` dan `enforcePermissions()` yang menyembunyikan
  tombol/nav sesuai izin. **Catatan penting**: ini adalah UX-level
  enforcement, bukan security boundary — keamanan data sesungguhnya
  ditegakkan oleh RLS policy di Postgres (lihat [`SCHEMA.md` §2](./SCHEMA.md#2-skema-cloud-supabase--postgres)), karena
  permission JSON per-modul di atas tidak direplikasi jadi RLS policy
  granular per operasi.
- **Join flow**: admin generate `company_join_codes.code` (8 karakter,
  expire 7 hari) → dibagikan sebagai URL `?join=CODE` → user lain login →
  `checkJoinCodeInURL()` → `_processJoinCode()` insert baris baru ke
  `org_members` dengan role `member` dan permission default.

---

## 8. Observasi Teknis & Rekomendasi

Bagian ini mencatat kondisi nyata source code saat ini untuk jadi acuan
pengembangan lanjutan (hasil audit sebelumnya + temuan tambahan saat
menyusun dokumen ini):

1. **`js/db-adapter.js` (tanpa prefix nomor) adalah file mati** — isinya
   identik dengan `00-db-adapter.js` tapi tidak di-load oleh
   `index.html`. Aman dihapus, atau jika sengaja dipertahankan sebagai
   referensi, sebaiknya diberi catatan eksplisit di README agar tidak
   dikira bug oleh kontributor lain.
2. **Global scope tanpa modul = risiko tabrakan nama tetap ada** meski
   sudah dipecah jadi 21 file. Memecah file secara fisik tidak memberi
   isolasi namespace seperti ES Modules — audit ulang penamaan fungsi
   secara berkala (`grep -oE "^function [a-zA-Z0-9_]+" js/*.js | sort |
   uniq -d`) tetap perlu dilakukan setiap kali menambah fitur besar.
3. **Urutan `<script defer>` di `index.html` adalah dependency yang tidak
   dieksplisitkan di kode** — tidak ada `import` yang memaksa urutan benar.
   Kalau suatu saat migrasi ke ES Modules asli (`type="module"` +
   `import`/`export`), urutan ini otomatis jadi eksplisit dan lebih aman.
4. **`DB.table()` masih bocor query-builder Supabase ke seluruh call
   site** (`.eq()`, `.upsert()`, `.select().single()`, dst dipanggil
   langsung dari `16-auth-company.js` & `18-audit-permission.js`). Migrasi
   provider di masa depan tetap butuh menyentuh ~20 titik pemanggilan,
   bukan hanya adapter — kalau ingin adapter benar-benar provider-agnostic,
   pertimbangkan membungkus method generik (`DB.insert(table, data)`,
   `DB.select(table, filters)`, dst) alih-alih pass-through query builder.
5. **`company_profiles.data` sebagai JSONB "catch-all"** dipakai untuk
   menyimpan profil bisnis (`_profil`) DAN seluruh kartu stock
   (`_multi_kartu_stock`) dalam satu baris JSON. Ini praktis untuk
   iterasi cepat tanpa migrasi skema, tapi berisiko row size besar dan
   race condition saat dua proses meng-update `data` bersamaan (pola
   read-modify-write yang terlihat di `saveProfilToSupabase` dan
   `saveKartuStockToCloud`) — pertimbangkan tabel terpisah
   (`kartu_stock`) jika data persediaan terus tumbuh.
6. **Permission enforcement client-side tanpa RLS granular per modul** —
   lihat §7. Selama RLS Postgres hanya membatasi per `company_id` (bukan
   per modul/aksi), seorang `member` dengan akses network tools bisa
   secara teknis melewati batasan `permissions` JSON via panggilan
   Supabase langsung. Untuk data sensitif, ini layak ditingkatkan jadi RLS
   policy per tabel yang membaca `org_members.permissions`.
7. **Tidak ada automated test.** Validasi saat ini murni manual +
   `node --check` untuk syntax. Mengingat ukuran modul kalkulator pajak
   (`12-kalkulator.js`, 2.261 baris, termasuk logika PPh 21 TER yang
   kompleks), modul ini adalah kandidat prioritas tertinggi untuk unit
   test murni (fungsi-fungsi `hitungPPhXxx` tidak menyentuh DOM, cocok
   untuk diekstrak & dites terpisah).

---

## 9. Referensi Silang

- Struktur database lengkap (cloud + local + in-memory): lihat **[`SCHEMA.md`](./SCHEMA.md)**.
- Panduan pemisahan file sebelumnya (v4) & audit fungsi/global: tersimpan
  sebagai bagian dari riwayat proyek (`ARCHITECTURE.md`/`PANDUAN_PISAH_FILE.md`
  versi sebelumnya, jika masih relevan bisa digabung sebagai lampiran di
  repo terpisah/wiki).
