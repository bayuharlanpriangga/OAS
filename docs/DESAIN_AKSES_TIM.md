# Desain akses anggota tim (task 3.1)

Dibuat 12 Oktober 2026 · dasar untuk task 3.2-3.5 · tanpa kode. Sumber: `docs/SCHEMA.md` §2.2-2.3, `js/16-auth-company.js` (`afterLogin`, `getMyCompanies`, `selectCompany`, `loadDataFromSupabase`), `js/18-audit-permission.js` (`loadOrgMembers`, `hasPerm`, `_processJoinCode`), `js/22-cloud-records.js` (`_cloudSyncNow`). File `docs/migrations/001_company_records.sql` tidak ikut di zip, jadi policy `company_records` diambil dari SCHEMA.md (RLS pemilik).

## Temuan

1. **Anggota tidak bisa melihat bisnisnya.** RLS `companies` hanya mengizinkan pemilik, jadi query kedua di `getMyCompanies()` (ambil bisnis dari `org_members`) selalu kosong untuk anggota.
2. **Cakupan data lebih lebar dari roadmap.** `selectCompany` → `loadDataFromSupabase` memuat empat tabel: `jurnal_entries`, `akuns`, `company_profiles` (juga menyimpan kartu stok dan kunci periode), `company_records`. Kalau 3.2 hanya membuka `company_records`, anggota melihat jurnal kosong dan COA default (akun kosong memicu seed default).
3. **Dua lubang di policy sekarang yang menjadi pintu masuk begitu akses berbasis keanggotaan:**
   - `org_members` (FOR ALL, `user_id = auth.uid()`): siapa pun bisa menyisipkan baris dirinya sebagai admin ke bisnis mana pun (`company_id` tidak diperiksa), dan anggota bisa mengubah rolenya sendiri.
   - `company_join_codes` punya SELECT `USING (true)`: semua kode terbaca siapa pun, termasuk dengan anon key. Kode dibuat dengan `Math.random` (tidak kuat secara kriptografi).
4. `_processJoinCode` hanya validasi di client; `permissions` JSON hanya menyembunyikan tombol (UX), dan default-nya semua izin aktif kecuali reset.
5. Policy `companies` yang membaca `org_members` sambil `org_members` membaca `companies` akan memicu *infinite recursion* di Postgres.

## Keputusan

**D1. Peran:** `owner` (= `companies.user_id`), `admin`, `member`, `viewer` (baru). Server menegakkan per tingkat peran; `permissions` JSON per modul tetap UX gating (diterima, dicatat sebagai batasan). RLS per modul ditolak: kind data tidak 1:1 dengan modul dan biayanya besar.

**D2. Matriks akses server (hanya anggota berstatus `active`):**

| Tabel | viewer | member | admin | owner |
| --- | --- | --- | --- | --- |
| `companies` | baca | baca | baca | semua, hapus bisnis |
| `company_records`, `jurnal_entries` | baca | baca, tulis, hapus baris | semua | semua |
| `akuns`, `company_profiles` | baca | baca, tulis (tanpa hapus) | semua | semua |
| `org_members`, `company_join_codes` | baris sendiri | baris sendiri | kelola bisnis itu | kelola |

**D3. Fungsi bantu di database** (bypass RLS, `search_path` dikunci): `apakah pemilik(company)` dan `peran saya(company)`. Semua policy memakainya; ini sekaligus menghindari rekursi (temuan 5).

**D4. Cara masuk hanya lewat fungsi server, bukan insert dari client:**
- *Join code:* fungsi `gabung(kode)` memeriksa kode dan kedaluwarsa, lalu membuat baris dengan peran tetap dari server. Policy SELECT `USING (true)` dihapus.
- *Undangan email:* fungsi `klaim_undangan()` mengaitkan `user_id` ke baris `pending` yang emailnya sama dengan email terverifikasi di JWT, lalu `active`.
- Ubah peran, ubah izin, hapus anggota: hanya admin/owner; admin tidak bisa mengubah owner.

**D5. Peran awal lewat join code: `viewer`** (hak terkecil, karena kode itu bearer token); admin menaikkan ke member. Ini mengubah teks konfirmasi di `_processJoinCode` ("sebagai Member"). *Perlu konfirmasi kamu.*

**D6. Kode join** dibuat di sisi database (acak kuat), tetap berlaku 7 hari.

## Batasan yang diterima (dicatat di ARCHITECTURE.md saat 3.2 selesai)

- Server tidak bisa membedakan reset massal dari hapus satu baris; Reset Data tetap dijaga `isAdmin()` di client dan audit trail.
- `company_profiles.data` satu jsonb: member yang menyimpan stok ikut bisa menimpa `_periode_kunci` dan profil (read-modify-write). Dipisah pada fase lain.
- Cache lokal `oas_rec_*` tetap ada di perangkat anggota yang aksesnya dicabut.

## Dampak ke task berikutnya

- **3.2** terlalu besar untuk satu task S. Usul dipecah: **3.2a** fungsi bantu + `companies` + `org_members` + `company_join_codes` + `gabung`/`klaim_undangan` (menutup lubang lebih dulu); **3.2b** policy empat tabel data. ⚠ Jalankan di proyek Supabase uji dulu, owner harus tetap lolos (policy `OR`).
- **3.3** sebagian besar sudah berjalan setelah policy `companies` ada; sisanya label peran/pemilik di daftar bisnis dan hanya baris `active`. Lampirkan juga `afterLogin`/`renderCompanyList`.
- **3.4** `loadDataFromSupabase` tidak boleh seed COA default bila bukan owner/admin.
- **3.5** tambahkan `viewer` ke `isAdmin`/`hasPerm`, `AUDIT_ROLE_BADGE`, dan dua pemilih role di `index.html`.

## Tes penerimaan untuk 3.2 (dua akun)

Anon tidak bisa membaca `company_join_codes`; user asing tidak bisa menyisipkan diri ke `org_members` bisnis lain; member tidak bisa mengubah rolenya sendiri; viewer gagal menulis; member membaca jurnal dan COA asli bisnis; baris anggota dihapus → akses hilang seketika; owner tidak terpengaruh.
