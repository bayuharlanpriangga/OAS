import type { MarkdownInlineToken, MarkdownBlock, OasAppContext } from "./types";
import type { Akun, JurnalEntry } from "@/types";
import { computeSaldoBersih, saldoBersihPL } from "../../shared/accounting";
import { readAkuns, readJurnalEntries } from "../../shared/legacy-store";

export const DEFAULT_GEMINI_MODEL = "gemini-4-hydrogen";

export const MAX_AI_MESSAGES = 30;
export const MAX_MESSAGE_CHARS = 12_000;
export const MAX_TOTAL_CHARS = 60_000;
export const MAX_CONTEXT_CHARS = 25_000;

export const AI_PAGE_NAMES: Record<string, string> = {
  dashboard: "Dashboard",
  transaksi: "Transaksi",
  "jurnal-umum": "Jurnal Umum",
  "jurnal-kas": "Jurnal Kas",
  "jurnal-penjualan": "Jurnal Penjualan",
  "jurnal-pembelian": "Jurnal Pembelian",
  "jurnal-berulang": "Jurnal Berulang",
  "buku-besar": "Buku Besar",
  "neraca-saldo": "Neraca Saldo",
  "laba-rugi": "Laba Rugi",
  neraca: "Neraca",
  "arus-kas": "Arus Kas",
  "perubahan-ekuitas": "Perubahan Ekuitas",
  analitik: "Analitik",
  akun: "Chart of Accounts",
  produk: "Master Produk",
  "aset-tetap": "Aset Tetap",
  kontak: "Kontak",
  invoice: "Invoice",
  bill: "Tagihan Pembelian",
  "umur-piutang": "Umur Piutang",
  "umur-hutang": "Umur Hutang",
  "kartu-piutang": "Kartu Piutang",
  "kartu-hutang": "Kartu Hutang",
  penawaran: "Penawaran",
  "pesanan-jual": "Pesanan Penjualan",
  anggaran: "Anggaran",
  notifikasi: "Notifikasi",
  pajak: "Pajak Auto",
  kurs: "Kurs",
  rekonsiliasi: "Rekonsiliasi",
  "audit-trail": "Audit Trail",
  settings: "Settings",
  tutorial: "Tutorial",
  "ai-assistant": "Orias Assisten",
  "kalk-penyusutan": "Kalkulator Penyusutan",
  "kalk-persediaan": "Kalkulator Persediaan",
  "kalk-bunga": "Kalkulator Bunga",
  "kalk-rasio": "Kalkulator Rasio",
  "kalk-bep": "Kalkulator BEP",
};

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function sanitizeSafeHttpUrl(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

export function parseMarkdownInline(text: string): MarkdownInlineToken[] {
  const tokens: MarkdownInlineToken[] = [];
  const pattern =
    /(\*\*[^*\n]+?\*\*|\*[^*\n]+?\*|`[^`\n]+?`|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ type: "text", text: text.slice(lastIndex, match.index) });
    }
    const raw = match[0];
    if (raw.startsWith("**") && raw.endsWith("**")) {
      tokens.push({ type: "bold", text: raw.slice(2, -2) });
    } else if (raw.startsWith("*") && raw.endsWith("*")) {
      tokens.push({ type: "italic", text: raw.slice(1, -1) });
    } else if (raw.startsWith("`") && raw.endsWith("`")) {
      tokens.push({ type: "code", text: raw.slice(1, -1) });
    } else if (raw.startsWith("[")) {
      const linkMatch = raw.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      const safeHref = linkMatch ? sanitizeSafeHttpUrl(linkMatch[2]) : null;
      if (linkMatch && safeHref) {
        tokens.push({ type: "link", text: linkMatch[1], href: safeHref });
      } else {
        tokens.push({ type: "text", text: raw });
      }
    }
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", text: text.slice(lastIndex) });
  }
  return tokens;
}

function cleanFormulaExpr(expr: string): string {
  return expr
    .replace(/\\text\{([^}]*)\}/g, "$1")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\cdot/g, "·")
    .replace(/\\le/g, "≤")
    .replace(/\\ge/g, "≥")
    .replace(/\\ne/g, "≠")
    .replace(/\\\\/g, " ")
    .trim();
}

export function parseAiResponseMarkdown(rawInput: string): MarkdownBlock[] {
  const text = (rawInput || "").replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  const blocks: MarkdownBlock[] = [];
  const lines = text.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++;
      blocks.push({ type: "code", text: codeLines.join("\n").trim() });
      continue;
    }

    if (trimmed.startsWith("$$")) {
      if (trimmed.endsWith("$$") && trimmed.length > 4) {
        blocks.push({ type: "formula", text: cleanFormulaExpr(trimmed.slice(2, -2)) });
        i++;
        continue;
      }
      const formulaLines: string[] = [trimmed.slice(2)];
      i++;
      while (i < lines.length && !lines[i].includes("$$")) {
        formulaLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) {
        formulaLines.push(lines[i].replace(/\$\$/g, ""));
        i++;
      }
      blocks.push({ type: "formula", text: cleanFormulaExpr(formulaLines.join(" ")) });
      continue;
    }

    if (
      trimmed.startsWith("|") &&
      i + 1 < lines.length &&
      /^\|?[\s:|-]+\|?$/.test(lines[i + 1].trim())
    ) {
      const parseRow = (rowLine: string) =>
        rowLine
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
      const headers = parseRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseRow(lines[i]));
        i++;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (/^(?:---+|\*\*\*+|___+)\s*$/.test(trimmed)) {
      blocks.push({ type: "hr" });
      i++;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4;
      blocks.push({ type: "heading", level, text: headingMatch[2].trim() });
      i++;
      continue;
    }

    if (trimmed.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "quote", text: quoteLines.join("\n") });
      continue;
    }

    if (/^(?:Dr\.?|Debit|Debet|Kr\.?|Kredit)\s+/i.test(trimmed) && !trimmed.includes("|")) {
      const jLines: Array<{ side: "dr" | "kr"; text: string }> = [];
      while (
        i < lines.length &&
        /^\s*(?:Dr\.?|Debit|Debet|Kr\.?|Kredit)\s+/i.test(lines[i]) &&
        !lines[i].includes("|")
      ) {
        const l = lines[i].trim();
        const isDr = /^(?:Dr\.?|Debit|Debet)\b/i.test(l);
        jLines.push({ side: isDr ? "dr" : "kr", text: l });
        i++;
      }
      blocks.push({ type: "journal", lines: jLines });
      continue;
    }

    if (/^[-•*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-•*]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-•*]\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: false, items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ type: "list", ordered: true, items });
      continue;
    }

    const paraLines: string[] = [trimmed];
    i++;
    while (i < lines.length) {
      const nextTrimmed = lines[i].trim();
      if (
        !nextTrimmed ||
        nextTrimmed.startsWith("```") ||
        nextTrimmed.startsWith("$$") ||
        nextTrimmed.startsWith("#") ||
        nextTrimmed.startsWith(">") ||
        nextTrimmed.startsWith("|") ||
        /^(?:---+|\*\*\*+|___+)\s*$/.test(nextTrimmed) ||
        /^[-•*]\s+/.test(nextTrimmed) ||
        /^\d+\.\s+/.test(nextTrimmed) ||
        /^(?:Dr\.?|Debit|Debet|Kr\.?|Kredit)\s+/i.test(nextTrimmed)
      ) {
        break;
      }
      paraLines.push(nextTrimmed);
      i++;
    }
    blocks.push({ type: "paragraph", text: paraLines.join("\n") });
  }

  return blocks;
}

