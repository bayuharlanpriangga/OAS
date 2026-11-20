import type {
  Akun,
  ComputeSaldoOptions,
  JurnalEntry,
  JurnalLine,
  ParsedAIJurnal,
  PpnJurnalResult,
  PpnRekap,
  PpnRekapRow,
  RingkasanJurnalPembelian,
  SaldoAkun,
  SaldoMap,
  TahunBukuKode,
  TahunBukuRange,
  TransaksiAkunSettings,
} from "@/types";
import { ymd } from "./format";

export const JENIS_PENUTUP = "Penutup" as const;

export const JENIS_JURNAL = {
  MANUAL: "Manual",
  INVOICE: "Invoice & Piutang",
  PENYUSUTAN: "Penyusutan",
  JURNAL_BERULANG: "Jurnal Berulang",
  REKONSILIASI: "Rekonsiliasi",
  SALDO_AWAL: "Saldo Awal",
  KARTU_STOCK: "Kartu Stock",
  BEP: "BEP & Margin",
  PINJAMAN: "Pinjaman",
  GAJI_PPH21: "Gaji & PPh 21",
  PPH23: "PPh 23",
  BILL: "Tagihan Pembelian",
} as const;

export const SUMBER_JURNAL = {
  ORIAS_AI: "Orias AI",
} as const;

export const PPN_TARIF_STANDAR = 11;

const REV_KET_RE = /^\[Pembalik ([^\]]+)\]\s*/;

const TB_BULAN_AWAL: Record<TahunBukuKode, number> = {
  jan: 0,
  apr: 3,
  jul: 6,
  okt: 9,
};

export function resolveAkunSetting(
  settings: TransaksiAkunSettings | null | undefined,
  kategori: "jual" | "beli",
  kodeDefault: string
): string {
  const map = settings?.[kategori];
  const v = map && map[kodeDefault];
  return v || kodeDefault;
}

export function getAkunNama(akuns: readonly Akun[], kode: string): string {
  return akuns.find((a) => a.kode === kode)?.nama || kode;
}

export function isJurnalPenutup(j: JurnalEntry | null | undefined): boolean {
  return !!j && j.jenis === JENIS_PENUTUP;
}

export function getReversalOf(j: JurnalEntry | null | undefined): string {
  if (!j) return "";
  if (j.reversalOf) return j.reversalOf;
  const m = REV_KET_RE.exec(j.ket || "");
  return m ? m[1].trim() : "";
}

export function isJurnalPembalik(j: JurnalEntry | null | undefined): boolean {
  return !!getReversalOf(j);
}

export function getReversedMap(
  jurnalEntries: readonly JurnalEntry[]
): Map<string, string> {
  const map = new Map<string, string>();
  jurnalEntries.forEach((j) => {
    const r = getReversalOf(j);
    if (r && j.no) map.set(r, j.no);
  });
  return map;
}

export function isJurnalDibalik(
  j: JurnalEntry | null | undefined,
  jurnalEntries: readonly JurnalEntry[]
): boolean {
  return !!j && !!j.no && getReversedMap(jurnalEntries).has(j.no);
}

export function buatJurnalPembalik(
  j: JurnalEntry | null | undefined,
  tanggalPembalik: string
):
  | {
      ok: true;
      entry: {
        tanggal: string;
        jenis: string;
        ket: string;
        ref: string;
        reversalOf: string;
        lines: JurnalLine[];
      };
    }
  | { ok: false; pesan: string } {
  if (!j || typeof j !== "object" || !j.no) {
    return { ok: false, pesan: "Jurnal asal tidak valid." };
  }
  const tgl = typeof tanggalPembalik === "string" ? tanggalPembalik.trim() : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tgl)) {
    return { ok: false, pesan: "Tanggal jurnal pembalik tidak valid." };
  }
  if (j.tanggal && tgl < j.tanggal.slice(0, 10)) {
    return {
      ok: false,
      pesan: `Tanggal jurnal pembalik tidak boleh sebelum tanggal jurnal asal (${j.tanggal}).`,
    };
  }
  const lines = (Array.isArray(j.lines) ? j.lines : []).map((l) => ({
    akun: l.akun,
    ket: l.ket || "",
    debit: Number(l.kredit) || 0,
    kredit: Number(l.debit) || 0,
  }));
  if (!lines.length) {
    return { ok: false, pesan: "Jurnal asal tidak memiliki baris akun." };
  }
  const ketAsal = String(j.ket || j.keterangan || "").trim();
  return {
    ok: true,
    entry: {
      tanggal: tgl,
      jenis: j.jenis || JENIS_JURNAL.MANUAL,
      ket: `[Pembalik ${j.no}] ${ketAsal}`,
      ref: j.ref || j.no,
      reversalOf: j.no,
      lines,
    },
  };
}

