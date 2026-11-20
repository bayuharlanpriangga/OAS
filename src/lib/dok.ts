import type {
  CounterRecord,
  DokFormInput,
  DokItem,
  DokJenis,
  DokRecord,
  DokTotalResult,
  SusunDokResult,
  TransisiDokResult,
} from "@/types";
import { nomorBerikut } from "./penomoran";

export const DOK_JENIS: Record<
  DokJenis,
  { awalan: string; label: string; transisi: Record<string, string[]> }
> = {
  penawaran: {
    awalan: "QUO",
    label: "Penawaran",
    transisi: {
      draft: ["terkirim", "batal"],
      terkirim: ["disetujui", "ditolak", "batal"],
      disetujui: ["selesai", "batal"],
      ditolak: [],
      selesai: [],
      batal: [],
    },
  },
  pesanan_jual: {
    awalan: "SO",
    label: "Pesanan Penjualan",
    transisi: {
      draft: ["dikonfirmasi", "batal"],
      dikonfirmasi: ["sebagian", "selesai", "batal"],
      sebagian: ["selesai", "batal"],
      selesai: [],
      batal: [],
    },
  },
  surat_jalan: {
    awalan: "SJ",
    label: "Surat Jalan",
    transisi: {
      draft: ["dikirim", "batal"],
      dikirim: ["selesai"],
      selesai: [],
      batal: [],
    },
  },
  pesanan_beli: {
    awalan: "PO",
    label: "Pesanan Pembelian",
    transisi: {
      draft: ["dipesan", "batal"],
      dipesan: ["sebagian", "selesai", "batal"],
      sebagian: ["selesai", "batal"],
      selesai: [],
      batal: [],
    },
  },
  penerimaan: {
    awalan: "GRN",
    label: "Penerimaan Barang",
    transisi: {
      draft: ["diterima", "batal"],
      diterima: [],
      batal: [],
    },
  },
  retur_jual: {
    awalan: "RJ",
    label: "Retur Penjualan",
    transisi: {
      draft: ["diproses", "batal"],
      diproses: ["selesai"],
      selesai: [],
      batal: [],
    },
  },
  retur_beli: {
    awalan: "RB",
    label: "Retur Pembelian",
    transisi: {
      draft: ["diproses", "batal"],
      diproses: ["selesai"],
      selesai: [],
      batal: [],
    },
  },
};

export const DOK_REF_LAIN = ["invoice", "bill"] as const;

function dokBulat(n: number): number {
  return Math.round(n * 100) / 100;
}

export function dokStatusBerikut(jenis: DokJenis, status: string): string[] {
  const J = DOK_JENIS[jenis];
  return J && Array.isArray(J.transisi[status])
    ? J.transisi[status].slice()
    : [];
}

export function transisiDok(
  dok: DokRecord | null | undefined,
  statusBaru: string,
  opsi?: { waktu?: string }
): TransisiDokResult {
  const gagal = (pesan: string): TransisiDokResult => ({ ok: false, pesan });
  if (!dok || typeof dok !== "object") return gagal("Dokumen tidak ditemukan.");
  const J = DOK_JENIS[dok.jenis];
  if (!J) return gagal("Jenis dokumen tidak dikenal.");
  if (!Array.isArray(J.transisi[dok.status])) {
    return gagal("Status dokumen tidak dikenal: " + dok.status + ".");
  }
  const boleh = J.transisi[dok.status];
  if (!boleh.includes(statusBaru)) {
    return gagal(
      boleh.length
        ? `${J.label} berstatus ${dok.status} hanya bisa menjadi: ${boleh.join(", ")}.`
        : `${J.label} berstatus ${dok.status} sudah final dan tidak bisa diubah lagi.`
    );
  }
  const waktu = opsi && typeof opsi.waktu === "string" ? opsi.waktu.trim() : "";
  const entri: { dari: string; ke: string; waktu?: string } = {
    dari: dok.status,
    ke: statusBaru,
  };
  if (waktu) entri.waktu = waktu;
  return {
    ok: true,
    dok: Object.assign({}, dok, {
      status: statusBaru,
      riwayat: (Array.isArray(dok.riwayat) ? dok.riwayat : []).concat([entri]),
    }),
  };
}

