import { escapeHtml } from "../../shared/format";
import type { CompanyLike } from "../../shared/legacy-store/types";

export type { CompanyLike };
export type PeranBisnis = "owner" | "admin" | "member" | "viewer";

export const PERAN_BISNIS_LABEL: Record<PeranBisnis, string> = {
  owner: "Pemilik",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export const MODUL_HALAMAN: Record<string, string> = {
  dashboard: "dashboard",
  transaksi: "transaksi",
  kurs: "transaksi",
  "jurnal-umum": "jurnal",
  "jurnal-kas": "jurnal",
  "jurnal-penjualan": "jurnal",
  "jurnal-pembelian": "jurnal",
  "jurnal-berulang": "jurnal",
  "buku-besar": "jurnal",
  "neraca-saldo": "jurnal",
  "laba-rugi": "laba-rugi",
  neraca: "neraca",
  "perubahan-ekuitas": "neraca",
  "arus-kas": "arus-kas",
  akun: "akun",
  "aset-tetap": "akun",
  kontak: "kontak",
  invoice: "invoice",
  bill: "invoice",
  "umur-piutang": "invoice",
  "umur-hutang": "invoice",
  "kartu-piutang": "invoice",
  "kartu-hutang": "invoice",
  penawaran: "invoice",
  "pesanan-jual": "invoice",
  produk: "invoice",
  anggaran: "anggaran",
  pajak: "pajak",
  rekonsiliasi: "rekonsiliasi",
  analitik: "analitik",
  "kalk-rasio": "analitik",
  "kalk-bep": "analitik",
  "kalk-bunga": "analitik",
  "kalk-penyusutan": "analitik",
  "kalk-persediaan": "analitik",
  "ai-assistant": "ai-assistant",
};

export const PERAN_BOLEH_TULIS: readonly PeranBisnis[] = [
  "owner",
  "admin",
  "member",
];

export function labelPeranBisnis(role?: string | null): string {
  if (role && role in PERAN_BISNIS_LABEL) {
    return PERAN_BISNIS_LABEL[role as PeranBisnis];
  }
  return PERAN_BISNIS_LABEL.viewer;
}

export function adalahPemilikBisnis(
  company: CompanyLike | null | undefined,
  userId?: string | null
): boolean {
  if (!company || !userId) return false;
  return company._role === "owner" || company.user_id === userId;
}

export function modulUntukHalaman(id: string): string | null {
  return Object.prototype.hasOwnProperty.call(MODUL_HALAMAN, id)
    ? MODUL_HALAMAN[id]
    : null;
}

export function peranBolehMenulis(role?: string | null): boolean {
  return !!role && (PERAN_BOLEH_TULIS as readonly string[]).includes(role);
}

export function peranAktifBisnis(
  company: CompanyLike | null | undefined,
  userId?: string | null,
  memberRole?: string | null
): string | null {
  if (!company) return null;
  if (adalahPemilikBisnis(company, userId)) return "owner";
  return company._role || memberRole || "viewer";
}

export function bisnisHanyaBaca(
  company: CompanyLike | null | undefined,
  userId?: string | null,
  memberRole?: string | null
): boolean {
  const p = peranAktifBisnis(company, userId, memberRole);
  return p !== null && !peranBolehMenulis(p);
}

export function susunDaftarBisnis<T extends CompanyLike>(
  owned: readonly T[] | null | undefined,
  memberships:
    | readonly { company_id: string; role?: string; status?: string }[]
    | null
    | undefined,
  memberCompanies: readonly T[] | null | undefined,
  userId?: string | null
): Array<T & { _role: string }> {
  const hasil: Array<T & { _role: string }> = [];
  const sudah = new Set<string>();
  (Array.isArray(owned) ? owned : []).forEach((c) => {
    if (!c || sudah.has(c.id)) return;
    sudah.add(c.id);
    hasil.push({ ...c, _role: "owner" });
  });
  const peranPerBisnis = new Map<string, string>();
  (Array.isArray(memberships) ? memberships : []).forEach((m) => {
    if (m && m.status === "active") {
      peranPerBisnis.set(m.company_id, m.role || "viewer");
    }
  });
  (Array.isArray(memberCompanies) ? memberCompanies : []).forEach((c) => {
    if (!c || sudah.has(c.id) || c.user_id === userId) return;
    if (!peranPerBisnis.has(c.id)) return;
    sudah.add(c.id);
    hasil.push({ ...c, _role: peranPerBisnis.get(c.id) || "viewer" });
  });
  return hasil;
}

export function ringkasHasilGabung(res?: {
  nama?: string;
  peran?: string;
  hasil?: string;
}): { berhasil: boolean; pesan: string } {
  const r = res || {};
  const nama = escapeHtml(r.nama || "bisnis ini");
  const peran = labelPeranBisnis(r.peran);
  if (r.hasil === "sudah_anggota" && r.peran === "owner") {
    return {
      berhasil: false,
      pesan: `ℹ Kamu adalah pemilik bisnis "${nama}".`,
    };
  }
  if (r.hasil === "sudah_anggota") {
    return {
      berhasil: false,
      pesan: `ℹ Kamu sudah terdaftar di bisnis "${nama}" sebagai ${peran}.<br>Pilih bisnis tersebut dari daftar bisnis kamu.`,
    };
  }
  if (r.hasil === "diaktifkan") {
    return {
      berhasil: true,
      pesan: `✅ Undanganmu ke bisnis "${nama}" sebagai ${peran} sudah aktif.`,
    };
  }
  if (r.hasil === "bergabung") {
    return {
      berhasil: true,
      pesan: `✅ Berhasil bergabung ke bisnis "${nama}" sebagai ${peran}.<br>Admin bisa mengubah peran dan izin aksesmu.`,
    };
  }
  return {
    berhasil: false,
    pesan:
      "ℹ Permintaan gabung diproses, tetapi hasilnya tidak dikenali. Muat ulang daftar bisnis.",
  };
}

export function bacaParamOAuth(
  search: string,
  hash: string
): { kode: boolean; token: boolean; error: string } {
  const sp = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const hp = new URLSearchParams(String(hash || "").replace(/^#/, ""));
  const error =
    sp.get("error_description") ||
    hp.get("error_description") ||
    sp.get("error_code") ||
    hp.get("error_code") ||
    sp.get("error") ||
    hp.get("error") ||
    "";
  return {
    kode: !error && sp.has("code"),
    token: !error && hp.has("access_token"),
    error,
  };
}
