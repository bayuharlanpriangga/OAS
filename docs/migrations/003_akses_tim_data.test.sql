-- ============================================================
-- Tes penerimaan 003_akses_tim_data.sql (task 3.2b)
-- Jalankan di Supabase SQL Editor dengan dua akun uji:
--   owner_id  = UUID akun pemilik bisnis
--   member_id = UUID akun anggota (sudah join via gabung())
--   viewer_id = UUID akun viewer  (sudah join via gabung(), peran viewer)
--   anon_id   = UUID user asing (tidak ada di org_members bisnis ini)
--
-- Ganti placeholder di bawah sebelum dijalankan.
-- Setiap blok diberi label T1..T8 sesuai skenario.
-- ============================================================

-- ──────────────────────────────────────────────────────────
-- Setup: ambil company_id bisnis uji (jalankan manual dulu)
-- ──────────────────────────────────────────────────────────
-- SELECT id FROM companies WHERE user_id = '<owner_id>' LIMIT 1;
-- Simpan hasilnya sebagai :cid di bawah.

-- ──────────────────────────────────────────────────────────
-- T1: viewer dapat membaca company_records
-- Jalankan sebagai viewer_id (set role / gunakan RLS test helper)
-- ──────────────────────────────────────────────────────────
-- SET LOCAL role authenticated;
-- SET LOCAL "request.jwt.claims" TO '{"sub":"<viewer_id>","role":"authenticated"}';
-- SELECT count(*) FROM company_records WHERE company_id = '<cid>';
-- Ekspektasi: angka ≥ 0 (tidak error 401/0 row karena RLS block)

-- ──────────────────────────────────────────────────────────
-- T2: viewer GAGAL menulis ke company_records
-- ──────────────────────────────────────────────────────────
-- SET LOCAL "request.jwt.claims" TO '{"sub":"<viewer_id>","role":"authenticated"}';
-- INSERT INTO company_records (company_id, kind, rec_id, data)
--   VALUES ('<cid>', 'kontak', 'KTK_TEST', '{}');
-- Ekspektasi: ERROR (new row violates row-level security policy)

-- ──────────────────────────────────────────────────────────
-- T3: member dapat membaca jurnal_entries
-- ──────────────────────────────────────────────────────────
-- SET LOCAL "request.jwt.claims" TO '{"sub":"<member_id>","role":"authenticated"}';
-- SELECT count(*) FROM jurnal_entries WHERE company_id = '<cid>';
-- Ekspektasi: angka ≥ 0

-- ──────────────────────────────────────────────────────────
-- T4: member dapat menulis jurnal_entries
-- ──────────────────────────────────────────────────────────
BEGIN;
  SET LOCAL role TO authenticated;
  SET LOCAL "request.jwt.claims" TO
    '{"sub":"<member_user_id>","role":"authenticated"}';

  -- T4: member INSERT jurnal (harus berhasil)
  INSERT INTO jurnal_entries (company_id, no, tanggal, ket, jenis, lines)
    VALUES ('<cid>', 'JRN-TEST-001', current_date, 'Tes member insert', 'Manual', '[]');

  SELECT 'T4 INSERT berhasil' AS hasil;
ROLLBACK;
-- ROLLBACK agar data tes tidak tersimpan
-- ──────────────────────────────────────────────────────────
-- T5: member dapat UPDATE akuns tapi GAGAL DELETE akuns
-- ──────────────────────────────────────────────────────────
BEGIN;
  SET LOCAL role TO authenticated;
  SET LOCAL "request.jwt.claims" TO
    '{"sub":"<member_user_id>","role":"authenticated"}';

  -- T5a: member UPDATE akuns (harus berhasil)
  UPDATE akuns SET nama = nama
    WHERE company_id = '<cid>'
    LIMIT 1;

  SELECT 'T5a UPDATE berhasil' AS hasil;

  -- T5b: member DELETE akuns (harus gagal/RLS error)
  DELETE FROM akuns
    WHERE company_id = '<cid>'
    LIMIT 1;
ROLLBACK;

-- ──────────────────────────────────────────────────────────
-- T6: admin dapat DELETE akuns
-- ──────────────────────────────────────────────────────────
-- (naikkkan peran member_id ke admin terlebih dahulu via:
--   UPDATE org_members SET role='admin' WHERE user_id='<member_id>' AND company_id='<cid>';
-- )
-- SET LOCAL "request.jwt.claims" TO '{"sub":"<member_id>","role":"authenticated"}';
-- DELETE FROM akuns WHERE company_id = '<cid>' AND kode = '<kode>';
-- Ekspektasi: DELETE 1
-- Rollback / kembalikan akun yang dihapus setelah tes.

-- ──────────────────────────────────────────────────────────
-- T7: user asing (tidak ada di org_members) tidak bisa baca
-- ──────────────────────────────────────────────────────────
-- SET LOCAL "request.jwt.claims" TO '{"sub":"<anon_id>","role":"authenticated"}';
-- SELECT count(*) FROM company_records WHERE company_id = '<cid>';
-- Ekspektasi: 0 (diblokir RLS, tidak error tapi baris tidak terlihat)

-- ──────────────────────────────────────────────────────────
-- T8: owner tetap bisa semua operasi (tidak terpengaruh perubahan policy)
-- ──────────────────────────────────────────────────────────
-- SET LOCAL "request.jwt.claims" TO '{"sub":"<owner_id>","role":"authenticated"}';
-- SELECT count(*) FROM jurnal_entries WHERE company_id = '<cid>';
-- Ekspektasi: angka normal (sama seperti sebelum migrasi)
-- INSERT INTO akuns (company_id, kode, nama, tipe, normal)
--   VALUES ('<cid>', '9999', 'Akun Tes Owner', 'Beban', 'D');
-- Ekspektasi: INSERT 0 1
-- DELETE FROM akuns WHERE company_id = '<cid>' AND kode = '9999';
-- Ekspektasi: DELETE 1