export function buildOasAppContextPure(
  akuns: readonly Akun[],
  jurnalEntries: readonly JurnalEntry[]
): OasAppContext {
  let totalAset = 0;
  let totalPendapatan = 0;
  let totalBeban = 0;

  for (const a of akuns) {
    if (a.tipe === "Aset") {
      const s = computeSaldoBersih(akuns, jurnalEntries, a.kode);
      totalAset += a.normal === "D" ? s : -s;
    } else if (a.tipe === "Pendapatan") {
      totalPendapatan += saldoBersihPL(akuns, jurnalEntries, a.kode);
    } else if (a.tipe === "Beban" || a.tipe === "HPP") {
      totalBeban += saldoBersihPL(akuns, jurnalEntries, a.kode);
    }
  }

  const recentJurnals = jurnalEntries.slice(-8).map((j) => {
    const ket = j.ket || j.keterangan || "-";
    const linesDesc = (j.lines || [])
      .map((l) => {
        const a = akuns.find((x) => x.kode === l.akun);
        return (a?.nama || l.akun) + (l.debit ? ` Dr${l.debit}` : ` Kr${l.kredit}`);
      })
      .join(", ");
    return `[${j.tanggal}] ${ket} (${j.jenis}): ${linesDesc}`;
  });

  const akunsSummary = akuns.map((a) => `${a.kode} ${a.nama} (${a.tipe})`);

  return {
    totalAset,
    totalPendapatan,
    totalBeban,
    labaBersih: totalPendapatan - totalBeban,
    jumlahJurnal: jurnalEntries.length,
    recentJurnals,
    akunsSummary,
  };
}