export function adalahJurnalPembelian(
  j: JurnalEntry | null | undefined
): boolean {
  return !!j && (j.jenis === "Pembelian" || j.jenis === JENIS_JURNAL.BILL);
}

export function jurnalPembelianAktif(
  daftar: readonly JurnalEntry[],
  semuaJurnal?: readonly JurnalEntry[]
): JurnalEntry[] {
  const src = Array.isArray(daftar) ? daftar : [];
  const dibalik = getReversedMap(semuaJurnal ?? src);
  return src.filter(
    (j) =>
      adalahJurnalPembelian(j) &&
      !isJurnalPembalik(j) &&
      !(j.no && dibalik.has(j.no))
  );
}

export function ringkasJurnalPembelian(
  j: JurnalEntry | null | undefined
): RingkasanJurnalPembelian {
  const lines = j && Array.isArray(j.lines) ? j.lines : [];
  const bill = !!j && j.jenis === JENIS_JURNAL.BILL;
  const kasUtang = (l: JurnalLine) => l.akun === "1101" || l.akun === "2101";
  const jum = (arr: JurnalLine[], f: "debit" | "kredit") =>
    arr.reduce((s, l) => s + (l[f] || 0), 0);
  const debit = lines.filter((l) => (l.debit || 0) > 0 && (bill || !kasUtang(l)));
  const kreditAll = lines.filter((l) => (l.kredit || 0) > 0);
  const kreditPokok = bill
    ? kreditAll
    : kreditAll.filter(kasUtang).slice(0, 1);
  const m = bill
    ? /^Tagihan (\S+) —/.exec(String(j?.ket || j?.keterangan || ""))
    : null;
  return {
    debit,
    totalDebit: jum(debit, "debit"),
    kredit: jum(kreditPokok, "kredit"),
    tunai: kreditPokok.length > 0 && kreditPokok[0].akun === "1101",
    no: (j && j.ref) || (m ? m[1] : "") || (j && j.no) || "",
  };
}

export function ketTanpaPrefixPembalik(ket: unknown): string {
  return String(ket || "").replace(REV_KET_RE, "");
}

export function isPeriodeTerkunci(
  tanggal: string | null | undefined,
  periodeKunciSampai: string | null | undefined
): boolean {
  return (
    !!periodeKunciSampai &&
    !!tanggal &&
    String(tanggal).slice(0, 10) <= periodeKunciSampai
  );
}

export class PeriodeTerkunciError extends Error {}

export function getBulanAwalTahunBuku(
  tahunBukuKode?: TahunBukuKode | string | null
): number {
  if (
    tahunBukuKode &&
    Object.prototype.hasOwnProperty.call(TB_BULAN_AWAL, tahunBukuKode)
  ) {
    return TB_BULAN_AWAL[tahunBukuKode as TahunBukuKode];
  }
  return 0;
}

export function getTahunBukuRange(
  tanggal: string,
  tahunBukuKode?: TahunBukuKode | string | null
): TahunBukuRange {
  const bulanAwal = getBulanAwalTahunBuku(tahunBukuKode);
  const y = parseInt(tanggal.slice(0, 4), 10);
  const m0 = parseInt(tanggal.slice(5, 7), 10) - 1;
  const yAwal = m0 >= bulanAwal ? y : y - 1;
  const from = ymd(yAwal, bulanAwal, 1);
  const yAkhir = bulanAwal === 0 ? yAwal : yAwal + 1;
  const m0Akhir = (bulanAwal + 11) % 12;
  const to = ymd(yAkhir, m0Akhir, new Date(yAkhir, m0Akhir + 1, 0).getDate());
  const label = bulanAwal === 0 ? String(yAwal) : `${yAwal}/${yAkhir}`;
  return { from, to, label };
}

