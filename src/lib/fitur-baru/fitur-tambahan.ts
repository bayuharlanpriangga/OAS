import type { Akun, JurnalEntry, JurnalLine, PpnRekap } from "@/types";
import {
  computeSaldoBersih,
  getJurnalTanpaPenutup,
  getReversedMap,
  isJurnalPembalik,
  isJurnalPenutup,
  ketTanpaPrefixPembalik,
  rekapPpnJurnal,
} from "@/lib/shared/accounting";
import { escapeHtml, fmtDate, fmtRp } from "@/lib/shared/format";
import {
  callOasGlobal,
  getCloudSync,
  getWin,
  readAkuns,
  readAnggaranList,
  readAsetTetapList,
  readCurrentCompany,
  readInvoiceList,
  readJurnalBerulangHistory,
  readJurnalBerulangList,
  readJurnalCounter,
  readJurnalEntries,
  readKontakList,
  readKursData,
  readNotifAlerts,
  readNotifHistory,
  writeJurnalCounter,
  writeNotifHistory,
} from "@/lib/shared/legacy-store";

export interface RekonCsvRow {
  tgl: string;
  ket: string;
  nominal: number;
  status: "belum" | "cocok" | "beda";
  jurnalId: string | null;
  nominalJurnal?: number;
}

export interface BankStatementRow {
  tanggal: string;
  keterangan: string;
  debit: number;
  kredit: number;
  status?: "verified" | "missing";
  matchedJurnal?: JurnalEntry | null;
}

export interface AttachmentItem {
  name: string;
  size: string;
  type: string;
  date: string;
  data: string;
}

export interface AutoPenyesuaianItem {
  id: string;
  tipe: string;
  level: "warning" | "info" | "danger";
  judul: string;
  deskripsi: string;
  alasan: string;
  nilaiSuggested: number;
  lines: JurnalLine[];
  checked: boolean;
  perluInput?: boolean;
  done?: boolean;
}

export interface RekapPajakBulan {
  fromStr: string;
  toStr: string;
  blnLabel: string;
  bruto: number;
  biaya: number;
  rekapPpn: PpnRekap;
  ppnKeluar: number;
  ppnMasuk: number;
  kurangBayar: number;
  laba: number;
  pphBadan: number;
}

export const ATTACHMENTS_KEY = "oas_attachments";
const PAJAK_NOTIF_KEY = "oas_pajak_notif_dismissed";

export function hitungTanggalBerikutnya(
  tglMulai: string,
  frekuensi: string
): string {
  const d = new Date(tglMulai);
  if (Number.isNaN(d.getTime())) {
    return new Date().toISOString().split("T")[0];
  }
  const now = new Date();
  let guard = 0;
  while (d <= now && guard < 10000) {
    guard++;
    if (frekuensi === "harian") d.setDate(d.getDate() + 1);
    else if (frekuensi === "mingguan") d.setDate(d.getDate() + 7);
    else if (frekuensi === "bulanan") d.setMonth(d.getMonth() + 1);
    else if (frekuensi === "triwulan") d.setMonth(d.getMonth() + 3);
    else if (frekuensi === "tahunan") d.setFullYear(d.getFullYear() + 1);
    else break;
  }
  return d.toISOString().split("T")[0];
}

export function saveFiturBaru(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      "oas_jb_hist",
      JSON.stringify(readJurnalBerulangHistory())
    );
    localStorage.setItem("oas_notif_hist", JSON.stringify(readNotifHistory()));
  } catch {
    // ignore storage quota errors
  }

  const company = readCurrentCompany();
  const sync = getCloudSync();
  if (company && sync) {
    void sync([
      "invoice",
      "kontak",
      "aset_tetap",
      "jurnal_berulang",
      "anggaran",
      "alert",
      "kurs",
    ]);
    return;
  }

  try {
    localStorage.setItem("oas_invoices", JSON.stringify(readInvoiceList()));
    localStorage.setItem("oas_aset_tetap", JSON.stringify(readAsetTetapList()));
    localStorage.setItem("oas_kontak", JSON.stringify(readKontakList()));
    localStorage.setItem("oas_jb", JSON.stringify(readJurnalBerulangList()));
    localStorage.setItem("oas_anggaran", JSON.stringify(readAnggaranList()));
    localStorage.setItem("oas_kurs", JSON.stringify(readKursData()));
    localStorage.setItem("oas_alerts", JSON.stringify(readNotifAlerts()));
  } catch {
    // ignore storage quota errors
  }
}

export function autoNo(prefix: string): string {
  const entries = readJurnalEntries();
  const n = entries.filter((j) => j.ref?.startsWith(prefix)).length + 1;
  return `${prefix}-${String(n).padStart(3, "0")}`;
}

export function parseCSVBank(lines: string[], bank: string): RekonCsvRow[] {
  const result: RekonCsvRow[] = [];
  lines.slice(1).forEach((line) => {
    const cols = line.split(",").map((c) => c.replace(/"/g, "").trim());
    if (cols.length < 3) return;
    let tgl = "";
    let ket = "";
    let nominal = 0;
    try {
      if (bank === "bca") {
        tgl = cols[0];
        ket = cols[1];
        nominal =
          parseFloat((cols[2] || "0").replace(/\./g, "").replace(",", ".")) ||
          0;
      } else if (bank === "mandiri") {
        tgl = cols[0];
        ket = cols[2];
        nominal =
          parseFloat((cols[3] || "0").replace(/\./g, "").replace(",", ".")) ||
          0;
      } else {
        tgl = cols[0];
        ket = cols[1];
        nominal = parseFloat((cols[2] || "0").replace(/[^0-9.-]/g, "")) || 0;
      }
      if (tgl && nominal) {
        result.push({ tgl, ket, nominal, status: "belum", jurnalId: null });
      }
    } catch {
      // skip malformed line
    }
  });
  return result;
}

export function parseFlexDate(str: string): string | null {
  if (!str) return null;
  const clean = str.trim();
  const m1 = clean.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{2,4})$/);
  if (m1) {
    const y = m1[3].length === 2 ? `20${m1[3]}` : m1[3];
    return `${y}-${m1[2].padStart(2, "0")}-${m1[1].padStart(2, "0")}`;
  }
  const m2 = clean.match(/^(\d{4})[/\-](\d{1,2})[/\-](\d{1,2})$/);
  if (m2) {
    return `${m2[1]}-${m2[2].padStart(2, "0")}-${m2[3].padStart(2, "0")}`;
  }
  if (/^\d+$/.test(clean)) {
    const d = new Date((parseInt(clean, 10) - 25569) * 86400000);
    if (!Number.isNaN(d.getTime())) return d.toISOString().split("T")[0];
  }
  return null;
}

