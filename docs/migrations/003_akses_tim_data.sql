-- ============================================================
-- Migrasi 003: RLS policy tabel data sesuai matriks D2 (task 3.2b)
-- Tanggal : 13 Oktober 2026
-- Prasyarat: migrasi 002_akses_tim_inti.sql sudah dijalankan
--            (fungsi peran_saya() dan pemilik_bisnis() sudah ada)
-- Cara jalankan: salin ke Supabase SQL Editor, jalankan sekali.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- BAGIAN A: company_records
-- Matriks D2:
--   viewer  → SELECT saja
--   member  → SELECT, INSERT, UPDATE, DELETE
--   admin   → semua  (sama dengan member, tapi eksplisit)
--   owner   → semua  (sudah via pemilik_bisnis)
-- ──────────────────────────────────────────────────────────

-- Hapus policy lama (hanya pemilik)
DROP POLICY IF EXISTS "Users can manage own records" ON company_records;
-- Nama alternatif yang mungkin ada:
DROP POLICY IF EXISTS "Owner can manage company_records" ON company_records;

-- SELECT: owner ATAU anggota active
CREATE POLICY "cr_select"
  ON company_records FOR SELECT
  USING (
    pemilik_bisnis(company_id) = auth.uid()
    OR peran_saya(company_id) IN ('admin', 'member', 'viewer')
  );

-- INSERT: owner ATAU admin/member active
CREATE POLICY "cr_insert"
  ON company_records FOR INSERT
  WITH CHECK (
    pemilik_bisnis(company_id) = auth.uid()
    OR peran_saya(company_id) IN ('admin', 'member')
  );

-- UPDATE: owner ATAU admin/member active
CREATE POLICY "cr_update"
  ON company_records FOR UPDATE
  USING (
    pemilik_bisnis(company_id) = auth.uid()
    OR peran_saya(company_id) IN ('admin', 'member')
  )
  WITH CHECK (
    pemilik_bisnis(company_id) = auth.uid()
    OR peran_saya(company_id) IN ('admin', 'member')
  );

-- DELETE: owner ATAU admin/member active
CREATE POLICY "cr_delete"
  ON company_records FOR DELETE
  USING (
    pemilik_bisnis(company_id) = auth.uid()
    OR peran_saya(company_id) IN ('admin', 'member')
  );


-- ──────────────────────────────────────────────────────────
-- BAGIAN B: jurnal_entries
-- Matriks D2 sama dengan company_records:
--   viewer  → SELECT saja
--   member  → SELECT, INSERT, UPDATE, DELETE
--   admin   → semua
--   owner   → semua
-- ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can manage own jurnal" ON jurnal_entries;

CREATE POLICY "je_select"
  ON jurnal_entries FOR SELECT
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member', 'viewer')
  );

CREATE POLICY "je_insert"
  ON jurnal_entries FOR INSERT
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member')
  );

CREATE POLICY "je_update"
  ON jurnal_entries FOR UPDATE
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member')
  )
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member')
  );

CREATE POLICY "je_delete"
  ON jurnal_entries FOR DELETE
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member')
  );


-- ──────────────────────────────────────────────────────────
-- BAGIAN C: akuns
-- Matriks D2:
--   viewer  → SELECT saja
--   member  → SELECT, INSERT, UPDATE  (tanpa DELETE)
--   admin   → semua (termasuk DELETE)
--   owner   → semua
-- ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can manage own akuns" ON akuns;

CREATE POLICY "akuns_select"
  ON akuns FOR SELECT
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member', 'viewer')
  );

CREATE POLICY "akuns_insert"
  ON akuns FOR INSERT
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member')
  );

CREATE POLICY "akuns_update"
  ON akuns FOR UPDATE
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member')
  )
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member')
  );

-- DELETE: hanya owner dan admin; member tidak boleh
CREATE POLICY "akuns_delete"
  ON akuns FOR DELETE
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) = 'admin'
  );


-- ──────────────────────────────────────────────────────────
-- BAGIAN D: company_profiles
-- Matriks D2 sama dengan akuns:
--   viewer  → SELECT saja
--   member  → SELECT, INSERT, UPDATE  (tanpa DELETE)
--   admin   → semua (termasuk DELETE)
--   owner   → semua
-- ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can manage own profiles" ON company_profiles;

CREATE POLICY "cp_select"
  ON company_profiles FOR SELECT
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member', 'viewer')
  );

CREATE POLICY "cp_insert"
  ON company_profiles FOR INSERT
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member')
  );

CREATE POLICY "cp_update"
  ON company_profiles FOR UPDATE
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member')
  )
  WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) IN ('admin', 'member')
  );

-- DELETE: hanya owner dan admin; member tidak boleh
CREATE POLICY "cp_delete"
  ON company_profiles FOR DELETE
  USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    OR peran_saya(company_id) = 'admin'
  );