export function plNatural(
  a: Akun | null | undefined,
  s?: Partial<SaldoAkun> | null
): number {
  const saldo = s || { debit: 0, kredit: 0 };
  if (!a) return 0;
  if (a.tipe === "Pendapatan") return (saldo.kredit || 0) - (saldo.debit || 0);
  if (a.tipe === "HPP" || a.tipe === "Beban") {
    return (saldo.debit || 0) - (saldo.kredit || 0);
  }
  return a.normal === "D"
    ? (saldo.debit || 0) - (saldo.kredit || 0)
    : (saldo.kredit || 0) - (saldo.debit || 0);
}

export function getJurnalTanpaPenutup(
  jurnalEntries: readonly JurnalEntry[]
): JurnalEntry[] {
  return jurnalEntries.filter((j) => !isJurnalPenutup(j));
}

export function computeSaldoAll(
  jurnalEntries: readonly JurnalEntry[],
  opts?: ComputeSaldoOptions
): SaldoMap {
  const map: SaldoMap = {};
  const src =
    opts && opts.tanpaPenutup
      ? getJurnalTanpaPenutup(jurnalEntries)
      : jurnalEntries;
  src.forEach((j) =>
    j.lines.forEach((l) => {
      if (!map[l.akun]) map[l.akun] = { debit: 0, kredit: 0 };
      map[l.akun].debit += l.debit || 0;
      map[l.akun].kredit += l.kredit || 0;
    })
  );
  return map;
}

export function saldoAlamiPL(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[],
  kode: string,
  opts?: ComputeSaldoOptions
): number {
  const a = akuns.find((x) => x.kode === kode);
  if (!a) return 0;
  return plNatural(
    a,
    computeSaldoAll(jurnalEntries, opts || { tanpaPenutup: true })[kode]
  );
}

export function saldoBersihPL(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[],
  kode: string
): number {
  return saldoAlamiPL(akuns, jurnalEntries, kode, { tanpaPenutup: true });
}

export function computeSaldoBersih(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[],
  kode: string,
  opts?: ComputeSaldoOptions
): number {
  const a = akuns.find((x) => x.kode === kode);
  if (!a) return 0;
  const map = computeSaldoAll(jurnalEntries, opts);
  const s = map[kode] || { debit: 0, kredit: 0 };
  return a.normal === "D" ? s.debit - s.kredit : s.kredit - s.debit;
}

export function hitungPpn(
  dpp: number,
  tarifPct?: number | string | null
): number {
  const t =
    tarifPct === undefined ||
    tarifPct === null ||
    tarifPct === "" ||
    isNaN(Number(tarifPct))
      ? PPN_TARIF_STANDAR
      : Number(tarifPct);
  return Math.round((dpp || 0) * (t / 100));
}

export function akunPpnKeluaranKode(akuns: readonly Akun[]): string {
  if (akuns.find((a) => a.kode === "2301")) return "2301";
  return (
    akuns.find(
      (a) =>
        a.nama.toLowerCase().includes("ppn") && a.tipe === "Liabilitas"
    )?.kode || "2301"
  );
}

function tarifPpnJurnal(j: JurnalEntry, barisPpn: JurnalLine[]): number {
  if (j._ppnTarif && j._ppnTarif > 0) return Number(j._ppnTarif);
  for (const l of barisPpn) {
    const m = /(\d+(?:[.,]\d+)?)\s*%/.exec(l.ket || "");
    if (m) {
      const t = parseFloat(m[1].replace(",", "."));
      if (t > 0) return t;
    }
  }
  return 0;
}

export function ppnDariJurnal(
  j: JurnalEntry | null | undefined,
  akuns: readonly Akun[]
): PpnJurnalResult | null {
  if (!j || !Array.isArray(j.lines)) return null;
  const jum = (arr: JurnalLine[], f: "debit" | "kredit") =>
    arr.reduce((sum, l) => sum + (l[f] || 0), 0);

  const keluaran = j.lines.filter(
    (l) =>
      (l.kredit || 0) > 0 &&
      (l.akun === "2301" || /ppn keluaran/i.test(l.ket || ""))
  );
  if (keluaran.length) {
    const tarif = tarifPpnJurnal(j, keluaran);
    if (!(tarif > 0)) return null;
    const ppn = jum(keluaran, "kredit");
    const pendapatan = j.lines.filter(
      (l) =>
        (l.kredit || 0) > 0 &&
        akuns.find((a) => a.kode === l.akun)?.tipe === "Pendapatan"
    );
    const dpp = jum(pendapatan, "kredit") || Math.round(ppn / (tarif / 100));
    return { tipe: "keluaran", ppn, dpp, tarif };
  }

  const masukan = j.lines.filter(
    (l) =>
      (l.debit || 0) > 0 &&
      (l.akun === "1502" || /ppn masukan/i.test(l.ket || ""))
  );
  if (masukan.length) {
    const tarif = tarifPpnJurnal(j, masukan);
    if (!(tarif > 0)) return null;
    const ppn = jum(masukan, "debit");
    return {
      tipe: "masukan",
      ppn,
      dpp: Math.round(ppn / (tarif / 100)),
      tarif,
    };
  }

  return null;
}

