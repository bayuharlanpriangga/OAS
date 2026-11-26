import type { JurnalEntry, JurnalLine, Akun, TransaksiAkunSettings, ParsedAIJurnal } from "@/types";
import { REV_KET_RE, JENIS_JURNAL } from "./saldo-periode";

export function isJurnalPembalik(j: JurnalEntry | null | undefined): boolean {
  return !!getReversalOf(j);
}

export function getReversalOf(j: JurnalEntry | null | undefined): string {
  if (!j) return "";
  if (j.reversalOf) return j.reversalOf;
  const m = REV_KET_RE.exec(j.ket || "");
  return m ? m[1].trim() : "";
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

export function ketTanpaPrefixPembalik(ket: unknown): string {
  return String(ket || "").replace(REV_KET_RE, "");
}

export function getAkunNama(akuns: readonly Akun[], kode: string): string {
  return akuns.find((a) => a.kode === kode)?.nama || kode;
}

export function resolveAkunSetting(
  settings: TransaksiAkunSettings | null | undefined,
  kategori: "jual" | "beli",
  kodeDefault: string
): string {
  const map = settings?.[kategori];
  const v = map && map[kodeDefault];
  return v || kodeDefault;
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