export function parseRp(str: string | number | null | undefined): number {
  if (typeof str === "number") return Number.isFinite(str) ? str : 0;
  if (!str || str === "-") return 0;
  const raw = String(str).trim();
  const neg = /^\(.*\)$/.test(raw) || /^-/.test(raw);
  let s = raw.replace(/[^\d,.]/g, "");
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot > -1 && lastComma > -1) {
    s =
      lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (lastComma > -1) {
    const p = s.split(",");
    s = p.length > 2 || p[1].length === 3 ? s.replace(/,/g, "") : s.replace(",", ".");
  } else if (lastDot > -1) {
    const p = s.split(".");
    if (p.length > 2 || p[1].length === 3) s = s.replace(/\./g, "");
  }
  const v = parseFloat(s) || 0;
  return neg ? -v : v;
}

export function parseBankCSV(text: string): BankStatementRow[] {
  const lines = text
    .trim()
    .split("\n")
    .map((l) => l.split(/[;,]/).map((c) => c.trim().replace(/^"|"$/g, "")));
  if (!lines.length) return [];
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const h = lines[i].map((x) => x.toLowerCase());
    if (
      h.some(
        (x) => x.includes("tanggal") || x.includes("date") || x.includes("tgl")
      )
    ) {
      headerIdx = i;
      break;
    }
  }
  const headers = lines[headerIdx].map((h) => h.toLowerCase());
  const getCol = (names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };
  const tglCol = getCol(["tanggal", "date", "tgl"]);
  const ketCol = getCol(["keterangan", "description", "ket", "uraian", "berita"]);
  const debCol = getCol(["debet", "debit", "db", "masuk", "penarikan"]);
  const kreCol = getCol(["kredit", "credit", "cr", "keluar", "setoran", "penyetoran"]);

  return lines
    .slice(headerIdx + 1)
    .filter((r) => r.length >= 2 && tglCol >= 0 && r[tglCol])
    .map((r) => ({
      tanggal: parseFlexDate(r[tglCol] || "") || "",
      keterangan: ketCol >= 0 ? r[ketCol] || "" : "",
      debit: debCol >= 0 ? parseRp(r[debCol] || "0") : 0,
      kredit: kreCol >= 0 ? parseRp(r[kreCol] || "0") : 0,
    }))
    .filter((r) => Boolean(r.tanggal) && Boolean(r.debit || r.kredit));
}

export function parseBankExcel(data: unknown[][]): BankStatementRow[] {
  if (!data.length) return [];
  let headerIdx = 0;
  for (let i = 0; i < Math.min(8, data.length); i++) {
    const row = (data[i] || []).map((x) => String(x).toLowerCase());
    if (
      row.some(
        (x) => x.includes("tanggal") || x.includes("date") || x.includes("tgl")
      )
    ) {
      headerIdx = i;
      break;
    }
  }
  const headers = (data[headerIdx] || []).map((h) => String(h).toLowerCase());
  const getCol = (names: string[]) => {
    for (const n of names) {
      const i = headers.findIndex((h) => h.includes(n));
      if (i >= 0) return i;
    }
    return -1;
  };
  const tglCol = getCol(["tanggal", "date", "tgl"]);
  const ketCol = getCol(["keterangan", "description", "ket", "uraian", "berita"]);
  const debCol = getCol(["debet", "debit", "db", "masuk", "penarikan"]);
  const kreCol = getCol(["kredit", "credit", "cr", "keluar", "setoran"]);

  return data
    .slice(headerIdx + 1)
    .filter((r) => tglCol >= 0 && r && r[tglCol])
    .map((r) => ({
      tanggal: parseFlexDate(String(r[tglCol] || "")) || "",
      keterangan: ketCol >= 0 ? String(r[ketCol] || "") : "",
      debit: debCol >= 0 ? parseRp(String(r[debCol] || "0")) : 0,
      kredit: kreCol >= 0 ? parseRp(String(r[kreCol] || "0")) : 0,
    }))
    .filter((r) => Boolean(r.tanggal) && Boolean(r.debit || r.kredit));
}

export function hitungPPh21OtomatisCalc(
  gajiBruto: number,
  jmlKaryawan: number
): {
  pkp: number;
  pphSetahun: number;
  pphBulanPerKaryawan: number;
  totalPphBulan: number;
} {
  const n = Math.max(1, Math.floor(jmlKaryawan || 1));
  if (!gajiBruto || gajiBruto <= 0) {
    return { pkp: 0, pphSetahun: 0, pphBulanPerKaryawan: 0, totalPphBulan: 0 };
  }
  const setahun = gajiBruto * 12;
  const biayaJabatan = Math.min(setahun * 0.05, 6000000);
  const ptkp = 54000000;
  const pkp = Math.max(0, setahun - biayaJabatan - ptkp);
  let pph = 0;
  if (pkp <= 60000000) pph = pkp * 0.05;
  else if (pkp <= 250000000) pph = 3000000 + (pkp - 60000000) * 0.15;
  else if (pkp <= 500000000) pph = 31500000 + (pkp - 250000000) * 0.25;
  else pph = 93500000 + (pkp - 500000000) * 0.3;
  const pphBulanPerKaryawan = pph / 12;
  return {
    pkp,
    pphSetahun: pph,
    pphBulanPerKaryawan,
    totalPphBulan: pphBulanPerKaryawan * n,
  };
}

export const PPH23_TARIF_MAP: Record<string, number> = {
  jasa: 0.02,
  royalti: 0.15,
  sewa: 0.02,
  dividen: 0.15,
  bunga: 0.15,
};

export function hitungPPh23OtomatisCalc(
  jenis: string,
  bruto: number
): { tarif: number; pph: number; neto: number } {
  const tarif = PPH23_TARIF_MAP[jenis] ?? 0.02;
  const b = Math.max(0, bruto || 0);
  const pph = b * tarif;
  return { tarif, pph, neto: b - pph };
}