export function nomorDokBerikut(
  jenis: DokJenis,
  tahun: number,
  daftar?: readonly DokRecord[],
  counterList?: readonly CounterRecord[]
): string {
  const J = DOK_JENIS[jenis];
  if (!J) throw new TypeError("nomorDokBerikut: jenis dokumen tidak dikenal");
  return nomorBerikut(
    J.awalan,
    tahun,
    (Array.isArray(daftar) ? daftar : []).map((d) => d && d.no),
    counterList
  );
}

export function totalDok(dok: Pick<DokRecord, "items"> | null | undefined): number {
  const items = dok && Array.isArray(dok.items) ? dok.items : [];
  return dokBulat(
    items.reduce((s, it) => {
      const q =
        it && typeof it.qty === "number" && isFinite(it.qty) && it.qty > 0
          ? it.qty
          : 0;
      const h =
        it && typeof it.harga === "number" && isFinite(it.harga) && it.harga > 0
          ? it.harga
          : 0;
      return s + q * h;
    }, 0)
  );
}

export function hitungTotalDok(
  dok: Pick<DokRecord, "items" | "ppnTarif"> | null | undefined
): DokTotalResult {
  const subtotal = totalDok(dok);
  const t =
    dok &&
    typeof dok.ppnTarif === "number" &&
    isFinite(dok.ppnTarif) &&
    dok.ppnTarif > 0
      ? dok.ppnTarif
      : 0;
  const ppn = t ? Math.round((subtotal * t) / 100) : 0;
  return { subtotal, ppn, total: subtotal + ppn };
}

