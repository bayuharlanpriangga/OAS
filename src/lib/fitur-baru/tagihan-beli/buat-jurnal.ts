import type { Bill, BuatJurnalBillResult } from "@/types";
import { JENIS_JURNAL } from "../../shared/accounting/constants";

export function buatJurnalBill(
  bill: Bill | null | undefined,
  opsi?: { akunPpnMasukan?: string }
): BuatJurnalBillResult {
  const gagal = (pesan: string): BuatJurnalBillResult => ({ ok: false, pesan });
  const teks = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const angka = (v: unknown) =>
    typeof v === "number" && isFinite(v) && v > 0 ? v : 0;

  if (!bill || typeof bill !== "object") return gagal("Data tagihan tidak valid.");
  if (bill.status !== "diterima") {
    return gagal("Hanya tagihan berstatus Diterima yang dijurnal.");
  }
  const akunUtang = teks(bill.akunUtang);
  if (!akunUtang) return gagal("Akun Utang Usaha belum dipilih.");
  const tanggal = teks(bill.tanggal);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    return gagal("Tanggal tagihan tidak valid.");
  }
  const items = (Array.isArray(bill.items) ? bill.items : []).filter(
    (it) => it && angka(it.qty) * angka(it.harga) > 0
  );
  if (!items.length) return gagal("Tagihan tidak punya item bernilai.");
  if (items.some((it) => !teks(it.akun))) {
    return gagal("Ada item tanpa akun. Pilih akun untuk setiap item.");
  }

  const grup: Array<{
    akun: string;
    nilai: number;
    nama: string[];
    debit?: number;
  }> = [];
  items.forEach((it) => {
    const kode = teks(it.akun);
    const nilai = angka(it.qty) * angka(it.harga);
    let g = grup.find((x) => x.akun === kode);
    if (!g) {
      g = { akun: kode, nilai: 0, nama: [] };
      grup.push(g);
    }
    g.nilai += nilai;
    const n = teks(it.nama);
    if (n && !g.nama.includes(n)) g.nama.push(n);
  });

  const target = Math.round(grup.reduce((s, g) => s + g.nilai, 0));
  grup.forEach((g) => {
    g.debit = Math.round(g.nilai);
  });
  const selisih = target - grup.reduce((s, g) => s + (g.debit || 0), 0);
  if (selisih && grup.length) {
    const terbesar = grup.reduce((a, b) =>
      (b.debit || 0) > (a.debit || 0) ? b : a
    );
    terbesar.debit = (terbesar.debit || 0) + selisih;
  }

  const barisItem = grup
    .filter((g) => (g.debit || 0) > 0)
    .map((g) => ({
      akun: g.akun,
      ket: g.nama.join(", ").slice(0, 80) || "Pembelian",
      debit: g.debit || 0,
      kredit: 0,
    }));
  if (!barisItem.length) return gagal("Total tagihan 0, tidak ada yang dijurnal.");

  const ppn = angka(bill.ppn) ? Math.round(bill.ppn) : 0;
  const tarif = angka(bill.ppnTarif);
  if (ppn > 0 && !tarif) {
    return gagal(
      "Tarif PPN tagihan tidak ada, PPN Masukan tidak bisa dijurnal."
    );
  }
  const akunPpn = teks(opsi && opsi.akunPpnMasukan) || "1502";
  const lines = barisItem.slice();
  if (ppn > 0) {
    lines.push({
      akun: akunPpn,
      ket: "PPN Masukan " + tarif + "%",
      debit: ppn,
      kredit: 0,
    });
  }
  const total = lines.reduce((s, l) => s + l.debit, 0);
  lines.push({
    akun: akunUtang,
    ket: "Utang Usaha — " + teks(bill.supplier),
    debit: 0,
    kredit: total,
  });

  const jurnal: {
    tanggal: string;
    jenis: string;
    keterangan: string;
    ref: string;
    lines: typeof lines;
    _ppnTarif?: number;
  } = {
    tanggal,
    jenis: JENIS_JURNAL.BILL,
    keterangan: "Tagihan " + teks(bill.noBill) + " — " + teks(bill.supplier),
    ref: teks(bill.noBill),
    lines,
  };
  if (ppn > 0) jurnal._ppnTarif = tarif;
  return { ok: true, jurnal };
}