export function hitungRekapPajakBulan(
  bln: string,
  jurnalEntries: readonly JurnalEntry[],
  akuns: readonly Akun[]
): RekapPajakBulan | null {
  if (!bln) return null;
  const [y, m] = bln.split("-").map(Number);
  if (!y || !m) return null;
  const fromStr = `${y}-${String(m).padStart(2, "0")}-01`;
  const toStr = new Date(y, m, 0).toISOString().split("T")[0];
  const blnLabel = new Date(y, m - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const rekapPpn = rekapPpnJurnal(jurnalEntries, akuns, fromStr, toStr);
  const ppnKeluar = rekapPpn.keluaran;
  const ppnMasuk = rekapPpn.masukan;
  const kurangBayar = ppnKeluar - ppnMasuk;

  let bruto = 0;
  let biaya = 0;
  jurnalEntries
    .filter(
      (j) => j.tanggal >= fromStr && j.tanggal <= toStr && !isJurnalPenutup(j)
    )
    .forEach((j) =>
      (j.lines || []).forEach((l) => {
        const a = akuns.find((x) => x.kode === l.akun);
        if (a?.tipe === "Pendapatan") bruto += (l.kredit || 0) - (l.debit || 0);
        if (a && (a.tipe === "Beban" || a.tipe === "HPP")) {
          biaya += (l.debit || 0) - (l.kredit || 0);
        }
      })
    );
  const laba = bruto - biaya;
  const pphBadan = Math.max(0, laba * 0.22);
  return {
    fromStr,
    toStr,
    blnLabel,
    bruto,
    biaya,
    rekapPpn,
    ppnKeluar,
    ppnMasuk,
    kurangBayar,
    laba,
    pphBadan,
  };
}

export function printRekapPajakPDF(
  bln: string,
  jurnalEntries: readonly JurnalEntry[],
  akuns: readonly Akun[]
): void {
  const d = hitungRekapPajakBulan(bln, jurnalEntries, akuns);
  if (!d) {
    callOasGlobal("showAlert", "Pilih bulan rekap pajak dulu.");
    return;
  }
  const profilFromFn = callOasGlobal("getProfil") as Record<string, string> | null;
  let profil: Record<string, string> = profilFromFn || {};
  if (!profil || !Object.keys(profil).length) {
    try {
      profil = JSON.parse(localStorage.getItem("oas_profil_v1") || "{}");
    } catch {
      profil = {};
    }
  }
  const rp = (n: number) => "Rp " + Math.round(n || 0).toLocaleString("id-ID");
  const tgl = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const baris = (rows: PpnRekap["rowsKeluaran"], tipe: string) =>
    rows.length
      ? rows
          .map(
            (r) => `<tr>
      <td>${escapeHtml(fmtDate(r.j.tanggal))}</td><td>${escapeHtml(r.j.no || "-")}</td><td>${escapeHtml(r.j.ket || r.j.keterangan || "-")}</td>
      <td class="n">${rp(r.dpp)}</td><td class="n">${r.tarifPct ? escapeHtml(String(r.tarifPct)) + "%" : "-"}</td><td class="n">${rp(r.ppnVal)}</td></tr>`
          )
          .join("")
      : `<tr><td colspan="6" class="kosong">Tidak ada transaksi PPN ${tipe} pada periode ini.</td></tr>`;

  const kb = d.kurangBayar;
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Rekap Pajak ${escapeHtml(d.blnLabel)}</title><style>
    @page{size:A4;margin:18mm 16mm}
    *{box-sizing:border-box}
    body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;margin:0;line-height:1.45}
    .kop{border-bottom:2px solid #111;padding-bottom:10px;margin-bottom:16px}
    .kop h1{font-size:18px;margin:0 0 2px}.kop .sub{color:#555;font-size:11px}
    h2{font-size:15px;margin:0 0 2px}.periode{color:#444;margin-bottom:14px}
    h3{font-size:12px;text-transform:uppercase;letter-spacing:.04em;margin:18px 0 6px;color:#333}
    table{width:100%;border-collapse:collapse;margin-bottom:6px}
    th{background:#f0f0f0;text-align:left;font-size:11px}
    th,td{border:1px solid #bbb;padding:5px 8px;vertical-align:top}
    td.n,th.n{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
    td.kosong{color:#777;text-align:center;font-style:italic}
    tr.total td{font-weight:700;background:#fafafa}
    .hasil{border:2px solid #111;padding:10px 14px;margin:14px 0;display:flex;justify-content:space-between;align-items:center;break-inside:avoid}
    .hasil .l{font-weight:700}.hasil .v{font-size:18px;font-weight:800}
    .catatan{font-size:10.5px;color:#555;border-left:3px solid #bbb;padding:4px 10px;margin-top:14px}
    .ttd{margin-top:36px;display:flex;justify-content:flex-end;break-inside:avoid}.ttd div{width:200px;text-align:center}.ttd .garis{border-top:1px solid #111;margin-top:56px;padding-top:4px}
    table,tr{break-inside:avoid}
  </style></head><body>
    <div class="kop"><h1>${escapeHtml(profil.nama || "Perusahaan")}</h1><div class="sub">${profil.npwp ? "NPWP " + escapeHtml(profil.npwp) + " · " : ""}${escapeHtml(profil.alamat || "")}</div></div>
    <h2>Rekap Pajak Siap Setor</h2>
    <div class="periode">Masa pajak: ${escapeHtml(d.blnLabel)} (${escapeHtml(fmtDate(d.fromStr))} – ${escapeHtml(fmtDate(d.toStr))})</div>

    <h3>Ringkasan SPT Masa PPN (Formulir 1111)</h3>
    <table>
      <tr><th></th><th class="n">Jumlah Faktur</th><th class="n">DPP</th><th class="n">PPN</th></tr>
      <tr><td>Penyerahan BKP/JKP (PPN Keluaran)</td><td class="n">${d.rekapPpn.rowsKeluaran.length}</td><td class="n">${rp(d.rekapPpn.dppKeluaran)}</td><td class="n">${rp(d.ppnKeluar)}</td></tr>
      <tr><td>Perolehan BKP/JKP (PPN Masukan)</td><td class="n">${d.rekapPpn.rowsMasukan.length}</td><td class="n">${rp(d.rekapPpn.dppMasukan)}</td><td class="n">${rp(d.ppnMasuk)}</td></tr>
    </table>
    <div class="hasil"><div><div class="l">${kb > 0 ? "PPN KURANG BAYAR (WAJIB SETOR)" : "PPN LEBIH BAYAR (DAPAT DIKOMPENSASI)"}</div><div style="font-size:11px;color:#555">Batas setor: tanggal 15 bulan berikutnya</div></div><div class="v">${rp(Math.abs(kb))}</div></div>

    <h3>Rincian PPN Keluaran</h3>
    <table><tr><th>Tanggal</th><th>No Jurnal</th><th>Keterangan</th><th class="n">DPP</th><th class="n">Tarif</th><th class="n">PPN</th></tr>${baris(d.rekapPpn.rowsKeluaran, "Keluaran")}
      <tr class="total"><td colspan="3">Total</td><td class="n">${rp(d.rekapPpn.dppKeluaran)}</td><td></td><td class="n">${rp(d.ppnKeluar)}</td></tr></table>
    <h3>Rincian PPN Masukan</h3>
    <table><tr><th>Tanggal</th><th>No Jurnal</th><th>Keterangan</th><th class="n">DPP</th><th class="n">Tarif</th><th class="n">PPN</th></tr>${baris(d.rekapPpn.rowsMasukan, "Masukan")}
      <tr class="total"><td colspan="3">Total</td><td class="n">${rp(d.rekapPpn.dppMasukan)}</td><td></td><td class="n">${rp(d.ppnMasuk)}</td></tr></table>

    <h3>Estimasi PPh Badan</h3>
    <table>
      <tr><td>Penghasilan bruto</td><td class="n">${rp(d.bruto)}</td></tr>
      <tr><td>Biaya-biaya</td><td class="n">${rp(d.biaya)}</td></tr>
      <tr><td>Laba bersih estimasi</td><td class="n">${rp(d.laba)}</td></tr>
      <tr class="total"><td>Estimasi PPh Badan (22%)</td><td class="n">${rp(d.pphBadan)}</td></tr>
    </table>
    <div class="catatan">Estimasi PPh Badan hanya perkiraan dari laba bulan ini. Konsultasikan dengan akuntan/konsultan pajak untuk perhitungan dan pelaporan resmi.</div>
    <div class="ttd"><div>${escapeHtml(profil.kota ? profil.kota + ", " : "")}${escapeHtml(tgl)}<div class="garis">${escapeHtml(profil.nama || "Penanggung jawab")}</div></div></div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) {
    callOasGlobal(
      "showAlert",
      "Pop-up diblokir browser. Izinkan pop-up untuk situs ini, lalu klik Cetak PDF lagi."
    );
    return;
  }
  win.document.write(html);
  win.document.close();
  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      // ignore print errors
    }
  }, 400);
}

export function getAttachmentsMap(): Record<string, AttachmentItem[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = JSON.parse(localStorage.getItem(ATTACHMENTS_KEY) || "{}");
    return raw && typeof raw === "object" ? raw : {};
  } catch {
    return {};
  }
}

export function saveAttachmentsMap(
  map: Record<string, AttachmentItem[]>
): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ATTACHMENTS_KEY, JSON.stringify(map));
  } catch {
    // ignore storage quota errors
  }
}

export function downloadAttachmentFile(jurnalNo: string, idx: number): void {
  const all = getAttachmentsMap();
  const a = (all[jurnalNo] || [])[idx];
  if (!a) return;
  const link = document.createElement("a");
  link.href = a.data;
  link.download = a.name;
  link.click();
  callOasGlobal("showAlert", "Mengunduh: " + a.name);
}

export async function downloadAllAttachmentsZip(
  jurnalNo: string
): Promise<void> {
  const all = getAttachmentsMap();
  const attachments = all[jurnalNo] || [];
  if (!attachments.length) {
    callOasGlobal("showAlert", "Tidak ada lampiran");
    return;
  }

  const win = getWin();
  if (win && typeof win.JSZip === "undefined") {
    try {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Gagal memuat JSZip"));
        document.head.appendChild(s);
      });
    } catch {
      // Fallback: download satu per satu
      attachments.forEach((_, idx) => downloadAttachmentFile(jurnalNo, idx));
      return;
    }
  }

  const JSZipCtor = win?.JSZip as
    | (new () => {
        file: (name: string, data: string, opts: { base64: boolean }) => void;
        generateAsync: (opts: { type: "blob" }) => Promise<Blob>;
      })
    | undefined;
  if (!JSZipCtor) {
    attachments.forEach((_, idx) => downloadAttachmentFile(jurnalNo, idx));
    return;
  }

  callOasGlobal("showAlert", "Menyiapkan ZIP...");
  const zip = new JSZipCtor();
  attachments.forEach((a) => {
    const base64 = a.data.split(",")[1] || "";
    zip.file(a.name, base64, { base64: true });
  });
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Lampiran_${jurnalNo}.zip`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  callOasGlobal("showAlert", `${attachments.length} lampiran diunduh sebagai ZIP`);
}

export function deteksiPenyesuaianItems(
  jurnalEntries: readonly JurnalEntry[]
): AutoPenyesuaianItem[] {
  const results: AutoPenyesuaianItem[] = [];
  const today = new Date();
  const periodeAktif = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const idSet = new Set<string>();

  const getSaldoDebit = (kode: string) => {
    let s = 0;
    jurnalEntries.forEach((j) =>
      (j.lines || []).forEach((l) => {
        if (l.akun === kode) s += (l.debit || 0) - (l.kredit || 0);
      })
    );
    return s;
  };

  const getSaldoKredit = (kode: string) => {
    let s = 0;
    jurnalEntries.forEach((j) =>
      (j.lines || []).forEach((l) => {
        if (l.akun === kode) s += (l.kredit || 0) - (l.debit || 0);
      })
    );
    return s;
  };

  const sudahAdaAdjAkun = (kodeAkun: string) =>
    jurnalEntries.some(
      (j) =>
        j.tanggal?.startsWith(periodeAktif) &&
        (j.jenis === "Penyesuaian" ||
          j.no?.startsWith("ADJ") ||
          (j.ket || j.keterangan || "").toLowerCase().includes("penyesuaian")) &&
        (j.lines || []).some((l) => l.akun === kodeAkun)
    );

  const push = (item: AutoPenyesuaianItem) => {
    if (idSet.has(item.id)) return;
    idSet.add(item.id);
    results.push(item);
  };

  // 1. Beban Dibayar Dimuka (1601)
  const saldoBDD = getSaldoDebit("1601");
  if (saldoBDD > 10000 && !sudahAdaAdjAkun("1601")) {
    const masukList = jurnalEntries.filter((j) =>
      (j.lines || []).some((l) => l.akun === "1601" && (l.debit || 0) > 0)
    );
    const jTerbaru = masukList.sort((a, b) =>
      (b.tanggal || "") > (a.tanggal || "") ? 1 : -1
    )[0];
    if (jTerbaru) {
      const nilaiAwal =
        (jTerbaru.lines || []).find(
          (l) => l.akun === "1601" && (l.debit || 0) > 0
        )?.debit || saldoBDD;
      const perBulan = Math.round(nilaiAwal / 12);
      const nilaiSesuaikan = Math.min(perBulan, saldoBDD);
      if (nilaiSesuaikan > 0) {
        push({
          id: "adj_bdd",
          tipe: "beban_dibayar_dimuka",
          level: "warning",
          judul: "Beban Dibayar Dimuka Belum Diakui",
          deskripsi: `Akun 1601 · Biaya Dibayar Dimuka saldo ${fmtRp(saldoBDD)}. Dibayar ${jTerbaru.tanggal} senilai ${fmtRp(nilaiAwal)}. Estimasi beban bulan ini: ${fmtRp(nilaiSesuaikan)} (1/12 nilai).`,
          alasan:
            "Biaya dibayar dimuka diakui sebagai beban pada periode yang dinikmati (matching principle).",
          nilaiSuggested: nilaiSesuaikan,
          lines: [
            {
              akun: "6201",
              ket: "Beban Dibayar Dimuka (terpakai)",
              debit: nilaiSesuaikan,
              kredit: 0,
            },
            {
              akun: "1601",
              ket: "Biaya Dibayar Dimuka (dikurangi)",
              debit: 0,
              kredit: nilaiSesuaikan,
            },
          ],
          checked: false,
          perluInput: true,
        });
      }
    }
  }

  // 2. Pendapatan Diterima Dimuka (2201, 2202, 2401)
  [
    { kode: "2201", nama: "Pendapatan Diterima Dimuka" },
    { kode: "2202", nama: "Uang Muka Penjualan" },
  ].forEach(({ kode, nama }) => {
    const saldo = getSaldoKredit(kode);
    if (saldo > 10000 && !sudahAdaAdjAkun(kode)) {
      const perBulan = Math.round(saldo / 12);
      const nilaiEarned = Math.min(perBulan, saldo);
      if (nilaiEarned > 0) {
        push({
          id: "adj_pdd_" + kode,
          tipe: "pendapatan_diterima_dimuka",
          level: "info",
          judul: `${nama} Harus Diakui`,
          deskripsi: `Akun ${kode} · ${nama} saldo ${fmtRp(saldo)}. Estimasi yang sudah earned bulan ini: ${fmtRp(nilaiEarned)}.`,
          alasan:
            "Pendapatan diterima dimuka dipindahkan ke akun pendapatan saat jasa/produk sudah diserahkan.",
          nilaiSuggested: nilaiEarned,
          lines: [
            {
              akun: kode,
              ket: `${nama} (diakui bulan ini)`,
              debit: nilaiEarned,
              kredit: 0,
            },
            {
              akun: "4101",
              ket: "Pendapatan Jasa/Penjualan",
              debit: 0,
              kredit: nilaiEarned,
            },
          ],
          checked: false,
          perluInput: true,
        });
      }
    }
  });

  // 3. Penyusutan Aset Tetap
  const asetTetapPairs = [
    { aset: "1702", akum: "1703", beban: "6301", nama: "Bangunan", umur: 20 },
    { aset: "1711", akum: "1712", beban: "6302", nama: "Kendaraan", umur: 5 },
    { aset: "1721", akum: "1722", beban: "6303", nama: "Peralatan Kantor", umur: 5 },
    { aset: "1731", akum: "1732", beban: "6304", nama: "Mesin & Produksi", umur: 10 },
    { aset: "1741", akum: "1742", beban: "6305", nama: "Inventaris & Furnitur", umur: 8 },
    { aset: "1751", akum: "1752", beban: "6305", nama: "Komputer & Laptop", umur: 4 },
  ];
  asetTetapPairs.forEach(({ aset, akum, beban, nama, umur }) => {
    const nilaiAset = getSaldoDebit(aset);
    if (nilaiAset < 500000 || sudahAdaAdjAkun(akum)) return;
    const penyBulan = Math.round(nilaiAset / (umur * 12));
    if (penyBulan <= 0) return;
    push({
      id: "adj_peny_" + aset,
      tipe: "penyusutan",
      level: "warning",
      judul: `Penyusutan ${nama} Belum Dicatat`,
      deskripsi: `Aset ${aset} · ${nama} senilai ${fmtRp(nilaiAset)}. Umur ${umur} tahun → penyusutan garis lurus ${fmtRp(penyBulan)}/bulan. Bulan ${periodeAktif} belum ada.`,
      alasan:
        "Penyusutan dicatat tiap bulan agar nilai aset di neraca akurat (accrual basis).",
      nilaiSuggested: penyBulan,
      lines: [
        { akun: beban, ket: `Beban Penyusutan ${nama}`, debit: penyBulan, kredit: 0 },
        { akun: akum, ket: `Akumulasi Penyusutan ${nama}`, debit: 0, kredit: penyBulan },
      ],
      checked: true,
    });
  });

  // 4. Pemakaian Perlengkapan (1401, 1402)
  [
    { kode: "1401", beban: "6205", nama: "Perlengkapan Kantor" },
    { kode: "1402", beban: "6205", nama: "Perlengkapan Toko" },
  ].forEach(({ kode, beban, nama }) => {
    const saldo = getSaldoDebit(kode);
    if (saldo < 10000 || sudahAdaAdjAkun(kode)) return;
    const estimasi = Math.round(saldo * 0.3);
    push({
      id: "adj_perlengkapan_" + kode,
      tipe: "perlengkapan",
      level: "info",
      judul: `Pemakaian ${nama} Belum Disesuaikan`,
      deskripsi: `Akun ${kode} · ${nama} saldo ${fmtRp(saldo)}. Perlengkapan yang terpakai harus diakui sebagai beban. Isi nilai yang benar-benar terpakai bulan ini.`,
      alasan:
        "Perlengkapan yang sudah digunakan dipindahkan ke Beban Perlengkapan agar saldo neraca akurat.",
      nilaiSuggested: estimasi,
      lines: [
        { akun: beban, ket: "Beban Perlengkapan Terpakai", debit: estimasi, kredit: 0 },
        { akun: kode, ket: `${nama} (terpakai)`, debit: 0, kredit: estimasi },
      ],
      checked: false,
      perluInput: true,
    });
  });

  // 5. Beban Akrual
  [
    { kode: "6101", nama: "Beban Gaji & Upah", utang: "2101" },
    { kode: "6201", nama: "Beban Listrik & Air", utang: "2104" },
    { kode: "6205", nama: "Beban Sewa", utang: "2104" },
  ].forEach(({ kode, nama, utang }) => {
    const pernahAda = jurnalEntries.some(
      (j) =>
        j.tanggal &&
        !j.tanggal.startsWith(periodeAktif) &&
        (j.lines || []).some((l) => l.akun === kode && (l.debit || 0) > 0)
    );
    const sudahBulanIni = jurnalEntries.some(
      (j) =>
        j.tanggal?.startsWith(periodeAktif) &&
        (j.lines || []).some((l) => l.akun === kode && (l.debit || 0) > 0)
    );
    if (!pernahAda || sudahBulanIni) return;
    const totalHistori = jurnalEntries
      .filter(
        (j) =>
          !j.tanggal?.startsWith(periodeAktif) &&
          (j.lines || []).some((l) => l.akun === kode)
      )
      .slice(-6)
      .reduce(
        (s, j) =>
          s +
          (j.lines || [])
            .filter((l) => l.akun === kode)
            .reduce((ss, l) => ss + (l.debit || 0), 0),
        0
      );
    const rataRata = Math.round(totalHistori / 3) || 0;
    if (rataRata <= 0) return;
    push({
      id: "adj_akrual_" + kode,
      tipe: "beban_akrual",
      level: "warning",
      judul: `${nama} Bulan Ini Belum Dicatat`,
      deskripsi: `Akun ${kode} · ${nama} biasanya ada setiap bulan tapi bulan ${periodeAktif} belum ada. Rata-rata historis: ${fmtRp(rataRata)}.`,
      alasan:
        "Beban yang sudah terjadi tapi belum dibayar dicatat sebagai utang akrual agar laporan laba rugi akurat.",
      nilaiSuggested: rataRata,
      lines: [
        { akun: kode, ket: `${nama} (akrual)`, debit: rataRata, kredit: 0 },
        {
          akun: utang,
          ket: `Utang ${nama.replace("Beban ", "")}`,
          debit: 0,
          kredit: rataRata,
        },
      ],
      checked: false,
      perluInput: true,
    });
  });

  // 6. Cadangan Kerugian Piutang
  const saldoPiutang = getSaldoDebit("1201");
  const saldoCadangan = getSaldoKredit("1203");
  if (saldoPiutang > 1000000 && !sudahAdaAdjAkun("1203")) {
    const cadanganIdeal = Math.round(saldoPiutang * 0.02);
    const selisih = cadanganIdeal - saldoCadangan;
    if (selisih > 0) {
      push({
        id: "adj_cadangan_piutang",
        tipe: "cadangan_piutang",
        level: "info",
        judul: "Cadangan Kerugian Piutang Kurang",
        deskripsi: `Piutang ${fmtRp(saldoPiutang)}, cadangan baru ${fmtRp(saldoCadangan)}. Standar 2% = ${fmtRp(cadanganIdeal)}. Perlu tambah: ${fmtRp(selisih)}.`,
        alasan:
          "Konservatisme: estimasi piutang tak tertagih dicatat sebagai beban kerugian.",
        nilaiSuggested: selisih,
        lines: [
          { akun: "6401", ket: "Beban Kerugian Piutang", debit: selisih, kredit: 0 },
          { akun: "1203", ket: "Cadangan Kerugian Piutang", debit: 0, kredit: selisih },
        ],
        checked: false,
      });
    }
  }

  return results;
}

export function cekNotifikasi(): Array<{
  tipe: string;
  msg: string;
  alertId: string;
}> {
  if (typeof window === "undefined") return [];
  const today = new Date().toISOString().split("T")[0];
  const alerts = readNotifAlerts();
  const entries = readJurnalEntries();
  const akuns = readAkuns();
  const invoices = readInvoiceList();
  const notifs: Array<{ tipe: string; msg: string; alertId: string }> = [];

  alerts
    .filter((a) => a.aktif)
    .forEach((a) => {
      if (a.tipe === "arus-kas-negatif") {
        const kasIn = entries.reduce(
          (s, j) =>
            s +
            (j.lines || [])
              .filter((l) => l.akun === "1101")
              .reduce((ss, l) => ss + (l.debit || 0), 0),
          0
        );
        const kasOut = entries.reduce(
          (s, j) =>
            s +
            (j.lines || [])
              .filter((l) => l.akun === "1101")
              .reduce((ss, l) => ss + (l.kredit || 0), 0),
          0
        );
        if (kasIn - kasOut < 0) {
          notifs.push({
            tipe: "danger",
            msg: `${a.nama}: Arus kas negatif (${fmtRp(kasIn - kasOut)})`,
            alertId: a.id,
          });
        }
      }
      if (a.tipe === "invoice-jatuh-tempo") {
        const hariLimit = a.batas || 3;
        invoices
          .filter((i) => i.status !== "lunas")
          .forEach((i) => {
            if (!i.jatuhTempo) return;
            const diff =
              (new Date(i.jatuhTempo).getTime() - Date.now()) / 86400000;
            if (diff >= 0 && diff <= hariLimit) {
              notifs.push({
                tipe: "warning",
                msg: `Invoice ${i.noInvoice} (${i.pelanggan}) jatuh tempo dalam ${Math.ceil(diff)} hari`,
                alertId: a.id,
              });
            }
            if (diff < 0) {
              notifs.push({
                tipe: "danger",
                msg: `Invoice ${i.noInvoice} (${i.pelanggan}) SUDAH JATUH TEMPO ${Math.abs(Math.ceil(diff))} hari lalu`,
                alertId: a.id,
              });
            }
          });
      }
      if (a.tipe === "laba-negatif") {
        const noClose = getJurnalTanpaPenutup(entries);
        const pend = noClose.reduce(
          (s, j) =>
            s +
            (j.lines || []).reduce((ss, l) => {
              const ac = akuns.find((x) => x.kode === l.akun);
              return (
                ss +
                (ac && ac.tipe === "Pendapatan"
                  ? (l.kredit || 0) - (l.debit || 0)
                  : 0)
              );
            }, 0),
          0
        );
        const beban = noClose.reduce(
          (s, j) =>
            s +
            (j.lines || []).reduce((ss, l) => {
              const ac = akuns.find((x) => x.kode === l.akun);
              return (
                ss +
                (ac && (ac.tipe === "Beban" || ac.tipe === "HPP")
                  ? (l.debit || 0) - (l.kredit || 0)
                  : 0)
              );
            }, 0),
          0
        );
        if (pend - beban < 0) {
          notifs.push({
            tipe: "danger",
            msg: `${a.nama}: Laba bersih negatif (${fmtRp(pend - beban)})`,
            alertId: a.id,
          });
        }
      }
    });

  if (notifs.length) {
    const nextHist = [
      ...notifs.map((n) => ({ ...n, tgl: today, dibaca: false })),
      ...readNotifHistory(),
    ].slice(0, 100);
    writeNotifHistory(nextHist);
    saveFiturBaru();
    updateNotifBadge(notifs.length);
  }
  return notifs;
}

export function updateNotifBadge(n: number): void {
  if (typeof document === "undefined") return;
  document
    .querySelectorAll('.nav-card[data-page="notifikasi"]')
    .forEach((c) => {
      let badge = c.querySelector(".notif-badge") as HTMLSpanElement | null;
      if (n > 0) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "notif-badge";
          badge.style.cssText =
            "position:absolute;top:4px;right:4px;background:var(--red);color:white;border-radius:50%;width:16px;height:16px;font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:700;";
          c.appendChild(badge);
        }
        badge.textContent = n > 9 ? "9+" : String(n);
      } else if (badge) {
        badge.remove();
      }
    });
}

export function getPajakNotifications(): Array<{
  id: string;
  icon: string;
  type: "warn" | "info";
  judul: string;
  isi: string;
  aksi: string;
}> {
  if (typeof window === "undefined") return [];
  let dismissed: string[] = [];
  try {
    dismissed = JSON.parse(localStorage.getItem(PAJAK_NOTIF_KEY) || "[]");
  } catch {
    dismissed = [];
  }
  const now = new Date();
  const day = now.getDate();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const entries = readJurnalEntries();
  const akuns = readAkuns();
  const notifications: Array<{
    id: string;
    icon: string;
    type: "warn" | "info";
    judul: string;
    isi: string;
    aksi: string;
  }> = [];

  const utangPPN = Math.abs(computeSaldoBersih(akuns, entries, "2301"));
  const utangPPh21 = Math.abs(computeSaldoBersih(akuns, entries, "2302"));
  const utangPPh23 = Math.abs(computeSaldoBersih(akuns, entries, "2303"));
  const utangPPhBadan = Math.abs(computeSaldoBersih(akuns, entries, "2304"));
  const key = (id: string) => `${id}-${month}-${year}`;

  if (utangPPh21 > 0 && day >= 1 && day <= 10 && !dismissed.includes(key("pph21"))) {
    notifications.push({
      id: key("pph21"),
      icon: '<i class="ti ti-calculator ti-inline"></i>',
      type: "warn",
      judul: "PPh 21 · Jatuh Tempo Tanggal 10",
      isi: `Utang PPh 21 sebesar ${fmtRp(utangPPh21)} perlu disetor ke kas negara paling lambat tanggal 10 bulan ini.`,
      aksi: "showPage('pajak')",
    });
  }
  if (utangPPN > 0 && day >= 20 && !dismissed.includes(key("ppn"))) {
    notifications.push({
      id: key("ppn"),
      icon: '<i class="ti ti-receipt ti-inline"></i>',
      type: "warn",
      judul: "PPN · Lapor Bulan Ini",
      isi: `PPN terutang ${fmtRp(utangPPN)} perlu dilaporkan di SPT Masa PPN.`,
      aksi: "showPage('pajak')",
    });
  }
  if (utangPPh23 > 0 && day >= 1 && day <= 10 && !dismissed.includes(key("pph23"))) {
    notifications.push({
      id: key("pph23"),
      icon: '<i class="ti ti-clipboard-list ti-inline"></i>',
      type: "info",
      judul: "PPh 23 · Setor Paling Lambat Tanggal 10",
      isi: `Utang PPh 23 sebesar ${fmtRp(utangPPh23)} perlu disetor bulan ini.`,
      aksi: "showPage('pajak')",
    });
  }
  if (utangPPhBadan > 0 && month === 4 && !dismissed.includes(key("pphbadan"))) {
    notifications.push({
      id: key("pphbadan"),
      icon: '<i class="ti ti-building ti-inline"></i>',
      type: "warn",
      judul: "PPh Badan · Jatuh Tempo April",
      isi: `PPh Badan ${fmtRp(utangPPhBadan)} · pastikan SPT Tahunan sudah dilaporkan sebelum 30 April.`,
      aksi: "showPage('pajak')",
    });
  }
  return notifications;
}

export function dismissPajakNotif(id: string): void {
  if (typeof window === "undefined") return;
  let dismissed: string[] = [];
  try {
    dismissed = JSON.parse(localStorage.getItem(PAJAK_NOTIF_KEY) || "[]");
  } catch {
    dismissed = [];
  }
  if (!dismissed.includes(id)) dismissed.push(id);
  try {
    localStorage.setItem(PAJAK_NOTIF_KEY, JSON.stringify(dismissed));
  } catch {
    // ignore
  }
  callOasGlobal("renderDashboard");
}

export function renderPajakPanel(): void {
  if (typeof document === "undefined") return;
  const notifs = getPajakNotifications();
  const container = document.getElementById("dash-pajak-panel");
  if (!container) return;
  if (!notifs.length) {
    container.style.display = "none";
    return;
  }
  container.style.display = "block";
  container.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:10px;">Pengingat Pajak</div>
    ${notifs
      .map(
        (n) => `
      <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:rgba(245,158,11,0.07);border:1px solid rgba(245,158,11,0.2);border-radius:8px;margin-bottom:8px;">
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:700;color:var(--text);margin-bottom:3px;">${escapeHtml(n.judul)}</div>
          <div style="font-size:12px;color:var(--muted);line-height:1.6;">${escapeHtml(n.isi)}</div>
        </div>
        <button onclick="dismissPajakNotif('${escapeHtml(n.id)}')" style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:13px;flex-shrink:0;padding:2px 4px;" title="Tutup">✕</button>
      </div>`
      )
      .join("")}`;
}

export function buatJurnalPembalikRuntime(
  asal: JurnalEntry | null | undefined,
  opsi?: { tanggal?: string; alasan?: string }
): Record<string, unknown> | null {
  if (!asal) return null;
  const today = new Date().toISOString().split("T")[0];
  const tgl = opsi?.tanggal || today;

  if (isJurnalPembalik(asal)) {
    callOasGlobal(
      "showAlert",
      "Jurnal ini sendiri adalah jurnal pembalik dan tidak bisa dibalik lagi. Kalau transaksinya ingin dicatat ulang, buat jurnal baru."
    );
    return null;
  }
  const entries = readJurnalEntries();
  const sudah = asal.no ? getReversedMap(entries).get(asal.no) : undefined;
  if (sudah) {
    callOasGlobal(
      "showAlert",
      `Jurnal ${escapeHtml(asal.no || "")} sudah dibalik oleh ${escapeHtml(sudah)}.`
    );
    return null;
  }
  if (asal.tanggal && tgl < asal.tanggal) {
    callOasGlobal(
      "showAlert",
      `Tanggal jurnal pembalik tidak boleh lebih awal dari tanggal jurnal asal (${fmtDate(asal.tanggal)}).`
    );
    return null;
  }
  const guardOk = callOasGlobal("guardPeriode", tgl, "dibuatkan jurnal pembalik");
  if (guardOk === false) return null;

  if (!asal.no) {
    const nextNum = readJurnalCounter();
    asal.no = "JRN-" + String(nextNum).padStart(3, "0");
    writeJurnalCounter(nextNum + 1);
    callOasGlobal("markDirty");
  }

  const ketAsli = ketTanpaPrefixPembalik(asal.ket || asal.keterangan || "");
  const alasan = String(opsi?.alasan || "").trim();
  const entry: Record<string, unknown> = {
    tanggal: tgl,
    ket: `[Pembalik ${asal.no}] ${ketAsli}${alasan ? " · " + alasan : ""}`,
    jenis: asal.jenis || "Manual",
    reversalOf: asal.no,
    lines: (asal.lines || [])
      .map((l) => ({
        akun: l.akun,
        ket: "Pembalik: " + (l.ket || ""),
        debit: l.kredit || 0,
        kredit: l.debit || 0,
      }))
      .sort(
        (x, y) =>
          ((y.debit || 0) > 0 ? 1 : 0) - ((x.debit || 0) > 0 ? 1 : 0)
      ),
  };
  if (asal.ref) entry.ref = asal.ref;
  if (asal.kontakId) entry.kontakId = asal.kontakId;

  callOasGlobal("addJurnal", entry);
  return entry;
}

export function confirmResetAll(): void {
  const admin = callOasGlobal("isAdmin");
  if (admin === false) {
    callOasGlobal(
      "showAlert",
      "Hanya Admin atau Pemilik bisnis yang memiliki izin untuk mereset data."
    );
    return;
  }
  const inp = document.getElementById(
    "reset-confirm-input"
  ) as HTMLInputElement | null;
  if (inp) inp.value = "";
  document
    .querySelectorAll<HTMLInputElement>("#modal-reset-all input[data-reset]")
    .forEach((c) => {
      c.checked = c.getAttribute("data-reset") === "jurnal";
    });
  document.getElementById("modal-reset-all")?.classList.add("open");
  window.setTimeout(() => inp?.focus(), 200);
}

export function showOrgMembersSQL(): void {
  const sql =
    "-- Jalankan di Supabase SQL Editor:\n\n" +
    "-- 1. Tabel org_members\n" +
    "CREATE TABLE org_members (\n" +
    "  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n" +
    "  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,\n" +
    "  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,\n" +
    "  email text NOT NULL,\n" +
    "  nama text, nik text, jabatan text,\n" +
    "  role text DEFAULT 'member',\n" +
    "  permissions jsonb DEFAULT '{}',\n" +
    "  status text DEFAULT 'pending',\n" +
    "  invited_by uuid REFERENCES auth.users(id),\n" +
    "  created_at timestamptz DEFAULT now()\n" +
    ");\n" +
    "ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;\n" +
    'CREATE POLICY "Org members access" ON org_members FOR ALL\n' +
    "  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()) OR user_id = auth.uid());\n" +
    "CREATE INDEX idx_org_members_company ON org_members(company_id);\n" +
    "CREATE INDEX idx_org_members_email ON org_members(email);\n\n" +
    "-- 2. Tabel company_join_codes\n" +
    "CREATE TABLE company_join_codes (\n" +
    "  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,\n" +
    "  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,\n" +
    "  code text NOT NULL UNIQUE,\n" +
    "  created_by uuid REFERENCES auth.users(id),\n" +
    "  expires_at timestamptz NOT NULL,\n" +
    "  created_at timestamptz DEFAULT now()\n" +
    ");\n" +
    "ALTER TABLE company_join_codes ENABLE ROW LEVEL SECURITY;\n" +
    'CREATE POLICY "Join codes access" ON company_join_codes FOR ALL\n' +
    "  USING (company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()));\n" +
    'CREATE POLICY "Anyone can read join code by code value"\n' +
    "  ON company_join_codes FOR SELECT USING (true);";

  const w = window.open("", "_blank");
  if (!w) {
    callOasGlobal(
      "showAlert",
      "Popup diblokir browser. Izinkan popup untuk melihat SQL."
    );
    return;
  }
  w.document.write(
    `<!DOCTYPE html><html><head><title>SQL Multi-User OAS</title><style>body{font-family:monospace;background:#0d0f14;color:#e2e8f0;padding:24px;margin:0;}pre{background:#141720;border:1px solid #252a3a;border-radius:10px;padding:20px;white-space:pre-wrap;font-size:13px;line-height:1.6;}h2{color:#4ade80;margin-bottom:16px;}button{background:#4ade80;border:none;border-radius:8px;padding:10px 20px;font-weight:700;cursor:pointer;color:#0d0f14;margin-bottom:16px;}</style></head><body><h2>SQL: Multi-User System untuk OAS</h2><button onclick="navigator.clipboard.writeText(document.querySelector('pre').textContent).then(()=>this.textContent='Copied!')">Copy SQL</button><pre>${escapeHtml(sql)}</pre></body></html>`
  );
  w.document.close();
}

let _pwaPromptEvent: {
  prompt: () => void;
  userChoice: Promise<{ outcome: string }>;
} | null = null;
let _pwaInstalledFlag = false;
let _pwaBound = false;

export function initPwaListeners(): void {
  if (typeof window === "undefined" || _pwaBound) return;
  _pwaBound = true;
  _pwaInstalledFlag =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
      true;

  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    _pwaPromptEvent = e as unknown as typeof _pwaPromptEvent;
    const win = getWin();
    if (win) win._pwaPrompt = _pwaPromptEvent;
    callOasGlobal("updatePwaBtn");
  });

  window.addEventListener("appinstalled", () => {
    _pwaInstalledFlag = true;
    _pwaPromptEvent = null;
    const win = getWin();
    if (win) {
      win._pwaInstalled = true;
      win._pwaPrompt = null;
    }
    callOasGlobal("updatePwaBtn");
    callOasGlobal("showAlert", "OAS berhasil diinstall di perangkat ini!");
  });

  window.setTimeout(() => {
    callOasGlobal("updatePwaBtn");
    cekNotifikasi();
  }, 1200);
}

