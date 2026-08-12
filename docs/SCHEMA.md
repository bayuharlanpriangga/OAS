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

### 2.3 Row Level Security — model keamanan

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
| `oas_invoices` | Global | JSON array | `invoiceList` |
| `oas_kontak` | Global | JSON array | `kontakList` (pelanggan/supplier) |
| `oas_aset_tetap` | Global | JSON array | `asetTetapList` |
| `oas_kurs` | Global | JSON object | `{ USD, IDR, SGD, EUR, MYR, JPY, updatedAt }` — kurs multi mata uang |
| `oas_alerts` | Global | JSON array | `notifAlerts` — aturan notifikasi (arus kas negatif, jatuh tempo, dst) |
| `oas_notif_hist` | Global | JSON array | `notifHistory` — riwayat notifikasi yang sudah muncul |
| `oas_anggaran` | Global | JSON array | `anggaranList` — anggaran vs aktual per periode |
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
  sisaTagihan: number;      // berkurang tiap kali dibayar sebagian/lunas
  status: 'draft' | 'terkirim' | 'lunas';
  akunPiutang: string;        // kode akun
  akunPend: string;             // kode akun
  createdAt: string;
}
```
Saat status `'terkirim'`, sistem otomatis membuat entri di `jurnalEntries`
(Debit Piutang, Kredit Pendapatan, Kredit PPN jika ada) — lihat
`simpanInvoice()`.

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
| `produkList` | ❌ Tidak | hanya `oas_data_v2_<companyId>` (localStorage) |
| `invoiceList` | ❌ Tidak | hanya `oas_invoices` (localStorage, global — tidak di-scope per company!) |
| `kontakList` | ❌ Tidak | hanya `oas_kontak` (localStorage, global) |
| `asetTetapList` | ❌ Tidak | hanya `oas_aset_tetap` (localStorage, global) |
| `jurnalBerulangList`, `anggaranList`, `notifAlerts`, `kursData` | ❌ Tidak | localStorage, global |
| `org_members`, `company_join_codes` | ✅ Ya | tabel sendiri |

**Implikasi nyata**: invoice, kontak, aset tetap, jurnal berulang, dan
anggaran **tidak berpindah antar perangkat** — jika user login dari
browser/device lain, data-data ini tidak akan muncul meskipun jurnal dan
akun (yang memang tersimpan di cloud) muncul normal. Beberapa key ini
juga **tidak di-scope per company** (`oas_invoices`, `oas_kontak`, dst
tidak punya suffix `_<companyId>`), jadi berpotensi bocor antar-bisnis
dalam satu browser yang sama jika user berpindah company tanpa reload
penuh. Ini adalah kandidat perbaikan prioritas tinggi jika multi-device
atau multi-company yang benar-benar terisolasi jadi kebutuhan serius.

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
