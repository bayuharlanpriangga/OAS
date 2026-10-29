# SCHEMA.md — OAS (Orias Accounting System)

> Dokumen ini memetakan **tiga lapis penyimpanan data** yang dipakai OAS:
> (1) database cloud Supabase/Postgres, (2) `localStorage` browser, dan
> (3) struktur objek in-memory (runtime state JS). Ketiganya saling
> berhubungan tapi TIDAK identik satu sama lain — beberapa data hanya ada
> di localStorage dan tidak pernah disinkron ke cloud (lihat §5 "Gap
> Sinkronisasi").

---

## 1. Ringkasan Model Data

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE (Postgres, cloud)                   │
│  companies · jurnal_entries · akuns · company_profiles ·         │
│  org_members · company_join_codes                                │
│  → source of truth ketika user LOGIN & pilih company              │
└───────────────────────────┬────────────────────────────────────┘
                              │ sync (save*ToSupabase / loadDataFromSupabase)
┌───────────────────────────▼────────────────────────────────────┐
│                    RUNTIME STATE (JS, in-memory)                 │
│  akuns · jurnalEntries · produkList · kontakList · invoiceList · │
│  asetTetapList · multiKartuStock · anggaranList · kursData · ... │
│  → apa yang benar-benar dibaca/ditulis oleh UI saat aplikasi     │
│    berjalan                                                       │
└───────────────────────────┬────────────────────────────────────┘
                              │ auto-save debounce 3 detik
┌───────────────────────────▼────────────────────────────────────┐
│                  localStorage (browser, per-device)               │
│  oas_data_v2_<companyId> · oas_meta_v2_<companyId> ·              │
│  oas_jb · oas_invoices · oas_kontak · oas_aset_tetap · ... (17 key)│
│  → cache offline + SATU-SATUNYA penyimpanan saat Mode Tamu        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Skema Cloud (Supabase / Postgres)

Sumber: SQL DDL yang di-generate langsung oleh aplikasi sendiri lewat
`showSupabaseSetup()` (`16-auth-company.js`) dan `showOrgMembersSQL()`
(`19-fitur-tambahan.js`) — user menyalin SQL ini ke Supabase SQL Editor
saat setup awal. Berikut skema lengkap dan terkonsolidasi:

### 2.1 ERD (ringkas)

```
auth.users (Supabase Auth, built-in)
    │ 1
    │
    │ *
companies ──────────────┬──────────────┬──────────────┬────────────────
    │ id (PK)            │              │              │
    │ user_id (FK)        │              │              │
    │ name                 │              │              │
    │ type                  │              │              │
    │ created_at             │              │              │
    │                         │              │              │
    │ 1                        │ 1            │ 1            │ 1
    ▼ *                        ▼ 1            ▼ *            ▼ 1
jurnal_entries          company_profiles  org_members  company_join_codes
  id (PK)                 id (PK)           id (PK)       id (PK)
  company_id (FK)          company_id (FK,   company_id    company_id (FK,
  no                        UNIQUE)           (FK)          UNIQUE)
  tanggal                   data (jsonb)      user_id (FK   code (UNIQUE)
  ket                       updated_at         auth.users)  created_by (FK)
  jenis                                        email        expires_at
  lines (jsonb)                                nama, nik,   created_at
  attachments (jsonb)                          jabatan
  created_at                                   role
                                                permissions (jsonb)
akuns                                          status
  id (PK)                                      invited_by (FK)
  company_id (FK)                              created_at
  kode
  nama
  tipe
  normal
  UNIQUE(company_id, kode)
```

### 2.2 DDL Lengkap

```sql
-- ════════════════════════════════════════════════════════════════
-- 1. companies — root tenant. Satu baris = satu "bisnis" milik user.
-- ════════════════════════════════════════════════════════════════
CREATE TABLE companies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text DEFAULT 'umum',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own companies"
  ON companies FOR ALL USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════════
-- 2. jurnal_entries — satu baris = satu entri jurnal (bisa multi-line
--    debit/kredit, disimpan sebagai JSON di kolom `lines`).
-- ════════════════════════════════════════════════════════════════
CREATE TABLE jurnal_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  no text NOT NULL,
  tanggal date,
  ket text,
  jenis text,                    -- 'Manual' | 'Kas' | 'Penjualan' | 'Pembelian' | ...
  lines jsonb DEFAULT '[]',      -- [{akun, ket, debit, kredit}, ...]
  attachments jsonb DEFAULT '[]',-- [{nama, url/base64, tipe}, ...]
  meta jsonb DEFAULT '{}',       -- {sumber:'Orias AI', _ppnTarif, _ksId} (sql/002_jurnal_meta.sql)
  created_at timestamptz DEFAULT now()
);
ALTER TABLE jurnal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own jurnal"
  ON jurnal_entries FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ════════════════════════════════════════════════════════════════
-- 3. akuns — Chart of Accounts per company (override dari seed default).
-- ════════════════════════════════════════════════════════════════
CREATE TABLE akuns (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  kode text NOT NULL,
  nama text,
  tipe text,     -- 'Aset' | 'Liabilitas' | 'Ekuitas' | 'Pendapatan' | 'HPP' | 'Beban'
  normal text,   -- 'D' (Debit) | 'K' (Kredit)
  UNIQUE(company_id, kode)
);
ALTER TABLE akuns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own akuns"
  ON akuns FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ════════════════════════════════════════════════════════════════
-- 4. company_profiles — "catch-all" JSONB 1:1 per company. Menyimpan
--    profil bisnis (key `_profil`) dan seluruh kartu stock
--    (key `_multi_kartu_stock`) dalam satu baris.
-- ════════════════════════════════════════════════════════════════
CREATE TABLE company_profiles (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  data jsonb DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own profiles"
  ON company_profiles FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));

-- ════════════════════════════════════════════════════════════════
-- 5. org_members — anggota tim per company + role & permission granular.
-- ════════════════════════════════════════════════════════════════
CREATE TABLE org_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,
  nama text, nik text, jabatan text,
  role text DEFAULT 'member',        -- 'admin' | 'member'
  permissions jsonb DEFAULT '{}',    -- {modul: {read,create,update,delete}}
  status text DEFAULT 'pending',     -- 'pending' | 'active'
  invited_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Org members access" ON org_members FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
         OR user_id = auth.uid());
CREATE INDEX idx_org_members_company ON org_members(company_id);
CREATE INDEX idx_org_members_email ON org_members(email);

-- ════════════════════════════════════════════════════════════════
-- 6. company_join_codes — kode undangan 8-karakter, berlaku 7 hari.
-- ════════════════════════════════════════════════════════════════
CREATE TABLE company_join_codes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE company_join_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Join codes access" ON company_join_codes FOR ALL
  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));
CREATE POLICY "Anyone can read join code by code value"
  ON company_join_codes FOR SELECT USING (true);
```

### 2.2b `company_records` — invoice, bill, pembayaran, kontak, aset tetap, produk, jurnal berulang, anggaran, alert, kurs, counter

Migrasi: [`docs/migrations/001_company_records.sql`](./migrations/001_company_records.sql).
Satu baris = satu record, dipisah per bisnis. Dipakai oleh `js/22-cloud-records.js`.

| Kolom | Tipe | Isi |
|---|---|---|
| `company_id` | uuid, FK `companies` | Pemilik data (ON DELETE CASCADE) |
| `kind` | text | `invoice` \| `bill` \| `pembayaran` \| `kontak` \| `aset_tetap` \| `produk` \| `jurnal_berulang` \| `anggaran` \| `alert` \| `kurs` \| `counter` |
| `rec_id` | text | id record di app (`INV_..`, `BILL_..`, `PAY_..`, `KTK_..`, `AT_..`, `jb_..`, `ang_..`, `alert_..`, `kurs` (satu record), `INV-2026` untuk counter penomoran (`{ id, jenis, tahun, terakhir }`), atau `ksId` untuk produk) |
| `data` | jsonb | isi record apa adanya |
| `updated_at` | timestamptz | waktu sync terakhir |

PK `(company_id, kind, rec_id)`. RLS: pemilik company, sama dengan tabel lain.

### 2.3 Row Level Security — model keamanan

> **Pembaruan 12 Okt 2026 (task 3.2a):** `docs/migrations/002_akses_tim_inti.sql` menggantikan policy `companies`, `org_members`, dan `company_join_codes` di atas: anggota `active` dapat membaca bisnisnya; `org_members` hanya bisa diubah owner/admin (insert diri sendiri ditolak); `SELECT USING (true)` pada `company_join_codes` dihapus; masuk hanya lewat fungsi `gabung(kode)` (peran awal `viewer`), `klaim_undangan()`, dan `buat_kode_gabung(cid)`. Peran valid: `admin | member | viewer` (owner = `companies.user_id`). Fungsi bantu: `peran_saya(cid)`, `pemilik_bisnis(cid)`. Policy `jurnal_entries`, `akuns`, `company_profiles`, `company_records` diperbarui di `docs/migrations/003_akses_tim_data.sql` (task 3.2b): viewer=SELECT, member=SELECT/INSERT/UPDATE/DELETE (akuns & company_profiles tanpa DELETE), admin=semua, owner=semua. Blok DDL di atas adalah kondisi awal, bukan kondisi terkini.

> **Fungsi rpc akses tim (dari 002, dipakai client):** `gabung(kode text) → jsonb {company_id, nama, peran, hasil}` dengan `hasil` = `bergabung` | `diaktifkan` | `sudah_anggota`; kode salah/kedaluwarsa = `raise exception` (`P0001`), belum login = `28000`; peran awal `viewer`. `buat_kode_gabung(cid uuid) → text` (kode 8 karakter, dibuat di database). `klaim_undangan() → integer`. `peran_saya(cid uuid) → text`, `pemilik_bisnis(cid uuid) → uuid`. File 002 tidak ada di repo (dijalankan langsung di SQL Editor).


Semua tabel (kecuali `SELECT` di `company_join_codes`) dibatasi lewat
`company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())`.
Artinya: **isolasi data ditegakkan berdasarkan siapa pemilik company**
(`companies.user_id`), BUKAN berdasarkan `org_members.role`/`permissions`.
Konsekuensi penting:
- Seorang **admin pemilik company** selalu punya akses penuh ke semua
  tabel di bawahnya — sesuai desain.
- Seorang **member** yang diundang lewat join code masuk ke
  `org_members`, tapi RLS di atas **tidak** memberi mereka akses ke
  `jurnal_entries`/`akuns` company tersebut secara otomatis lewat baris
  policy yang ada (policy hanya cek `companies.user_id`, bukan
  keanggotaan di `org_members`). Fitur permission granular
  (`hasPerm()`) saat ini murni **client-side UX gating**, bukan RLS
  policy — lihat catatan di [`ARCHITECTURE.md` §8](./ARCHITECTURE.md#8-observasi-teknis--rekomendasi) poin 6.

---

## 3. Skema `localStorage` (Browser)

Semua key di-prefix `oas_` untuk menghindari tabrakan dengan aplikasi lain
di origin yang sama. Beberapa key di-scope per-company (`_<companyId>`
di akhir), sisanya global per-browser/device.

| Key | Scope | Bentuk | Isi |
|---|---|---|---|
| `oas_data_v2_<companyId>` | Per company (atau `_guest`) | JSON object | `{ version, savedAt, jurnalEntries[], jurnalCounter, akuns[], produkList[], appName }` — **payload utama** hasil `serializeData()` |
| `oas_meta_v2_<companyId>` | Per company | JSON object | `{ lastSave, jurnalCount, akunCount, version }` — metadata ringan untuk indikator "tersimpan" |
| `oas_data_v2` / `oas_meta_v2` | Global (legacy) | sama seperti di atas | Fallback untuk data lama sebelum sistem key per-company ada |
| `oas_slots_v2` | Global | JSON array | Daftar slot backup manual (multi-save point) |
| `oas_autosave_enabled` | Global | `'true'` \| `'false'` | Toggle auto-save |
| `oas_theme` | Global | `'dark'` \| `'light'` | Preferensi tema, dibaca sebelum render pertama (anti-flicker) |
| `oas_jb` | Global | JSON array | `jurnalBerulangList` — template jurnal berulang (gaji, sewa, dst) |
| `oas_jb_hist` | Global | JSON array | Riwayat eksekusi jurnal berulang |
| `oas_invoices` | Global (hanya mode tamu) | JSON array | `invoiceList`. Saat login, data ada di `company_records`; key ini tidak ditulis lagi |
| `oas_kontak` | Global (hanya mode tamu) | JSON array | `kontakList` (pelanggan/supplier). Saat login: `company_records` |
| `oas_aset_tetap` | Global (hanya mode tamu) | JSON array | `asetTetapList`. Saat login: `company_records` |
| `oas_bill` | Global (hanya mode tamu) | JSON array | `billList` — tagihan pembelian. Saat login: `company_records` (`kind='bill'`). Ditulis sejak task 4.4; ditawarkan sekali ke bisnis pemilik lewat migrasi data lokal (`legacyOnce`) |
| `oas_pembayaran` | Global (hanya mode tamu) | JSON array | `pembayaranList` — pembayaran invoice/bill. Saat login: `company_records` (`kind='pembayaran'`). Ditulis sejak task 5.2; ditawarkan sekali ke bisnis pemilik lewat migrasi data lokal (`legacyOnce`) |
| `oas_counter` | Global | JSON array | `[{ id:'INV-2026', jenis, tahun, terakhir }]` — nomor tertinggi yang pernah dipakai per jenis+tahun (mode tamu) |
| `oas_kurs` | Global | JSON object | `{ USD, IDR, SGD, EUR, MYR, JPY, updatedAt }` — kurs multi mata uang |
| `oas_alerts` | Global | JSON array | `notifAlerts` — aturan notifikasi (arus kas negatif, jatuh tempo, dst) |
| `oas_notif_hist` | Global | JSON array | `notifHistory` — riwayat notifikasi yang sudah muncul |
| `oas_anggaran` | Global | JSON array | `anggaranList` — anggaran vs aktual per periode |
| `oas_rec_<kind>_<companyId>` | Per company | JSON array | Cache lokal invoice/bill/pembayaran/kontak/aset_tetap/produk/jurnal_berulang/anggaran/alert/kurs/counter; dipakai bila cloud gagal dimuat atau ditulis |
| `oas_rec_snaph_<companyId>` | Per company | JSON object | `{ kind: { recId: hash } }` — hash tiap record pada keadaan cloud terakhir yang terkonfirmasi (selesai dimuat / sync sukses). Saat memuat, selisihnya dengan cache = perubahan yang belum tersinkron; diterapkan di atas data cloud lalu dikirim ulang, jadi tidak hilang walau halaman di-refresh saat offline |
| `oas_rec_seen_<companyId>` / `oas_rec_legacy_claimed` | Per company / global | `'1'` / companyId | Penanda migrasi data lama: data global hanya boleh dipindah ke satu bisnis dan tidak ditawarkan ulang |
| `oas_mks_<companyId>` / `oas_mks_guest` | Per company | JSON object | Fallback lokal untuk `multiKartuStock` bila gagal sync ke cloud |
| `oas_profil` / `oas_profil_v1` | Global | JSON object | Profil perusahaan (nama, alamat, logo ref, dsb) — legacy key ganda |
| `oas_company_logo` | Global | base64 string | Logo perusahaan (fallback lokal) |
| `oas_profile_photo` | Global | base64 string | Foto profil user |
| `oas_onboarded` | Global | `'true'` \| absent | Flag sudah lewat onboarding wizard |
| `oas_chips_visible` | Global | `'true'` \| `'false'` | Toggle tampilan quick-chips AI |
| `oas_audit_trail` | Global | JSON array | Log audit trail lokal (aksi CRUD, login/logout) |
| `oas_ai_visited` | Global | flag | Penanda user pernah membuka fitur AI (untuk tutorial) |
| `_oas_test` | Global (temporary) | `'1'` | Hanya dipakai `00-db-adapter.js` untuk tes ketersediaan localStorage saat boot, langsung dihapus |

**Format versi**: `oas_data_v2_*` adalah generasi ke-2 (v2.0). Ada migrasi
otomatis di `loadFromStorage()` yang membuang entri jurnal lama berformat
`JRN_AT_*` (jurnal perolehan aset tetap era sebelumnya) karena sekarang
nilai aset tetap dihitung langsung dari `asetTetapList`, bukan dari CoA.

---

## 4. Skema Runtime State (In-Memory JS)

### 4.1 Chart of Accounts — `akuns[]`
```ts
{
  kode: string;      // "1101" — 4 digit, prefix menentukan kategori
  nama: string;       // "Kas"
  tipe: 'Aset' | 'Liabilitas' | 'Ekuitas' | 'Pendapatan' | 'HPP' | 'Beban';
  kat: string;         // sub-kategori bebas: "Lancar", "Tetap", "Kontra", dst
  normal: 'D' | 'K';    // saldo normal: Debit atau Kredit
}
```
Seed default (`01-state.js`) berisi ±100 akun mengikuti konvensi kode:
`1xxx`=Aset, `2xxx`=Liabilitas, `3xxx`=Ekuitas, `4xxx`=Pendapatan,
`5xxx`=HPP, `6xxx`=Beban. Akun kontra (mis. akumulasi penyusutan, retur
penjualan) ditandai `kat:'Kontra'` dengan `normal` dibalik dari tipe
induknya.

### 4.2 Jurnal — `jurnalEntries[]`
```ts
{
  id?: string;         // hanya di beberapa jenis entri auto-generated, mis. "JRN_INV_..."
  _id?: string;         // UUID dari Supabase setelah tersimpan ke cloud
  no: string;            // nomor jurnal tampilan
  tanggal: string;         // "YYYY-MM-DD"
  ket: string;              // keterangan
  jenis: 'Manual' | 'Kas' | 'Penjualan' | 'Pembelian' | ...;
  ref?: string;              // referensi ke INV-xxx / PO-xxx
  lines: {
    akun: string;             // kode akun, FK ke akuns[].kode
    ket?: string;
    debit: number;
    kredit: number;
  }[];
  attachments?: { nama: string; url?: string; tipe?: string }[];
}
```
Aturan bisnis: `sum(lines.debit) === sum(lines.kredit)` (validasi balance
sebelum simpan, ditegakkan di `06-transaksi.js`).

### 4.3 Produk — `produkList[]`
```ts
{
  ksId: string;        // FK ke kartu stock (multiKartuStock), bukan id sendiri
  hargaJual: number;
  akunPend: string;      // kode akun pendapatan, default '4101'
  akunHpp: string;         // kode akun HPP, default '5101'
  akunPers: string;          // kode akun persediaan, default '1301'
  ppn: number | null;          // override PPN per produk, null = ikut default global
}
```
> Catatan: produk **tidak** punya `nama`/`stok` sendiri — semua atribut
> deskriptif (nama, satuan, stok) ada di objek kartu stock terkait
> (`multiKartuStock`), diakses lewat `ksId`. `produkList` murni menyimpan
> **konfigurasi akuntansi** per item.

### 4.4 Kontak — `kontakList[]`
```ts
{
  id: string;           // "KTK_<timestamp>"
  nama: string;
  tipe: 'pelanggan' | 'supplier' | 'keduanya';
  telp?: string;
  email?: string;
  alamat?: string;
  npwp?: string;
  pic?: string;
  catatan?: string;
  totalTrx?: number;         // akumulasi nominal transaksi langsung
  totalPenjualan?: number;
  totalPembelian?: number;
  createdAt: string;          // ISO datetime
}
```

### 4.5 Invoice — `invoiceList[]`
```ts
{
  id: string;              // "INV_<timestamp>"
  noInvoice: string;
  pelanggan: string;         // nama kontak (bukan FK id)
  tanggal: string;
  jatuhTempo: string;
  deskripsi?: string;
  items: { nama?: string; qty: number; harga: number }[];
  subtotal: number;
  ppn: number;
  total: number;
  sisaTagihan: number;      // berkurang tiap kali dibayar sebagian/lunas. Sejak Fase 5 diisi ulang dari sisaTagihan() (31-pembayaran.js) setiap pembayaran ditambah/dihapus
  dibayarLama?: number;      // pembayaran lewat alur lama ("Tandai Lunas" tanpa record); kosong = 0. Lihat §4.5c
  status: 'draft' | 'terkirim' | 'lunas';
  akunPiutang: string;        // kode akun
  akunPend: string;             // kode akun
  createdAt: string;
}
```
Saat status `'terkirim'`, sistem otomatis membuat entri di `jurnalEntries`
(Debit Piutang, Kredit Pendapatan, Kredit PPN jika ada) — lihat
`simpanInvoice()`.

### 4.5b Bill (Tagihan Pembelian) — `billList[]`
State di `js/28-bill.js`; disinkron lewat `company_records` (`kind='bill'`, `rec_id` = `id`). Padanan invoice di sisi pembelian; bentuknya sengaja dibuat mirip supaya `hitungAging` (task 2.1) dan pola bayar (Fase 5) bisa dipakai ulang.
```ts
{
  id: string;              // "BILL_<timestamp>"
  noBill: string;            // nomor internal, mis. "BILL-2026-001" (penomoran: 23-penomoran.js, jenis 'BILL')
  supplier: string;          // nama kontak (bukan FK id), sama seperti invoice.pelanggan
  tanggal: string;           // "YYYY-MM-DD"
  jatuhTempo: string;        // "YYYY-MM-DD"
  deskripsi?: string;
  items: {
    nama?: string;
    qty: number;
    harga: number;
    akun: string;            // kode akun debit baris ini (Persediaan atau Beban)
  }[];
  subtotal: number;          // jumlah qty*harga, sebelum PPN
  ppn: number;               // PPN Masukan; 0 bila tanpa PPN
  ppnTarif: number;          // tarif PPN Masukan (persen) yang dipakai; 0 bila tanpa PPN (sama seperti invoice.ppnTarif)
  total: number;             // subtotal + ppn
  sisaTagihan: number;       // awal = total; berkurang saat dibayar (Fase 5). Diisi ulang dari sisaTagihan() (31-pembayaran.js)
  dibayarLama?: number;      // pembayaran yang sudah tercatat sebelum record pembayaran ada; kosong = 0. Lihat §4.5c
  status: 'draft' | 'diterima' | 'lunas';
  akunUtang: string;         // kode akun Utang Usaha (kredit)
  jurnalNo?: string;         // nomor jurnal utang ("JRN-012") yang dibuat saat status 'diterima' (4.6); kosong untuk draft dan bill lama dari 4.4 yang belum dijurnal
  createdAt: string;         // ISO datetime
}
```
Penyimpanan (task 4.4): record dibuat oleh `susunBill()` (28-bill.js, murni; baris item dengan qty/harga 0 dibuang; status `'diterima'` mewajibkan `akunUtang` dan `akun` tiap item, `'draft'` boleh belum lengkap) dan disimpan lewat `tambahBill()`: bisnis login → `company_records` (`kind='bill'` + `kind='counter'`), mode tamu → `oas_bill` + `oas_counter`. Nomor memakai counter jenis `BILL` (id `BILL-<tahun>`). Reset Data khusus Tagihan Pembelian membuang counter `BILL-*` saja (counter `INV-*` tidak ikut). Sejak 4.6, bill `'diterima'` langsung dijurnal; bill `'diterima'` dari 4.4 yang belum punya jurnal dijurnal lewat tombol "Buat Jurnal" di daftar.

Jurnal bill (4.5-4.6): saat status `'diterima'`, `buatJurnalBill()` (28-bill.js, murni) menyusun jurnal berjenis `Tagihan Pembelian` (`JENIS_JURNAL.BILL`): Debit akun tiap item (item berakun sama digabung) + PPN Masukan (ket `PPN Masukan NN%`, `_ppnTarif`), Kredit `akunUtang` sebesar total; `postingJurnalBill()` (29-bill-ui.js) memostingnya lewat `postJurnalLegacy` dan menyimpan nomor jurnalnya di `jurnalNo`. Penaut bill ke jurnal: `jurnalNo` + ket jurnal `Tagihan <noBill> — <supplier>` (`jurnalBillStatus()`), karena `id`/`ref` jurnal tidak tersimpan ke `jurnal_entries`. Menghapus bill yang sudah dijurnal membuat jurnal pembalik (jurnal asal tidak dihapus). Status `'draft'` tidak membuat jurnal. Field tambahan seperti nomor faktur pajak supplier (12.1) dan referensi pesanan pembelian (9.5) ditambahkan di task terkait.

### 4.5c Pembayaran — `pembayaranList[]`
State di `js/31-pembayaran.js`; disinkron lewat `company_records` (`kind='pembayaran'`, `rec_id` = `id`). Satu record = satu pembayaran atas satu dokumen. Task 5.1: model dan fungsi hitung. Task 5.2: form bayar invoice dan penyimpanan (tanpa jurnal). Jurnal invoice di 5.3, status turunan di 5.4, bill di 5.5.
```ts
{
  id: string;              // "PAY_<timestamp>"
  jenis: 'invoice' | 'bill';  // jenis dokumen yang dibayar
  dokId: string;             // id dokumen (invoice.id / bill.id), bukan nomor dokumen: nomor bisa berulang setelah Reset Data
  noDok: string;             // salinan nomor dokumen saat dibayar (noInvoice / noBill), hanya untuk tampilan
  tanggal: string;           // "YYYY-MM-DD"
  jumlah: number;            // > 0; tidak boleh melebihi sisa saat dicatat (divalidasi di 5.2)
  akunKas: string;           // kode akun Kas/Bank (invoice: debit; bill: kredit)
  metode?: string;           // mis. "Transfer", teks bebas
  catatan?: string;
  jurnalNo?: string;         // nomor jurnal pembayaran ("JRN-xxx"); diisi 5.3 (invoice) dan 5.5 (bill). Kosong = belum dijurnal (semua pembayaran dari 5.2 sampai 5.3 dikerjakan)
  createdAt: string;         // ISO datetime
}
```
Sisa tagihan dihitung, bukan dikurangi di tempat (fungsi murni di `31-pembayaran.js`, diuji `tests/pembayaran.test.js`):
`sisaTagihan(dok, daftar, jenis) = max(0, dok.total − dok.dibayarLama − Σ jumlah pembayaran dokumen itu)`.
Record dengan `jenis`/`dokId` yang tidak cocok, atau `jumlah` bukan angka > 0, diabaikan (termasuk pembayaran milik dokumen yang sudah dihapus).
Pencatatan (task 5.2, `js/31-pembayaran.js` + form `js/32-pembayaran-ui.js`): `susunPembayaran(f, dok, daftar, jenis)` (murni) memvalidasi dan menyusun record: dokumen berstatus boleh dibayar (invoice `terkirim`, bill `diterima`) dan masih bersisa; tanggal valid dan tidak sebelum tanggal dokumen; `jumlah` > 0 (dibulatkan ke sen) dan tidak melebihi sisa; `akunKas` terisi; `id` tidak kembar. Hasilnya `{ ok, pembayaran, dibayarLama, sisaBaru, lunas }` atau `{ ok:false, pesan }`. `catatPembayaran(dok, hasil)` menambah record (terbaru di atas), mengisi ulang `dok.dibayarLama` (hanya bila > 0) dan `dok.sisaTagihan` dari hasil hitung, mengubah status menjadi `lunas` bila sisa 0 (parity alur lama; status turunan lengkap di 5.4), lalu menyimpan lewat `simpanPembayaranState(jenis)`: bisnis login → satu antrean sinkron `[invoice|bill, 'pembayaran']`; mode tamu → `oas_pembayaran` + `oas_invoices`/`oas_bill`. Pembayaran dari 5.2 belum punya jurnal: Kas dan Piutang di buku besar belum berubah sampai 5.3 menjurnalkan record yang `jurnalNo`-nya kosong.
`dibayarLama` menampung pembayaran lewat alur lama ("Tandai Lunas", `konfirmasiLunasInvoice` di `11-kontak-invoice.js`) yang hanya mengurangi `sisaTagihan` tanpa membuat record; pembayaran baru di dokumen seperti itu (5.2) mengisinya lewat `dibayarLamaTurunan` = `max(dibayarLama, total − sisaTagihan tersimpan − Σ record)`, supaya sisa lama tidak hidup lagi, termasuk bila "Tandai Lunas" dipakai sesudah ada record.

### 4.6 Aset Tetap — `asetTetapList[]`
```ts
{
  id: string;               // "AT_<timestamp>"
  nama: string;
  hargaPerolehan: number;
  kategori: string;
  tglPerolehan: string;
  nilaiResidu: number;
  umurEkonomis: number;        // dalam tahun
  metode: 'garis-lurus' | 'saldo-menurun' | 'sum-of-years' | 'unit-produksi';
  lokasi?: string;
  status: 'aktif' | 'disposal';
  createdAt: string;
}
```
Nilai buku dihitung real-time di dashboard dari `asetTetapList`
(bukan dari saldo akun CoA) — jurnal penyusutan bulanan dibuat otomatis
via `buatJurnalPenyusutanBulanan()`, tapi jurnal perolehan awal **tidak**
otomatis diposting (by design, lihat komentar di `simpanAsetTetap()`)
untuk menghindari duplikasi nilai aset.

### 4.7 Kartu Stock — `multiKartuStock` (didefinisikan di `08-kartu-stock.js`)
```ts
// Objek map, key = id kartu stock (kategori level 1)
{
  [ksId: string]: {
    id: string;
    nama: string;
    satuan: string;
    stok: number;
    stokMin?: number;
    entries: {                 // layer FIFO per pembelian
      tanggal: string;
      qty: number;
      hargaSatuan: number;
      sisaQty: number;           // berkurang saat penjualan (FIFO consumption)
    }[];
    kategori?: {                  // sub-kategori bertingkat (opsional)
      [subId: string]: { /* struktur sama seperti di atas */ };
    };
  };
}
```
Ini adalah struktur paling kompleks di aplikasi — setiap pembelian
menambah `entries[]` sebagai layer baru (FIFO), setiap penjualan
mengonsumsi layer terlama lewat `getHppLayersForSale()` dan membuat
baris jurnal HPP proporsional lewat `buildHppJurnalLines()`.

### 4.8 State pendukung lain
```ts
jurnalBerulangList: {
  id: string; ket: string; jenis: string; lines: JurnalLine[];
  frekuensi: 'bulanan' | 'mingguan' | ...;
  tanggalBerikutnya: string; aktif: boolean;
}[]

anggaranList: {
  akun: string; periode: string; jumlahAnggaran: number;
}[]

kursData: {
  USD: number; IDR: number; SGD: number; EUR: number; MYR: number; JPY: number;
  updatedAt: string | null;
}

notifAlerts: {
  id: string; jenis: string; kondisi: any; aktif: boolean;
}[]

currentUser: SupabaseUser | null       // objek user dari Supabase Auth
currentCompany: { id, name, type, user_id } | null
isGuestMode: boolean
```

---

## 5. Gap Sinkronisasi Cloud ↔ Local (penting untuk pengembangan)

Tidak semua state runtime disinkronkan ke Supabase. Berdasarkan pemetaan
`DB.table()` di §2 vs daftar state di §4, berikut yang **hanya** hidup di
`localStorage` (tidak ada tabel cloud khusus untuknya):

| Data | Disimpan di cloud? | Lokasi aktual |
|---|---|---|
| `jurnalEntries`, `akuns` | ✅ Ya | `jurnal_entries`, `akuns` |
| Profil perusahaan | ✅ Ya (sebagai JSON) | `company_profiles.data._profil` |
| `multiKartuStock` | ✅ Ya (sebagai JSON) | `company_profiles.data._multi_kartu_stock` |
| `produkList` | ✅ Ya | `company_records` (`kind='produk'`). Sebelumnya tidak tersimpan sama sekali untuk bisnis login |
| `invoiceList` | ✅ Ya | `company_records` (`kind='invoice'`) |
| `billList` | ✅ Ya | `company_records` (`kind='bill'`) |
| `pembayaranList` | ✅ Ya | `company_records` (`kind='pembayaran'`). Mode tamu: `oas_pembayaran` (sejak 5.2) |
| `kontakList` | ✅ Ya | `company_records` (`kind='kontak'`) |
| `asetTetapList` | ✅ Ya | `company_records` (`kind='aset_tetap'`) |
| `jurnalBerulangList` | ✅ Ya | `company_records` (`kind='jurnal_berulang'`) |
| `anggaranList` | ✅ Ya | `company_records` (`kind='anggaran'`) |
| `notifAlerts` | ✅ Ya | `company_records` (`kind='alert'`) |
| `counterList` | ✅ Ya | `company_records` (`kind='counter'`, satu record per jenis+tahun, id mis. `INV-2026`; hanya naik) |
| `kursData` | ✅ Ya | `company_records` (`kind='kurs'`, satu record `id='kurs'`; hanya ditulis bila `updatedAt` terisi) |
| `jurnalBerulangHistory`, `notifHistory` | ❌ Tidak | localStorage, global |
| `org_members`, `company_join_codes` | ✅ Ya | tabel sendiri |

**Status**: invoice, bill, pembayaran, kontak, aset tetap, produk, jurnal berulang, anggaran, alert, dan kurs sudah disinkron per bisnis
lewat `company_records` (`js/22-cloud-records.js`), jadi ikut berpindah antar
perangkat dan tidak tercampur antar bisnis. Key global `oas_invoices`,
`oas_bill`, `oas_pembayaran`,
`oas_kontak`, `oas_aset_tetap`, `oas_jb`, `oas_anggaran`, `oas_alerts`, `oas_kurs`, `oas_counter` hanya dipakai mode tamu.
Data lama di key global ditawarkan untuk diunggah sekali per kind per bisnis
(flag `oas_rec_seen_<companyId>_<kind>`), dan hanya ke satu bisnis
(`oas_rec_legacy_claimed_<kind>`).

**Yang masih hanya di localStorage dan global** (belum di-scope per company,
jadi masih berpotensi bocor antar bisnis di browser yang sama dan tidak
berpindah perangkat): `jurnalBerulangHistory` dan `notifHistory`. Tabel `company_records` sengaja generik (kolom `kind`), jadi
menambahkan mereka cukup menambah entri di `CLOUD_RECORD_KINDS`.

---

## 6. Ringkasan Struktur Chart of Accounts Default

Seed di `01-state.js` (~100 akun) mengikuti struktur kode 4-digit:

| Prefix | Tipe | Contoh |
|---|---|---|
| `11xx` | Aset Lancar (Kas & setara kas) | Kas, Bank BCA, Bank Mandiri |
| `12xx` | Aset Lancar (Piutang) | Piutang Usaha, Cadangan Kerugian Piutang |
| `13xx` | Aset Lancar (Persediaan) | Persediaan Barang Dagangan/Bahan Baku/Jadi |
| `14xx`–`16xx` | Aset Lancar lain | Perlengkapan, Uang Muka, PPN/PPh Dibayar Dimuka |
| `17xx` | Aset Tetap | Tanah, Bangunan, Kendaraan + Akumulasi Penyusutan (kontra) |
| `18xx`–`19xx` | Aset Lain | Aset Tak Berwujud, Investasi Jk Panjang |
| `21xx`–`27xx` | Liabilitas Lancar | Utang Usaha, Utang Gaji, Utang PPN/PPh, BPJS |
| `28xx` | Liabilitas Jk Panjang | Utang Bank, Leasing, Obligasi |
| `31xx`–`32xx` | Ekuitas | Modal, Prive, Laba Ditahan/Berjalan |
| `41xx`–`43xx` | Pendapatan | Penjualan Barang/Jasa, Retur (kontra), Komisi, Sewa |
| `51xx`–`52xx` | HPP | HPP, Pembelian, Biaya Produksi (bahan/tenaga kerja/overhead) |
| `61xx`–`67xx` | Beban Operasional | SDM, Operasional, Penyusutan, Pemasaran, Administrasi, Non-Operasional |

Template akun per jenis bisnis (`applyTemplate()` di `05-akun.js`) memilih
subset dari daftar ini sesuai jenis usaha yang dipilih user saat membuat
company baru.