export function showPwaGuideModal(msg: string): void {
  if (typeof document === "undefined") return;
  document.getElementById("pwa-guide-modal")?.remove();
  const el = document.createElement("div");
  el.id = "pwa-guide-modal";
  el.style.cssText =
    "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;justify-content:center;";
  el.innerHTML = `
    <div style="background:var(--surface);border-radius:20px 20px 0 0;padding:28px 24px 40px;width:100%;max-width:480px;border-top:1px solid var(--border);">
      <div style="width:40px;height:4px;background:var(--border);border-radius:4px;margin:0 auto 20px;"></div>
      <div style="font-size:16px;font-weight:700;color:var(--text);text-align:center;margin-bottom:8px;">Install OAS sebagai App</div>
      <div style="font-size:13px;color:var(--muted);text-align:center;margin-bottom:20px;">Akses lebih cepat tanpa buka browser</div>
      <div style="background:var(--surface2);border-radius:12px;padding:16px 18px;font-size:13px;color:var(--text);line-height:1.8;white-space:pre-line;border:1px solid var(--border);">${escapeHtml(msg)}</div>
      <button onclick="document.getElementById('pwa-guide-modal')?.remove()" style="width:100%;margin-top:16px;background:var(--accent);color:var(--accent-fg);border:none;border-radius:12px;padding:14px;font-size:14px;font-weight:700;cursor:pointer;font-family:var(--sans);">Mengerti</button>
    </div>`;
  el.onclick = (e) => {
    if (e.target === el) el.remove();
  };
  document.body.appendChild(el);
}

