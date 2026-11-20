import type { BentrokNomorItem, CounterRecord, Invoice } from "@/types";
import { escapeHtml } from "./format";
import {
  readCounterList,
  readCurrentCompany,
  readInvoiceList,
  readJurnalEntries,
  simpanInvoiceState,
  writeCounterList,
  writeInvoiceList,
} from "./legacy-store";
import {
  counterSetelahPakai,
  counterTanpaJenis,
  nomorBerikut,
  selesaikanBentrokNomorInvoice,
} from "./penomoran";

// ── From retired 26-daftar-bisnis.js ──────────────────────────────────────

export type PeranBisnis = "owner" | "admin" | "member" | "viewer";

export const PERAN_BISNIS_LABEL: Record<PeranBisnis, string> = {
  owner: "Pemilik",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer",
};

export function labelPeranBisnis(role?: string | null): string {
  if (role && role in PERAN_BISNIS_LABEL) {
    return PERAN_BISNIS_LABEL[role as PeranBisnis];
  }
  return PERAN_BISNIS_LABEL.viewer;
}

export interface CompanyLike {
  id: string;
  name?: string;
  user_id?: string;
  _role?: string;
  [key: string]: unknown;
}

export function adalahPemilikBisnis(
  company: CompanyLike | null | undefined,
  userId?: string | null
): boolean {
  if (!company || !userId) return false;
  return company._role === "owner" || company.user_id === userId;
}

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

export function modulUntukHalaman(id: string): string | null {
  return Object.prototype.hasOwnProperty.call(MODUL_HALAMAN, id)
    ? MODUL_HALAMAN[id]
    : null;
}

export const PERAN_BOLEH_TULIS: readonly PeranBisnis[] = [
  "owner",
  "admin",
  "member",
];

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

// ── From retired 27-oauth-url.js ──────────────────────────────────────────

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

// ── State wrappers from retired 23-penomoran.js ───────────────────────────

function syncCounterOnly(next: CounterRecord[]): void {
  writeCounterList(next);
  if (typeof window === "undefined") return;
  const win = window as unknown as {
    cloudSyncRecords?: (kinds: string[]) => Promise<boolean>;
  };
  if (readCurrentCompany() && typeof win.cloudSyncRecords === "function") {
    void win.cloudSyncRecords(["counter"]);
  } else {
    try {
      localStorage.setItem("oas_counter", JSON.stringify(next));
    } catch {}
  }
}

export function nomorInvoiceBerikutState(tahun?: number): string {
  const y = Number.isInteger(tahun)
    ? (tahun as number)
    : new Date().getFullYear();
  return nomorBerikut(
    "INV",
    y,
    readInvoiceList().map((i) => i && i.noInvoice),
    readCounterList()
  );
}

export function catatNomorInvoiceState(nomor: string): boolean {
  const cur = readCounterList();
  const baru = counterSetelahPakai(cur, nomor);
  if (baru === cur) return false;
  syncCounterOnly(baru);
  return true;
}

export function resetCounterJenisState(jenis: string): boolean {
  const cur = readCounterList();
  const baru = counterTanpaJenis(cur, jenis);
  if (baru === cur) return false;
  syncCounterOnly(baru);
  return true;
}

export async function periksaDanSelesaikanBentrokInvoiceState(): Promise<
  BentrokNomorItem[]
> {
  const invs = readInvoiceList();
  if (!Array.isArray(invs) || invs.length <= 1) return [];
  const res = selesaikanBentrokNomorInvoice<Invoice>(invs, readCounterList());
  if (!res.bentrok.length) return [];

  writeInvoiceList(res.invoices);
  writeCounterList(res.counterList);

  let jurnalBerubah = false;
  const jurnals = readJurnalEntries();
  res.bentrok.forEach((b) => {
    jurnals.forEach((j) => {
      if (!j) return;
      const ketStr = j.ket || j.keterangan || "";
      const matchPel =
        !b.pelanggan || b.pelanggan === "-" || ketStr.includes(b.pelanggan);
      if (matchPel && ketStr.includes(b.noLama)) {
        if (j.ket) j.ket = j.ket.split(b.noLama).join(b.noBaru);
        if (j.keterangan) {
          j.keterangan = j.keterangan.split(b.noLama).join(b.noBaru);
        }
        jurnalBerubah = true;
      }
    });
  });

  await simpanInvoiceState(true);
  if (typeof window !== "undefined") {
    const win = window as unknown as {
      saveToStorage?: (toast?: boolean) => void;
      showAlert?: (msg: string) => void;
      renderInvoiceList?: () => void;
      renderInvoiceKPI?: () => void;
    };
    if (jurnalBerubah) win.saveToStorage?.(false);
    const rincian = res.bentrok
      .map(
        (b) =>
          `Invoice "${escapeHtml(b.pelanggan)}" disesuaikan: <b>${escapeHtml(b.noLama)}</b> ➔ <b>${escapeHtml(b.noBaru)}</b>`
      )
      .join("<br>");
    win.showAlert?.(
      `⚠️ Terdeteksi ${res.bentrok.length} nomor invoice kembar saat offline:<br>${rincian}`
    );
    win.renderInvoiceList?.();
    win.renderInvoiceKPI?.();
  }
  return res.bentrok;
}
