-- 002_jurnal_meta.sql
-- Kolom tambahan untuk jurnal_entries: menyimpan penanda sumber jurnal (mis. 'Orias AI'),
-- _ppnTarif (tarif PPN jurnal) dan _ksId (id kartu stock) supaya tidak hilang saat data dimuat ulang dari cloud.
-- Aman dijalankan berulang. Aplikasi tetap jalan tanpa kolom ini (penanda hanya tidak tersimpan di cloud).
ALTER TABLE jurnal_entries ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;