export function handlePwaInstall(): void {
  if (typeof window === "undefined") return;
  if (_pwaInstalledFlag) {
    callOasGlobal("showAlert", "OAS sudah terinstall di perangkat ini!");
    return;
  }
  if (_pwaPromptEvent) {
    _pwaPromptEvent.prompt();
    void _pwaPromptEvent.userChoice.then((result) => {
      if (result.outcome === "accepted") {
        _pwaInstalledFlag = true;
        _pwaPromptEvent = null;
        callOasGlobal("updatePwaBtn");
        callOasGlobal("showAlert", "OAS berhasil diinstall!");
      }
    });
    return;
  }
  const ua = navigator.userAgent;
  const isInApp =
    /Instagram|FBAN|FBAV|FB_IAB|LineBrowser|Twitter|TikTok|Snapchat|Pinterest|LinkedIn|WhatsApp/.test(
      ua
    );
  if (isInApp) {
    showPwaGuideModal(
      'Fitur install app tidak tersedia di browser bawaan aplikasi ini.\n1. Ketuk ikon menu di pojok browser ini.\n2. Pilih "Buka di Chrome" atau "Open in Browser".'
    );
    return;
  }
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  if (isIOS) {
    showPwaGuideModal(
      '1. Buka di Safari\n2. Ketuk ikon Bagikan di bawah layar\n3. Pilih "Tambahkan ke Layar Utama"\n4. Ketuk "Tambah"'
    );
  } else if (isAndroid) {
    showPwaGuideModal(
      '1. Ketuk ikon menu (3 titik) di kanan atas\n2. Pilih "Tambahkan ke layar utama" atau "Install App"\n3. Ketuk "Tambah" atau "Install"'
    );
  } else {
    showPwaGuideModal(
      '1. Klik ikon Install di address bar kanan\n2. Klik "Install OAS..."\n3. Konfirmasi dialog Install'
    );
  }
}