export function susunDok(
  f: DokFormInput,
  daftar?: readonly DokRecord[]
): SusunDokResult {
  const gagal = (pesan: string): SusunDokResult => ({ ok: false, pesan });
  const input = f || {};
  const teks = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const jenis = input.jenis as DokJenis;
  const J = DOK_JENIS[jenis];
  if (!J) return gagal("Jenis dokumen tidak dikenal.");
  const ada = Array.isArray(daftar)
    ? daftar.filter((d) => d && typeof d === "object")
    : [];

  const id = teks(input.id);
  if (!id) return gagal("ID dokumen kosong.");
  if (ada.some((d) => d.id === id)) return gagal("ID dokumen sudah dipakai.");
  const no = teks(input.no).toUpperCase();
  if (!no) return gagal(`Isi nomor ${J.label.toLowerCase()}.`);
  if (
    ada.some(
      (d) =>
        d.jenis === jenis &&
        String(d.no || "").trim().toUpperCase() === no
    )
  ) {
    return gagal(`Nomor ${no} sudah dipakai. Ganti nomornya.`);
  }
  const tanggal = teks(input.tanggal);
  const d0 = /^\d{4}-\d{2}-\d{2}$/.test(tanggal)
    ? new Date(tanggal + "T00:00:00Z")
    : null;
  if (
    !d0 ||
    isNaN(d0.getTime()) ||
    d0.toISOString().slice(0, 10) !== tanggal
  ) {
    return gagal(`Isi tanggal ${J.label.toLowerCase()} yang valid.`);
  }
  const kontak = teks(input.kontak);
  if (!kontak) return gagal("Isi nama kontak.");
  const createdAt = teks(input.createdAt);
  if (!createdAt) return gagal("Waktu pembuatan dokumen kosong.");

  const items: DokItem[] = [];
  for (const it of Array.isArray(input.items) ? input.items : []) {
    if (!it || typeof it !== "object") continue;
    const nama = teks(it.nama);
    const qty = typeof it.qty === "number" && isFinite(it.qty) ? it.qty : 0;
    if (!nama && qty <= 0) continue;
    if (!nama) return gagal("Isi nama item.");
    if (qty <= 0) return gagal(`Jumlah item "${nama}" harus lebih dari 0.`);
    const harga =
      it.harga === undefined || it.harga === null || it.harga === ""
        ? 0
        : Number(it.harga);
    if (typeof harga !== "number" || !isFinite(harga) || harga < 0) {
      return gagal(`Harga item "${nama}" tidak valid.`);
    }
    const baris: DokItem = { nama, qty, harga };
    const satuan = teks(it.satuan);
    if (satuan) baris.satuan = satuan;
    items.push(baris);
  }
  if (!items.length) {
    return gagal("Isi minimal 1 item dengan jumlah lebih dari 0.");
  }

  let ppnTarif = 0;
  if (
    input.ppnTarif !== undefined &&
    input.ppnTarif !== null &&
    input.ppnTarif !== "" &&
    input.ppnTarif !== 0
  ) {
    if (
      typeof input.ppnTarif !== "number" ||
      !isFinite(input.ppnTarif) ||
      input.ppnTarif < 0 ||
      input.ppnTarif > 100
    ) {
      return gagal("Tarif PPN tidak valid.");
    }
    ppnTarif = input.ppnTarif;
  }

  const berlakuSampai = teks(input.berlakuSampai);
  if (berlakuSampai) {
    const b0 = /^\d{4}-\d{2}-\d{2}$/.test(berlakuSampai)
      ? new Date(berlakuSampai + "T00:00:00Z")
      : null;
    if (
      !b0 ||
      isNaN(b0.getTime()) ||
      b0.toISOString().slice(0, 10) !== berlakuSampai
    ) {
      return gagal("Isi tanggal berlaku sampai yang valid.");
    }
    if (berlakuSampai < tanggal) {
      return gagal(
        `Tanggal berlaku sampai tidak boleh sebelum tanggal ${J.label.toLowerCase()}.`
      );
    }
  }

  const refJenis = teks(input.refJenis);
  const refId = teks(input.refId);
  const refNo = teks(input.refNo);
  if (refJenis || refId) {
    if (!refJenis || !refId) return gagal("Ref asal harus berisi jenis dan id.");
    if (
      !DOK_JENIS[refJenis as DokJenis] &&
      !DOK_REF_LAIN.includes(refJenis as (typeof DOK_REF_LAIN)[number])
    ) {
      return gagal("Jenis ref asal tidak dikenal.");
    }
    if (refJenis === jenis && refId === id) {
      return gagal("Dokumen tidak boleh menunjuk dirinya sendiri.");
    }
    if (
      DOK_JENIS[refJenis as DokJenis] &&
      !ada.some((d) => d.jenis === refJenis && d.id === refId)
    ) {
      return gagal("Dokumen asal tidak ditemukan.");
    }
  }

  const dok: DokRecord = {
    id,
    jenis,
    no,
    tanggal,
    kontak,
    status: "draft",
    items,
    createdAt,
  };
  const catatan = teks(input.catatan);
  if (catatan) dok.catatan = catatan;
  if (ppnTarif) dok.ppnTarif = ppnTarif;
  if (berlakuSampai) dok.berlakuSampai = berlakuSampai;
  if (refJenis && refId) {
    dok.refJenis = refJenis;
    dok.refId = refId;
    if (refNo) dok.refNo = refNo;
  }
  return { ok: true, dok };
}

export function idDokBaru(
  daftar?: readonly DokRecord[],
  waktuMs: number = Date.now()
): string {
  const ada = new Set(
    (Array.isArray(daftar) ? daftar : []).map((d) => d && d.id)
  );
  const dasar =
    "DOK_" + (Number.isFinite(waktuMs) ? Math.floor(waktuMs) : Date.now());
  let id = dasar;
  let n = 1;
  while (ada.has(id)) {
    n++;
    id = dasar + "_" + n;
  }
  return id;
}