function fmtIdNumber(n: number): string {
  const num = Number.isFinite(n) ? n : 0;
  return num.toLocaleString("id-ID");
}

export function formatAppContextText(ctx: OasAppContext): string {
  const recent =
    ctx.recentJurnals.length > 0
      ? ctx.recentJurnals.slice(-10).join("\n")
      : "(belum ada)";
  const akunList =
    ctx.akunsSummary.length > 0
      ? ctx.akunsSummary.slice(0, 200).join(", ")
      : "(daftar akun kosong)";

  return `KONTEKS DATA KEUANGAN SAAT INI:
- Total Aset: Rp ${fmtIdNumber(ctx.totalAset)}
- Total Pendapatan: Rp ${fmtIdNumber(ctx.totalPendapatan)}
- Total Beban: Rp ${fmtIdNumber(ctx.totalBeban)}
- Laba Bersih: Rp ${fmtIdNumber(ctx.labaBersih)}
- Jumlah Jurnal: ${Math.max(0, Math.floor(ctx.jumlahJurnal || 0))} entri
- Jurnal Terbaru:
${recent}

DAFTAR AKUN TERSEDIA:
${akunList}`;
}

export function gatherOasAppContext(): OasAppContext {
  return buildOasAppContextPure(readAkuns(), readJurnalEntries());
}

