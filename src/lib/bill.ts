import type {
  Akun,
  Bill,
  BillFormInput,
  BillItem,
  BillJurnalStatusResult,
  BuatJurnalBillResult,
  JurnalEntry,
  SusunBillResult,
} from "@/types";
import { JENIS_JURNAL, PPN_TARIF_STANDAR, hitungPpn } from "./accounting";

export const BILL_STATUS_SIMPAN = ["draft", "diterima"] as const;

export function hitungTotalBill(
  items: readonly { qty?: number; harga?: number }[],
  ppnAktif?: boolean,
  tarifPct?: number
): { subtotal: number; ppn: number; total: number } {
  const angka = (v: unknown) =>
    typeof v === "number" && isFinite(v) && v > 0 ? v : 0;
  const subtotal = (Array.isArray(items) ? items : []).reduce(
    (s, it) => s + angka(it && it.qty) * angka(it && it.harga),
    0
  );
  const ppn = ppnAktif ? hitungPpn(subtotal, tarifPct) : 0;
  return { subtotal, ppn, total: subtotal + ppn };
}

export function susunBill(
  f: BillFormInput,
  daftarNomor?: readonly (string | null | undefined)[]
): SusunBillResult {
  const gagal = (pesan: string): SusunBillResult => ({ ok: false, pesan });
  const input = f || {};
  const teks = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const angka = (v: unknown) =>
    typeof v === "number" && isFinite(v) && v > 0 ? v : 0;

  const status = input.status;
  if (status !== "draft" && status !== "diterima") {
    return gagal("Status tagihan tidak valid.");
  }

  const noBill = teks(input.noBill).toUpperCase();
  const supplier = teks(input.supplier);
  if (!supplier) return gagal("Isi nama supplier.");
  if (!noBill) return gagal("Isi nomor tagihan.");
  if (
    (Array.isArray(daftarNomor) ? daftarNomor : []).some(
      (n) => String(n || "").trim().toUpperCase() === noBill
    )
  ) {
    return gagal(
      "Nomor tagihan " +
        noBill +
        " sudah dipakai. Ganti nomornya, atau tutup lalu buka form baru untuk nomor otomatis."
    );
  }

  const tanggal = teks(input.tanggal);
  const jatuhTempo = teks(input.jatuhTempo);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return gagal("Isi tanggal tagihan.");
  if (
    jatuhTempo &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(jatuhTempo) || jatuhTempo < tanggal)
  ) {
    return gagal("Jatuh tempo tidak boleh sebelum tanggal tagihan.");
  }

  const items: BillItem[] = (Array.isArray(input.items) ? input.items : [])
    .filter((it) => it && angka(it.qty) > 0 && angka(it.harga) > 0)
    .map((it) => ({
      nama: teks(it.nama),
      qty: it.qty as number,
      harga: it.harga as number,
      akun: teks(it.akun),
    }));
  if (!items.length) {
    return gagal("Isi minimal 1 item dengan jumlah dan harga lebih dari 0.");
  }

  const akunUtang = teks(input.akunUtang);
  if (status === "diterima") {
    if (!akunUtang) {
      return gagal("Pilih akun Utang Usaha sebelum menyimpan sebagai Diterima.");
    }
    if (items.some((it) => !it.akun)) {
      return gagal(
        "Pilih akun untuk setiap item sebelum menyimpan sebagai Diterima."
      );
    }
  }

  const tarif =
    typeof input.ppnTarif === "number" &&
    isFinite(input.ppnTarif) &&
    input.ppnTarif > 0
      ? input.ppnTarif
      : undefined;
  const h = hitungTotalBill(items, !!input.ppnAktif, tarif);

  return {
    ok: true,
    bill: {
      id: teks(input.id) || "BILL_" + Date.now(),
      noBill,
      supplier,
      tanggal,
      jatuhTempo,
      deskripsi: teks(input.deskripsi),
      items,
      subtotal: h.subtotal,
      ppn: h.ppn,
      ppnTarif: input.ppnAktif
        ? tarif !== undefined
          ? tarif
          : PPN_TARIF_STANDAR
        : 0,
      total: h.total,
      sisaTagihan: h.total,
      status,
      akunUtang,
      createdAt: teks(input.createdAt) || new Date().toISOString(),
    },
  };
}