export function rekapPpnJurnal(
  jurnalEntries: readonly JurnalEntry[],
  akuns: readonly Akun[],
  fromStr?: string,
  toStr?: string
): PpnRekap {
  const r: PpnRekap = {
    keluaran: 0,
    masukan: 0,
    dppKeluaran: 0,
    dppMasukan: 0,
    rowsKeluaran: [],
    rowsMasukan: [],
    kurangBayar: 0,
  };
  const dibalik = getReversedMap(jurnalEntries);
  jurnalEntries.forEach((j) => {
    if (fromStr && (j.tanggal || "") < fromStr) return;
    if (toStr && (j.tanggal || "") > toStr) return;
    if (isJurnalPembalik(j) || (j.no && dibalik.has(j.no))) return;
    const p = ppnDariJurnal(j, akuns);
    if (!p) return;
    const row: PpnRekapRow = { j, ppnVal: p.ppn, dpp: p.dpp, tarifPct: p.tarif };
    if (p.tipe === "keluaran") {
      r.keluaran += p.ppn;
      r.dppKeluaran += p.dpp;
      r.rowsKeluaran.push(row);
    } else {
      r.masukan += p.ppn;
      r.dppMasukan += p.dpp;
      r.rowsMasukan.push(row);
    }
  });
  r.kurangBayar = r.keluaran - r.masukan;
  return r;
}

export function parseJurnalFromAI(
  text: string,
  akuns: readonly Akun[],
  today: string = new Date().toISOString().split("T")[0]
): ParsedAIJurnal | null {
  const lines: JurnalLine[] = [];
  const ketMatch = text.match(/(?:jurnal|mencatat|transaksi)[:\s]+([^\n.]+)/i);
  const ket = ketMatch ? ketMatch[1].trim().substring(0, 60) : "Dari AI";

  const drPattern =
    /(?:Dr\.?|Debit)[:\s]+([A-Za-z\s/]+?)[:\s]+(?:Rp\s*)?([0-9.,]+)/gi;
  const krPattern =
    /(?:Kr\.?|Kredit)[:\s]+([A-Za-z\s/]+?)[:\s]+(?:Rp\s*)?([0-9.,]+)/gi;

  let m: RegExpExecArray | null;
  while ((m = drPattern.exec(text)) !== null) {
    const nama = m[1].trim();
    const val =
      parseFloat(m[2].replace(/[.,]/g, "").replace(/(\d{3})$/, "$1")) ||
      parseFloat(m[2].replace(/\./g, "").replace(",", "."));
    const akun = akuns.find((a) =>
      a.nama.toLowerCase().includes(nama.toLowerCase().split(" ")[0])
    );
    if (val > 0) {
      lines.push({ akun: akun?.kode || "1101", ket: nama, debit: val, kredit: 0 });
    }
  }
  while ((m = krPattern.exec(text)) !== null) {
    const nama = m[1].trim();
    const val =
      parseFloat(m[2].replace(/[.,]/g, "").replace(/(\d{3})$/, "$1")) ||
      parseFloat(m[2].replace(/\./g, "").replace(",", "."));
    const akun = akuns.find((a) =>
      a.nama.toLowerCase().includes(nama.toLowerCase().split(" ")[0])
    );
    if (val > 0) {
      lines.push({ akun: akun?.kode || "1101", ket: nama, debit: 0, kredit: val });
    }
  }

  if (lines.length < 2) return null;
  const td = lines.reduce((s, l) => s + l.debit, 0);
  const tk = lines.reduce((s, l) => s + l.kredit, 0);
  if (Math.abs(td - tk) > 1) return null;

  return { tanggal: today, ket, jenis: "AI", lines };
}
