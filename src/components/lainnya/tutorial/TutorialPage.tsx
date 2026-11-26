"use client";

import { useState } from "react";
import { BookOpen, Search } from "lucide-react";

const GUIDES = [
  {
    title: "1. Setup Awal & Chart of Accounts (COA)",
    tags: "coa akun saldo awal setup",
    steps: [
      "Buka menu Chart of Accounts untuk meninjau 103 akun standar PSAK (Aset, Liabilitas, Ekuitas, Pendapatan, HPP, Beban).",
      "Klik 'Saldo Awal' di Dashboard untuk mencatat modal awal, kas awal, dan saldo pembuka lainnya.",
      "Tambahkan atau sesuaikan kode akun sesuai kebutuhan operasional usaha.",
    ],
  },
  {
    title: "2. Mencatat Transaksi Harian",
    tags: "transaksi kas penjualan pembelian jurnal manual mode cepat",
    steps: [
      "Gunakan tab 'Mode Cepat' untuk input kilat transaksi rutin (penjualan tunai, bayar gaji, bayar listrik, dll).",
      "Gunakan tab 'Penjualan' atau 'Pembelian' untuk transaksi barang yang terhubung otomatis dengan Kartu Stock FIFO dan HPP.",
      "Gunakan 'Jurnal Manual' untuk entri multi-baris dengan validasi Debit = Kredit otomatis.",
    ],
  },
  {
    title: "3. Kartu Stock FIFO & Master Produk",
    tags: "kartu stock fifo wa mwa hpp persediaan produk",
    steps: [
      "Buat Kartu Stock dan Kategori di halaman Kalkulator & Kartu Persediaan.",
      "Setiap transaksi Pembelian/Penjualan produk akan menambah layer stok atau menghitung HPP FIFO/Rata-rata secara otomatis.",
      "Gunakan fitur Konversi Metode jika ingin memindahkan data dari metode lama ke FIFO/Weighted Average.",
    ],
  },
  {
    title: "4. Invoice, Tagihan Pembelian (Bill), & Pembayaran",
    tags: "invoice piutang bill hutang pembayaran alokasi aging",
    steps: [
      "Buat Penawaran → konversi ke Pesanan Penjualan → buat Invoice, atau langsung buat Invoice di menu Invoice & Piutang.",
      "Simpan sebagai Terkirim untuk memposting jurnal piutang otomatis, lalu catat pembayaran sebagian atau penuh (termasuk alokasi ke beberapa invoice sekaligus).",
      "Pantau jatuh tempo melalui Umur Piutang, Umur Hutang, Kartu Piutang, dan Kartu Hutang.",
    ],
  },
  {
    title: "5. Laporan Keuangan & Export Excel/PDF",
    tags: "laporan neraca laba rugi arus kas export excel pdf",
    steps: [
      "Semua laporan (Neraca Saldo, Laba Rugi, Neraca, Arus Kas PSAK 2, Perubahan Ekuitas) diperbarui real-time dari jurnal.",
      "Klik 'Export Laporan' untuk mengunduh workbook Excel (.xlsx, termasuk template formula SUM/SUMIF) atau laporan PDF multi-halaman dengan tema kustom.",
    ],
  },
  {
    title: "6. Kunci Periode, Tim & Audit Trail",
    tags: "kunci periode tim audit trail settings backup",
    steps: [
      "Aktifkan Kunci Periode di Settings > Transaksi agar jurnal pada periode tutup buku tidak berubah secara tidak sengaja.",
      "Undang anggota tim via Join Code dan atur peran (Owner, Admin, Member, Viewer) serta izin modul.",
      "Pantau seluruh riwayat perubahan data di halaman Audit Trail.",
    ],
  },
];

export default function TutorialPage() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const visible = GUIDES.filter(
    (g) =>
      !q ||
      g.title.toLowerCase().includes(q) ||
      g.tags.includes(q) ||
      g.steps.some((s) => s.toLowerCase().includes(q))
  );

  return (
    <div className="page" id="page-tutorial" data-react-managed="1">
      <div className="section-header page-actions-only" style={{ flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-control)", padding: "0 10px" }}>
          <Search size={14} style={{ color: "var(--muted)" }} />
          <input
            type="text"
            placeholder="Cari topik panduan..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ background: "transparent", border: "none", padding: "7px 4px", color: "var(--text)", fontSize: "13px", outline: "none" }}
          />
        </div>
      </div>

      <div style={{ display: "grid", gap: "12px" }}>
        {visible.map((g) => (
          <div key={g.title} className="table-card" style={{ padding: "16px 18px" }}>
            <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "8px", color: "var(--accent2)" }}>
              {g.title}
            </div>
            <ol style={{ margin: 0, paddingLeft: "18px", display: "grid", gap: "6px", fontSize: "13px", lineHeight: 1.6, color: "var(--text)" }}>
              {g.steps.map((st, idx) => (
                <li key={idx}>{st}</li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </div>
  );
}