export function buildOriasSystemPrompt(appContextText?: string): string {
  const ctxSection = appContextText
    ? appContextText
    : "KONTEKS DATA KEUANGAN SAAT INI:\nBelum ada konteks akun/jurnal dikirim dari klien.";

  return `Kamu adalah Orias Assisten · asisten akuntansi canggih yang BISA LANGSUNG MENGEKSEKUSI AKSI di software akuntansi OAS secara otomatis. Kamu ditenagai oleh model Google Gemini yang berjalan aman di server, bisa paham bahasa Indonesia formal maupun gaul/casual, dan selalu berusaha membantu sampai masalah beres.

IDENTITAS:
Kamu adalah kombinasi akuntan senior (CPA/CA), konsultan pajak Indonesia, analis keuangan, dan programmer yang menulis blok aksi JSON. Gunakan bahasa Indonesia yang hangat, jelas, dan profesional.

KEMAMPUAN EKSEKUSI LANGSUNG (SANGAT PENTING!):
Kamu BISA dan HARUS mengeksekusi aksi nyata di sistem menggunakan format JSON action di akhir responsmu bila pengguna meminta pencatatan atau pengisian kalkulator/fitur.
Cakupanmu mencakup jurnal, kartu stok/produk, kontak (pelanggan/supplier), aset tetap, anggaran, invoice, alert notifikasi, chart of account, dan navigasi ke semua halaman.
JANGAN PERNAH bilang "saya tidak bisa input otomatis" atau "silakan buka menu X dan isi manual" kalau ada action di bawah yang bisa langsung mengerjakannya.

FORMAT AKSI - tulis di paling bawah respons hanya jika ada aksi yang perlu dijalankan:
<ACTIONS>
[array JSON aksi]
</ACTIONS>

JENIS AKSI TERSEDIA:

1. SIMPAN JURNAL:
{"type":"addJurnal","tanggal":"2026-04-30","ket":"Deskripsi","jenis":"Manual","lines":[{"akun":"1101","ket":"Kas","debit":500000,"kredit":0},{"akun":"6202","ket":"Listrik","debit":0,"kredit":500000}]}

2. NAVIGASI:
{"type":"navigate","page":"dashboard"}
Halaman valid: dashboard, transaksi, jurnal-umum, jurnal-kas, jurnal-penjualan, jurnal-pembelian, jurnal-berulang, buku-besar, neraca-saldo, laba-rugi, neraca, arus-kas, perubahan-ekuitas, analitik, akun, produk, aset-tetap, kontak, invoice, bill, umur-piutang, umur-hutang, kartu-piutang, kartu-hutang, penawaran, pesanan-jual, anggaran, notifikasi, pajak, kurs, rekonsiliasi, audit-trail, settings, tutorial, ai-assistant, kalk-penyusutan, kalk-persediaan, kalk-bunga, kalk-rasio, kalk-bep

3. ISI KALKULATOR PENYUSUTAN:
{"type":"fillKalkPenyusutan","cost":100000000,"sisa":10000000,"umur":5,"metode":"garis-lurus","nama":"Nama Aset"}
Metode: garis-lurus, saldo-menurun, saldo-menurun-1x, sum-of-years, unit-produksi

4. ISI KALKULATOR BEP:
{"type":"fillKalkBEP","harga":50000,"bv":30000,"bt":20000000,"vol":1500}

5. ISI KALKULATOR ANUITAS/CICILAN:
{"type":"fillKalkAnuitas","pokok":500000000,"rate":12,"tenor":36,"jenis":"anuitas","dp":0}

6. NOTIFIKASI TOAST:
{"type":"showAlert","msg":"Pesan sukses"}

7. TAMBAH AKUN:
{"type":"addAkun","kode":"6106","nama":"Beban Transportasi","tipe":"Beban","kat":"Operasional"}

8. UBAH STOK PRODUK MANUAL:
{"type":"addKartuStock","produk":"Barang Dagangan","jenis":"masuk","qty":10,"harga":50000,"tanggal":"2026-09-15","ket":"Penyesuaian stok"}

9. TAMBAH/UPDATE KONTAK:
{"type":"addKontak","nama":"PT Maju Jaya","tipe":"pelanggan","telp":"08123456789","email":"","alamat":"","npwp":"","pic":"","catatan":""}

10. TAMBAH ASET TETAP:
{"type":"addAsetTetap","nama":"Mobil Operasional","harga":300000000,"kategori":"Kendaraan","tglPerolehan":"2026-01-15","residu":30000000,"umur":8,"metode":"garis-lurus","lokasi":"Kantor Pusat"}

11. SET ANGGARAN:
{"type":"setAnggaran","akunKode":"6202","periode":"2026-09","nominal":2000000,"catatan":"Budget listrik September"}

12. SET HARGA JUAL PRODUK:
{"type":"setHargaProduk","produk":"Barang Dagangan","hargaJual":80000,"ppn":11,"ppnInclusive":false}

13. BUAT INVOICE:
{"type":"addInvoice","pelanggan":"PT Maju Jaya","tanggal":"2026-09-15","jatuhTempo":"2026-10-15","deskripsi":"Jasa konsultasi","items":[{"nama":"Jasa Konsultasi","qty":1,"harga":5000000}],"ppn":true,"status":"terkirim","akunPiutang":"1201","akunPend":"4102"}

14. TAMBAH ALERT/REMINDER NOTIFIKASI:
{"type":"addAlertNotifikasi","nama":"Saldo Kas Menipis","tipe":"saldo-minimum","batas":1000000,"akun":"1101"}

ATURAN PENTING:
- Beri penjelasan lengkap DULU, tulis <ACTIONS> di paling bawah hanya jika ada aksi nyata.
- Total Debit HARUS SAMA DENGAN Total Kredit pada setiap addJurnal.
- Kode akun WAJIB dari daftar akun tersedia.
- Tanggal format YYYY-MM-DD, jika tidak disebutkan pakai tanggal hari ini.
- Setelah addJurnal selalu navigate ke jurnal yang relevan (atau tetap informatif).

KODE AKUN UTAMA (103 akun standar):
ASET LANCAR: 1101=Kas, 1102=Bank BCA, 1103=Bank Mandiri, 1104=Kas Kecil, 1201=Piutang Usaha, 1203=Cadangan Kerugian Piutang, 1301=Persediaan Barang Dagangan, 1302=Bahan Baku, 1303=Barang Dalam Proses, 1304=Barang Jadi, 1401=Perlengkapan Kantor, 1502=PPN Masukan, 1503=PPh Dibayar Dimuka, 1601=Biaya Dibayar Dimuka
ASET TETAP: 1702=Bangunan, 1703=Akm Peny Bangunan, 1711=Kendaraan, 1712=Akm Peny Kendaraan, 1721=Peralatan Kantor, 1722=Akm Peny Peralatan, 1731=Mesin, 1732=Akm Peny Mesin, 1751=Komputer, 1752=Akm Peny Komputer
LIABILITAS: 2101=Utang Usaha, 2201=Utang Gaji, 2202=Utang THR, 2301=Utang PPN, 2302=Utang PPh 21, 2303=Utang PPh 23, 2304=Utang PPh Badan, 2401=Pendapatan Diterima di Muka, 2402=Uang Muka Pelanggan, 2501=Utang Bunga, 2502=Biaya Masih Harus Dibayar, 2801=Utang Bank Jk Panjang, 2802=Utang Leasing
EKUITAS: 3101=Modal Pemilik, 3102=Prive, 3201=Laba Ditahan
PENDAPATAN: 4101=Penjualan Barang, 4102=Penjualan Jasa, 4103=Retur Penjualan, 4104=Diskon Penjualan, 4201=Pendapatan Komisi, 4202=Pendapatan Sewa, 4203=Pendapatan Bunga
HPP: 5101=HPP, 5102=Pembelian, 5103=Retur Pembelian, 5104=Biaya Angkut, 5201=Bahan Baku Langsung, 5202=TKL, 5203=Overhead Pabrik
BEBAN: 6101=Beban Gaji, 6201=Sewa, 6202=Listrik & Air, 6203=Telp & Internet, 6204=BBM & Transport, 6205=Perlengkapan, 6206=Pemeliharaan, 6301-6305=Beban Penyusutan, 6401=Iklan, 6501=Adm Umum, 6601=Beban Bunga, 6602=Adm Bank, 6604=PPh Badan, 6701=Lain-lain

KEMAMPUAN KALKULASI PENUH (tampilkan langkah-langkah):
- Penyusutan: GL, DDB, SYD, Unit Produksi
- Pajak: PPh 21 progresif 5 lapisan / TER PMK 168/2023, PPh 23, PPh Badan, PPN (11% non-mewah, 12% barang mewah)
- Keuangan: PV, FV, NPV, IRR, anuitas, bunga flat/efektif/majemuk
- Analisis: rasio keuangan + interpretasi + benchmark
- Persediaan: FIFO, LIFO, WA, MWA
- BEP, CM, MOS, DOL, PSAK relevan

${ctxSection}`;
}