export function bisaEditBill(bill: Bill | null | undefined): boolean {
  return !!bill && typeof bill === "object" && bill.status === "draft";
}

export function formDariBill(
  bill: Bill | null | undefined
): BillFormInput & { ppnAktif: boolean; ppnTarif: number } {
  const b = bill && typeof bill === "object" ? bill : ({} as Partial<Bill>);
  const aktif =
    typeof b.ppnTarif === "number" && isFinite(b.ppnTarif) && b.ppnTarif > 0;
  return {
    id: b.id || "",
    noBill: b.noBill || "",
    supplier: b.supplier || "",
    tanggal: b.tanggal || "",
    jatuhTempo: b.jatuhTempo || "",
    deskripsi: b.deskripsi || "",
    items: (Array.isArray(b.items) ? b.items : [])
      .filter((it) => it && typeof it === "object")
      .map((it) => ({
        nama: it.nama || "",
        qty: it.qty,
        harga: it.harga,
        akun: it.akun || "",
      })),
    ppnAktif: aktif,
    ppnTarif: aktif ? (b.ppnTarif as number) : PPN_TARIF_STANDAR,
    akunUtang: b.akunUtang || "",
    createdAt: b.createdAt || "",
  };
}

export function cariAkunPpnMasukan(daftarAkun: readonly Akun[]): string {
  const a = (Array.isArray(daftarAkun) ? daftarAkun : []).filter(
    (x) => x && x.kode
  );
  if (a.some((x) => x.kode === "1502")) return "1502";
  const f = a.find((x) => /ppn masukan/i.test(x.nama || ""));
  return f ? f.kode : "1502";
}

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

export function jurnalBillStatus(
  bill: Bill | null | undefined,
  daftarJurnal: readonly JurnalEntry[],
  daftarBill?: readonly Bill[]
): BillJurnalStatusResult {
  if (!bill || typeof bill !== "object" || bill.status === "draft") {
    return { status: "tanpa", jurnal: null };
  }
  const js = (Array.isArray(daftarJurnal) ? daftarJurnal : []).filter(
    (j) => j && typeof j === "object"
  );
  const ketJ = (j: JurnalEntry) => String(j.ket || j.keterangan || "");
  const pembalikDari = (j: JurnalEntry) => {
    if (j.reversalOf) return String(j.reversalOf);
    const m = /^\[Pembalik ([^\]]+)\]/.exec(ketJ(j));
    return m ? m[1].trim() : "";
  };
  const asal = js.filter(
    (j) => j.jenis === JENIS_JURNAL.BILL && !pembalikDari(j)
  );
  const awal =
    "Tagihan " +
    String(bill.noBill || "").trim() +
    " — " +
    String(bill.supplier || "").trim();
  const dibalik = (j: JurnalEntry) => js.some((x) => pembalikDari(x) === j.no);

  let jurnal: JurnalEntry | null = null;
  if (bill.jurnalNo) {
    jurnal =
      asal.find((j) => j.no === bill.jurnalNo && ketJ(j).startsWith(awal)) ||
      null;
  }
  if (!jurnal) {
    const dipakaiLain = new Set(
      (Array.isArray(daftarBill) ? daftarBill : [])
        .filter((b) => b && b !== bill && b.id !== bill.id && b.jurnalNo)
        .map((b) => b.jurnalNo as string)
    );
    const cocok = asal.filter(
      (j) => ketJ(j).startsWith(awal) && !(j.no && dipakaiLain.has(j.no))
    );
    jurnal = cocok.find((j) => !dibalik(j)) || cocok[0] || null;
  }
  if (!jurnal) return { status: "belum", jurnal: null };
  return { status: dibalik(jurnal) ? "dibalik" : "aktif", jurnal };
}

export function tanggalPembalikBill(
  tanggalJurnal: string,
  hariIni: string
): string {
  const t = typeof tanggalJurnal === "string" ? tanggalJurnal.slice(0, 10) : "";
  return t && t > hariIni ? t : hariIni;
}
