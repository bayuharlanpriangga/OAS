import type {
  AlokasiPembayaranFormInput,
  AlokasiPerubahan,
  Invoice,
  Pembayaran,
  SusunAlokasiResult,
} from "@/types";
import { bayarBulat } from "./bayarBulat";
import { bayarTanggalValid } from "./bayarTanggalValid";
import { susunPembayaran } from "./susunPembayaran";

export function susunAlokasiPembayaran(
  f: AlokasiPembayaranFormInput,
  invoices: readonly Invoice[],
  daftar: readonly Pembayaran[]
): SusunAlokasiResult {
  const gagal = (pesan: string): SusunAlokasiResult => ({ ok: false, pesan });
  const input = f || {};
  const listInv = Array.isArray(invoices) ? invoices : [];
  const alokasi = Array.isArray(input.alokasi) ? input.alokasi : [];
  const grupId = typeof input.id === "string" ? input.id.trim() : "";
  if (!grupId) return gagal("ID penerimaan kosong.");
  if (!input.createdAt || typeof input.createdAt !== "string") {
    return gagal("Waktu pembuatan pembayaran kosong.");
  }
  if (
    !bayarTanggalValid(
      typeof input.tanggal === "string" ? input.tanggal.trim() : ""
    )
  ) {
    return gagal("Isi tanggal pembayaran yang valid.");
  }
  if (
    typeof input.jumlah !== "number" ||
    !isFinite(input.jumlah) ||
    bayarBulat(input.jumlah) <= 0
  ) {
    return gagal("Jumlah penerimaan harus lebih dari 0.");
  }
  if (typeof input.akunKas !== "string" || !input.akunKas.trim()) {
    return gagal("Pilih akun kas/bank.");
  }
  if (!alokasi.length) {
    return gagal("Tambahkan minimal satu invoice untuk dialokasikan.");
  }

  const idTerpakai = new Set(
    (Array.isArray(daftar) ? daftar : [])
      .filter((p) => p && p.id != null)
      .map((p) => String(p.id))
  );
  const dokTerpakai = new Set<string>();
  const pembayaran: Pembayaran[] = [];
  const perubahan: AlokasiPerubahan[] = [];
  let totalDialokasikan = 0;

  for (let i = 0; i < alokasi.length; i++) {
    const item = alokasi[i] || {};
    if (
      item.dokId === undefined ||
      item.dokId === null ||
      String(item.dokId).trim() === ""
    ) {
      return gagal(`Invoice pada alokasi ke-${i + 1} tidak valid.`);
    }
    const dokId = String(item.dokId);
    if (dokTerpakai.has(dokId)) {
      return gagal("Invoice yang sama tidak boleh dialokasikan lebih dari sekali.");
    }
    dokTerpakai.add(dokId);
    const inv = listInv.find((d) => d && String(d.id) === dokId);
    if (!inv) {
      return gagal(`Invoice pada alokasi ke-${i + 1} tidak ditemukan.`);
    }
    const jumlah =
      typeof item.jumlah === "number" && isFinite(item.jumlah)
        ? bayarBulat(item.jumlah)
        : NaN;
    if (!isFinite(jumlah) || jumlah <= 0) {
      return gagal("Jumlah alokasi setiap invoice harus lebih dari 0.");
    }

    const paymentId = `${grupId}_${i + 1}`;
    if (idTerpakai.has(paymentId)) {
      return gagal("ID pembayaran batch sudah dipakai.");
    }
    const hasil = susunPembayaran(
      {
        id: paymentId,
        createdAt: input.createdAt,
        tanggal: input.tanggal,
        jumlah,
        akunKas: input.akunKas,
        metode: input.metode,
        catatan: input.catatan,
      },
      inv,
      daftar,
      "invoice"
    );
    if (!hasil.ok) {
      return gagal(`Invoice ${String(inv.noInvoice || inv.id)}: ${hasil.pesan}`);
    }

    const record: Pembayaran = Object.assign({}, hasil.pembayaran, { grupId });
    pembayaran.push(record);
    perubahan.push({
      dokId: inv.id,
      dibayarLama: hasil.dibayarLama,
      sisaBaru: hasil.sisaBaru,
      lunas: hasil.lunas,
    });
    totalDialokasikan = bayarBulat(totalDialokasikan + jumlah);
  }

  const jumlahBatch = bayarBulat(input.jumlah);
  if (totalDialokasikan !== jumlahBatch) {
    return gagal(
      `Total alokasi (Rp ${totalDialokasikan.toLocaleString("id-ID")}) harus sama dengan jumlah penerimaan (Rp ${jumlahBatch.toLocaleString("id-ID")}).`
    );
  }
  return { ok: true, grupId, pembayaran, perubahan, totalDialokasikan };
}
